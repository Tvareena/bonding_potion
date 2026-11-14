import { G } from '../core.js';

// Loads the data files, then hands over to PreloadScene.
export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  preload() {
    const v = '?v=' + Date.now(); // always read the newest data files
    this.load.json('config', 'data/config.json' + v);
    this.load.json('layout', 'data/layout.json' + v);
    this.load.json('assets', 'data/assets.json' + v);
    this.load.json('characters', 'data/characters.json' + v);
    this.load.json('potions', 'data/potions.json' + v);
    this.load.json('crystals', 'data/crystals.json' + v);
    this.load.json('texts', 'data/texts.json' + v);
    this.load.text('script', 'data/script.txt' + v);
    this.load.text('credits', 'data/credits.txt' + v);
    this.load.on('loaderror', (file) => console.error('[Bonding Potion] Could not load ' + file.src));
  }

  create() {
    const c = this.cache.json;
    G.config = c.get('config');
    G.layout = c.get('layout');
    G.assets = c.get('assets');
    G.characters = c.get('characters');
    G.potions = c.get('potions');
    G.crystals = c.get('crystals');
    G.texts = c.get('texts') || {};
    G.scriptText = this.cache.text.get('script') || '';
    G.credits = (this.cache.text.get('credits') || '').replace(/\r\n?/g, '\n').trim();
    if (!G.config || !G.layout || !G.assets) {
      this.add.text(40, 40, 'The game data could not be loaded.\nOpen the game through a web server (see README).', { fontSize: '40px', color: '#ffffff' });
      return;
    }
    const rotate = document.getElementById('rotate-text');
    if (rotate && G.texts['rotate.message']) rotate.textContent = G.texts['rotate.message'];
    document.body.style.background = G.config.letterboxColor;
    const params = new URLSearchParams(window.location.search);
    G.debug = params.get('debug') === '1';
    G.startScene = params.get('scene');
    this.loadFonts().then(() => this.scene.start('Preload'));
  }

  /**
   * Loads font files listed in config.json → fontFiles, e.g.
   *   "fontFiles": [ { "family": "BondingTitle", "url": "assets/fonts/title.ttf" } ]
   * and then "titleFamily": "BondingTitle, 'Courier New', monospace".
   * A missing or broken font just falls back to the next font in the list.
   */
  async loadFonts() {
    const list = (G.config.fontFiles || []).filter(f => f && f.family && f.url);
    await Promise.all(list.map(async (f) => {
      try {
        const face = new FontFace(f.family, `url(${f.url})`);
        await face.load();
        document.fonts.add(face);
      } catch (e) {
        console.warn('[Bonding Potion] Could not load font ' + f.url);
      }
    }));
  }
}
