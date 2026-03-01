import { Terrain } from '../game/Terrain.js';
import { Team } from '../game/Team.js';
import { TurnManager } from '../game/TurnManager.js';
import { Effects } from '../game/Effects.js';
import { MapEvents } from '../game/MapEvents.js';
import { Crate } from '../game/Crate.js';
import { SFX } from '../game/SFX.js';
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
        this.crates = [];
        this.stats = { turns: 0, totalDamage: 0 };

        // Effects system (screen shake, debris, damage numbers)
        this.effects = new Effects(this);

        // Sky
        this._drawSky(data.biome);

        // Water
        this.waterGfx = this.add.graphics();
        this.waterGfx.setDepth(5);
        this.waterBaseY = WORLD_H - 30;

        // Terrain
        this.terrain = new Terrain(this, WORLD_W, WORLD_H);

        // Map events
        this.mapEvents = new MapEvents(this, this.terrain, this.effects);

        // Debris graphics
        this.debrisGfx = this.add.graphics();
        this.debrisGfx.setDepth(15);

        // Teams
        const teamCount = data.teams.length;
        const zoneWidth = WORLD_W / teamCount;
        this.teams = data.teams.map((config, i) => {
            return new Team(this, {
                ...config,
                spawnZoneStart: zoneWidth * i + 60,
                spawnZoneEnd: zoneWidth * (i + 1) - 60,
            }, this.terrain);
        });

        this.allFigures = this.teams.flatMap(t => t.figures);

        // Turn manager
        this.turnManager = new TurnManager(this.teams, 30, this);

        // Camera
        this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);
        this.cameras.main.setZoom(this._getIdealZoom());
        this._focusOnFigure(this.turnManager.activeFigure);

        // Input
        this.cursors = this.input.keyboard.createCursorKeys();
        this.keys = {
            space: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
            enter: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER),
            tab: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.TAB),
            q: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q),
            e: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E),
            a: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
            d: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
        };
        this.input.keyboard.addCapture([Phaser.Input.Keyboard.KeyCodes.TAB]);

        // Resize handling
        this.scale.on('resize', () => {
            this.cameras.main.setZoom(this._getIdealZoom());
        });

        // HUD
        this.scene.launch('HUDScene', { gameScene: this });

        // Events
        this.events.on('turn-start', (info) => {
            this.currentWind = info.wind;
            this.currentWeaponKey = 'bazooka';
            this._focusOnFigure(info.figure);
            this.stats.turns++;
            SFX.turnStart();

            // Spawn crate every 3 turns
            if (this.stats.turns > 1 && this.stats.turns % 3 === 0) {
                this._spawnCrate();
            }

            // Map events between turns
            this.mapEvents.onTurnEnd();
        });

        this.events.on('game-over', (winnerTeam) => {
            this.gameOver = true;
            SFX.victory();
            this.time.delayedCall(2500, () => {
                this.scene.stop('HUDScene');
                this.scene.start('VictoryScene', {
                    winner: winnerTeam ? { name: winnerTeam.name, color: winnerTeam.color } : null,
                    stats: this.stats,
                });
            });
        });
    }

    update(time, delta) {
        if (this.gameOver) return;

        const rawDt = delta / 1000;
        const dt = rawDt * this.effects.timeScale;

        // Effects
        this.effects.update(rawDt);

        // Draw debris
        this.debrisGfx.clear();
        this.effects.draw(this.debrisGfx);

        // Turn manager
        this.turnManager.update(dt);

        // Teams / figures
        for (const team of this.teams) {
            team.update(dt, this.terrain);
        }

        // Crates
        for (let i = this.crates.length - 1; i >= 0; i--) {
            this.crates[i].update(dt, this.allFigures);
            if (!this.crates[i].alive) {
                this.crates.splice(i, 1);
            }
        }

        // Projectile
        if (this.activeProjectile) {
            const result = this.activeProjectile.update(dt, this.terrain, this.allFigures);
            if (result) {
                if (result === 'hit' && this.activeProjectile.blastRadius > 50) {
                    this.effects.slowMo(0.3, 0.3);
                }
                this.activeProjectile = null;
                this.turnManager.onProjectileLanded();
                this.time.delayedCall(1500, () => {
                    const fig = this.turnManager.activeFigure;
                    if (fig) this._focusOnFigure(fig);
                });
            } else if (this.activeProjectile && this.activeProjectile.alive) {
                // Camera follows projectile
                this.cameras.main.stopFollow();
                this.cameras.main.pan(
                    this.activeProjectile.x,
                    Math.min(this.activeProjectile.y, WORLD_H - 50),
                    100
                );
            }
        }

        // Input
        if (this.turnManager.phase === 'aiming') {
            this._handleInput(dt);
        }

        // Water
        this._updateWater(time);
    }

    _getIdealZoom() {
        const w = this.scale.width;
        const h = this.scale.height;
        // Fit vertically with some zoom
        const zoomH = h / WORLD_H;
        return Math.max(1, zoomH * 1.4);
    }

    _handleInput(dt) {
        const figure = this.turnManager.activeFigure;
        if (!figure || !figure.alive) return;

        const fineAim = this.cursors.shift.isDown;
        const aimSpeed = fineAim ? 0.8 : 2.5;

        if (this.cursors.up.isDown) {
            figure.aimAngle = Math.max(-Math.PI / 2, figure.aimAngle - aimSpeed * dt);
        }
        if (this.cursors.down.isDown) {
            figure.aimAngle = Math.min(Math.PI / 2, figure.aimAngle + aimSpeed * dt);
        }

        // Movement
        const moveSpeed = 70;
        if (this.cursors.left.isDown || this.keys.a.isDown) {
            figure.facingRight = false;
            figure.walkCycle += dt * 8;
            const newX = figure.x - moveSpeed * dt;
            if (!this.terrain.isSolid(newX, figure.y - 5) && newX > 5) {
                figure.x = newX;
                if (this.terrain.isSolid(newX, figure.y)) {
                    let steps = 0;
                    while (this.terrain.isSolid(newX, figure.y - 1) && steps < 6) {
                        figure.y--;
                        steps++;
                    }
                    if (steps >= 6) figure.x += moveSpeed * dt;
                }
            }
        }
        if (this.cursors.right.isDown || this.keys.d.isDown) {
            figure.facingRight = true;
            figure.walkCycle += dt * 8;
            const newX = figure.x + moveSpeed * dt;
            if (!this.terrain.isSolid(newX, figure.y - 5) && newX < WORLD_W - 5) {
                figure.x = newX;
                if (this.terrain.isSolid(newX, figure.y)) {
                    let steps = 0;
                    while (this.terrain.isSolid(newX, figure.y - 1) && steps < 6) {
                        figure.y--;
                        steps++;
                    }
                    if (steps >= 6) figure.x -= moveSpeed * dt;
                }
            }
        }

        // Weapon switch
        if (Phaser.Input.Keyboard.JustDown(this.keys.q)) {
            this.currentWeaponKey = getNextWeapon(this.currentWeaponKey, -1, this.turnManager.activeTeam);
            this.events.emit('weapon-changed', this.currentWeaponKey);
        }
        if (Phaser.Input.Keyboard.JustDown(this.keys.e) || Phaser.Input.Keyboard.JustDown(this.keys.tab)) {
            this.currentWeaponKey = getNextWeapon(this.currentWeaponKey, 1, this.turnManager.activeTeam);
            this.events.emit('weapon-changed', this.currentWeaponKey);
        }

        // Fire
        if (Phaser.Input.Keyboard.JustDown(this.keys.space) || Phaser.Input.Keyboard.JustDown(this.keys.enter)) {
            this._fireWeapon(figure);
        }

        // Camera follow active figure while aiming
        this.cameras.main.pan(figure.x, figure.y - 30, 200);
    }

    _fireWeapon(figure) {
        const team = this.turnManager.activeTeam;
        const weaponKey = this.currentWeaponKey;
        if (team.getAmmo(weaponKey) <= 0) return;

        team.useAmmo(weaponKey);
        this.turnManager.onFired();
        SFX.shoot();

        switch (weaponKey) {
            case 'bazooka':
                this.activeProjectile = fireBazooka(this, figure, this.currentWind);
                break;
            case 'grenade':
                this.activeProjectile = fireGrenade(this, figure, this.currentWind);
                break;
            case 'shotgun':
                SFX.shotgunBlast();
                this.activeProjectile = fireShotgun(this, figure);
                this.effects.shake(6, 10);
                break;
            case 'airstrike': {
                const dir = figure.facingRight ? 1 : -1;
                const targetX = figure.x + Math.cos(figure.aimAngle * dir) * 200;
                this.activeProjectile = fireAirstrike(this, targetX, this.terrain, this.allFigures);
                break;
            }
            case 'dynamite':
                this.activeProjectile = placeDynamite(this, figure, this.terrain, this.allFigures);
                break;
            case 'teleport':
                SFX.teleport();
                this.activeProjectile = activateTeleport(this, figure, this.terrain);
                break;
        }
    }

    _spawnCrate() {
        const x = 100 + Math.random() * (WORLD_W - 200);
        const crate = new Crate(this, x, this.terrain);
        this.crates.push(crate);
    }

    _focusOnFigure(figure) {
        if (!figure) return;
        this.cameras.main.pan(figure.x, figure.y - 30, 600, 'Sine.easeInOut');
    }

    _drawSky(biomeKey) {
        const sky = this.add.graphics();
        sky.setDepth(0);

        for (let y = 0; y < WORLD_H; y++) {
            const t = y / WORLD_H;
            const r = Math.floor(100 + t * 40);
            const g = Math.floor(150 + t * 70);
            const b = Math.floor(230 - t * 20);
            sky.fillStyle((r << 16) | (g << 8) | b, 1);
            sky.fillRect(0, y, WORLD_W, 1);
        }

        // Clouds
        for (let i = 0; i < 10; i++) {
            const cx = Math.random() * WORLD_W;
            const cy = 15 + Math.random() * 80;
            const w = 50 + Math.random() * 120;
            const h = 12 + Math.random() * 20;
            sky.fillStyle(0xffffff, 0.15 + Math.random() * 0.15);
            sky.fillEllipse(cx, cy, w, h);
            sky.fillEllipse(cx + w * 0.3, cy - 4, w * 0.5, h * 0.7);
            sky.fillEllipse(cx - w * 0.25, cy + 2, w * 0.5, h * 0.6);
        }
    }

    _updateWater(time) {
        const gfx = this.waterGfx;
        gfx.clear();

        const waterTop = this.waterBaseY - this.mapEvents.getWaterOffset();
        const t = time * 0.001;

        // Deep water
        gfx.fillStyle(0x0a3060, 0.9);
        gfx.fillRect(0, waterTop + 8, WORLD_W, WORLD_H - waterTop);

        // Mid water
        gfx.fillStyle(0x1e64c8, 0.7);
        gfx.fillRect(0, waterTop + 3, WORLD_W, 10);

        // Wave surface
        gfx.fillStyle(0x3090e0, 0.6);
        for (let x = 0; x < WORLD_W; x += 2) {
            const waveY = waterTop + Math.sin(x * 0.025 + t * 2) * 4
                + Math.sin(x * 0.06 + t * 3) * 2;
            gfx.fillRect(x, waveY, 2, 8);
        }

        // Foam highlights
        gfx.fillStyle(0x88ccff, 0.25);
        for (let x = 0; x < WORLD_W; x += 4) {
            const waveY = waterTop + Math.sin(x * 0.025 + t * 2) * 4;
            gfx.fillRect(x, waveY, 3, 1);
        }
    }

    shutdown() {
        this.terrain?.destroy();
        for (const team of this.teams || []) team.destroy();
        for (const crate of this.crates || []) crate.destroy();
    }
}
