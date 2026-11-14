import { BootScene } from './scenes/BootScene.js';
import { PreloadScene } from './scenes/PreloadScene.js';
import { TitleScene } from './scenes/TitleScene.js';
import { DialogueScene } from './scenes/DialogueScene.js';
import { PotionScene } from './scenes/PotionScene.js';
import { EndingScene } from './scenes/EndingScene.js';
import { OverlayScene } from './scenes/OverlayScene.js';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: 1920,
  height: 1080,
  backgroundColor: '#1a1424',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  input: { activePointers: 2 },
  render: { antialias: true },
  scene: [BootScene, PreloadScene, TitleScene, DialogueScene, PotionScene, EndingScene, OverlayScene]
});

// Pause while a phone is held in portrait (the CSS shows "Please rotate your device").
const portrait = window.matchMedia('(orientation: portrait) and (pointer: coarse)');
const onOrientation = () => {
  if (!game.loop) return;
  if (portrait.matches) game.loop.sleep(); else game.loop.wake();
};
if (portrait.addEventListener) portrait.addEventListener('change', onOrientation);
else if (portrait.addListener) portrait.addListener(onOrientation);
game.events.once('ready', onOrientation);

window.bondingPotion = game;
