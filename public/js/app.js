// public/js/app.js

class TournamentUI {
    constructor() {
      this.initializeUI();
    }
  
    initializeUI() {
      this.setupNavigation();
      this.renderLeaderboard();
      this.setupAdminPanel();
    }
  
    setupNavigation() {
      const navLinks = document.querySelectorAll('.nav-link');
      navLinks.forEach((link) => {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          this.showSection(link.dataset.section);
          navLinks.forEach((l) => l.classList.remove('active'));
          link.classList.add('active');
        });
      });
    }
  
    showSection(sectionId) {
      document.querySelectorAll('section').forEach((section) => {
        if (section.id === sectionId) {
          section.classList.remove('hidden');
          gsap.from(section, {
            duration: 0.5,
            opacity: 0,
            y: 20,
            ease: 'power2.out',
          });
        } else {
          section.classList.add('hidden');
        }
      });
    }
  
    async renderLeaderboard() {
      const tbody = document.querySelector('#leaderboard tbody');
      tbody.innerHTML = '';
  
      let players = [];
      try {
        const response = await fetch('/api/players');
        players = await response.json();
      } catch (error) {
        console.error('Error fetching players:', error);
      }
  
      players.sort((a, b) => b.mmr - a.mmr);
  
      players.forEach((player, index) => {
        const row = document.createElement('tr');
        let rankClass = '';
        if (index === 0) rankClass = 'rank-gold';
        if (index === 1) rankClass = 'rank-silver';
        if (index === 2) rankClass = 'rank-bronze';
  
        row.innerHTML = `
          <td><span class="rank-circle ${rankClass}">${index + 1}</span></td>
          <td class="player-name">
            <span>${player.name}</span>
          </td>
          <td class="text-center">${player.mmr}</td>
          <td class="text-center">${player.wins}</td>
          <td class="text-center">${player.losses}</td>
          <td class="text-center">${player.winstreak}</td>
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
        if (password === 'your_admin_password') {
          loginForm.classList.add('hidden');
          adminControls.classList.remove('hidden');
          this.renderAdminControls();
        } else {
          alert('Invalid password');
        }
      };
    }
  
    async renderAdminControls() {
      const controls = document.getElementById('admin-controls');
      controls.innerHTML = `
        <div class="admin-grid">
          <!-- Add Player -->
          <div class="card admin-card">
            <h3>Add Player</h3>
            <input type="text" id="new-player-name" class="form-input" placeholder="Player Name">
            <button onclick="tournamentUI.addPlayer()" class="btn btn-primary">Add Player</button>
          </div>
  
          <!-- Remove Player -->
          <div class="card admin-card">
            <h3>Remove Player</h3>
            <select id="remove-player-select" class="form-input">
              <option value="">Select Player</option>
              ${await this.getPlayerOptions()}
            </select>
            <button onclick="tournamentUI.removePlayer()" class="btn btn-danger">Remove Player</button>
          </div>
  
          <!-- Record Match -->
          <div class="card admin-card">
            <h3>Record Match</h3>
            <select id="player1-select" class="form-input">
              <option value="">Select Player 1</option>
              ${await this.getPlayerOptions()}
            </select>
            <select id="player2-select" class="form-input">
              <option value="">Select Player 2</option>
              ${await this.getPlayerOptions()}
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
  
          <!-- Manage Matches -->
          <div class="card admin-card">
            <h3>Manage Matches</h3>
            <button onclick="tournamentUI.showMatchManager()" class="btn btn-primary">Manage Matches</button>
          </div>
        </div>
      `;
  
      // Update winner options when players are selected
      document.getElementById('player1-select').addEventListener('change', () => this.updateWinnerOptions());
      document.getElementById('player2-select').addEventListener('change', () => this.updateWinnerOptions());
    }
  
    async getPlayerOptions() {
      let players = [];
      try {
        const response = await fetch('/api/players');
        players = await response.json();
      } catch (error) {
        console.error('Error fetching players:', error);
      }
  
      return players.map((player) => `<option value="${player.name}">${player.name}</option>`).join('');
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
            body: JSON.stringify({ name }),
          });
          if (response.ok) {
            nameInput.value = '';
            this.renderLeaderboard();
            this.renderAdminControls();
            alert(`Player ${name} added successfully!`);
          } else {
            const error = await response.json();
            alert(error.error);
          }
        } catch (error) {
          alert('Error adding player: ' + error.message);
        }
      }
    }
  
    async removePlayer() {
      const playerName = document.getElementById('remove-player-select').value;
      if (!playerName) {
        alert('Please select a player to remove');
        return;
      }
  
      if (!confirm('Are you sure you want to remove this player? This action cannot be undone.')) {
        return;
      }
  
      try {
        // Get player ID
        const players = await fetch('/api/players').then((res) => res.json());
        const player = players.find((p) => p.name === playerName);
        if (!player) throw new Error('Player not found');
  
        const response = await fetch(`/api/players/${player.id}`, {
          method: 'DELETE',
        });
        if (response.ok) {
          alert('Player removed successfully');
          this.renderAdminControls();
          this.renderLeaderboard();
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
  
      // Validation
      if (!player1 || !player2 || !winner) {
        alert('Please select both players and the winner');
        return;
      }
      if (player1 === player2) {
        alert('Player 1 and Player 2 cannot be the same');
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
          body: JSON.stringify({ player1, player2, winner, winnerScore, loserScore }),
        });
        if (response.ok) {
          alert('Match recorded successfully');
          this.renderLeaderboard();
          this.renderAdminControls();
        } else {
          const error = await response.json();
          alert('Error recording match: ' + error.error);
        }
      } catch (error) {
        console.error('Error recording match:', error);
      }
    }
  
    showMatchManager() {
      // Implement match manager functionality
      alert('Match manager functionality to be implemented.');
    }
  }
  
  const tournamentUI = new TournamentUI();
  