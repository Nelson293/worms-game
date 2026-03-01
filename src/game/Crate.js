import { SFX } from './SFX.js';

const CRATE_TYPES = [
    { type: 'health',    label: '+HP',       color: 0x44dd44, effect: (fig, team) => { fig.hp = Math.min(fig.maxHp, fig.hp + 30); } },
    { type: 'grenade',   label: '+Grenade',  color: 0x44aa44, effect: (fig, team) => { team.ammo.grenade = (team.ammo.grenade || 0) + 2; } },
    { type: 'airstrike', label: '+Airstrike',color: 0x888888, effect: (fig, team) => { team.ammo.airstrike = (team.ammo.airstrike || 0) + 1; } },
    { type: 'dynamite',  label: '+Dynamite', color: 0xcc2222, effect: (fig, team) => { team.ammo.dynamite = (team.ammo.dynamite || 0) + 1; } },
    { type: 'teleport',  label: '+Teleport', color: 0x44aaff, effect: (fig, team) => { team.ammo.teleport = (team.ammo.teleport || 0) + 1; } },
    { type: 'shotgun',   label: '+Shotgun',  color: 0xffaa00, effect: (fig, team) => { team.ammo.shotgun = (team.ammo.shotgun || 0) + 2; } },
    { type: 'doubleDmg', label: '2x DMG',    color: 0xff4444, effect: (fig, team) => { /* handled in GameScene */ } },
];

export class Crate {
    constructor(scene, x, terrain) {
        this.scene = scene;
        this.terrain = terrain;
        this.x = x;
        this.y = -20;
        this.vy = 0;
        this.alive = true;
        this.landed = false;
        this.bobPhase = Math.random() * Math.PI * 2;

        // Pick random type
        const typeInfo = CRATE_TYPES[Math.floor(Math.random() * CRATE_TYPES.length)];
        this.crateType = typeInfo.type;
        this.label = typeInfo.label;
        this.color = typeInfo.color;
        this.effectFn = typeInfo.effect;

        this.gfx = scene.add.graphics();
        this.gfx.setDepth(8);

        this.labelText = scene.add.text(x, this.y - 14, this.label, {
            fontSize: '8px',
            fontFamily: 'Exo 2, sans-serif',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 2,
        }).setOrigin(0.5).setDepth(9);

        // Parachute
        this.parachuteGfx = scene.add.graphics();
        this.parachuteGfx.setDepth(8);
    }

    update(dt, figures) {
        if (!this.alive) return;

        this.bobPhase += dt * 3;

        if (!this.landed) {
            // Fall with parachute
            this.vy = Math.min(this.vy + 60 * dt, 40);
            this.y += this.vy * dt;

            // Land on terrain
            if (this.terrain.isSolid(this.x, this.y + 8)) {
                this.landed = true;
                this.vy = 0;
                while (this.terrain.isSolid(this.x, this.y + 7)) {
                    this.y--;
                }
                this.parachuteGfx.destroy();
            }

            // Water
            if (this.y > this.terrain.H - 25) {
                this.alive = false;
                this.gfx.destroy();
                this.labelText.destroy();
                this.parachuteGfx.destroy();
                return;
            }
        }

        // Check figure pickup
        for (const fig of figures) {
            if (!fig.alive) continue;
            const dx = Math.abs(fig.x - this.x);
            const dy = Math.abs(fig.y - this.y);
            if (dx < 15 && dy < 20) {
                this.pickup(fig);
                return;
            }
        }

        this.draw();
    }

    pickup(figure) {
        this.effectFn(figure, figure.team);
        SFX.cratePickup();
        this.alive = false;

        // Pickup flash
        const flash = this.scene.add.text(this.x, this.y - 10, this.label, {
            fontSize: '14px',
            fontFamily: 'Russo One, sans-serif',
            color: '#' + this.color.toString(16).padStart(6, '0'),
            stroke: '#000000',
            strokeThickness: 3,
        }).setOrigin(0.5).setDepth(50);

        this.scene.tweens.add({
            targets: flash,
            y: this.y - 40,
            alpha: 0,
            scale: 1.5,
            duration: 800,
            onComplete: () => flash.destroy(),
        });

        this.gfx.destroy();
        this.labelText.destroy();
        if (this.parachuteGfx && !this.parachuteGfx.destroyed) {
            this.parachuteGfx.destroy();
        }

        this.scene.events.emit('crate-picked', { type: this.crateType, figure });
    }

    draw() {
        const gfx = this.gfx;
        gfx.clear();

        const bob = this.landed ? Math.sin(this.bobPhase) * 1 : 0;
        const y = this.y + bob;

        // Crate box
        gfx.fillStyle(this.color, 0.9);
        gfx.fillRect(this.x - 8, y - 4, 16, 12);

        // Highlight
        gfx.fillStyle(0xffffff, 0.2);
        gfx.fillRect(this.x - 7, y - 3, 14, 3);

        // Border
        gfx.lineStyle(1.5, 0xffffff, 0.4);
        gfx.strokeRect(this.x - 8, y - 4, 16, 12);

        // Cross pattern
        gfx.lineStyle(1, 0xffffff, 0.3);
        gfx.lineBetween(this.x, y - 4, this.x, y + 8);
        gfx.lineBetween(this.x - 8, y + 2, this.x + 8, y + 2);

        // Glow
        gfx.fillStyle(this.color, 0.1 + Math.sin(this.bobPhase * 2) * 0.05);
        gfx.fillCircle(this.x, y + 2, 18);

        this.labelText.setPosition(this.x, y - 14);

        // Parachute
        if (!this.landed && this.parachuteGfx) {
            const pg = this.parachuteGfx;
            pg.clear();
            pg.fillStyle(0xffffff, 0.6);
            pg.fillTriangle(this.x - 16, y - 20, this.x + 16, y - 20, this.x, y - 35);
            pg.lineStyle(1, 0xaaaaaa, 0.5);
            pg.lineBetween(this.x - 8, y - 4, this.x - 14, y - 20);
            pg.lineBetween(this.x + 8, y - 4, this.x + 14, y - 20);
        }
    }

    destroy() {
        if (this.gfx && !this.gfx.destroyed) this.gfx.destroy();
        if (this.labelText && !this.labelText.destroyed) this.labelText.destroy();
        if (this.parachuteGfx && !this.parachuteGfx.destroyed) this.parachuteGfx.destroy();
    }
}
