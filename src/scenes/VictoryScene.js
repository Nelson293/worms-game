import { SFX } from '../game/SFX.js';

export class VictoryScene extends Phaser.Scene {
    constructor() {
        super({ key: 'VictoryScene' });
    }

    create(data) {
        const winner = data.winner;
        const stats = data.stats || {};
        const W = this.scale.width;
        const H = this.scale.height;

        // Background
        this.add.rectangle(W / 2, H / 2, W, H, 0x0a0a1e, 0.97);

        // Animated background particles
        this._createBgParticles(W, H, winner?.color || 0xffffff);

        if (winner) {
            const colorStr = '#' + winner.color.toString(16).padStart(6, '0');

            // Victory text with entrance animation
            const victoryText = this.add.text(W / 2, H * 0.22, 'VICTORY!', {
                fontSize: '56px',
                fontFamily: 'Russo One, sans-serif',
                color: colorStr,
                stroke: '#000000',
                strokeThickness: 6,
            }).setOrigin(0.5).setScale(0).setAlpha(0);

            this.tweens.add({
                targets: victoryText,
                scaleX: 1, scaleY: 1, alpha: 1,
                duration: 600,
                ease: 'Back.easeOut',
            });

            // Winner name
            const nameText = this.add.text(W / 2, H * 0.38, winner.name, {
                fontSize: '32px',
                fontFamily: 'Russo One, sans-serif',
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: 4,
            }).setOrigin(0.5).setAlpha(0);

            this.tweens.add({
                targets: nameText,
                alpha: 1,
                duration: 500,
                delay: 400,
            });

            const subtitle = this.add.text(W / 2, H * 0.46, 'wins the battle!', {
                fontSize: '16px',
                fontFamily: 'Exo 2, sans-serif',
                color: '#888888',
            }).setOrigin(0.5).setAlpha(0);

            this.tweens.add({
                targets: subtitle,
                alpha: 1,
                duration: 500,
                delay: 600,
            });

            // Confetti
            this._createConfetti(W, H, winner.color);
        } else {
            const drawText = this.add.text(W / 2, H * 0.3, 'DRAW!', {
                fontSize: '56px',
                fontFamily: 'Russo One, sans-serif',
                color: '#ffcc00',
                stroke: '#000000',
                strokeThickness: 6,
            }).setOrigin(0.5);

            this.add.text(W / 2, H * 0.42, 'Everyone was eliminated!', {
                fontSize: '16px',
                fontFamily: 'Exo 2, sans-serif',
                color: '#888888',
            }).setOrigin(0.5);
        }

        // Stats
        if (stats.turns) {
            const statsY = H * 0.56;
            this.add.text(W / 2, statsY, `Turns played: ${stats.turns}`, {
                fontSize: '12px',
                fontFamily: 'Exo 2, sans-serif',
                color: '#555555',
            }).setOrigin(0.5).setAlpha(0).setAlpha(1);
        }

        // Play Again button
        const btnY = H * 0.72;
        const btnBg = this.add.rectangle(W / 2, btnY, 200, 50, 0xe94560)
            .setInteractive({ useHandCursor: true })
            .setAlpha(0);

        const btnText = this.add.text(W / 2, btnY, 'PLAY AGAIN', {
            fontSize: '18px',
            fontFamily: 'Russo One, sans-serif',
            color: '#ffffff',
            letterSpacing: 3,
        }).setOrigin(0.5).setAlpha(0);

        this.tweens.add({
            targets: [btnBg, btnText],
            alpha: 1,
            duration: 500,
            delay: 1000,
        });

        btnBg.on('pointerover', () => {
            btnBg.setFillStyle(0xff5577);
            btnText.setScale(1.05);
        });
        btnBg.on('pointerout', () => {
            btnBg.setFillStyle(0xe94560);
            btnText.setScale(1);
        });
        btnBg.on('pointerdown', () => {
            this.scene.start('LobbyScene');
        });
    }

    _createBgParticles(W, H, color) {
        const gfx = this.add.graphics();
        const particles = [];
        for (let i = 0; i < 30; i++) {
            particles.push({
                x: Math.random() * W,
                y: Math.random() * H,
                size: 1 + Math.random() * 2,
                speed: 0.2 + Math.random() * 0.5,
                alpha: 0.1 + Math.random() * 0.15,
            });
        }

        this.time.addEvent({
            delay: 32,
            repeat: -1,
            callback: () => {
                gfx.clear();
                for (const p of particles) {
                    p.y -= p.speed;
                    if (p.y < -5) { p.y = H + 5; p.x = Math.random() * W; }
                    gfx.fillStyle(color, p.alpha);
                    gfx.fillCircle(p.x, p.y, p.size);
                }
            }
        });
    }

    _createConfetti(W, H, winnerColor) {
        const colors = [winnerColor, 0xffcc00, 0xff6644, 0x44ff66, 0x4488ff, 0xff44aa];
        const gfx = this.add.graphics();
        gfx.setDepth(10);

        const particles = [];
        for (let i = 0; i < 100; i++) {
            particles.push({
                x: Math.random() * W,
                y: -20 - Math.random() * 300,
                vx: (Math.random() - 0.5) * 120,
                vy: 40 + Math.random() * 160,
                size: 3 + Math.random() * 6,
                color: colors[Math.floor(Math.random() * colors.length)],
                rot: Math.random() * Math.PI * 2,
                rotSpeed: (Math.random() - 0.5) * 6,
                wobble: Math.random() * Math.PI * 2,
            });
        }

        this.time.addEvent({
            delay: 16,
            repeat: -1,
            callback: () => {
                gfx.clear();
                for (const p of particles) {
                    p.x += (p.vx + Math.sin(p.wobble) * 20) * 0.016;
                    p.y += p.vy * 0.016;
                    p.vy += 25 * 0.016;
                    p.rot += p.rotSpeed * 0.016;
                    p.wobble += 3 * 0.016;

                    if (p.y > H + 20) {
                        p.y = -20;
                        p.x = Math.random() * W;
                        p.vy = 40 + Math.random() * 160;
                    }

                    gfx.fillStyle(p.color, 0.85);
                    // Rotated rectangle effect
                    const w = p.size;
                    const h = p.size * 0.5;
                    gfx.fillRect(p.x - w / 2, p.y - h / 2, w, h);
                }
            }
        });
    }
}
