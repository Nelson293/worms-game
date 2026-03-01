export class ShotgunBlast {
    constructor(scene, figure) {
        this.scene = scene;
        this.alive = true;
        this.figure = figure;
        this.age = 0;

        const dir = figure.facingRight ? 1 : -1;
        const baseAngle = figure.aimAngle * dir;

        // 6 pellets with spread
        this.pellets = [];
        for (let i = 0; i < 6; i++) {
            const spread = (Math.random() - 0.5) * 0.5; // ±15 degrees
            const angle = baseAngle + spread;
            const speed = 600 + Math.random() * 100;
            this.pellets.push({
                x: figure.x + Math.cos(baseAngle) * 10,
                y: figure.y - 14 + Math.sin(baseAngle) * 10,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                alive: true,
                dist: 0,
            });
        }

        this.gfx = scene.add.graphics();
        this.gfx.setDepth(20);
        this.damagePerPellet = 15;
        this.maxRange = 250;
    }

    update(dt, terrain, figures) {
        if (!this.alive) return null;

        this.age += dt;
        let anyAlive = false;

        for (const p of this.pellets) {
            if (!p.alive) continue;

            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.dist += Math.sqrt((p.vx * dt) ** 2 + (p.vy * dt) ** 2);

            // Max range
            if (p.dist > this.maxRange) {
                p.alive = false;
                continue;
            }

            // Terrain hit - pellets stop but don't destroy terrain
            if (terrain.isSolid(p.x, p.y)) {
                p.alive = false;
                continue;
            }

            // Figure hit
            for (const fig of figures) {
                if (!fig.alive || fig === this.figure) continue;
                const dx = p.x - fig.x;
                const dy = p.y - (fig.y - 10);
                if (Math.abs(dx) < 8 && Math.abs(dy) < 14) {
                    fig.takeDamage(this.damagePerPellet);
                    // Small knockback
                    fig.x += (dx > 0 ? 1 : -1) * 5;
                    fig.vy = -50;
                    p.alive = false;
                    break;
                }
            }

            if (p.alive) anyAlive = true;
        }

        if (!anyAlive) {
            this.alive = false;
            this.gfx.destroy();
            return 'hit';
        }

        this.draw();
        return null;
    }

    draw() {
        const gfx = this.gfx;
        gfx.clear();
        for (const p of this.pellets) {
            if (!p.alive) continue;
            gfx.fillStyle(0xffdd44, 0.8);
            gfx.fillCircle(p.x, p.y, 2);
        }
    }

    destroy() {
        if (this.gfx) this.gfx.destroy();
    }
}

export function fireShotgun(scene, figure) {
    return new ShotgunBlast(scene, figure);
}
