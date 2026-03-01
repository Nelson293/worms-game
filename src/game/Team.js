import { Figure } from './Figure.js';
import { WEAPONS } from './WeaponSystem.js';

export class Team {
    constructor(scene, config, terrain) {
        this.scene = scene;
        this.name = config.name;
        this.color = config.color;
        this.figures = [];

        // Initialize ammo from weapon defaults
        this.ammo = {};
        for (const [key, weapon] of Object.entries(WEAPONS)) {
            this.ammo[key] = weapon.ammo;
        }

        // Spawn figures on terrain
        this._spawnFigures(config.figureCount, terrain, config.spawnZoneStart, config.spawnZoneEnd);
    }

    _spawnFigures(count, terrain, zoneStart, zoneEnd) {
        const spacing = (zoneEnd - zoneStart) / (count + 1);
        for (let i = 0; i < count; i++) {
            const x = Math.floor(zoneStart + spacing * (i + 1));
            const y = terrain.getSurfaceY(x);
            const figure = new Figure(this.scene, x, y, this, i);
            this.figures.push(figure);
        }
    }

    get aliveFigures() {
        return this.figures.filter(f => f.alive);
    }

    get isEliminated() {
        return this.aliveFigures.length === 0;
    }

    getAmmo(weaponKey) {
        return this.ammo[weaponKey] ?? 0;
    }

    useAmmo(weaponKey) {
        if (this.ammo[weaponKey] !== Infinity) {
            this.ammo[weaponKey] = Math.max(0, this.ammo[weaponKey] - 1);
        }
    }

    onFigureDied(figure) {
        // Could trigger events here
        this.scene.events.emit('figure-died', figure, this);
    }

    update(dt, terrain) {
        for (const figure of this.figures) {
            figure.update(dt, terrain);
        }
    }

    destroy() {
        for (const figure of this.figures) {
            figure.destroy();
        }
    }
}
