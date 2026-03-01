import { Projectile } from '../Projectile.js';

export class BazookaProjectile extends Projectile {
    constructor(scene, x, y, angle, power, wind) {
        super(scene, x, y, angle, power, wind, {
            damage: 50,
            blastRadius: 45,
            color: 0xff6600,
            size: 4,
            maxTrail: 15,
        });
    }
}

export function fireBazooka(scene, figure, wind) {
    const dir = figure.facingRight ? 1 : -1;
    const angle = figure.aimAngle * dir;
    const startX = figure.x + Math.cos(angle) * 15;
    const startY = figure.y - 14 + Math.sin(angle) * 15;
    return new BazookaProjectile(scene, startX, startY, angle, 350, wind);
}
