// Conditions on script rows (TDD §5.1). Shared by the game and the script editor, no Phaser here.
//
//   [trust=cat] jaros: You listened to me.       → only if the Trust potion was brewed by the cat's recipe
//   [trust=book] heroine: ...                     → only if it was brewed by the book recipe
//   [cat>=3] jaros: ...                           → only if 3 or more potions so far used the cat's recipe
//   [cat<2, hope=cat] ...                         → several conditions: all must be true
// Comparisons for "cat": >=  <=  >  <  =

const POTION = /^([a-z_][a-z0-9_]*)\s*=\s*(cat|book)$/i;
const COUNT = /^cat\s*(>=|<=|>|<|=)\s*(\d+)$/i;

/** "trust=cat, cat>=3" → [{ type:'potion', potion:'trust', value:'cat' }, { type:'count', op:'>=', n:3 }] (+ bad ones as { type:'bad', text }) */
export function parseCond(text) {
  return String(text || '').split(',').map(s => s.trim()).filter(Boolean).map(s => {
    let m = s.match(COUNT);
    if (m) return { type: 'count', op: m[1], n: parseInt(m[2], 10) };
    m = s.match(POTION);
    if (m) return { type: 'potion', potion: m[1].toLowerCase(), value: m[2].toLowerCase() };
    return { type: 'bad', text: s };
  });
}

export function condToText(list) {
  return (list || []).map(c => c.type === 'count' ? `cat${c.op}${c.n}` : c.type === 'potion' ? `${c.potion}=${c.value}` : c.text).join(', ');
}

/** choices: potion id → 'book' | 'cat'. Unknown conditions count as true (the game warns about them at start). */
export function condOk(list, choices) {
  if (!list || !list.length) return true;
  const cats = Object.values(choices || {}).filter(v => v === 'cat').length;
  return list.every(c => {
    if (c.type === 'potion') return (choices || {})[c.potion] === c.value;
    if (c.type === 'count') {
      switch (c.op) {
        case '>=': return cats >= c.n;
        case '<=': return cats <= c.n;
        case '>': return cats > c.n;
        case '<': return cats < c.n;
        default: return cats === c.n;
      }
    }
    return true;
  });
}
