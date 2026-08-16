import { cards } from './cards.js';
import { backend } from './backend.js';

const STORAGE_KEY = 'cogitster-progress-v1';
const CHECKPOINT_KEY = 'cogitster-active-game-v1';
const difficulties = {
  curious: { label: 'Curious', correctChance: 0.45 },
  scholar: { label: 'Scholar', correctChance: 0.65 },
  oracle: { label: 'Oracle', correctChance: 0.82 },
};

const el = (id) => document.getElementById(id);
const ui = {
  welcome: el('welcome-screen'), game: el('game-screen'), finish: el('finish-screen'),
  start: el('start-button'), resume: el('resume-button'), rounds: el('rounds-select'),
  gamesPlayed: el('games-played'), cardsSeen: el('cards-seen'),
  roundLabel: el('round-label'), turnTitle: el('turn-title'), playerScore: el('player-score'),
  aiScore: el('ai-score'), aiName: el('ai-name'), aiNameSecondary: el('ai-name-secondary'),
  timeline: el('timeline'), aiTimeline: el('ai-timeline'), timelineCount: el('timeline-count'),
  confirm: el('confirm-button'), drawCard: el('draw-card'), cardType: el('card-type'),
  cardIndex: el('card-index'), cardPrompt: el('card-prompt'), cardCue: el('card-cue'),
  result: el('result-panel'), aiStatus: el('ai-status'), playAgain: el('play-again-button'),
  backHome: el('back-home-button'), finishTitle: el('finish-title'), finishSummary: el('finish-summary'),
  finalPlayerScore: el('final-player-score'), finalAiScore: el('final-ai-score'), finalAiName: el('final-ai-name'),
  howTo: el('how-to-dialog'), howToButton: el('how-to-button'), closeHowTo: el('close-how-to'),
  authButton: el('auth-button'), auth: el('auth-dialog'), closeAuth: el('close-auth'), authForm: el('auth-form'),
  email: el('email-input'), authMessage: el('auth-message'), guestPlay: el('guest-play-button'),
};

let selectedDifficulty = 'curious';
let state = null;
let pendingRemoteGame = null;

function storageGet(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}

function storageSet(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Browser storage is optional. */ }
}

function formatYear(year) {
  return year < 0 ? `${Math.abs(year)} BCE` : String(year);
}

function cloneCard(card) {
  return { ...card };
}

function isPlayerTurn() {
  return state?.phase === 'player';
}

function isRemoteGame() {
  return Boolean(state?.remote);
}

function actionId() {
  return crypto.randomUUID();
}

function applyRemoteGame(game) {
  const phase = {
    player_turn: 'player',
    player_reveal: 'player-reveal',
    ai_placement: 'ai-placement',
    ai_reveal: 'ai-reveal',
    finished: 'finished',
  }[game.phase];
  const revealedResult = phase === 'player-reveal' || phase === 'ai-reveal'
    ? {
      actor: phase === 'player-reveal' ? 'player' : 'ai',
      card: game.activeCard,
      correct: (phase === 'player-reveal' ? game.playerTimeline : game.aiTimeline)
        .some((card) => card.id === game.activeCard?.id),
    }
    : null;
  state = {
    remote: true,
    id: game.id,
    difficulty: game.difficulty,
    rounds: game.rounds,
    currentRound: game.currentRound,
    playerScore: game.playerScore,
    aiScore: game.aiScore,
    playerTimeline: game.playerTimeline,
    aiTimeline: game.aiTimeline,
    activeCard: game.activeCard,
    aiChoice: game.aiChoice,
    selectedGap: null,
    phase,
    seenIds: [...new Set([...game.playerTimeline, ...game.aiTimeline, game.activeCard].filter(Boolean).map((card) => card.id))],
    // Result details are not stored separately: a revealed card belongs to its
    // timeline only when the placement was correct. Rebuild this on resume so
    // the player can always continue a cloud-saved game.
    lastResult: revealedResult,
  };
}

function showGameError(message) {
  ui.result.className = 'result-panel is-incorrect';
  ui.result.replaceChildren();
  const title = document.createElement('h3');
  title.textContent = 'Game service issue';
  const detail = document.createElement('p');
  detail.textContent = message;
  ui.result.append(title, detail);
}

function seededRandom() {
  state.aiSeed += 0x6d2b79f5;
  let t = state.aiSeed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function shuffledDeck(seed) {
  const deck = cards.map(cloneCard);
  let t = seed >>> 0;
  const random = () => {
    t += 0x6d2b79f5;
    let value = t;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
  for (let index = deck.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [deck[index], deck[swapIndex]] = [deck[swapIndex], deck[index]];
  }
  return deck;
}

function drawCard() {
  const card = state.deck.pop();
  if (!card) throw new Error('The deck ran out of cards.');
  state.seenIds.push(card.id);
  return card;
}

async function startGame({ localOnly = false } = {}) {
  if (!localOnly && backend.configured()) {
    const user = await backend.currentUser();
    if (!user) {
      ui.authMessage.textContent = 'Sign in to save this game across devices.';
      ui.auth.showModal();
      return;
    }
    ui.start.disabled = true;
    ui.start.textContent = 'Starting saved game…';
    try {
      const response = await backend.action({ action: 'start', difficulty: selectedDifficulty, rounds: Number(ui.rounds.value) });
      applyRemoteGame(response.game);
      showScreen('game');
      renderGame();
    } catch (error) {
      window.alert(error.message);
    } finally {
      ui.start.disabled = false;
      ui.start.innerHTML = 'Start a solo game <span aria-hidden="true">→</span>';
    }
    return;
  }
  const seed = (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;
  state = {
    difficulty: selectedDifficulty,
    rounds: Number(ui.rounds.value),
    currentRound: 1,
    playerScore: 0,
    aiScore: 0,
    playerTimeline: [],
    aiTimeline: [],
    deck: shuffledDeck(seed),
    seenIds: [],
    activeCard: null,
    selectedGap: null,
    aiChoice: null,
    phase: 'player',
    aiSeed: seed ^ 0xa5a5a5a5,
    lastResult: null,
  };
  state.playerTimeline.push(drawCard());
  state.aiTimeline.push(drawCard());
  preparePlayerTurn();
  showScreen('game');
}

function preparePlayerTurn() {
  state.phase = 'player';
  state.selectedGap = null;
  state.lastResult = null;
  state.activeCard = drawCard();
  saveCheckpoint();
  renderGame();
}

function showScreen(name) {
  ui.welcome.classList.toggle('is-hidden', name !== 'welcome');
  ui.game.classList.toggle('is-hidden', name !== 'game');
  ui.finish.classList.toggle('is-hidden', name !== 'finish');
}

function timelineSorted(timeline) {
  return [...timeline].sort((a, b) => a.year - b.year || a.id.localeCompare(b.id));
}

function isCorrectPlacement(timeline, card, gap) {
  const ordered = timelineSorted(timeline);
  const before = ordered[gap - 1];
  const after = ordered[gap];
  return (!before || card.year >= before.year) && (!after || card.year <= after.year);
}

function placeCard(timeline, card) {
  timeline.push(card);
  timeline.sort((a, b) => a.year - b.year || a.id.localeCompare(b.id));
}

function setCard(card, hidden = true, cardNumber = state.currentRound) {
  ui.cardType.textContent = card.type === 'Thinker' ? 'Thinker · birth year' : card.type;
  ui.cardIndex.textContent = String(cardNumber).padStart(2, '0');
  ui.cardPrompt.textContent = card.prompt;
  ui.cardCue.textContent = hidden ? (card.type === 'Thinker' ? 'Place their birth year on your timeline.' : 'Place this on your timeline.') : `${formatYear(card.year)} · ${card.meta}`;
  ui.drawCard.classList.toggle('draw-card--hidden', hidden);
}

function renderTimeline() {
  const ordered = timelineSorted(state.playerTimeline);
  ui.timeline.innerHTML = '';
  for (let gap = 0; gap <= ordered.length; gap += 1) {
    const gapButton = document.createElement('button');
    gapButton.type = 'button';
    gapButton.className = `gap-button${state.selectedGap === gap ? ' is-selected' : ''}`;
    gapButton.disabled = !isPlayerTurn();
    const before = ordered[gap - 1]?.prompt;
    const after = ordered[gap]?.prompt;
    gapButton.textContent = before && after ? `Between ${before} and ${after}` : before ? `After ${before}` : `Before ${after}`;
    gapButton.setAttribute('aria-label', gapButton.textContent);
    gapButton.addEventListener('click', () => {
      state.selectedGap = gap;
      renderTimeline();
      ui.confirm.disabled = false;
      saveCheckpoint();
    });
    ui.timeline.append(gapButton);

    if (ordered[gap]) {
      const card = ordered[gap];
      const cardElement = document.createElement('article');
      cardElement.className = 'timeline-card';
      cardElement.innerHTML = `<span class="timeline-year">${formatYear(card.year)}</span><div><p class="timeline-card-title"></p><p class="timeline-card-meta"></p></div>`;
      cardElement.querySelector('.timeline-card-title').textContent = card.prompt;
      cardElement.querySelector('.timeline-card-meta').textContent = card.meta;
      ui.timeline.append(cardElement);
    }
  }
  ui.timelineCount.textContent = `${ordered.length} ${ordered.length === 1 ? 'card' : 'cards'}`;
}

function renderAiTimeline() {
  const ordered = timelineSorted(state.aiTimeline);
  ui.aiTimeline.innerHTML = '';
  for (let gap = 0; gap <= ordered.length; gap += 1) {
    if (state.phase === 'ai-placement' && state.aiChoice === gap) {
      const choice = document.createElement('article');
      choice.className = 'mini-card mini-card--choice';
      choice.innerHTML = '<strong></strong><span>AI places it here</span>';
      choice.querySelector('strong').textContent = state.activeCard.prompt;
      ui.aiTimeline.append(choice);
    }

    if (ordered[gap]) {
      const card = ordered[gap];
      const element = document.createElement('article');
      element.className = 'mini-card';
      element.innerHTML = '<strong></strong><span></span>';
      element.querySelector('strong').textContent = card.prompt;
      element.querySelector('span').textContent = formatYear(card.year);
      ui.aiTimeline.append(element);
    }
  }
}

function renderResult(result) {
  if (!result) {
    ui.result.classList.add('is-hidden');
    ui.result.replaceChildren();
    return;
  }
  ui.result.className = `result-panel ${result.correct ? '' : 'is-incorrect'}`;
  const title = document.createElement('h3');
  title.textContent = result.correct ? 'Correct placement — one point.' : 'Not quite — no point this time.';
  const explanation = document.createElement('p');
  explanation.textContent = result.card.explanation;
  const source = document.createElement('p');
  source.className = 'source';
  source.textContent = result.card.source;
  ui.result.replaceChildren(title, explanation, source);

  const next = document.createElement('button');
  next.type = 'button';
  next.className = 'primary-button next-turn-button';
  next.textContent = result.actor === 'player' ? 'Watch AI turn →' : (state.currentRound === state.rounds ? 'See results →' : 'Next round →');
  next.addEventListener('click', result.actor === 'player' ? beginAiTurn : nextRound);
  ui.result.append(next);
}

function renderGame() {
  const difficulty = difficulties[state.difficulty];
  ui.roundLabel.textContent = `Round ${state.currentRound} of ${state.rounds}`;
  ui.playerScore.textContent = state.playerScore;
  ui.aiScore.textContent = state.aiScore;
  ui.aiName.textContent = difficulty.label;
  ui.aiNameSecondary.textContent = difficulty.label;
  ui.confirm.disabled = !isPlayerTurn() || state.selectedGap === null;
  ui.confirm.classList.toggle('is-hidden', !isPlayerTurn());
  const isAiTurn = state.phase === 'ai-thinking' || state.phase === 'ai-placement' || state.phase === 'ai-reveal';
  ui.turnTitle.textContent = isAiTurn ? `${difficulty.label}'s turn` : 'Your turn';
  ui.game.classList.toggle('is-ai-turn', isAiTurn);
  ui.aiStatus.textContent = state.phase === 'ai-thinking' ? 'Thinking…' : state.phase === 'ai-placement' ? 'Placement chosen' : state.phase === 'ai-reveal' ? 'Turn complete' : 'Waiting for you';
  ui.aiStatus.classList.toggle('is-thinking', state.phase === 'ai-thinking' || state.phase === 'ai-placement');
  setCard(state.activeCard, state.phase === 'player' || state.phase === 'ai-thinking' || state.phase === 'ai-placement');
  renderTimeline();
  renderAiTimeline();
  renderResult(state.lastResult);
}

async function confirmPlacement() {
  if (!isPlayerTurn() || state.selectedGap === null) return;
  if (isRemoteGame()) {
    ui.confirm.disabled = true;
    try {
      const response = await backend.action({ action: 'place', gameId: state.id, actionId: actionId(), gap: state.selectedGap });
      applyRemoteGame(response.game);
      state.lastResult = { actor: 'player', card: state.activeCard, correct: response.correct };
      renderGame();
    } catch (error) {
      ui.confirm.disabled = false;
      showGameError(error.message);
    }
    return;
  }
  const correct = isCorrectPlacement(state.playerTimeline, state.activeCard, state.selectedGap);
  if (correct) {
    placeCard(state.playerTimeline, state.activeCard);
    state.playerScore += 1;
  }
  state.lastResult = { actor: 'player', card: state.activeCard, correct };
  state.phase = 'player-reveal';
  saveCheckpoint();
  renderGame();
}

function correctGap(timeline, card) {
  const ordered = timelineSorted(timeline);
  for (let gap = 0; gap <= ordered.length; gap += 1) {
    if (isCorrectPlacement(ordered, card, gap)) return gap;
  }
  return 0;
}

function aiPlacement(timeline, card) {
  const right = correctGap(timeline, card);
  if (seededRandom() <= difficulties[state.difficulty].correctChance) return right;
  const options = Array.from({ length: timeline.length + 1 }, (_, index) => index).filter((gap) => gap !== right);
  if (!options.length) return right;
  const nearby = options.sort((a, b) => Math.abs(a - right) - Math.abs(b - right));
  const pool = nearby.slice(0, Math.min(2, nearby.length));
  return pool[Math.floor(seededRandom() * pool.length)];
}

async function beginAiTurn() {
  if (state.phase !== 'player-reveal') return;
  if (isRemoteGame()) {
    state.phase = 'ai-thinking';
    state.lastResult = null;
    renderGame();
    window.setTimeout(async () => {
      try {
        const response = await backend.action({ action: 'ai_place', gameId: state.id, actionId: actionId() });
        applyRemoteGame(response.game);
        renderGame();
        window.setTimeout(resolveAiTurn, 1700);
      } catch (error) {
        showGameError(error.message);
      }
    }, 1000);
    return;
  }
  state.phase = 'ai-thinking';
  state.aiChoice = null;
  state.activeCard = drawCard();
  state.lastResult = null;
  saveCheckpoint();
  renderGame();
  window.setTimeout(showAiPlacement, 1400);
}

function showAiPlacement() {
  if (!state || state.phase !== 'ai-thinking') return;
  state.aiChoice = aiPlacement(state.aiTimeline, state.activeCard);
  state.phase = 'ai-placement';
  saveCheckpoint();
  renderGame();
  window.setTimeout(resolveAiTurn, 1700);
}

async function resolveAiTurn() {
  if (!state || state.phase !== 'ai-placement') return;
  if (isRemoteGame()) {
    try {
      const response = await backend.action({ action: 'ai_resolve', gameId: state.id, actionId: actionId() });
      applyRemoteGame(response.game);
      state.lastResult = { actor: 'ai', card: state.activeCard, correct: response.correct };
      renderGame();
    } catch (error) {
      showGameError(error.message);
    }
    return;
  }
  const correct = isCorrectPlacement(state.aiTimeline, state.activeCard, state.aiChoice);
  if (correct) {
    placeCard(state.aiTimeline, state.activeCard);
    state.aiScore += 1;
  }
  state.lastResult = { actor: 'ai', card: state.activeCard, correct };
  state.phase = 'ai-reveal';
  state.aiChoice = null;
  saveCheckpoint();
  renderGame();
}

async function nextRound() {
  if (isRemoteGame()) {
    try {
      const response = await backend.action({ action: 'next', gameId: state.id, actionId: actionId() });
      applyRemoteGame(response.game);
      if (state.phase === 'finished') finishGame();
      else renderGame();
    } catch (error) {
      showGameError(error.message);
    }
    return;
  }
  if (state.currentRound >= state.rounds) {
    finishGame();
    return;
  }
  state.currentRound += 1;
  preparePlayerTurn();
}

function finishGame() {
  const difficulty = difficulties[state.difficulty];
  const stats = storageGet(STORAGE_KEY, { gamesPlayed: 0, seenIds: [] });
  stats.gamesPlayed += 1;
  stats.seenIds = [...new Set([...stats.seenIds, ...state.seenIds])];
  storageSet(STORAGE_KEY, stats);
  try { localStorage.removeItem(CHECKPOINT_KEY); } catch { /* Optional storage. */ }
  ui.finalPlayerScore.textContent = state.playerScore;
  ui.finalAiScore.textContent = state.aiScore;
  ui.finalAiName.textContent = difficulty.label;
  const delta = state.playerScore - state.aiScore;
  ui.finishTitle.textContent = delta > 0 ? 'You outthought the AI.' : delta < 0 ? `${difficulty.label} edged ahead.` : 'An even timeline.';
  ui.finishSummary.textContent = delta > 0 ? 'A well-ordered history of ideas. Try a tougher opponent when you are ready.' : delta < 0 ? 'Every reveal adds to your library. A fresh deck will give you another route through the history of ideas.' : 'Neither side found an advantage. One more game could settle it.';
  updateProgress();
  showScreen('finish');
}

function saveCheckpoint() {
  if (!state || isRemoteGame() || state.phase === 'ai-thinking') return;
  storageSet(CHECKPOINT_KEY, state);
}

function updateProgress() {
  const stats = storageGet(STORAGE_KEY, { gamesPlayed: 0, seenIds: [] });
  ui.gamesPlayed.textContent = stats.gamesPlayed;
  ui.cardsSeen.textContent = stats.seenIds.length;
  const localGame = storageGet(CHECKPOINT_KEY, null);
  ui.resume.classList.toggle('is-hidden', !localGame && !pendingRemoteGame);
  ui.resume.textContent = pendingRemoteGame ? 'Resume saved cloud game' : 'Resume saved game';
}

function resumeGame() {
  if (pendingRemoteGame) {
    applyRemoteGame(pendingRemoteGame);
    pendingRemoteGame = null;
    showScreen('game');
    renderGame();
    if (state.phase === 'ai-placement') window.setTimeout(resolveAiTurn, 450);
    return;
  }
  const saved = storageGet(CHECKPOINT_KEY, null);
  if (!saved || !saved.activeCard) return;
  state = saved;
  if (state.phase === 'ai-thinking') state.phase = 'player-reveal';
  showScreen('game');
  renderGame();
  if (state.phase === 'ai-placement') window.setTimeout(resolveAiTurn, 450);
}

async function initializeAuth() {
  if (!backend.configured()) return;
  ui.authButton.classList.remove('is-hidden');
  const user = await backend.currentUser();
  if (!user) {
    ui.authButton.textContent = 'Sign in to save';
    return;
  }
  ui.authButton.textContent = user.email ?? 'Signed in';
  try {
    const response = await backend.action({ action: 'resume' });
    pendingRemoteGame = response.game ?? null;
    updateProgress();
  } catch (error) {
    console.warn('Could not restore a saved Cogitster game.', error);
  }
}

async function submitAuth(event) {
  event.preventDefault();
  const email = ui.email.value.trim();
  if (!email) return;
  ui.authMessage.textContent = 'Sending sign-in link…';
  try {
    await backend.sendMagicLink(email);
    ui.authMessage.textContent = 'Check your inbox, then open the sign-in link in this browser.';
  } catch (error) {
    ui.authMessage.textContent = error.message;
  }
}

document.querySelectorAll('[data-difficulty]').forEach((button) => {
  button.addEventListener('click', () => {
    selectedDifficulty = button.dataset.difficulty;
    document.querySelectorAll('[data-difficulty]').forEach((choice) => {
      const active = choice === button;
      choice.classList.toggle('is-selected', active);
      choice.setAttribute('aria-checked', String(active));
    });
  });
});

ui.start.addEventListener('click', startGame);
ui.resume.addEventListener('click', resumeGame);
ui.confirm.addEventListener('click', confirmPlacement);
ui.playAgain.addEventListener('click', startGame);
ui.backHome.addEventListener('click', () => { updateProgress(); showScreen('welcome'); });
ui.howToButton.addEventListener('click', () => ui.howTo.showModal());
ui.closeHowTo.addEventListener('click', () => ui.howTo.close());
ui.howTo.addEventListener('click', (event) => { if (event.target === ui.howTo) ui.howTo.close(); });
ui.authButton.addEventListener('click', async () => {
  if (await backend.currentUser()) {
    backend.clearSession();
    pendingRemoteGame = null;
    ui.authButton.textContent = 'Sign in to save';
    updateProgress();
    return;
  }
  ui.authMessage.textContent = '';
  ui.auth.showModal();
});
ui.closeAuth.addEventListener('click', () => ui.auth.close());
ui.auth.addEventListener('click', (event) => { if (event.target === ui.auth) ui.auth.close(); });
ui.authForm.addEventListener('submit', submitAuth);
ui.guestPlay.addEventListener('click', () => {
  ui.auth.close();
  startGame({ localOnly: true });
});

updateProgress();
initializeAuth();
