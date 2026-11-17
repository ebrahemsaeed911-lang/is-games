import {
  getCenterLane,
  getLaneCenter,
  getLaneCount,
  layout,
} from "./canvas.js";
import { CONFIG, COLORS, PLAYER_STYLE } from "./config.js";
import { getCarSprite } from "./vehicle.js";

export function createPlayer() {
  const startLane = getCenterLane();

  return {
    lane: startLane,
    x: getLaneCenter(startLane),
    targetX: getLaneCenter(startLane),
    tilt: 0,
  };
}

export function resetPlayer(player) {
  const startLane = getCenterLane();

  player.lane = startLane;
  player.x = getLaneCenter(startLane);
  player.targetX = getLaneCenter(startLane);
  player.tilt = 0;
}

export function clampPlayerLane(player) {
  if (!player) return;

  player.lane = Math.max(0, Math.min(getLaneCount() - 1, player.lane));
}

export function snapPlayerToLane(player) {
  clampPlayerLane(player);
  player.targetX = getLaneCenter(player.lane);
  player.x = player.targetX;
  player.tilt = 0;
}

export function movePlayer(player, direction) {
  if (!player || !direction) return false;

  const next = Math.max(
    0,
    Math.min(getLaneCount() - 1, player.lane + direction),
  );

  if (next === player.lane) return false;

  player.lane = next;
  player.targetX = getLaneCenter(next);

  return true;
}

export function updatePlayer(player, delta) {
  const snap = 1 - Math.exp(-CONFIG.laneSnapRate * delta);
  const dx = player.targetX - player.x;

  player.x += dx * snap;

  if (Math.abs(player.targetX - player.x) < 0.08) {
    player.x = player.targetX;
  }

  const targetTilt = Math.max(
    -CONFIG.maxTilt,
    Math.min(CONFIG.maxTilt, (dx / layout.laneWidth) * CONFIG.tiltFactor),
  );

  player.tilt += (targetTilt - player.tilt) * Math.min(1, delta * 15);
}

export function drawPlayer(ctx, player, time) {
  if (!player) return;

  const sprite = getCarSprite({
    width: layout.carW,
    height: layout.carH,
    style: PLAYER_STYLE,
    variant: "player",
  });

  const pulse = 0.06 + Math.sin(time * 3.2) * 0.016;

  ctx.save();
  ctx.translate(player.x, layout.playerCenterY);

  // Subtle aqua halo underneath the car.
  ctx.beginPath();
  ctx.ellipse(
    0,
    layout.carH * 0.16,
    layout.carW * 0.72,
    layout.carH * 0.34,
    0,
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = `rgba(49, 196, 190, ${pulse.toFixed(3)})`;
  ctx.fill();

  ctx.rotate(player.tilt);
  ctx.drawImage(
    sprite.canvas,
    -sprite.drawW / 2,
    -sprite.drawH / 2,
    sprite.drawW,
    sprite.drawH,
  );
  ctx.restore();

  // Tiny orange indicator at the rear keeps the player readable at a glance.
  ctx.save();
  ctx.translate(player.x, layout.playerCenterY);
  ctx.rotate(player.tilt);
  ctx.beginPath();
  ctx.ellipse(
    0,
    layout.carH * 0.47,
    layout.carW * 0.11,
    layout.carH * 0.025,
    0,
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = COLORS.orange;
  ctx.fill();
  ctx.restore();
}
