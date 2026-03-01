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
const MIN_POWER = 150;
const MAX_POWER = 500;
const CHARGE_SPEED = 350;

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

        // Power charge state
        this.charging = false;
        this.chargePower = 0;
        this.chargeDirection = 1;

        // Trajectory preview
        this.trajectoryGfx = this.add.graphics();
        this.trajectoryGfx.setDepth(9);

        // Power bar (world space, near figure)
        this.powerBarGfx = this.add.graphics();
        this.powerBarGfx.setDepth(50);

        // Effects system
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

        // Resize
        this.scale.on('resize', () => {
            this.cameras.main.setZoom(this._getIdealZoom());
        });

        // HUD
        this.scene.launch('HUDScene', { gameScene: this });

        // Events
        this.events.on('turn-start', (info) => {
            this.currentWind = info.wind;
            this.currentWeaponKey = 'bazooka';
            this.charging = false;
            this.chargePower = 0;
            this._focusOnFigure(info.figure);
            this.stats.turns++;
            SFX.turnStart();

            if (this.stats.turns > 1 && this.stats.turns % 3 === 0) {
                this._spawnCrate();
            }
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

        this.effects.update(rawDt);

        this.debrisGfx.clear();
        this.effects.draw(this.debrisGfx);

        this.turnManager.update(dt);

        for (const team of this.teams) {
            team.update(dt, this.terrain);
        }

        for (let i = this.crates.length - 1; i >= 0; i--) {
            this.crates[i].update(dt, this.allFigures);
            if (!this.crates[i].alive) this.crates.splice(i, 1);
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
        } else {
            this.trajectoryGfx.clear();
            this.powerBarGfx.clear();
        }

        this._updateWater(time);
    }

    _getIdealZoom() {
        const h = this.scale.height;
        return Math.max(1, (h / WORLD_H) * 1.4);
    }

    _handleInput(dt) {
        const figure = this.turnManager.activeFigure;
        if (!figure || !figure.alive) return;

        const fineAim = this.cursors.shift.isDown;
        const aimSpeed = fineAim ? 0.8 : 2.5;

        // Aim (always allowed, even while charging)
        if (this.cursors.up.isDown) {
            figure.aimAngle = Math.max(-Math.PI / 2, figure.aimAngle - aimSpeed * dt);
        }
        if (this.cursors.down.isDown) {
            figure.aimAngle = Math.min(Math.PI / 2, figure.aimAngle + aimSpeed * dt);
        }

        // Movement (blocked while charging)
        if (!this.charging) {
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
        }

        // Weapons that fire instantly (no power charge)
        const instantWeapons = ['shotgun', 'dynamite', 'teleport', 'airstrike'];
        const usesPower = !instantWeapons.includes(this.currentWeaponKey);

        if (usesPower) {
            // HOLD space to charge, RELEASE to fire
            if (this.keys.space.isDown || this.keys.enter.isDown) {
                if (!this.charging) {
                    this.charging = true;
                    this.chargePower = MIN_POWER;
                    this.chargeDirection = 1;
                }

                // Power oscillates between min and max
                this.chargePower += CHARGE_SPEED * dt * this.chargeDirection;
                if (this.chargePower >= MAX_POWER) {
                    this.chargePower = MAX_POWER;
                    this.chargeDirection = -1;
                }
                if (this.chargePower <= MIN_POWER) {
                    this.chargePower = MIN_POWER;
                    this.chargeDirection = 1;
                }

                this.events.emit('power-update', (this.chargePower - MIN_POWER) / (MAX_POWER - MIN_POWER));
            } else if (this.charging) {
                // Released - FIRE!
                this._fireWeapon(figure, this.chargePower);
                this.charging = false;
                this.chargePower = 0;
                this.events.emit('power-update', -1);
            }

            // Trajectory preview (faint when not charging, bright when charging)
            this._drawTrajectoryPreview(figure);
            this._drawPowerBar(figure);
        } else {
            this.trajectoryGfx.clear();
            this.powerBarGfx.clear();

            // Instant fire
            if (Phaser.Input.Keyboard.JustDown(this.keys.space) || Phaser.Input.Keyboard.JustDown(this.keys.enter)) {
                this._fireWeapon(figure, 0);
            }
        }

        // Camera follows active figure
        this.cameras.main.pan(figure.x, figure.y - 30, 200);
    }

    _drawTrajectoryPreview(figure) {
        const gfx = this.trajectoryGfx;
        gfx.clear();

        const dir = figure.facingRight ? 1 : -1;
        const angle = figure.aimAngle * dir;
        const power = this.charging ? this.chargePower : (MIN_POWER + MAX_POWER) * 0.4;
        const alpha = this.charging ? 0.7 : 0.25;

        let px = figure.x + Math.cos(angle) * 15;
        let py = figure.y - 14 + Math.sin(angle) * 15;
        let vx = Math.cos(angle) * power;
        let vy = Math.sin(angle) * power;

        const gravity = this.currentWeaponKey === 'grenade' ? 350 : 300;
        const windScale = 12;
        const simDt = 0.025;
        const maxDots = 40;

        for (let i = 0; i < maxDots; i++) {
            vy += gravity * simDt;
            vx += this.currentWind * windScale * simDt;
            px += vx * simDt;
            py += vy * simDt;

            if (px < 0 || px > WORLD_W || py > WORLD_H) break;
            if (py > 0 && this.terrain.isSolid(px, py)) {
                // Draw impact marker
                gfx.lineStyle(1.5, 0xff4444, alpha * 0.8);
                gfx.strokeCircle(px, py, 6);
                gfx.lineBetween(px - 4, py - 4, px + 4, py + 4);
                gfx.lineBetween(px + 4, py - 4, px - 4, py + 4);
                break;
            }

            // Only draw every other dot for a dashed look
            if (i % 2 === 0) {
                const fade = (1 - i / maxDots) * alpha;
                const size = 2 - (i / maxDots) * 1.2;
                gfx.fillStyle(this.charging ? 0xff6644 : 0xffffff, fade);
                gfx.fillCircle(px, py, Math.max(0.5, size));
            }
        }
    }

    _drawPowerBar(figure) {
        const gfx = this.powerBarGfx;
        gfx.clear();

        if (!this.charging) return;

        const pct = (this.chargePower - MIN_POWER) / (MAX_POWER - MIN_POWER);
        const barX = figure.x - 22;
        const barY = figure.y + 10;
        const barW = 44;
        const barH = 6;

        // Background
        gfx.fillStyle(0x000000, 0.75);
        gfx.fillRoundedRect(barX - 2, barY - 2, barW + 4, barH + 4, 3);

        // Fill - gradient green to yellow to red
        let color;
        if (pct < 0.35) color = 0x44dd44;
        else if (pct < 0.65) color = 0xdddd44;
        else color = 0xff4444;

        gfx.fillStyle(color, 0.95);
        gfx.fillRoundedRect(barX, barY, barW * pct, barH, 2);

        // Tick marks at 25/50/75%
        gfx.lineStyle(1, 0xffffff, 0.15);
        for (let t = 0.25; t < 1; t += 0.25) {
            const tx = barX + barW * t;
            gfx.lineBetween(tx, barY, tx, barY + barH);
        }

        // Border
        gfx.lineStyle(1, 0xffffff, 0.25);
        gfx.strokeRoundedRect(barX - 2, barY - 2, barW + 4, barH + 4, 3);

        // Percentage text would be nice but graphics-only is fine
        // The pulsing color communicates power level
    }

    _fireWeapon(figure, power) {
        const team = this.turnManager.activeTeam;
        const weaponKey = this.currentWeaponKey;
        if (team.getAmmo(weaponKey) <= 0) return;

        team.useAmmo(weaponKey);
        this.turnManager.onFired();
        this.trajectoryGfx.clear();
        this.powerBarGfx.clear();

        switch (weaponKey) {
            case 'bazooka':
                SFX.shoot();
                this.effects.shake(3, 12);
                this.activeProjectile = fireBazooka(this, figure, this.currentWind, power);
                break;
            case 'grenade':
                SFX.shoot();
                this.activeProjectile = fireGrenade(this, figure, this.currentWind, power);
                break;
            case 'shotgun':
                SFX.shotgunBlast();
                this.effects.shake(8, 10);
                this.activeProjectile = fireShotgun(this, figure);
                break;
            case 'airstrike': {
                SFX.shoot();
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

    _drawSky() {
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

        gfx.fillStyle(0x0a3060, 0.9);
        gfx.fillRect(0, waterTop + 8, WORLD_W, WORLD_H - waterTop);
        gfx.fillStyle(0x1e64c8, 0.7);
        gfx.fillRect(0, waterTop + 3, WORLD_W, 10);

        gfx.fillStyle(0x3090e0, 0.6);
        for (let x = 0; x < WORLD_W; x += 2) {
            const waveY = waterTop + Math.sin(x * 0.025 + t * 2) * 4
                + Math.sin(x * 0.06 + t * 3) * 2;
            gfx.fillRect(x, waveY, 2, 8);
        }

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
