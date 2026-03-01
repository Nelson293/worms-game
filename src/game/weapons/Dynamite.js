export class DynamiteItem {
    constructor(scene, x, y, terrain, figures) {
        this.scene = scene;
        this.x = x;
        this.y = y;
        this.terrain = terrain;
        this.figures = figures;
        this.alive = true;
        this.fuseTimer = 5.0;
        this.damage = 80;
        this.blastRadius = 80;

        this.gfx = scene.add.graphics();
        this.gfx.setDepth(15);

        this.timerText = scene.add.text(x, y - 18, '5', {
            fontSize: '12px',
            color: '#ff2222',
            stroke: '#000000',
            strokeThickness: 3,
            fontStyle: 'bold',
        }).setOrigin(0.5).setDepth(16);
    }

    update(dt) {
        if (!this.alive) return null;

        this.fuseTimer -= dt;
        this.timerText.setText(Math.ceil(this.fuseTimer).toString());

        // Apply gravity
        if (!this.terrain.isSolid(this.x, this.y + 1)) {
            this.y += 100 * dt;
        }

        // Update positions
        this.timerText.setPosition(this.x, this.y - 18);

        this.draw();

        if (this.fuseTimer <= 0) {
            return this.explode();
        }

        return null;
    }

    explode() {
        // Terrain destruction
        this.terrain.explode(this.x, this.y, this.blastRadius);

        // Damage figures
        for (const fig of this.figures) {
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

        // Explosion visual
        this._showExplosion();

        this.alive = false;
        this.gfx.destroy();
        this.timerText.destroy();
        return 'hit';
    }

    _showExplosion() {
        const scene = this.scene;
        const cx = this.x, cy = this.y, r = this.blastRadius;
        const gfx = scene.add.graphics();
        gfx.setDepth(25);

        let t = 0;
        scene.time.addEvent({
            delay: 16,
            repeat: 25,
            callback: () => {
                t += 0.04;
                gfx.clear();
                const alpha = 1 - t;
                const cr = r * (0.3 + t * 0.7);
                gfx.fillStyle(0xff4400, alpha * 0.6);
                gfx.fillCircle(cx, cy, cr);
                gfx.fillStyle(0xffaa00, alpha * 0.4);
                gfx.fillCircle(cx, cy, cr * 0.6);
                gfx.fillStyle(0xffffff, alpha * 0.3);
                gfx.fillCircle(cx, cy, cr * 0.3);
                if (t >= 1) gfx.destroy();
            }
        });
    }

    draw() {
        const gfx = this.gfx;
        gfx.clear();

        // Dynamite stick
        gfx.fillStyle(0xcc2222, 1);
        gfx.fillRect(this.x - 3, this.y - 10, 6, 12);

        // Fuse spark
        const sparkPhase = (Date.now() % 200) / 200;
        if (sparkPhase < 0.5) {
            gfx.fillStyle(0xffff00, 1);
            gfx.fillCircle(this.x, this.y - 12, 2);
        }

        // Label
        gfx.fillStyle(0xffffff, 0.8);
        gfx.fillRect(this.x - 2, this.y - 7, 4, 2);
    }

    destroy() {
        if (this.gfx) this.gfx.destroy();
        if (this.timerText) this.timerText.destroy();
    }
}

export function placeDynamite(scene, figure, terrain, figures) {
    return new DynamiteItem(scene, figure.x, figure.y - 2, terrain, figures);
}
