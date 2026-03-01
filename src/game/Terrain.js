const BIOMES = {
    grasslands: {
        name: 'Grasslands',
        sky: ['#87CEEB', '#c9e8f7'],
        surface: ['#4a8c3f', '#3a7c2f'],
        dirt: ['#8B6E3C', '#7a5e2c', '#6B4E2C'],
        rock: ['#5a5a5a', '#4a4a4a', '#3a3a3a'],
        grass: true,
    },
    desert: {
        name: 'Desert',
        sky: ['#f4a460', '#ffe4b5'],
        surface: ['#d2a95e', '#c49a4e'],
        dirt: ['#c4944e', '#b4843e', '#a4742e'],
        rock: ['#8B7355', '#7a6345', '#6a5335'],
        grass: false,
    },
    arctic: {
        name: 'Arctic',
        sky: ['#b0c4de', '#dce8f4'],
        surface: ['#e8e8f0', '#d8d8e4'],
        dirt: ['#c0c0d0', '#a8a8b8', '#9090a0'],
        rock: ['#7888a0', '#687890', '#586880'],
        grass: false,
    },
    volcanic: {
        name: 'Volcanic',
        sky: ['#2a1a1a', '#4a2a20'],
        surface: ['#3a3a3a', '#2a2a2a'],
        dirt: ['#4a3a2a', '#3a2a1a', '#2a1a0a'],
        rock: ['#1a1a1a', '#2a2020', '#3a2020'],
        grass: false,
    },
    candy: {
        name: 'Candyland',
        sky: ['#ffb6c1', '#ffe4e8'],
        surface: ['#ff88aa', '#ff6699'],
        dirt: ['#cc66aa', '#bb5599', '#aa4488'],
        rock: ['#884488', '#773377', '#662266'],
        grass: false,
    },
};

const BIOME_KEYS = Object.keys(BIOMES);

export class Terrain {
    constructor(scene, worldW, worldH, biomeKey = null) {
        this.scene = scene;
        this.W = worldW;
        this.H = worldH;
        this.biome = BIOMES[biomeKey || BIOME_KEYS[Math.floor(Math.random() * BIOME_KEYS.length)]];
        this.biomeName = this.biome.name;

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
        const biome = this.biome;

        ctx.clearRect(0, 0, W, H);

        // Generate heightmap with layered sine waves
        this.heights = new Float32Array(W);
        const baseY = H * 0.48;
        const seed = Math.random() * 100;

        for (let x = 0; x < W; x++) {
            this.heights[x] = baseY
                + Math.sin((x + seed) * 0.006) * 90
                + Math.sin((x + seed) * 0.018 + 1.2) * 50
                + Math.sin((x + seed) * 0.045 + 2.7) * 25
                + Math.sin((x + seed) * 0.1 + 0.5) * 12
                + Math.sin((x + seed) * 0.25 + 3.1) * 6;

            // Create some flat areas for figures to stand
            if (Math.sin((x + seed) * 0.015) > 0.7) {
                // Plateau - flatten the terrain
                const plateauY = baseY + Math.sin((x + seed) * 0.006) * 90;
                this.heights[x] = this.heights[x] * 0.3 + plateauY * 0.7;
            }
        }

        // Smooth the heightmap
        const smoothed = new Float32Array(W);
        for (let x = 0; x < W; x++) {
            let sum = 0, count = 0;
            for (let dx = -3; dx <= 3; dx++) {
                const sx = x + dx;
                if (sx >= 0 && sx < W) {
                    sum += this.heights[sx];
                    count++;
                }
            }
            smoothed[x] = sum / count;
        }
        this.heights = smoothed;

        // Draw terrain column by column
        for (let x = 0; x < W; x++) {
            const surfaceY = Math.floor(this.heights[x]);
            const depth = H - surfaceY;

            // Surface layer
            const surfIdx = (x * 7) % biome.surface.length;
            ctx.fillStyle = biome.surface[surfIdx < biome.surface.length ? surfIdx : 0];
            const surfaceThickness = biome.grass ? 6 : 4;
            ctx.fillRect(x, surfaceY, 1, surfaceThickness);

            // Grass detail - tiny blades
            if (biome.grass && x % 3 === 0) {
                ctx.fillStyle = '#5aac4f';
                ctx.fillRect(x, surfaceY - 1, 1, 2);
            }

            // Sub-surface edge
            ctx.fillStyle = biome.surface[1] || biome.surface[0];
            ctx.fillRect(x, surfaceY + surfaceThickness, 1, 3);

            // Dirt layers
            const dirtStart = surfaceY + surfaceThickness + 3;
            const dirtDepth = Math.min(50, depth * 0.4);
            for (let d = 0; d < biome.dirt.length; d++) {
                const layerH = dirtDepth / biome.dirt.length;
                ctx.fillStyle = biome.dirt[d];
                ctx.fillRect(x, dirtStart + d * layerH, 1, layerH + 1);
            }

            // Rock layer
            const rockStart = dirtStart + dirtDepth;
            const rockH = H - rockStart;
            if (rockH > 0) {
                const rockIdx = (x * 13 + Math.floor(rockStart * 7)) % biome.rock.length;
                ctx.fillStyle = biome.rock[rockIdx < biome.rock.length ? rockIdx : 0];
                ctx.fillRect(x, rockStart, 1, rockH);
            }

            // Random stone/ore details in rock
            if (Math.random() < 0.02 && rockH > 10) {
                ctx.fillStyle = 'rgba(255,255,255,0.06)';
                const stoneY = rockStart + Math.random() * (rockH - 5);
                ctx.fillRect(x, stoneY, 2, 2);
            }
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

        // Erase circle
        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';

        // Scorched edge around crater
        ctx.strokeStyle = 'rgba(40, 25, 10, 0.7)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.stroke();

        // Inner scorch
        ctx.strokeStyle = 'rgba(80, 50, 20, 0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx, cy, radius - 2, 0, Math.PI * 2);
        ctx.stroke();

        // Update solid map in affected area
        const margin = 4;
        const x0 = Math.max(0, Math.floor(cx - radius - margin));
        const x1 = Math.min(this.W - 1, Math.ceil(cx + radius + margin));
        const y0 = Math.max(0, Math.floor(cy - radius - margin));
        const y1 = Math.min(this.H - 1, Math.ceil(cy + radius + margin));

        const patchW = x1 - x0 + 1;
        const patch = this.ctx.getImageData(x0, y0, patchW, y1 - y0 + 1).data;

        for (let py = y0; py <= y1; py++) {
            for (let px = x0; px <= x1; px++) {
                const localI = (py - y0) * patchW + (px - x0);
                this.solidMap[py * this.W + px] = patch[localI * 4 + 3] > 10 ? 1 : 0;
            }
        }

        this._syncToPhaser();
        this.image.setTexture('terrain');

        return this.biome; // return biome for debris colors
    }

    // Earthquake: shift terrain down in spots
    earthquakeDeform(intensity = 20) {
        const ctx = this.ctx;
        const strip = ctx.getImageData(0, 0, this.W, this.H);

        // Shift random columns down
        for (let x = 0; x < this.W; x++) {
            const shift = Math.floor(Math.random() * intensity * (0.5 + Math.sin(x * 0.05) * 0.5));
            if (shift <= 0) continue;
            // Shift pixels down
            for (let y = this.H - 1; y >= shift; y--) {
                const destIdx = (y * this.W + x) * 4;
                const srcIdx = ((y - shift) * this.W + x) * 4;
                strip.data[destIdx] = strip.data[srcIdx];
                strip.data[destIdx + 1] = strip.data[srcIdx + 1];
                strip.data[destIdx + 2] = strip.data[srcIdx + 2];
                strip.data[destIdx + 3] = strip.data[srcIdx + 3];
            }
            // Clear top
            for (let y = 0; y < shift; y++) {
                const idx = (y * this.W + x) * 4;
                strip.data[idx + 3] = 0;
            }
        }

        ctx.putImageData(strip, 0, 0);
        this._bakeSolidMap();
        this._syncToPhaser();
        this.image.setTexture('terrain');
    }

    destroy() {
        if (this.image) this.image.destroy();
    }
}

export { BIOMES, BIOME_KEYS };
