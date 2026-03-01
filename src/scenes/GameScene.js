import { Terrain } from '../game/Terrain.js';
import { Team } from '../game/Team.js';
import { TurnManager } from '../game/TurnManager.js';
import { WEAPONS, WEAPON_KEYS, getNextWeapon } from '../game/WeaponSystem.js';
import { fireBazooka } from '../game/weapons/Bazooka.js';
import { fireGrenade } from '../game/weapons/Grenade.js';
import { fireShotgun } from '../game/weapons/Shotgun.js';
import { fireAirstrike } from '../game/weapons/Airstrike.js';
import { placeDynamite } from '../game/weapons/Dynamite.js';
import { activateTeleport } from '../game/weapons/Teleport.js';

const WORLD_W = 1920;
const WORLD_H = 540;

export class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    create(data) {
        this.activeProjectile = null;
        this.currentWeaponKey = 'bazooka';
        this.currentWind = 0;
        this.gameOver = false;

        // Sky gradient background
        this._drawSky();

        // Water
        this._drawWater();

        // Create terrain
        this.terrain = new Terrain(this, WORLD_W, WORLD_H);

        // Create teams
        const teamCount = data.teams.length;
        const zoneWidth = WORLD_W / teamCount;
        this.teams = data.teams.map((config, i) => {
            return new Team(this, {
                ...config,
                spawnZoneStart: zoneWidth * i + 50,
                spawnZoneEnd: zoneWidth * (i + 1) - 50,
            }, this.terrain);
        });

        // All figures flat list
        this.allFigures = this.teams.flatMap(t => t.figures);

        // Turn manager
        this.turnManager = new TurnManager(this.teams, 30, this);

        // Camera setup
        this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);
        this.cameras.main.setZoom(1.5);
        this._focusOnFigure(this.turnManager.activeFigure);

        // Input setup
        this.cursors = this.input.keyboard.createCursorKeys();
        this.keys = {
            space: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
            enter: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER),
            tab: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.TAB),
            q: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q),
            e: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E),
            a: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
            d: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
            w: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
            s: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
        };

        // Prevent tab default
        this.input.keyboard.addCapture([Phaser.Input.Keyboard.KeyCodes.TAB]);

        // Launch HUD
        this.scene.launch('HUDScene', { gameScene: this });

        // Events
        this.events.on('turn-start', (info) => {
            this.currentWind = info.wind;
            this.currentWeaponKey = 'bazooka';
            this._focusOnFigure(info.figure);
        });

        this.events.on('game-over', (winnerTeam) => {
            this.gameOver = true;
            this.time.delayedCall(2000, () => {
                this.scene.stop('HUDScene');
                this.scene.start('VictoryScene', {
                    winner: winnerTeam ? { name: winnerTeam.name, color: winnerTeam.color } : null
                });
            });
        });
    }

    update(time, delta) {
        if (this.gameOver) return;

        const dt = delta / 1000;

        // Update turn manager
        this.turnManager.update(dt);

        // Update teams/figures
        for (const team of this.teams) {
            team.update(dt, this.terrain);
        }

        // Update projectile
        if (this.activeProjectile) {
            const result = this.activeProjectile.update(dt, this.terrain, this.allFigures);
            if (result) {
                this.activeProjectile = null;
                this.turnManager.onProjectileLanded();
                // Refocus camera on next active figure after settling
                this.time.delayedCall(1500, () => {
                    const fig = this.turnManager.activeFigure;
                    if (fig) this._focusOnFigure(fig);
                });
            } else {
                // Follow projectile with camera
                if (this.activeProjectile && this.activeProjectile.alive) {
                    this.cameras.main.stopFollow();
                    this.cameras.main.pan(this.activeProjectile.x, this.activeProjectile.y, 100);
                }
            }
        }

        // Handle input during aiming phase
        if (this.turnManager.phase === 'aiming') {
            this._handleInput(dt);
        }

        // Update water animation
        this._updateWater(time);
    }

    _handleInput(dt) {
        const figure = this.turnManager.activeFigure;
        if (!figure || !figure.alive) return;

        const fineAim = this.cursors.shift.isDown;
        const aimSpeed = fineAim ? 0.8 : 2.5;

        // Aim up/down
        if (this.cursors.up.isDown) {
            figure.aimAngle = Math.max(-Math.PI / 2, figure.aimAngle - aimSpeed * dt);
        }
        if (this.cursors.down.isDown) {
            figure.aimAngle = Math.min(Math.PI / 2, figure.aimAngle + aimSpeed * dt);
        }

        // Move left/right
        if (this.cursors.left.isDown || this.keys.a.isDown) {
            figure.facingRight = false;
            const newX = figure.x - 60 * dt;
            if (!this.terrain.isSolid(newX, figure.y - 5) && newX > 5) {
                figure.x = newX;
                // Walk up slopes
                if (this.terrain.isSolid(newX, figure.y)) {
                    let steps = 0;
                    while (this.terrain.isSolid(newX, figure.y - 1) && steps < 6) {
                        figure.y--;
                        steps++;
                    }
                    if (steps >= 6) figure.x += 60 * dt; // too steep, block
                }
            }
        }
        if (this.cursors.right.isDown || this.keys.d.isDown) {
            figure.facingRight = true;
            const newX = figure.x + 60 * dt;
            if (!this.terrain.isSolid(newX, figure.y - 5) && newX < WORLD_W - 5) {
                figure.x = newX;
                if (this.terrain.isSolid(newX, figure.y)) {
                    let steps = 0;
                    while (this.terrain.isSolid(newX, figure.y - 1) && steps < 6) {
                        figure.y--;
                        steps++;
                    }
                    if (steps >= 6) figure.x -= 60 * dt;
                }
            }
        }

        // Weapon switching (Q/E or Tab)
        if (Phaser.Input.Keyboard.JustDown(this.keys.q)) {
            this.currentWeaponKey = getNextWeapon(this.currentWeaponKey, -1, this.turnManager.activeTeam);
            this.events.emit('weapon-changed', this.currentWeaponKey);
        }
        if (Phaser.Input.Keyboard.JustDown(this.keys.e) || Phaser.Input.Keyboard.JustDown(this.keys.tab)) {
            this.currentWeaponKey = getNextWeapon(this.currentWeaponKey, 1, this.turnManager.activeTeam);
            this.events.emit('weapon-changed', this.currentWeaponKey);
        }

        // Fire weapon (Space or Enter)
        if (Phaser.Input.Keyboard.JustDown(this.keys.space) || Phaser.Input.Keyboard.JustDown(this.keys.enter)) {
            this._fireWeapon(figure);
        }
    }

    _fireWeapon(figure) {
        const team = this.turnManager.activeTeam;
        const weaponKey = this.currentWeaponKey;

        if (team.getAmmo(weaponKey) <= 0) return;

        team.useAmmo(weaponKey);
        this.turnManager.onFired();

        switch (weaponKey) {
            case 'bazooka':
                this.activeProjectile = fireBazooka(this, figure, this.currentWind);
                break;
            case 'grenade':
                this.activeProjectile = fireGrenade(this, figure, this.currentWind);
                break;
            case 'shotgun':
                this.activeProjectile = fireShotgun(this, figure);
                break;
            case 'airstrike': {
                // Airstrike targets where the figure is aiming
                const dir = figure.facingRight ? 1 : -1;
                const targetX = figure.x + Math.cos(figure.aimAngle * dir) * 200;
                this.activeProjectile = fireAirstrike(this, targetX, this.terrain, this.allFigures);
                break;
            }
            case 'dynamite':
                this.activeProjectile = placeDynamite(this, figure, this.terrain, this.allFigures);
                break;
            case 'teleport':
                this.activeProjectile = activateTeleport(this, figure, this.terrain);
                break;
        }
    }

    _focusOnFigure(figure) {
        if (!figure) return;
        this.cameras.main.pan(figure.x, figure.y - 30, 500, 'Sine.easeInOut');
    }

    _drawSky() {
        const sky = this.add.graphics();
        sky.setDepth(0);

        // Gradient sky
        for (let y = 0; y < WORLD_H; y++) {
            const t = y / WORLD_H;
            const r = Math.floor(100 + t * 35);
            const g = Math.floor(160 + t * 60);
            const b = Math.floor(230 - t * 30);
            const color = (r << 16) | (g << 8) | b;
            sky.fillStyle(color, 1);
            sky.fillRect(0, y, WORLD_W, 1);
        }

        // Clouds
        sky.fillStyle(0xffffff, 0.3);
        for (let i = 0; i < 8; i++) {
            const cx = Math.random() * WORLD_W;
            const cy = 20 + Math.random() * 80;
            const w = 60 + Math.random() * 100;
            const h = 15 + Math.random() * 20;
            sky.fillEllipse(cx, cy, w, h);
            sky.fillEllipse(cx + w * 0.3, cy - 5, w * 0.6, h * 0.8);
            sky.fillEllipse(cx - w * 0.2, cy + 3, w * 0.5, h * 0.7);
        }
    }

    _drawWater() {
        this.waterGfx = this.add.graphics();
        this.waterGfx.setDepth(5);
    }

    _updateWater(time) {
        const gfx = this.waterGfx;
        gfx.clear();

        const waterTop = WORLD_H - 30;
        const t = time * 0.001;

        // Water body
        gfx.fillStyle(0x1e64c8, 0.85);
        gfx.fillRect(0, waterTop + 5, WORLD_W, 30);

        // Wave surface
        gfx.fillStyle(0x2e84e8, 0.7);
        for (let x = 0; x < WORLD_W; x += 2) {
            const waveY = waterTop + Math.sin(x * 0.03 + t * 2) * 4
                + Math.sin(x * 0.07 + t * 3) * 2;
            gfx.fillRect(x, waveY, 2, waterTop + 8 - waveY);
        }

        // Highlights
        gfx.fillStyle(0x4eaaff, 0.3);
        for (let x = 0; x < WORLD_W; x += 3) {
            const waveY = waterTop + Math.sin(x * 0.03 + t * 2) * 4;
            gfx.fillRect(x, waveY, 2, 1);
        }
    }

    shutdown() {
        this.terrain?.destroy();
        for (const team of this.teams || []) {
            team.destroy();
        }
    }
}
