import MainMenuScene from './scenes/MainMenuScene.js';
import RaceScene from './scenes/RaceScene.js';

const BASE_WIDTH = 720;
const BASE_HEIGHT = 1280;

const config = {
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#0a0a0f',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: BASE_WIDTH,
    height: BASE_HEIGHT
  },
  physics: {
    default: 'arcade',
    arcade: {
      debug: false
    }
  },
  render: {
    pixelArt: true,
    antialias: false,
    powerPreference: 'high-performance'
  },
  fps: {
    target: 60,
    min: 30,
    forceSetTimeOut: true
  },
  input: {
    activePointers: 3
  },
  scene: [MainMenuScene, RaceScene]
};

// eslint-disable-next-line no-new
new Phaser.Game(config);

