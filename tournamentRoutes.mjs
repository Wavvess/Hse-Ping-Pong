// tournamentRoutes.mjs
import express from "express";
import tournamentSystem from "./tournamentSystem.mjs";

const router = express.Router();

// Players routes
router.get("/players", async (req, res) => {
  try {
    const players = await tournamentSystem.getPlayers();
    res.json(players);
  } catch (error) {
    console.error("Error getting players:", error);
    res.status(500).json({ error: "Failed to get players" });
  }
});

router.post("/players", async (req, res) => {
  const { name } = req.body;
  try {
    await tournamentSystem.addPlayer(name);
    res.status(201).json({ message: "Player added successfully" });
  } catch (error) {
    console.error("Error adding player:", error);
    res.status(400).json({ error: error.message });
  }
});

router.delete("/players/:id", async (req, res) => {
  const playerId = req.params.id;
  try {
    await tournamentSystem.removePlayer(playerId);
    res.json({ message: "Player removed successfully" });
  } catch (error) {
    console.error("Error removing player:", error);
    res.status(500).json({ error: error.message });
  }
});

// Matches routes
router.get("/matches", async (req, res) => {
  try {
    const matches = await tournamentSystem.getMatches();
    res.json(matches);
  } catch (error) {
    console.error("Error getting matches:", error);
    res.status(500).json({ error: "Failed to get matches" });
  }
});

router.post("/matches", async (req, res) => {
  const { player1, player2, winner, winnerScore, loserScore } = req.body;
  try {
    await tournamentSystem.recordMatch(player1, player2, winner, winnerScore, loserScore);
    res.status(201).json({ message: "Match recorded successfully" });
  } catch (error) {
    console.error("Error recording match:", error);
    res.status(400).json({ error: error.message });
  }
});

router.delete("/matches/:id", async (req, res) => {
  const matchId = req.params.id;
  try {
    await tournamentSystem.removeMatch(matchId);
    res.json({ message: "Match removed successfully" });
  } catch (error) {
    console.error("Error removing match:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
