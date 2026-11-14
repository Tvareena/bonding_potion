import { G } from '../core.js';
import { Flow } from './StoryRunner.js';

// Debug mode (?debug=1): info overlay and shortcut keys (TDD §8).
export function setupDebug(scene, extraInfo) {
  if (!G.debug) return;
  const txt = scene.add.text(8, 8, '', {
    fontFamily: 'Consolas, monospace', fontSize: '18px', color: '#ffffff',
    backgroundColor: 'rgba(0,0,0,0.65)', padding: { x: 8, y: 6 }
  }).setDepth(9000).setScrollFactor(0);
  const update = () => {
    const steps = Flow.steps();
    const step = steps[G.state.stepIndex];
    const ch = Object.entries(G.state.choices).map(([k, v]) => `${k}:${v}`).join(' ') || '-';
    const lines = [
      `DEBUG  ${scene.scene.key}  step ${G.state.stepIndex} (${step ? step.id : '-'})  fps ${Math.round(scene.game.loop.actualFps)}`,
      `choices: ${ch}  cat=${G.state.catCount()} → ${G.state.ending()}`,
      `warnings: ${G.warnings.length}${G.warnings.length ? '  (see console)' : ''}`,
      'keys: N next  1-7 potion  R/F/X ending' + (scene.scene.key === 'Potion' ? '  B/C fill book/cat' : '')
    ];
    if (extraInfo) lines.push(extraInfo());
    txt.setText(lines.join('\n'));
  };
  update();
  scene.time.addEvent({ delay: 250, loop: true, callback: update });

  const kb = scene.input.keyboard;
  if (!kb) return;
  kb.on('keydown-N', () => { scene._debugJump = true; Flow.next(scene); });
  ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN'].forEach((k, i) => {
    kb.on('keydown-' + k, () => Flow.jumpToPotion(scene, i + 1));
  });
  kb.on('keydown-R', () => Flow.ending(scene, 'romance'));
  kb.on('keydown-F', () => Flow.ending(scene, 'friendship'));
  kb.on('keydown-X', () => Flow.ending(scene, 'bad'));
}
