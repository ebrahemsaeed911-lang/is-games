import { canvas } from "./canvas.js";
import { gameState } from "./state.js";
import {
  initGame,
  flap,
  pauseGame,
  resetGame,
  resumeGame,
  togglePause,
} from "./game.js";
import { saveBestScore } from "./storage.js";

const startBtn = document.getElementById("startBtn");
const pauseBtn = document.getElementById("pauseBtn");
const resumeBtn = document.getElementById("resumeBtn");
const pauseRestartBtn = document.getElementById("pauseRestartBtn");

// sounds.js appends its mute button to <body>; move it beside the score.
const soundToggle = document.getElementById("sound-toggle");
const scoreGroup = document.querySelector(".flappy-game__topbar-group--score");

if (soundToggle && scoreGroup) {
  scoreGroup.prepend(soundToggle);
}

// Mouse and touch
canvas.addEventListener("pointerdown", (event) => {
  if (gameState.status === "paused") return;

  event.preventDefault();
  flap();
});

// Keyboard
document.addEventListener("keydown", (event) => {
  // Escape toggles pause only for a running or paused game.
  if (event.code === "Escape") {
    if (gameState.status !== "playing" && gameState.status !== "paused") return;

    event.preventDefault();
    togglePause();
    document.activeElement?.blur?.();
    return;
  }

  if (event.code !== "Space" || event.repeat) return;

  if (gameState.status === "paused") {
    // Swallow the key so it cannot queue a flap behind the pause overlay.
    event.preventDefault();
    return;
  }

  // Avoid double activation when the button has focus
  if (event.target === startBtn) return;

  event.preventDefault();
  flap();
});

// Start / Restart button
startBtn.addEventListener("click", () => {
  if (gameState.status === "paused") return;

  if (gameState.status === "idle") {
    flap();
  } else {
    resetGame();
  }
});

// ==========================================
// PAUSE CONTROLS
// ==========================================

pauseBtn?.addEventListener("click", () => {
  pauseGame();
  document.activeElement?.blur?.();
});

resumeBtn?.addEventListener("click", () => {
  resumeGame();
  document.activeElement?.blur?.();
});

pauseRestartBtn?.addEventListener("click", () => {
  resetGame();
  document.activeElement?.blur?.();
});

// ==========================================
// LIFECYCLE
// ==========================================

document.addEventListener("visibilitychange", () => {
  // Leaving the tab freezes a running game and keeps it paused on return, so
  // the player resumes explicitly without losing progress.
  if (document.hidden) {
    pauseGame();
  }
});

// Keep the best score safe if the page is closed mid-game
window.addEventListener("pagehide", () => {
  pauseGame();
  saveBestScore(gameState.bestScore);
});

// ==========================================
// INITIALIZE
// ==========================================

initGame();
