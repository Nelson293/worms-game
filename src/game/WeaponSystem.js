export const WEAPONS = {
    bazooka: {
        name: 'Bazooka',
        key: 'bazooka',
        ammo: Infinity,
        damage: 50,
        radius: 45,
        description: 'Wind-affected rocket',
    },
    grenade: {
        name: 'Grenade',
        key: 'grenade',
        ammo: 5,
        damage: 65,
        radius: 60,
        description: 'Bouncing explosive (3s fuse)',
    },
    shotgun: {
        name: 'Shotgun',
        key: 'shotgun',
        ammo: 2,
        damage: 15,
        radius: 0,
        description: '6 pellets, no terrain damage',
    },
    airstrike: {
        name: 'Airstrike',
        key: 'airstrike',
        ammo: 1,
        damage: 40,
        radius: 40,
        description: '5 bombs from the sky',
    },
    dynamite: {
        name: 'Dynamite',
        key: 'dynamite',
        ammo: 1,
        damage: 80,
        radius: 80,
        description: 'Placed, 5s countdown, huge blast',
    },
    teleport: {
        name: 'Teleport',
        key: 'teleport',
        ammo: 2,
        damage: 0,
        radius: 0,
        description: 'Click to relocate',
    },
};

export const WEAPON_KEYS = Object.keys(WEAPONS);

export function getNextWeapon(currentKey, direction, team) {
    let idx = WEAPON_KEYS.indexOf(currentKey);
    const len = WEAPON_KEYS.length;
    for (let i = 0; i < len; i++) {
        idx = (idx + direction + len) % len;
        const key = WEAPON_KEYS[idx];
        if (team.getAmmo(key) > 0) return key;
    }
    return currentKey;
}
