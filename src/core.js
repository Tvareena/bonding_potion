// Shared game data and small helpers used by every scene.

export const G = {
  config: null,
  layout: null,
  assets: null,
  characters: null,
  potions: null,
  crystals: null,
  texts: {},
  script: null,       // parsed script: { sections, warnings }
  state: null,        // GameState
  audio: null,        // AudioManager
  settings: null,     // { textSpeed, musicVolume, sfxVolume }
  session: {          // not saved
    log: [],
    advances: 0,
    bg: 'shop',
    music: null
  },
  debug: false,
  startScene: null,   // ?scene=<id>
  warnings: [],
  missingImages: []
};

export const ELEMENTS = ['fire', 'water', 'earth', 'air'];

/** Player-visible text from data/texts.json, with {name} markers filled in. */
export function T(key, vars) {
  let s = G.texts[key];
  if (s === undefined) { warn(`Missing text key "${key}" in data/texts.json`); s = key; }
  if (vars) for (const k of Object.keys(vars)) s = s.split(`{${k}}`).join(String(vars[k]));
  return s;
}

export function warn(msg) {
  if (!G.warnings.includes(msg)) {
    G.warnings.push(msg);
    console.warn('[Bonding Potion] ' + msg);
  }
}

/** Auto mode pause after a fully shown line, from the Auto speed setting. */
export function autoDelayMs(chars) {
  const sp = (G.config.text.autoSpeeds || {})[G.settings.autoSpeed] || { base: 1.2, perChar: 0.03 };
  return (sp.base + sp.perChar * chars) * 1000;
}

export function color(hex) {
  return Phaser.Display.Color.HexStringToColor(hex).color;
}

export function font(size, extra) {
  return Object.assign({ fontFamily: G.config.font.family, fontSize: `${size}px`, color: G.config.colors.text }, extra || {});
}

export function rect(a) {
  return { x: a[0], y: a[1], w: a[2], h: a[3] };
}

export function charName(id) {
  const c = G.characters[id];
  return c ? c.name : id;
}

export function potionById(id) {
  return G.potions.find(p => p.id === id);
}

export function crystalById(id) {
  return G.crystals.find(c => c.id === id);
}

export function hasTexture(scene, key) {
  return scene.textures.exists(key) && key !== '__MISSING';
}

export function isTouchDevice() {
  return ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
}

/** Fade the camera out, then start another scene. Guards against double clicks. */
export function goTo(scene, key, data) {
  if (scene._leaving) return;
  scene._leaving = true;
  scene.input.enabled = false;
  scene.cameras.main.fadeOut(250, 0, 0, 0);
  scene.cameras.main.once('camerafadeoutcomplete', () => {
    scene.scene.start(key, data);
  });
}
