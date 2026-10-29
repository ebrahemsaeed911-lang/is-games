/*
 * Sega computer opponent.
 *
 * Sega is not X & O with three pieces: pieces may be picked up and moved, so a
 * single piece can be worth a different amount from one turn to the next.
 * The computer therefore rates *moves*, not cells: for every legal move it
 * looks at the board that move would leave behind and asks "how good is this
 * for me?".
 *
 * A legal move is either
 *   - a placement (`{ type: "place", to }`) while I have fewer than 3 pieces,
 *   - or a move of one of my own pieces (`{ type: "move", from, to }`), which is
 *     allowed at any time.
 *
 * The board is rated on the six winning lines — rows and columns, never
 * diagonals — exactly like X & O:
 *
 *   - a line holding one of my pieces is live (1 point)
 *   - a line with two of my pieces is one move from a win (12 points)
 *   - a line with three of my pieces is a win (1000 points)
 *   - a line blocked by the opponent is worth nothing
 *
 * The move's score is `attack - defenceWeight * defence`: the computer prefers
 * moves that help it and, depending on the level, also denies the player.
 *
 * Two levels:
 *
 *   "normal" (what the game uses) plays like a casual person. It takes every
 *   win it sees and usually blocks a line that is about to finish, but it has a
 *   weak sense of defence (0.4), does not plan forks, and about one time in
 *   three it misses a block. A person who keeps an eye on the board can beat it.
 *
 *   "hard" is the careful version: full defence, it hunts for forks, it knows
 *   what a fork left to the opponent costs, and it looks at the opponent's best
 *   answer before choosing. It is much harder to beat, though not perfect.
 *
 * Neither level likes to shuffle. Given the moves it played on its last turns
 * (`history`), it avoids sending a piece straight back where it came from and
 * avoids playing the same move twice in a row, unless that move is the only way
 * to stop the opponent's line.
 *
 * The engine knows nothing about the DOM: `chooseMove(cells, me, them, level,
 * history)` takes a flat array of 9 entries holding "X", "O" or null and returns
 * the move object to play (or null when there is nothing to do).
 */
(function (global) {
  "use strict";

  const ROWS = 3;
  const MAX_PIECES = 3;
  const SIZE = ROWS * ROWS;

  const LINES = (() => {
    const lines = [];

    for (let i = 0; i < ROWS; i++) {
      lines.push([0, 1, 2].map((c) => i * ROWS + c)); // rows
      lines.push([0, 1, 2].map((r) => r * ROWS + i)); // columns
    }

    return lines;
  })();

  const LINES_THROUGH = Array.from({ length: SIZE }, (_, index) =>
    LINES.filter((line) => line.includes(index))
  );

  // Value of a live line holding N pieces of one player.
  const LINE_VALUE = [0, 1, 12, 1000];

  // Moving is only free once the three pieces are out; before that a placement
  // is usually the better use of a turn.
  const MOVE_PENALTY = 1.5;

  // Only ever used to break exact ties: centre first, then corners, then edges.
  const POSITION_VALUE = [0.2, 0, 0.2, 0, 0.5, 0, 0.2, 0, 0.2];

  const WIN = 100000;

  const LEVELS = {
    normal: {
      missBlock: 0.3,
      lookahead: false,
      defence: 0.4,
      forkBonus: 0,
      forkPenalty: 0,
      threatPenalty: 0,
    },
    hard: {
      missBlock: 0,
      lookahead: true,
      defence: 0.9,
      forkBonus: 600,
      forkPenalty: 800,
      threatPenalty: 0,
    },
  };

  const emptyCells = (cells) => {
    const empty = [];

    for (let i = 0; i < cells.length; i++) if (!cells[i]) empty.push(i);

    return empty;
  };

  const indicesOf = (cells, player) => {
    const mine = [];

    for (let i = 0; i < cells.length; i++) if (cells[i] === player) mine.push(i);

    return mine;
  };

  function applyMove(cells, move, player) {
    const next = cells.slice();

    if (move.from !== undefined && move.from !== null) next[move.from] = null;

    next[move.to] = player;
    return next;
  }

  /* Would `player` complete a row or column by taking this empty cell? */
  function winsAt(cells, index, player) {
    return LINES_THROUGH[index].some((line) =>
      line.every((cell) => (cell === index ? player : cells[cell]) === player)
    );
  }

  function hasWon(cells, player) {
    return LINES.some((line) => line.every((cell) => cells[cell] === player));
  }

  /* Empty cells where the player wins immediately. In Sega that covers both a
   * placement and moving an existing piece in, so it does not depend on how
   * many pieces they have. */
  function winningMoves(cells, player) {
    return emptyCells(cells).filter((index) => winsAt(cells, index, player));
  }

  /* Total weight of every row/column still open to one player. */
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

  function legalMoves(cells, player) {
    const empty = emptyCells(cells);
    const mine = indicesOf(cells, player);
    const moves = [];

    if (mine.length < MAX_PIECES) {
      for (const to of empty) moves.push({ type: "place", to });
    }

    for (const from of mine) {
      for (const to of empty) moves.push({ type: "move", from, to });
    }

    return moves;
  }

  /* How good the board looks for `me`, with `them` to move next. */
  function rateBoard(cells, me, them, level) {
    const weights = LEVELS[level] || LEVELS.normal;
    let score =
      potential(cells, me) - weights.defence * potential(cells, them);

    if (weights.forkBonus || weights.forkPenalty || weights.threatPenalty) {
      const myThreats = winningMoves(cells, me).length;
      const theirThreats = winningMoves(cells, them).length;

      // Two threats at once: only one of them can be blocked.
      if (myThreats >= 2) score += weights.forkBonus;
      if (theirThreats) score -= weights.threatPenalty * theirThreats;
      if (theirThreats >= 2) score -= weights.forkPenalty;
    }

    return score;
  }

  function scoreMove(cells, move, me, them, level) {
    const after = applyMove(cells, move, me);
    let score = rateBoard(after, me, them, level) + POSITION_VALUE[move.to];

    if (move.type === "move" && indicesOf(cells, me).length < MAX_PIECES) {
      score -= MOVE_PENALTY;
    }

    return score;
  }

  /* Same move, but after the opponent has answered as well as they can. */
  function scoreMoveWithReply(cells, move, me, them, level) {
    const after = applyMove(cells, move, me);
    const replies = legalMoves(after, them);

    if (!replies.length) return rateBoard(after, me, them, level);

    let worst = Infinity;

    for (const reply of replies) {
      const next = applyMove(after, reply, them);

      let value;

      if (hasWon(next, them)) value = -WIN;
      else if (winningMoves(next, me).length) value = WIN;
      else value = rateBoard(next, me, them, level);

      if (value < worst) worst = value;
    }

    return worst + POSITION_VALUE[move.to];
  }

  function pickBest(cells, candidates, me, them, level, lookahead) {
    const score = lookahead ? scoreMoveWithReply : scoreMove;

    let best = candidates[0];
    let bestScore = -Infinity;

    for (const move of candidates) {
      const value = score(cells, move, me, them, level);

      if (value > bestScore) {
        bestScore = value;
        best = move;
      }
    }

    return best;
  }

  const moveKey = (move) => `${move.from ?? "-"}>${move.to}`;

  /* A piece that goes A -> B and is then sent straight back B -> A looks like
   * the computer is stuck. The same is true of playing the identical move twice
   * in a row. `history` holds the computer's own previous moves, oldest first. */
  function repeats(move, history) {
    if (!history || !history.length) return false;

    const last = history[history.length - 1];

    if (
      last.from !== undefined &&
      last.from !== null &&
      move.from === last.to &&
      move.to === last.from
    ) {
      return true;
    }

    const recent = new Set(history.slice(-2).map(moveKey));

    return recent.has(moveKey(move));
  }

  /* Prefer fresh moves, but never leave the board without a move at all. */
  function freshMoves(moves, history) {
    const fresh = moves.filter((move) => !repeats(move, history));

    return fresh.length ? fresh : moves;
  }

  /* The only public entry point: returns the move the computer plays.
   * `history` is optional: the moves the computer played on its last turns. */
  function chooseMove(cells, me, them, level, history) {
    const moves = legalMoves(cells, me);

    if (!moves.length) return null;

    // 1. Finish the game when a line is one move away. Even the relaxed level
    //    takes a win it can see, so it never looks broken.
    const wins = moves.filter((move) => hasWon(applyMove(cells, move, me), me));

    if (wins.length) return pickBest(cells, wins, me, them, level, false);

    const weights = LEVELS[level] || LEVELS.normal;

    // 2. Stop the player from finishing their line. The normal level lets a few
    //    of these go by, which is where a person gets a chance to win.
    const threats = winningMoves(cells, them);
    let candidates = moves;

    if (threats.length) {
      const blocks = moves.filter((move) => threats.includes(move.to));
      const skipping = weights.missBlock > 0 && Math.random() < weights.missBlock;

      // A repeat is only dropped when another block is available.
      if (blocks.length && !skipping) candidates = freshMoves(blocks, history);
    }

    // 3. Otherwise play the move with the best win odds.
    return pickBest(
      cells,
      freshMoves(candidates, history),
      me,
      them,
      level,
      weights.lookahead
    );
  }

  const api = {
    chooseMove,
    legalMoves,
    winningMoves,
    potential,
    rateBoard,
    scoreMove,
    LINES,
    LEVELS,
  };

  if (typeof module === "object" && module.exports) module.exports = api;

  global.SegaAI = api;
})(typeof window !== "undefined" ? window : globalThis);
