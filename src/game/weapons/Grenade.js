import { Projectile } from '../Projectile.js';
import { SFX } from '../SFX.js';

export class GrenadeProjectile extends Projectile {
    constructor(scene, x, y, angle, power, wind) {
        super(scene, x, y, angle, power, wind, {
            damage: 65,
            blastRadius: 60,
            color: 0x44aa44,
            size: 5,
            maxTrail: 10,
            gravity: 350,
        });
        this.fuseTimer = 3.0;
        this.bounces = 0;
        this.maxBounces = 3;
        this.BOUNCE_DAMPEN = 0.5;
    }

    update(dt, terrain, figures) {
        if (!this.alive) return;

        this.fuseTimer -= dt;
        this.age += dt;

        // Fuse expired
        if (this.fuseTimer <= 0) {
            return this.onHitTerrain(terrain, figures);
        }

        // Store trail
        this.trail.push({ x: this.x, y: this.y });
        if (this.trail.length > this.maxTrail) this.trail.shift();

        // Physics
        this.vy += this.GRAVITY * dt;
        this.vx += this.wind * this.WIND_SCALE * dt;

        const newX = this.x + this.vx * dt;
        const newY = this.y + this.vy * dt;

        // Out of bounds
        if (newX < -50 || newX > terrain.W + 50 || newY > terrain.H + 50) {
            this.alive = false;
            this.gfx.destroy();
            return 'miss';
        }

        // Terrain collision - bounce
        if (newY > 0 && terrain.isSolid(newX, newY)) {
            this.bounces++;
            if (this.bounces >= this.maxBounces) {
                this.x = newX;
                this.y = newY;
                return this.onHitTerrain(terrain, figures);
            }

            // Reflect velocity
            // Check if horizontal or vertical collision
            if (terrain.isSolid(newX, this.y)) {
                this.vx = -this.vx * this.BOUNCE_DAMPEN;
            }
            if (terrain.isSolid(this.x, newY)) {
                this.vy = -this.vy * this.BOUNCE_DAMPEN;
            }
            this.vx *= 0.9;
            SFX.bounce();
        } else {
            this.x = newX;
            this.y = newY;
        }

        this.draw();
        return null;
    }

    draw() {
        const gfx = this.gfx;
        gfx.clear();

        // Trail
        for (let i = 0; i < this.trail.length; i++) {
            const alpha = i / this.trail.length * 0.3;
            gfx.fillStyle(0x44aa44, alpha);
            gfx.fillCircle(this.trail[i].x, this.trail[i].y, 2);
        }

        // Grenade body
        gfx.fillStyle(0x336633, 1);
        gfx.fillCircle(this.x, this.y, this.size);
        gfx.fillStyle(0x44aa44, 1);
        gfx.fillCircle(this.x, this.y, this.size * 0.7);

        // Fuse timer text
        const timerText = Math.ceil(this.fuseTimer).toString();
        if (!this._timerText) {
            this._timerText = this.scene.add.text(this.x, this.y - 12, timerText, {
                fontSize: '10px', color: '#ff4444',
                stroke: '#000', strokeThickness: 2
            }).setOrigin(0.5).setDepth(21);
        } else {
            this._timerText.setPosition(this.x, this.y - 12);
            this._timerText.setText(timerText);
        }
    }

    destroy() {
        super.destroy();
        if (this._timerText) this._timerText.destroy();
    }

    onHitTerrain(terrain, figures) {
        if (this._timerText) this._timerText.destroy();
        return super.onHitTerrain(terrain, figures);
    }
}

export function fireGrenade(scene, figure, wind) {
    const dir = figure.facingRight ? 1 : -1;
    const angle = figure.aimAngle * dir;
    const startX = figure.x + Math.cos(angle) * 12;
    const startY = figure.y - 14 + Math.sin(angle) * 12;
    return new GrenadeProjectile(scene, startX, startY, angle, 300, wind);
}
