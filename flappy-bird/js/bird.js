import { W, H, gameScale } from "./canvas.js";
import { COLORS } from "./config.js";

export function createBird() {
  return {
    x: W * 0.22,
    y: H / 2,
    vy: 0,
    radius: 14 * gameScale,
  };
}

export function drawBird(ctx, bird, frameCount) {
  const { x, y, radius: r, vy } = bird;

  ctx.save();
  ctx.translate(x, y);

  const angle = Math.max(-0.4, Math.min(0.6, vy * 0.045));

  ctx.rotate(angle);

  // Outer glow
  ctx.shadowColor = COLORS.aqua;
  ctx.shadowBlur = 16 * gameScale;

  // Body
  ctx.beginPath();

  ctx.ellipse(2 * gameScale, 0, r, r * 0.88, 0, 0, Math.PI * 2);

  ctx.fillStyle = COLORS.aqua;
  ctx.fill();

  ctx.shadowBlur = 0;

  // Body highlight
  ctx.beginPath();

  ctx.ellipse(0, -r * 0.35, r * 0.55, r * 0.2, -0.2, 0, Math.PI * 2);

  ctx.fillStyle = "rgba(255,255,255,0.22)";
  ctx.fill();

  // Eye
  ctx.beginPath();

  ctx.arc(5 * gameScale, -4 * gameScale, r * 0.3, 0, Math.PI * 2);

  ctx.fillStyle = COLORS.white;
  ctx.fill();

  ctx.beginPath();

  ctx.arc(6.5 * gameScale, -4 * gameScale, r * 0.14, 0, Math.PI * 2);

  ctx.fillStyle = COLORS.darkerBlue;
  ctx.fill();

  // Beak
  ctx.beginPath();

  ctx.moveTo(r, -1 * gameScale);
  ctx.lineTo(r + 8 * gameScale, -3 * gameScale);
  ctx.lineTo(r + 7 * gameScale, 3 * gameScale);

  ctx.closePath();

  ctx.fillStyle = COLORS.orange;
  ctx.fill();

  // Wing
  const wingY = 4 * gameScale + Math.sin(frameCount * 0.3) * 3 * gameScale;

  ctx.beginPath();

  ctx.ellipse(-2 * gameScale, wingY, r * 0.55, r * 0.3, -0.3, 0, Math.PI * 2);

  ctx.fillStyle = COLORS.orange;
  ctx.fill();

  ctx.restore();
}
