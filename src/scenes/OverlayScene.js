import { G, T, font, rect, color } from '../core.js';
import { nineSlice } from '../ui/NineSlice.js';
import { Button } from '../ui/Button.js';
import { TextButton } from '../ui/TextMenu.js';
import { SaveSystem, sectionLabel, formatTime, makeThumb } from '../systems/SaveSystem.js';
import { Flow } from '../systems/StoryRunner.js';

/**
 * Opens a panel over the given scene and pauses it.
 * Modes: pause, log, settings, save, load, credits, confirm.
 * In-game scenes (those with saveData) get a screenshot taken first, for save slot thumbnails.
 */
export function openOverlay(scene, mode, data) {
  if (scene._leaving || G.session.overlayOpening || scene.scene.isActive('Overlay')) return;
  const launch = () => {
    G.session.overlayOpening = false;
    if (scene._leaving || scene.scene.isActive('Overlay')) return;
    scene.scene.launch('Overlay', Object.assign({ parent: scene.scene.key, mode }, data || {}));
    scene.scene.pause();
  };
  if (scene.saveData && scene.game.renderer && scene.game.renderer.snapshot) {
    G.session.overlayOpening = true;
    G.session.shot = null;
    scene.game.renderer.snapshot((img) => makeThumb(img, (url) => { G.session.shot = url; launch(); }), 'image/png');
  } else {
    G.session.shot = null;
    launch();
  }
}

export class OverlayScene extends Phaser.Scene {
  constructor() { super('Overlay'); }

  create(data) {
    this.parentKey = data.parent;
    this.data_ = data;
    this.startMode = data.mode;
    this.objects = [];
    this.thumbKeys = [];
    this.page = 0;
    if (data.mode === 'load') {
      // Open on the autosave page when the autosave is the newest save.
      const auto = SaveSystem.readAuto(), latest = SaveSystem.latest();
      if (auto && latest && auto.time === latest.time) this.page = 'auto';
    }
    const c = G.config.colors;
    this.add.rectangle(0, 0, 1920, 1080, color(c.dim), 0.55).setOrigin(0, 0).setInteractive();
    const r = rect(G.layout.panel.rect);
    this.panelRect = r;
    nineSlice(this, 'ui_panel', r.x, r.y, r.w, r.h);
    this.toastText = this.add.text(960, r.y + 125, '', font(30, { color: '#ffffff', backgroundColor: 'rgba(43,29,58,0.9)', padding: { x: 20, y: 10 } }))
      .setOrigin(0.5).setDepth(50).setAlpha(0);
    const kb = this.input.keyboard;
    if (kb) kb.on('keydown-ESC', () => this.back());
    this.events.once('shutdown', () => this.clear());
    this.show(data.mode);
  }

  // ---- helpers ----

  clear() {
    this.objects.forEach(o => (o && o.destroy ? o.destroy() : null));
    this.objects = [];
    this.thumbKeys.forEach(k => { if (this.textures.exists(k)) this.textures.remove(k); });
    this.thumbKeys = [];
  }

  track(o) { this.objects.push(o); return o; }

  title(text) {
    const r = this.panelRect;
    return this.track(this.add.text(r.x + r.w / 2, r.y + 70, text, font(G.config.font.panelTitle, { color: G.config.colors.panelText, fontStyle: 'bold' })).setOrigin(0.5));
  }

  button(x, y, label, fn) {
    const [w, h] = G.layout.panel.button;
    return this.track(new Button(this, 'ui_button_small', x - w / 2, y - h / 2, w, h, label, fn));
  }

  textButton(x, y, w, h, label, fn, size) {
    const b = new TextButton(this, x, y, w, h, label, fn);
    b.text.setFontSize(size || G.config.font.panelText);
    this.track(b.zone); this.track(b.text);
    return b;
  }

  toast(msg) {
    this.tweens.killTweensOf(this.toastText);
    this.toastText.setText(msg).setAlpha(1);
    this.tweens.add({ targets: this.toastText, alpha: 0, delay: 1300, duration: 500 });
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

  /** Back to the pause panel if we came from it, otherwise close. */
  back() {
    if (this.startMode === 'pause' && this.mode !== 'pause') this.show('pause');
    else this.close();
  }

  inGame() { return this.parentKey === 'Dialogue' || this.parentKey === 'Potion'; }

  show(mode) {
    this.clear();
    this.mode = mode;
    if (mode === 'pause') this.buildPause();
    else if (mode === 'log') this.buildScrollText(T('log.title'), this.logText());
    else if (mode === 'credits') this.buildScrollText(T('credits.title'), G.credits || '');
    else if (mode === 'settings') this.buildSettings();
    else if (mode === 'save' || mode === 'load') this.buildSlots(mode);
    else if (mode === 'confirm') this.ask(this.data_.message, () => { const fn = this.data_.onYes; this.closeThen(() => { if (fn) fn(); }); }, () => this.close());
  }

  // ---- pause ----

  buildPause() {
    this.title(T('pause.title'));
    const left = 960 - 160, right = 960 + 160;
    this.button(left, 340, T('pause.resume'), () => this.close());
    this.button(left, 460, T('pause.save'), () => this.show('save'));
    this.button(left, 580, T('pause.load'), () => this.show('load'));
    this.button(right, 340, T('menu.log'), () => this.show('log'));
    this.button(right, 460, T('menu.settings'), () => this.show('settings'));
    this.button(right, 580, T('pause.toTitle'), () => {
      this.ask(T('confirm.toTitle'), () => {
        this.scene.stop(this.parentKey);
        this.scene.start('Title');
      }, () => this.show('pause'));
    });
  }

  // ---- confirm (inside the panel) ----

  ask(message, onYes, onNo) {
    this.clear();
    this.mode = 'confirm';
    const r = this.panelRect;
    this.track(this.add.text(960, r.y + 300, message || '', font(G.config.font.panelTitle - 6, {
      color: G.config.colors.panelText, align: 'center', wordWrap: { width: r.w - 200, useAdvancedWrap: true }
    })).setOrigin(0.5));
    this.button(960 - 160, r.y + 560, T('confirm.yes'), onYes);
    this.button(960 + 160, r.y + 560, T('confirm.no'), onNo);
  }

  // ---- log and credits ----

  logText() {
    const entries = G.session.log;
    return entries.length ? entries.map(e => (e.name ? e.name + ': ' : '') + e.text).join('\n\n') : T('log.empty');
  }

  buildScrollText(titleText, str) {
    this.title(titleText);
    const r = this.panelRect;
    const area = { x: r.x + 80, y: r.y + 130, w: r.w - 160, h: r.h - 290 };
    const isCredits = this.mode === 'credits';
    const txt = this.track(this.add.text(isCredits ? area.x + area.w / 2 : area.x, area.y, str, font(G.config.font.panelText, {
      color: G.config.colors.panelText, align: isCredits ? 'center' : 'left',
      wordWrap: { width: area.w, useAdvancedWrap: true }, lineSpacing: 6
    })).setOrigin(isCredits ? 0.5 : 0, 0));
    const maskShape = this.track(this.make.graphics({ x: 0, y: 0, add: false }));
    maskShape.fillStyle(0xffffff).fillRect(area.x, area.y, area.w, area.h);
    txt.setMask(maskShape.createGeometryMask());
    const minY = Math.min(area.y, area.y + area.h - txt.height);
    txt.y = isCredits ? area.y : minY; // log starts at the newest lines, credits at the top
    const scrollBy = (dy) => { txt.y = Phaser.Math.Clamp(txt.y - dy, minY, area.y); };
    const wheel = (p, over, dx, dy) => scrollBy(dy);
    let lastY = null;
    const zone = this.track(this.add.zone(area.x, area.y, area.w, area.h).setOrigin(0, 0).setInteractive());
    zone.on('pointerdown', (p) => { lastY = p.y; });
    const move = (p) => { if (lastY !== null && p.isDown) { scrollBy(lastY - p.y); lastY = p.y; } };
    const up = () => { lastY = null; };
    this.input.on('wheel', wheel);
    this.input.on('pointermove', move);
    this.input.on('pointerup', up);
    this.track({ destroy: () => { this.input.off('wheel', wheel); this.input.off('pointermove', move); this.input.off('pointerup', up); } });
    this.button(960, r.y + r.h - 85, T('panel.close'), () => this.back());
  }

  // ---- settings ----

  buildSettings() {
    this.title(T('settings.title'));
    const r = this.panelRect;
    const labelX = r.x + 120, ctrlX = r.x + 480;
    const c = G.config.colors;
    const label = (y, t) => this.track(this.add.text(labelX, y, t, font(G.config.font.panelText, { color: c.panelText, fontStyle: 'bold' })).setOrigin(0, 0.5));
    const save = () => SaveSystem.saveSettings();
    const choice = (y, options, get, set) => {
      const buttons = options.map((o, i) => {
        const b = this.textButton(ctrlX + i * 170, y - 25, 160, 50, o.label, () => {
          set(o.value); save();
          buttons.forEach((bb, j) => bb.setActive(options[j].value === get()));
        });
        b.setActive(get() === o.value);
        return b;
      });
    };
    const speeds = ['slow', 'normal', 'fast'].map(s => ({ value: s, label: T('settings.' + s) }));

    let y = r.y + 150;
    const step = 95;
    label(y, T('settings.textSpeed'));
    choice(y, speeds, () => G.settings.textSpeed, (v) => { G.settings.textSpeed = v; });

    y += step; label(y, T('settings.auto'));
    choice(y, [{ value: false, label: T('settings.off') }, { value: true, label: T('settings.on') }],
      () => !!G.settings.auto, (v) => { G.settings.auto = v; });

    y += step; label(y, T('settings.autoSpeed'));
    choice(y, speeds, () => G.settings.autoSpeed, (v) => { G.settings.autoSpeed = v; });

    y += step; label(y, T('settings.music'));
    this.slider(ctrlX, y, 500, G.settings.musicVolume, (v) => { G.settings.musicVolume = v; G.audio.applyVolumes(); });
    y += step; label(y, T('settings.sound'));
    this.slider(ctrlX, y, 500, G.settings.sfxVolume, (v) => { G.settings.sfxVolume = v; }, () => G.audio.sfx('click'));

    if (this.scale.fullscreen.available) {
      y += step; label(y, T('settings.fullscreen'));
      const fsBtn = this.textButton(ctrlX, y - 25, 160, 50, '', () => {
        this.scale.toggleFullscreen();
        this.time.delayedCall(250, refresh);
      });
      const refresh = () => fsBtn.text.setText(T(this.scale.isFullscreen ? 'settings.on' : 'settings.off'));
      refresh();
    }

    this.button(960, r.y + r.h - 85, T('panel.close'), () => { save(); this.back(); });
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

  // ---- save / load slots ----

  buildSlots(mode) {
    const isSave = mode === 'save';
    if (isSave && !this.inGame()) { this.show('load'); return; }
    this.title(T(isSave ? 'save.title' : 'load.title'));
    const cfg = G.config.saveSlots || { pages: 3, perPage: 6 };
    const S = G.layout.panel.slots, P = G.layout.panel.pages;
    const r = this.panelRect;

    // Page buttons (Load also has the autosave page "A").
    const pages = [];
    if (!isSave) pages.push({ id: 'auto', label: T('save.auto') });
    for (let i = 0; i < cfg.pages; i++) pages.push({ id: i, label: String(i + 1) });
    if (isSave && this.page === 'auto') this.page = 0;
    const totalW = pages.reduce((s, p) => s + (p.id === 'auto' ? P.w + 30 : P.w), 0);
    let px = P.x - totalW;
    pages.forEach(p => {
      const w = p.id === 'auto' ? P.w + 30 : P.w;
      const b = this.textButton(px, P.y, w, P.h, p.label, () => { this.page = p.id; this.show(mode); }, 30);
      b.setActive(this.page === p.id);
      px += w;
    });

    // Slots
    const list = [];
    if (this.page === 'auto') {
      list.push({ n: 'auto', data: SaveSystem.readAuto() });
    } else {
      for (let i = 0; i < cfg.perPage; i++) {
        const n = this.page * cfg.perPage + i + 1;
        list.push({ n, data: SaveSystem.readSlot(n) });
      }
    }
    list.forEach((slot, i) => {
      const col = i % 3, row = Math.floor(i / 3);
      const x = S.x + col * (S.w + S.gapX), y = S.y + row * (S.h + S.gapY);
      this.slotCard(slot, x, y, S, isSave);
    });

    if (!isSave && !SaveSystem.hasAny()) {
      this.track(this.add.text(r.x + 50, P.y + P.h / 2, T('save.noSaves'), font(24, { color: G.config.colors.menu, fontStyle: 'italic' })).setOrigin(0, 0.5));
    }
    this.button(960, r.y + r.h - 85, T('panel.close'), () => this.back());
  }

  slotCard(slot, x, y, S, isSave) {
    const data = slot.data;
    const g = this.track(this.add.graphics());
    const draw = (hover) => {
      g.clear();
      g.fillStyle(hover ? 0xfdf8e6 : 0xf7f3fb, 1).fillRoundedRect(x, y, S.w, S.h, 14);
      g.lineStyle(hover ? 5 : 3, hover ? 0xc0396b : 0x6a4a8c, 1).strokeRoundedRect(x, y, S.w, S.h, 14);
    };
    draw(false);
    const [tw, th] = S.thumb;
    const tx = x + (S.w - tw) / 2, ty = y + 10;
    const name = slot.n === 'auto' ? T('save.autoLabel') : T('save.slot', { n: slot.n });
    const small = (yy, str, extra) => this.track(this.add.text(x + 14, yy, str, font(20, Object.assign({ color: G.config.colors.panelText }, extra || {}))));

    if (data) {
      const frame = this.track(this.add.rectangle(tx, ty, tw, th, 0x2b1d3a).setOrigin(0, 0));
      void frame;
      if (data.shot) this.addThumb(data.shot, tx, ty, tw, th);
      else this.track(this.add.text(tx + tw / 2, ty + th / 2, sectionLabel(data.sectionId), font(26, { color: '#f4eff9', fontStyle: 'bold' })).setOrigin(0.5));
      small(ty + th + 6, `${name}  ·  ${formatTime(data.time)}`, { fontStyle: 'bold' });
      const label = sectionLabel(data.sectionId);
      const snippet = data.text ? ` — ${data.text}` : '';
      const t = small(ty + th + 32, label + snippet);
      t.setFontSize(18);
      if (t.width > S.w - 28) { // trim to one line
        let s = label + snippet;
        while (s.length > 4 && t.width > S.w - 28) { s = s.slice(0, -2); t.setText(s + '…'); }
      }
    } else {
      this.track(this.add.text(x + S.w / 2, y + S.h / 2 - 14, name, font(26, { color: G.config.colors.panelText, fontStyle: 'bold' })).setOrigin(0.5));
      this.track(this.add.text(x + S.w / 2, y + S.h / 2 + 20, T('save.empty'), font(22, { color: G.config.colors.menu, fontStyle: 'italic' })).setOrigin(0.5));
    }

    const usable = isSave ? slot.n !== 'auto' : !!data;
    const zone = this.track(this.add.zone(x, y, S.w, S.h).setOrigin(0, 0));
    if (!usable) return;
    zone.setInteractive({ useHandCursor: true });
    zone.on('pointerover', (p) => { if (!p.wasTouch) draw(true); });
    zone.on('pointerout', () => draw(false));
    zone.on('pointerup', () => { G.audio.sfx('click'); isSave ? this.saveTo(slot.n, !!data) : this.loadFrom(data); });
  }

  addThumb(url, x, y, w, h) {
    const key = 'slotthumb_' + Math.random().toString(36).slice(2);
    this.thumbKeys.push(key);
    const img = new Image();
    const holder = { destroyed: false, obj: null, destroy() { this.destroyed = true; if (this.obj) this.obj.destroy(); } };
    this.track(holder);
    img.onload = () => {
      if (holder.destroyed || !this.sys || !this.sys.isActive()) return;
      this.textures.addImage(key, img);
      holder.obj = this.add.image(x, y, key).setOrigin(0, 0).setDisplaySize(w, h);
    };
    img.src = url;
  }

  saveTo(n, exists) {
    const doSave = () => {
      const parent = this.scene.get(this.parentKey);
      const data = SaveSystem.capture(parent, G.session.shot);
      const ok = SaveSystem.writeSlot(n, data);
      this.show('save');
      this.toast(T(ok ? 'save.saved' : 'save.failed'));
    };
    if (exists) this.ask(T('save.overwrite'), doSave, () => this.show('save'));
    else doSave();
  }

  loadFrom(data) {
    const go = () => this.closeThen((parent) => {
      if (parent.scene.key === 'Potion' && parent.cleanup) parent.cleanup();
      Flow.load(parent, data);
    });
    if (this.inGame()) this.ask(T('save.loadConfirm'), go, () => this.show('load'));
    else go();
  }
}
