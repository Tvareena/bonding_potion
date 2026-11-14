import { G } from '../core.js';

export class GameState {
  constructor() { this.reset(); }

  reset() {
    this.stepIndex = 0;
    this.choices = {};   // potion id → 'book' | 'cat' (potions 1–6 only)
    this.flags = {};     // commentHeavy, commentSlip, tutorialDone…
  }

  catCount() {
    return Object.values(this.choices).filter(v => v === 'cat').length;
  }

  ending() {
    const cats = this.catCount();
    const e = G.config.endings;
    if (cats >= e.romanceMin) return 'romance';
    if (cats >= e.friendshipMin) return 'friendship';
    return 'bad';
  }

  toJSON() {
    return { stepIndex: this.stepIndex, choices: this.choices, flags: this.flags };
  }

  load(data) {
    this.reset();
    this.stepIndex = data.stepIndex || 0;
    this.choices = Object.assign({}, data.choices || {});
    this.flags = Object.assign({}, data.flags || {});
  }
}
