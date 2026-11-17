import { layout } from "./canvas.js";
import { CONFIG, ENEMY_STYLES } from "./config.js";

function overlaps(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

export function checkCollision(state) {
  if (!state.player) return false;

  const playerW = layout.carW * CONFIG.playerHitWidth;
  const playerH = layout.carH * CONFIG.playerHitHeight;
  const playerX = state.player.x - playerW / 2;
  const playerY = layout.playerTop + (layout.carH - playerH) / 2;

  for (const car of state.cars) {
    const style = ENEMY_STYLES[car.styleIndex];
    const fullW = layout.carW * style.widthFactor;
    const fullH = layout.carH * style.lengthFactor;
    const hitW = fullW * CONFIG.enemyHitWidth;
    const hitH = fullH * CONFIG.enemyHitHeight;
    const carX = layout.laneCenters[car.lane] - hitW / 2;
    const carY = car.y + (fullH - hitH) / 2;

    if (overlaps(playerX, playerY, playerW, playerH, carX, carY, hitW, hitH)) {
      return true;
    }
  }

  return false;
}
