export class Projectile {
    constructor(scene, x, y, angle, power, wind, config = {}) {
        this.scene = scene;
        this.x = x;
        this.y = y;
        this.vx = Math.cos(angle) * power;
        this.vy = Math.sin(angle) * power;
        this.wind = wind;
        this.alive = true;
        this.age = 0;
        this.trail = [];
        this.maxTrail = config.maxTrail ?? 15;
        this.GRAVITY = config.gravity ?? 300;
        this.WIND_SCALE = config.windScale ?? 12;
        this.damage = config.damage ?? 50;
        this.blastRadius = config.blastRadius ?? 45;
        this.color = config.color ?? 0xff6600;
        this.size = config.size ?? 4;
        this.destroysTerrain = config.destroysTerrain !== false;

        // Graphics
        this.gfx = scene.add.graphics();
        this.gfx.setDepth(20);
    }

    update(dt, terrain, figures) {
        if (!this.alive) return;

        this.age += dt;

        // Store trail
        this.trail.push({ x: this.x, y: this.y });
        if (this.trail.length > this.maxTrail) this.trail.shift();

        // Physics
        this.vy += this.GRAVITY * dt;
        this.vx += this.wind * this.WIND_SCALE * dt;
        this.x += this.vx * dt;
        this.y += this.vy * dt;

        // Out of bounds
        if (this.x < -50 || this.x > terrain.W + 50 || this.y > terrain.H + 50) {
            this.alive = false;
            this.gfx.destroy();
            return 'miss';
        }

        // Terrain collision
        if (this.y > 0 && terrain.isSolid(this.x, this.y)) {
            return this.onHitTerrain(terrain, figures);
        }

        // Figure collision
        for (const fig of figures) {
            if (!fig.alive) continue;
            const dx = this.x - fig.x;
            const dy = this.y - (fig.y - 10);
            if (Math.abs(dx) < 8 && Math.abs(dy) < 14) {
                return this.onHitTerrain(terrain, figures); // explode on figure too
            }
        }

        this.draw();
        return null;
    }

    onHitTerrain(terrain, figures) {
        // Explode
        if (this.destroysTerrain && this.blastRadius > 0) {
            terrain.explode(this.x, this.y, this.blastRadius);
        }

        // Damage figures
        this._damageNearby(figures);

        // Explosion visual
        this._showExplosion();

        this.alive = false;
        this.gfx.destroy();
        return 'hit';
    }

    _damageNearby(figures) {
        for (const fig of figures) {
            if (!fig.alive) continue;
            const dx = fig.x - this.x;
            const dy = (fig.y - 10) - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < this.blastRadius) {
                const dmg = this.damage * (1 - dist / this.blastRadius);
                fig.takeDamage(dmg);
                fig.applyExplosionForce(this.x, this.y, this.blastRadius);
            }
        }
    }

    _showExplosion() {
        const scene = this.scene;
        const cx = this.x, cy = this.y;
        const r = this.blastRadius;

        // Create explosion circle that expands and fades
        const explosionGfx = scene.add.graphics();
        explosionGfx.setDepth(25);

        let t = 0;
        const timer = scene.time.addEvent({
            delay: 16,
            repeat: 20,
            callback: () => {
                t += 0.05;
                explosionGfx.clear();

                // Outer fireball
                const alpha = 1 - t;
                const currentR = r * (0.3 + t * 0.7);
                explosionGfx.fillStyle(0xff6600, alpha * 0.6);
                explosionGfx.fillCircle(cx, cy, currentR);
                explosionGfx.fillStyle(0xffcc00, alpha * 0.4);
                explosionGfx.fillCircle(cx, cy, currentR * 0.6);
                explosionGfx.fillStyle(0xffffff, alpha * 0.3);
                explosionGfx.fillCircle(cx, cy, currentR * 0.3);

                if (t >= 1) {
                    explosionGfx.destroy();
                }
            }
        });
    }

    draw() {
        const gfx = this.gfx;
        gfx.clear();

        // Trail
        for (let i = 0; i < this.trail.length; i++) {
            const alpha = i / this.trail.length * 0.5;
            const size = this.size * (i / this.trail.length) * 0.6;
            gfx.fillStyle(this.color, alpha);
            gfx.fillCircle(this.trail[i].x, this.trail[i].y, size);
        }

        // Projectile body
        gfx.fillStyle(this.color, 1);
        gfx.fillCircle(this.x, this.y, this.size);
        gfx.fillStyle(0xffcc00, 0.8);
        gfx.fillCircle(this.x, this.y, this.size * 0.5);
    }

    destroy() {
        if (this.gfx) this.gfx.destroy();
    }
}
