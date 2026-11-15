// Bonding Potion — Script editor (TDD §13.2).
// Edits data/script.txt (lines, speakers, emotions, characters appearing and leaving, conditions, potion-screen lines)
// and the character names in data/characters.json, inside the chosen project folder (File System Access API,
// Chrome / Edge). It reads the script with the game's own parser, so what you see is what the game reads.

import { parseScript } from '../src/systems/ScriptParser.js';
import { condToText } from '../src/systems/Conditions.js';

const $ = (id) => document.getElementById(id);
const S = {
  root: null, stamp: null, backedUp: {},
  model: null,             // { preamble: [], sections: [] }
  chars: {}, images: {}, potions: [], texts: {}, ph: {},
  current: 0, view: 'script',
  undo: [], redo: [], savedScript: '', savedChars: '', typingSnap: false,
  search: '', testChoices: {}, drag: null, imgUrls: {}
};
let uid = 1;

const MOMENTS = {
  start: 'When the potion screen opens',
  tutorial_recipe: 'Tutorial 1: the recipe page',
  tutorial_elements: 'Tutorial 2: elements and the counter',
  tutorial_drag: 'Tutorial 3: drag a crystal in',
  tutorial_brew: 'Tutorial 4: the Brew button',
  advice: "Cat's advice (his recipe bubble appears)",
  resist_heavy: 'Book resists: a crystal feels heavy (first time)',
  resist_slip: 'Book resists: a crystal slips away (first time)',
  hint: 'Player seems stuck (hint)',
  fizzle: 'Wrong mix: the potion fizzles',
  success: 'The potion is brewed'
};
const OPS = { '>=': 'at least', '<=': 'at most', '=': 'exactly', '<': 'fewer than', '>': 'more than' };

// ------------------------------------------------------------------ helpers

function toast(msg) {
  const t = $('toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toast.timer); toast.timer = setTimeout(() => t.classList.remove('show'), 2800);
}
function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
function btn(label, title, fn, cls) { const b = el('button', cls, label); if (title) b.title = title; b.addEventListener('click', fn); return b; }
function opt(value, label, selected) { const o = el('option', null, label); o.value = value; if (selected) o.selected = true; return o; }

async function sha256(blob) {
  const buf = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
}

// The folder is remembered between visits (shared with the Art editor).
function idb() {
  return new Promise((res, rej) => {
    const r = indexedDB.open('bonding_potion_editor', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('kv');
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
}
async function idbSet(k, v) { const db = await idb(); return new Promise(res => { const tx = db.transaction('kv', 'readwrite'); tx.objectStore('kv').put(v, k); tx.oncomplete = res; }); }
async function idbGet(k) { const db = await idb(); return new Promise(res => { const r = db.transaction('kv').objectStore('kv').get(k); r.onsuccess = () => res(r.result); r.onerror = () => res(null); }); }

async function dirFor(path, create) {
  const parts = path.split('/'); parts.pop();
  let dir = S.root;
  for (const p of parts) dir = await dir.getDirectoryHandle(p, { create: !!create });
  return dir;
}
async function readFile(path) {
  try { const dir = await dirFor(path); return await (await dir.getFileHandle(path.split('/').pop())).getFile(); }
  catch (e) { return null; }
}
async function writeFile(path, data) {
  const dir = await dirFor(path, true);
  const fh = await dir.getFileHandle(path.split('/').pop(), { create: true });
  const w = await fh.createWritable(); await w.write(data); await w.close();
}
async function readText(path) { const f = await readFile(path); return f ? await f.text() : null; }

/** Keeps the version from before this editing session in .backup/<date>/ (once per file per session). */
async function backup(path) {
  if (S.backedUp[path]) return;
  const old = await readFile(path);
  if (!old) return;
  if (!S.stamp) {
    const d = new Date(), p = (n) => String(n).padStart(2, '0');
    S.stamp = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}-${p(d.getMinutes())}-${p(d.getSeconds())}`;
  }
  await writeFile(`.backup/${S.stamp}/${path}`, old);
  S.backedUp[path] = true;
}

// ------------------------------------------------------------------ script ⇄ model

function toRow(r) {
  return { uid: uid++, kind: r.kind, speaker: r.speaker || null, expr: r.expr || null, text: r.text || '',
    name: r.name || null, args: r.args ? [...r.args] : [], cond: (r.cond || []).map(c => ({ ...c })) };
}

function buildModel(text) {
  const p = parseScript(text);
  const sections = p.sections.map(s => {
    const sec = { header: s.header, id: s.id, type: s.type, potionId: s.potionId, endingId: s.endingId };
    if (s.type === 'potion') {
      sec.events = [];
      const get = (name) => {
        let e = sec.events.find(x => x.name === name);
        if (!e) { e = { name, random: false, rows: [] }; sec.events.push(e); }
        return e;
      };
      let ev = null;
      for (const r of s.rows) {
        if (r.kind === 'cmd' && r.name === 'on') {
          ev = get((r.args[0] || 'start').toLowerCase());
          if ((r.args[1] || '').toLowerCase() === 'random') ev.random = true;
          continue;
        }
        (ev || (ev = get('start'))).rows.push(toRow(r));
      }
    } else {
      sec.rows = s.rows.map(toRow);
    }
    return sec;
  });
  return { preamble: p.preamble, sections };
}

function clean(s) { return String(s || '').replace(/\s*\n\s*/g, ' ').trim(); }

function rowText(r) {
  const pre = r.cond && r.cond.length ? `[${condToText(r.cond)}] ` : '';
  switch (r.kind) {
    case 'line': return pre + (r.speaker ? `${r.speaker}${r.expr ? ' ' + r.expr : ''}: ` : ': ') + clean(r.text);
    case 'cmd': { const a = r.args.map(clean).filter(Boolean); return pre + '@' + r.name + (a.length ? ' ' + a.join(' ') : ''); }
    case 'comment': return '# ' + clean(r.text);
    default: return clean(r.text);
  }
}

function serialize(m) {
  const out = [...m.preamble];
  for (const s of m.sections) {
    out.push('', s.header);
    if (s.type === 'potion') {
      for (const e of s.events) {
        out.push(`@on ${e.name}${e.random ? ' random' : ''}`);
        e.rows.forEach(r => out.push(rowText(r)));
      }
    } else {
      s.rows.forEach(r => out.push(rowText(r)));
    }
  }
  return out.join('\n') + '\n';
}

function charsText() {
  const ids = Object.keys(S.chars);
  const w = Math.max(...ids.map(id => id.length)) + 3;
  const lines = ids.map(id => {
    const o = S.chars[id];
    const body = '{ ' + Object.entries(o).map(([k, v]) => `${JSON.stringify(k)}: ${JSON.stringify(v)}`).join(', ') + ' }';
    return '  ' + (JSON.stringify(id) + ':').padEnd(w) + body;
  });
  return '{\n' + lines.join(',\n') + '\n}\n';
}

// ------------------------------------------------------------------ names and lookups

function potionName(id) {
  const p = S.potions.find(x => x.id === id);
  return p ? p.name.replace(/^Potion of /i, '') : id;
}
function sectionLabel(s) {
  if (s.type === 'ending') return 'Ending: ' + (S.texts['ending.' + s.endingId] || s.endingId);
  if (s.type === 'potion') { const n = (s.id.match(/\d+/) || [''])[0]; return `Potion ${n}: ${potionName(s.potionId)}`; }
  const n = s.id.match(/^d(\d+)$/);
  return n ? `Dialogue ${n[1]}` : s.id;
}
function sectionSub(s) {
  if (s.type === 'ending') return `Ending scene “${s.endingId}”. Played after the love potion, before the ending card.`;
  if (s.type === 'potion') return 'Potion screen. Lines are grouped by the moment when they are said.';
  return 'Visual-novel scene.';
}
function charLabel(id) {
  const c = S.chars[id];
  if (!c) return id + ' (unknown)';
  // Two characters with the same name (Jaros the cat and Jaros the human) get a hint in brackets.
  const sameName = Object.keys(S.chars).filter(k => S.chars[k].name === c.name).length > 1;
  return sameName ? `${c.name} (${c.kind === 'cat' ? 'cat' : id.replace(/^[^_]*_?/, '') || id})` : c.name;
}
function charBase(id) { const c = S.chars[id]; return (c && c.image) || id; }
function emotions(id) {
  const pre = charBase(id) + '_';
  return Object.keys(S.images).filter(k => k.startsWith(pre)).map(k => k.slice(pre.length)).filter(x => /^[a-z0-9]+$/.test(x));
}
function spriteChars() { return Object.keys(S.chars).filter(id => S.chars[id].kind === 'sprite'); }
function catChars() { return Object.keys(S.chars).filter(id => S.chars[id].kind === 'cat'); }
function backgrounds() { return Object.keys(S.images).filter(k => k.startsWith('bg_') && k !== 'bg_title').map(k => k.slice(3)); }
function catPotions() { return S.potions.filter(p => p.cat); }

function describeCond(list) {
  return list.map(c => {
    if (c.type === 'potion') return `${potionName(c.potion)}: ${c.value === 'cat' ? "cat's recipe" : 'book recipe'}`;
    if (c.type === 'count') return `cat's recipe ${OPS[c.op] || c.op} ${c.n}×`;
    return `“${c.text}”?`;
  }).join(' and ');
}

// ------------------------------------------------------------------ undo / dirty

function snap() {
  S.undo.push({ text: serialize(S.model), current: S.current });
  if (S.undo.length > 200) S.undo.shift();
  S.redo = [];
}
function restore(from, to) {
  const st = from.pop();
  if (!st) return;
  to.push({ text: serialize(S.model), current: S.current });
  S.model = buildModel(st.text);
  S.current = Math.min(st.current, S.model.sections.length - 1);
  changed();
}
function isDirty() { return serialize(S.model) !== S.savedScript || charsText() !== S.savedChars; }
function updateDirty() {
  $('dirty').hidden = !isDirty();
  $('btn-undo').disabled = !S.undo.length; $('btn-redo').disabled = !S.redo.length;
}
function changed(focusUid) {
  updateDirty(); renderSidebar(); renderContent(focusUid); refreshWarnings();
}

// ------------------------------------------------------------------ opening the project

async function openRoot(handle) {
  S.root = handle;
  const script = await readText('data/script.txt');
  const assets = await readText('data/assets.json');
  if (script == null || !assets) {
    S.root = null;
    toast('That folder is not the bonding_potion project (data/script.txt not found).');
    return;
  }
  try {
    S.images = JSON.parse(assets).images || {};
    S.chars = JSON.parse(await readText('data/characters.json') || '{}');
    S.potions = JSON.parse(await readText('data/potions.json') || '[]');
    S.texts = JSON.parse(await readText('data/texts.json') || '{}');
    const ph = await readText('assets/placeholders.json');
    S.ph = ph ? (JSON.parse(ph).files || {}) : {};
  } catch (e) { toast('Could not read the data files: ' + e.message); return; }
  S.model = buildModel(script);
  S.savedScript = serialize(S.model);
  S.savedChars = charsText();
  S.undo = []; S.redo = [];
  const want = decodeURIComponent(location.hash.slice(1));
  const i = S.model.sections.findIndex(s => s.id === want);
  S.current = i >= 0 ? i : 0;
  $('folder-status').textContent = `Folder: ${handle.name}`;
  $('intro').hidden = true; $('app').hidden = false; $('save-bar').hidden = false; $('btn-reconnect').hidden = true;
  $('btn-pick').textContent = 'Change folder…'; $('btn-pick').classList.remove('primary');
  await idbSet('root', handle);
  if (script.replace(/\r\n?/g, '\n') !== S.savedScript) {
    toast('Note: blank lines in script.txt will be tidied when you save.');
  }
  changed();
}

async function pickFolder() {
  try { await openRoot(await window.showDirectoryPicker({ id: 'bonding_potion', mode: 'readwrite' })); }
  catch (e) { if (e.name !== 'AbortError') toast('Could not open the folder: ' + e.message); }
}
async function reconnect() {
  const h = await idbGet('root');
  if (h && (await h.requestPermission({ mode: 'readwrite' })) === 'granted') await openRoot(h);
}

// ------------------------------------------------------------------ saving

async function save() {
  if (!S.root) return false;
  try {
    const text = serialize(S.model);
    if (text !== S.savedScript) {
      await backup('data/script.txt');
      await writeFile('data/script.txt', text);
      S.savedScript = text;
    }
    const ct = charsText();
    if (ct !== S.savedChars) {
      await backup('data/characters.json');
      await writeFile('data/characters.json', ct);
      S.savedChars = ct;
    }
    updateDirty();
    toast('Saved.');
    return true;
  } catch (e) {
    toast('Could not save: ' + e.message);
    return false;
  }
}

async function play() {
  if (isDirty() && !(await save())) return;
  const sec = S.model.sections[S.current];
  const ch = Object.entries(S.testChoices).filter(([, v]) => v).map(([k, v]) => `${k}:${v}`).join(',');
  window.open(`index.html?scene=${encodeURIComponent(sec.id)}${ch ? '&choices=' + ch : ''}`, 'bonding_potion_game');
}

// ------------------------------------------------------------------ sidebar

function rowsOf(sec) { return sec.type === 'potion' ? sec.events.flatMap(e => e.rows) : sec.rows; }
function matches(r) { return S.search && rowText(r).toLowerCase().includes(S.search); }

function renderSidebar() {
  const ul = $('sections'); ul.innerHTML = '';
  $('tab-script').classList.toggle('on', S.view === 'script');
  $('tab-chars').classList.toggle('on', S.view === 'chars');
  let group = null;
  S.model.sections.forEach((s, i) => {
    const g = s.type === 'ending' ? 'Endings' : 'Story';
    if (g !== group) { group = g; ul.append(el('li', 'group', g)); }
    const li = el('li', S.view === 'script' && i === S.current ? 'on' : '');
    li.append(el('span', null, sectionLabel(s)));
    if (S.search) {
      const hits = rowsOf(s).filter(matches).length;
      if (hits) li.append(el('span', 'hits', hits)); else li.classList.add('nohit');
    }
    li.addEventListener('click', () => { S.view = 'script'; S.current = i; location.hash = s.id; renderSidebar(); renderContent(); window.scrollTo(0, 0); });
    ul.append(li);
  });
}

// ------------------------------------------------------------------ rows

function newRow(type, ctx, after) {
  const prevSpeaker = (() => {
    const list = ctx.list; const i = after ? list.indexOf(after) : list.length - 1;
    for (let k = i; k >= 0; k--) if (list[k] && list[k].kind === 'line' && list[k].speaker) return list[k].speaker;
    return 'heroine';
  })();
  const base = { uid: uid++, kind: 'cmd', speaker: null, expr: null, text: '', name: null, args: [], cond: [] };
  switch (type) {
    case 'line': return { ...base, kind: 'line', speaker: prevSpeaker };
    case 'narration': return { ...base, kind: 'line' };
    case 'show': return { ...base, name: 'show', args: [spriteChars()[0] || 'chad'] };
    case 'hide': return { ...base, name: 'hide' };
    case 'bg': return { ...base, name: 'bg', args: [backgrounds()[0] || 'shop'] };
    case 'music': return { ...base, name: 'music', args: ['shop'] };
    case 'sfx': return { ...base, name: 'sfx', args: [''] };
    case 'wait': return { ...base, name: 'wait', args: ['0.5'] };
    default: return { ...base, kind: 'comment' };
  }
}

function addTypes(ctx) {
  const t = [['line', 'Line'], ['narration', 'Narration (no name)']];
  if (ctx.sec.type !== 'potion') t.push(['show', 'Show character'], ['hide', 'Hide character'], ['bg', 'Background'], ['music', 'Music'], ['sfx', 'Sound'], ['wait', 'Pause']);
  else t.push(['sfx', 'Sound']);
  t.push(['note', 'Note (not in the game)']);
  return t;
}

function insert(type, ctx, after) {
  snap();
  const r = newRow(type, ctx, after);
  const i = after ? ctx.list.indexOf(after) + 1 : ctx.list.length;
  ctx.list.splice(i, 0, r);
  changed(r.uid);
}

function showAddMenu(anchor, ctx, after) {
  const m = $('add-menu'); m.innerHTML = '';
  addTypes(ctx).forEach(([type, label]) => m.append(btn('+ ' + label, null, () => { hideMenu(); insert(type, ctx, after); })));
  const rc = anchor.getBoundingClientRect();
  m.style.left = Math.max(8, Math.min(window.scrollX + rc.right - 210, window.scrollX + window.innerWidth - 230)) + 'px';
  m.style.top = (window.scrollY + rc.bottom + 4) + 'px';
  m.hidden = false;
  setTimeout(() => document.addEventListener('click', hideMenu, { once: true }), 0);
}
function hideMenu() { $('add-menu').hidden = true; }

function emotionSelect(charId, value, onPick) {
  const s = el('select'); s.title = 'Emotion: which image of the character is shown with this line';
  const list = emotions(charId);
  s.append(opt('', 'usual look', !value));
  list.forEach(e => s.append(opt(e, e, e === value)));
  if (value && !list.includes(value)) s.append(opt(value, value + ' (no image yet)', true));
  s.append(opt('__new', '+ new emotion…'));
  s.addEventListener('change', () => {
    if (s.value === '__new') { s.value = value || ''; askEmotion(charId, (e) => onPick(e)); return; }
    onPick(s.value || null);
  });
  return s;
}

function condButton(r) {
  const has = r.cond && r.cond.length;
  const b = btn(has ? 'Only if: ' + describeCond(r.cond) : 'Only if…', 'Use this row only when…', () => editCond(r), 'cond' + (has ? ' set' : ''));
  return b;
}

function textArea(r, ctx, placeholder) {
  const ta = el('textarea'); ta.rows = 1; ta.value = r.text; ta.placeholder = placeholder; ta.spellcheck = true;
  ta.addEventListener('focus', () => { S.typingSnap = false; });
  ta.addEventListener('input', () => {
    if (!S.typingSnap) { snap(); S.typingSnap = true; }
    r.text = ta.value.replace(/\n/g, ' ');
    updateDirty();
  });
  ta.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {   // Enter: a new line below, same speaker
      e.preventDefault();
      snap();
      const n = newRow(r.speaker ? 'line' : 'narration', ctx, r);
      if (r.speaker) n.speaker = r.speaker;
      ctx.list.splice(ctx.list.indexOf(r) + 1, 0, n);
      changed(n.uid);
    }
  });
  ta.addEventListener('blur', () => { if (S.typingSnap) { S.typingSnap = false; renderSidebar(); refreshWarnings(); } });
  return ta;
}

function set(fn) { snap(); fn(); changed(); }

function rowBody(r, ctx) {
  const body = el('div', 'body');
  const who = el('div', 'who');
  body.append(who);
  if (r.kind === 'line') {
    const s = el('select'); s.title = 'Who says it';
    s.append(opt('', '— narration (no name) —', !r.speaker));
    Object.keys(S.chars).forEach(id => s.append(opt(id, charLabel(id), id === r.speaker)));
    if (r.speaker && !S.chars[r.speaker]) s.append(opt(r.speaker, r.speaker + ' (unknown)', true));
    s.addEventListener('change', () => set(() => { r.speaker = s.value || null; if (!r.speaker || !emotions(r.speaker).includes(r.expr)) r.expr = null; }));
    who.append(s);
    if (r.speaker && S.chars[r.speaker]) who.append(emotionSelect(r.speaker, r.expr, (e) => set(() => { r.expr = e; })));
    who.append(condButton(r));
    body.append(textArea(r, ctx, r.speaker ? 'What they say…' : 'Narration text…'));
    return body;
  }
  if (r.kind === 'comment') {
    who.append(el('span', 'kind', 'Note'));
    const i = el('input'); i.type = 'text'; i.className = 'wide'; i.value = r.text; i.placeholder = 'A note for the team (not shown in the game)';
    i.addEventListener('focus', () => { S.typingSnap = false; });
    i.addEventListener('input', () => { if (!S.typingSnap) { snap(); S.typingSnap = true; } r.text = i.value; updateDirty(); });
    who.append(i);
    return body;
  }
  if (r.kind === 'bad') {
    who.append(el('span', 'kind', "Can't be read"));
    const i = el('input'); i.type = 'text'; i.className = 'wide'; i.value = r.text;
    i.title = 'The game skips this line. Write it as "speaker: text", ": narration" or delete it.';
    i.addEventListener('change', () => set(() => {
      const p = parseScript('== x\n' + i.value);
      const nr = p.sections[0] && p.sections[0].rows[0];
      if (nr && nr.kind !== 'bad') Object.assign(r, toRow(nr), { uid: r.uid }); else r.text = i.value;
    }));
    who.append(i);
    return body;
  }
  // commands
  const a = r.args;
  const input = (val, ph, w, fn, type) => {
    const i = el('input'); i.type = type || 'text'; i.value = val || ''; i.placeholder = ph || ''; if (w) i.style.width = w;
    if (type === 'number') { i.step = '0.1'; i.min = '0'; }
    i.addEventListener('change', () => set(() => fn(i.value.trim())));
    return i;
  };
  switch (r.name) {
    case 'show': {
      who.append(el('span', 'kind', '➜ Show character'));
      const s = el('select');
      const list = [...spriteChars(), ...catChars()];
      list.forEach(id => s.append(opt(id, S.chars[id].kind === 'cat' ? charLabel(id) + ': his icon comes back' : charLabel(id), id === a[0])));
      if (!list.includes(a[0])) s.append(opt(a[0], (a[0] || '?') + ' (not a character in the middle)', true));
      s.addEventListener('change', () => set(() => { r.args = [s.value]; }));
      who.append(s, emotionSelect(a[0], a[1], (e) => set(() => { r.args = e ? [a[0], e] : [a[0]]; })));
      who.append(el('span', 'muted', 'appears in the middle (replaces whoever is there)'));
      break;
    }
    case 'hide': {
      who.append(el('span', 'kind', '⬅ Hide character'));
      const s = el('select');
      s.append(opt('', 'the character in the middle', !a[0]));
      catChars().forEach(id => s.append(opt(id, `${charLabel(id)}: his icon disappears (until he speaks again)`, id === a[0])));
      s.addEventListener('change', () => set(() => { r.args = s.value ? [s.value] : []; }));
      who.append(s);
      break;
    }
    case 'bg': {
      who.append(el('span', 'kind', 'Background'));
      const s = el('select'); const list = backgrounds();
      list.forEach(b => s.append(opt(b, b, b === a[0])));
      if (!list.includes(a[0])) s.append(opt(a[0], (a[0] || '?') + ' (no image)', true));
      s.addEventListener('change', () => set(() => { r.args = [s.value]; }));
      who.append(s);
      break;
    }
    case 'music': who.append(el('span', 'kind', 'Music'), input(a[0], 'shop', '160px', v => { r.args = [v]; })); break;
    case 'sfx': who.append(el('span', 'kind', 'Sound'), input(a[0], 'meow', '160px', v => { r.args = [v]; })); break;
    case 'wait': who.append(el('span', 'kind', 'Pause'), input(a[0], '0.5', '80px', v => { r.args = [v || '0']; }, 'number'), el('span', 'muted', 'seconds')); break;
    default: {
      who.append(el('span', 'kind', 'Command'));
      const i = input('@' + r.name + (a.length ? ' ' + a.join(' ') : ''), '', null, v => {
        const m = v.replace(/^@/, '').trim().split(/\s+/); r.name = (m.shift() || 'wait').toLowerCase(); r.args = m;
      });
      i.className = 'wide'; who.append(i);
    }
  }
  who.append(condButton(r));
  return body;
}

function rowEl(r, ctx) {
  const cls = ['row'];
  if (r.kind === 'cmd') cls.push('cmd');
  if (r.kind === 'comment') cls.push('note');
  if (r.kind === 'bad') cls.push('bad');
  if (r.kind === 'line' && !r.speaker) cls.push('narration');
  if (r.cond && r.cond.length) cls.push('has-cond');
  if (S.search) cls.push(matches(r) ? 'hit' : 'dim');
  const row = el('div', cls.join(' '));
  row.dataset.uid = r.uid;

  const handle = el('div', 'handle', '⋮⋮'); handle.title = 'Drag to move';
  handle.addEventListener('mousedown', () => { row.draggable = true; });
  row.addEventListener('dragstart', (e) => { S.drag = { r, ctx }; row.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(r.uid)); });
  row.addEventListener('dragend', () => { row.draggable = false; row.classList.remove('dragging'); S.drag = null; document.querySelectorAll('.drop-before,.drop-after').forEach(x => x.classList.remove('drop-before', 'drop-after')); });
  row.addEventListener('dragover', (e) => {
    if (!S.drag || S.drag.r === r) return;
    e.preventDefault();
    const rc = row.getBoundingClientRect(), before = e.clientY < rc.top + rc.height / 2;
    row.classList.toggle('drop-before', before); row.classList.toggle('drop-after', !before);
  });
  row.addEventListener('dragleave', () => row.classList.remove('drop-before', 'drop-after'));
  row.addEventListener('drop', (e) => {
    e.preventDefault();
    if (!S.drag || S.drag.r === r) return;
    const before = row.classList.contains('drop-before');
    moveRow(S.drag.r, S.drag.ctx.list, ctx.list, ctx.list.indexOf(r) + (before ? 0 : 1));
  });

  const tools = el('div', 'tools');
  const i = () => ctx.list.indexOf(r);
  tools.append(
    btn('+', 'Add a row below', (e) => { e.stopPropagation(); showAddMenu(e.currentTarget, ctx, r); }),
    btn('↑', 'Move up', () => { if (i() > 0) moveRow(r, ctx.list, ctx.list, i() - 1); }),
    btn('↓', 'Move down', () => { if (i() < ctx.list.length - 1) moveRow(r, ctx.list, ctx.list, i() + 2); }),
    btn('⧉', 'Duplicate', () => { snap(); const c = JSON.parse(JSON.stringify(r)); c.uid = uid++; ctx.list.splice(i() + 1, 0, c); changed(c.uid); }),
    btn('✕', 'Delete', () => { snap(); ctx.list.splice(i(), 1); changed(); toast('Deleted. Undo with Ctrl+Z.'); }, 'del')
  );
  row.append(handle, rowBody(r, ctx), tools);
  return row;
}

function moveRow(r, from, to, index) {
  snap();
  const at = from.indexOf(r);
  from.splice(at, 1);
  if (from === to && at < index) index--;
  to.splice(Math.max(0, Math.min(index, to.length)), 0, r);
  changed();
}

function renderList(box, list, ctx) {
  ctx.list = list;
  list.forEach(r => box.append(rowEl(r, ctx)));
  const bar = el('div', 'add-end');
  addTypes(ctx).slice(0, ctx.sec.type === 'potion' ? 2 : 4).forEach(([type, label]) => bar.append(btn('+ ' + label, null, () => insert(type, ctx))));
  bar.append(btn('More…', 'Other kinds of rows', (e) => { e.stopPropagation(); showAddMenu(e.currentTarget, ctx, null); }));
  // dropping on the bar puts the row at the end of this list (also into an empty group)
  bar.addEventListener('dragover', (e) => { if (S.drag) e.preventDefault(); });
  bar.addEventListener('drop', (e) => { e.preventDefault(); if (S.drag) moveRow(S.drag.r, S.drag.ctx.list, list, list.length); });
  box.append(bar);
}

function momentHead(sec, ev) {
  const h = el('div', 'moment');
  h.append(el('h3', null, MOMENTS[ev.name] || `Moment “${ev.name}”`));
  const lab = el('label'); const cb = el('input'); cb.type = 'checkbox'; cb.checked = ev.random;
  cb.addEventListener('change', () => set(() => { ev.random = cb.checked; }));
  lab.append(cb, document.createTextNode('say only one random line from these each time'));
  h.append(lab);
  if (ev.name !== 'start') h.append(btn('Remove moment', 'Remove this group and its lines', () => {
    if (ev.rows.length && !confirm(`Remove “${MOMENTS[ev.name] || ev.name}” and its ${ev.rows.length} row(s)?`)) return;
    set(() => { sec.events.splice(sec.events.indexOf(ev), 1); });
  }, 'del-moment'));
  return h;
}

function renderContent(focusUid) {
  const y = window.scrollY;
  $('script-view').hidden = S.view !== 'script';
  $('chars-view').hidden = S.view !== 'chars';
  if (S.view === 'chars') { renderChars(); return; }
  const sec = S.model.sections[S.current];
  $('section-title').textContent = sectionLabel(sec);
  $('section-sub').textContent = sectionSub(sec);
  const box = $('rows'); box.innerHTML = '';
  if (sec.type === 'potion') {
    for (const ev of sec.events) {
      box.append(momentHead(sec, ev));
      const wrap = el('div'); renderList(wrap, ev.rows, { sec, ev }); box.append(wrap);
    }
    const sel = $('add-moment'); sel.innerHTML = '';
    sel.append(opt('', '+ Add lines for another moment…', true));
    Object.keys(MOMENTS).filter(k => !sec.events.some(e => e.name === k)).forEach(k => sel.append(opt(k, MOMENTS[k])));
    $('add-moment-wrap').hidden = sel.options.length < 2;
  } else {
    renderList(box, sec.rows, { sec });
    $('add-moment-wrap').hidden = true;
  }
  window.scrollTo(0, y);
  if (focusUid) {
    const row = box.querySelector(`.row[data-uid="${focusUid}"]`);
    const t = row && (row.querySelector('textarea') || row.querySelector('input') || row.querySelector('select'));
    if (t) { t.focus(); t.scrollIntoView({ block: 'nearest' }); }
  }
}

// ------------------------------------------------------------------ conditions

let condTemp = null, condRow = null;
function editCond(r) {
  condRow = r; condTemp = (r.cond || []).map(c => ({ ...c }));
  if (!condTemp.length) condTemp.push({ type: 'potion', potion: (catPotions()[0] || {}).id, value: 'cat' });
  renderCondList();
  $('cond-dialog').showModal();
}
function renderCondList() {
  const box = $('cond-list'); box.innerHTML = '';
  condTemp.forEach((c, i) => {
    const item = el('div', 'cond-item');
    const type = el('select');
    type.append(opt('potion', 'This potion was brewed with', c.type === 'potion'), opt('count', "The cat's recipe was used", c.type === 'count'));
    if (c.type === 'bad') type.append(opt('bad', `Unknown: “${c.text}”`, true));
    type.addEventListener('change', () => {
      condTemp[i] = type.value === 'count' ? { type: 'count', op: '>=', n: 3 } : { type: 'potion', potion: (catPotions()[0] || {}).id, value: 'cat' };
      renderCondList();
    });
    item.append(type);
    if (c.type === 'potion') {
      const p = el('select'); catPotions().forEach(x => p.append(opt(x.id, potionName(x.id), x.id === c.potion)));
      p.addEventListener('change', () => { c.potion = p.value; });
      const v = el('select'); v.append(opt('cat', "the cat's recipe", c.value === 'cat'), opt('book', 'the book recipe', c.value === 'book'));
      v.addEventListener('change', () => { c.value = v.value; });
      item.append(p, el('span', null, '→'), v);
    } else if (c.type === 'count') {
      const op = el('select'); Object.entries(OPS).forEach(([k, l]) => op.append(opt(k, l, k === c.op)));
      op.addEventListener('change', () => { c.op = op.value; });
      const n = el('input'); n.type = 'number'; n.min = '0'; n.max = '6'; n.value = c.n;
      n.addEventListener('input', () => { c.n = Math.max(0, parseInt(n.value, 10) || 0); });
      item.append(op, n, el('span', null, 'times so far'));
    }
    item.append(btn('✕', 'Remove this condition', () => { condTemp.splice(i, 1); renderCondList(); }));
    box.append(item);
  });
  if (!condTemp.length) box.append(el('p', 'muted', 'No conditions: the row is always used.'));
}

// ------------------------------------------------------------------ test choices

function loadTestChoices() { try { S.testChoices = JSON.parse(localStorage.getItem('bonding_potion.editor.choices') || '{}'); } catch (e) { S.testChoices = {}; } }
function saveTestChoices() { localStorage.setItem('bonding_potion.editor.choices', JSON.stringify(S.testChoices)); updatePlayLabel(); }
function updatePlayLabel() {
  const n = Object.values(S.testChoices).filter(Boolean).length;
  $('btn-play-opts').textContent = n ? `Test choices (${n})…` : 'Test choices…';
}
function openChoices() {
  const box = $('choices-list'); box.innerHTML = '';
  catPotions().forEach(p => {
    const row = el('div', 'ch'); row.append(el('span', null, potionName(p.id)));
    const s = el('select');
    s.append(opt('', 'not brewed yet / as played', !S.testChoices[p.id]), opt('book', 'book recipe', S.testChoices[p.id] === 'book'), opt('cat', "cat's recipe", S.testChoices[p.id] === 'cat'));
    s.addEventListener('change', () => { S.testChoices[p.id] = s.value; });
    row.append(s); box.append(row);
  });
  $('choices-dialog').showModal();
}

// ------------------------------------------------------------------ characters and emotions

async function imgUrl(path) {
  if (S.imgUrls[path]) return S.imgUrls[path];
  const f = await readFile(path);
  if (!f) return null;
  return (S.imgUrls[path] = URL.createObjectURL(f));
}

async function renderChars() {
  const box = $('chars'); box.innerHTML = '';
  for (const id of Object.keys(S.chars)) {
    const c = S.chars[id];
    const card = el('div', 'char');
    const head = el('div', 'char-head');
    const name = el('input'); name.type = 'text'; name.value = c.name; name.title = 'Name shown above the textbox';
    name.addEventListener('input', () => { c.name = name.value; updateDirty(); });
    name.addEventListener('change', () => { renderSidebar(); });
    const where = { portrait: 'Portrait at the bottom left', sprite: 'Shown in the middle of the screen (Show / Hide character)', cat: 'Cat icon in dialogue, cat on the table on the potion screen' }[c.kind] || c.kind;
    head.append(name, el('code', null, id), el('span', 'muted', where));
    card.append(head);
    const emos = el('div', 'emos');
    const base = charBase(id);
    const keys = [base, ...emotions(id).map(e => base + '_' + e)];
    for (const k of keys) {
      const e = S.images[k]; if (!e) continue;
      const tile = el('div', 'emo'); const pic = el('div', 'pic');
      const url = await imgUrl(e.path);
      if (url) { const im = el('img'); im.src = url; pic.append(im); } else pic.append(el('span', 'missing-img', 'no file'));
      const label = k === base ? 'usual look' : k.slice(base.length + 1);
      tile.append(pic, el('div', null, label));
      emos.append(tile);
    }
    const add = el('div', 'emo add'); const ap = el('div', 'pic', '+'); ap.title = 'Add an emotion';
    ap.addEventListener('click', () => askEmotion(id, () => renderChars()));
    add.append(ap, el('div', null, 'new emotion'));
    emos.append(add);
    card.append(emos);
    box.append(card);
  }
}

let emoFor = null, emoDone = null;
function askEmotion(charId, done) {
  emoFor = charId; emoDone = done;
  $('emo-char').textContent = S.chars[charId] ? S.chars[charId].name : charId;
  $('emo-name').value = ''; $('emo-error').hidden = true;
  $('emo-file').textContent = charBase(charId) + '_….png';
  $('emo-dialog').showModal();
  $('emo-name').focus();
}

async function createEmotion(charId, expr) {
  const ch = S.chars[charId];
  const bases = ch.kind === 'cat' ? ['cat_icon', 'cat_table'] : [charBase(charId)];
  let assetsText = await readText('data/assets.json');
  const phText = await readText('assets/placeholders.json');
  const phObj = phText ? JSON.parse(phText) : { files: {} };
  phObj.files = phObj.files || {};
  const made = [];
  for (const base of bases) {
    const e = S.images[base];
    const key = `${base}_${expr}`;
    if (!e || S.images[key]) continue;
    const ext = (e.path.match(/\.\w+$/) || ['.png'])[0];
    const path = e.path.replace(/[^/]+$/, key + ext);
    const [w, h] = e.size;
    // Temporary image: the usual look, faded, with the emotion's name across it.
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const g = cv.getContext('2d');
    const src = await imgUrl(e.path);
    if (src) {
      const im = new Image(); im.src = src; await im.decode().catch(() => {});
      g.globalAlpha = 0.4; g.drawImage(im, 0, 0, w, h); g.globalAlpha = 1;
    } else { g.fillStyle = '#e3d6dc'; g.fillRect(0, 0, w, h); }
    const bh = Math.max(28, Math.round(h * 0.14));
    g.fillStyle = 'rgba(176, 85, 138, 0.85)'; g.fillRect(0, (h - bh) / 2, w, bh);
    g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.textBaseline = 'middle';
    let fs = Math.round(bh * 0.6); g.font = `bold ${fs}px Arial`;
    while (fs > 10 && g.measureText(expr).width > w * 0.9) { fs -= 2; g.font = `bold ${fs}px Arial`; }
    g.fillText(expr, w / 2, h / 2);
    const blob = await new Promise(res => cv.toBlob(res, ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/png', 0.9));
    await writeFile(path, blob);
    phObj.files[path] = await sha256(blob);

    // New line in assets.json right after the usual image, in the same style.
    const re = new RegExp(`^([ \\t]*)"${base}":([ \\t]*)(\\{.*\\})(,?)[ \\t]*$`, 'm');
    const m = assetsText.match(re);
    if (!m) throw new Error(`"${base}" not found in data/assets.json`);
    const entry = JSON.parse(m[3]);
    entry.path = path;
    if (entry.ph) entry.ph = Object.assign({}, entry.ph, { label: expr });
    const keyPart = `"${key}":`;
    const pad = ' '.repeat(Math.max(1, (`"${base}":` + m[2]).length - keyPart.length));
    const body = '{ ' + Object.entries(entry).map(([k, v]) => `${JSON.stringify(k)}: ${JSON.stringify(v).replace(/,/g, ', ').replace(/:/g, ': ').replace(/\{/g, '{ ').replace(/\}/g, ' }')}`).join(', ') + ' }';
    const line1 = `${m[1]}"${base}":${m[2]}${m[3]},`;
    const line2 = `${m[1]}${keyPart}${pad}${body}${m[4]}`;
    assetsText = assetsText.replace(m[0], line1 + '\n' + line2);
    S.images[key] = entry;
    made.push(path);
  }
  JSON.parse(assetsText); // must still be valid
  await backup('data/assets.json');
  await writeFile('data/assets.json', assetsText);
  await backup('assets/placeholders.json');
  await writeFile('assets/placeholders.json', JSON.stringify(phObj, null, 4) + '\n');
  return made;
}

// ------------------------------------------------------------------ warnings

function refreshWarnings() {
  const p = parseScript(serialize(S.model));
  const list = [...p.warnings];
  for (const s of p.sections) {
    for (const r of s.rows) {
      if (r.kind === 'line' && r.speaker && !S.chars[r.speaker]) list.push(`Line ${r.line}: unknown speaker “${r.speaker}”`);
      if (r.kind === 'line' && r.speaker && r.expr && S.chars[r.speaker] && !S.images[charBase(r.speaker) + '_' + r.expr]) list.push(`Line ${r.line}: ${r.speaker} has no “${r.expr}” image yet (the usual look is shown)`);
      (r.cond || []).forEach(c => { if (c.type === 'potion' && !S.potions.some(x => x.id === c.potion)) list.push(`Line ${r.line}: condition about unknown potion “${c.potion}”`); });
    }
  }
  $('warnings-wrap').hidden = !list.length;
  $('warn-count').textContent = list.length;
  const ul = $('warnings'); ul.innerHTML = '';
  list.forEach(w => ul.append(el('li', null, w)));
}

// ------------------------------------------------------------------ start

async function init() {
  if (!window.showDirectoryPicker) { $('unsupported').hidden = false; $('btn-pick').disabled = true; return; }
  loadTestChoices(); updatePlayLabel();
  $('btn-pick').addEventListener('click', async () => { if (isDirty() && !confirm('You have unsaved changes. Open another folder anyway?')) return; pickFolder(); });
  $('btn-reconnect').addEventListener('click', reconnect);
  $('btn-save').addEventListener('click', save);
  $('btn-undo').addEventListener('click', () => restore(S.undo, S.redo));
  $('btn-redo').addEventListener('click', () => restore(S.redo, S.undo));
  $('btn-play').addEventListener('click', play);
  $('btn-play-opts').addEventListener('click', openChoices);
  $('tab-script').addEventListener('click', () => { S.view = 'script'; renderSidebar(); renderContent(); });
  $('tab-chars').addEventListener('click', () => { S.view = 'chars'; renderSidebar(); renderContent(); });
  $('search').addEventListener('input', () => { S.search = $('search').value.trim().toLowerCase(); renderSidebar(); renderContent(); });
  $('add-moment').addEventListener('change', () => {
    const v = $('add-moment').value; if (!v) return;
    const sec = S.model.sections[S.current];
    set(() => { sec.events.push({ name: v, random: v === 'fizzle', rows: [newRow('line', { list: [] })] }); });
  });

  $('cond-add').addEventListener('click', () => { condTemp.push({ type: 'count', op: '>=', n: 3 }); renderCondList(); });
  $('cond-clear').addEventListener('click', () => { $('cond-dialog').close(); set(() => { condRow.cond = []; }); });
  $('cond-cancel').addEventListener('click', () => $('cond-dialog').close());
  $('cond-ok').addEventListener('click', () => {
    $('cond-dialog').close();
    set(() => { condRow.cond = condTemp.filter(c => c.type !== 'potion' || c.potion); });
  });

  $('choices-reset').addEventListener('click', () => { S.testChoices = {}; saveTestChoices(); $('choices-dialog').close(); });
  $('choices-ok').addEventListener('click', () => { saveTestChoices(); $('choices-dialog').close(); });

  $('emo-cancel').addEventListener('click', () => $('emo-dialog').close());
  const emoOk = async () => {
    const v = $('emo-name').value.trim().toLowerCase();
    const err = (t) => { $('emo-error').textContent = t; $('emo-error').hidden = false; };
    if (!/^[a-z][a-z0-9]*$/.test(v)) return err('Use one word: small English letters (and numbers), no spaces.');
    if (emotions(emoFor).includes(v)) return err('This emotion already exists.');
    try {
      const made = await createEmotion(emoFor, v);
      $('emo-dialog').close();
      toast(`Created ${made.map(p => p.split('/').pop()).join(' and ')}. Replace it with final art in the Art editor.`);
      if (emoDone) emoDone(v);
    } catch (e) { err('Could not create it: ' + e.message); }
  };
  $('emo-ok').addEventListener('click', emoOk);
  $('emo-name').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); emoOk(); } });

  document.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if ((e.ctrlKey || e.metaKey) && k === 's') { e.preventDefault(); save(); return; }
    const typing = /^(TEXTAREA|INPUT)$/.test(document.activeElement && document.activeElement.tagName);
    if ((e.ctrlKey || e.metaKey) && !typing && S.model) {
      if (k === 'z' && !e.shiftKey) { e.preventDefault(); restore(S.undo, S.redo); }
      if (k === 'y' || (k === 'z' && e.shiftKey)) { e.preventDefault(); restore(S.redo, S.undo); }
    }
  });
  window.addEventListener('beforeunload', (e) => { if (S.model && isDirty()) { e.preventDefault(); e.returnValue = ''; } });

  const saved = await idbGet('root').catch(() => null);
  if (saved) {
    if ((await saved.queryPermission({ mode: 'readwrite' })) === 'granted') await openRoot(saved);
    else { $('last-folder').textContent = saved.name; $('btn-reconnect').hidden = false; }
  }
  window.scriptEditor = { S, serialize, buildModel, save, openRoot, createEmotion }; // for testing
}

init();
