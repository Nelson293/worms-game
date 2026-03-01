export class Terrain {
    constructor(scene, worldW, worldH) {
        this.scene = scene;
        this.W = worldW;
        this.H = worldH;

        // Off-screen canvas for terrain data
        this.canvas = document.createElement('canvas');
        this.canvas.width = worldW;
        this.canvas.height = worldH;
        this.ctx = this.canvas.getContext('2d');

        // Phaser texture from this canvas
        if (scene.textures.exists('terrain')) {
            scene.textures.remove('terrain');
        }
        this.texture = scene.textures.createCanvas('terrain', worldW, worldH);

        this._generate();
        this._bakeSolidMap();
        this._syncToPhaser();

        // Display image
        this.image = scene.add.image(0, 0, 'terrain').setOrigin(0, 0);
        this.image.setDepth(1);
    }

    _generate() {
        const ctx = this.ctx;
        const W = this.W, H = this.H;

        ctx.clearRect(0, 0, W, H);

        // Generate heightmap with layered sine waves
        this.heights = new Float32Array(W);
        const baseY = H * 0.5;
        const seed = Math.random() * 100;

        for (let x = 0; x < W; x++) {
            this.heights[x] = baseY
                + Math.sin((x + seed) * 0.008) * 80
                + Math.sin((x + seed) * 0.023 + 1.2) * 40
                + Math.sin((x + seed) * 0.057 + 2.7) * 20
                + Math.sin((x + seed) * 0.13 + 0.5) * 10
                + Math.sin((x + seed) * 0.31 + 3.1) * 5;
        }

        // Draw terrain
        for (let x = 0; x < W; x++) {
            const surfaceY = Math.floor(this.heights[x]);

            // Grass layer (green top)
            ctx.fillStyle = '#4a8c3f';
            ctx.fillRect(x, surfaceY, 1, 6);

            // Dark grass edge
            ctx.fillStyle = '#3a6c2f';
            ctx.fillRect(x, surfaceY + 6, 1, 3);

            // Dirt layer
            ctx.fillStyle = '#8B6E3C';
            ctx.fillRect(x, surfaceY + 9, 1, 30);

            // Darker dirt
            ctx.fillStyle = '#6B4E2C';
            ctx.fillRect(x, surfaceY + 39, 1, 30);

            // Rock layer
            ctx.fillStyle = '#5a5a5a';
            ctx.fillRect(x, surfaceY + 69, 1, H - surfaceY - 69);
        }
    }

    _bakeSolidMap() {
        const data = this.ctx.getImageData(0, 0, this.W, this.H).data;
        this.solidMap = new Uint8Array(this.W * this.H);
        for (let i = 0; i < this.W * this.H; i++) {
            this.solidMap[i] = data[i * 4 + 3] > 10 ? 1 : 0;
        }
    }

    _syncToPhaser() {
        const destCtx = this.texture.getContext();
        destCtx.clearRect(0, 0, this.W, this.H);
        destCtx.drawImage(this.canvas, 0, 0);
        this.texture.refresh();
    }

    isSolid(x, y) {
        const ix = Math.floor(x), iy = Math.floor(y);
        if (ix < 0 || ix >= this.W || iy < 0 || iy >= this.H) return false;
        return this.solidMap[iy * this.W + ix] === 1;
    }

    // Find the surface Y at a given X (topmost solid pixel)
    getSurfaceY(x) {
        const ix = Math.floor(x);
        if (ix < 0 || ix >= this.W) return this.H;
        for (let y = 0; y < this.H; y++) {
            if (this.solidMap[y * this.W + ix] === 1) return y;
        }
        return this.H;
    }

    explode(cx, cy, radius) {
        const ctx = this.ctx;

        // Erase circle from off-screen canvas
        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';

        // Draw a dark edge around the crater for visual effect
        ctx.strokeStyle = 'rgba(60, 40, 20, 0.6)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.stroke();

        // Update solid map in affected area only
        const x0 = Math.max(0, Math.floor(cx - radius - 2));
        const x1 = Math.min(this.W - 1, Math.ceil(cx + radius + 2));
        const y0 = Math.max(0, Math.floor(cy - radius - 2));
        const y1 = Math.min(this.H - 1, Math.ceil(cy + radius + 2));

        const patchW = x1 - x0 + 1;
        const patchH = y1 - y0 + 1;
        const patch = this.ctx.getImageData(x0, y0, patchW, patchH).data;

        for (let py = y0; py <= y1; py++) {
            for (let px = x0; px <= x1; px++) {
                const localI = (py - y0) * patchW + (px - x0);
                this.solidMap[py * this.W + px] = patch[localI * 4 + 3] > 10 ? 1 : 0;
            }
        }

        this._syncToPhaser();
        this.image.setTexture('terrain');
    }

    destroy() {
        if (this.image) this.image.destroy();
    }
}
