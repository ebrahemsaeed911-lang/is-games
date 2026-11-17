import { CONFIG } from "./config.js";
import { H, scaleY, gameScale } from "./canvas.js";

export function circleRectCollision(cx, cy, radius, rx, ry, rw, rh) {
  const closestX = Math.max(rx, Math.min(cx, rx + rw));
  const closestY = Math.max(ry, Math.min(cy, ry + rh));

  const dx = cx - closestX;
  const dy = cy - closestY;

  return dx * dx + dy * dy < radius * radius;
}

export function checkCollision(bird, pipes) {
  const { x, y, radius } = bird;

  const groundY = H - CONFIG.groundHeight * scaleY;
  const capH = CONFIG.pipeCapHeight * gameScale;

  // Ceiling and ground
  if (y - radius <= 0 || y + radius >= groundY) {
    return true;
  }

  // Pipes
  for (const pipe of pipes) {
    const { x: px, topH, gap, width } = pipe;

    const bottomY = topH + gap;

    // Upper pipe body
    if (
      circleRectCollision(
        x,
        y,
        radius,
        px + 4 * gameScale,
        0,
        width - 8 * gameScale,
        Math.max(0, topH - capH),
      )
    ) {
      return true;
    }

    // Upper pipe cap
    if (circleRectCollision(x, y, radius, px, topH - capH, width, capH)) {
      return true;
    }

    // Lower pipe body
    if (
      circleRectCollision(
        x,
        y,
        radius,
        px + 4 * gameScale,
        bottomY + capH,
        width - 8 * gameScale,
        Math.max(0, H - CONFIG.groundHeight * scaleY - bottomY - capH),
      )
    ) {
      return true;
    }

    // Lower pipe cap
    if (circleRectCollision(x, y, radius, px, bottomY, width, capH)) {
      return true;
    }
  }

  return false;
}
