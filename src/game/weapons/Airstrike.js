import { Projectile } from '../Projectile.js';

class AirstrikeBomb extends Projectile {
    constructor(scene, x, y) {
        super(scene, x, y, Math.PI / 2, 0, 0, {
            damage: 40,
            blastRadius: 40,
            color: 0x444444,
            size: 4,
            maxTrail: 8,
            gravity: 400,
            windScale: 0, // bombs fall straight
        });
    }
}

export class AirstrikeController {
    constructor(scene, targetX, terrain, figures) {
        this.scene = scene;
        this.alive = true;
        this.bombs = [];
        this.terrain = terrain;
        this.figures = figures;
        this.bombsToSpawn = 5;
        this.spawnTimer = 0;
        this.spawnInterval = 0.15;
        this.targetX = targetX;
        this.bombIndex = 0;
        this.allDone = false;

        // Plane graphic
        this.planeGfx = scene.add.graphics();
        this.planeGfx.setDepth(30);
        this.planeX = -50;
        this.planeY = 30;
        this.planeDir = targetX > terrain.W / 2 ? 1 : -1;
        if (this.planeDir < 0) this.planeX = terrain.W + 50;
    }

    update(dt) {
        if (!this.alive) return null;

        // Move plane
        this.planeX += this.planeDir * 300 * dt;
        this._drawPlane();

        // Spawn bombs when plane is near target
        this.spawnTimer -= dt;
        if (this.bombIndex < this.bombsToSpawn && this.spawnTimer <= 0) {
            const distToTarget = Math.abs(this.planeX - this.targetX);
            if (distToTarget < 60) {
                const offsetX = (this.bombIndex - 2) * 25;
                const bomb = new AirstrikeBomb(this.scene, this.targetX + offsetX, this.planeY);
                this.bombs.push(bomb);
                this.bombIndex++;
                this.spawnTimer = this.spawnInterval;
            }
        }

        // Update existing bombs
        let activeBombs = 0;
        for (const bomb of this.bombs) {
            if (!bomb.alive) continue;
            const result = bomb.update(dt, this.terrain, this.figures);
            if (result) continue;
            activeBombs++;
        }

        // Check if done
        if (this.bombIndex >= this.bombsToSpawn && activeBombs === 0) {
            this.alive = false;
            this.planeGfx.destroy();
            return 'hit';
        }

        // Plane flew off screen
        if (this.planeX > this.terrain.W + 100 || this.planeX < -100) {
            if (activeBombs === 0 && this.bombIndex > 0) {
                this.alive = false;
                this.planeGfx.destroy();
                return 'hit';
            }
        }

        return null;
    }

    _drawPlane() {
        const gfx = this.planeGfx;
        gfx.clear();
        const x = this.planeX, y = this.planeY;
        const d = this.planeDir;

        // Simple plane shape
        gfx.fillStyle(0x888888, 1);
        // Fuselage
        gfx.fillRect(x - 15 * d, y - 3, 30, 6);
        // Wings
        gfx.fillTriangle(x - 5 * d, y - 3, x + 5 * d, y - 3, x, y - 12);
        // Tail
        gfx.fillTriangle(x - 15 * d, y - 3, x - 15 * d, y - 10, x - 10 * d, y - 3);
    }

    destroy() {
        this.planeGfx.destroy();
        for (const b of this.bombs) b.destroy();
    }
}

export function fireAirstrike(scene, targetX, terrain, figures) {
    return new AirstrikeController(scene, targetX, terrain, figures);
}
