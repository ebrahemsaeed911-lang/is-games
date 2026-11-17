/*
 * Programmatic top-down vehicle artwork.
 *
 * Each car is rendered once into an offscreen Canvas at the current device
 * pixel ratio, then blitted every frame. This keeps the main loop cheap while
 * still giving every vehicle a detailed Canvas-drawn body, glass, lights and
 * shadow.
 */

const spriteCache = new Map();

function hexToRgb(hex) {
  const value = Number.parseInt(hex.replace("#", ""), 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function shade(hex, amount) {
  const { r, g, b } = hexToRgb(hex);
  const target = amount < 0 ? 0 : 255;
  const mix = Math.abs(amount);

  return `rgb(${Math.round(r + (target - r) * mix)}, ${Math.round(
    g + (target - g) * mix,
  )}, ${Math.round(b + (target - b) * mix)})`;
}

function alpha(hex, value) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${value})`;
}

function roundRect(ctx, x, y, w, h, r) {
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

function bodyPath(ctx, w, h, variant) {
  const hw = w / 2;
  const hh = h / 2;

  const nose = w * (variant === "coupe" ? 0.3 : variant === "suv" ? 0.37 : 0.34);
  const tail = w * (variant === "coupe" ? 0.32 : variant === "suv" ? 0.39 : 0.35);
  const round = w * (variant === "suv" ? 0.17 : 0.23);

  ctx.beginPath();
  ctx.moveTo(-nose, -hh);
  ctx.quadraticCurveTo(-hw * 0.96, -hh, -hw, -hh + round);
  ctx.lineTo(-hw, hh - round * 1.35);
  ctx.quadraticCurveTo(-hw, hh, -tail, hh);
  ctx.lineTo(tail, hh);
  ctx.quadraticCurveTo(hw, hh, hw, hh - round * 1.35);
  ctx.lineTo(hw, -hh + round);
  ctx.quadraticCurveTo(hw * 0.96, -hh, nose, -hh);
  ctx.closePath();
}

function drawWheels(ctx, w, h) {
  const hw = w / 2;
  const hh = h / 2;
  const wheelW = w * 0.13;
  const wheelH = h * 0.17;

  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      const x = sx * (hw - wheelW * 0.16) - wheelW / 2;
      const y = sy * hh * 0.52 - wheelH / 2;

      roundRect(ctx, x, y, wheelW, wheelH, wheelW * 0.36);
      ctx.fillStyle = "#0a151a";
      ctx.fill();

      roundRect(
        ctx,
        x + wheelW * 0.14,
        y + wheelH * 0.12,
        wheelW * 0.38,
        wheelH * 0.76,
        wheelW * 0.2,
      );
      ctx.fillStyle = "rgba(168, 190, 201, 0.2)";
      ctx.fill();
    }
  }
}

function drawGlass(ctx, w, h, style, variant) {
  const hh = h / 2;
  const glass = style.window;

  // Windshield
  const wsTop = -hh * 0.4;
  const wsBottom = -hh * 0.16;
  const wsTopW = w * (variant === "suv" ? 0.66 : 0.61);
  const wsBottomW = w * 0.5;

  ctx.beginPath();
  ctx.moveTo(-wsTopW / 2, wsTop);
  ctx.lineTo(wsTopW / 2, wsTop);
  ctx.lineTo(wsBottomW / 2, wsBottom);
  ctx.quadraticCurveTo(0, wsBottom + hh * 0.035, -wsBottomW / 2, wsBottom);
  ctx.closePath();
  ctx.fillStyle = alpha(glass, 0.96);
  ctx.fill();
  ctx.strokeStyle = "rgba(168, 190, 201, 0.2)";
  ctx.lineWidth = Math.max(0.7, w * 0.012);
  ctx.stroke();

  // Glass shine
  ctx.beginPath();
  ctx.moveTo(-wsTopW * 0.32, wsTop + hh * 0.02);
  ctx.lineTo(wsTopW * 0.04, wsTop + hh * 0.02);
  ctx.lineTo(-wsBottomW * 0.12, wsBottom - hh * 0.012);
  ctx.lineTo(-wsBottomW * 0.38, wsBottom - hh * 0.012);
  ctx.closePath();
  ctx.fillStyle = "rgba(168, 190, 201, 0.16)";
  ctx.fill();

  // Rear window
  const rwTop = hh * (variant === "suv" ? 0.3 : 0.32);
  const rwBottom = hh * (variant === "suv" ? 0.56 : variant === "pickup" ? 0.48 : 0.54);
  const rwTopW = w * 0.56;
  const rwBottomW = w * 0.67;

  ctx.beginPath();
  ctx.moveTo(-rwTopW / 2, rwTop);
  ctx.quadraticCurveTo(0, rwTop - hh * 0.03, rwTopW / 2, rwTop);
  ctx.lineTo(rwBottomW / 2, rwBottom);
  ctx.lineTo(-rwBottomW / 2, rwBottom);
  ctx.closePath();
  ctx.fillStyle = alpha(glass, 0.94);
  ctx.fill();
  ctx.strokeStyle = "rgba(168, 190, 201, 0.16)";
  ctx.stroke();
}

function drawRoof(ctx, w, h, style, variant) {
  const hh = h / 2;
  const roofY = -hh * 0.15;
  const roofH = hh * (variant === "suv" ? 0.5 : 0.46);
  const roofW = w * 0.56;

  roundRect(ctx, -roofW / 2, roofY, roofW, roofH, w * 0.08);
  ctx.fillStyle = shade(style.body, -0.13);
  ctx.fill();

  roundRect(
    ctx,
    -roofW * 0.37,
    roofY + roofH * 0.14,
    roofW * 0.74,
    roofH * 0.58,
    w * 0.05,
  );
  ctx.fillStyle = "rgba(255, 255, 255, 0.055)";
  ctx.fill();

  if (variant === "suv") {
    ctx.fillStyle = alpha(style.accent, 0.62);

    for (const y of [roofY + roofH * 0.18, roofY + roofH * 0.8]) {
      roundRect(ctx, -roofW * 0.4, y, roofW * 0.8, Math.max(1.5, w * 0.025), w * 0.012);
      ctx.fill();
    }
  }
}

function drawPickupBed(ctx, w, h, style) {
  const hh = h / 2;
  const bedW = w * 0.66;
  const bedTop = hh * 0.55;
  const bedH = hh * 0.4;

  roundRect(ctx, -bedW / 2, bedTop, bedW, bedH, w * 0.06);
  ctx.fillStyle = shade(style.body, -0.36);
  ctx.fill();
  ctx.strokeStyle = style.outline || "rgba(168, 190, 201, 0.3)";
  ctx.lineWidth = Math.max(0.8, w * 0.014);
  ctx.stroke();

  ctx.strokeStyle = "rgba(168, 190, 201, 0.16)";
  ctx.lineWidth = Math.max(0.7, w * 0.01);

  for (let i = 1; i <= 3; i++) {
    const x = -bedW / 2 + (bedW * i) / 4;
    ctx.beginPath();
    ctx.moveTo(x, bedTop + bedH * 0.16);
    ctx.lineTo(x, bedTop + bedH * 0.84);
    ctx.stroke();
  }
}

function drawAccents(ctx, w, h, style, variant) {
  const hh = h / 2;

  // Side accent line
  ctx.strokeStyle = alpha(style.accent, style.variant === "player" ? 0.9 : 0.45);
  ctx.lineWidth = Math.max(1, w * 0.022);
  ctx.lineCap = "round";

  for (const sx of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(sx * w * 0.43, -hh * 0.1);
    ctx.lineTo(sx * w * 0.43, hh * 0.42);
    ctx.stroke();
  }

  if (variant === "player") {
    // Twin racing stripes, clipped to the body.
    ctx.save();
    bodyPath(ctx, w, h, variant);
    ctx.clip();

    ctx.fillStyle = alpha(style.accent, 0.92);

    for (const offset of [-0.065, 0.065]) {
      ctx.fillRect(-w * 0.028 + w * offset, -hh * 0.94, w * 0.056, h * 0.88);
    }

    ctx.restore();

    // Rear spoiler
    roundRect(ctx, -w * 0.4, hh * 0.79, w * 0.8, h * 0.025, w * 0.012);
    ctx.fillStyle = alpha(style.accent, 0.95);
    ctx.fill();
  }

  if (variant === "coupe") {
    // Small boot lip spoiler
    roundRect(ctx, -w * 0.36, hh * 0.8, w * 0.72, h * 0.022, w * 0.01);
    ctx.fillStyle = style.accent;
    ctx.fill();
  }

  if (variant === "suv") {
    // Roof cargo hint
    roundRect(ctx, -w * 0.3, -hh * 0.05, w * 0.6, h * 0.032, w * 0.012);
    ctx.fillStyle = alpha(style.accent, 0.34);
    ctx.fill();
  }
}

function drawLights(ctx, w, h, style) {
  const hh = h / 2;
  const lightW = w * 0.2;
  const lightH = h * 0.038;
  const lightY = -hh + h * 0.035;

  // Headlights
  for (const sx of [-1, 1]) {
    roundRect(
      ctx,
      sx * w * 0.27 - lightW / 2,
      lightY,
      lightW,
      lightH,
      lightH * 0.45,
    );
    ctx.fillStyle = "#dffbff";
    ctx.fill();

    roundRect(
      ctx,
      sx * w * 0.27 - lightW * 0.32,
      lightY + lightH * 0.2,
      lightW * 0.64,
      lightH * 0.6,
      lightH * 0.3,
    );
    ctx.fillStyle = "rgba(255, 255, 255, 0.88)";
    ctx.fill();
  }

  // Taillights, framed in a dark housing so they read on every body colour.
  const tailH = h * 0.045;
  const tailY = hh - h * 0.062;

  for (const sx of [-1, 1]) {
    roundRect(
      ctx,
      sx * w * 0.28 - lightW * 0.55,
      tailY - tailH * 0.12,
      lightW * 1.1,
      tailH * 1.24,
      tailH * 0.35,
    );
    ctx.fillStyle = "#0a151a";
    ctx.fill();

    roundRect(
      ctx,
      sx * w * 0.28 - lightW * 0.45,
      tailY,
      lightW * 0.9,
      tailH,
      tailH * 0.4,
    );
    ctx.fillStyle = "#f7a23a";
    ctx.fill();
  }

  // Licence plate
  roundRect(ctx, -w * 0.115, hh * 0.83, w * 0.23, h * 0.028, w * 0.012);
  ctx.fillStyle = "rgba(168, 190, 201, 0.8)";
  ctx.fill();

  ctx.fillStyle = "rgba(17, 33, 41, 0.65)";
  ctx.fillRect(-w * 0.045, hh * 0.842, w * 0.09, h * 0.004);
}

function drawMirrors(ctx, w, h, style) {
  const hh = h / 2;

  for (const sx of [-1, 1]) {
    roundRect(
      ctx,
      sx * (w * 0.47) - w * 0.065,
      -hh * 0.24,
      w * 0.13,
      h * 0.026,
      w * 0.025,
    );
    ctx.fillStyle = style.variant === "player" ? style.accent : shade(style.body, -0.2);
    ctx.fill();
  }
}

function drawCarArt(ctx, w, h, style, variant) {
  const hw = w / 2;
  const hh = h / 2;

  // Ground shadow
  ctx.save();
  ctx.fillStyle = "rgba(0, 0, 0, 0.46)";
  ctx.shadowColor = "rgba(0, 0, 0, 0.55)";
  ctx.shadowBlur = w * 0.4;
  ctx.shadowOffsetY = w * 0.08;
  bodyPath(ctx, w, h, variant);
  ctx.fill();
  ctx.restore();

  // Player under-glow
  if (style.glow) {
    ctx.save();
    ctx.shadowColor = style.body;
    ctx.shadowBlur = w * 0.55;
    ctx.fillStyle = alpha(style.body, 0.3);
    bodyPath(ctx, w, h, variant);
    ctx.fill();
    ctx.restore();
  }

  drawWheels(ctx, w, h);

  // Body paint
  const paint = ctx.createLinearGradient(-hw, 0, hw, 0);
  paint.addColorStop(0, shade(style.body, -0.3));
  paint.addColorStop(0.18, shade(style.body, -0.08));
  paint.addColorStop(0.48, shade(style.body, 0.14));
  paint.addColorStop(0.74, style.body);
  paint.addColorStop(1, shade(style.body, -0.32));

  bodyPath(ctx, w, h, variant);
  ctx.fillStyle = paint;
  ctx.fill();

  ctx.strokeStyle = style.outline || alpha(style.body, 0.85);
  ctx.lineWidth = Math.max(0.8, w * 0.016);
  ctx.stroke();

  // Soft top gloss
  ctx.save();
  bodyPath(ctx, w, h, variant);
  ctx.clip();

  const gloss = ctx.createLinearGradient(-hw, -hh, hw * 0.2, hh * 0.2);
  gloss.addColorStop(0, "rgba(255, 255, 255, 0.2)");
  gloss.addColorStop(0.4, "rgba(255, 255, 255, 0.04)");
  gloss.addColorStop(1, "rgba(0, 0, 0, 0.08)");
  ctx.fillStyle = gloss;
  ctx.fillRect(-hw, -hh, w, h);
  ctx.restore();

  // Hood detail
  roundRect(ctx, -w * 0.26, -hh * 0.78, w * 0.52, hh * 0.16, w * 0.04);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
  ctx.lineWidth = Math.max(0.6, w * 0.01);
  ctx.stroke();

  drawGlass(ctx, w, h, style, variant);
  drawRoof(ctx, w, h, style, variant);

  if (variant === "pickup") {
    drawPickupBed(ctx, w, h, style);
  }

  drawAccents(ctx, w, h, style, variant);
  drawMirrors(ctx, w, h, style);
  drawLights(ctx, w, h, style);
}

export function getCarSprite({ width, height, style, variant }) {
  const w = Math.max(10, Math.round(width));
  const h = Math.max(16, Math.round(height));
  const ratio = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
  const key = `${style.id}|${variant}|${w}|${h}|${ratio}`;

  const cached = spriteCache.get(key);
  if (cached) return cached;

  const padding = Math.ceil(Math.max(w, h) * 0.3);
  const drawW = w + padding * 2;
  const drawH = h + padding * 2;

  const sprite = document.createElement("canvas");
  sprite.width = Math.max(1, Math.ceil(drawW * ratio));
  sprite.height = Math.max(1, Math.ceil(drawH * ratio));

  const g = sprite.getContext("2d");
  g.scale(ratio, ratio);
  g.translate(padding + w / 2, padding + h / 2);

  drawCarArt(g, w, h, style, variant);

  const entry = { canvas: sprite, drawW, drawH };
  spriteCache.set(key, entry);

  return entry;
}

export function clearCarSpriteCache() {
  spriteCache.clear();
}
