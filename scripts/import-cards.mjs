import { cards } from '../cards.js';

const url = process.env.SUPABASE_URL ?? process.env.PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
}

const payload = cards.map((card) => ({
  id: card.id,
  card_type: card.type,
  prompt: card.prompt,
  chronology_year: card.year,
  meta: card.meta,
  explanation: card.explanation,
  source_text: card.source,
  status: 'published',
}));

const response = await fetch(`${url}/rest/v1/cards?on_conflict=id`, {
  method: 'POST',
  headers: {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
    'Content-Profile': 'cogitster',
    Prefer: 'resolution=merge-duplicates,return=minimal',
  },
  body: JSON.stringify(payload),
});

if (!response.ok) throw new Error(`Card import failed: ${response.status} ${await response.text()}`);
console.log(`Imported ${payload.length} Cogitster cards.`);
