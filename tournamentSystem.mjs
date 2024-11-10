// tournamentSystem.mjs
import admin from "./firebaseAdmin.mjs";

const db = admin.database();

const tournamentSystem = {
  async getPlayers() {
    const snapshot = await db.ref("players").once("value");
    const data = snapshot.val();
    const players = [];
    if (data) {
      for (const [id, player] of Object.entries(data)) {
        players.push({ id, ...player });
      }
    }
    return players;
  },

  async addPlayer(name) {
    const playersSnapshot = await db.ref("players").once("value");
    const playersData = playersSnapshot.val();
    if (playersData) {
      for (const player of Object.values(playersData)) {
        if (player.name.toLowerCase() === name.toLowerCase()) {
          throw new Error("Player already exists");
        }
      }
    }

    const newPlayer = {
      name: name,
      mmr: 1000,
      wins: 0,
      losses: 0,
      winstreak: 0,
    };

    const newPlayerRef = db.ref("players").push();
    await newPlayerRef.set(newPlayer);
  },

  async removePlayer(playerId) {
    await db.ref(`players/${playerId}`).remove();
  },

  async getMatches() {
    const snapshot = await db.ref("matches").once("value");
    const data = snapshot.val();
    const matches = data ? Object.values(data) : [];
    return matches;
  },

  async recordMatch(player1Name, player2Name, winnerName, winnerScore, loserScore) {
    // Fetch players
    const playersSnapshot = await db.ref("players").once("value");
    const playersData = playersSnapshot.val();
    const players = [];
    if (playersData) {
      for (const [id, player] of Object.entries(playersData)) {
        players.push({ id, ...player });
      }
    }

    const player1 = players.find((p) => p.name === player1Name);
    const player2 = players.find((p) => p.name === player2Name);

    if (!player1 || !player2) {
      throw new Error("Players not found");
    }

    const winner = winnerName === player1Name ? player1 : player2;
    const loser = winnerName === player1Name ? player2 : player1;

    // Calculate MMR changes
    const mmrChanges = this.calculateMmrChange(winner, loser);

    // Update winner stats
    await db.ref(`players/${winner.id}`).update({
      mmr: winner.mmr + mmrChanges.winnerChange,
      wins: winner.wins + 1,
      winstreak: winner.winstreak + 1,
    });

    // Update loser stats
    await db.ref(`players/${loser.id}`).update({
      mmr: loser.mmr + mmrChanges.loserChange,
      losses: loser.losses + 1,
      winstreak: 0,
    });

    // Record the match
    const matchRef = db.ref("matches").push();
    await matchRef.set({
      id: matchRef.key,
      date: new Date().toISOString(),
      player1: player1Name,
      player2: player2Name,
      winner: winnerName,
      mmrChange: mmrChanges,
      score: {
        winner: winnerScore,
        loser: loserScore,
      },
    });
  },

  async removeMatch(matchId) {
    await db.ref(`matches/${matchId}`).remove();
    // Recalculate all stats
    await this.recalculateAllStats();
  },

  async recalculateAllStats() {
    // Reset all player stats
    const playersSnapshot = await db.ref("players").once("value");
    const playersData = playersSnapshot.val();
    if (playersData) {
      for (const [id, player] of Object.entries(playersData)) {
        await db.ref(`players/${id}`).update({
          mmr: 1000,
          wins: 0,
          losses: 0,
          winstreak: 0,
        });
      }
    }

    // Get all matches
    const matchesSnapshot = await db.ref("matches").once("value");
    const matchesData = matchesSnapshot.val();
    const matches = matchesData ? Object.values(matchesData) : [];

    // Replay all matches in order
    for (const match of matches.sort((a, b) => new Date(a.date) - new Date(b.date))) {
      await this.recordMatch(
        match.player1,
        match.player2,
        match.winner,
        match.score.winner,
        match.score.loser
      );
    }
  },

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
      loserChange,
    };
  },
};

export default tournamentSystem;
