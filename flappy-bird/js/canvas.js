export const canvas = document.getElementById("gameCanvas");
export const ctx = canvas.getContext("2d");

// Canvas dimensions
export let W = 0;
export let H = 0;

export let scaleX = 1;
export let scaleY = 1;
export let gameScale = 1;

let resizeHandler = null;

// The game module registers this to preserve object positions and redraw
// after the canvas size changes, without creating a circular dependency.
export function setResizeHandler(handler) {
  resizeHandler = handler;
}

export function resizeCanvas() {
  const oldW = W;
  const oldH = H;

  const rect = canvas.getBoundingClientRect();

  const newW = rect.width;
  const newH = rect.height;

  if (!newW || !newH) return;

  W = newW;
  H = newH;

  scaleX = W / 360;
  scaleY = H / 540;

  gameScale = Math.min(scaleX, scaleY);

  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // Preserve game objects when screen dimensions change
  if (oldW && oldH && resizeHandler) {
    resizeHandler(oldW, oldH);
  }
}

window.addEventListener("resize", resizeCanvas);

window.addEventListener("orientationchange", () => {
  requestAnimationFrame(resizeCanvas);
});

resizeCanvas();
