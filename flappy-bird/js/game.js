import { CONFIG } from "./config.js";
import { gameState } from "./state.js";
import { ctx, W, H, scaleX, scaleY, setResizeHandler } from "./canvas.js";
import { createBird } from "./bird.js";
import { createPipe, updatePipes, removeOffscreenPipes } from "./pipes.js";
import { checkCollision } from "./collision.js";
import { render, updateScore, updateBestScore } from "./renderer.js";
import { saveBestScore } from "./storage.js";

const startBtn = document.getElementById("startBtn");
const pauseBtn = document.getElementById("pauseBtn");
const pauseOverlay = document.getElementById("pauseOverlay");
const pauseScore = document.getElementById("pauseScore");

const sound = (name) => window.playSound?.(name);

// Keeps the pause control and overlay in sync with the current game status.
function syncPauseUi() {
  const playing = gameState.status === "playing";

  if (pauseBtn) pauseBtn.hidden = !playing;
  if (pauseOverlay) pauseOverlay.hidden = gameState.status !== "paused";
  if (pauseScore) pauseScore.textContent = String(gameState.score);
}

// ==========================================
// INITIALIZATION
// ==========================================

export function initGame() {
  gameState.status = "idle";
  gameState.bird = createBird();
  gameState.pipes = [];
  gameState.score = 0;
  gameState.newBest = false;

  gameState.frameCount = 0;
  gameState.nextPipeFrame = CONFIG.pipeInterval;

  gameState.animId = null;
  gameState.lastFrameTime = 0;

  updateScore(gameState.score);
  updateBestScore(gameState.bestScore);

  startBtn.textContent = "ابدأ اللعبة";

  syncPauseUi();

  render(ctx, gameState);
}

// ==========================================
// GAME PHYSICS & UPDATE
// ==========================================

function update(delta) {
  const bird = gameState.bird;

  gameState.frameCount += delta;

  // Gravity
  bird.vy += CONFIG.gravity * scaleY * delta;
  bird.y += bird.vy * delta;

  // Pipe generation
  if (gameState.frameCount >= gameState.nextPipeFrame) {
    gameState.pipes.push(createPipe());
    gameState.nextPipeFrame += CONFIG.pipeInterval;
  }

  // Move pipes
  updatePipes(gameState.pipes, delta);

  // Score
  gameState.pipes.forEach((pipe) => {
    if (!pipe.passed && pipe.x + pipe.width < bird.x) {
      pipe.passed = true;
      gameState.score++;

      if (gameState.score > gameState.bestScore) {
        gameState.bestScore = gameState.score;
        gameState.newBest = true;

        updateBestScore(gameState.bestScore);
      }

      sound("score");

      updateScore(gameState.score);
    }
  });

  // Remove off-screen pipes
  gameState.pipes = removeOffscreenPipes(gameState.pipes);

  // Collision
  if (checkCollision(bird, gameState.pipes)) {
    endGame();
  }
}

// ==========================================
// GAME LOOP
// ==========================================

function loop(timestamp) {
  if (gameState.status !== "playing") {
    gameState.animId = null;
    return;
  }

  if (gameState.lastFrameTime === 0) {
    gameState.lastFrameTime = timestamp;
  }

  const delta = Math.min(
    (timestamp - gameState.lastFrameTime) / (1000 / 60),
    CONFIG.maxDelta,
  );

  gameState.lastFrameTime = timestamp;

  update(delta);
  render(ctx, gameState);

  if (gameState.status === "playing") {
    gameState.animId = requestAnimationFrame(loop);
  } else {
    gameState.animId = null;
  }
}

function startLoop() {
  if (gameState.animId !== null) return;

  gameState.lastFrameTime = 0;
  gameState.animId = requestAnimationFrame(loop);
}

function stopLoop() {
  if (gameState.animId !== null) {
    cancelAnimationFrame(gameState.animId);
    gameState.animId = null;
  }
}

// ==========================================
// GAME CONTROLS
// ==========================================

export function flap() {
  // The game is frozen while paused: only the overlay can resume it.
  if (gameState.status === "paused") return;

  if (gameState.status === "idle") {
    gameState.status = "playing";
    startBtn.textContent = "إعادة";
    syncPauseUi();
  }

  if (gameState.status === "playing") {
    gameState.bird.vy = CONFIG.flapStrength * scaleY;
    sound("flap");
    startLoop();
  } else if (gameState.status === "dead") {
    resetGame();
  }
}

export function startGame() {
  if (gameState.status === "idle") {
    flap();
  } else {
    resetGame();
  }
}

export function resetGame() {
  stopLoop();

  sound("reset");

  initGame();

  gameState.status = "playing";
  startBtn.textContent = "إعادة";

  gameState.bird.vy = CONFIG.flapStrength * scaleY;

  syncPauseUi();

  render(ctx, gameState);
  startLoop();
}

function endGame() {
  if (gameState.status !== "playing") return;

  gameState.status = "dead";

  saveBestScore(gameState.bestScore);

  sound(gameState.newBest ? "win" : "hit");

  syncPauseUi();

  render(ctx, gameState);
}

// ==========================================
// PAUSE / RESUME
// ==========================================

export function pauseGame() {
  if (gameState.status !== "playing") return false;

  gameState.status = "paused";

  // Clearing the only animation frame freezes physics, pipes, scoring,
  // collision checks and the bird's wing animation in place.
  stopLoop();

  syncPauseUi();

  return true;
}

export function resumeGame() {
  if (gameState.status !== "paused") return false;

  gameState.status = "playing";

  syncPauseUi();

  // startLoop() resets lastFrameTime, so the resume frame has a zero delta and
  // nothing lurches forward.
  startLoop();

  return true;
}

export function togglePause() {
  return gameState.status === "paused" ? resumeGame() : pauseGame();
}

// ==========================================
// RESPONSIVE BEHAVIOR
// ==========================================

setResizeHandler((oldW, oldH) => {
  if (!gameState.bird) return;

  const ratioX = W / oldW;
  const ratioY = H / oldH;

  gameState.bird.x *= ratioX;
  gameState.bird.y *= ratioY;
  gameState.bird.vy *= ratioY;
  gameState.bird.radius *= Math.min(ratioX, ratioY);

  gameState.pipes.forEach((pipe) => {
    pipe.x *= ratioX;
    pipe.topH *= ratioY;
    pipe.gap *= ratioY;
    pipe.width *= Math.min(ratioX, ratioY);
  });

  gameState.lastFrameTime = 0;

  render(ctx, gameState);
});
