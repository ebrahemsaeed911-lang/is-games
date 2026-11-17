import { CONFIG } from "./config.js";
import { loadBestScore } from "./storage.js";

export const gameState = {
  status: "idle",

  bird: null,

  pipes: [],

  score: 0,

  bestScore: loadBestScore(),

  newBest: false,

  animId: null,

  lastFrameTime: 0,

  frameCount: 0,

  nextPipeFrame: CONFIG.pipeInterval,
};
