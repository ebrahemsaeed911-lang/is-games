/*
 * X & O computer opponent.
 *
 * The computer does not follow a scripted list of moves. For every empty cell
 * it estimates "if I play here, how likely am I to win?", using the eight
 * winning lines:
 *
 *   - a line that already holds one of my pieces is a live line (1 point)
 *   - a line with two of my pieces is one move away from a win (12 points)
 *   - a line with three of my pieces is already a win (1000 points)
 *   - a line blocked by my opponent is worth nothing
 *
 * The same sum is computed for the opponent as if they took that cell, and the
 * move's score is `attack - 0.9 * defence`: the computer prefers cells that
 * help it and, slightly less urgently, denies them to the player.
 *
 * Breeding two threats at once (a fork) is worth far more than any single line,
 * because only one of them can be blocked, so forks get an extra bonus and
 * handing the opponent a fork gets a penalty. Plain wins and plain blocks are
 * resolved before scoring, so the computer never misses a line it can take or
 * a line it must stop.
 *
 * The engine is DOM-free so it can be exercised from tests: it exposes
 * `chooseMove(cells, me, them)` where `cells` is a flat array of 9 entries
 * holding "X", "O" or null.
 */
(function (global) {
  "use strict";

  const ROWS = 3;
  const CENTER = 4;

  const LINES = (() => {
    const lines = [];

    for (let i = 0; i < ROWS; i++) {
      lines.push([0, 1, 2].map((c) => i * ROWS + c)); // rows
      lines.push([0, 1, 2].map((r) => r * ROWS + i)); // columns
    }

    lines.push([0, 1, 2].map((i) => i * ROWS + i)); // main diagonal
    lines.push([0, 1, 2].map((i) => i * ROWS + (ROWS - 1 - i))); // anti diagonal

    return lines;
  })();

  const LINES_THROUGH = Array.from({ length: ROWS * ROWS }, (_, index) =>
    LINES.filter((line) => line.includes(index))
  );

  // Value of a live line holding N pieces of one player.
  const LINE_VALUE = [0, 1, 12, 1000];

  const DEFENCE_WEIGHT = 0.9;
  const FORK_BONUS = 600;
  const FORK_PENALTY = 800;
  const FORK_RISK_PENALTY = 250;

  // Only ever used to break exact ties: centre first, then corners, then edges.
  const POSITION_VALUE = [0.2, 0, 0.2, 0, 0.5, 0, 0.2, 0, 0.2];

  const opponentOf = (player) => (player === "X" ? "O" : "X");

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
    return LINES_THROUGH[index].some((line) =>
      line.every((cell) => (cell === index ? player : cells[cell]) === player)
    );
  }

  function countWins(cells, player) {
    return emptyCells(cells).filter((index) => winsWith(cells, index, player))
      .length;
  }

  /* Total weight of every line still open to one player. Blocked lines
   * contribute nothing, so this is the board's "winning potential". */
  function potential(cells, player) {
    let total = 0;

    for (const line of LINES) {
      let mine = 0;
      let blocked = false;

      for (const cell of line) {
        const value = cells[cell];

        if (value === player) mine++;
        else if (value) {
          blocked = true;
          break;
        }
      }

      if (!blocked) total += LINE_VALUE[mine];
    }

    return total;
  }

  function rate(cells, index, me, them) {
    const mine = place(cells, index, me);

    const attack = potential(mine, me);
    const defence = potential(mine, them);

    let score = attack - DEFENCE_WEIGHT * defence;

    // Two open threats at once: the opponent can only block one of them.
    if (countWins(mine, me) >= 2) score += FORK_BONUS;
    if (countWins(mine, them) >= 2) score -= FORK_PENALTY;

    // Avoid moves that let the opponent build a fork on their next turn —
    // unless the fork comes too late because we win first.
    const forkRisk = emptyCells(mine).filter((reply) => {
      const after = place(mine, reply, them);

      return countWins(after, them) >= 2 && countWins(after, me) === 0;
    }).length;

    score -= forkRisk * FORK_RISK_PENALTY;

    return score + POSITION_VALUE[index];
  }

  function pickBest(cells, candidates, me, them) {
    let best = candidates[0];
    let bestScore = -Infinity;

    for (const index of candidates) {
      const score = rate(cells, index, me, them);

      if (score > bestScore) {
        bestScore = score;
        best = index;
      }
    }

    return best;
  }

  /* The only public entry point: returns the index the computer plays. */
  function chooseMove(cells, me, them) {
    const empty = emptyCells(cells);

    if (!empty.length) return -1;

    // 1. Finish the game when a line is one move away.
    const winning = empty.find((index) => winsWith(cells, index, me));

    if (winning !== undefined) return winning;

    // 2. Stop the player from finishing theirs.
    const threats = empty.filter((index) => winsWith(cells, index, them));

    if (threats.length) return pickBest(cells, threats, me, them);

    // 3. Otherwise play the cell with the best win odds.
    return pickBest(cells, empty, me, them);
  }

  const api = { chooseMove, scoreMove: rate, potential, winningMoves: countWins, LINES };

  if (typeof module === "object" && module.exports) module.exports = api;

  global.XandoAI = api;
})(typeof window !== "undefined" ? window : globalThis);
