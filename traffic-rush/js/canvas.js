import { CONFIG } from "./config.js";

export const canvas = document.getElementById("gameCanvas");
export const ctx = canvas.getContext("2d");

export let W = 0;
export let H = 0;
export let dpr = 1;

// Live layout values. Modules read these objects every frame so a resize is
// picked up without rebuilding the game state.
export const layout = {
  laneCount: 0,
  roadX: 0,
  roadW: 0,
  laneWidth: 0,
  laneCenters: [],
  carW: 0,
  carH: 0,
  playerTop: 0,
  playerCenterY: 0,
};

let resizeHandler = null;

export function setResizeHandler(handler) {
  resizeHandler = handler;
}

export function getLaneCount() {
  return Math.max(1, layout.laneCount);
}

export function getCenterLane() {
  return Math.floor(getLaneCount() / 2);
}

export function getLaneCenter(lane) {
  const count = getLaneCount();
  const index = Math.max(0, Math.min(count - 1, lane));

  return layout.laneCenters[index] ?? layout.roadX + layout.roadW / 2;
}

/*
 * Chooses the lane count from the space actually available to the road.
 *
 * A comfortable lane is around preferredLaneWidth wide. Every layout keeps at
 * least three usable lanes, while wide screens grow to four or five. The
 * minimum lane width acts as a hard lower bound so cars never end up wedged
 * against a lane edge.
 */
function chooseLaneCount(roadWidth) {
  let count = Math.round(roadWidth / CONFIG.preferredLaneWidth);

  count = Math.max(CONFIG.minLanes, Math.min(CONFIG.maxLanes, count));

  while (count > CONFIG.minLanes && roadWidth / count < CONFIG.minLaneWidth) {
    count -= 1;
  }

  return count;
}

export function updateLayout() {
  if (!W || !H) return;

  const sideMargin = Math.max(8, W * 0.035);
  const available = Math.max(80, W - sideMargin * 2);
  const roadW = Math.min(available, CONFIG.maxRoadWidth);

  const laneCount = chooseLaneCount(roadW);
  const laneWidth = roadW / laneCount;
  const roadX = (W - roadW) / 2;

  const carFloor = Math.min(CONFIG.minCarWidth, laneWidth * 0.9);
  const carW = Math.max(
    carFloor,
    Math.min(
      laneWidth * CONFIG.laneWidthRatio,
      H * CONFIG.carWidthHeightRatio,
      CONFIG.maxCarWidth,
    ),
  );
  const carH = carW * 2.02;
  const bottomPad = Math.max(16, Math.min(H * 0.1, 70));

  layout.laneCount = laneCount;
  layout.roadX = roadX;
  layout.roadW = roadW;
  layout.laneWidth = laneWidth;
  layout.laneCenters = Array.from(
    { length: laneCount },
    (_, index) => roadX + laneWidth * (index + 0.5),
  );
  layout.carW = carW;
  layout.carH = carH;
  layout.playerTop = Math.max(0, H - bottomPad - carH);
  layout.playerCenterY = layout.playerTop + carH * 0.5;
}

export function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();

  if (!rect.width || !rect.height) return;

  const oldW = W;
  const oldH = H;
  const oldLaneCount = layout.laneCount;

  W = rect.width;
  H = rect.height;

  dpr = Math.min(window.devicePixelRatio || 1, 2);

  canvas.width = Math.max(1, Math.round(W * dpr));
  canvas.height = Math.max(1, Math.round(H * dpr));

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  updateLayout();

  if (oldW && oldH && resizeHandler) {
    resizeHandler(oldW, oldH, oldLaneCount);
  }
}

window.addEventListener("resize", resizeCanvas);

window.addEventListener("orientationchange", () => {
  requestAnimationFrame(resizeCanvas);
});

resizeCanvas();
