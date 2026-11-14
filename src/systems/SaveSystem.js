import { G, T, potionById } from '../core.js';

// Visual-novel style saving (GDD §3.10, TDD §4.4).
// - Autosave at the start of every step.
// - Numbered slots (pages × perPage), each with a screenshot, time and the exact position.
// Save data: { version, time, kind, sectionId, row, endingId, text, state, session, shot }
//   row = index of the dialogue line to resume at (null = start of the section / potion).

const KEYS = {
  auto: 'bonding_potion.save',
  slot: (n) => 'bonding_potion.slot.' + n,
  settings: 'bonding_potion.settings',
  endings: 'bonding_potion.endings'
};

function read(key) {
  try {
    const s = window.localStorage.getItem(key);
    return s ? JSON.parse(s) : null;
  } catch (e) { return null; }
}

function write(key, value) {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) { return false; }
}

function valid(data) {
  return !!data && data.version === G.config.saveVersion && !!data.sectionId;
}

function base(extra) {
  return Object.assign({
    version: G.config.saveVersion,
    time: Date.now(),
    state: G.state.toJSON(),
    session: { bg: G.session.bg, heroineExpr: G.session.heroineExpr || null, music: G.session.music || null }
  }, extra);
}

export const SaveSystem = {
  slotCount() {
    const s = G.config.saveSlots || { pages: 3, perPage: 6 };
    return s.pages * s.perPage;
  },

  /** Autosave at the start of a step. */
  autosave(section) {
    write(KEYS.auto, base({
      kind: section.type, sectionId: section.id, row: null,
      endingId: section.endingId || null, text: '', shot: null
    }));
  },

  /** Builds save data from the running scene (its saveData() gives the position). */
  capture(scene, shot) {
    const pos = scene && scene.saveData ? scene.saveData() : null;
    if (!pos) return null;
    return base(Object.assign({ shot: shot || null }, pos));
  },

  writeSlot(n, data) { return !!data && write(KEYS.slot(n), data); },
  readSlot(n) { const d = read(KEYS.slot(n)); return valid(d) ? d : null; },
  readAuto() { const d = read(KEYS.auto); return valid(d) ? d : null; },

  /** Most recent save of any kind (used by Continue). */
  latest() {
    let best = this.readAuto();
    for (let n = 1; n <= this.slotCount(); n++) {
      const d = this.readSlot(n);
      if (d && (!best || d.time > best.time)) best = d;
    }
    return best;
  },

  hasAny() { return !!this.latest(); },

  /** After an ending the autosave is cleared (numbered slots stay). */
  clearProgress() { write(KEYS.auto, null); },

  loadSettings() {
    const d = read(KEYS.settings) || {};
    return {
      textSpeed: d.textSpeed || 'normal',
      auto: !!d.auto,
      autoSpeed: d.autoSpeed || 'normal',
      musicVolume: typeof d.musicVolume === 'number' ? d.musicVolume : G.config.audio.musicVolume,
      sfxVolume: typeof d.sfxVolume === 'number' ? d.sfxVolume : G.config.audio.sfxVolume
    };
  },
  saveSettings() { write(KEYS.settings, G.settings); },

  seenEndings() { const d = read(KEYS.endings); return Array.isArray(d) ? d : []; },
  addSeenEnding(id) {
    const list = this.seenEndings();
    if (!list.includes(id)) { list.push(id); write(KEYS.endings, list); }
  }
};

/** Readable name of a save position: potion name, "Scene 3", or the ending name. */
export function sectionLabel(sectionId) {
  const sections = G.script.sections;
  const s = sections.find(x => x.id === sectionId);
  if (!s) return sectionId || '';
  if (s.type === 'potion') { const p = potionById(s.potionId); return p ? p.name : s.id; }
  if (s.type === 'ending') return T('ending.' + s.endingId);
  const n = sections.filter(x => x.type === 'dialogue').indexOf(s) + 1;
  return T('save.scene', { n });
}

/** Seconds-precision local date and time for slot cards. */
export function formatTime(t) {
  const d = new Date(t);
  const pad = (v) => String(v).padStart(2, '0');
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}  ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Shrinks a full-size snapshot image into a small JPEG data URL for a save slot. */
export function makeThumb(img, cb) {
  const done = () => {
    try {
      const c = document.createElement('canvas');
      c.width = 320; c.height = 180;
      c.getContext('2d').drawImage(img, 0, 0, 320, 180);
      cb(c.toDataURL('image/jpeg', 0.75));
    } catch (e) { cb(null); }
  };
  if (!img || !img.src) { cb(null); return; }
  if (img.complete && img.naturalWidth) done();
  else { img.onload = done; img.onerror = () => cb(null); }
}
