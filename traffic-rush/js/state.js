import { CONFIG } from "./config.js";

function readBestScore() {
  try {
    const stored = window.localStorage.getItem(CONFIG.storageKey);

    if (stored === null) return 0;

    const best = Number.parseInt(stored, 10);
    return Number.isFinite(best) && best > 0 ? best : 0;
  } catch {
    // Storage can be unavailable (private mode, blocked site data).
    return 0;
  }
}

export function saveBestScore(score) {
  try {
    const value = Math.max(0, Math.floor(Number(score) || 0));
    window.localStorage.setItem(CONFIG.storageKey, String(value));
  } catch {
    // Ignore storage errors: the best score stays in memory.
  }
}

export const gameState = {
  status: "idle",

  player: null,
  cars: [],

  score: 0,
  bestScore: readBestScore(),
  newBest: false,

  scroll: 0,
  elapsed: 0,
  spawnTimer: CONFIG.initialSpawnDelay,

  lastSafeLane: 0,
  lastSingleLane: 0,
  lastStyleIndex: -1,
  multiStreak: 0,
  lastSpawnAt: 0,
  laneSpawnCounts: [],
  lastBlockedSignature: "",

  animId: null,
  lastFrameTime: 0,
};
