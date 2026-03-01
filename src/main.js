import { LobbyScene } from './scenes/LobbyScene.js';
import { GameScene } from './scenes/GameScene.js';
import { HUDScene } from './scenes/HUDScene.js';
import { VictoryScene } from './scenes/VictoryScene.js';

const config = {
    type: Phaser.AUTO,
    scale: {
        mode: Phaser.Scale.RESIZE,
        parent: 'game-container',
        width: '100%',
        height: '100%',
        autoRound: true,
    },
    backgroundColor: '#1a1a2e',
    scene: [LobbyScene, GameScene, HUDScene, VictoryScene],
    pixelArt: false,
    roundPixels: true,
    fps: {
        target: 60,
        forceSetTimeOut: false,
    },
    input: {
        keyboard: true,
        mouse: true,
        touch: true,
    },
};

const game = new Phaser.Game(config);
