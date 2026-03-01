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

        this.gfx = scene.add.graphics();
        this.gfx.setDepth(20);
    }

    update(dt, terrain, figures) {
        if (!this.alive) return;

        this.age += dt;

        this.trail.push({ x: this.x, y: this.y });
        if (this.trail.length > this.maxTrail) this.trail.shift();

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
                return this.onHitTerrain(terrain, figures);
            }
        }

        this.draw();
        return null;
    }

    onHitTerrain(terrain, figures) {
        if (this.destroysTerrain && this.blastRadius > 0) {
            terrain.explode(this.x, this.y, this.blastRadius);
        }

        this._damageNearby(figures);

        // Use Effects system if available
        if (this.scene.effects) {
            this.scene.effects.explosionEffect(this.x, this.y, this.blastRadius);
        }

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

    draw() {
        const gfx = this.gfx;
        gfx.clear();

        // Trail
        for (let i = 0; i < this.trail.length; i++) {
            const t = i / this.trail.length;
            const size = this.size * t * 0.6;
            gfx.fillStyle(this.color, t * 0.5);
            gfx.fillCircle(this.trail[i].x, this.trail[i].y, size);
        }

        // Body
        gfx.fillStyle(this.color, 1);
        gfx.fillCircle(this.x, this.y, this.size);
        // Hot core
        gfx.fillStyle(0xffcc00, 0.8);
        gfx.fillCircle(this.x, this.y, this.size * 0.5);
    }

    destroy() {
        if (this.gfx && !this.gfx.destroyed) this.gfx.destroy();
    }
}
