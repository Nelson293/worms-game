import { WEAPONS } from '../game/WeaponSystem.js';

export class HUDScene extends Phaser.Scene {
    constructor() {
        super({ key: 'HUDScene' });
    }

    create(data) {
        this.gameScene = data.gameScene;

        // Team banner (top center)
        this.teamBanner = this.add.text(480, 10, '', {
            fontSize: '18px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4,
            fontStyle: 'bold',
            align: 'center',
        }).setOrigin(0.5, 0);

        // Turn timer (top right)
        this.timerText = this.add.text(930, 10, '30', {
            fontSize: '24px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3,
            fontStyle: 'bold',
        }).setOrigin(1, 0);

        this.timerLabel = this.add.text(930, 38, 'SECONDS', {
            fontSize: '8px',
            color: '#aaaaaa',
            stroke: '#000000',
            strokeThickness: 2,
        }).setOrigin(1, 0);

        // Wind indicator (top left area)
        this.windLabel = this.add.text(30, 10, 'WIND', {
            fontSize: '9px',
            color: '#aaaaaa',
            stroke: '#000000',
            strokeThickness: 2,
        });

        this.windGfx = this.add.graphics();
        this.windValue = this.add.text(30, 40, '0', {
            fontSize: '10px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 2,
        });

        // Weapon display (bottom center)
        this.weaponBg = this.add.rectangle(480, 510, 200, 30, 0x000000, 0.6).setOrigin(0.5);
        this.weaponText = this.add.text(480, 504, 'Bazooka', {
            fontSize: '13px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 2,
            fontStyle: 'bold',
        }).setOrigin(0.5, 0);

        this.ammoText = this.add.text(480, 518, '', {
            fontSize: '9px',
            color: '#cccccc',
            stroke: '#000000',
            strokeThickness: 2,
        }).setOrigin(0.5, 0);

        // Controls hint (bottom)
        this.controlsText = this.add.text(480, 535, 'Arrow Keys: Move/Aim | Q/E: Weapon | Space: Fire | Shift: Fine Aim', {
            fontSize: '8px',
            color: '#666666',
            stroke: '#000000',
            strokeThickness: 1,
        }).setOrigin(0.5, 1);

        // Listen to game events
        this.gameScene.events.on('turn-start', (info) => this._onTurnStart(info));
        this.gameScene.events.on('timer-tick', (t) => this._onTimerTick(t));
        this.gameScene.events.on('weapon-changed', (key) => this._onWeaponChanged(key));
    }

    _onTurnStart(info) {
        const colorStr = '#' + info.team.color.toString(16).padStart(6, '0');
        this.teamBanner.setText(`${info.team.name}'s Turn`);
        this.teamBanner.setColor(colorStr);

        this._updateWind(info.wind);
        this._onWeaponChanged('bazooka');
    }

    _onTimerTick(seconds) {
        this.timerText.setText(seconds.toString());
        if (seconds <= 5) {
            this.timerText.setColor('#ff4444');
        } else if (seconds <= 10) {
            this.timerText.setColor('#ffcc00');
        } else {
            this.timerText.setColor('#ffffff');
        }
    }

    _updateWind(wind) {
        this.windGfx.clear();
        this.windValue.setText(Math.abs(wind).toFixed(1));

        const cx = 70, cy = 25;
        const maxLen = 40;
        const len = (Math.abs(wind) / 10) * maxLen;

        if (Math.abs(wind) < 0.5) {
            this.windGfx.fillStyle(0x888888, 0.5);
            this.windGfx.fillCircle(cx, cy, 3);
            return;
        }

        const dir = wind > 0 ? 1 : -1;
        const color = wind > 0 ? 0x44aaff : 0xff8844;

        // Arrow shaft
        this.windGfx.lineStyle(3, color, 0.8);
        this.windGfx.lineBetween(cx, cy, cx + len * dir, cy);

        // Arrow head
        this.windGfx.fillStyle(color, 0.8);
        this.windGfx.fillTriangle(
            cx + len * dir, cy - 5,
            cx + len * dir, cy + 5,
            cx + (len + 8) * dir, cy
        );
    }

    _onWeaponChanged(key) {
        const weapon = WEAPONS[key];
        if (!weapon) return;

        this.weaponText.setText(weapon.name);

        const team = this.gameScene.turnManager?.activeTeam;
        if (team) {
            const ammo = team.getAmmo(key);
            this.ammoText.setText(ammo === Infinity ? 'Unlimited' : `Ammo: ${ammo}`);
        }
    }
}
