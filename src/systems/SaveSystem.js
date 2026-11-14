import { G } from '../core.js';

const KEYS = {
  auto: 'bonding_potion.save',
  manual: 'bonding_potion.manual',
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

function pack() {
  const steps = G.script.sections.filter(s => s.type !== 'ending');
  const step = steps[G.state.stepIndex];
  return Object.assign({ version: G.config.saveVersion, sectionId: step ? step.id : null }, G.state.toJSON());
}

function valid(data) {
  return data && data.version === G.config.saveVersion;
}

export const SaveSystem = {
  autosave() { write(KEYS.auto, pack()); },
  saveManual() { return write(KEYS.manual, pack()); },
  loadAuto() { const d = read(KEYS.auto); return valid(d) ? d : null; },
  loadManual() { const d = read(KEYS.manual); return valid(d) ? d : null; },
  hasAuto() { return !!this.loadAuto(); },
  clearProgress() { write(KEYS.auto, null); },

  loadSettings() {
    const d = read(KEYS.settings) || {};
    return {
      textSpeed: d.textSpeed || 'normal',
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

/** Finds the step index of a saved game, preferring the saved section id (in case the script changed). */
export function stepIndexFromSave(data) {
  const steps = G.script.sections.filter(s => s.type !== 'ending');
  if (data.sectionId) {
    const i = steps.findIndex(s => s.id === data.sectionId);
    if (i >= 0) return i;
  }
  return Math.min(Math.max(0, data.stepIndex || 0), steps.length - 1);
}
