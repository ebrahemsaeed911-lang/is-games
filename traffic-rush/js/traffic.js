import { H, layout } from "./canvas.js";
import { CONFIG, ENEMY_STYLES } from "./config.js";
import { getCarSprite } from "./vehicle.js";

function randomInt(max) {
  return Math.floor(Math.random() * max);
}

function shuffled(values) {
  const result = values.slice();

  for (let i = result.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    const temp = result[i];
    result[i] = result[j];
    result[j] = temp;
  }

  return result;
}

function getLanes() {
  return Array.from({ length: layout.laneCount }, (_, index) => index);
}

function clampLane(lane) {
  return Math.max(0, Math.min(Math.max(0, layout.laneCount - 1), lane));
}

function pickStyleIndex(state) {
  const count = ENEMY_STYLES.length;
  let index = randomInt(count);

  // Avoid repeating the same body twice in a row too often.
  if (index === state.lastStyleIndex && Math.random() < 0.65) {
    index = (index + 1 + randomInt(count - 1)) % count;
  }

  state.lastStyleIndex = index;
  return index;
}

function enemyHeight(style) {
  return layout.carH * style.lengthFactor;
}

function spawnYFor(height) {
  // Every new car's nose starts at the same line above the screen. Longer
  // bodies simply extend further upwards.
  return -height - CONFIG.spawnTopMargin;
}

function minSameLaneGap(height, otherHeight, speed) {
  return Math.max(
    Math.max(height, otherHeight) * CONFIG.minSameLaneGapRatio,
    speed * CONFIG.minSameLaneGapTime,
  );
}

function hasSafeSpacing(state, lane, y, height, speed) {
  for (const car of state.cars) {
    if (car.lane !== lane) continue;

    const otherHeight = enemyHeight(ENEMY_STYLES[car.styleIndex]);
    const gap = Math.max(
      car.y - (y + height), // Existing car ahead (below the new car).
      y - (car.y + otherHeight), // Existing car behind (above the new car).
    );

    if (gap < minSameLaneGap(height, otherHeight, speed)) {
      return false;
    }
  }

  return true;
}

function findLaneOption(state, lane, speed) {
  const count = ENEMY_STYLES.length;
  let start = randomInt(count);

  if (start === state.lastStyleIndex && Math.random() < 0.65) {
    start = (start + 1 + randomInt(count - 1)) % count;
  }

  for (let i = 0; i < count; i++) {
    const styleIndex = (start + i) % count;
    const style = ENEMY_STYLES[styleIndex];
    const height = enemyHeight(style);
    const y = spawnYFor(height);

    if (hasSafeSpacing(state, lane, y, height, speed)) {
      return { lane, styleIndex, height, y };
    }
  }

  return null;
}

/*
 * Work out when a lane is occupied at the player's row.
 *
 * Traffic only moves down the screen, so relative gaps are preserved. A lane
 * is a valid escape route when:
 *   1. no current car will cross the player's row while the new wave is there;
 *   2. the player can physically move into it before the new wave arrives.
 */
function laneEscapePlan(state, lane, speed, arrivalStart, arrivalEnd) {
  const playerTop = layout.playerTop;
  const playerHeight = layout.carH;
  let freeAt = 0;

  for (const car of state.cars) {
    if (car.lane !== lane) continue;

    const height = enemyHeight(ENEMY_STYLES[car.styleIndex]);
    const start = Math.max(0, (playerTop - (car.y + height)) / speed);
    const end = (playerTop + playerHeight - car.y) / speed;

    if (end <= 0) continue; // Already below the player.

    if (start < arrivalEnd && end > arrivalStart) {
      // This lane is not continuously free while the wave passes.
      return null;
    }

    if (start < arrivalStart) {
      freeAt = Math.max(freeAt, end);
    }
  }

  return { freeAt };
}

function evaluateEscapeLanes(
  state,
  blockedLanes,
  openLanes,
  options,
  speed,
  playerLane,
  buffer = CONFIG.safePassageBuffer || 0,
) {
  const waveHeight = Math.max(
    ...blockedLanes.map((lane) => options[lane].height),
    layout.carH,
  );

  const spawnY = spawnYFor(waveHeight);
  const arrivalStart = (layout.playerTop - (spawnY + waveHeight)) / speed;
  const arrivalEnd = (layout.playerTop + layout.carH - spawnY) / speed;

  const candidates = [];

  for (const lane of openLanes) {
    const distance = Math.abs(lane - playerLane);

    if (distance > CONFIG.maxPathLaneChanges) continue;

    const plan = laneEscapePlan(
      state,
      lane,
      speed,
      arrivalStart - buffer,
      arrivalEnd + buffer,
    );

    if (!plan) continue;

    // Already sitting in the lane: no lane-change time is needed.
    const readyAt =
      distance === 0 ? 0 : plan.freeAt + CONFIG.laneChangeTime * distance;

    if (readyAt > arrivalStart - buffer) continue;

    candidates.push({ lane, distance, readyAt });
  }

  if (!candidates.length) return null;

  candidates.sort(
    (a, b) => a.distance - b.distance || a.readyAt - b.readyAt,
  );

  return {
    safeLane: candidates[0].lane,
    arrivalStart,
    arrivalEnd,
  };
}

/*
 * Builds an intentional set of open lanes.
 *
 * The primary lane is always reachable from both the player's current lane and
 * the previous safe lane. Extra lanes are added for easier patterns, which
 * makes the road feel busy without ever closing every escape route.
 */
function buildOpenSet(state, lanes, playerLane, openCount) {
  const near = lanes.filter(
    (lane) => Math.abs(lane - playerLane) <= CONFIG.maxPathLaneChanges,
  );

  if (!near.length) return null;

  const smooth = near.filter(
    (lane) =>
      Math.abs(lane - clampLane(state.lastSafeLane)) <=
      CONFIG.maxPathLaneChanges,
  );
  const pool = smooth.length ? smooth : near;
  const primary = pool[randomInt(pool.length)];
  const open = [primary];
  const rest = shuffled(lanes.filter((lane) => lane !== primary));

  while (open.length < openCount && rest.length) {
    open.push(rest.pop());
  }

  return open;
}

function chooseBlockCount(state, laneCount, score, difficulty, idle) {
  // Wide roads can lose more lanes at once, but always keep at least two
  // choices so a single blocked lane cannot trap the player. The three-lane
  // layout keeps the original "two blocked, one open" pattern.
  const maxBlocked = Math.max(
    1,
    laneCount - (laneCount >= 4 ? CONFIG.minOpenLanesWide : 1),
  );

  if (idle || laneCount < 3) return 1;

  const multiChance = Math.min(
    CONFIG.multiChanceMax,
    CONFIG.multiChanceBase + difficulty * CONFIG.multiChanceGain,
  );
  const canMulti =
    score >= CONFIG.multiStartScore &&
    state.multiStreak < CONFIG.maxMultiInRow &&
    Math.random() < multiChance;

  if (!canMulti) return 1;

  let blocked = Math.min(2, maxBlocked);

  while (
    blocked < maxBlocked &&
    difficulty >= CONFIG.extraBlockDifficulty &&
    Math.random() < CONFIG.extraBlockChance * difficulty
  ) {
    blocked += 1;
  }

  return blocked;
}

/*
 * Chooser for exactly two lanes.
 *
 * With one blocked lane there is exactly one escape lane, and the escape
 * validator rejects any lane that still has traffic crossing the player's row
 * when the wave arrives. The generic loop below re-rolls the open set until a
 * candidate validates, so it always settled on whichever lane happened to be
 * clear - which is the lane the player was not using. Traffic then piled up in
 * the other lane, keeping that lane unusable as an escape route and pinning the
 * safe passage to the player's lane for the whole run.
 *
 * Instead we alternate the blocked lane across waves and delay the wave when
 * the alternate is not safe yet. Repeating the previous lane on purpose would
 * put a fresh car in the only escape lane for the next wave, which recreates
 * the same deadlock, so a repeat is only allowed as a last-resort safety valve
 * once traffic has stalled for longer than the configured relax window.
 */
function chooseTwoLanePattern(state, speed, playerLane, options) {
  const lastBlocked = clampLane(state.lastSingleLane);
  const alternate = 1 - lastBlocked;
  const stalled =
    (state.elapsed ?? 0) - (state.lastSpawnAt ?? 0) > CONFIG.twoLaneStallRelax;
  const order = stalled ? [alternate, lastBlocked] : [alternate];

  for (const blockedLane of order) {
    const option = options[blockedLane];

    if (!option) continue;

    const openLane = 1 - blockedLane;
    const escape = evaluateEscapeLanes(
      state,
      [blockedLane],
      [openLane],
      options,
      speed,
      playerLane,
      CONFIG.twoLaneEscapeBuffer,
    );

    if (!escape) continue;

    return {
      blocked: [blockedLane],
      safeLane: escape.safeLane,
      multi: false,
      options,
    };
  }

  // Nothing safe this cycle: reject the wave and let the caller retry shortly.
  return null;
}

function choosePattern(state, speed, playerLane, idle) {
  const lanes = getLanes();
  const laneCount = lanes.length;
  const safePlayerLane = clampLane(playerLane);
  const options = {};

  for (const lane of lanes) {
    options[lane] = findLaneOption(state, lane, speed);
  }

  // Two-lane roads need a dedicated chooser; the generic re-rolling loop below
  // would otherwise keep the player's lane permanently empty.
  if (laneCount === 2) {
    return chooseTwoLanePattern(state, speed, safePlayerLane, options);
  }

  const score = idle ? 0 : state.score;
  const difficulty = Math.min(score / CONFIG.difficultyScoreCap, 1);
  const desiredBlockCount = chooseBlockCount(
    state,
    laneCount,
    score,
    difficulty,
    idle,
  );

  // Try the desired complexity first, then relax to simpler waves. This keeps
  // traffic flowing when a dense pattern cannot satisfy the spacing checks.
  for (let blockCount = desiredBlockCount; blockCount >= 1; blockCount--) {
    const openCount = laneCount - blockCount;
    const attempts = Math.max(8, laneCount * 4);

    for (let attempt = 0; attempt < attempts; attempt++) {
      const openLanes = buildOpenSet(
        state,
        lanes,
        safePlayerLane,
        openCount,
      );

      if (!openLanes) continue;

      const blocked = lanes.filter((lane) => !openLanes.includes(lane));

      if (!blocked.every((lane) => options[lane])) continue;

      if (
        blockCount === 1 &&
        blocked[0] === state.lastSingleLane &&
        Math.random() < 0.6
      ) {
        continue;
      }

      const escape = evaluateEscapeLanes(
        state,
        blocked,
        openLanes,
        options,
        speed,
        safePlayerLane,
      );

      if (!escape) continue;

      return {
        blocked,
        safeLane: escape.safeLane,
        multi: blocked.length >= 2,
        options,
      };
    }
  }

  return null;
}

export function createEnemy(lane, y, styleIndex) {
  return {
    lane,
    y,
    styleIndex,
    passed: false,
  };
}

/*
 * Spawns one validated traffic pattern.
 *
 * Returns false when no lane currently satisfies both the same-lane spacing
 * and the safe-passage checks. The caller should retry shortly instead of
 * forcing an unsafe wave into the road.
 */
export function spawnWave(
  state,
  { idle = false, speed = CONFIG.baseSpeed } = {},
) {
  const playerLane = state.player
    ? clampLane(state.player.lane)
    : Math.floor(layout.laneCount / 2);
  const pattern = choosePattern(state, speed, playerLane, idle);

  if (!pattern) return false;

  for (const lane of pattern.blocked) {
    const option = pattern.options[lane];

    state.cars.push(createEnemy(lane, option.y, option.styleIndex));
    state.lastStyleIndex = option.styleIndex;
  }

  state.lastSafeLane = clampLane(pattern.safeLane);
  state.lastSpawnAt = state.elapsed ?? 0;

  if (pattern.multi) {
    state.multiStreak += 1;
  } else {
    state.multiStreak = 0;
    state.lastSingleLane = pattern.blocked[0];
  }

  return true;
}

export function seedIdleTraffic(state) {
  state.cars = [];

  const lanes = getLanes();
  const firstLane = lanes[0] ?? 0;
  const lastLane = lanes[lanes.length - 1] ?? firstLane;
  const firstStyle = pickStyleIndex(state);
  const secondStyle = pickStyleIndex(state);

  state.cars.push(createEnemy(firstLane, layout.carH * 0.15, firstStyle));

  if (lastLane !== firstLane) {
    state.cars.push(createEnemy(lastLane, layout.carH * 1.05, secondStyle));
  }
}

/*
 * Repositions existing traffic after a resize.
 *
 * Cars keep their progress, but if the lane count shrank several lanes can map
 * onto the same lane. The lower car keeps its position and cars above it are
 * pushed upwards until the configured boundary gap is restored. Cars pushed
 * far outside the playfield (or onto the player's new lane) are dropped instead
 * of creating a resize-induced collision.
 */
export function reflowTraffic(state, speed = CONFIG.baseSpeed) {
  if (!layout.laneCount) return;

  state.lastSafeLane = clampLane(state.lastSafeLane);
  state.lastSingleLane = clampLane(state.lastSingleLane);

  if (!state.cars.length) return;

  const lanes = getLanes();
  const byLane = new Map(lanes.map((lane) => [lane, []]));

  for (const car of state.cars) {
    car.lane = clampLane(car.lane);
    byLane.get(car.lane)?.push(car);
  }

  const survivors = [];
  const playerLane = state.player ? clampLane(state.player.lane) : -1;
  const playerTop = layout.playerTop;
  const playerBottom = playerTop + layout.carH;

  for (const lane of lanes) {
    const cars = byLane.get(lane);
    cars.sort((a, b) => b.y - a.y);

    let ahead = null;

    for (const car of cars) {
      const height = enemyHeight(ENEMY_STYLES[car.styleIndex]);

      if (ahead) {
        const aheadHeight = enemyHeight(ENEMY_STYLES[ahead.styleIndex]);
        const gap = minSameLaneGap(height, aheadHeight, speed);
        const maxY = ahead.y - gap - height;

        if (car.y > maxY) car.y = maxY;
      }

      if (
        lane === playerLane &&
        car.y < playerBottom &&
        car.y + height > playerTop
      ) {
        continue;
      }

      if (car.y < -layout.carH * 4) continue;

      survivors.push(car);
      ahead = car;
    }
  }

  state.cars = survivors;
}

export function updateTraffic(state, delta, speed, { score = true } = {}) {
  let passed = 0;

  for (const car of state.cars) {
    car.y += speed * delta;

    if (score && !car.passed) {
      const style = ENEMY_STYLES[car.styleIndex];
      const centerY = car.y + (layout.carH * style.lengthFactor) / 2;

      if (centerY > layout.playerCenterY + layout.carH * 0.06) {
        car.passed = true;
        passed += 1;
      }
    }
  }

  state.cars = state.cars.filter((car) => {
    const style = ENEMY_STYLES[car.styleIndex];
    const height = layout.carH * style.lengthFactor;

    return car.y < H + height + 24;
  });

  return passed;
}

export function drawTraffic(ctx, cars) {  for (const car of cars) {
    const style = ENEMY_STYLES[car.styleIndex];
    const width = layout.carW * style.widthFactor;
    const height = layout.carH * style.lengthFactor;

    const sprite = getCarSprite({
      width,
      height,
      style,
      variant: style.variant,
    });

    ctx.drawImage(
      sprite.canvas,
      layout.laneCenters[car.lane] - sprite.drawW / 2,
      car.y + height / 2 - sprite.drawH / 2,
      sprite.drawW,
      sprite.drawH,
    );
  }
}





