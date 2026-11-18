// Shared IS Games palette
export const COLORS = {
  blue: "#233d4a",
  lightBlue: "#a8bec9",
  darkBlue: "#192a32",
  darkerBlue: "#112129",
  orange: "#f2b237",
  aqua: "#31c4be",
  white: "#f5f5f5",
};

export const CONFIG = {
  // Dynamic road geometry. The lane count is derived from the canvas width and
  // the comfortable lane width below, with at least three lanes on every layout.
  minLanes: 3,
  maxLanes: 5,
  minLaneWidth: 100,
  preferredLaneWidth: 188,
  maxRoadWidth: 1120,
  laneWidthRatio: 0.62,
  minCarWidth: 24,
  maxCarWidth: 94,
  carWidthHeightRatio: 0.135,

  // Timing
  maxDelta: 0.05,
  speedReferenceHeight: 600,
  idleSpeed: 112,
  idleSpawnInterval: 1.65,

  // Difficulty
  baseSpeed: 210,
  maxSpeed: 440,
  baseSpawnInterval: 1.15,
  minSpawnInterval: 0.6,
  difficultyScoreCap: 48,
  initialSpawnDelay: 0.8,

  // Traffic safety and patterns
  multiStartScore: 4,
  multiChanceBase: 0.1,
  multiChanceGain: 0.34,
  multiChanceMax: 0.44,
  maxMultiInRow: 2,
  extraBlockDifficulty: 0.55,
  extraBlockChance: 0.45,
  minOpenLanesWide: 2,
  spawnTopMargin: 10,
  spawnRetryInterval: 0.1,

  // Two-lane roads have a single escape lane, so the blocked lane is chosen
  // with alternation instead of random re-rolling. The stall guard keeps
  // traffic flowing if the alternate lane is momentarily unsafe, and the
  // escape buffer gives the player time to read the free lane.
  twoLaneStallRelax: 3.4,
  twoLaneEscapeBuffer: 0.45,

  // Same-lane following distance. The larger of a body-length ratio and a
  // time-based gap is used, so the safety margin never shrinks as speed rises.
  minSameLaneGapRatio: 0.55,
  minSameLaneGapTime: 0.5,

  // Fair lane changes: the player never needs more than one switch to reach
  // an open lane, and escape lanes get a small timing buffer.
  laneChangeTime: 0.26,
  maxPathLaneChanges: 1,
  safePassageBuffer: 0.08,

  // Player movement
  laneSnapRate: 17,
  tiltFactor: 0.14,
  maxTilt: 0.085,

  // World motion
  roadScrollFactor: 1.65,

  // Fair, slightly forgiving hit boxes
  playerHitWidth: 0.64,
  playerHitHeight: 0.76,
  enemyHitWidth: 0.62,
  enemyHitHeight: 0.74,

  storageKey: "isGames:traffic-rush:best",
};

export const PLAYER_STYLE = {
  id: "player",
  body: COLORS.aqua,
  accent: COLORS.orange,
  window: COLORS.darkBlue,
  glow: true,
  variant: "player",
  widthFactor: 1,
  lengthFactor: 1.02,
};

// Every colour here comes from the IS Games palette (or a shade of it).
export const ENEMY_STYLES = [
  {
    id: "amber",
    body: COLORS.orange,
    accent: COLORS.darkBlue,
    window: COLORS.darkBlue,
    outline: "rgba(255, 236, 190, 0.32)",
    variant: "coupe",
    widthFactor: 0.96,
    lengthFactor: 1.88,
  },
  {
    id: "frost",
    body: COLORS.lightBlue,
    accent: COLORS.blue,
    window: COLORS.darkBlue,
    outline: "rgba(245, 245, 245, 0.3)",
    variant: "suv",
    widthFactor: 1.04,
    lengthFactor: 1.96,
  },
  {
    id: "steel",
    body: COLORS.blue,
    accent: COLORS.aqua,
    window: COLORS.darkerBlue,
    outline: "rgba(168, 190, 201, 0.4)",
    variant: "sedan",
    widthFactor: 1,
    lengthFactor: 2.02,
  },
  {
    id: "onyx",
    body: COLORS.darkBlue,
    accent: COLORS.orange,
    window: "#0b171d",
    outline: "rgba(168, 190, 201, 0.48)",
    variant: "pickup",
    widthFactor: 1.02,
    lengthFactor: 2.05,
  },
];
