import { SFX } from './SFX.js';

export class Figure {
    constructor(scene, x, y, team, index) {
        this.scene = scene;
        this.x = x;
        this.y = y;
        this.team = team;
        this.index = index;
        this.hp = 100;
        this.maxHp = 100;
        this.alive = true;
        this.vy = 0;
        this.vx = 0;
        this.isActive = false;
        this.aimAngle = -Math.PI / 4;
        this.facingRight = true;
        this.damageFlash = 0;
        this.deathTimer = 0;
        this.walkCycle = 0;
        this.idleBob = Math.random() * Math.PI * 2;
        this.grounded = false;

        this.gfx = scene.add.graphics();
        this.gfx.setDepth(10);

        this.nameText = scene.add.text(x, y - 44, `${team.name} #${index + 1}`, {
            fontSize: '9px',
            fontFamily: 'Exo 2, sans-serif',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3,
        }).setOrigin(0.5, 1).setDepth(11);

        this.hpBarGfx = scene.add.graphics();
        this.hpBarGfx.setDepth(11);
    }

    update(dt, terrain) {
        if (!this.alive) {
            this.deathTimer -= dt;
            if (this.deathTimer <= 0) {
                this.gfx.setVisible(false);
                this.nameText.setVisible(false);
                this.hpBarGfx.setVisible(false);
            }
            return;
        }

        this.idleBob += dt * 2;

        // Gravity
        if (!terrain.isSolid(this.x, this.y + 1)) {
            this.vy += 500 * dt;
            this.grounded = false;
        } else {
            if (this.vy > 350) {
                const fallDamage = Math.floor((this.vy - 350) * 0.1);
                this.takeDamage(fallDamage);
                SFX.hit();
            }
            this.vy = 0;
            this.grounded = true;
            let safety = 0;
            while (terrain.isSolid(this.x, this.y - 1) && safety < 20) {
                this.y--;
                safety++;
            }
        }

        this.y += this.vy * dt;
        this.x += this.vx * dt;
        this.vx *= 0.9;
        this.x = Math.max(10, Math.min(terrain.W - 10, this.x));

        if (this.y >= terrain.H - 25) {
            SFX.splash();
            this.takeDamage(this.hp);
        }

        if (this.damageFlash > 0) this.damageFlash -= dt;
        this.draw();
    }

    takeDamage(amount) {
        if (!this.alive || amount <= 0) return;
        const dmg = Math.round(amount);
        this.hp = Math.max(0, this.hp - dmg);
        this.damageFlash = 0.4;

        if (this.scene.effects) {
            this.scene.effects.showDamage(this.x, this.y - 30, dmg);
        }
        if (this.hp <= 0) this.die();
    }

    die() {
        this.alive = false;
        this.deathTimer = 1.5;
        SFX.death();
        this.team.onFigureDied(this);
        if (this.scene.effects) {
            this.scene.effects.showKill(null, this.team, this.index);
        }
    }

    applyExplosionForce(cx, cy, radius) {
        const dx = this.x - cx;
        const dy = this.y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < radius && dist > 0) {
            const force = (1 - dist / radius) * 250;
            this.vx += (dx / dist) * force;
            this.vy = -(force * 1.2);
        }
    }

    draw() {
        const gfx = this.gfx;
        gfx.clear();

        if (!this.alive) {
            gfx.setAlpha(Math.max(0, this.deathTimer / 1.5));
            this._drawBody(gfx, this.x, this.y, true);
            this.nameText.setVisible(false);
            this.hpBarGfx.clear();
            return;
        }

        gfx.setAlpha(1);
        const flash = this.damageFlash > 0 && Math.floor(this.damageFlash * 15) % 2 === 0;
        this._drawBody(gfx, this.x, this.y, false, flash);

        if (this.isActive) {
            const bobY = Math.sin(Date.now() * 0.006) * 3;
            gfx.fillStyle(0xffffff, 0.9);
            gfx.fillTriangle(
                this.x, this.y - 32 + bobY,
                this.x - 5, this.y - 39 + bobY,
                this.x + 5, this.y - 39 + bobY
            );

            const aimLen = 35;
            const dir = this.facingRight ? 1 : -1;
            const aimX = this.x + Math.cos(this.aimAngle) * aimLen * dir;
            const aimY = this.y - 14 + Math.sin(this.aimAngle) * aimLen;

            for (let i = 1; i < 6; i++) {
                const t = i / 6;
                const px = this.x + (aimX - this.x) * t;
                const py = (this.y - 14) + (aimY - (this.y - 14)) * t;
                gfx.fillStyle(0xff4444, 0.3 + t * 0.6);
                gfx.fillCircle(px, py, 1.5);
            }

            gfx.lineStyle(1.5, 0xff4444, 0.9);
            gfx.strokeCircle(aimX, aimY, 5);
            gfx.lineBetween(aimX - 7, aimY, aimX + 7, aimY);
            gfx.lineBetween(aimX, aimY - 7, aimX, aimY + 7);
        }

        this.nameText.setPosition(this.x, this.y - 44);
        this._drawHPBar();
    }

    _drawHPBar() {
        const gfx = this.hpBarGfx;
        gfx.clear();
        if (!this.alive) return;

        const x = this.x - 14, y = this.y - 36;
        const w = 28, h = 3, pct = this.hp / this.maxHp;

        gfx.fillStyle(0x000000, 0.6);
        gfx.fillRect(x - 1, y - 1, w + 2, h + 2);

        const color = pct > 0.6 ? 0x44dd44 : pct > 0.3 ? 0xdddd44 : 0xdd4444;
        gfx.fillStyle(color, 0.9);
        gfx.fillRect(x, y, w * pct, h);
    }

    _drawBody(gfx, x, y, dead, flash) {
        const color = flash ? 0xffffff : this.team.color;
        const headColor = flash ? 0xffffff : 0xffddbb;
        const bob = dead ? 0 : Math.sin(this.idleBob) * 0.5;
        const yy = y + bob;

        gfx.fillStyle(0x000000, 0.15);
        gfx.fillEllipse(x, y + 1, 14, 4);

        gfx.lineStyle(2.5, color, 1);
        if (dead) {
            gfx.lineBetween(x, yy - 4, x - 8, yy + 3);
            gfx.lineBetween(x, yy - 4, x + 8, yy + 3);
        } else {
            const la = this.isActive ? Math.sin(this.walkCycle) * 2 : 0;
            gfx.lineBetween(x, yy - 4, x - 5 + la, yy);
            gfx.lineBetween(x, yy - 4, x + 5 - la, yy);
            gfx.lineStyle(2, color, 0.8);
            gfx.lineBetween(x - 5 + la, yy, x - 3 + la, yy);
            gfx.lineBetween(x + 5 - la, yy, x + 7 - la, yy);
        }

        gfx.lineStyle(3, color, 1);
        gfx.lineBetween(x, yy - 15, x, yy - 4);

        gfx.lineStyle(2.5, color, 1);
        if (this.isActive && !dead) {
            const dir = this.facingRight ? 1 : -1;
            const armX = Math.cos(this.aimAngle) * 9 * dir;
            const armY = Math.sin(this.aimAngle) * 9;
            gfx.lineBetween(x, yy - 12, x + armX, yy - 12 + armY);
            gfx.lineBetween(x, yy - 12, x - dir * 5, yy - 9);
        } else if (!dead) {
            const ab = Math.sin(this.idleBob * 0.7);
            gfx.lineBetween(x - 7, yy - 12 + ab, x + 7, yy - 12 - ab);
        } else {
            gfx.lineBetween(x, yy - 12, x - 9, yy - 6);
            gfx.lineBetween(x, yy - 12, x + 9, yy - 6);
        }

        gfx.fillStyle(headColor, 1);
        gfx.fillCircle(x, yy - 19, 5.5);
        gfx.lineStyle(1.5, color, 1);
        gfx.strokeCircle(x, yy - 19, 5.5);

        if (!dead) {
            const ed = this.facingRight ? 1 : -1;
            gfx.fillStyle(0x000000, 1);
            gfx.fillCircle(x + 1.5 * ed, yy - 20, 1.2);
            gfx.fillCircle(x + 4 * ed, yy - 20, 1.2);
            if (this.damageFlash > 0) {
                gfx.fillCircle(x + 2 * ed, yy - 17, 1.5);
            } else {
                gfx.lineStyle(1, 0x000000, 0.5);
                gfx.lineBetween(x + 1 * ed, yy - 17, x + 3.5 * ed, yy - 17);
            }
        } else {
            gfx.lineStyle(1.2, 0x000000, 1);
            gfx.lineBetween(x - 3, yy - 21, x - 1, yy - 19);
            gfx.lineBetween(x - 1, yy - 21, x - 3, yy - 19);
            gfx.lineBetween(x + 1, yy - 21, x + 3, yy - 19);
            gfx.lineBetween(x + 3, yy - 21, x + 1, yy - 19);
            gfx.lineStyle(1, 0xff4444, 0.8);
            gfx.lineBetween(x, yy - 17, x + 2, yy - 15);
        }
    }

    destroy() {
        this.gfx.destroy();
        this.nameText.destroy();
        this.hpBarGfx.destroy();
    }
}
