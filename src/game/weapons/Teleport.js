export class TeleportAction {
    constructor(scene, figure, terrain) {
        this.scene = scene;
        this.figure = figure;
        this.terrain = terrain;
        this.alive = true;
        this.phase = 'targeting'; // 'targeting' | 'animating' | 'done'
        this.targetX = 0;
        this.targetY = 0;

        // Crosshair graphics
        this.crosshair = scene.add.graphics();
        this.crosshair.setDepth(30);

        // Listen for click
        this._clickHandler = (pointer) => {
            if (this.phase !== 'targeting') return;
            const worldPoint = scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
            this.targetX = worldPoint.x;
            this.targetY = worldPoint.y;

            // Don't teleport into solid terrain
            if (terrain.isSolid(this.targetX, this.targetY)) {
                // Find surface above
                let surfY = this.targetY;
                while (surfY > 0 && terrain.isSolid(this.targetX, surfY)) {
                    surfY--;
                }
                this.targetY = surfY;
            }

            this.phase = 'animating';
            this._animate();
        };
        scene.input.on('pointerdown', this._clickHandler);
    }

    update(dt) {
        if (!this.alive) return null;

        if (this.phase === 'targeting') {
            // Draw crosshair at mouse position
            const pointer = this.scene.input.activePointer;
            const worldPoint = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
            this._drawCrosshair(worldPoint.x, worldPoint.y);
            return null;
        }

        if (this.phase === 'done') {
            this.alive = false;
            this.crosshair.destroy();
            this.scene.input.off('pointerdown', this._clickHandler);
            return 'hit';
        }

        return null;
    }

    _animate() {
        const fig = this.figure;
        this.crosshair.clear();

        // Disappear effect at origin
        const originGfx = this.scene.add.graphics();
        originGfx.setDepth(25);

        let t = 0;
        this.scene.time.addEvent({
            delay: 16,
            repeat: 15,
            callback: () => {
                t += 0.066;
                originGfx.clear();

                // Sparkle at origin
                const alpha = 1 - t;
                for (let i = 0; i < 5; i++) {
                    const angle = (i / 5) * Math.PI * 2 + t * 10;
                    const r = 15 * t;
                    originGfx.fillStyle(0x44aaff, alpha);
                    originGfx.fillCircle(
                        fig.x + Math.cos(angle) * r,
                        fig.y - 10 + Math.sin(angle) * r,
                        2
                    );
                }

                if (t >= 0.5 && fig.x !== this.targetX) {
                    // Move figure
                    fig.x = this.targetX;
                    fig.y = this.targetY;
                    fig.vy = 0;
                }

                if (t >= 1) {
                    originGfx.destroy();
                    this.phase = 'done';
                }
            }
        });
    }

    _drawCrosshair(x, y) {
        const gfx = this.crosshair;
        gfx.clear();
        const size = 12;

        gfx.lineStyle(2, 0x44aaff, 0.8);
        gfx.strokeCircle(x, y, size);
        gfx.lineBetween(x - size - 4, y, x + size + 4, y);
        gfx.lineBetween(x, y - size - 4, x, y + size + 4);
    }

    destroy() {
        if (this.crosshair) this.crosshair.destroy();
        this.scene.input.off('pointerdown', this._clickHandler);
    }
}

export function activateTeleport(scene, figure, terrain) {
    return new TeleportAction(scene, figure, terrain);
}
