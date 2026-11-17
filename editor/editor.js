// Bonding Potion — Art editor (TDD §13.3).
// Replaces temporary images with final art inside the chosen project folder, using the browser's
// File System Access API (Chrome / Edge). Nothing is uploaded anywhere.

const $ = (id) => document.getElementById(id);
const state = {
  root: null,          // FileSystemDirectoryHandle of the project folder
  images: {},          // key → entry from data/assets.json
  ph: {},              // path → SHA-256 of the temporary image (assets/placeholders.json)
  cards: {},           // key → { el, info }
  backups: {},         // path → backup path (this session)
  stamp: null          // backup folder name for this session
};

// ------------------------------------------------------------------ small helpers

function toast(msg) {
  const t = $('toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toast.timer); toast.timer = setTimeout(() => t.classList.remove('show'), 2600);
}

function log(msg, kind) {
  $('log-wrap').hidden = false;
  const li = document.createElement('li');
  li.textContent = `${new Date().toLocaleTimeString()} — ${msg}`;
  if (kind) li.className = kind;
  $('log').prepend(li);
}

function baseName(path) { return path.split('/').pop().replace(/\.[^.]+$/, '').toLowerCase(); }
function isJpg(path) { return /\.jpe?g$/i.test(path); }

async function sha256(blob) {
  const buf = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
}

// Remember the folder between visits (IndexedDB can store directory handles).
function idb() {
  return new Promise((res, rej) => {
    const r = indexedDB.open('bonding_potion_editor', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('kv');
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
}
async function idbSet(k, v) { const db = await idb(); return new Promise(res => { const tx = db.transaction('kv', 'readwrite'); tx.objectStore('kv').put(v, k); tx.oncomplete = res; }); }
async function idbGet(k) { const db = await idb(); return new Promise(res => { const r = db.transaction('kv').objectStore('kv').get(k); r.onsuccess = () => res(r.result); r.onerror = () => res(null); }); }

// ------------------------------------------------------------------ file access

async function dirFor(path, create) {
  const parts = path.split('/'); parts.pop();
  let dir = state.root;
  for (const p of parts) dir = await dir.getDirectoryHandle(p, { create: !!create });
  return dir;
}
async function readFile(path) {
  try { const dir = await dirFor(path); return await (await dir.getFileHandle(path.split('/').pop())).getFile(); }
  catch (e) { return null; }
}
async function writeFile(path, blob) {
  const dir = await dirFor(path, true);
  const fh = await dir.getFileHandle(path.split('/').pop(), { create: true });
  const w = await fh.createWritable(); await w.write(blob); await w.close();
}
async function readText(path) { const f = await readFile(path); return f ? await f.text() : null; }

async function backup(path) {
  const old = await readFile(path);
  if (!old) return null;
  if (!state.stamp) {
    const d = new Date(), p = (n) => String(n).padStart(2, '0');
    state.stamp = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}-${p(d.getMinutes())}-${p(d.getSeconds())}`;
  }
  const bpath = `.backup/${state.stamp}/${path}`;
  await writeFile(bpath, old);
  state.backups[path] = bpath;
  return bpath;
}

// ------------------------------------------------------------------ opening the project

async function openRoot(handle) {
  state.root = handle;
  const assetsText = await readText('data/assets.json');
  if (!assetsText) {
    state.root = null;
    $('folder-status').textContent = '';
    toast('That folder is not the bonding_potion project (data/assets.json not found).');
    return;
  }
  state.images = {};
  const all = JSON.parse(assetsText).images || {};
  for (const k of Object.keys(all)) if (!k.startsWith('_')) state.images[k] = all[k];
  const phText = await readText('assets/placeholders.json');
  state.ph = phText ? (JSON.parse(phText).files || {}) : {};
  $('folder-status').textContent = `Folder: ${handle.name}`;
  $('intro').hidden = true; $('toolbar').hidden = false; $('btn-reconnect').hidden = true;
  await idbSet('root', handle);
  buildGroups();
  await renderAll();
}

async function pickFolder() {
  try {
    const h = await window.showDirectoryPicker({ id: 'bonding_potion', mode: 'readwrite' });
    await openRoot(h);
  } catch (e) { if (e.name !== 'AbortError') toast('Could not open the folder: ' + e.message); }
}

async function reconnect() {
  const h = await idbGet('root');
  if (!h) return;
  if ((await h.requestPermission({ mode: 'readwrite' })) === 'granted') await openRoot(h);
}

// ------------------------------------------------------------------ cards

function buildGroups() {
  const groups = [...new Set(Object.values(state.images).map(e => e.group || 'Other'))];
  const sel = $('f-group');
  sel.innerHTML = '<option value="all">All groups</option>' + groups.map(g => `<option>${g}</option>`).join('');
}

async function inspect(key) {
  const e = state.images[key];
  const file = await readFile(e.path);
  if (!file) return { missing: true };
  const url = URL.createObjectURL(file);
  const dims = await new Promise(res => { const im = new Image(); im.onload = () => res([im.naturalWidth, im.naturalHeight]); im.onerror = () => res([0, 0]); im.src = url; });
  const hash = await sha256(file);
  const temporary = state.ph[e.path] && state.ph[e.path].toUpperCase() === hash;
  return { url, dims, temporary, missing: false };
}

async function renderAll() {
  const main = $('cards'); main.innerHTML = '';
  state.cards = {};
  let lastGroup = null;
  for (const key of Object.keys(state.images)) {
    const e = state.images[key];
    const g = e.group || 'Other';
    if (g !== lastGroup) { const h = document.createElement('h3'); h.className = 'group-title'; h.textContent = g; h.dataset.group = g; main.appendChild(h); lastGroup = g; }
    const el = document.createElement('div'); el.className = 'card'; el.dataset.key = key;
    main.appendChild(el);
    state.cards[key] = { el, info: null };
    attachCardEvents(key, el);
  }
  await Promise.all(Object.keys(state.images).map(refreshCard));
  applyFilters();
}

async function refreshCard(key) {
  const card = state.cards[key]; if (!card) return;
  const e = state.images[key];
  if (card.info && card.info.url) URL.revokeObjectURL(card.info.url);
  const info = await inspect(key);
  card.info = info;
  const [w, h] = e.size;
  const sizeOk = !info.missing && info.dims[0] === w && info.dims[1] === h;
  const status = info.missing ? '<span class="badge missing">Missing</span>' : info.temporary ? '<span class="badge">Temporary</span>' : '<span class="badge final">Final</span>';
  card.el.classList.toggle('final', !info.missing && !info.temporary);
  card.el.innerHTML = `
    <div class="thumb">${info.missing ? '' : `<img src="${info.url}" alt="${key}">`}</div>
    <div class="name">${e.path.split('/').pop()}</div>
    <div class="meta">Required ${w} × ${h} · ${isJpg(e.path) ? 'JPG' : 'PNG'}<br>
      ${info.missing ? '<span class="bad">File not found</span>' : sizeOk ? `Current ${info.dims[0]} × ${info.dims[1]}` : `<span class="bad">Current ${info.dims[0]} × ${info.dims[1]}</span>`}<br>
      <span title="${e.path}">${e.path.split('/').slice(0, -1).join('/') || '(project folder)'}</span></div>
    <div class="badges">${status}</div>
    <div class="actions"><button data-act="replace">Replace…</button>${state.backups[e.path] ? '<button data-act="restore">Restore previous</button>' : ''}</div>`;
  card.el.dataset.status = info.missing ? 'missing' : info.temporary ? 'temp' : 'final';
  card.el.dataset.problem = sizeOk ? '' : '1';
  updateProgress();
}

function attachCardEvents(key, el) {
  el.addEventListener('dragover', (ev) => { ev.preventDefault(); ev.stopPropagation(); el.classList.add('dragover'); });
  el.addEventListener('dragleave', () => el.classList.remove('dragover'));
  el.addEventListener('drop', async (ev) => {
    ev.preventDefault(); ev.stopPropagation(); el.classList.remove('dragover'); hideOverlay();
    const file = [...ev.dataTransfer.files].find(f => f.type.startsWith('image/'));
    if (file) await replace(key, file);
  });
  el.addEventListener('click', async (ev) => {
    const act = ev.target.dataset && ev.target.dataset.act;
    if (act === 'replace') {
      const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/png,image/jpeg,image/webp';
      input.onchange = () => { if (input.files[0]) replace(key, input.files[0]); };
      input.click();
    } else if (act === 'restore') {
      await restore(key);
    }
  });
}

function updateProgress() {
  const keys = Object.keys(state.cards);
  const done = keys.filter(k => state.cards[k].info && !state.cards[k].info.missing && !state.cards[k].info.temporary).length;
  $('progress-text').textContent = `${done} of ${keys.length} final`;
  $('progress-bar').style.width = keys.length ? `${(done / keys.length) * 100}%` : '0';
}

function applyFilters() {
  const st = $('f-status').value, gr = $('f-group').value, q = $('f-search').value.trim().toLowerCase();
  const visibleGroups = new Set();
  for (const key of Object.keys(state.cards)) {
    const { el } = state.cards[key]; const e = state.images[key];
    let show = true;
    if (st === 'temp') show = el.dataset.status === 'temp';
    else if (st === 'final') show = el.dataset.status === 'final';
    else if (st === 'problem') show = el.dataset.problem === '1';
    if (gr !== 'all' && (e.group || 'Other') !== gr) show = false;
    if (q && !key.toLowerCase().includes(q) && !e.path.toLowerCase().includes(q)) show = false;
    el.hidden = !show;
    if (show) visibleGroups.add(e.group || 'Other');
  }
  document.querySelectorAll('.group-title').forEach(h => { h.hidden = !visibleGroups.has(h.dataset.group); });
}

// ------------------------------------------------------------------ replacing an image

function loadBitmap(file) {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file);
    const im = new Image();
    im.onload = () => { res(im); };
    im.onerror = () => { URL.revokeObjectURL(url); rej(new Error('not an image')); };
    im.src = url;
  });
}

/** Draws img into a w × h canvas. mode: exact | fit | fill | stretch. High-quality step-down for big reductions. */
function render(img, w, h, mode, jpg) {
  let src = img, sw = img.naturalWidth || img.width, sh = img.naturalHeight || img.height;
  let dx = 0, dy = 0, dw = w, dh = h, sx = 0, sy = 0, sWid = sw, sHei = sh;
  if (mode === 'fit') {
    const s = Math.min(w / sw, h / sh); dw = Math.round(sw * s); dh = Math.round(sh * s); dx = Math.round((w - dw) / 2); dy = Math.round((h - dh) / 2);
  } else if (mode === 'fill') {
    const s = Math.max(w / sw, h / sh); sWid = w / s; sHei = h / s; sx = (sw - sWid) / 2; sy = (sh - sHei) / 2;
  }
  // Step down by halves while the source is much bigger than the target (smoother result).
  let cw = sWid, ch = sHei, cx = sx, cy = sy;
  while (cw / 2 >= dw && ch / 2 >= dh) {
    const c = document.createElement('canvas'); c.width = Math.round(cw / 2); c.height = Math.round(ch / 2);
    const ctx = c.getContext('2d'); ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(src, cx, cy, cw, ch, 0, 0, c.width, c.height);
    src = c; cx = 0; cy = 0; cw = c.width; ch = c.height;
  }
  const out = document.createElement('canvas'); out.width = w; out.height = h;
  const ctx = out.getContext('2d'); ctx.imageSmoothingQuality = 'high';
  if (jpg) { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h); }
  ctx.drawImage(src, cx, cy, cw, ch, dx, dy, dw, dh);
  return out;
}

function hasTransparency(canvas) {
  const d = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
  for (let i = 3; i < d.length; i += 4 * 7) if (d[i] < 250) return true;
  return false;
}

function askResize(key, img) {
  const e = state.images[key], [w, h] = e.size;
  const sw = img.naturalWidth, sh = img.naturalHeight;
  const sameRatio = Math.abs(sw / sh - w / h) < 0.01;
  $('rd-title').textContent = `${e.path.split('/').pop()}: wrong size`;
  $('rd-text').innerHTML = `The file is <b>${sw} × ${sh}</b>, but this image must be <b>${w} × ${h}</b>.` +
    (sameRatio ? ' The proportions are the same, so all three options give the same result.' : ' The proportions differ: choose how to fit it.');
  for (const m of ['fit', 'fill', 'stretch']) {
    const prev = render(img, w, h, m, isJpg(e.path));
    const c = $('rd-' + m); c.width = w; c.height = h; c.getContext('2d').clearRect(0, 0, w, h); c.getContext('2d').drawImage(prev, 0, 0);
  }
  const dlg = $('resize-dialog');
  return new Promise(res => {
    const onClick = (ev) => {
      const mode = ev.target.dataset.mode; if (mode === undefined) return;
      dlg.querySelectorAll('.rd-buttons button').forEach(b => b.removeEventListener('click', onClick));
      dlg.close(); res(mode || null);
    };
    dlg.querySelectorAll('.rd-buttons button').forEach(b => b.addEventListener('click', onClick));
    dlg.showModal();
  });
}

async function replace(key, file) {
  if (!state.root) { toast('Choose the project folder first.'); return; }
  const e = state.images[key], [w, h] = e.size, jpg = isJpg(e.path);
  let img;
  try { img = await loadBitmap(file); } catch (err) { log(`${file.name}: not an image file`, 'err'); toast(`${file.name} is not an image.`); return; }
  let mode = 'exact';
  if (img.naturalWidth !== w || img.naturalHeight !== h) {
    mode = await askResize(key, img);
    if (!mode) { log(`${file.name}: cancelled (wrong size)`, 'warn'); return; }
  }
  const canvas = render(img, w, h, mode === 'exact' ? 'stretch' : mode, jpg);
  const notes = [];
  if (!jpg && !hasTransparency(canvas) && !/background|ending|cell|panel|textbox|nameplate|page|button|tab|logo/i.test(key + ' ' + (e.group || ''))) {
    notes.push('no transparent pixels (is the background layer hidden?)');
  }
  if (jpg && /png/i.test(file.type)) notes.push('converted to JPG');
  const blob = await new Promise(res => canvas.toBlob(res, jpg ? 'image/jpeg' : 'image/png', jpg ? 0.9 : undefined));
  try {
    await backup(e.path);
    await writeFile(e.path, blob);
    await setVersion(key, blob);
  } catch (err) {
    log(`${e.path}: could not save (${err.message})`, 'err'); toast('Could not save: ' + err.message); return;
  }
  await refreshCard(key); applyFilters();
  const how = mode === 'exact' ? '' : ` (${mode === 'fit' ? 'fitted' : mode === 'fill' ? 'cropped' : 'stretched'} from ${img.naturalWidth} × ${img.naturalHeight})`;
  log(`${e.path} replaced with ${file.name}${how}${notes.length ? ' — ' + notes.join(', ') : ''}`, notes.length ? 'warn' : '');
  toast(`${e.path.split('/').pop()} saved`);
}

/**
 * Writes the image's version code ("v": first characters of its SHA-256) into its line in data/assets.json.
 * The game adds it to the image address, so browsers download the new picture instead of showing a cached old one.
 */
async function setVersion(key, blob) {
  const v = (await sha256(blob)).slice(0, 10).toLowerCase();
  const text = await readText('data/assets.json');
  if (!text) return;
  const m = text.match(new RegExp(`^[ \\t]*"${key}":[ \\t]*\\{.*$`, 'm'));
  if (!m) return;
  let line = m[0];
  if (/"v":\s*"[^"]*"/.test(line)) line = line.replace(/"v":\s*"[^"]*"/, `"v": "${v}"`);
  else line = line.replace(/("path":\s*"[^"]*",)/, `$1 "v": "${v}",`);
  if (line === m[0]) return;
  const out = text.replace(m[0], line);
  try { JSON.parse(out); } catch (e) { log(`data/assets.json: could not update the version of ${key}`, 'err'); return; }
  await writeFile('data/assets.json', out);
  state.images[key].v = v;
}

async function restore(key) {
  const e = state.images[key], bpath = state.backups[e.path];
  if (!bpath) return;
  const old = await readFile(bpath);
  if (!old) { toast('Backup not found.'); return; }
  await writeFile(e.path, old);
  await setVersion(key, old);
  delete state.backups[e.path];
  await refreshCard(key); applyFilters();
  log(`${e.path} restored from ${bpath}`);
  toast(`${e.path.split('/').pop()} restored`);
}

// ------------------------------------------------------------------ drop many files on the page

function showOverlay() { if (state.root) $('drop-overlay').hidden = false; }
function hideOverlay() { $('drop-overlay').hidden = true; }

/** "Start.png", "start button.png", "ui-title-start.PNG" → ui_title_start (exact name first, then a unique ending). */
function matchKey(fileName) {
  const norm = (s) => s.toLowerCase().replace(/[\s\-.]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
  const n = norm(baseName(fileName)).replace(/_(button|btn|final|new|copy|\d+)$/g, '');
  const keys = Object.keys(state.images);
  const exact = keys.find(k => baseName(state.images[k].path) === n || k === n);
  if (exact) return exact;
  const ends = keys.filter(k => k.endsWith('_' + n));
  return ends.length === 1 ? ends[0] : null;
}

async function dropMany(files) {
  const unmatched = [];
  for (const f of files) {
    if (!/^image\/|^$/.test(f.type) || !/\.(png|jpe?g|webp)$/i.test(f.name)) { unmatched.push(f.name); continue; }
    const key = matchKey(f.name);
    if (!key) { unmatched.push(f.name); continue; }
    await replace(key, f); // one by one, so size questions come one at a time
  }
  if (unmatched.length) {
    log(`No matching image for: ${unmatched.join(', ')}. Rename them like the Art List, or drop them onto a card.`, 'warn');
    toast(`${unmatched.length} file(s) not matched — see the list below`);
  }
}

// ------------------------------------------------------------------ start

async function init() {
  if (!window.showDirectoryPicker) {
    $('unsupported').hidden = false; $('btn-pick').disabled = true; return;
  }
  $('btn-pick').addEventListener('click', pickFolder);
  $('btn-reconnect').addEventListener('click', reconnect);
  $('btn-rescan').addEventListener('click', async () => { await renderAll(); toast('Rescanned'); });
  ['f-status', 'f-group'].forEach(id => $(id).addEventListener('change', applyFilters));
  $('f-search').addEventListener('input', applyFilters);

  let depth = 0;
  window.addEventListener('dragenter', (ev) => { if (ev.dataTransfer && [...ev.dataTransfer.types].includes('Files')) { depth++; showOverlay(); } });
  window.addEventListener('dragleave', () => { depth = Math.max(0, depth - 1); if (!depth) hideOverlay(); });
  window.addEventListener('dragover', (ev) => ev.preventDefault());
  window.addEventListener('drop', async (ev) => {
    ev.preventDefault(); depth = 0; hideOverlay();
    if (!state.root) { toast('Choose the project folder first.'); return; }
    await dropMany([...ev.dataTransfer.files]);
  });
  window.addEventListener('beforeunload', () => {});

  const saved = await idbGet('root');
  if (saved) {
    $('last-folder').textContent = saved.name;
    if ((await saved.queryPermission({ mode: 'readwrite' })) === 'granted') await openRoot(saved);
    else $('btn-reconnect').hidden = false;
  }
}

// For automated checks only (no effect on normal use).
window.artEditor = { state, openRoot, replace, restore, dropMany, matchKey };

init();
