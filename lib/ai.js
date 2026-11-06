
// Shopping assistant for the personal care and beauty catalog.
const STOP = new Set(['the', 'and', 'for', 'with', 'that', 'this', 'want', 'need', 'something', 'under', 'below',
  'please', 'some', 'looking', 'find', 'get', 'buy', 'love', 'loves', 'like', 'who', 'her', 'his', 'them', 'friend']);

function keywordPicks(message, products) {
  const text = message.toLowerCase();
  const m = text.match(/(?:under|below|less than|max|budget(?: of)?)\s*\$?\s*(\d+(?:\.\d+)?)/);
  const budget = m ? Number(m[1]) : Infinity;
  const words = text.split(/[^a-z0-9]+/).filter(w => w.length > 2 && !STOP.has(w));
  const scored = products.map(p => {
    const hay = `${p.name} ${p.category} ${p.tags.join(' ')} ${p.description}`.toLowerCase();
    return { p, score: words.filter(w => hay.includes(w)).length };
  }).filter(s => s.score > 0 && s.p.price <= budget)
    .sort((a, b) => b.score - a.score || a.p.price - b.p.price).slice(0, 3);
  if (!scored.length) {
    return { reply: "I couldn't find a close match. Try a category like skincare, hair care, cosmetics, sunscreen or hygiene, or include a budget.", picks: [] };
  }
  return {
    reply: `I found ${scored.length} product${scored.length === 1 ? '' : 's'}${budget < Infinity ? ` within your $${budget} budget` : ''} and added them to your cart.`,
    picks: scored.map(s => ({ id: s.p.id, qty: 1 })),
  };
}
function cleanPicks(picks, products) {
  if (!Array.isArray(picks)) return [];
  const seen = new Set(), out = [];
  for (const pick of picks.slice(0, 4)) {
    const id = Number(pick && pick.id);
    if (!products.some(p => p.id === id) || seen.has(id)) continue;
    seen.add(id);
    out.push({ id, qty: Math.min(10, Math.max(1, parseInt(pick.qty, 10) || 1)) });
  }
  return out;
}
async function askClaude(message, products) {
  const catalog = products.map(({id,name,category,price,size,description}) => ({id,name,category,price_usd:price,size,description}));
  const system = 'You are the helpful shopping assistant for Glow & Care, a personal care and beauty shop. ' +
    'Choose products ONLY from this catalog: ' + JSON.stringify(catalog) + '. ' +
    'Respect the shopper budget (total must stay within it). Pick at most 4 items. ' +
    'Reply ONLY with JSON: {"reply":"one or two friendly sentences","picks":[{"id":1,"qty":1}]}. ' +
    'If nothing fits, return an empty picks array and say so.';
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {'content-type':'application/json','x-api-key':process.env.AI_API_KEY,'anthropic-version':'2023-06-01'},
    body: JSON.stringify({model:process.env.AI_MODEL || 'claude-haiku-5-5',max_tokens:400,system,messages:[{role:'user',content:message}]}),
  });
  const data = await res.json();
  if (!res.ok) throw new Error('AI request failed: ' + JSON.stringify(data));
  const raw = (data.content || []).map(c => c.text || '').join('');
  const parsed = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1));
  return {reply:String(parsed.reply || '').slice(0,400),picks:cleanPicks(parsed.picks,products)};
}
async function askAssistant(message, products) {
  const msg = String(message || '').slice(0,300);
  if (process.env.AI_API_KEY) {
    try { return await askClaude(msg,products); }
    catch (err) { console.error('AI error, using fallback:',err.message); }
  }
  return keywordPicks(msg,products);
}
module.exports = { askAssistant };
