import { WEAPONS } from '../game/WeaponSystem.js';
import { SFX } from '../game/SFX.js';

export class HUDScene extends Phaser.Scene {
    constructor() {
        super({ key: 'HUDScene' });
    }

    create(data) {
        this.gameScene = data.gameScene;
        this.killFeedItems = [];

        const W = this.scale.width;
        const H = this.scale.height;

        // Top bar background
        this.topBar = this.add.rectangle(W / 2, 0, W, 50, 0x000000, 0.4).setOrigin(0.5, 0);

        // Team banner
        this.teamBanner = this.add.text(W / 2, 8, '', {
            fontSize: '20px',
            fontFamily: 'Russo One, sans-serif',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4,
        }).setOrigin(0.5, 0);

        this.turnSubtext = this.add.text(W / 2, 32, '', {
            fontSize: '10px',
            fontFamily: 'Exo 2, sans-serif',
            color: '#aaaaaa',
            stroke: '#000000',
            strokeThickness: 2,
        }).setOrigin(0.5, 0);

        // Timer
        this.timerBg = this.add.circle(W - 40, 30, 22, 0x000000, 0.5);
        this.timerText = this.add.text(W - 40, 30, '30', {
            fontSize: '18px',
            fontFamily: 'Russo One, sans-serif',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 2,
        }).setOrigin(0.5);

        // Wind
        this.windBg = this.add.rectangle(55, 28, 90, 36, 0x000000, 0.4).setOrigin(0.5);
        this.windLabel = this.add.text(55, 14, 'WIND', {
            fontSize: '8px',
            fontFamily: 'Exo 2, sans-serif',
            color: '#666666',
            letterSpacing: 2,
        }).setOrigin(0.5, 0);
        this.windGfx = this.add.graphics();
        this.windValue = this.add.text(55, 38, '', {
            fontSize: '9px',
            fontFamily: 'Exo 2, sans-serif',
            color: '#888888',
            stroke: '#000000',
            strokeThickness: 1,
        }).setOrigin(0.5, 0);

        // Weapon display (bottom center)
        this.weaponBg = this.add.rectangle(W / 2, H - 20, 220, 36, 0x000000, 0.5)
            .setOrigin(0.5).setStrokeStyle(1, 0xffffff, 0.1);
        this.weaponText = this.add.text(W / 2, H - 28, 'Bazooka', {
            fontSize: '14px',
            fontFamily: 'Russo One, sans-serif',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 2,
        }).setOrigin(0.5, 0);
        this.ammoText = this.add.text(W / 2, H - 12, '', {
            fontSize: '9px',
            fontFamily: 'Exo 2, sans-serif',
            color: '#999999',
        }).setOrigin(0.5, 0);

        // Controls hint
        this.add.text(W / 2, H - 2, 'A/D Move  |  UP/DOWN Aim  |  SPACE Fire  |  Q/E Weapon', {
            fontSize: '8px',
            fontFamily: 'Exo 2, sans-serif',
            color: '#444444',
        }).setOrigin(0.5, 1);

        // Kill feed container (top right)
        this.killFeedTexts = [];

        // Biome indicator
        if (this.gameScene.terrain) {
            this.add.text(W - 10, H - 8, this.gameScene.terrain.biomeName || '', {
                fontSize: '8px',
                fontFamily: 'Exo 2, sans-serif',
                color: '#333333',
            }).setOrigin(1, 1);
        }

        // Listen to events
        this.gameScene.events.on('turn-start', (info) => this._onTurnStart(info));
        this.gameScene.events.on('timer-tick', (t) => this._onTimerTick(t));
        this.gameScene.events.on('weapon-changed', (key) => this._onWeaponChanged(key));
        this.gameScene.events.on('kill-feed-update', (feed) => this._updateKillFeed(feed));
        this.gameScene.events.on('crate-picked', (info) => this._onCratePicked(info));

        // Handle resize
        this.scale.on('resize', (gameSize) => this._onResize(gameSize));

        this.lastTimerVal = 30;
    }

    _onTurnStart(info) {
        const colorStr = '#' + info.team.color.toString(16).padStart(6, '0');
        this.teamBanner.setText(info.team.name);
        this.teamBanner.setColor(colorStr);
        this.turnSubtext.setText(`Figure #${info.figure.index + 1}'s turn`);

        // Animate banner
        this.teamBanner.setScale(1.3);
        this.tweens.add({
            targets: this.teamBanner,
            scaleX: 1,
            scaleY: 1,
            duration: 300,
            ease: 'Back.easeOut',
        });

        this._updateWind(info.wind);
        this._onWeaponChanged('bazooka');
        this.lastTimerVal = 30;
    }

    _onTimerTick(seconds) {
        this.timerText.setText(seconds.toString());

        if (seconds <= 5) {
            this.timerText.setColor('#ff4444');
            this.timerBg.setFillStyle(0x441111, 0.6);
            if (seconds !== this.lastTimerVal && seconds > 0) {
                SFX.warning();
                // Pulse
                this.timerText.setScale(1.3);
                this.tweens.add({
                    targets: this.timerText,
                    scaleX: 1, scaleY: 1,
                    duration: 200,
                });
            }
        } else if (seconds <= 10) {
            this.timerText.setColor('#ffcc00');
            this.timerBg.setFillStyle(0x332200, 0.5);
        } else {
            this.timerText.setColor('#ffffff');
            this.timerBg.setFillStyle(0x000000, 0.5);
        }
        this.lastTimerVal = seconds;
    }

    _updateWind(wind) {
        this.windGfx.clear();
        this.windValue.setText(Math.abs(wind).toFixed(1));

        const cx = 55, cy = 28;
        const maxLen = 30;
        const len = (Math.abs(wind) / 10) * maxLen;

        if (Math.abs(wind) < 0.5) {
            this.windGfx.fillStyle(0x666666, 0.5);
            this.windGfx.fillCircle(cx, cy, 3);
            return;
        }

        const dir = wind > 0 ? 1 : -1;
        const color = wind > 0 ? 0x44aaff : 0xff8844;

        this.windGfx.lineStyle(3, color, 0.8);
        this.windGfx.lineBetween(cx - len * dir * 0.3, cy, cx + len * dir, cy);
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

        // Pulse animation
        this.weaponText.setScale(1.2);
        this.tweens.add({
            targets: this.weaponText,
            scaleX: 1, scaleY: 1,
            duration: 200,
        });
    }

    _updateKillFeed(feed) {
        // Clear old texts
        for (const t of this.killFeedTexts) t.destroy();
        this.killFeedTexts = [];

        const W = this.scale.width;
        const now = Date.now();

        feed.forEach((entry, i) => {
            const age = (now - entry.time) / 1000;
            if (age > 8) return;

            const alpha = age > 6 ? (8 - age) / 2 : 1;
            const colorStr = '#' + entry.victim.color.toString(16).padStart(6, '0');
            const text = this.add.text(W - 10, 55 + i * 18, `${entry.victim.name} eliminated`, {
                fontSize: '10px',
                fontFamily: 'Exo 2, sans-serif',
                color: colorStr,
                stroke: '#000000',
                strokeThickness: 2,
            }).setOrigin(1, 0).setAlpha(alpha);
            this.killFeedTexts.push(text);
        });
    }

    _onCratePicked(info) {
        // Flash notification
        const W = this.scale.width;
        const note = this.add.text(W / 2, 60, `Crate collected!`, {
            fontSize: '14px',
            fontFamily: 'Exo 2, sans-serif',
            color: '#44dd44',
            stroke: '#000000',
            strokeThickness: 3,
        }).setOrigin(0.5);

        this.tweens.add({
            targets: note,
            y: 40,
            alpha: 0,
            duration: 1500,
            onComplete: () => note.destroy(),
        });
    }

    _onResize(gameSize) {
        const W = gameSize.width;
        const H = gameSize.height;

        this.topBar.setPosition(W / 2, 0).setSize(W, 50);
        this.teamBanner.setX(W / 2);
        this.turnSubtext.setX(W / 2);
        this.timerBg.setPosition(W - 40, 30);
        this.timerText.setPosition(W - 40, 30);
        this.weaponBg.setPosition(W / 2, H - 20);
        this.weaponText.setPosition(W / 2, H - 28);
        this.ammoText.setPosition(W / 2, H - 12);
    }
}
