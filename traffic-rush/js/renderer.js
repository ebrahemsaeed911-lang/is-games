import { W, H, dpr, layout } from "./canvas.js";
import { COLORS } from "./config.js";
import { drawTraffic } from "./traffic.js";
import { drawPlayer } from "./player.js";

const scoreDisplay = document.getElementById("scoreDisplay");
const bestScoreDisplay = document.getElementById("bestScoreDisplay");
const startBest = document.getElementById("startBest");
const startOverlay = document.getElementById("startOverlay");
const gameOverOverlay = document.getElementById("gameOverOverlay");
const pauseOverlay = document.getElementById("pauseOverlay");
const pauseBtn = document.getElementById("pauseBtn");
const pauseScore = document.getElementById("pauseScore");
const pauseBest = document.getElementById("pauseBest");
const overEyebrow = document.getElementById("overEyebrow");
const overTitle = document.getElementById("overTitle");
const overMessage = document.getElementById("overMessage");
const finalScore = document.getElementById("finalScore");
const finalBest = document.getElementById("finalBest");

let background = null;
let backgroundKey = "";

function roundedRect(ctx, x, y, w, h, r) {
  const radius = Math.max(0, Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2));

  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function buildBackground() {
  const key = [
    Math.round(W),
    Math.round(H),
    dpr,
    layout.laneCount,
    Math.round(layout.roadX),
    Math.round(layout.roadW),
    Math.round(layout.laneWidth),
  ].join("x");
  if (background && key === backgroundKey) return;

  backgroundKey = key;
  background = document.createElement("canvas");
  background.width = Math.max(1, Math.round(W * dpr));
  background.height = Math.max(1, Math.round(H * dpr));

  const g = background.getContext("2d");
  g.scale(dpr, dpr);

  // Deep arcade backdrop
  const sky = g.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, COLORS.darkerBlue);
  sky.addColorStop(0.48, COLORS.darkBlue);
  sky.addColorStop(1, COLORS.darkerBlue);
  g.fillStyle = sky;
  g.fillRect(0, 0, W, H);

  const aquaGlow = g.createRadialGradient(
    W * 0.16,
    H * 0.2,
    0,
    W * 0.16,
    H * 0.2,
    W * 0.72,
  );
  aquaGlow.addColorStop(0, "rgba(49, 196, 190, 0.13)");
  aquaGlow.addColorStop(1, "rgba(49, 196, 190, 0)");
  g.fillStyle = aquaGlow;
  g.fillRect(0, 0, W, H);

  const orangeGlow = g.createRadialGradient(
    W * 0.86,
    H * 0.82,
    0,
    W * 0.86,
    H * 0.82,
    W * 0.6,
  );
  orangeGlow.addColorStop(0, "rgba(242, 178, 55, 0.07)");
  orangeGlow.addColorStop(1, "rgba(242, 178, 55, 0)");
  g.fillStyle = orangeGlow;
  g.fillRect(0, 0, W, H);

  // Decorative side rings
  g.save();
  g.strokeStyle = "rgba(168, 190, 201, 0.055)";
  g.lineWidth = 1;

  for (let i = 0; i < 5; i++) {
    g.beginPath();
    g.arc(W * 0.12, H * 0.24, (44 + i * 34) * (H / 600), 0, Math.PI * 2);
    g.stroke();

    g.beginPath();
    g.arc(W * 0.9, H * 0.68, (40 + i * 30) * (H / 600), 0, Math.PI * 2);
    g.stroke();
  }

  g.restore();

  // Road drop shadow
  g.save();
  g.shadowColor = "rgba(0, 0, 0, 0.7)";
  g.shadowBlur = Math.max(18, W * 0.035);
  g.fillStyle = "#1a2c35";
  g.fillRect(layout.roadX - 2, 0, layout.roadW + 4, H);
  g.restore();

  // Asphalt
  const road = g.createLinearGradient(
    layout.roadX,
    0,
    layout.roadX + layout.roadW,
    0,
  );
  road.addColorStop(0, "#182a33");
  road.addColorStop(0.16, "#203842");
  road.addColorStop(0.5, "#243f4a");
  road.addColorStop(0.84, "#203842");
  road.addColorStop(1, "#172831");
  g.fillStyle = road;
  g.fillRect(layout.roadX, 0, layout.roadW, H);

  // Gentle centre-lane sheen
  const sheenOuter = g.createLinearGradient(
    layout.roadX,
    0,
    layout.roadX + layout.roadW,
    0,
  );
  sheenOuter.addColorStop(0, "rgba(168, 190, 201, 0)");
  sheenOuter.addColorStop(0.5, "rgba(168, 190, 201, 0.055)");
  sheenOuter.addColorStop(1, "rgba(168, 190, 201, 0)");
  g.fillStyle = sheenOuter;

  const sheenWidth = layout.laneWidth * (layout.laneCount % 2 === 0 ? 2 : 1);
  g.fillRect((W - sheenWidth) / 2, 0, sheenWidth, H);

  // Shoulder strips
  g.fillStyle = "rgba(17, 33, 41, 0.3)";
  g.fillRect(layout.roadX, 0, Math.max(6, layout.laneWidth * 0.055), H);
  g.fillRect(
    layout.roadX + layout.roadW - Math.max(6, layout.laneWidth * 0.055),
    0,
    Math.max(6, layout.laneWidth * 0.055),
    H,
  );

  // Aqua road boundary with a soft outer glow
  g.save();
  g.shadowColor = "rgba(49, 196, 190, 0.5)";
  g.shadowBlur = 12;
  g.fillStyle = "rgba(49, 196, 190, 0.6)";
  g.fillRect(layout.roadX, 0, 2.4, H);
  g.fillRect(layout.roadX + layout.roadW - 2.4, 0, 2.4, H);
  g.restore();

  // Orange edge line just inside the boundary
  g.fillStyle = "rgba(242, 178, 55, 0.62)";
  g.fillRect(layout.roadX + 7, 0, 1.4, H);
  g.fillRect(layout.roadX + layout.roadW - 8.4, 0, 1.4, H);

  // Top and bottom atmospheric fades
  const topFade = g.createLinearGradient(0, 0, 0, H * 0.16);
  topFade.addColorStop(0, "rgba(17, 33, 41, 0.68)");
  topFade.addColorStop(1, "rgba(17, 33, 41, 0)");
  g.fillStyle = topFade;
  g.fillRect(0, 0, W, H * 0.16);

  const bottomFade = g.createLinearGradient(0, H * 0.82, 0, H);
  bottomFade.addColorStop(0, "rgba(17, 33, 41, 0)");
  bottomFade.addColorStop(1, "rgba(17, 33, 41, 0.52)");
  g.fillStyle = bottomFade;
  g.fillRect(0, H * 0.82, W, H * 0.18);

  // Vignette
  const vignette = g.createRadialGradient(
    W * 0.5,
    H * 0.45,
    Math.min(W, H) * 0.28,
    W * 0.5,
    H * 0.45,
    Math.max(W, H) * 0.72,
  );
  vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
  vignette.addColorStop(1, "rgba(0, 0, 0, 0.24)");
  g.fillStyle = vignette;
  g.fillRect(0, 0, W, H);
}

function drawRoadMotion(ctx, state) {
  const dashW = Math.max(2.5, Math.min(5.5, layout.laneWidth * 0.034));
  const dashH = Math.max(22, Math.min(48, H * 0.054));
  const period = dashH * 2.15;
  const offset = ((state.scroll % period) + period) % period;

  for (let line = 1; line < layout.laneCount; line++) {
    const x = layout.roadX + layout.laneWidth * line;

    for (let y = -period + offset; y < H + period; y += period) {
      // Soft aqua bloom behind the marking
      roundedRect(
        ctx,
        x - dashW * 1.45,
        y - 2,
        dashW * 2.9,
        dashH + 4,
        dashW * 1.2,
      );
      ctx.fillStyle = "rgba(49, 196, 190, 0.09)";
      ctx.fill();

      roundedRect(ctx, x - dashW / 2, y, dashW, dashH, dashW / 2);
      ctx.fillStyle = "rgba(168, 190, 201, 0.56)";
      ctx.fill();

      // Bright top edge gives each dash a sense of direction.
      roundedRect(
        ctx,
        x - dashW / 2,
        y,
        dashW,
        Math.max(2, dashH * 0.16),
        dashW / 2,
      );
      ctx.fillStyle = "rgba(234, 244, 247, 0.28)";
      ctx.fill();
    }
  }

  // Edge reflectors moving with the road
  const spacing = Math.max(80, Math.min(136, H * 0.18));
  const reflectorOffset = ((state.scroll * 1.18) % spacing + spacing) % spacing;

  for (const x of [layout.roadX + 10, layout.roadX + layout.roadW - 10]) {
    for (
      let y = -spacing + reflectorOffset;
      y < H + spacing;
      y += spacing
    ) {
      roundedRect(ctx, x - 1.4, y, 2.8, Math.max(11, H * 0.024), 1.4);
      ctx.fillStyle = "rgba(49, 196, 190, 0.42)";
      ctx.fill();
    }
  }
}

export function render(ctx, state) {
  buildBackground();
  ctx.drawImage(background, 0, 0, W, H);
  drawRoadMotion(ctx, state);
  drawTraffic(ctx, state.cars);
  drawPlayer(ctx, state.player, state.elapsed);
}

export function updateScore(score) {
  if (scoreDisplay) scoreDisplay.textContent = String(score);
}

export function updateBestScore(best) {
  const value = String(best);

  if (bestScoreDisplay) bestScoreDisplay.textContent = value;
  if (startBest) startBest.textContent = value;
  if (finalBest) finalBest.textContent = value;
}

export function showStartScreen(bestScore) {
  if (startOverlay) startOverlay.hidden = false;
  if (gameOverOverlay) gameOverOverlay.hidden = true;
  if (pauseOverlay) pauseOverlay.hidden = true;
  if (startBest) startBest.textContent = String(bestScore);
}

export function hideOverlays() {
  if (startOverlay) startOverlay.hidden = true;
  if (gameOverOverlay) gameOverOverlay.hidden = true;
  if (pauseOverlay) pauseOverlay.hidden = true;
}

export function showPauseScreen(state) {
  if (pauseScore) pauseScore.textContent = String(state.score);
  if (pauseBest) pauseBest.textContent = String(state.bestScore);
  if (pauseOverlay) pauseOverlay.hidden = false;
}

export function hidePauseScreen() {
  if (pauseOverlay) pauseOverlay.hidden = true;
}

// The pause control is only meaningful while the game is running.
export function updatePauseButton(visible) {
  if (pauseBtn) pauseBtn.hidden = !visible;
}

export function showGameOverScreen(state) {
  if (startOverlay) startOverlay.hidden = true;
  if (gameOverOverlay) gameOverOverlay.hidden = false;
  if (pauseOverlay) pauseOverlay.hidden = true;

  if (overEyebrow) {
    overEyebrow.textContent = state.newBest ? "NEW RECORD" : "GAME OVER";
  }

  if (overTitle) {
    overTitle.textContent = state.newBest ? "رقم قياسي جديد!" : "انتهت اللعبة";
  }

  if (overMessage) {
    overMessage.textContent = state.newBest
      ? "تجاوزت أفضل نتيجة لك. أحسنت!"
      : "اصطدمت! حاول مرة أخرى.";
  }

  if (finalScore) finalScore.textContent = String(state.score);
  if (finalBest) finalBest.textContent = String(state.bestScore);
}
