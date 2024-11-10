// public/js/scoring.js

class TournamentUI {
    constructor() {
        this.players = [];
        this.matches = [];
        this.currentPage = 1;
        this.itemsPerPage = 20;
        this.searchTerm = '';
        this.filterType = 'all';
        this.initializeUI();
    }

    initializeUI() {
        this.setupNavigation();
        this.fetchData();
        this.setupAdminPanel();
    }

    setupNavigation() {
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.showSection(link.dataset.section);
                navLinks.forEach(l => l.classList.remove('active'));
                link.classList.add('active');
            });
        });
    }

    showSection(sectionId) {
        document.querySelectorAll('section').forEach(section => {
            if (section.id === sectionId) {
                section.classList.remove('hidden');
                gsap.from(section, {
                    duration: 0.5,
                    opacity: 0,
                    y: 20,
                    ease: "power2.out"
                });
            } else {
                section.classList.add('hidden');
            }
        });
    }

    async fetchData() {
        await Promise.all([this.fetchPlayers(), this.fetchMatches()]);
        this.renderLeaderboard();
    }

    async fetchPlayers() {
        try {
            const response = await fetch('/api/players');
            this.players = await response.json();
        } catch (error) {
            console.error('Error fetching players:', error);
            alert('Failed to fetch players.');
        }
    }

    async fetchMatches() {
        try {
            const response = await fetch('/api/matches');
            this.matches = await response.json();
        } catch (error) {
            console.error('Error fetching matches:', error);
            alert('Failed to fetch matches.');
        }
    }

    renderLeaderboard() {
        const tbody = document.querySelector('#leaderboard-body');
        tbody.innerHTML = '';

        const leaderboard = [...this.players].sort((a, b) => b.mmr - a.mmr);

        leaderboard.forEach((player, index) => {
            const row = document.createElement('tr');
            let rankClass = '';
            if (index === 0) rankClass = 'rank-gold';
            if (index === 1) rankClass = 'rank-silver';
            if (index === 2) rankClass = 'rank-bronze';

            row.innerHTML = `
                <td><span class="rank-circle ${rankClass}">${index + 1}</span></td>
                <td class="player-name">${player.name}</td>
                <td>${player.mmr}</td>
                <td>${player.wins}</td>
                <td>${player.losses}</td>
                <td>${player.winstreak}</td>
            `;

            tbody.appendChild(row);
        });
    }

    setupAdminPanel() {
        const adminControls = document.getElementById('admin-controls');
        const loginForm = document.getElementById('admin-login');

        // Admin login handler
        window.adminLogin = () => {
            const password = document.getElementById('admin-password').value;
            // For demo purposes, the password is 'admin123'
            if (password === 'admin123') {
                loginForm.classList.add('hidden');
                adminControls.classList.remove('hidden');
                this.renderAdminControls();
            } else {
                alert('Invalid password');
            }
        };
    }

    renderAdminControls() {
        const controls = document.getElementById('admin-controls');
        controls.innerHTML = `
            <div class="admin-grid">
                <div class="card admin-card">
                    <h3>Add Player</h3>
                    <input type="text" id="new-player-name" class="form-input" placeholder="Player Name">
                    <button onclick="tournamentUI.addPlayer()" class="btn btn-primary">Add Player</button>
                </div>
                <div class="card admin-card">
                    <h3>Remove Player</h3>
                    <select id="remove-player-select" class="form-input">
                        <option value="">Select Player</option>
                        ${this.players.map(p => 
                            `<option value="${p.id}">${p.name}</option>`
                        ).join('')}
                    </select>
                    <button onclick="tournamentUI.removePlayer()" class="btn btn-danger">Remove Player</button>
                </div>
                <div class="card admin-card">
                    <h3>Record Match</h3>
                    <select id="player1-select" class="form-input">
                        <option value="">Select Player 1</option>
                        ${this.players.map(p => `<option value="${p.name}">${p.name}</option>`).join('')}
                    </select>
                    <select id="player2-select" class="form-input">
                        <option value="">Select Player 2</option>
                        ${this.players.map(p => `<option value="${p.name}">${p.name}</option>`).join('')}
                    </select>
                    <select id="winner-select" class="form-input">
                        <option value="">Select Winner</option>
                    </select>
                    <div class="score-inputs">
                        <input type="number" id="winner-score" class="form-input" placeholder="Winner Score" min="0" max="50">
                        <input type="number" id="loser-score" class="form-input" placeholder="Loser Score" min="0" max="50">
                    </div>
                    <button onclick="tournamentUI.recordMatch()" class="btn btn-primary">Record Match</button>
                </div>
            </div>
        `;

        // Update winner options when player selection changes
        document.getElementById('player1-select').addEventListener('change', this.updateWinnerOptions.bind(this));
        document.getElementById('player2-select').addEventListener('change', this.updateWinnerOptions.bind(this));
    }

    updateWinnerOptions() {
        const player1 = document.getElementById('player1-select').value;
        const player2 = document.getElementById('player2-select').value;
        const winnerSelect = document.getElementById('winner-select');

        winnerSelect.innerHTML = '<option value="">Select Winner</option>';
        if (player1) winnerSelect.innerHTML += `<option value="${player1}">${player1}</option>`;
        if (player2) winnerSelect.innerHTML += `<option value="${player2}">${player2}</option>`;
    }

    async addPlayer() {
        const nameInput = document.getElementById('new-player-name');
        const name = nameInput.value.trim();
        if (name) {
            try {
                const response = await fetch('/api/players', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name })
                });
                if (response.ok) {
                    alert(`Player ${name} added successfully!`);
                    nameInput.value = '';
                    await this.fetchPlayers();
                    this.renderLeaderboard();
                    this.renderAdminControls();
                } else {
                    const error = await response.json();
                    alert('Error adding player: ' + error.error);
                }
            } catch (error) {
                console.error('Error adding player:', error);
                alert('Error adding player: ' + error.message);
            }
        }
    }

    async removePlayer() {
        const playerId = document.getElementById('remove-player-select').value;
        if (!playerId) {
            alert('Please select a player to remove');
            return;
        }

        if (!confirm('Are you sure you want to remove this player? This action cannot be undone.')) {
            return;
        }

        try {
            const response = await fetch(`/api/players/${playerId}`, {
                method: 'DELETE',
            });
            if (response.ok) {
                alert('Player removed successfully');
                await this.fetchPlayers();
                this.renderLeaderboard();
                this.renderAdminControls();
            } else {
                const error = await response.json();
                alert('Error removing player: ' + error.error);
            }
        } catch (error) {
            console.error('Error removing player:', error);
            alert('Error removing player: ' + error.message);
        }
    }

    async recordMatch() {
        const player1 = document.getElementById('player1-select').value;
        const player2 = document.getElementById('player2-select').value;
        const winner = document.getElementById('winner-select').value;
        const winnerScore = parseInt(document.getElementById('winner-score').value);
        const loserScore = parseInt(document.getElementById('loser-score').value);

        if (!player1 || !player2 || !winner) {
            alert('Please select both players and the winner');
            return;
        }

        if (player1 === player2) {
            alert('Players must be different');
            return;
        }

        if (isNaN(winnerScore) || isNaN(loserScore)) {
            alert('Please enter valid scores');
            return;
        }

        if (winnerScore <= loserScore) {
            alert('Winner score must be greater than loser score');
            return;
        }

        try {
            const response = await fetch('/api/matches', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ player1, player2, winner, winnerScore, loserScore })
            });
            if (response.ok) {
                alert('Match recorded successfully');
                await this.fetchPlayers();
                this.renderLeaderboard();
                this.renderAdminControls();
            } else {
                const error = await response.json();
                alert('Error recording match: ' + error.error);
            }
        } catch (error) {
            console.error('Error recording match:', error);
            alert('Error recording match: ' + error.message);
        }
    }
}

// Initialize the UI when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    window.tournamentUI = new TournamentUI();
});
