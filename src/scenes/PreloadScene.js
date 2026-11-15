import { G, T, warn, font } from '../core.js';
import { parseScript } from '../systems/ScriptParser.js';
import { GameState } from '../systems/GameState.js';
import { SaveSystem } from '../systems/SaveSystem.js';
import { AudioManager } from '../systems/AudioManager.js';
import { Flow } from '../systems/StoryRunner.js';

// Loads every image and sound from data/assets.json, with a progress bar.
// Images that fail to load are replaced by a generated rectangle of the expected size.
export class PreloadScene extends Phaser.Scene {
  constructor() { super('Preload'); }

  preload() {
    const W = 1920, H = 1080;
    this.add.text(W / 2, H / 2 - 70, T('loading'), font(40, { color: '#f4eff9' })).setOrigin(0.5);
    const barBg = this.add.rectangle(W / 2, H / 2, 800, 24, 0x3a2f4a).setOrigin(0.5);
    const bar = this.add.rectangle(W / 2 - 400, H / 2, 0, 24, 0xcbb9df).setOrigin(0, 0.5);
    this.load.on('progress', (p) => { bar.width = 800 * p; });

    this.failed = [];
    this.load.on('loaderror', (file) => {
      if (file.type === 'image') this.failed.push(file.key);
    });

    const images = G.assets.images;
    for (const key of Object.keys(images)) {
      if (key.startsWith('_')) continue;
      this.load.image(key, images[key].path);
    }
    const audio = G.assets.audio || {};
    for (const key of Object.keys(audio)) {
      if (key.startsWith('_')) continue;
      this.load.audio(key, audio[key]);
    }
  }

  create() {
    // Fallback textures for missing images.
    const images = G.assets.images;
    for (const key of Object.keys(images)) {
      if (key.startsWith('_')) continue;
      if (!this.textures.exists(key) || this.failed.includes(key)) {
        if (this.textures.exists(key)) this.textures.remove(key);
        const [w, h] = images[key].size || [128, 128];
        const tex = this.textures.createCanvas(key, w, h);
        const ctx = tex.getContext();
        ctx.fillStyle = '#c94f7c'; ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 4; ctx.strokeRect(2, 2, w - 4, h - 4);
        ctx.fillStyle = '#ffffff'; ctx.font = `bold ${Math.max(10, Math.min(36, w / 12))}px Arial`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(key, w / 2, h / 2);
        tex.refresh();
        G.missingImages.push(key);
        warn(`Image "${key}" is missing (${images[key].path}). Showing a generated stand-in.`);
      }
    }

    // Script
    G.script = parseScript(G.scriptText);
    G.script.warnings.forEach(w => warn('script.txt ' + w));
    this.checkScript();

    G.state = new GameState();
    G.settings = SaveSystem.loadSettings();
    G.audio = new AudioManager(this.game);

    // ?choices=fun:cat,trust:book — pretend these potions were already brewed this way (for testing conditions).
    const pre = new URLSearchParams(window.location.search).get('choices');
    if (pre) pre.split(',').forEach(p => { const [id, v] = p.split(':'); if (id && (v === 'cat' || v === 'book')) G.state.choices[id.toLowerCase()] = v; });

    if (G.startScene) {
      if (Flow.jumpTo(this, G.startScene.toLowerCase())) return;
      warn(`?scene=${G.startScene}: no such section in script.txt`);
    }
    this.scene.start('Title');
  }

  /** Reports unknown speakers, backgrounds, images and potions in the script. */
  checkScript() {
    const imgs = G.assets.images;
    for (const s of G.script.sections) {
      if (s.type === 'potion' && !G.potions.find(p => p.id === s.potionId)) warn(`script.txt line ${s.line}: unknown potion "${s.potionId}"`);
      for (const r of s.rows) {
        for (const c of (r.cond || [])) {
          if (c.type === 'potion' && !G.potions.find(p => p.id === c.potion)) warn(`script.txt line ${r.line}: condition "${c.potion}=${c.value}": unknown potion "${c.potion}"`);
        }
        if (r.kind === 'line' && r.speaker) {
          const c = G.characters[r.speaker];
          if (!c) warn(`script.txt line ${r.line}: unknown speaker "${r.speaker}"`);
          else if (r.expr) {
            const key = (c.image || r.speaker) + '_' + r.expr;
            if (!imgs[key]) warn(`script.txt line ${r.line}: no image "${key}" for "${r.speaker} ${r.expr}:" — the default image is shown`);
          }
        }
        if (r.kind === 'cmd') {
          if (r.name === 'bg' && !imgs['bg_' + r.args[0]]) warn(`script.txt line ${r.line}: unknown background "${r.args[0]}"`);
          if (r.name === 'show' && (!G.characters[r.args[0]] || G.characters[r.args[0]].kind !== 'sprite')) warn(`script.txt line ${r.line}: @show "${r.args[0]}" is not a sprite character`);
          else if (r.name === 'show' && r.args[1] && !imgs[(G.characters[r.args[0]].image || r.args[0]) + '_' + r.args[1]]) warn(`script.txt line ${r.line}: no image for "@show ${r.args[0]} ${r.args[1]}" — the default image is shown`);
          if (!['bg', 'show', 'hide', 'music', 'sfx', 'wait', 'on'].includes(r.name)) warn(`script.txt line ${r.line}: unknown command "@${r.name}"`);
        }
      }
    }
  }
}
