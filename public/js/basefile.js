 // Initialize particles.js
 particlesJS.load('particles-js', {
    "particles": {
        "number": {
            "value": 80,
            "density": {
                "enable": true,
                "value_area": 800
            }
        },
        "color": {
            "value": "#2563eb"
        },
        "shape": {
            "type": "circle"
        },
        "opacity": {
            "value": 0.5,
            "random": false
        },
        "size": {
            "value": 3,
            "random": true
        },
        "line_linked": {
            "enable": true,
            "distance": 150,
            "color": "#2563eb",
            "opacity": 0.4,
            "width": 1
        },
        "move": {
            "enable": true,
            "speed": 2,
            "direction": "none",
            "random": false,
            "straight": false,
            "out_mode": "out",
            "bounce": false
        }
    },
    "interactivity": {
        "detect_on": "canvas",
        "events": {
            "onhover": {
                "enable": true,
                "mode": "repulse"
            },
            "onclick": {
                "enable": true,
                "mode": "push"
            },
            "resize": true
        }
    },
    "retina_detect": true
});

// Initialize GSAP
gsap.registerPlugin(ScrollTrigger);

// Data Management
class TournamentSystem {
constructor() {
this.players = [];
this.matches = [];
this.adminHash = localStorage.getItem('adminHash') || this.hashPassword('admin123');
this.db = firebase.database();
this.initialize();
this.achievements = [];
this.userProfiles = [];
this.tournaments = [];

this.db.ref('achievements').on('value', (snapshot) => {
    const data = snapshot.val();
    this.achievements = data ? Object.values(data) : [];
});

this.db.ref('userProfiles').on('value', (snapshot) => {
    const data = snapshot.val();
    this.userProfiles = data ? Object.values(data) : [];
});

this.db.ref('tournaments').on('value', (snapshot) => {
    const data = snapshot.val();
    this.tournaments = data ? Object.values(data) : [];
});
}

initialize() {
// Listen for real-time updates to players
this.db.ref('players').on('value', (snapshot) => {
    const data = snapshot.val();
    console.log("Players data from Firebase:", data);
    if (data) {
        // Convert from object to array and preserve IDs
        this.players = Object.entries(data).map(([id, player]) => ({
            id,
            ...player
        }));
    } else {
        this.players = [];
    }
    // Update UI if initialized
    if (tournament.ui) {
        tournament.ui.renderLeaderboard();
    }
});

// Listen for real-time updates to matches
this.db.ref('matches').on('value', (snapshot) => {
    const data = snapshot.val();
    this.matches = data ? Object.values(data) : [];
});
}

async addPlayer(name) {
if (this.players.find(p => p.name.toLowerCase() === name.toLowerCase())) {
    throw new Error('Player already exists');
}

const newPlayer = {
    name: name,
    mmr: 1000,
    wins: 0,
    losses: 0,
    winstreak: 0
};

// Generate a new unique key for the player
const newPlayerKey = this.db.ref('players').push().key;

try {
    await this.db.ref('players/' + newPlayerKey).set(newPlayer);
    console.log("Player added successfully:", name);
} catch (error) {
    console.error("Error adding player:", error);
    throw new Error('Failed to add player');
}
}

async recordMatch(player1Name, player2Name, winnerName, isReplaying = false) {
const player1 = this.players.find(p => p.name === player1Name);
const player2 = this.players.find(p => p.name === player2Name);

if (!player1 || !player2) {
    throw new Error('Players not found');
}

const winner = player1Name === winnerName ? player1 : player2;
const loser = player1Name === winnerName ? player2 : player1;

// Calculate MMR changes
const mmrChanges = this.calculateMmrChange(winner, loser);

// Update winner stats
const winnerRef = this.db.ref(`players/${winner.id}`);
await winnerRef.update({
    mmr: winner.mmr + mmrChanges.winnerChange,
    wins: winner.wins + 1,
    winstreak: winner.winstreak + 1
});

// Update loser stats
const loserRef = this.db.ref(`players/${loser.id}`);
await loserRef.update({
    mmr: loser.mmr + mmrChanges.loserChange,
    losses: loser.losses + 1,
    winstreak: 0
});

// Record the match
if (!isReplaying) {
    const matchRef = this.db.ref('matches').push();
    await matchRef.set({
        id: matchRef.key,
        date: new Date().toLocaleString(),
        player1: player1Name,
        player2: player2Name,
        winner: winnerName,
        mmrChange: mmrChanges
    });
}

// Check achievements for both players
if (!isReplaying) {
    await this.checkAchievements(player1Name);
    await this.checkAchievements(player2Name);
}

return mmrChanges;
}

calculateMmrChange(winner, loser) {
const getKFactor = (player) => {
    const gamesPlayed = player.wins + player.losses;
    if (gamesPlayed < 30) return 40;
    else if (player.mmr >= 2400) return 16;
    else return 24;
};

const K_winner = getKFactor(winner);
const K_loser = getKFactor(loser);

const expectedScore = (player, opponent) => {
    return 1 / (1 + Math.pow(10, (opponent.mmr - player.mmr) / 400));
};

const E_winner = expectedScore(winner, loser);
const E_loser = expectedScore(loser, winner);

const winnerChange = Math.round(K_winner * (1 - E_winner));
const loserChange = Math.round(K_loser * (0 - E_loser));

return {
    winnerChange,
    loserChange
};
}

async removeMatch(matchId) {
if (!confirm('Are you sure you want to remove this match?')) {
    return;
}

try {
    // Remove the match from Firebase
    await this.db.ref(`matches/${matchId}`).remove();
    
    // Recalculate all stats
    await this.recalculateAllStats();
    
    // Refresh the matches display
    this.loadMatches();
    
    // Show success message
    const notification = document.createElement('div');
    notification.className = 'notification success';
    notification.textContent = 'Match removed successfully';
    document.body.appendChild(notification);
    
    setTimeout(() => notification.remove(), 3000);
} catch (error) {
    console.error('Error removing match:', error);
    alert('Error removing match: ' + error.message);
}
}

async recalculateAllStats() {
try {
    // Reset all player stats
    for (const player of this.players) {
        await this.db.ref(`players/${player.id}`).update({
            mmr: 1000,
            wins: 0,
            losses: 0,
            winstreak: 0
        });
    }

    // Get all matches
    const matchesSnapshot = await this.db.ref('matches').once('value');
    const matches = matchesSnapshot.val() || {};

    // Replay all matches in order
    for (const matchId in matches) {
        const match = matches[matchId];
        await this.recordMatch(match.player1, match.player2, match.winner, true);
    }
} catch (error) {
    console.error("Error recalculating stats:", error);
    throw new Error('Failed to recalculate stats');
}
}

async resetAllStats() {
try {
    await this.db.ref('/').set({
        players: {},
        matches: {}
    });
    console.log("Stats reset successfully");
} catch (error) {
    console.error("Error resetting stats:", error);
    throw new Error('Failed to reset stats');
}
}

getLeaderboard() {
return [...this.players].sort((a, b) => b.mmr - a.mmr);
}

getPlayerMatches(playerName) {
return this.matches.filter(m => 
    m.player1 === playerName || m.player2 === playerName
);
}

hashPassword(password) {
const shaObj = new jsSHA("SHA-256", "TEXT", { encoding: "UTF8" });
shaObj.update(password);
return shaObj.getHash("HEX");
}

initializeAchievements() {
const achievements = [
    new Achievement('first_steps', 'First Steps', 'Play your first match', '🏓', 1),
    new Achievement('opening_victory', 'Opening Victory', 'Win your first match', '⭐', 1),
    new Achievement('table_master', 'Table Master', 'Win 10 matches', '🥉', 10),
    new Achievement('ping_pong_veteran', 'Ping Pong Veteran', 'Win 25 matches', '🥈', 25),
    new Achievement('tournament_elite', 'Tournament Elite', 'Win 50 matches', '🥇', 50),
    new Achievement('triple_threat', 'Triple Threat', 'Win 3 matches in one day', '🎯', 3),
    new Achievement('friday_champion', 'Friday Champion', 'Win all matches in a Friday session', '👑', 1),
    new Achievement('winning_streak', 'Winning Streak', 'Win 5 matches in a row', '🔥', 5),
    new Achievement('perfect_game', 'Perfect Game', 'Win a match without losing a po    int', '🎱', 1),
    new Achievement('comeback_king', 'Comeback King', 'Win after being down by 5 points', '👊', 1),
    new Achievement('social_butterfly', 'Social Butterfly', 'Play against 10 different opponents', '🦋', 10),
    new Achievement('consistency', 'Consistency', 'Maintain a 50%+ win rate for 20 matches', '🎭', 20),
    new Achievement('mmr_climber', 'MMR Climber', 'Reach 1500 MMR', '📈', 1),
    new Achievement('mmr_master', 'MMR Master', 'Reach 2000 MMR', '🌟', 1),
    new Achievement('daily_dedication', 'Daily Dedication', 'Play matches on 5 different days', '📅', 5),
    new Achievement('weekly_warrior', 'Weekly Warrior', 'Play 15 matches in one week', '⚔️', 15),
    new Achievement('rivalry_master', 'Rivalry Master', 'Win 3 matches against the same opponent', '🤺', 3),
    new Achievement('underdog', 'Underdog', 'Win against someone 200 MMR higher', '🐕', 1),
    new Achievement('defensive_master', 'Defensive Master', 'Win 5 matches with fewer than 10 points against', '🛡️', 5),
    new Achievement('tournament_finalist', 'Tournament Finalist', 'Reach a tournament final', '🏆', 1)
];

achievements.forEach(achievement => {
    this.db.ref(`achievements/${achievement.id}`).set(achievement);
});
}

async checkAchievements(playerName) {
const player = this.players.find(p => p.name === playerName);
if (!player) return;

const matches = this.getPlayerMatches(playerName);
const wins = matches.filter(m => m.winner === playerName);
const today = new Date().toLocaleDateString();
const profileRef = this.db.ref(`userProfiles/${player.email.split('@')[0]}`);
const profile = (await profileRef.once('value')).val() || { achievements: [], badges: [] };

const newAchievements = [];
const newBadges = [];

// Helper function to add achievement if not already earned
const addAchievement = (id, badge) => {
    if (!profile.achievements.includes(id)) {
        newAchievements.push(id);
        newBadges.push(badge);
    }
};

// First Steps & Opening Victory (existing)
if (matches.length > 0) addAchievement('first_steps', '🏓');
if (wins.length > 0) addAchievement('opening_victory', '⭐');
if (wins.length >= 10) addAchievement('table_master', '🥉');
if (wins.length >= 25) addAchievement('ping_pong_veteran', '🥈');
if (wins.length >= 50) addAchievement('tournament_elite', '🥇');

// Daily achievements
const todayMatches = matches.filter(m => new Date(m.date).toLocaleDateString() === today);
const todayWins = todayMatches.filter(m => m.winner === playerName);
if (todayWins.length >= 3) addAchievement('triple_threat', '🎯');

// Winning streak
if (player.winstreak >= 5) addAchievement('winning_streak', '🔥');

// Perfect game
const perfectGame = matches.some(m => m.winner === playerName && m.score && m.score.winner === 11 && m.score.loser === 0);
if (perfectGame) addAchievement('perfect_game', '🎱');

// Comeback king (check match scores)
const hadComeback = matches.some(m => {
    if (m.winner !== playerName || !m.score) return false;
    return m.score.comebackFrom && m.score.comebackFrom >= 5;
});
if (hadComeback) addAchievement('comeback_king', '👊');

// Social butterfly (unique opponents)
const uniqueOpponents = new Set(matches.map(m => m.player1 === playerName ? m.player2 : m.player1));
if (uniqueOpponents.size >= 10) addAchievement('social_butterfly', '🦋');

// Consistency
const last20Matches = matches.slice(-20);
if (last20Matches.length >= 20) {
    const winRate = last20Matches.filter(m => m.winner === playerName).length / 20;
    if (winRate >= 0.5) addAchievement('consistency', '🎭');
}

// MMR achievements
if (player.mmr >= 1500) addAchievement('mmr_climber', '📈');
if (player.mmr >= 2000) addAchievement('mmr_master', '🌟');

// Daily dedication (unique days played)
const uniqueDays = new Set(matches.map(m => new Date(m.date).toLocaleDateString()));
if (uniqueDays.size >= 5) addAchievement('daily_dedication', '📅');

// Weekly warrior
const lastWeek = new Date();
lastWeek.setDate(lastWeek.getDate() - 7);
const weeklyMatches = matches.filter(m => new Date(m.date) >= lastWeek);
if (weeklyMatches.length >= 15) addAchievement('weekly_warrior', '⚔️');

// Rivalry master
const opponentWins = {};
wins.forEach(m => {
    const opponent = m.player1 === playerName ? m.player2 : m.player1;
    opponentWins[opponent] = (opponentWins[opponent] || 0) + 1;
});
if (Object.values(opponentWins).some(count => count >= 3)) {
    addAchievement('rivalry_master', '🤺');
}

// Underdog
const underdogWin = matches.some(match => {
    if (match.winner !== playerName || !match.mmrBefore) return false;
    const opponent = match.player1 === playerName ? match.player2 : match.player1;
    // Check if mmrBefore exists and has the required properties
    if (!match.mmrBefore[opponent] || !match.mmrBefore[playerName]) return false;
    return match.mmrBefore[opponent] - match.mmrBefore[playerName] >= 200;
});
if (underdogWin) addAchievement('underdog', '🐕');

// Defensive master
const defensiveWins = wins.filter(m => m.score && m.score.loser < 10).length;
if (defensiveWins >= 5) addAchievement('defensive_master', '🛡️');

// Tournament finalist (checked separately in tournament code)

// Update profile if new achievements were earned
if (newAchievements.length > 0) {
    // Get existing achievements and badges
    const existingAchievements = profile.achievements || [];
    const existingBadges = profile.badges || [];
    
    // Combine existing and new achievements/badges
    const allAchievements = [...existingAchievements, ...newAchievements];
    const allBadges = [...existingBadges, ...newBadges];
    
    await profileRef.update({
        achievements: allAchievements,
        badges: allBadges
    });

    // Show notifications for new achievements
    newAchievements.forEach((id, index) => {
        const achievement = this.achievements.find(a => a.id === id);
        if (achievement) {
            tournament.ui.showAchievementNotification(achievement);
        }
    });
}
}

async unlockAchievement(playerName, achievement) {
const profileRef = this.db.ref(`userProfiles/${playerName}`);

// Add achievement to player's profile
await profileRef.child('achievements').push(achievement.id);

// Add badge to player's collection
await profileRef.child('badges').push(achievement.badge);

// Show notification
this.ui.showAchievementNotification(achievement);
}

async getPlayerProfile(playerName) {
const snapshot = await this.db.ref(`userProfiles/${playerName}`).once('value');
return snapshot.val() || new PlayerProfile('', playerName);
}

async initializeUserProfile(email) {
const domain = email.split('@')[1];
if (domain !== 'hseschools.org') {
    throw new Error('Please use your HSE school email');
}

const name = email.split('@')[0];
const userRef = this.db.ref(`userProfiles/${name}`);
const snapshot = await userRef.once('value');

if (!snapshot.exists()) {
    const newProfile = new UserProfile(email, name);
    await userRef.set(newProfile);
    return newProfile;
}

return snapshot.val();
}

async sendMessage(fromUser, toUser, message) {
const chatId = [fromUser, toUser].sort().join('-');
const messageRef = this.db.ref(`messages/${chatId}`).push();

await messageRef.set({
    from: fromUser,
    to: toUser,
    message: message,
    timestamp: firebase.database.ServerValue.TIMESTAMP
});
}

async getMessages(user1, user2) {
const chatId = [user1, user2].sort().join('-');
const snapshot = await this.db.ref(`messages/${chatId}`).once('value');
return snapshot.val() || {};
}

async runEmailUpdateScript() {
function generateHSEEmail(fullName) {
    const [firstName, lastName] = fullName.split(' ');
    const lastPart = lastName.toLowerCase().slice(0, 5);
    const firstPart = firstName.toLowerCase().slice(0, 3);
    return `${lastPart}${firstPart}000@hsestudents.org`;
}

try {
    const snapshot = await this.db.ref('players').once('value');
    const players = snapshot.val();
    const results = [];

    for (const [playerId, player] of Object.entries(players)) {
        const email = generateHSEEmail(player.name);
        const password = 'HSEPingPong2024';

        try {
            // Create user profile
            await this.db.ref(`userProfiles/${email.split('@')[0]}`).set({
                email: email,
                name: player.name,
                achievements: [],
                stats: {
                    peakMmr: player.mmr || 1000,
                    totalGames: (player.wins || 0) + (player.losses || 0),
                    tournamentWins: 0,
                    longestStreak: player.winstreak || 0
                },
                matchHistory: [],
                badges: [],
                messages: {}
            });

            // Update player record
            await this.db.ref(`players/${playerId}`).update({
                email: email
            });

            results.push({
                name: player.name,
                email: email,
                password: password,
                status: 'success'
            });

        } catch (error) {
            results.push({
                name: player.name,
                email: email,
                status: 'error',
                error: error.message
            });
        }
    }

    return results;
} catch (error) {
    throw new Error('Failed to run update script: ' + error.message);
}
}
}

// UI Management
class TournamentUI {
constructor(system) {
this.system = system;
this.matches = [];
this.currentPage = 1;
this.itemsPerPage = 20;
this.searchTerm = '';
this.filterType = 'all';
this.initializeUI();
}

initializeUI() {
this.setupNavigation();
this.renderLeaderboard();
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

renderLeaderboard() {
const tbody = document.querySelector('#leaderboard tbody');
tbody.innerHTML = '';

this.system.getLeaderboard().forEach((player, index) => {
    const row = document.createElement('tr');
    let rankClass = '';
    if (index === 0) rankClass = 'rank-gold';
    if (index === 1) rankClass = 'rank-silver';
    if (index === 2) rankClass = 'rank-bronze';
    
    row.innerHTML = `
        <td><span class="rank-circle ${rankClass}">${index + 1}</span></td>
        <td class="player-name">
            <a href="#" class="player-link" data-player="${player.name}">
                ${player.name}
            </a>
        </td>
        <td class="text-center">${player.mmr}</td>
        <td class="text-center">${player.wins}</td>
        <td class="text-center">${player.losses}</td>
        <td class="text-center">${player.winstreak}</td>
    `;

    row.querySelector('.player-link').addEventListener('click', async (e) => {
        e.preventDefault();
        const playerName = e.target.dataset.player;
        const playerProfile = await this.system.getPlayerProfile(playerName);
        this.showPlayerProfile(playerName, playerProfile);
    });

    tbody.appendChild(row);
});
}

setupAdminPanel() {
const adminControls = document.getElementById('admin-controls');
const loginForm = document.getElementById('admin-login');

// Admin login handler
window.adminLogin = () => {
    const password = document.getElementById('admin-password').value;
    if (this.system.hashPassword(password) === this.system.adminHash) {
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
            <button onclick="tournament.ui.addPlayer()" class="btn btn-primary">Add Player</button>
        </div>

        <div class="card admin-card">
            <h3>Remove Player</h3>
            <select id="remove-player-select" class="form-input">
                <option value="">Select Player</option>
                ${this.system.players.map(p => 
                    `<option value="${p.id}">${p.name}</option>`
                ).join('')}
            </select>
            <button onclick="tournament.ui.removePlayer()" class="btn btn-danger">Remove Player</button>
        </div>

        <div class="card admin-card">
            <h3>Record Match</h3>
            <select id="player1-select" class="form-input">
                <option value="">Select Player 1</option>
                ${this.system.players.map(p => 
                    `<option value="${p.name}">${p.name}</option>`
                ).join('')}
            </select>
            <select id="player2-select" class="form-input">
                <option value="">Select Player 2</option>
                ${this.system.players.map(p => 
                    `<option value="${p.name}">${p.name}</option>`
                ).join('')}
            </select>
            <select id="winner-select" class="form-input">
                <option value="">Select Winner</option>
            </select>
            <div class="score-inputs">
                <input type="number" id="winner-score" class="form-input" placeholder="Winner Score" min="0" max="50">
                <input type="number" id="loser-score" class="form-input" placeholder="Loser Score" min="0" max="50">
            </div>
            <button onclick="tournament.ui.recordMatch()" class="btn btn-primary">Record Match</button>
        </div>

        <div class="card admin-card">
            <h3>Manage Matches</h3>
            <button onclick="tournament.ui.showMatchManager()" class="btn btn-primary">Manage Matches</button>
        </div>
    </div>
`;

// Add event listeners for player selection
const player1Select = document.getElementById('player1-select');
const player2Select = document.getElementById('player2-select');
const winnerSelect = document.getElementById('winner-select');

player1Select.addEventListener('change', () => updateWinnerOptions());
player2Select.addEventListener('change', () => updateWinnerOptions());

function updateWinnerOptions() {
    const player1 = player1Select.value;
    const player2 = player2Select.value;
    winnerSelect.innerHTML = '<option value="">Select Winner</option>';
    if (player1) winnerSelect.innerHTML += `<option value="${player1}">${player1}</option>`;
    if (player2) winnerSelect.innerHTML += `<option value="${player2}">${player2}</option>`;
}
}

async addPlayer() {
const nameInput = document.getElementById('new-player-name');
const name = nameInput.value.trim();
if (name) {
    try {
        await this.system.addPlayer(name);
        nameInput.value = '';
        this.renderLeaderboard();
        this.renderAdminControls();
        alert(`Player ${name} added successfully!`);
    } catch (error) {
        alert(error.message);
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
    // Remove from Firebase
    await this.system.db.ref(`players/${playerId}`).remove();
    alert('Player removed successfully');
    this.renderAdminControls(); // Refresh the admin panel
} catch (error) {
    console.error('Error removing player:', error);
    alert('Error removing player');
}
}

async recordMatch() {
const player1 = document.getElementById('player1-select').value;
const player2 = document.getElementById('player2-select').value;
const winnerScore = parseInt(document.getElementById('winner-score').value);
const loserScore = parseInt(document.getElementById('loser-score').value);

if (!player1 || !player2) {
    alert('Please select both players');
    return;
}

if (player1 === player2) {
    alert('Please select different players');
    return;
}

// Updated score validation
if (isNaN(winnerScore) || isNaN(loserScore) || 
    winnerScore < 0 || loserScore < 0 || 
    winnerScore > 50 || loserScore > 50) {
    alert('Please enter valid scores (0-50)');
    return;
}

if (winnerScore <= loserScore) {
    alert('Winner score must be higher than loser score');
    return;
}

// Validate win by 2 rule
if (winnerScore < 21 || (winnerScore - loserScore) < 2) {
    alert('Invalid score: Game must be won by 2 points and reach at least 21 points');
    return;
}

// Determine winner
const winner = winnerScore > loserScore ? player1 : player2;

try {
    // Record match with scores
    const matchRef = this.system.db.ref('matches').push();
    await matchRef.set({
        player1: player1,
        player2: player2,
        winner: winner,
        date: new Date().toISOString(),
        score: {
            winner: winnerScore,
            loser: loserScore,
            comebackFrom: null // This could be calculated if needed
        }
    });

    // Update MMR and stats
    const mmrChanges = await this.system.recordMatch(player1, player2, winner);
    
    alert(`Match recorded! MMR changes: ${player1}: ${mmrChanges.player1}, ${player2}: ${mmrChanges.player2}`);
    
    // Reset form
    document.getElementById('player1-select').value = '';
    document.getElementById('player2-select').value = '';
    document.getElementById('winner-score').value = '';
    document.getElementById('loser-score').value = '';

} catch (error) {
    console.error('Error recording match:', error);
    alert('Error recording match');
}
}

showMatchHistory(playerName) {
const modal = document.getElementById('match-history-modal');
const modalPlayerName = document.getElementById('modal-player-name');
const matchHistoryBody = document.getElementById('match-history-body');

modalPlayerName.textContent = `${playerName}'s Match History`;
matchHistoryBody.innerHTML = '';

const matches = this.system.getPlayerMatches(playerName).reverse();

if (matches.length === 0) {
    matchHistoryBody.innerHTML = '<tr><td colspan="4">No matches found.</td></tr>';
} else {
    matches.forEach(match => {
        const opponent = match.player1 === playerName ? match.player2 : match.player1;
        const result = match.winner === playerName ? 'Win' : 'Loss';
        const mmrChange = match.winner === playerName ? 
            `+${match.mmrChange.winnerChange}` : 
            `${match.mmrChange.loserChange}`;

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${match.date}</td>
            <td>${opponent}</td>
            <td>${result}</td>
            <td>${mmrChange}</td>
        `;
        matchHistoryBody.appendChild(row);
    });
}

modal.style.display = 'flex';
}

showMatchList() {
const modal = document.getElementById('match-list-modal');
const matchListBody = document.getElementById('match-list-body');

matchListBody.innerHTML = '';

const matches = [...this.system.matches].reverse();

if (matches.length === 0) {
    matchListBody.innerHTML = '<tr><td colspan="5">No matches found.</td></tr>';
} else {
    matches.forEach((match) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${match.date}</td>
            <td>${match.player1}</td>
            <td>${match.winner}</td>
            <td><button onclick="tournament.ui.matchManager.removeMatch('${match.id}')" class="btn btn-danger btn-sm">Remove</button></td>
        `;
        matchListBody.appendChild(row);
    });
}

modal.style.display = 'flex';
}

async removeMatch(matchId) {
if (confirm('Are you sure you want to remove this match?')) {
    try {
        await this.system.removeMatch(matchId);
        this.loadMatches();
    } catch (error) {
        alert('Error removing match: ' + error.message);
    }
}
}

async resetStats() {
if (confirm('Are you sure you want to reset all stats? This cannot be undone.')) {
    try {
        await this.system.resetAllStats();
        this.renderLeaderboard();
        alert('All stats have been reset.');
    } catch (error) {
        alert('Failed to reset stats: ' + error.message);
    }
}
}

closeModal(modalId) {
const modal = document.getElementById(modalId);
modal.style.display = 'none';
}

showAchievementNotification(achievement) {
const notification = document.createElement('div');
notification.className = 'achievement-notification';
notification.innerHTML = `
    <div class="achievement-badge">${achievement.badge}</div>
    <div class="achievement-info">
        <h4>${achievement.name}</h4>
        <p>${achievement.description}</p>
    </div>
`;

document.body.appendChild(notification);
gsap.from(notification, {
    y: 100,
    opacity: 0,
    duration: 0.5
});

setTimeout(() => {
    gsap.to(notification, {
        y: 100,
        opacity: 0,
        duration: 0.5,
        onComplete: () => notification.remove()
    });
}, 3000);
}

async renderProfile(playerName) {
const profile = await this.system.getPlayerProfile(playerName);
const matches = this.system.getPlayerMatches(playerName);
const content = document.getElementById('profile-content');

content.innerHTML = `
    <div class="profile-header">
        <h2>${profile.name}</h2>
        <p class="text-muted">Matches: ${playerMatches.length} | Wins: ${wins}</p>
        <div class="badge-collection">
            ${profile.achievements.map(achievementId => {
                const achievement = this.system.achievements.find(a => a.id === achievementId);
                return achievement ? `<div class="badge" title="${achievement.name}">${achievement.badge}</div>` : '';
            }).join('')}
        </div>
    </div>

    <div class="stats-section">
        <div class="mmr-chart-container">
            <h3>MMR History</h3>
            <canvas id="mmrHistoryChart"></canvas>
            <div class="mmr-details">
                ${this.renderMmrHistory(playerMatches, profile.name)}
            </div>
        </div>
    </div>

    <div class="achievements-section">
        <h3>Achievements</h3>
        <div class="achievements-grid">
            ${this.renderDetailedAchievements(profile, playerMatches)}
        </div>
    </div>
`;

// Add this after setting the profile-content innerHTML
const ctx = document.getElementById('mmrHistoryChart').getContext('2d');
new Chart(ctx, {
    type: 'line',
    data: {
        labels: playerMatches.map(m => new Date(m.date).toLocaleDateString()),
        datasets: [{
            label: 'MMR',
            data: playerMatches.map(m => m.mmrAfter),
            borderColor: '#2563eb',
            tension: 0.1
        }]
    },
    options: {
        responsive: true,
        plugins: {
            legend: {
                display: false
            }
        },
        scales: {
            y: {
                beginAtZero: false
            }
        }
    }
});
}

async runEmailUpdate() {
if (!confirm('This will generate HSE emails for all players. Continue?')) {
    return;
}

const resultsDiv = document.getElementById('email-update-results');
const contentDiv = resultsDiv.querySelector('.results-content');

try {
    resultsDiv.classList.remove('hidden');
    contentDiv.innerHTML = '<p>Running update script...</p>';
    
    const results = await this.system.runEmailUpdateScript();
    
    // Display results in a table
    let html = `
        <table class="leaderboard-table">
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Password</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
    `;

    results.forEach(result => {
        html += `
            <tr>
                <td>${result.name}</td>
                <td>${result.email}</td>
                <td>${result.status === 'success' ? 'HSEPingPong2024' : '-'}</td>
                <td>
                    <span class="status-badge ${result.status}">
                        ${result.status === 'success' ? '✓' : '✗'}
                    </span>
                    ${result.error ? `<span class="error-message">${result.error}</span>` : ''}
                </td>
            </tr>
        `;
    });

    html += `
            </tbody>
        </table>
        <button onclick="tournament.ui.downloadResults(${JSON.stringify(results)})" class="btn btn-secondary mt-4">
            Download Results
        </button>
    `;

    contentDiv.innerHTML = html;

} catch (error) {
    contentDiv.innerHTML = `<p class="error">Error: ${error.message}</p>`;
}
}

downloadResults(results) {
const csv = [
    ['Name', 'Email', 'Password', 'Status'].join(','),
    ...results.map(r => [
        r.name,
        r.email,
        r.status === 'success' ? 'HSEPingPong2024' : '-',
        r.status
    ].join(','))
].join('\n');

const blob = new Blob([csv], { type: 'text/csv' });
const url = window.URL.createObjectURL(blob);
const a = document.createElement('a');
a.setAttribute('hidden', '');
a.setAttribute('href', url);
a.setAttribute('download', 'email_update_results.csv');
document.body.appendChild(a);
a.click();
document.body.removeChild(a);
}

async loginProfile() {
const email = document.getElementById('profile-email').value.trim();
const password = document.getElementById('profile-password').value.trim();
const errorDiv = document.getElementById('profile-error') || 
    document.createElement('div');

errorDiv.id = 'profile-error';
errorDiv.className = 'error-message mt-4';
document.getElementById('profile-login').appendChild(errorDiv);

// Validate email format
const emailRegex = /^[a-z]{1,5}[a-z]{1,3}000@hsestudents\.org$/;
if (!emailRegex.test(email)) {
    errorDiv.textContent = 'Please enter a valid HSE student email';
    return;
}

// Check password
if (password !== 'HSEPingPong2024') {
    errorDiv.textContent = 'Incorrect password';
    return;
}

try {
    // Get user profile from database
    const userId = email.split('@')[0]; // Get the part before @
    const profileRef = this.system.db.ref(`userProfiles/${userId}`);
    const snapshot = await profileRef.once('value');
    const profile = snapshot.val();

    if (!profile) {
        errorDiv.textContent = 'No profile found for this email';
        return;
    }

    // Store current user
    this.system.currentUser = {
        email: email,
        name: profile.name,
        userId: userId
    };

    // Hide login form and show profile content
    document.getElementById('profile-login').classList.add('hidden');
    document.getElementById('profile-content').classList.remove('hidden');

    // Load profile data
    await this.loadProfileData(email);

} catch (error) {
    console.error('Error loading profile:', error);
    errorDiv.textContent = 'Error loading profile. Please try again.';
}
}

async loadProfileData(email) {
console.log('Loading profile for:', email);
const userId = email.split('@')[0];
const profileRef = this.system.db.ref(`userProfiles/${userId}`);

try {
    const snapshot = await profileRef.once('value');
    const profile = snapshot.val();
    console.log('Profile data:', profile);

    // Initialize achievements array if it doesn't exist
    if (!profile.achievements) {
        profile.achievements = [];
    }

    // Get player matches and calculate stats
    const playerMatches = this.system.matches.filter(match => 
        match.player1 === profile.name || match.player2 === profile.name
    );
    const wins = playerMatches.filter(match => match.winner === profile.name).length;

    // Check and grant missing achievements
    const updatedAchievements = [...profile.achievements];
    const updatedBadges = profile.badges || [];

    // First Steps Achievement
    if (playerMatches.length > 0 && !profile.achievements.includes('first_steps')) {
        updatedAchievements.push('first_steps');
        updatedBadges.push('🏓');
    }

    // Opening Victory Achievement
    if (wins > 0 && !profile.achievements.includes('opening_victory')) {
        updatedAchievements.push('opening_victory');
        updatedBadges.push('⭐');
    }

    // Table Master Achievement
    if (wins >= 10 && !profile.achievements.includes('table_master')) {
        updatedAchievements.push('table_master');
        updatedBadges.push('🥉');
    }

    // Update profile if new achievements were earned
    if (updatedAchievements.length > profile.achievements.length) {
        await profileRef.update({
            achievements: updatedAchievements,
            badges: updatedBadges
        });
        profile.achievements = updatedAchievements;
        profile.badges = updatedBadges;
    }

    // Get achievements data for display
    const achievementsRef = this.system.db.ref('achievements');
    const achievementsSnapshot = await achievementsRef.once('value');
    const allAchievements = achievementsSnapshot.val() || {
        first_steps: {
            id: 'first_steps',
            name: 'First Steps',
            description: 'Play your first match',
            badge: '🏓'
        },
        opening_victory: {
            id: 'opening_victory',
            name: 'Opening Victory',
            description: 'Win your first match',
            badge: '⭐'
        },
        table_master: {
            id: 'table_master',
            name: 'Table Master',
            description: 'Win 10 matches',
            badge: '🥉'
        }
    };

    // Render profile content
    document.getElementById('profile-content').innerHTML = `
        <div class="profile-header">
            <h2>${profile.name}</h2>
            <p class="text-muted">Matches: ${playerMatches.length} | Wins: ${wins}</p>
            <div class="badge-collection">
                ${profile.achievements.map(achievementId => {
                    const achievement = this.system.achievements.find(a => a.id === achievementId);
                    return achievement ? `<div class="badge" title="${achievement.name}">${achievement.badge}</div>` : '';
                }).join('')}
            </div>
        </div>

        <div class="stats-section">
            <div class="mmr-chart-container">
                <h3>MMR History</h3>
                <canvas id="mmrHistoryChart"></canvas>
                <div class="mmr-details">
                    ${this.renderMmrHistory(playerMatches, profile.name)}
                </div>
            </div>
        </div>

        <div class="achievements-section">
            <h3>Achievements</h3>
            <div class="achievements-grid">
                ${this.renderDetailedAchievements(profile, playerMatches)}
            </div>
        </div>
    `;

} catch (error) {
    console.error('Error loading profile:', error);
    document.getElementById('profile-content').innerHTML = `
        <div class="error-message">
            <h3>Error Loading Profile</h3>
            <p>${error.message}</p>
        </div>
    `;
}
}

renderDetailedAchievements(profile, matches) {
const achievements = [
    { id: 'first_steps', name: 'First Steps', description: 'Play your first match', badge: '🏓', requirement: '1 match played', required: 1, current: matches.length },
    { id: 'opening_victory', name: 'Opening Victory', description: 'Win your first match', badge: '⭐', requirement: '1 win', required: 1, current: matches.filter(m => m.winner === profile.name).length },
    { id: 'table_master', name: 'Table Master', description: 'Win 10 matches', badge: '🥉', requirement: '10 wins', required: 10, current: matches.filter(m => m.winner === profile.name).length },
    { id: 'ping_pong_veteran', name: 'Ping Pong Veteran', description: 'Win 25 matches', badge: '🥈', requirement: '25 wins', required: 25, current: matches.filter(m => m.winner === profile.name).length },
    { id: 'tournament_elite', name: 'Tournament Elite', description: 'Win 50 matches', badge: '🥇', requirement: '50 wins', required: 50, current: matches.filter(m => m.winner === profile.name).length },
    { id: 'triple_threat', name: 'Triple Threat', description: 'Win 3 matches in one day', badge: '🎯', requirement: '3 wins in 24h', required: 3, current: this.calculateMaxDailyWins(matches, profile.name) },
    { id: 'friday_champion', name: 'Friday Champion', description: 'Win all matches in a Friday session', badge: '👑', requirement: 'Perfect Friday', required: 1, current: this.checkPerfectFriday(matches, profile.name) ? 1 : 0 },
    { id: 'winning_streak', name: 'Winning Streak', description: 'Win 5 matches in a row', badge: '🔥', requirement: '5 consecutive wins', required: 5, current: this.calculateMaxStreak(matches, profile.name) },
    { id: 'perfect_game', name: 'Perfect Game', description: 'Win a match without losing a point', badge: '🎱', requirement: '21-0 victory', required: 1, current: matches.filter(m => m.winner === profile.name && m.score?.loser === 0).length },
    { id: 'comeback_king', name: 'Comeback King', description: 'Win after being down by 5 points', badge: '👊', requirement: '5+ point comeback', required: 1, current: this.checkComeback(matches, profile.name) },
    { id: 'social_butterfly', name: 'Social Butterfly', description: 'Play against 10 different opponents', badge: '🦋', requirement: '10 unique opponents', required: 10, current: this.countUniqueOpponents(matches, profile.name) },
    { id: 'consistency', name: 'Consistency', description: 'Maintain a 50%+ win rate for 20 matches', badge: '🎭', requirement: '>50% in 20 matches', required: 1, current: this.checkConsistency(matches, profile.name) ? 1 : 0 },
    { id: 'mmr_climber', name: 'MMR Climber', description: 'Reach 1500 MMR', badge: '📈', requirement: '1500 MMR', required: 1500, current: profile.mmr || 0 },
    { id: 'mmr_master', name: 'MMR Master', description: 'Reach 2000 MMR', badge: '🌟', requirement: '2000 MMR', required: 2000, current: profile.mmr || 0 },
    { id: 'daily_dedication', name: 'Daily Dedication', description: 'Play matches on 5 different days', badge: '📅', requirement: '5 different days', required: 5, current: this.countUniqueDays(matches) },
    { id: 'weekly_warrior', name: 'Weekly Warrior', description: 'Play 15 matches in one week', badge: '⚔️', requirement: '15 matches/week', required: 15, current: this.calculateMaxWeeklyMatches(matches) },
    { id: 'rivalry_master', name: 'Rivalry Master', description: 'Win 3 matches against the same opponent', badge: '🤺', requirement: '3 wins vs same player', required: 3, current: this.calculateMaxWinsVsSingleOpponent(matches, profile.name) },
    { id: 'underdog', name: 'Underdog', description: 'Win against someone 200 MMR higher', badge: '🐕', requirement: 'Beat +200 MMR player', required: 1, current: this.checkUnderdogWin(matches, profile.name) ? 1 : 0 },
    { id: 'defensive_master', name: 'Defensive Master', description: 'Win 5 matches with fewer than 10 points against', badge: '🛡️', requirement: '5 wins <10 points against', required: 5, current: matches.filter(m => m.winner === profile.name && m.score?.loser < 10).length },
    { id: 'tournament_finalist', name: 'Tournament Finalist', description: 'Reach a tournament final', badge: '🏆', requirement: 'Reach finals', required: 1, current: profile.reachedFinal ? 1 : 0 }
];

return achievements.map(achievement => {
    const percentage = Math.min((achievement.current / achievement.required) * 100, 100);
    const unlocked = achievement.current >= achievement.required;
    
    return `
        <div class="achievement-card ${unlocked ? 'unlocked' : 'locked'}">
            <div class="achievement-badge">${achievement.badge}</div>
            <div class="achievement-info">
                <h4>${achievement.name}</h4>
                <p>${achievement.description}</p>
                <div class="achievement-requirement">
                    <span>${achievement.requirement}</span>
                    ${!unlocked ? `
                        <div class="progress-bar">
                            <div class="progress" style="width: ${percentage}%"></div>
                        </div>
                        <span class="progress-text">${achievement.current}/${achievement.required}</span>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
}).join('');
}

renderMmrHistory(matches, playerName) {
const mmrChanges = matches.map(match => {
    const isWinner = match.winner === playerName;
    const opponent = match.player1 === playerName ? match.player2 : match.player1;
    const mmrChange = isWinner ? match.mmrChange?.winnerChange : match.mmrChange?.loserChange;
    const date = new Date(match.date).toLocaleDateString();
    
    return `
        <div class="mmr-change-entry ${isWinner ? 'win' : 'loss'}">
            <span class="date">${date}</span>
            <span class="result">${isWinner ? 'Won' : 'Lost'} vs ${opponent}</span>
            <span class="mmr-change">${mmrChange >= 0 ? '+' : ''}${mmrChange} MMR</span>
        </div>
    `;
}).join('');

return `<div class="mmr-history">${mmrChanges}</div>`;
}

showMatchManager() {
const modal = document.createElement('div');
modal.className = 'modal';
modal.id = 'match-manager-modal';
modal.innerHTML = `
    <div class="modal-content match-manager-content">
        <div class="modal-header">
            <h3>Manage Matches</h3>
            <button class="modal-close" onclick="tournament.ui.closeModal('match-manager-modal')">&times;</button>
        </div>
        <div class="match-manager-controls">
            <div class="search-filter">
                <input type="text" id="match-search" placeholder="Search players..." class="form-input">
                <select id="match-filter" class="form-input">
                    <option value="all">All Matches</option>
                    <option value="today">Today</option>
                    <option value="week">This Week</option>
                    <option value="month">This Month</option>
                </select>
            </div>
        </div>
        <div class="match-manager-body">
            <table class="match-table">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Players</th>
                        <th>Winner</th>
                        <th>Score</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody id="match-manager-tbody">
                </tbody>
            </table>
        </div>
        <div class="match-manager-pagination">
            <button id="prev-page" class="btn btn-secondary">&lt; Previous</button>
            <span id="page-info">Page 1 of 1</span>
            <button id="next-page" class="btn btn-secondary">Next &gt;</button>
        </div>
    </div>
`;

document.body.appendChild(modal);
modal.style.display = 'flex';
this.loadMatches();
this.setupEventListeners();
}

setupEventListeners() {
document.getElementById('match-search').addEventListener('input', (e) => {
    this.searchTerm = e.target.value.toLowerCase();
    this.currentPage = 1;
    this.renderMatches();
});

document.getElementById('match-filter').addEventListener('change', (e) => {
    this.filterType = e.target.value;
    this.currentPage = 1;
    this.renderMatches();
});

document.getElementById('prev-page').addEventListener('click', () => {
    if (this.currentPage > 1) {
        this.currentPage--;
        this.renderMatches();
    }
});

document.getElementById('next-page').addEventListener('click', () => {
    const maxPages = Math.ceil(this.getFilteredMatches().length / this.itemsPerPage);
    if (this.currentPage < maxPages) {
        this.currentPage++;
        this.renderMatches();
    }
});
}

async loadMatches() {
this.matches = [...this.system.matches].sort((a, b) => 
    new Date(b.date) - new Date(a.date)
);
this.renderMatches();
this.updateStats();
}

getFilteredMatches() {
let filtered = [...this.matches];

// Apply search filter
if (this.searchTerm) {
    filtered = filtered.filter(match => 
        match.player1.toLowerCase().includes(this.searchTerm) ||
        match.player2.toLowerCase().includes(this.searchTerm)
    );
}

// Apply time filter
const now = new Date();
switch (this.filterType) {
    case 'today':
        filtered = filtered.filter(match => 
            new Date(match.date).toDateString() === now.toDateString()
        );
        break;
    case 'week':
        const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
        filtered = filtered.filter(match => 
            new Date(match.date) > weekAgo
        );
        break;
    case 'month':
        const monthAgo = new Date(now.setMonth(now.getMonth() - 1));
        filtered = filtered.filter(match => 
            new Date(match.date) > monthAgo
        );
        break;
}

return filtered;
}

renderMatches() {
const tbody = document.getElementById('match-manager-tbody');
const filteredMatches = this.getFilteredMatches();
const startIndex = (this.currentPage - 1) * this.itemsPerPage;
const endIndex = startIndex + this.itemsPerPage;
const matchesToShow = filteredMatches.slice(startIndex, endIndex);

tbody.innerHTML = matchesToShow.map(match => `
    <tr data-match-id="${match.id}">
        <td>${new Date(match.date).toLocaleString()}</td>
        <td>
            <div class="match-players">
                ${match.player1} vs ${match.player2}
            </div>
        </td>
        <td>${match.winner}</td>
        <td>
            ${match.score ? `${match.score.winner} - ${match.score.loser}` : 'No score'}
        </td>
        <td>
            <button onclick="tournament.ui.removeMatch('${match.id}')" 
                class="btn btn-danger btn-sm">Remove</button>
        </td>
    </tr>
`).join('');

// Update pagination
const maxPages = Math.ceil(filteredMatches.length / this.itemsPerPage);
document.getElementById('page-info').textContent = `Page ${this.currentPage} of ${maxPages}`;
document.getElementById('prev-page').disabled = this.currentPage === 1;
document.getElementById('next-page').disabled = this.currentPage === maxPages;
}

updateStats() {
const today = new Date().toDateString();
const todayMatches = this.matches.filter(match => 
    new Date(match.date).toDateString() === today
).length;

document.getElementById('total-matches').textContent = this.matches.length;
document.getElementById('today-matches').textContent = todayMatches;
}

async updateScore(matchId, isWinnerScore) {
const row = document.querySelector(`tr[data-match-id="${matchId}"]`);
const [winnerInput, loserInput] = row.querySelectorAll('.score-input');

try {
    await this.system.db.ref(`matches/${matchId}`).update({
        score: {
            winner: parseInt(winnerInput.value) || 0,
            loser: parseInt(loserInput.value) || 0
        }
    });
    
    await this.system.recalculateAllStats();
    this.loadMatches();
} catch (error) {
    alert('Error updating match: ' + error.message);
}
}

async removeMatch(matchId) {
if (confirm('Are you sure you want to remove this match?')) {
    try {
        await this.system.removeMatch(matchId);
        this.loadMatches();
    } catch (error) {
        alert('Error removing match: ' + error.message);
    }
}
}
}
// Initialize the tournament system
const tournament = {
    system: null,
    ui: null
};

// Initialize both parts
tournament.system = new TournamentSystem();
tournament.ui = new TournamentUI(tournament.system);

// Close modal when clicking outside content
window.onclick = function(event) {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
};

// Add Date prototype extension for getting week number
Date.prototype.getWeek = function() {
    const firstDayOfYear = new Date(this.getFullYear(), 0, 1);
    const pastDaysOfYear = (this - firstDayOfYear) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
};