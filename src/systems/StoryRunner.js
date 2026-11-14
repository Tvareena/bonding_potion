import { G, goTo } from '../core.js';
import { SaveSystem } from './SaveSystem.js';

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
    if (!scene._debugJump) SaveSystem.autosave(section);
    goTo(scene, section.type === 'potion' ? 'Potion' : 'Dialogue', { section });
  },

  next(scene) {
    this.start(scene, G.state.stepIndex + 1);
  },

  ending(scene, forcedId) {
    const id = forcedId || G.state.ending();
    const section = G.script.sections.find(s => s.type === 'ending' && s.endingId === id);
    G.state.stepIndex = this.steps().length;
    if (!section) {
      goTo(scene, 'Ending', { endingId: id });
      return;
    }
    if (!scene._debugJump) SaveSystem.autosave(section);
    goTo(scene, 'Dialogue', { section, endingId: id });
  },

  newGame(scene) {
    G.state.reset();
    G.session.log = [];
    G.session.bg = 'shop';
    G.session.heroineExpr = null;
    this.start(scene, 0);
  },

  /** Loads a save (autosave or slot) and resumes at its exact position. */
  load(scene, data) {
    if (!data) return;
    G.state.load(data.state || {});
    G.session.log = [];
    const ses = data.session || {};
    G.session.bg = ses.bg || 'shop';
    G.session.heroineExpr = ses.heroineExpr || null;
    if (ses.music) G.audio.music(ses.music);
    const steps = this.steps();
    const section = G.script.sections.find(s => s.id === data.sectionId) || steps[0];
    const row = typeof data.row === 'number' ? data.row : null;
    if (section.type === 'ending') {
      G.state.stepIndex = steps.length;
      goTo(scene, 'Dialogue', { section, endingId: section.endingId, resumeRow: row });
      return;
    }
    G.state.stepIndex = Math.max(0, steps.indexOf(section));
    goTo(scene, section.type === 'potion' ? 'Potion' : 'Dialogue', { section, resumeRow: row });
  },

  /** Debug / editor: jump straight to a section by id. */
  jumpTo(scene, id) {
    const steps = this.steps();
    const i = steps.findIndex(s => s.id === id);
    if (i >= 0) { scene._debugJump = true; this.start(scene, i); return true; }
    const end = G.script.sections.find(s => s.id === id && s.type === 'ending');
    if (end) { scene._debugJump = true; this.ending(scene, end.endingId); return true; }
    return false;
  },

  jumpToPotion(scene, n) {
    const steps = this.steps();
    const potions = steps.map((s, i) => ({ s, i })).filter(x => x.s.type === 'potion');
    const target = potions[n - 1];
    if (target) { scene._debugJump = true; this.start(scene, target.i); }
  }
};
