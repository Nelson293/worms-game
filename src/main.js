import { LobbyScene } from './scenes/LobbyScene.js';
import { GameScene } from './scenes/GameScene.js';
import { HUDScene } from './scenes/HUDScene.js';
import { VictoryScene } from './scenes/VictoryScene.js';

const config = {
    type: Phaser.AUTO,
    width: 960,
    height: 540,
    parent: 'game-container',
    backgroundColor: '#87CEEB',
    scene: [LobbyScene, GameScene, HUDScene, VictoryScene],
    pixelArt: false,
    roundPixels: true,
};

const game = new Phaser.Game(config);
