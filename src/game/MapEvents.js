import { SFX } from './SFX.js';

export class MapEvents {
    constructor(scene, terrain, effects) {
        this.scene = scene;
        this.terrain = terrain;
        this.effects = effects;
        this.turnCount = 0;
        this.risingWaterLevel = 0;
        this.activeEvent = null;
        this.eventTimer = 0;
    }

    onTurnEnd() {
        this.turnCount++;

        // Rising water every 10 turns
        if (this.turnCount > 0 && this.turnCount % 10 === 0) {
            this.risingWaterLevel += 15;
            this._announceEvent('WATER RISING!', 0x4488ff);
        }

        // Random events every 4-6 turns
        if (this.turnCount > 3 && this.turnCount % (4 + Math.floor(Math.random() * 3)) === 0) {
            const roll = Math.random();
            if (roll < 0.4) {
                this._triggerEarthquake();
            } else if (roll < 0.7) {
                this._triggerMeteorShower();
            }
            // 30% chance of no event for variety
        }
    }

    _announceEvent(text, color) {
        const announcement = this.scene.add.text(
            this.scene.cameras.main.scrollX + this.scene.cameras.main.width / 2,
            this.scene.cameras.main.scrollY + 60,
            text,
            {
                fontSize: '28px',
                fontFamily: 'Russo One, sans-serif',
                color: '#' + color.toString(16).padStart(6, '0'),
                stroke: '#000000',
                strokeThickness: 5,
            }
        ).setOrigin(0.5).setDepth(100).setScrollFactor(0);

        this.scene.tweens.add({
            targets: announcement,
            alpha: 0,
            y: announcement.y - 30,
            scale: 1.3,
            duration: 2000,
            delay: 1000,
            onComplete: () => announcement.destroy(),
        });
    }

    _triggerEarthquake() {
        this._announceEvent('EARTHQUAKE!', 0xff8844);
        SFX.earthquake();
        this.effects.shake(15, 3);

        this.scene.time.delayedCall(500, () => {
            this.terrain.earthquakeDeform(12);
            this.effects.shake(20, 4);
        });
    }

    _triggerMeteorShower() {
        this._announceEvent('METEOR SHOWER!', 0xff4444);

        const count = 3 + Math.floor(Math.random() * 4);
        for (let i = 0; i < count; i++) {
            this.scene.time.delayedCall(i * 400 + Math.random() * 300, () => {
                const x = 100 + Math.random() * (this.terrain.W - 200);
                this._dropMeteor(x);
            });
        }
    }

    _dropMeteor(targetX) {
        SFX.meteor();

        const meteor = {
            x: targetX + (Math.random() - 0.5) * 100,
            y: -50,
            targetX: targetX,
            vy: 400 + Math.random() * 200,
            alive: true,
            size: 6 + Math.random() * 6,
        };

        const gfx = this.scene.add.graphics();
        gfx.setDepth(25);
        const trail = [];

        const timer = this.scene.time.addEvent({
            delay: 16,
            repeat: -1,
            callback: () => {
                if (!meteor.alive) {
                    gfx.destroy();
                    timer.destroy();
                    return;
                }

                meteor.y += meteor.vy * 0.016;
                meteor.x += (meteor.targetX - meteor.x) * 0.02;

                // Trail
                trail.push({ x: meteor.x, y: meteor.y });
                if (trail.length > 12) trail.shift();

                gfx.clear();

                // Trail
                for (let i = 0; i < trail.length; i++) {
                    const t = i / trail.length;
                    gfx.fillStyle(0xff4400, t * 0.4);
                    gfx.fillCircle(trail[i].x, trail[i].y, meteor.size * t * 0.6);
                }

                // Meteor body
                gfx.fillStyle(0xff6644, 1);
                gfx.fillCircle(meteor.x, meteor.y, meteor.size);
                gfx.fillStyle(0xffaa44, 0.8);
                gfx.fillCircle(meteor.x, meteor.y, meteor.size * 0.6);

                // Hit terrain
                if (this.terrain.isSolid(meteor.x, meteor.y) || meteor.y > this.terrain.H - 30) {
                    meteor.alive = false;
                    const radius = 25 + meteor.size * 2;
                    this.terrain.explode(meteor.x, meteor.y, radius);
                    this.effects.explosionEffect(meteor.x, meteor.y, radius);

                    // Damage nearby figures
                    const figures = this.scene.allFigures || [];
                    for (const fig of figures) {
                        if (!fig.alive) continue;
                        const dx = fig.x - meteor.x;
                        const dy = fig.y - meteor.y;
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        if (dist < radius) {
                            const dmg = 35 * (1 - dist / radius);
                            fig.takeDamage(dmg);
                            fig.applyExplosionForce(meteor.x, meteor.y, radius);
                        }
                    }
                }
            }
        });
    }

    getWaterOffset() {
        return this.risingWaterLevel;
    }
}
