import { CONFIG, COLORS } from "./config.js";
import { W, H, scaleX, scaleY, gameScale } from "./canvas.js";

export function createPipe() {
  const gap = CONFIG.pipeGap * scaleY;
  const width = CONFIG.pipeWidth * gameScale;

  const minTop = 80 * scaleY;
  const groundHeight = CONFIG.groundHeight * scaleY;

  const maxTop = H - groundHeight - gap - minTop;

  const topH = minTop + Math.random() * Math.max(0, maxTop);

  return {
    x: W + 10 * scaleX,
    topH,
    gap,
    width,
    passed: false,
  };
}

export function updatePipes(pipes, delta) {
  pipes.forEach((pipe) => {
    pipe.x -= CONFIG.pipeSpeed * scaleX * delta;
  });

  return pipes;
}

export function removeOffscreenPipes(pipes) {
  return pipes.filter((pipe) => pipe.x + pipe.width > -10);
}

export function drawPipes(ctx, pipes) {
  const capH = CONFIG.pipeCapHeight * gameScale;

  pipes.forEach((pipe) => {
    const { x, width, topH, gap } = pipe;

    const bottomY = topH + gap;
    const groundY = H - CONFIG.groundHeight * scaleY;

    const bottomH = groundY - bottomY;

    // Pipe gradient
    const gradient = ctx.createLinearGradient(x, 0, x + width, 0);

    gradient.addColorStop(0, COLORS.darkerBlue);
    gradient.addColorStop(0.25, COLORS.blue);
    gradient.addColorStop(0.7, COLORS.darkBlue);
    gradient.addColorStop(1, COLORS.darkerBlue);

    ctx.fillStyle = gradient;

    // Upper pipe body
    ctx.fillRect(
      x + 4 * gameScale,
      0,
      width - 8 * gameScale,
      Math.max(0, topH - capH),
    );

    // Lower pipe body
    ctx.fillRect(
      x + 4 * gameScale,
      bottomY + capH,
      width - 8 * gameScale,
      Math.max(0, bottomH - capH),
    );

    // Pipe outlines
    ctx.strokeStyle = COLORS.aqua;
    ctx.lineWidth = 2 * gameScale;

    ctx.strokeRect(
      x + 4 * gameScale,
      0,
      width - 8 * gameScale,
      Math.max(0, topH - capH),
    );

    ctx.strokeRect(
      x + 4 * gameScale,
      bottomY + capH,
      width - 8 * gameScale,
      Math.max(0, bottomH - capH),
    );

    // Upper pipe cap
    ctx.fillStyle = COLORS.blue;

    ctx.beginPath();

    ctx.roundRect(x, topH - capH, width, capH, [
      0,
      0,
      6 * gameScale,
      6 * gameScale,
    ]);

    ctx.fill();

    // Lower pipe cap
    ctx.beginPath();

    ctx.roundRect(x, bottomY, width, capH, [
      6 * gameScale,
      6 * gameScale,
      0,
      0,
    ]);

    ctx.fill();

    // Aqua borders on caps
    ctx.strokeStyle = COLORS.aqua;
    ctx.lineWidth = 2 * gameScale;

    ctx.beginPath();

    ctx.roundRect(x, topH - capH, width, capH, [
      0,
      0,
      6 * gameScale,
      6 * gameScale,
    ]);

    ctx.stroke();

    ctx.beginPath();

    ctx.roundRect(x, bottomY, width, capH, [
      6 * gameScale,
      6 * gameScale,
      0,
      0,
    ]);

    ctx.stroke();

    // Orange detail
    ctx.fillStyle = COLORS.orange;

    ctx.fillRect(
      x + 8 * gameScale,
      topH - capH + 5 * gameScale,
      width - 16 * gameScale,
      2 * gameScale,
    );

    ctx.fillRect(
      x + 8 * gameScale,
      bottomY + 5 * gameScale,
      width - 16 * gameScale,
      2 * gameScale,
    );
  });
}
