export class TurnManager {
    constructor(teams, turnDuration, scene) {
        this.teams = teams;
        this.turnDuration = turnDuration;
        this.scene = scene;
        this.teamIndex = 0;
        this.figureIndices = new Map(); // team -> current figure index
        this.timer = turnDuration;
        this.phase = 'aiming'; // 'aiming' | 'firing' | 'projectile' | 'settling'
        this.settleCooldown = 0;
        this.currentWind = 0;

        // Initialize figure indices
        for (const team of teams) {
            this.figureIndices.set(team, 0);
        }

        // Start first turn
        this._newWind();
        this._activateFigure();
    }

    get activeTeam() {
        return this.teams[this.teamIndex];
    }

    get activeFigure() {
        const team = this.activeTeam;
        const figures = team.aliveFigures;
        if (figures.length === 0) return null;
        const idx = this.figureIndices.get(team) % figures.length;
        return figures[idx];
    }

    update(dt) {
        if (this.phase === 'aiming') {
            this.timer -= dt;
            this.scene.events.emit('timer-tick', Math.ceil(this.timer));
            if (this.timer <= 0) {
                this.endTurn();
            }
        }

        if (this.phase === 'settling') {
            this.settleCooldown -= dt;
            if (this.settleCooldown <= 0) {
                this._advanceTurn();
            }
        }
    }

    onFired() {
        this.phase = 'projectile';
    }

    onProjectileLanded() {
        this.phase = 'settling';
        this.settleCooldown = 1.5;
    }

    endTurn() {
        if (this.phase === 'projectile') return; // can't skip during flight
        this.phase = 'settling';
        this.settleCooldown = 0.5;
    }

    _advanceTurn() {
        // Deactivate current figure
        if (this.activeFigure) {
            this.activeFigure.isActive = false;
        }

        // Remove eliminated teams
        this.teams = this.teams.filter(t => !t.isEliminated);

        if (this.teams.length <= 1) {
            this.scene.events.emit('game-over', this.teams[0] ?? null);
            this.phase = 'game-over';
            return;
        }

        // Advance to next team (wrap around after filtering)
        this.teamIndex = (this.teamIndex + 1) % this.teams.length;

        // Advance figure within the new team
        const team = this.activeTeam;
        const currentIdx = this.figureIndices.get(team) || 0;
        this.figureIndices.set(team, currentIdx + 1);

        // Reset for new turn
        this.timer = this.turnDuration;
        this.phase = 'aiming';
        this._newWind();
        this._activateFigure();
    }

    _newWind() {
        this.currentWind = Math.round((Math.random() * 20 - 10) * 10) / 10;
    }

    _activateFigure() {
        const figure = this.activeFigure;
        if (!figure) return;
        figure.isActive = true;

        this.scene.events.emit('turn-start', {
            team: this.activeTeam,
            figure: figure,
            wind: this.currentWind,
        });
    }
}
