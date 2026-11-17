import { canvas } from "./canvas.js";
import { gameState, saveBestScore } from "./state.js";
import {
  initGame,
  pauseGame,
  resumeGame,
  startGame,
  togglePause,
} from "./game.js";
import { movePlayer } from "./player.js";

const startBtn = document.getElementById("startBtn");
const restartBtn = document.getElementById("restartBtn");
const pauseBtn = document.getElementById("pauseBtn");
const resumeBtn = document.getElementById("resumeBtn");
const pauseRestartBtn = document.getElementById("pauseRestartBtn");
const leftBtn = document.getElementById("leftBtn");
const rightBtn = document.getElementById("rightBtn");
const pauseOverlay = document.getElementById("pauseOverlay");

const TAP_MOVE_LIMIT = 18;
const DOUBLE_TAP_WINDOW = 350;
const DOUBLE_TAP_DISTANCE = 36;

let activeCanvasTap = null;
let lastCanvasTap = null;
let activeOverlayTap = null;
let lastOverlayTap = null;

function resetTapTracking() {
  activeCanvasTap = null;
  lastCanvasTap = null;
  activeOverlayTap = null;
  lastOverlayTap = null;
}

function isDoubleTap(previousTap, currentTap) {
  return (
    previousTap &&
    currentTap.time - previousTap.time <= DOUBLE_TAP_WINDOW &&
    Math.hypot(currentTap.x - previousTap.x, currentTap.y - previousTap.y) <=
      DOUBLE_TAP_DISTANCE
  );
}

function changeLane(direction) {
  if (gameState.status !== "playing" || !gameState.player) return;
  movePlayer(gameState.player, direction);
}

// ==========================================
// KEYBOARD
// ==========================================

document.addEventListener("keydown", (event) => {
  // Escape toggles pause only for a running or paused game. On the idle and
  // game-over screens it does nothing.
  if (event.code === "Escape") {
    if (gameState.status !== "playing" && gameState.status !== "paused") return;

    event.preventDefault();
    resetTapTracking();
    togglePause();
    document.activeElement?.blur?.();
    return;
  }

  const isLeft = event.code === "ArrowLeft" || event.code === "KeyA";
  const isRight = event.code === "ArrowRight" || event.code === "KeyD";

  if (!isLeft && !isRight) return;

  event.preventDefault();

  if (event.repeat) return;

  resetTapTracking();

  // changeLane() already ignores everything except "playing", so movement
  // input is inert while the pause overlay is open.
  changeLane(isLeft ? -1 : 1);
});

// ==========================================
// SWIPE / POINTER
// ==========================================

let activePointer = null;
let startX = 0;
let startY = 0;

function endSwipe(event) {
  if (activePointer === null) return;
  if (event && event.pointerId !== undefined && event.pointerId !== activePointer) {
    return;
  }

  const pointerId = activePointer;
  activePointer = null;

  if (pointerId !== null && canvas.hasPointerCapture?.(pointerId)) {
    canvas.releasePointerCapture(pointerId);
  }
}

canvas.addEventListener("pointerdown", (event) => {
  if (gameState.status !== "playing") return;

  event.preventDefault();

  activePointer = event.pointerId;
  startX = event.clientX;
  startY = event.clientY;
  if (event.isPrimary === false || event.button !== 0) {
    lastCanvasTap = null;
    activeCanvasTap = null;
  } else {
    activeCanvasTap = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      time: event.timeStamp,
      moved: false,
    };
  }

  try {
    canvas.setPointerCapture(event.pointerId);
  } catch {
    // Pointer capture is an optimisation, not a requirement.
  }
});

canvas.addEventListener("pointermove", (event) => {
  if (activePointer === null || event.pointerId !== activePointer) return;

  // Any meaningful movement disqualifies this gesture from double-tap pause.
  if (activeCanvasTap?.pointerId === event.pointerId) {
    const tapDx = event.clientX - activeCanvasTap.x;
    const tapDy = event.clientY - activeCanvasTap.y;

    if (Math.hypot(tapDx, tapDy) > TAP_MOVE_LIMIT) {
      activeCanvasTap.moved = true;
    }
  }

  const dx = event.clientX - startX;
  const dy = event.clientY - startY;
  const threshold = Math.min(46, Math.max(20, canvas.clientWidth * 0.06));

  if (Math.abs(dx) < threshold || Math.abs(dx) < Math.abs(dy) * 1.15) return;

  event.preventDefault();

  changeLane(dx > 0 ? 1 : -1);

  // Allow a long swipe to cross two lanes.
  startX = event.clientX;
  startY = event.clientY;
});

canvas.addEventListener("pointerup", (event) => {
  const tap = activeCanvasTap;
  if (!tap || tap.pointerId !== event.pointerId) return;

  activeCanvasTap = null;
  const currentTap = {
    x: event.clientX,
    y: event.clientY,
    time: event.timeStamp,
  };
  const duration = currentTap.time - tap.time;
  const distance = Math.hypot(currentTap.x - tap.x, currentTap.y - tap.y);

  if (
    gameState.status !== "playing" ||
    tap.moved ||
    duration > DOUBLE_TAP_WINDOW ||
    distance > TAP_MOVE_LIMIT
  ) {
    lastCanvasTap = null;
    return;
  }

  if (isDoubleTap(lastCanvasTap, currentTap)) {
    resetTapTracking();
    pauseGame();
    return;
  }

  lastCanvasTap = currentTap;
});

canvas.addEventListener("pointercancel", (event) => {
  if (activeCanvasTap?.pointerId === event.pointerId) {
    activeCanvasTap = null;
  }
  lastCanvasTap = null;
});

canvas.addEventListener("pointerup", endSwipe);
canvas.addEventListener("pointercancel", endSwipe);
canvas.addEventListener("lostpointercapture", () => {
  activePointer = null;
  activeCanvasTap = null;
});

canvas.addEventListener("contextmenu", (event) => {
  event.preventDefault();
});

// ==========================================
// BUTTONS
// ==========================================

function bindLaneButton(button, direction) {
  if (!button) return;

  const trigger = (event) => {
    event.preventDefault();
    resetTapTracking();
    changeLane(direction);
  };

  button.addEventListener("pointerdown", trigger);
  button.addEventListener("click", (event) => {
    // Keyboard activation fires a click with detail 0.
    if (event.detail === 0) trigger(event);
  });
}

bindLaneButton(leftBtn, -1);
bindLaneButton(rightBtn, 1);

startBtn?.addEventListener("click", () => {
  resetTapTracking();
  startGame();
  document.activeElement?.blur?.();
});

restartBtn?.addEventListener("click", () => {
  resetTapTracking();
  startGame();
  document.activeElement?.blur?.();
});

pauseBtn?.addEventListener("click", () => {
  resetTapTracking();
  pauseGame();
  document.activeElement?.blur?.();
});

resumeBtn?.addEventListener("click", () => {
  resetTapTracking();
  resumeGame();
  document.activeElement?.blur?.();
});

// Restart from the paused state uses the same reset path as the game-over
// screen, so the frozen loop is cancelled by startGame().
pauseRestartBtn?.addEventListener("click", () => {
  resetTapTracking();
  startGame();
  document.activeElement?.blur?.();
});

function startOverlayTap(event) {
  if (
    gameState.status !== "paused" ||
    event.target !== pauseOverlay ||
    event.isPrimary === false ||
    event.button !== 0
  ) {
    activeOverlayTap = null;
    lastOverlayTap = null;
    return;
  }

  event.preventDefault();

  activeOverlayTap = {
    pointerId: event.pointerId,
    x: event.clientX,
    y: event.clientY,
    time: event.timeStamp,
    moved: false,
  };
}

function moveOverlayTap(event) {
  if (!activeOverlayTap || activeOverlayTap.pointerId !== event.pointerId) return;

  if (
    Math.hypot(
      event.clientX - activeOverlayTap.x,
      event.clientY - activeOverlayTap.y,
    ) > TAP_MOVE_LIMIT
  ) {
    activeOverlayTap.moved = true;
  }
}

function endOverlayTap(event) {
  const tap = activeOverlayTap;
  if (!tap || tap.pointerId !== event.pointerId) return;

  activeOverlayTap = null;
  const currentTap = {
    x: event.clientX,
    y: event.clientY,
    time: event.timeStamp,
  };

  if (
    gameState.status !== "paused" ||
    event.target !== pauseOverlay ||
    tap.moved ||
    currentTap.time - tap.time > DOUBLE_TAP_WINDOW ||
    Math.hypot(currentTap.x - tap.x, currentTap.y - tap.y) > TAP_MOVE_LIMIT
  ) {
    lastOverlayTap = null;
    return;
  }

  if (isDoubleTap(lastOverlayTap, currentTap)) {
    resetTapTracking();
    resumeGame();
    return;
  }

  lastOverlayTap = currentTap;
}

pauseOverlay?.addEventListener("pointerdown", startOverlayTap);
pauseOverlay?.addEventListener("pointermove", moveOverlayTap);
pauseOverlay?.addEventListener("pointerup", endOverlayTap);
pauseOverlay?.addEventListener("pointercancel", () => {
  activeOverlayTap = null;
  lastOverlayTap = null;
});

// ==========================================
// LIFECYCLE
// ==========================================

document.addEventListener("visibilitychange", () => {
  // Leaving the tab pauses a running game and keeps it paused on return, so
  // the player resumes explicitly instead of losing progress in the background.
  if (document.hidden) {
    resetTapTracking();
    pauseGame();
  }
});

window.addEventListener("pagehide", () => {
  resetTapTracking();
  pauseGame();
  saveBestScore(gameState.bestScore);
});

// ==========================================
// START
// ==========================================

initGame();
