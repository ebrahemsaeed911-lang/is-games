/*
 * Checks the computer opponent from ai.js.
 *
 *   node XandO/ai.test.js
 *
 * 1. The "hard" level is explored against every possible line of play; not a
 *    single human win may turn up.
 * 2. The "normal" level that the game actually uses is played against a
 *    ordinary player: it must be beatable, otherwise the game is no fun.
 */

const ai = require("./ai.js");

const LINES = ai.LINES;
const HARD = "hard";
const NORMAL = "normal";

function winner(cells) {
  for (const line of LINES) {
    const [a, b, c] = line;

    if (cells[a] && cells[a] === cells[b] && cells[a] === cells[c]) {
      return cells[a];
    }
  }

  return null;
}

function emptyCells(cells) {
  const empty = [];

  for (let i = 0; i < cells.length; i++) if (!cells[i]) empty.push(i);

  return empty;
}

function place(cells, index, player) {
  const next = cells.slice();

  next[index] = player;
  return next;
}

function winsWith(cells, index, player) {
  return LINES.some((line) =>
    line.includes(index) &&
    line.every((cell) => (cell === index ? player : cells[cell]) === player)
  );
}

/* +1 computer win, 0 draw, -1 player win, both sides playing perfectly. */
const memo = new Map();

function solve(cells, turn, computer) {
  const w = winner(cells);

  if (w) return w === computer ? 1 : -1;
  if (!emptyCells(cells).length) return 0;

  const key = cells.map((v) => v || "-").join("") + turn;

  if (memo.has(key)) return memo.get(key);

  const scores = emptyCells(cells).map((index) =>
    solve(place(cells, index, turn), turn === "X" ? "O" : "X", computer)
  );
  const value = turn === computer ? Math.max(...scores) : Math.min(...scores);

  memo.set(key, value);
  return value;
}

/* Every player move is explored; the computer only plays its chosen cell. */
function explore(computer, level) {
  const player = computer === "X" ? "O" : "X";
  const tally = { computerWins: 0, draws: 0, playerWins: 0 };

  function walk(cells, turn) {
    const w = winner(cells);

    if (w) {
      tally[w === computer ? "computerWins" : "playerWins"]++;
      return;
    }

    if (!emptyCells(cells).length) {
      tally.draws++;
      return;
    }

    if (turn === computer) {
      const move = ai.chooseMove(cells, computer, player, level);

      walk(place(cells, move, computer), player);
      return;
    }

    for (const index of emptyCells(cells)) {
      walk(place(cells, index, player), computer);
    }
  }

  walk(Array(9).fill(null), player);
  return tally;
}

/* Somebody who takes a win, blocks half of the threats they notice, and
 * otherwise plays whatever looks fine. */
function ordinaryPlayer(cells, player) {
  const other = player === "X" ? "O" : "X";
  const empty = emptyCells(cells);
  const win = empty.find((index) => winsWith(cells, index, player));

  if (win !== undefined) return win;

  const block = empty.find((index) => winsWith(cells, index, other));

  if (block !== undefined && Math.random() < 0.5) return block;

  return empty[Math.floor(Math.random() * empty.length)];
}

function playGame(level, hits) {
  let cells = Array(9).fill(null);
  let turn = "X";
  const computer = "O";

  for (;;) {
    const w = winner(cells);

    if (w) {
      if (w === computer) hits.computerWins++;
      else hits.playerWins++;
      return;
    }

    if (!emptyCells(cells).length) {
      hits.draws++;
      return;
    }

    const move =
      turn === computer
        ? ai.chooseMove(cells, computer, "X", level)
        : ordinaryPlayer(cells, turn);

    cells = place(cells, move, turn);
    turn = turn === "X" ? "O" : "X";
  }
}

let failed = false;

for (const computer of ["O", "X"]) {
  const tally = explore(computer, HARD);

  console.log(
    `hard, computer as ${computer}:`,
    `${tally.computerWins} wins, ${tally.draws} draws, ${tally.playerWins} losses`
  );

  if (tally.playerWins > 0) failed = true;
}

const opening = Array(9).fill(null);
const perfect = solve(opening, "X", "O");

console.log("hard, computer as O against perfect play:", perfect === 0 ? "draw" : "FAILED");

if (perfect !== 0) failed = true;

const hits = { computerWins: 0, draws: 0, playerWins: 0 };

for (let game = 0; game < 400; game++) playGame(NORMAL, hits);

console.log(
  "normal against an ordinary player:",
  `${hits.computerWins} computer wins, ${hits.draws} draws, ${hits.playerWins} player wins`
);

if (hits.playerWins === 0) {
  console.error("the normal level is too strong: it cannot be beaten");
  failed = true;
}

if (failed) {
  console.error("ai.js did not pass");
  process.exit(1);
}

console.log("all checks passed");
