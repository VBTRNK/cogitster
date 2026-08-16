import { createClient } from 'npm:@supabase/supabase-js@2';

type Difficulty = 'curious' | 'scholar' | 'oracle';
type Phase = 'player_turn' | 'player_reveal' | 'ai_placement' | 'ai_reveal' | 'finished';
type Card = {
  id: string;
  card_type: string;
  prompt: string;
  chronology_year: number;
  meta: string;
  explanation: string;
  source_text: string;
};
type Game = {
  id: string;
  owner_id: string;
  difficulty: Difficulty;
  rounds: number;
  current_round: number;
  phase: Phase;
  active_card_id: string | null;
  deck: string[];
  player_timeline: string[];
  ai_timeline: string[];
  player_score: number;
  ai_score: number;
  ai_choice: number | null;
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const chances: Record<Difficulty, number> = { curious: 0.45, scholar: 0.65, oracle: 0.82 };
const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers });
}

function fail(message: string, status = 400): never {
  throw Object.assign(new Error(message), { status });
}

function requireActionId(value: unknown) {
  if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(value)) fail('A UUID actionId is required.');
  return value;
}

function secureShuffle<T>(items: T[]) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const random = new Uint32Array(1);
    crypto.getRandomValues(random);
    const swap = random[0] % (index + 1);
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
}

function timelineCards(ids: string[], cards: Map<string, Card>) {
  return ids.map((id) => cards.get(id)).filter((card): card is Card => Boolean(card))
    .sort((a, b) => a.chronology_year - b.chronology_year || a.id.localeCompare(b.id));
}

function correctGap(ids: string[], card: Card, cards: Map<string, Card>) {
  const ordered = timelineCards(ids, cards);
  for (let gap = 0; gap <= ordered.length; gap += 1) {
    const before = ordered[gap - 1];
    const after = ordered[gap];
    if ((!before || card.chronology_year >= before.chronology_year) && (!after || card.chronology_year <= after.chronology_year)) return gap;
  }
  return 0;
}

function sortedIds(ids: string[], cards: Map<string, Card>) {
  return timelineCards(ids, cards).map((card) => card.id);
}

function visibleCard(card: Card, reveal: boolean) {
  const base = { id: card.id, type: card.card_type, prompt: card.prompt };
  return reveal ? { ...base, year: card.chronology_year, meta: card.meta, explanation: card.explanation, source: card.source_text } : base;
}

async function cardsFor(admin: ReturnType<typeof createClient>, ids: string[]) {
  const uniqueIds = [...new Set(ids.filter(Boolean))];
  if (!uniqueIds.length) return new Map<string, Card>();
  const { data, error } = await admin.schema('cogitster').from('cards').select('*').in('id', uniqueIds);
  if (error) throw error;
  return new Map((data as Card[]).map((card) => [card.id, card]));
}

async function gameView(admin: ReturnType<typeof createClient>, game: Game) {
  const cardMap = await cardsFor(admin, [...game.player_timeline, ...game.ai_timeline, ...(game.active_card_id ? [game.active_card_id] : [])]);
  const active = game.active_card_id ? cardMap.get(game.active_card_id) : undefined;
  const reveal = game.phase === 'player_reveal' || game.phase === 'ai_reveal' || game.phase === 'finished';
  return {
    id: game.id,
    difficulty: game.difficulty,
    rounds: game.rounds,
    currentRound: game.current_round,
    phase: game.phase,
    playerScore: game.player_score,
    aiScore: game.ai_score,
    aiChoice: game.phase === 'ai_placement' ? game.ai_choice : null,
    playerTimeline: timelineCards(game.player_timeline, cardMap).map((card) => visibleCard(card, true)),
    aiTimeline: timelineCards(game.ai_timeline, cardMap).map((card) => visibleCard(card, true)),
    activeCard: active ? visibleCard(active, reveal) : null,
  };
}

async function loadGame(admin: ReturnType<typeof createClient>, gameId: unknown, userId: string) {
  if (typeof gameId !== 'string') fail('A gameId is required.');
  const { data, error } = await admin.schema('cogitster').from('games').select('*').eq('id', gameId).eq('owner_id', userId).maybeSingle();
  if (error) throw error;
  if (!data) fail('Game not found.', 404);
  return data as Game;
}

async function recordAction(admin: ReturnType<typeof createClient>, gameId: string, action: string, actionId: string) {
  const { error } = await admin.schema('cogitster').from('game_actions').insert({ game_id: gameId, action, client_action_id: actionId });
  if (error?.code === '23505') return false;
  if (error) throw error;
  return true;
}

async function updateGame(admin: ReturnType<typeof createClient>, gameId: string, changes: Record<string, unknown>) {
  const { data, error } = await admin.schema('cogitster').from('games').update(changes).eq('id', gameId).select('*').single();
  if (error) throw error;
  return data as Game;
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers });
  try {
    if (request.method !== 'POST') fail('Use POST.', 405);
    if (!SUPABASE_URL || !ANON_KEY || !SERVICE_KEY) fail('Function environment is not configured.', 500);
    const authorization = request.headers.get('Authorization');
    if (!authorization) fail('Authentication required.', 401);

    const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authorization } } });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) fail('Authentication required.', 401);
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const body = await request.json();

    if (body.action === 'start') {
      const difficulty = body.difficulty as Difficulty;
      const rounds = Number(body.rounds);
      if (!(difficulty in chances) || ![5, 10, 15].includes(rounds)) fail('Invalid game settings.');
      const { data, error } = await admin.schema('cogitster').from('cards').select('*').eq('status', 'published');
      if (error) throw error;
      const deck = secureShuffle((data as Card[]).map((card) => card.id));
      const needed = rounds * 2 + 2;
      if (deck.length < needed) fail('Not enough published cards to start this game.', 409);
      const gameData = {
        owner_id: userData.user.id,
        difficulty,
        rounds,
        active_card_id: deck[2],
        player_timeline: [deck[0]],
        ai_timeline: [deck[1]],
        deck: deck.slice(3, needed),
      };
      const { data: game, error: gameError } = await admin.schema('cogitster').from('games').insert(gameData).select('*').single();
      if (gameError) throw gameError;
      return json({ game: await gameView(admin, game as Game) }, 201);
    }

    if (body.action === 'resume') {
      const { data, error } = await admin.schema('cogitster').from('games').select('*')
        .eq('owner_id', userData.user.id).neq('phase', 'finished').order('updated_at', { ascending: false }).limit(1).maybeSingle();
      if (error) throw error;
      return json({ game: data ? await gameView(admin, data as Game) : null });
    }

    const game = await loadGame(admin, body.gameId, userData.user.id);
    const actionId = requireActionId(body.actionId);
    if (!(await recordAction(admin, game.id, body.action, actionId))) return json({ game: await gameView(admin, game) });
    const cardMap = await cardsFor(admin, [...game.player_timeline, ...game.ai_timeline, ...(game.active_card_id ? [game.active_card_id] : [])]);
    const active = game.active_card_id ? cardMap.get(game.active_card_id) : undefined;
    if (!active && body.action !== 'next') fail('Game has no active card.', 409);

    if (body.action === 'place') {
      if (game.phase !== 'player_turn') fail('It is not the player placement phase.', 409);
      const gap = Number(body.gap);
      if (!Number.isInteger(gap) || gap < 0 || gap > game.player_timeline.length) fail('Invalid placement.', 422);
      const correct = correctGap(game.player_timeline, active!, cardMap) === gap;
      const timeline = correct ? sortedIds([...game.player_timeline, active!.id], cardMap) : game.player_timeline;
      const next = await updateGame(admin, game.id, { player_timeline: timeline, player_score: game.player_score + Number(correct), phase: 'player_reveal' });
      return json({ correct, game: await gameView(admin, next) });
    }

    if (body.action === 'ai_place') {
      if (game.phase !== 'player_reveal') fail('The AI cannot move yet.', 409);
      const aiCardId = game.deck[0];
      if (!aiCardId) fail('The deck is exhausted.', 409);
      const nextMap = await cardsFor(admin, [...game.ai_timeline, aiCardId]);
      const aiCard = nextMap.get(aiCardId)!;
      const right = correctGap(game.ai_timeline, aiCard, nextMap);
      const options = Array.from({ length: game.ai_timeline.length + 1 }, (_, index) => index);
      const incorrect = options.filter((index) => index !== right).sort((a, b) => Math.abs(a - right) - Math.abs(b - right));
      const correct = crypto.getRandomValues(new Uint32Array(1))[0] / 0xffffffff <= chances[game.difficulty];
      const choice = correct || !incorrect.length ? right : incorrect[0];
      const next = await updateGame(admin, game.id, { active_card_id: aiCardId, deck: game.deck.slice(1), ai_choice: choice, phase: 'ai_placement' });
      return json({ game: await gameView(admin, next) });
    }

    if (body.action === 'ai_resolve') {
      if (game.phase !== 'ai_placement' || game.ai_choice === null) fail('The AI has not placed a card.', 409);
      const correct = correctGap(game.ai_timeline, active!, cardMap) === game.ai_choice;
      const timeline = correct ? sortedIds([...game.ai_timeline, active!.id], cardMap) : game.ai_timeline;
      const next = await updateGame(admin, game.id, { ai_timeline: timeline, ai_score: game.ai_score + Number(correct), ai_choice: null, phase: 'ai_reveal' });
      return json({ correct, game: await gameView(admin, next) });
    }

    if (body.action === 'next') {
      if (game.phase !== 'ai_reveal') fail('The round is not ready to advance.', 409);
      if (game.current_round >= game.rounds) {
        const next = await updateGame(admin, game.id, { phase: 'finished', finished_at: new Date().toISOString() });
        return json({ game: await gameView(admin, next) });
      }
      const playerCardId = game.deck[0];
      if (!playerCardId) fail('The deck is exhausted.', 409);
      const next = await updateGame(admin, game.id, { active_card_id: playerCardId, deck: game.deck.slice(1), current_round: game.current_round + 1, phase: 'player_turn' });
      return json({ game: await gameView(admin, next) });
    }

    fail('Unknown action.');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected server error.';
    const status = typeof error === 'object' && error && 'status' in error ? Number(error.status) : 500;
    return json({ error: message }, status);
  }
});
