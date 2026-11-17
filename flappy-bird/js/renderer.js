import { CONFIG, COLORS } from "./config.js";
import { W, H, scaleY, gameScale } from "./canvas.js";
import { drawBird } from "./bird.js";
import { drawPipes } from "./pipes.js";

export function drawBackground(ctx) {
  // Main gradient
  const gradient = ctx.createLinearGradient(0, 0, 0, H);

  gradient.addColorStop(0, COLORS.darkerBlue);
  gradient.addColorStop(0.55, COLORS.darkBlue);
  gradient.addColorStop(1, COLORS.blue);

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, W, H);

  // Soft aqua glow
  const glow = ctx.createRadialGradient(
    W * 0.75,
    H * 0.25,
    0,
    W * 0.75,
    H * 0.25,
    W * 0.8,
  );

  glow.addColorStop(0, "rgba(49, 196, 190, 0.13)");
  glow.addColorStop(1, "rgba(49, 196, 190, 0)");

  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // Decorative background circles
  ctx.save();

  ctx.strokeStyle = "rgba(168, 190, 201, 0.07)";
  ctx.lineWidth = 1;

  for (let i = 0; i < 5; i++) {
    ctx.beginPath();

    ctx.arc(W * 0.85, H * 0.3, (50 + i * 35) * gameScale, 0, Math.PI * 2);

    ctx.stroke();
  }

  ctx.restore();

  // Ground
  const groundHeight = CONFIG.groundHeight * scaleY;
  const groundY = H - groundHeight;

  ctx.fillStyle = COLORS.darkerBlue;
  ctx.fillRect(0, groundY, W, groundHeight);

  // Aqua ground line
  ctx.fillStyle = COLORS.aqua;
  ctx.fillRect(0, groundY, W, 5 * gameScale);

  // Ground details
  ctx.fillStyle = "rgba(168, 190, 201, 0.12)";

  for (let x = 0; x < W; x += 35 * gameScale) {
    ctx.fillRect(x, groundY + 14 * gameScale, 18 * gameScale, 2 * gameScale);
  }
}

export function drawOverlay(ctx, title, subtitle) {
  ctx.fillStyle = "rgba(17, 33, 41, 0.72)";
  ctx.fillRect(0, 0, W, H);

  const centerX = W / 2;
  const centerY = H / 2;

  // Overlay panel
  const panelWidth = Math.min(W * 0.82, 340 * gameScale);
  const panelHeight = 145 * gameScale;

  const panelX = centerX - panelWidth / 2;
  const panelY = centerY - panelHeight / 2;

  ctx.fillStyle = "rgba(25, 42, 50, 0.92)";

  ctx.beginPath();

  ctx.roundRect(panelX, panelY, panelWidth, panelHeight, 18 * gameScale);

  ctx.fill();

  ctx.strokeStyle = "rgba(49, 196, 190, 0.5)";
  ctx.lineWidth = 1.5 * gameScale;
  ctx.stroke();

  // Title
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.fillStyle = COLORS.aqua;
  ctx.font = `700 ${Math.max(18, 30 * gameScale)}px Segoe UI`;

  ctx.fillText(title, centerX, centerY - 20 * gameScale);

  // Subtitle
  if (subtitle) {
    ctx.fillStyle = COLORS.lightBlue;

    ctx.font = `400 ${Math.max(11, 14 * gameScale)}px Segoe UI`;

    ctx.fillText(
      subtitle,
      centerX,
      centerY + 20 * gameScale,
      panelWidth - 24 * gameScale,
    );
  }

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
}

export function updateScore(score) {
  const scoreDisplay = document.getElementById("scoreDisplay");

  if (scoreDisplay) {
    scoreDisplay.textContent = String(score);
  }
}

export function updateBestScore(bestScore) {
  const bestDisplay = document.getElementById("bestScoreDisplay");

  if (bestDisplay) {
    bestDisplay.textContent = String(bestScore);
  }
}

export function render(ctx, state) {
  drawBackground(ctx);
  drawPipes(ctx, state.pipes);
  drawBird(ctx, state.bird, state.frameCount);

  if (state.status === "idle") {
    drawOverlay(ctx, "FLAPPY BIRD", "اضغط للبدء");
  }

  if (state.status === "dead") {
    drawOverlay(
      ctx,
      state.newBest ? "رقم قياسي جديد!" : "انتهت اللعبة!",
      `النقاط: ${state.score} • الأفضل: ${state.bestScore}`,
    );
  }
}
