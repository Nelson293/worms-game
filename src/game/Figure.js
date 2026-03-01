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
        this.isActive = false;
        this.aimAngle = -Math.PI / 4; // default aim up-right
        this.facingRight = true;
        this.damageFlash = 0;
        this.deathTimer = 0;

        // Phaser graphics object for this figure
        this.gfx = scene.add.graphics();
        this.gfx.setDepth(10);

        // Name text
        this.nameText = scene.add.text(x, y - 42, team.name, {
            fontSize: '9px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 2,
            align: 'center'
        }).setOrigin(0.5, 1).setDepth(11);

        // HP text
        this.hpText = scene.add.text(x, y - 34, '100', {
            fontSize: '8px',
            color: '#44ff44',
            stroke: '#000000',
            strokeThickness: 2,
            align: 'center'
        }).setOrigin(0.5, 1).setDepth(11);
    }

    get colorHex() {
        return '#' + this.team.color.toString(16).padStart(6, '0');
    }

    update(dt, terrain) {
        if (!this.alive) {
            this.deathTimer -= dt;
            if (this.deathTimer <= 0) {
                this.gfx.setVisible(false);
                this.nameText.setVisible(false);
                this.hpText.setVisible(false);
            }
            return;
        }

        // Apply gravity
        if (!terrain.isSolid(this.x, this.y + 1)) {
            this.vy += 400 * dt;
            this.y += this.vy * dt;

            // Check if we landed
            if (terrain.isSolid(this.x, this.y)) {
                // Walk up to find surface
                while (terrain.isSolid(this.x, this.y - 1)) {
                    this.y--;
                }
                // Fall damage
                if (this.vy > 300) {
                    const fallDamage = Math.floor((this.vy - 300) * 0.08);
                    this.takeDamage(fallDamage);
                }
                this.vy = 0;
            }
        } else {
            this.vy = 0;
            // Ensure we're on the surface (not buried)
            while (terrain.isSolid(this.x, this.y - 1)) {
                this.y--;
            }
        }

        // Water death
        if (this.y >= terrain.H - 25) {
            this.takeDamage(this.hp);
        }

        // Damage flash countdown
        if (this.damageFlash > 0) {
            this.damageFlash -= dt;
        }

        this.draw();
    }

    takeDamage(amount) {
        if (!this.alive || amount <= 0) return;
        this.hp = Math.max(0, this.hp - Math.round(amount));
        this.damageFlash = 0.3;
        this.hpText.setText(this.hp.toString());

        if (this.hp <= 60) this.hpText.setColor('#ffff44');
        if (this.hp <= 30) this.hpText.setColor('#ff4444');

        if (this.hp <= 0) {
            this.die();
        }
    }

    die() {
        this.alive = false;
        this.deathTimer = 1.0;
        this.team.onFigureDied(this);
    }

    applyExplosionForce(cx, cy, radius) {
        const dx = this.x - cx;
        const dy = this.y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < radius && dist > 0) {
            const force = (1 - dist / radius) * 200;
            this.x += (dx / dist) * force * 0.3;
            this.y += (dy / dist) * force * 0.3;
            this.vy = -(force * 0.8);
        }
    }

    draw() {
        const gfx = this.gfx;
        gfx.clear();

        if (!this.alive) {
            // Death animation - falling figure
            gfx.setAlpha(this.deathTimer);
            this._drawBody(gfx, this.x, this.y, true);
            return;
        }

        gfx.setAlpha(1);

        // Flash white when hit
        const flash = this.damageFlash > 0;
        this._drawBody(gfx, this.x, this.y, false, flash);

        // Active indicator arrow
        if (this.isActive) {
            const bobY = Math.sin(Date.now() * 0.005) * 3;
            gfx.fillStyle(0xffffff, 1);
            gfx.fillTriangle(
                this.x, this.y - 30 + bobY,
                this.x - 4, this.y - 36 + bobY,
                this.x + 4, this.y - 36 + bobY
            );

            // Aim line
            const aimLen = 30;
            const dir = this.facingRight ? 1 : -1;
            const aimX = this.x + Math.cos(this.aimAngle) * aimLen * dir;
            const aimY = this.y - 14 + Math.sin(this.aimAngle) * aimLen;
            gfx.lineStyle(2, 0xff4444, 0.7);
            gfx.lineBetween(this.x, this.y - 14, aimX, aimY);

            // Crosshair at end
            gfx.fillStyle(0xff4444, 0.8);
            gfx.fillCircle(aimX, aimY, 3);
        }

        // Update text positions
        this.nameText.setPosition(this.x, this.y - 42);
        this.hpText.setPosition(this.x, this.y - 34);
    }

    _drawBody(gfx, x, y, dead, flash) {
        const color = flash ? 0xffffff : this.team.color;
        const headColor = flash ? 0xffffff : 0xffddbb;

        // Shadow
        gfx.fillStyle(0x000000, 0.2);
        gfx.fillEllipse(x, y + 1, 12, 4);

        // Legs
        gfx.lineStyle(2.5, color, 1);
        if (dead) {
            // Splayed legs
            gfx.lineBetween(x, y - 4, x - 7, y + 2);
            gfx.lineBetween(x, y - 4, x + 7, y + 2);
        } else {
            gfx.lineBetween(x, y - 4, x - 5, y);
            gfx.lineBetween(x, y - 4, x + 5, y);
        }

        // Body
        gfx.lineStyle(3, color, 1);
        gfx.lineBetween(x, y - 14, x, y - 4);

        // Arms
        gfx.lineStyle(2.5, color, 1);
        if (this.isActive && !dead) {
            // Arms follow aim
            const dir = this.facingRight ? 1 : -1;
            const armX = Math.cos(this.aimAngle) * 8 * dir;
            const armY = Math.sin(this.aimAngle) * 8;
            gfx.lineBetween(x, y - 12, x + armX, y - 12 + armY);
            gfx.lineBetween(x, y - 12, x - armX * 0.3, y - 10);
        } else {
            gfx.lineBetween(x - 7, y - 12, x + 7, y - 12);
        }

        // Head
        gfx.fillStyle(headColor, 1);
        gfx.fillCircle(x, y - 18, 5);
        gfx.lineStyle(1.5, color, 1);
        gfx.strokeCircle(x, y - 18, 5);

        // Eyes
        if (!dead) {
            const eyeDir = this.facingRight ? 1 : -1;
            gfx.fillStyle(0x000000, 1);
            gfx.fillCircle(x + 1.5 * eyeDir, y - 19, 1);
            gfx.fillCircle(x + 3.5 * eyeDir, y - 19, 1);
        } else {
            // X eyes
            gfx.lineStyle(1, 0x000000, 1);
            gfx.lineBetween(x - 3, y - 20, x - 1, y - 18);
            gfx.lineBetween(x - 1, y - 20, x - 3, y - 18);
            gfx.lineBetween(x + 1, y - 20, x + 3, y - 18);
            gfx.lineBetween(x + 3, y - 20, x + 1, y - 18);
        }
    }

    destroy() {
        this.gfx.destroy();
        this.nameText.destroy();
        this.hpText.destroy();
    }
}
