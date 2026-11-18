import { CONFIG } from "./config.js";
import { gameState, saveBestScore } from "./state.js";
import {
  ctx,
  getCenterLane,
  H,
  layout,
  resizeCanvas,
  setResizeHandler,
} from "./canvas.js";
import {
  createPlayer,
  resetPlayer,
  snapPlayerToLane,
  updatePlayer,
} from "./player.js";
import {
  reflowTraffic,
  seedIdleTraffic,
  spawnWave,
  updateTraffic,
} from "./traffic.js";
import { checkCollision } from "./collision.js";
import {
  hideOverlays,
  hidePauseScreen,
  render,
  showGameOverScreen,
  showPauseScreen,
  showStartScreen,
  updateBestScore,
  updatePauseButton,
  updateScore,
} from "./renderer.js";
import { clearCarSpriteCache } from "./vehicle.js";

const sound = (name) => window.playSound?.(name);

function getDifficulty(score) {
  return Math.min(score / CONFIG.difficultyScoreCap, 1);
}

function getTrafficSpeed(score) {
  const difficulty = getDifficulty(score);
  const eased = difficulty * difficulty * (3 - 2 * difficulty);
  const scale = Math.max(0.55, H / CONFIG.speedReferenceHeight);

  return (
    (CONFIG.baseSpeed + (CONFIG.maxSpeed - CONFIG.baseSpeed) * eased) * scale
  );
}

function getSpawnInterval(score, speed) {
  const difficulty = getDifficulty(score);
  const interval =
    CONFIG.baseSpawnInterval +
    (CONFIG.minSpawnInterval - CONFIG.baseSpawnInterval) *
      Math.pow(difficulty, 0.9);

  // Never let two waves arrive closer than a fair vertical gap.
  const minGap = Math.max(1, layout.carH * 1.5);

  return Math.max(interval, minGap / Math.max(1, speed));
}

// ==========================================
// INITIALIZATION
// ==========================================

export function initGame() {
  stopLoop();
  resizeCanvas();

  gameState.status = "idle";
  gameState.player = createPlayer();
  gameState.cars = [];
  gameState.score = 0;
  gameState.newBest = false;
  gameState.scroll = 0;
  gameState.elapsed = 0;
  gameState.spawnTimer = CONFIG.idleSpawnInterval * 0.55;
  gameState.lastSafeLane = getCenterLane();
  gameState.lastSingleLane = getCenterLane();
  gameState.lastStyleIndex = -1;
  gameState.multiStreak = 0;
  gameState.lastSpawnAt = 0;
  gameState.laneSpawnCounts = Array(layout.laneCount).fill(0);
  gameState.lastBlockedSignature = "";

  seedIdleTraffic(gameState);

  updateScore(0);
  updateBestScore(gameState.bestScore);
  showStartScreen(gameState.bestScore);
  updatePauseButton(false);

  render(ctx, gameState);
  startLoop();
}

export function startGame() {
  stopLoop();

  hideOverlays();

  gameState.status = "playing";
  gameState.cars = [];
  gameState.score = 0;
  gameState.newBest = false;
  gameState.scroll = 0;
  gameState.elapsed = 0;
  gameState.spawnTimer = CONFIG.initialSpawnDelay;
  gameState.lastSafeLane = getCenterLane();
  gameState.lastSingleLane = getCenterLane();
  gameState.lastStyleIndex = -1;
  gameState.multiStreak = 0;
  gameState.lastSpawnAt = 0;
  gameState.laneSpawnCounts = Array(layout.laneCount).fill(0);
  gameState.lastBlockedSignature = "";

  if (!gameState.player) gameState.player = createPlayer();
  resetPlayer(gameState.player);
  snapPlayerToLane(gameState.player);

  updateScore(0);
  updateBestScore(gameState.bestScore);
  updatePauseButton(true);

  sound("reset");

  render(ctx, gameState);
  startLoop();
}

function endGame() {
  if (gameState.status !== "playing") return;

  if (gameState.score > gameState.bestScore) {
    gameState.bestScore = gameState.score;
    gameState.newBest = true;
    updateBestScore(gameState.bestScore);
  }

  gameState.status = "over";
  saveBestScore(gameState.bestScore);

  hidePauseScreen();
  updatePauseButton(false);

  sound(gameState.newBest ? "win" : "hit");
}

// ==========================================
// UPDATE
// ==========================================

function updatePlaying(delta) {
  const speed = getTrafficSpeed(gameState.score);

  gameState.elapsed += delta;
  gameState.scroll += speed * CONFIG.roadScrollFactor * delta;

  updatePlayer(gameState.player, delta);

  gameState.spawnTimer -= delta;

  if (gameState.spawnTimer <= 0) {
    const spawned = spawnWave(gameState, { speed });

    gameState.spawnTimer = spawned
      ? getSpawnInterval(gameState.score, speed)
      : CONFIG.spawnRetryInterval;
  }

  const passed = updateTraffic(gameState, delta, speed);

  if (checkCollision(gameState)) {
    endGame();
    return;
  }

  if (passed > 0) {
    gameState.score += passed;

    if (gameState.score > gameState.bestScore) {
      gameState.bestScore = gameState.score;
      gameState.newBest = true;
      updateBestScore(gameState.bestScore);
    }

    updateScore(gameState.score);
    sound("score");
  }
}

function updateIdle(delta) {
  const speed = CONFIG.idleSpeed * Math.max(0.65, H / CONFIG.speedReferenceHeight);
  const scrollSpeed = speed * 1.4;

  gameState.elapsed += delta;
  gameState.scroll += scrollSpeed * delta;
  gameState.spawnTimer -= delta;

  if (gameState.spawnTimer <= 0) {
    const spawned =
      gameState.cars.length < 5 &&
      spawnWave(gameState, { idle: true, speed });

    gameState.spawnTimer = spawned
      ? CONFIG.idleSpawnInterval * (0.85 + Math.random() * 0.3)
      : CONFIG.spawnRetryInterval;
  }

  updateTraffic(gameState, delta, speed, { score: false });
}

// ==========================================
// GAME LOOP
// ==========================================

function frame(timestamp) {
  gameState.animId = null;

  if (gameState.lastFrameTime === 0) {
    gameState.lastFrameTime = timestamp;
  }

  const delta = Math.min(
    (timestamp - gameState.lastFrameTime) / 1000,
    CONFIG.maxDelta,
  );

  gameState.lastFrameTime = timestamp;

  if (delta > 0) {
    if (gameState.status === "playing") {
      updatePlaying(delta);
    } else if (gameState.status === "idle") {
      updateIdle(delta);
    }
  }

  render(ctx, gameState);

  if (gameState.status === "over") {
    showGameOverScreen(gameState);
    return;
  }

  gameState.animId = requestAnimationFrame(frame);
}

function startLoop() {
  if (gameState.animId !== null) return;

  gameState.lastFrameTime = 0;
  gameState.animId = requestAnimationFrame(frame);
}

function stopLoop() {
  if (gameState.animId !== null) {
    cancelAnimationFrame(gameState.animId);
    gameState.animId = null;
  }

  gameState.lastFrameTime = 0;
}

export function pauseGame() {
  if (gameState.status !== "playing") return false;

  gameState.status = "paused";

  // Cancelling the frame loop is what actually freezes the game: no physics,
  // no traffic, no spawning, no collisions and no scoring can run while the
  // single scheduled animation frame is gone.
  stopLoop();

  updatePauseButton(false);
  showPauseScreen(gameState);

  return true;
}

export function resumeGame() {
  if (gameState.status !== "paused") return false;

  gameState.status = "playing";

  hidePauseScreen();
  updatePauseButton(true);

  // startLoop() clears lastFrameTime, so the first frame after resuming has a
  // zero delta and objects never jump forward.
  startLoop();

  return true;
}

export function togglePause() {
  return gameState.status === "paused" ? resumeGame() : pauseGame();
}

// ==========================================
// RESPONSIVE BEHAVIOUR
// ==========================================

setResizeHandler((oldW, oldH, oldLaneCount) => {
  if (!gameState.player || !oldW || !oldH) return;

  const ratioY = H / oldH;

  for (const car of gameState.cars) {
    car.y *= ratioY;
  }

  gameState.scroll *= ratioY;

  snapPlayerToLane(gameState.player);

  if (oldLaneCount !== layout.laneCount) {
    gameState.laneSpawnCounts = Array(layout.laneCount).fill(0);
    gameState.lastBlockedSignature = "";
  }

  const speed =
    gameState.status === "idle"
      ? CONFIG.idleSpeed * Math.max(0.65, H / CONFIG.speedReferenceHeight)
      : getTrafficSpeed(gameState.score);

  // When the road becomes narrower some lanes collapse. Reflow the traffic so
  // the resize never creates overlapping cars or an instant collision.
  if (oldLaneCount !== layout.laneCount || gameState.cars.length) {
    reflowTraffic(gameState, speed);
  }

  clearCarSpriteCache();

  render(ctx, gameState);
});
