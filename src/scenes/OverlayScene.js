import { G, T, font, rect, color } from '../core.js';
import { nineSlice } from '../ui/NineSlice.js';
import { Button } from '../ui/Button.js';
import { TextButton } from '../ui/TextMenu.js';
import { SaveSystem } from '../systems/SaveSystem.js';

/** Opens a panel (pause, log, settings, confirm) over the given scene and pauses it. */
export function openOverlay(scene, mode, data) {
  if (scene.scene.isActive('Overlay') || scene._leaving) return;
  scene.scene.launch('Overlay', Object.assign({ parent: scene.scene.key, mode }, data || {}));
  scene.scene.pause();
}

export class OverlayScene extends Phaser.Scene {
  constructor() { super('Overlay'); }

  create(data) {
    this.parentKey = data.parent;
    this.data_ = data;
    this.objects = [];
    const c = G.config.colors;
    this.add.rectangle(0, 0, 1920, 1080, color(c.dim), 0.55).setOrigin(0, 0).setInteractive();
    const r = rect(G.layout.panel.rect);
    this.panelRect = r;
    nineSlice(this, 'ui_panel', r.x, r.y, r.w, r.h);
    const kb = this.input.keyboard;
    if (kb) kb.on('keydown-ESC', () => this.close());
    this.show(data.mode);
  }

  // ---- helpers ----

  clear() {
    this.objects.forEach(o => (o.destroy ? o.destroy() : null));
    this.objects = [];
  }

  track(o) { this.objects.push(o); return o; }

  title(text) {
    const r = this.panelRect;
    return this.track(this.add.text(r.x + r.w / 2, r.y + 70, text, font(G.config.font.panelTitle, { color: G.config.colors.panelText, fontStyle: 'bold' })).setOrigin(0.5));
  }

  button(x, y, label, fn) {
    const [w, h] = G.layout.panel.button;
    const b = new Button(this, 'ui_button_small', x - w / 2, y - h / 2, w, h, label, fn);
    this.track(b);
    return b;
  }

  close() {
    this.scene.resume(this.parentKey);
    this.scene.stop();
  }

  /** Closes the overlay, resumes the parent, then runs fn(parentScene). */
  closeThen(fn) {
    const parent = this.scene.get(this.parentKey);
    this.scene.resume(this.parentKey);
    this.scene.stop();
    fn(parent);
  }

  show(mode) {
    this.clear();
    this.mode = mode;
    if (mode === 'pause') this.buildPause();
    else if (mode === 'log') this.buildLog();
    else if (mode === 'settings') this.buildSettings();
    else if (mode === 'confirm') this.buildConfirm();
  }

  // ---- panels ----

  buildPause() {
    this.title(T('pause.title'));
    const cx = 960;
    this.button(cx, 330, T('pause.resume'), () => this.close());
    this.button(cx, 450, T('menu.log'), () => this.show('log'));
    this.button(cx, 570, T('menu.settings'), () => this.show('settings'));
    this.button(cx, 690, T('pause.toTitle'), () => {
      this.data_.message = T('confirm.toTitle');
      this.data_.onYes = null;
      this.data_.toTitle = true;
      this.show('confirm');
    });
  }

  buildLog() {
    this.title(T('log.title'));
    const r = this.panelRect;
    const area = { x: r.x + 80, y: r.y + 130, w: r.w - 160, h: r.h - 290 };
    const entries = G.session.log;
    const str = entries.length
      ? entries.map(e => (e.name ? e.name + ': ' : '') + e.text).join('\n\n')
      : T('log.empty');
    const txt = this.track(this.add.text(area.x, area.y, str, font(G.config.font.panelText, { color: G.config.colors.panelText, wordWrap: { width: area.w, useAdvancedWrap: true } })));
    const maskShape = this.track(this.make.graphics({ x: 0, y: 0, add: false }));
    maskShape.fillStyle(0xffffff).fillRect(area.x, area.y, area.w, area.h);
    txt.setMask(maskShape.createGeometryMask());
    const minY = Math.min(area.y, area.y + area.h - txt.height);
    txt.y = minY; // start at the newest lines
    const scrollBy = (dy) => { txt.y = Phaser.Math.Clamp(txt.y - dy, minY, area.y); };
    const wheel = (p, over, dx, dy) => scrollBy(dy);
    this.input.on('wheel', wheel);
    let lastY = null;
    const zone = this.track(this.add.zone(area.x, area.y, area.w, area.h).setOrigin(0, 0).setInteractive());
    zone.on('pointerdown', (p) => { lastY = p.y; });
    const move = (p) => { if (lastY !== null && p.isDown) { scrollBy(lastY - p.y); lastY = p.y; } };
    const up = () => { lastY = null; };
    this.input.on('pointermove', move);
    this.input.on('pointerup', up);
    this.track({ destroy: () => { this.input.off('wheel', wheel); this.input.off('pointermove', move); this.input.off('pointerup', up); } });
    this.button(960, r.y + r.h - 85, T('panel.close'), () => this.back());
  }

  buildSettings() {
    this.title(T('settings.title'));
    const r = this.panelRect;
    const labelX = r.x + 120, ctrlX = r.x + 480;
    const c = G.config.colors;
    const label = (y, t) => this.track(this.add.text(labelX, y, t, font(G.config.font.panelText, { color: c.panelText, fontStyle: 'bold' })).setOrigin(0, 0.5));

    // Text speed
    let y = r.y + 200;
    label(y, T('settings.textSpeed'));
    const speeds = ['slow', 'normal', 'fast'];
    const speedButtons = speeds.map((s, i) => {
      const b = new TextButton(this, ctrlX + i * 170, y - 25, 160, 50, T('settings.' + s), () => {
        G.settings.textSpeed = s; SaveSystem.saveSettings();
        speedButtons.forEach((bb, j) => bb.setActive(speeds[j] === s));
      });
      b.text.setFontSize(G.config.font.panelText);
      b.setActive(G.settings.textSpeed === s);
      this.track(b.zone); this.track(b.text);
      return b;
    });

    // Volumes
    y += 120; label(y, T('settings.music'));
    this.slider(ctrlX, y, 500, G.settings.musicVolume, (v) => { G.settings.musicVolume = v; G.audio.applyVolumes(); });
    y += 120; label(y, T('settings.sound'));
    this.slider(ctrlX, y, 500, G.settings.sfxVolume, (v) => { G.settings.sfxVolume = v; }, () => G.audio.sfx('click'));

    // Fullscreen
    if (this.scale.fullscreen.available) {
      y += 120; label(y, T('settings.fullscreen'));
      const fsBtn = new TextButton(this, ctrlX, y - 25, 160, 50, '', () => {
        this.scale.toggleFullscreen();
        this.time.delayedCall(200, refresh);
      });
      fsBtn.text.setFontSize(G.config.font.panelText);
      const refresh = () => fsBtn.text.setText(T(this.scale.isFullscreen ? 'settings.on' : 'settings.off'));
      refresh();
      this.track(fsBtn.zone); this.track(fsBtn.text);
    }

    this.button(960, r.y + r.h - 85, T('panel.close'), () => { SaveSystem.saveSettings(); this.back(); });
  }

  slider(x, y, w, value, onChange, onRelease) {
    const track = this.track(this.add.rectangle(x, y, w, 10, 0x6a4a8c).setOrigin(0, 0.5));
    const fill = this.track(this.add.rectangle(x, y, w * value, 10, 0xc0396b).setOrigin(0, 0.5));
    const knob = this.track(this.add.circle(x + w * value, y, 22, 0xf6e3a8).setStrokeStyle(4, 0xb8902a).setInteractive({ useHandCursor: true, draggable: true }));
    const set = (px) => {
      const v = Phaser.Math.Clamp((px - x) / w, 0, 1);
      knob.x = x + w * v; fill.width = w * v;
      onChange(Math.round(v * 100) / 100);
    };
    knob.on('drag', (p, dragX) => set(dragX));
    knob.on('dragend', () => { SaveSystem.saveSettings(); if (onRelease) onRelease(); });
    track.setInteractive({ useHandCursor: true }).on('pointerdown', (p) => { set(p.x); SaveSystem.saveSettings(); });
  }

  buildConfirm() {
    const r = this.panelRect;
    this.track(this.add.text(960, r.y + 300, this.data_.message || '', font(G.config.font.panelTitle - 6, {
      color: G.config.colors.panelText, align: 'center', wordWrap: { width: r.w - 200, useAdvancedWrap: true }
    })).setOrigin(0.5));
    this.button(960 - 160, r.y + 560, T('confirm.yes'), () => {
      if (this.data_.toTitle) {
        this.scene.stop(this.parentKey);
        this.scene.start('Title');
        return;
      }
      const fn = this.data_.onYes;
      this.closeThen(() => { if (fn) fn(); });
    });
    this.button(960 + 160, r.y + 560, T('confirm.no'), () => this.back());
  }

  /** Back to the pause panel if we came from it, otherwise close. */
  back() {
    if (this.data_.mode === 'pause') { this.data_.toTitle = false; this.show('pause'); }
    else this.close();
  }
}
