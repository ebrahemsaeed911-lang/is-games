/*
 * Checks the Sega computer opponent from ai.js.
 *
 *   node sega/ai.test.js
 *
 * 1. Every move it returns has to be legal, on any board.
 * 2. It must take a win it can see, and the hard level must stop a line that
 *    is about to finish.
 * 3. The hard level is played against an ordinary player: it should win most
 *    rounds and lose none.
 * 4. The normal level, which the game uses, has to be beatable by that same
 *    ordinary player — otherwise the game is no fun.
 */

const ai = require("./ai.js");

const SIZE = 9;
const MAX_PIECES = 3;

const hasWon = (cells, player) =>
  ai.LINES.some((line) => line.every((index) => cells[index] === player));

const emptyCells = (cells) => {
  const empty = [];

  for (let i = 0; i < cells.length; i++) if (!cells[i]) empty.push(i);

  return empty;
};

const countPieces = (cells, player) =>
  cells.filter((value) => value === player).length;

const applyMove = (cells, move, player) => {
  const next = cells.slice();

  if (move.from !== undefined && move.from !== null) next[move.from] = null;

  next[move.to] = player;
  return next;
};

function movesFor(cells, player) {
  const empty = emptyCells(cells);
  const mine = [];

  for (let i = 0; i < cells.length; i++) {
    if (cells[i] === player) mine.push(i);
  }

  const moves = [];

  if (mine.length < MAX_PIECES) {
    for (const to of empty) moves.push({ type: "place", to });
  }

  for (const from of mine) {
    for (const to of empty) moves.push({ type: "move", from, to });
  }

  return moves;
}

function isLegal(cells, move, player) {
  if (!move || typeof move.to !== "number") return false;
  if (cells[move.to]) return false;

  if (move.from === undefined || move.from === null) {
    return countPieces(cells, player) < MAX_PIECES;
  }

  return cells[move.from] === player && move.from !== move.to;
}

let failed = false;

function check(condition, message) {
  if (!condition) {
    console.error("FAILED:", message);
    failed = true;
  }
}

/* ---------- 1. Legal moves on random boards ---------- */

for (let sample = 0; sample < 400; sample++) {
  const cells = Array(SIZE).fill(null);
  let x = 0;
  let o = 0;

  for (let step = 0; step < 6; step++) {
    const empty = emptyCells(cells);
    const index = empty[Math.floor(Math.random() * empty.length)];

    if (index === undefined) break;

    const player = x <= o && x < MAX_PIECES ? "X" : o < MAX_PIECES ? "O" : "X";

    if (player === "X" && x < MAX_PIECES) {
      cells[index] = "X";
      x++;
    } else if (player === "O" && o < MAX_PIECES) {
      cells[index] = "O";
      o++;
    } else if (x < MAX_PIECES) {
      cells[index] = "X";
      x++;
    } else if (o < MAX_PIECES) {
      cells[index] = "O";
      o++;
    }
  }

  if (hasWon(cells, "X") || hasWon(cells, "O")) continue;

  for (const level of ["normal", "hard"]) {
    for (const me of ["X", "O"]) {
      const them = me === "X" ? "O" : "X";
      const move = ai.chooseMove(cells, me, them, level);

      check(
        isLegal(cells, move, me),
        `${level} returned an illegal move ${JSON.stringify(move)} for ${me} on ` +
          JSON.stringify(cells)
      );
    }
  }
}

/* ---------- 2. Wins and blocks ---------- */

const winNow = ["O", "O", null, "X", "X", null, null, null, null];
const winMove = ai.chooseMove(winNow, "O", "X", "hard");

check(
  hasWon(applyMove(winNow, winMove, "O"), "O"),
  "hard missed a win: " + JSON.stringify(winMove)
);

const blockNow = ["X", "X", null, null, "O", null, null, null, null];

for (let attempt = 0; attempt < 30; attempt++) {
  const move = ai.chooseMove(blockNow, "O", "X", "hard");

  check(
    move.to === 2,
    "hard failed to block the only threat: " + JSON.stringify(move)
  );
}

/* A move into a winning cell also counts: O has no piece there yet but can
 * move one in. */
const blockByMoving = ["X", "X", null, null, "O", null, null, null, "O"];
const move = ai.chooseMove(blockByMoving, "O", "X", "hard");

check(
  move.to === 2 && !hasWon(blockByMoving, "O"),
  "hard did not stop the line by moving a piece in: " + JSON.stringify(move)
);

/* ---------- 3 & 4. Playing whole rounds ---------- */

/* Somebody who takes a win, blocks most of what they notice, places while they
 * can and otherwise plays greedily — roughly how a person plays after a couple
 * of rounds. */
function bestOf(cells, candidates, player) {
  const them = player === "X" ? "O" : "X";

  let best = candidates[0];
  let bestScore = -Infinity;

  for (const candidate of candidates) {
    let score = ai.rateBoard(
      applyMove(cells, candidate, player),
      player,
      them,
      "hard"
    );

    score += Math.random() * 0.3;

    if (score > bestScore) {
      bestScore = score;
      best = candidate;
    }
  }

  return best;
}

function ordinaryPlayer(cells, player) {
  const them = player === "X" ? "O" : "X";
  const moves = movesFor(cells, player);
  const wins = moves.filter((candidate) =>
    hasWon(applyMove(cells, candidate, player), player)
  );

  if (wins.length) return wins[0];

  const blocks = moves.filter((candidate) =>
    hasWon(applyMove(cells, candidate, them), them)
  );

  if (blocks.length && Math.random() < 0.85) return bestOf(cells, blocks, player);

  const placements = moves.filter((candidate) => candidate.type === "place");

  if (
    placements.length &&
    countPieces(cells, player) < MAX_PIECES &&
    Math.random() < 0.2
  ) {
    return placements[Math.floor(Math.random() * placements.length)];
  }

  return bestOf(cells, moves, player);
}

function playRound(level) {
  let cells = Array(SIZE).fill(null);
  let turn = "X";
  const computer = "O";
  const player = "X";

  for (let ply = 0; ply < 100; ply++) {
    if (hasWon(cells, computer)) return "computer";
    if (hasWon(cells, player)) return "player";

    const move =
      turn === computer
        ? ai.chooseMove(cells, computer, player, level)
        : ordinaryPlayer(cells, turn);

    if (!isLegal(cells, move, turn)) return "invalid";

    cells = applyMove(cells, move, turn);
    turn = turn === "X" ? "O" : "X";
  }

  return "stall";
}

function run(level, rounds) {
  const tally = { computer: 0, player: 0, stall: 0, invalid: 0 };

  for (let i = 0; i < rounds; i++) tally[playRound(level)]++;

  return tally;
}

const hard = run("hard", 400);

console.log(
  "hard against an ordinary player:",
  `${hard.computer} computer wins, ${hard.player} player wins, ` +
    `${hard.stall} unfinished, ${hard.invalid} illegal`
);

check(hard.invalid === 0, "hard produced an illegal move during a round");
check(hard.player === 0, "hard lost a round it should not lose");
check(hard.computer >= 300, "hard is not winning enough rounds");

const normal = run("normal", 400);

console.log(
  "normal against an ordinary player:",
  `${normal.computer} computer wins, ${normal.player} player wins, ` +
    `${normal.stall} unfinished, ${normal.invalid} illegal`
);

check(normal.invalid === 0, "normal produced an illegal move during a round");
check(normal.player >= 160, "the normal level is too strong: it is hard to beat");
check(normal.computer >= 40, "the normal level is too weak: it never wins");
check(normal.stall <= 60, "the normal level shuffles pieces for too long");

if (failed) {
  console.error("ai.js did not pass");
  process.exit(1);
}

console.log("all checks passed");
