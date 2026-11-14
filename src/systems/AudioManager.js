import { G } from '../core.js';

// Plays music and sound effects if their files are listed in data/assets.json → audio.
// Missing sounds are silently skipped.
export class AudioManager {
  constructor(game) {
    this.game = game;
    this.current = null;
    this.currentKey = null;
  }

  exists(key) {
    return this.game.cache.audio.exists(key);
  }

  music(name) {
    const key = name && name !== 'off' ? 'music_' + name : null;
    if (key === this.currentKey) return;
    if (this.current) { this.current.stop(); this.current.destroy(); this.current = null; }
    this.currentKey = key;
    G.session.music = name && name !== 'off' ? name : null;
    if (!key || !this.exists(key)) return;
    this.current = this.game.sound.add(key, { loop: true, volume: G.settings.musicVolume });
    this.current.play();
  }

  sfx(name, opts) {
    const key = 'sfx_' + name;
    if (!this.exists(key)) return null;
    const s = this.game.sound.add(key, Object.assign({ volume: G.settings.sfxVolume }, opts || {}));
    s.once('complete', () => s.destroy());
    s.play();
    return s;
  }

  loop(name) {
    const key = 'sfx_' + name;
    if (!this.exists(key)) return null;
    const s = this.game.sound.add(key, { loop: true, volume: G.settings.sfxVolume });
    s.play();
    return s;
  }

  applyVolumes() {
    if (this.current) this.current.setVolume(G.settings.musicVolume);
  }
}
