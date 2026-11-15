import { G, T, font, rect, charName, charImage, exprImage, hasTexture, warn, isTouchDevice, goTo, autoDelayMs } from '../core.js';
import { condOk } from '../systems/Conditions.js';
import { TextBox } from '../ui/TextBox.js';
import { Portrait } from '../ui/Portrait.js';
import { TextMenu } from '../ui/TextMenu.js';
import { Flow } from '../systems/StoryRunner.js';
import { SaveSystem } from '../systems/SaveSystem.js';
import { openOverlay } from './OverlayScene.js';
import { setupDebug } from '../systems/Debug.js';

// Visual-novel screen: runs a dialogue or ending section of the script.
export class DialogueScene extends Phaser.Scene {
  constructor() { super('Dialogue'); }

  create(data) {
    this._leaving = false;
    this._debugJump = false;
    this.input.enabled = true;
    this.cameras.main.fadeIn(300, 0, 0, 0);
    this.section = data.section;
    this.endingId = data.endingId || null;
    const L = G.layout.dialogue;

    // Background (two layers for cross-fades)
    this.bg = this.add.image(0, 0, this.bgKey(G.session.bg)).setOrigin(0, 0).setDisplaySize(1920, 1080).setDepth(0);

    // Character sprite
    const sp = rect(L.sprite);
    this.spriteRect = sp;
    this.sprite = this.add.image(sp.x, sp.y, charImage('chad')).setOrigin(0, 0).setDepth(10).setVisible(false).setAlpha(0);
    this.spriteChar = null;

    // Textbox
    this.textbox = new TextBox(this, {
      box: L.textbox, nameplate: L.nameplate, text: L.text,
      fontSize: G.config.font.line, fontMin: G.config.font.lineMin, nameSize: G.config.font.name, depth: 20, more: L.more
    });
    this.textbox.clear();

    // Text menu
    this.menu = new TextMenu(this, L.menu, [
      { id: 'log', label: T('menu.log'), onClick: () => openOverlay(this, 'log') },
      { id: 'auto', label: T('menu.auto'), onClick: () => this.toggleAuto() },
      { id: 'skip', label: T('menu.skip'), onClick: () => this.toggleSkip() },
      { id: 'save', label: T('menu.save'), onClick: () => openOverlay(this, 'save') },
      { id: 'load', label: T('menu.load'), onClick: () => openOverlay(this, 'load') },
      { id: 'settings', label: T('menu.settings'), onClick: () => openOverlay(this, 'settings') }
    ], 25);
    this.menu.get('auto').setActive(!!G.settings.auto);
    this.skip = false;

    // Heroine portrait
    this.portrait = new Portrait(this, L.portraitFrame, L.portrait, 30);

    // Cat icon (rotates around its pivot while Jaros speaks)
    const ci = rect(L.catIcon), pv = L.catPivot;
    this.catIcon = this.add.image(ci.x + pv[0], ci.y + pv[1], 'cat_icon')
      .setOrigin(pv[0] / ci.w, pv[1] / ci.h).setDisplaySize(ci.w, ci.h).setDepth(30);
    this.swing = null;

    // Idle hint
    this.hint = this.add.text(L.hint[0], L.hint[1], T(isTouchDevice() ? 'hint.tap' : 'hint.click'),
      font(G.config.font.hint, { color: G.config.colors.menu, fontStyle: 'italic' })).setOrigin(1, 1).setDepth(26).setVisible(false);
    this.hintTween = null;
    this.idleTimer = null;

    // Toast
    this.toastText = this.add.text(960, 690, '', font(34, { color: '#ffffff', backgroundColor: 'rgba(43,29,58,0.85)', padding: { x: 24, y: 12 } }))
      .setOrigin(0.5).setDepth(60).setAlpha(0);

    // Input
    this.input.on('pointerdown', (p, over) => { if (over.length === 0) this.advance(true); });
    const kb = this.input.keyboard;
    if (kb) {
      kb.on('keydown-SPACE', () => this.advance(true));
      kb.on('keydown-ENTER', () => this.advance(true));
      kb.on('keydown-ESC', () => openOverlay(this, 'pause'));
    }

    // Settings may change while paused (Auto on/off, auto speed).
    this.events.on('resume', () => {
      this.menu.get('auto').setActive(!!G.settings.auto);
      if (G.settings.auto && this.waiting && !this.textbox.typing && !this.autoTimer) this.lineDone();
      if (!G.settings.auto && this.autoTimer) { this.autoTimer.remove(); this.autoTimer = null; }
    });

    this.rows = this.section.rows.filter(r => r.kind !== 'comment');
    this.i = 0;
    this.lineIndex = 0;
    this.waiting = false;
    this.autoTimer = null;
    this.restoring = false;
    if (typeof data.resumeRow === 'number' && data.resumeRow > 0) this.fastForward(data.resumeRow);
    // If the next line is narration, start without the portrait so it doesn't flash in and out.
    const nextLine = this.rows.slice(this.i).find(r => r.kind === 'line');
    if (nextLine && !nextLine.speaker) this.portrait.show(false, true);
    this.time.delayedCall(350, () => this.run());
    setupDebug(this, () => `section: ${this.section.id}  row ${this.i}/${this.rows.length}`);
  }

  bgKey(name) {
    const key = 'bg_' + name;
    return hasTexture(this, key) ? key : 'bg_shop';
  }

  // ---- Script execution ----

  /** Loading a save: replays backgrounds, sprites and music up to the saved line, without showing lines. */
  fastForward(target) {
    this.restoring = true;
    target = Math.min(target, this.rows.length);
    while (this.i < target) {
      const r = this.rows[this.i++];
      if (!condOk(r.cond, G.state.choices)) continue;
      if (r.kind === 'cmd') {
        if (['bg', 'show', 'hide', 'music'].includes(r.name)) this.command(r);
      }
    }
    this.restoring = false;
  }

  /** Current position for save slots (TDD §4.4). */
  saveData() {
    const atLine = this.waiting || this.textbox.typing;
    return {
      kind: this.section.type,
      sectionId: this.section.id,
      row: atLine ? this.lineIndex : this.i,
      endingId: this.endingId,
      text: (this.textbox.full || '').replace(/\s*\n\s*/g, ' ')
    };
  }

  /** Animation time: instant while restoring a save, very short while skipping. */
  dur(ms) { return this.restoring ? 0 : (this.skip ? 50 : ms); }

  run() {
    while (this.i < this.rows.length) {
      const r = this.rows[this.i++];
      if (!condOk(r.cond, G.state.choices)) continue; // condition not met: skip this row
      if (r.kind === 'cmd') {
        if (this.command(r) === 'wait') return;
        continue;
      }
      if (r.kind === 'line') { this.showLine(r); return; }
    }
    this.finish();
  }

  command(r) {
    const a = r.args;
    switch (r.name) {
      case 'bg': this.setBackground(a[0]); break;
      case 'show': this.showSprite(a[0], a[1]); break;
      case 'hide': this.hideSprite(); break;
      case 'music': G.audio.music(a[0]); break;
      case 'sfx': G.audio.sfx(a[0]); break;
      case 'wait': {
        const ms = this.skip ? 50 : Math.max(0, parseFloat(a[0]) || 0) * 1000;
        this.time.delayedCall(ms, () => this.run());
        return 'wait';
      }
      default: break;
    }
    return null;
  }

  setBackground(name) {
    const key = this.bgKey(name);
    G.session.bg = name;
    if (this.bg.texture.key === key) return;
    const old = this.bg;
    this.bg = this.add.image(0, 0, key).setOrigin(0, 0).setDisplaySize(1920, 1080).setDepth(1).setAlpha(0);
    this.tweens.add({ targets: this.bg, alpha: 1, duration: this.dur(500), onComplete: () => { old.destroy(); this.bg.setDepth(0); } });
  }

  showSprite(id, expr) {
    const ch = G.characters[id];
    if (!ch || ch.kind !== 'sprite') { warn(`@show: "${id}" is not a sprite character`); return; }
    const key = exprImage(this, id, expr);
    if (!hasTexture(this, key)) { warn(`Unknown image "${key}"`); return; }
    const sp = this.spriteRect;
    if (this.spriteChar === id && this.sprite.visible) {
      this.sprite.setTexture(key).setDisplaySize(sp.w, sp.h);
    } else {
      this.tweens.killTweensOf(this.sprite);
      this.sprite.setTexture(key).setDisplaySize(sp.w, sp.h).setVisible(true).setAlpha(0);
      this.tweens.add({ targets: this.sprite, alpha: 1, duration: this.dur(350) });
    }
    this.spriteChar = id;
    this.catIcon.setVisible(id !== 'jaros_human');
  }

  hideSprite() {
    if (!this.sprite.visible) return;
    this.tweens.killTweensOf(this.sprite);
    this.tweens.add({ targets: this.sprite, alpha: 0, duration: this.dur(300), onComplete: () => this.sprite.setVisible(false) });
    this.spriteChar = null;
    this.catIcon.setVisible(true);
  }

  /** Emotion of the speaker for this line ("chad angry: ..."); a line without one shows the default image. */
  applyExpr(r) {
    const ch = r.speaker && G.characters[r.speaker];
    if (!ch) return;
    if (ch.kind === 'portrait') this.portrait.setExpr(r.expr);
    else if (ch.kind === 'cat') {
      const key = exprImage(this, r.speaker, r.expr), ci = rect(G.layout.dialogue.catIcon);
      if (this.catIcon.texture.key !== key) this.catIcon.setTexture(key).setDisplaySize(ci.w, ci.h);
    } else if (ch.kind === 'sprite' && this.spriteChar === r.speaker && this.sprite.visible) {
      const key = exprImage(this, r.speaker, r.expr), sp = this.spriteRect;
      if (this.sprite.texture.key !== key) this.sprite.setTexture(key).setDisplaySize(sp.w, sp.h);
    }
  }

  showLine(r) {
    let name = null;
    if (r.speaker) {
      name = charName(r.speaker);
    }
    this.setSwing(r.speaker && G.characters[r.speaker] && G.characters[r.speaker].kind === 'cat');
    this.applyExpr(r);
    // Narration (no speaker name): the Heroine's portrait disappears.
    this.portrait.show(!!r.speaker, this.skip);
    G.session.log.push({ name, text: r.text });
    this.lineIndex = this.i - 1;
    this.waiting = true;
    this.textbox.show(name, r.text, { instant: this.skip, onDone: () => this.lineDone() });
    this.startIdle();
  }

  lineDone() {
    // The line is fully shown and waits for a click: show the bouncing "more" arrow.
    if (!this.skip) this.textbox.setMore(true);
    if (this.skip) {
      this.time.delayedCall(70, () => this.advance(false));
    } else if (G.settings.auto) {
      const ms = autoDelayMs(this.textbox.full.length);
      this.autoTimer = this.time.delayedCall(ms, () => { this.autoTimer = null; this.advance(false); });
    }
  }

  advance(byPlayer) {
    if (this._leaving) return;
    if (byPlayer && this.skip) { this.toggleSkip(); }
    if (this.textbox.typing) { this.textbox.finish(); return; }
    if (!this.waiting) return;
    if (this.autoTimer) { this.autoTimer.remove(); this.autoTimer = null; }
    this.waiting = false;
    if (byPlayer) G.session.advances++;
    this.stopIdle();
    this.run();
  }

  finish() {
    this.setSwing(false);
    if (this.endingId) goTo(this, 'Ending', { endingId: this.endingId });
    else Flow.next(this);
  }

  // ---- Cat icon swing ----

  setSwing(on) {
    if (on && !this.swing) {
      this.catIcon.setAngle(-8);
      this.swing = this.tweens.add({ targets: this.catIcon, angle: 8, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    } else if (!on && this.swing) {
      this.swing.stop(); this.swing = null;
      this.tweens.add({ targets: this.catIcon, angle: 0, duration: 200 });
    }
  }

  // ---- Idle hint ----

  startIdle() {
    this.stopIdle();
    if (G.session.advances >= G.config.hints.idleAdvanceMaxShows) return;
    this.idleTimer = this.time.delayedCall(G.config.hints.idleAdvance * 1000, () => {
      this.hint.setVisible(true).setAlpha(1);
      this.hintTween = this.tweens.add({ targets: this.hint, alpha: 0.2, duration: 600, yoyo: true, repeat: -1 });
    });
  }

  stopIdle() {
    if (this.idleTimer) { this.idleTimer.remove(); this.idleTimer = null; }
    if (this.hintTween) { this.hintTween.stop(); this.hintTween = null; }
    this.hint.setVisible(false);
  }

  // ---- Menu actions ----

  toggleAuto() {
    G.settings.auto = !G.settings.auto;
    SaveSystem.saveSettings();
    this.menu.get('auto').setActive(G.settings.auto);
    if (G.settings.auto && this.waiting && !this.textbox.typing && !this.autoTimer) this.lineDone();
    if (!G.settings.auto && this.autoTimer) { this.autoTimer.remove(); this.autoTimer = null; }
  }

  toggleSkip() {
    this.skip = !this.skip;
    this.menu.get('skip').setActive(this.skip);
    if (this.skip) {
      if (this.textbox.typing) this.textbox.finish();
      else if (this.waiting) this.advance(false);
    }
  }

  toast(msg) {
    this.tweens.killTweensOf(this.toastText);
    this.toastText.setText(msg).setAlpha(1);
    this.tweens.add({ targets: this.toastText, alpha: 0, delay: 1200, duration: 500 });
  }
}
