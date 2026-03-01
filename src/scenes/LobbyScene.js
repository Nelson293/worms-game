const PRESET_COLORS = [
    { name: 'Red', hex: 0xff4444 },
    { name: 'Blue', hex: 0x4488ff },
    { name: 'Green', hex: 0x44cc44 },
    { name: 'Yellow', hex: 0xffcc00 },
    { name: 'Orange', hex: 0xff8800 },
    { name: 'Purple', hex: 0xaa44ff },
    { name: 'Pink', hex: 0xff66aa },
    { name: 'Teal', hex: 0x44cccc },
];

const DEFAULT_NAMES = [
    'Red Squad', 'Blue Team', 'Green Gang', 'Yellow Crew',
    'Orange Force', 'Purple Haze', 'Pink Panthers', 'Teal Titans'
];

export class LobbyScene extends Phaser.Scene {
    constructor() {
        super({ key: 'LobbyScene' });
    }

    create() {
        this.teamConfigs = [
            { name: DEFAULT_NAMES[0], color: PRESET_COLORS[0].hex, figureCount: 3 },
            { name: DEFAULT_NAMES[1], color: PRESET_COLORS[1].hex, figureCount: 3 },
        ];

        this._setupLobby();
    }

    _setupLobby() {
        const overlay = document.getElementById('lobby-overlay');
        overlay.classList.remove('hidden');

        const container = document.getElementById('teams-container');
        const addBtn = document.getElementById('add-team-btn');
        const startBtn = document.getElementById('start-game-btn');

        const renderTeams = () => {
            container.innerHTML = '';
            this.teamConfigs.forEach((team, i) => {
                const row = document.createElement('div');
                row.className = 'team-row';
                row.innerHTML = `
                    <span class="team-number">P${i + 1}</span>
                    <input type="text" value="${team.name}" placeholder="Team name" maxlength="15" data-idx="${i}">
                    <div class="color-swatches" data-idx="${i}">
                        ${PRESET_COLORS.map((c) => `
                            <div class="color-swatch ${team.color === c.hex ? 'selected' : ''}"
                                 style="background: #${c.hex.toString(16).padStart(6, '0')}"
                                 data-color="${c.hex}"></div>
                        `).join('')}
                    </div>
                    <div class="figure-count">
                        <button class="fc-minus" data-idx="${i}">-</button>
                        <span>${team.figureCount}</span>
                        <button class="fc-plus" data-idx="${i}">+</button>
                    </div>
                    ${this.teamConfigs.length > 2 ? `<button class="remove-team-btn" data-idx="${i}">&times;</button>` : ''}
                `;
                container.appendChild(row);
            });

            addBtn.style.display = this.teamConfigs.length >= 8 ? 'none' : '';

            // Bind events
            container.querySelectorAll('input[type="text"]').forEach(input => {
                input.addEventListener('change', (e) => {
                    this.teamConfigs[parseInt(e.target.dataset.idx)].name = e.target.value || DEFAULT_NAMES[parseInt(e.target.dataset.idx)];
                });
            });

            container.querySelectorAll('.color-swatch').forEach(swatch => {
                swatch.addEventListener('click', (e) => {
                    const parent = e.target.closest('.color-swatches');
                    const idx = parseInt(parent.dataset.idx);
                    this.teamConfigs[idx].color = parseInt(e.target.dataset.color);
                    parent.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
                    e.target.classList.add('selected');
                });
            });

            container.querySelectorAll('.fc-minus').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const idx = parseInt(e.target.dataset.idx);
                    if (this.teamConfigs[idx].figureCount > 1) {
                        this.teamConfigs[idx].figureCount--;
                        renderTeams();
                    }
                });
            });

            container.querySelectorAll('.fc-plus').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const idx = parseInt(e.target.dataset.idx);
                    if (this.teamConfigs[idx].figureCount < 8) {
                        this.teamConfigs[idx].figureCount++;
                        renderTeams();
                    }
                });
            });

            container.querySelectorAll('.remove-team-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    this.teamConfigs.splice(parseInt(e.target.dataset.idx), 1);
                    renderTeams();
                });
            });
        };

        renderTeams();

        addBtn.onclick = () => {
            const nextIdx = this.teamConfigs.length;
            if (nextIdx >= 8) return;
            const usedColors = new Set(this.teamConfigs.map(t => t.color));
            const availColor = PRESET_COLORS.find(c => !usedColors.has(c.hex)) || PRESET_COLORS[nextIdx % 8];
            this.teamConfigs.push({
                name: DEFAULT_NAMES[nextIdx] || `Team ${nextIdx + 1}`,
                color: availColor.hex,
                figureCount: 3,
            });
            renderTeams();
        };

        startBtn.onclick = () => {
            container.querySelectorAll('input[type="text"]').forEach((input, i) => {
                if (input.value.trim()) this.teamConfigs[i].name = input.value.trim();
            });
            overlay.classList.add('hidden');
            this.scene.start('GameScene', { teams: this.teamConfigs });
        };
    }
}
