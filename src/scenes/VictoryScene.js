export class VictoryScene extends Phaser.Scene {
    constructor() {
        super({ key: 'VictoryScene' });
    }

    create(data) {
        const winner = data.winner;

        // Dark background
        this.add.rectangle(480, 270, 960, 540, 0x0a0a1e, 0.95);

        if (winner) {
            const colorStr = '#' + winner.color.toString(16).padStart(6, '0');

            // Winner text
            this.add.text(480, 150, 'VICTORY!', {
                fontSize: '64px',
                color: colorStr,
                stroke: '#000000',
                strokeThickness: 6,
                fontStyle: 'bold',
            }).setOrigin(0.5);

            this.add.text(480, 230, winner.name, {
                fontSize: '36px',
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: 4,
                fontStyle: 'bold',
            }).setOrigin(0.5);

            this.add.text(480, 280, 'wins the battle!', {
                fontSize: '18px',
                color: '#aaaaaa',
            }).setOrigin(0.5);

            // Confetti particles
            this._createConfetti(winner.color);
        } else {
            this.add.text(480, 200, 'DRAW!', {
                fontSize: '64px',
                color: '#ffcc00',
                stroke: '#000000',
                strokeThickness: 6,
                fontStyle: 'bold',
            }).setOrigin(0.5);

            this.add.text(480, 270, 'Everyone was eliminated!', {
                fontSize: '18px',
                color: '#aaaaaa',
            }).setOrigin(0.5);
        }

        // Play Again button
        const btnBg = this.add.rectangle(480, 400, 200, 50, 0xe94560)
            .setInteractive({ useHandCursor: true });

        const btnText = this.add.text(480, 400, 'PLAY AGAIN', {
            fontSize: '18px',
            color: '#ffffff',
            fontStyle: 'bold',
            letterSpacing: 2,
        }).setOrigin(0.5);

        btnBg.on('pointerover', () => btnBg.setFillStyle(0xff5577));
        btnBg.on('pointerout', () => btnBg.setFillStyle(0xe94560));
        btnBg.on('pointerdown', () => {
            this.scene.start('LobbyScene');
        });
    }

    _createConfetti(winnerColor) {
        const colors = [winnerColor, 0xffcc00, 0xff6644, 0x44ff66, 0x4488ff, 0xff44aa];
        const gfx = this.add.graphics();

        const particles = [];
        for (let i = 0; i < 80; i++) {
            particles.push({
                x: Math.random() * 960,
                y: -20 - Math.random() * 200,
                vx: (Math.random() - 0.5) * 100,
                vy: 50 + Math.random() * 150,
                size: 3 + Math.random() * 5,
                color: colors[Math.floor(Math.random() * colors.length)],
                rot: Math.random() * Math.PI * 2,
                rotSpeed: (Math.random() - 0.5) * 5,
            });
        }

        this.time.addEvent({
            delay: 16,
            repeat: -1,
            callback: () => {
                gfx.clear();
                for (const p of particles) {
                    p.x += p.vx * 0.016;
                    p.y += p.vy * 0.016;
                    p.vy += 30 * 0.016;
                    p.rot += p.rotSpeed * 0.016;

                    if (p.y > 560) {
                        p.y = -20;
                        p.x = Math.random() * 960;
                        p.vy = 50 + Math.random() * 150;
                    }

                    gfx.fillStyle(p.color, 0.8);
                    gfx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size * 0.6);
                }
            }
        });
    }
}
