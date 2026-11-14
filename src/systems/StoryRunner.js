import { G, goTo } from '../core.js';
import { SaveSystem, stepIndexFromSave } from './SaveSystem.js';

// Walks the script sections in file order (TDD §4.2).
export const Flow = {
  steps() {
    return G.script.sections.filter(s => s.type !== 'ending');
  },

  start(scene, index) {
    const steps = this.steps();
    if (index >= steps.length) return this.ending(scene);
    const section = steps[index];
    G.state.stepIndex = index;
    if (!scene._debugJump) SaveSystem.autosave();
    goTo(scene, section.type === 'potion' ? 'Potion' : 'Dialogue', { section });
  },

  next(scene) {
    this.start(scene, G.state.stepIndex + 1);
  },

  ending(scene, forcedId) {
    const id = forcedId || G.state.ending();
    const section = G.script.sections.find(s => s.type === 'ending' && s.endingId === id);
    if (!section) {
      goTo(scene, 'Ending', { endingId: id });
      return;
    }
    goTo(scene, 'Dialogue', { section, endingId: id });
  },

  newGame(scene) {
    G.state.reset();
    G.session.log = [];
    G.session.bg = 'shop';
    this.start(scene, 0);
  },

  resume(scene, data) {
    G.state.load(data);
    G.session.log = [];
    this.start(scene, stepIndexFromSave(data));
  },

  /** Debug / editor: jump straight to a section by id. */
  jumpTo(scene, id) {
    const steps = this.steps();
    const i = steps.findIndex(s => s.id === id);
    if (i >= 0) { scene._debugJump = true; this.start(scene, i); return true; }
    const end = G.script.sections.find(s => s.id === id && s.type === 'ending');
    if (end) { this.ending(scene, end.endingId); return true; }
    return false;
  },

  jumpToPotion(scene, n) {
    const steps = this.steps();
    const potions = steps.map((s, i) => ({ s, i })).filter(x => x.s.type === 'potion');
    const target = potions[n - 1];
    if (target) { scene._debugJump = true; this.start(scene, target.i); }
  }
};
