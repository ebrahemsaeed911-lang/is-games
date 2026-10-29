/*
 * Checks the computer opponent from ai.js.
 *
 *   node XandO/ai.test.js
 *
 * The player gets to try every possible line of play while the computer always
 * answers with its own policy. If a single human win turns up, the engine is
 * not good enough and the test fails.
 */

const ai = require("./ai.js");

const LINES = ai.LINES;

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

/* +1 computer win, 0 draw, -1 player win, both sides playing perfectly. */
const memo = new Map();

function solve(cells, turn, computer) {
  const w = winner(cells);

  if (w) return w === computer ? 1 : -1;
  if (!emptyCells(cells).length) return 0;

  const key = cells.map((v) => v || "-").join("") + turn;

  if (memo.has(key)) return memo.get(key);

  const scores = emptyCells(cells).map((index) =>
    solve(place(cells, index, turn), turn === "X" ? "O" : "X", computer),
  );
  const value = turn === computer ? Math.max(...scores) : Math.min(...scores);

  memo.set(key, value);
  return value;
}

/* Every player move is explored; the computer only plays its chosen cell. */
function explore(computer) {
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
      walk(
        place(cells, ai.chooseMove(cells, computer, player), computer),
        player,
      );
      return;
    }

    for (const index of emptyCells(cells)) {
      walk(place(cells, index, player), computer);
    }
  }

  walk(Array(9).fill(null), player);
  return tally;
}

let failed = false;

for (const computer of ["O", "X"]) {
  const tally = explore(computer);

  console.log(
    `computer as ${computer}:`,
    `${tally.computerWins} wins, ${tally.draws} draws, ${tally.playerWins} losses`,
  );

  if (tally.playerWins > 0) failed = true;
}

const opening = Array(9).fill(null);

console.log(
  "computer as O against perfect play:",
  solve(opening, "X", "O") === 0 ? "draw (cannot be beaten)" : "FAILED",
);

if (solve(opening, "X", "O") !== 0) failed = true;

if (failed) {
  process.exit(1);
}
