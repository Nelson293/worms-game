import { SFX } from './SFX.js';

// Screen shake, damage numbers, debris, slow-mo - all the game juice
export class Effects {
    constructor(scene) {
        this.scene = scene;
        this.shakeIntensity = 0;
        this.shakeDecay = 0;
        this.slowMoTimer = 0;
        this.slowMoScale = 1;
        this.debris = [];
        this.damageNumbers = [];
        this.killFeed = [];
    }

    get timeScale() {
        return this.slowMoTimer > 0 ? this.slowMoScale : 1;
    }

    update(dt) {
        // Screen shake
        if (this.shakeIntensity > 0.5) {
            const cam = this.scene.cameras.main;
            const ox = (Math.random() - 0.5) * this.shakeIntensity;
            const oy = (Math.random() - 0.5) * this.shakeIntensity;
            cam.setScroll(cam.scrollX + ox, cam.scrollY + oy);
            this.shakeIntensity *= (1 - this.shakeDecay * dt);
            if (this.shakeIntensity < 0.5) this.shakeIntensity = 0;
        }

        // Slow-mo countdown
        if (this.slowMoTimer > 0) {
            this.slowMoTimer -= dt;
            if (this.slowMoTimer <= 0) {
                this.slowMoScale = 1;
                this.scene.time.timeScale = 1;
            }
        }

        // Update debris particles
        for (let i = this.debris.length - 1; i >= 0; i--) {
            const d = this.debris[i];
            d.vy += 400 * dt;
            d.x += d.vx * dt;
            d.y += d.vy * dt;
            d.life -= dt;
            d.rot += d.rotSpeed * dt;
            if (d.life <= 0) {
                this.debris.splice(i, 1);
            }
        }

        // Update damage numbers
        for (let i = this.damageNumbers.length - 1; i >= 0; i--) {
            const dn = this.damageNumbers[i];
            dn.y -= 40 * dt;
            dn.life -= dt;
            if (dn.life <= 0) {
                dn.text.destroy();
                this.damageNumbers.splice(i, 1);
            } else {
                dn.text.setPosition(dn.x, dn.y);
                dn.text.setAlpha(Math.min(1, dn.life * 2));
                dn.text.setScale(1 + (1 - dn.life / dn.maxLife) * 0.3);
            }
        }
    }

    draw(gfx) {
        // Draw debris
        for (const d of this.debris) {
            const alpha = Math.min(1, d.life * 2);
            gfx.fillStyle(d.color, alpha);
            gfx.save();
            const s = d.size;
            // Simple rotated rect
            gfx.fillRect(d.x - s / 2, d.y - s / 2, s, s);
            gfx.restore();
        }
    }

    shake(intensity, decay = 8) {
        this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
        this.shakeDecay = decay;
    }

    slowMo(duration = 0.5, scale = 0.3) {
        this.slowMoTimer = duration;
        this.slowMoScale = scale;
        this.scene.time.timeScale = scale;
    }

    spawnDebris(x, y, count, colors, radius = 50) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 100 + Math.random() * 300;
            this.debris.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 150,
                size: 2 + Math.random() * 4,
                color: colors[Math.floor(Math.random() * colors.length)],
                life: 0.5 + Math.random() * 1.5,
                rot: Math.random() * Math.PI * 2,
                rotSpeed: (Math.random() - 0.5) * 10,
            });
        }
    }

    showDamage(x, y, amount) {
        const dmg = Math.round(amount);
        if (dmg <= 0) return;

        const color = dmg >= 40 ? '#ff2222' : dmg >= 20 ? '#ffaa00' : '#ffff44';
        const size = dmg >= 40 ? '18px' : dmg >= 20 ? '15px' : '12px';

        const text = this.scene.add.text(x + (Math.random() - 0.5) * 10, y - 20, `-${dmg}`, {
            fontSize: size,
            fontFamily: 'Russo One, sans-serif',
            color: color,
            stroke: '#000000',
            strokeThickness: 3,
            fontStyle: 'bold',
        }).setOrigin(0.5).setDepth(50);

        const maxLife = 1.2;
        this.damageNumbers.push({ x: text.x, y: text.y, text, life: maxLife, maxLife });
    }

    showKill(killerTeam, victimTeam, figureIndex) {
        this.killFeed.push({
            killer: killerTeam,
            victim: victimTeam,
            time: Date.now(),
        });
        // Keep only last 5
        if (this.killFeed.length > 5) this.killFeed.shift();
        this.scene.events.emit('kill-feed-update', this.killFeed);
    }

    explosionEffect(x, y, radius, terrainColors) {
        // Screen shake proportional to blast
        this.shake(radius * 0.3, 6);

        // Debris
        this.spawnDebris(x, y, Math.floor(radius * 0.8), terrainColors || [0x8B6E3C, 0x6B4E2C, 0x5a5a5a, 0x4a8c3f], radius);

        // Sound
        SFX.explosion(radius / 50);

        // Flash
        this._flash(x, y, radius);
    }

    _flash(x, y, radius) {
        const gfx = this.scene.add.graphics();
        gfx.setDepth(30);

        let t = 0;
        const r = radius;
        this.scene.time.addEvent({
            delay: 16,
            repeat: 18,
            callback: () => {
                t += 0.055;
                gfx.clear();

                const cr = r * (0.4 + t * 0.6);
                const alpha = (1 - t);

                // Outer fire ring
                gfx.fillStyle(0xff4400, alpha * 0.5);
                gfx.fillCircle(x, y, cr);

                // Inner orange
                gfx.fillStyle(0xff8800, alpha * 0.6);
                gfx.fillCircle(x, y, cr * 0.65);

                // Core white flash
                gfx.fillStyle(0xffeecc, alpha * 0.7);
                gfx.fillCircle(x, y, cr * 0.3);

                // Smoke ring expanding
                if (t > 0.3) {
                    const smokeAlpha = (1 - t) * 0.3;
                    gfx.fillStyle(0x333333, smokeAlpha);
                    gfx.fillCircle(x, y, cr * 1.2);
                }

                if (t >= 1) gfx.destroy();
            }
        });
    }

    bigExplosion(x, y, radius) {
        this.explosionEffect(x, y, radius);
        this.slowMo(0.4, 0.25);
    }
}
