const STORAGE_KEY = "isGames:flappy-bird:best";

export function loadBestScore() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);

    if (stored === null) return 0;

    const best = Number.parseInt(stored, 10);

    return Number.isFinite(best) && best > 0 ? best : 0;
  } catch {
    // Storage can be unavailable (private mode, blocked site data).
    return 0;
  }
}

export function saveBestScore(best) {
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      String(Math.max(0, Math.floor(Number(best) || 0))),
    );
  } catch {
    // Ignore storage errors: the game keeps the best score in memory.
  }
}
