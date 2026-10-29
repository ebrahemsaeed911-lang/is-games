/*
 * Sega — move mode.
 *
 * Rules:
 *   - Each player can have at most MAX_PIECES pieces on the board.
 *   - On your turn you may place a new piece, or move one of your own pieces
 *     to an empty cell.
 *   - A win is a full row or a full column. Diagonals do NOT count.
 *
 * Two ways to play, chosen on the mode screen:
 *   - friend:   two players share the screen, X always starts.
 *   - computer: the player is X, the computer is O and answers on its own
 *               (see ai.js for how it picks a move).
 */

const MAX_PIECES = 3;
const ROWS = 3;

const MODE = new URLSearchParams(location.search).get("mode");
const VS_COMPUTER = MODE === "computer";
const HUMAN = "X";
const COMPUTER = "O";

let currentPlayer = "X";
let board = emptyBoard();
let held = null; // { index, row, col } while a piece is picked up
let gameOver = false;
let thinking = false;
let statusTimer = null;
let endTimer = null;
let aiTimer = null;
let aiHistory = []; // the computer's last moves, so it does not repeat itself

const boardElement = () => document.querySelector(".board");
const cells = () => [...document.querySelectorAll(".cell")];
const statusElement = () => document.querySelector("#status");
const at = (index) => [Math.floor(index / ROWS), index % ROWS];
const sound = (name) => window.playSound?.(name);
const isComputerTurn = () => VS_COMPUTER && currentPlayer === COMPUTER;

function emptyBoard() {
  return Array.from({ length: ROWS }, () => Array(ROWS).fill(null));
}

function countPieces(player) {
  return board.flat().filter((mark) => mark === player).length;
}

/* ---------- Status line ---------- */

function updateStatus() {
  const status = statusElement();
  if (!status) return;

  status.classList.toggle("status--thinking", isComputerTurn() && !gameOver);

  if (held) {
    status.textContent = VS_COMPUTER
      ? "Tap an empty cell to move your piece, or tap it again to cancel."
      : `Player ${currentPlayer}: tap an empty cell to place the piece, or tap it again to cancel.`;
    return;
  }

  if (VS_COMPUTER) {
    if (!isComputerTurn()) {
      const pieces = countPieces(HUMAN);

      status.textContent =
        pieces >= MAX_PIECES
          ? "Your turn \u2014 tap one of your pieces to move it."
          : `Your turn \u2014 place a piece (${pieces}/${MAX_PIECES}) or tap one of yours to move it.`;
      return;
    }

    status.textContent = "Computer is thinking\u2026";
    return;
  }

  const pieces = countPieces(currentPlayer);

  status.textContent =
    pieces >= MAX_PIECES
      ? `Player ${currentPlayer}: you have ${MAX_PIECES} pieces on the board \u2014 tap one of them to move it.`
      : `Player ${currentPlayer}: place a piece (${pieces}/${MAX_PIECES}) or tap one of yours to move it.`;
}

function flashStatus(message) {
  const status = statusElement();
  if (!status) return;

  clearTimeout(statusTimer);
  status.textContent = message;
  statusTimer = setTimeout(updateStatus, 1800);
}

function setHoldingState() {
  boardElement()?.classList.toggle("board--holding", Boolean(held));
  updateStatus();
}

/* ---------- Winning lines: rows and columns only (no diagonals in Sega) ---------- */

function winningCells(player) {
  const lines = [];

  for (let i = 0; i < ROWS; i++) {
    lines.push([0, 1, 2].map((c) => i * ROWS + c)); // rows
    lines.push([0, 1, 2].map((r) => r * ROWS + i)); // columns
  }

  return (
    lines.find((line) =>
      line.every((index) => board[at(index)[0]][at(index)[1]] === player)
    ) || null
  );
}

/* ---------- Board rendering ---------- */

function paint(cell, mark) {
  cell.querySelector(".value").textContent = mark || "";
  cell.classList.remove("cell--X", "cell--O");

  if (mark) cell.classList.add(`cell--${mark}`);
}

function createCell(index) {
  const cell = document.createElement("div");

  cell.className = "cell";
  cell.setAttribute("role", "button");
  cell.tabIndex = index + 1;
  cell.innerHTML = '<span class="value"></span>';
  cell.onclick = (event) => cellClickHandler(event, index);
  cell.onkeydown = (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      cellClickHandler(event, index);
    }
  };

  return cell;
}

function createBoard() {
  const container = document.querySelector(".container");
  const element = document.createElement("div");

  element.className = "board";
  for (let i = 0; i < ROWS * ROWS; i++) element.appendChild(createCell(i));

  document.documentElement.style.setProperty("--grid-rows", ROWS);
  container.insertAdjacentElement("afterbegin", element);
}

/* ---------- Moves ---------- */

function pickUp(cell, index) {
  const [row, col] = at(index);

  held = { index, row, col };
  board[row][col] = null;

  paint(cell, null);
  setHoldingState();
  sound("pick");
}

// Puts the held piece back where it came from (cancel, or swap to another piece).
function putBackHeld() {
  const cell = cells()[held.index];

  board[held.row][held.col] = currentPlayer;
  paint(cell, currentPlayer);
  held = null;
  sound("pick");
}

/* One function for every accepted move, so a placement and a relocation follow
 * exactly the same win/turn logic. `from` is null when a new piece comes in. */
function commitMove(from, to) {
  const player = currentPlayer;
  const [row, col] = at(to);

  if (from !== null && from !== undefined) {
    const [fromRow, fromCol] = at(from);

    board[fromRow][fromCol] = null;
    paint(cells()[from], null);
    sound("pick");
  }

  board[row][col] = player;
  paint(cells()[to], player);
  held = null;
  boardElement()?.classList.remove("board--holding");

  if (from === null || from === undefined) sound("place");
  else setTimeout(() => sound("place"), 110);

  if (winningCells(player)) {
    highlightWinner(player);
    endRound(player);
    return;
  }

  currentPlayer = player === "X" ? "O" : "X";
  updateStatus();

  if (isComputerTurn()) startComputerTurn();
}

function cellClickHandler(event, index) {
  if (gameOver || thinking || isComputerTurn()) return;

  const cell = event.target.closest(".cell") || event.currentTarget;
  const [row, col] = at(index);
  const mark = board[row][col];

  if (held) {
    if (row === held.row && col === held.col) {
      putBackHeld();
      setHoldingState();
    } else if (mark === null) {
      commitMove(held.index, index);
    } else if (mark === currentPlayer) {
      putBackHeld();
      pickUp(cell, index);
    } else {
      flashStatus(
        VS_COMPUTER
          ? "You can only move your own pieces."
          : `You can only move Player ${currentPlayer}'s pieces.`
      );
      sound("error");
    }

    return;
  }

  if (mark === currentPlayer) {
    pickUp(cell, index);
  } else if (mark === null) {
    if (countPieces(currentPlayer) >= MAX_PIECES) {
      flashStatus(
        VS_COMPUTER
          ? `You already have ${MAX_PIECES} pieces \u2014 move one of them instead.`
          : `Player ${currentPlayer} already has ${MAX_PIECES} pieces \u2014 move one of them instead.`
      );
      sound("error");
      return;
    }

    commitMove(null, index);
  } else {
    flashStatus(
      VS_COMPUTER
        ? "That's the computer's piece."
        : `That's Player ${mark}'s piece. It's Player ${currentPlayer}'s turn.`
    );
    sound("error");
  }
}

/* ---------- Computer turn ---------- */

function setThinking(state) {
  thinking = state;
  boardElement()?.classList.toggle("board--locked", state);
  statusElement()?.classList.toggle("status--thinking", state);
}

function startComputerTurn() {
  setThinking(true);
  updateStatus();

  aiTimer = setTimeout(() => {
    aiTimer = null;

    if (gameOver) return;

    setThinking(false);

    const move = window.SegaAI?.chooseMove(
      board.flat(),
      COMPUTER,
      HUMAN,
      "normal",
      aiHistory
    );

    if (!move) return;

    aiHistory.push({
      type: move.type,
      from: move.from ?? null,
      to: move.to,
    });
    if (aiHistory.length > 4) aiHistory.shift();

    commitMove(move.from ?? null, move.to);
  }, 420 + Math.round(Math.random() * 260));
}

/* ---------- Round end ---------- */

function highlightWinner(player) {
  const line = winningCells(player);

  line?.forEach((index) => cells()[index].classList.add("cell--win"));
}

function resultFor(player) {
  if (!VS_COMPUTER) {
    return {
      mark: player,
      eyebrow: "Winner",
      title: `Player ${player} wins!`,
      text: "Nice line! The board resets for the next round.",
    };
  }

  const playerWon = player === HUMAN;

  return {
    mark: playerWon ? "You" : "CPU",
    word: true,
    accent: playerWon ? "x" : "o",
    eyebrow: "Winner",
    title: playerWon ? "You win!" : "Computer wins",
    text: playerWon
      ? "You beat the computer \u2014 one more round?"
      : "The computer found the line. Try again?",
  };
}

function endRound(player) {
  gameOver = true;
  setThinking(false);
  sound("win");

  const status = statusElement();

  if (status) {
    status.classList.remove("status--thinking");
    status.textContent = VS_COMPUTER
      ? player === HUMAN
        ? "You win!"
        : "Computer wins."
      : `Player ${player} wins!`;
  }

  const result = resultFor(player);

  endTimer = setTimeout(() => openModal(result), 200);
}

function resetBoard() {
  clearTimeout(endTimer);
  clearTimeout(statusTimer);
  clearTimeout(aiTimer);
  endTimer = null;
  statusTimer = null;
  aiTimer = null;

  boardElement()?.remove();
  createBoard();

  board = emptyBoard();
  currentPlayer = "X";
  held = null;
  gameOver = false;
  aiHistory = [];
  setThinking(false);

  updateStatus();
}

/* ---------- Result modal ---------- */

const modal = document.createElement("div");

modal.className = "modal";
modal.id = "modal";
modal.setAttribute("role", "dialog");
modal.setAttribute("aria-modal", "true");
modal.setAttribute("aria-labelledby", "modal-title");
modal.innerHTML = `
  <div class="modal__backdrop" data-close="true"></div>
  <div class="modal__card">
    <div class="modal__badge" id="modal-badge">
      <span id="modal-mark"></span>
    </div>
    <p class="modal__eyebrow" id="modal-eyebrow"></p>
    <h2 class="modal__title" id="modal-title"></h2>
    <p class="modal__text" id="modal-text"></p>
    <button class="modal__button" id="modal-action" type="button">Play again</button>
  </div>
`;
document.body.appendChild(modal);

function openModal({ mark, eyebrow, title, text, accent, word }) {
  document.querySelector("#modal-mark").textContent = mark;
  document.querySelector("#modal-eyebrow").textContent = eyebrow;
  document.querySelector("#modal-title").textContent = title;
  document.querySelector("#modal-text").textContent = text;

  const badge = document.querySelector("#modal-badge");
  const tone = accent || (mark === "O" ? "o" : "x");

  badge.classList.toggle("modal__badge--o", tone === "o");
  badge.classList.toggle("modal__badge--word", Boolean(word));
  modal.classList.toggle("modal--o", tone === "o");

  modal.classList.add("is-open");
  document.body.classList.add("modal-open");
  setTimeout(() => document.querySelector("#modal-action").focus(), 60);
}

function closeModalAndReset() {
  modal.classList.remove("is-open");
  document.body.classList.remove("modal-open");
  resetBoard();
}

document
  .querySelector("#modal-action")
  .addEventListener("click", closeModalAndReset);
modal
  .querySelector(".modal__backdrop")
  .addEventListener("click", closeModalAndReset);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && modal.classList.contains("is-open")) {
    closeModalAndReset();
  }
});

/* ---------- Start ---------- */

document.querySelector("#reset").addEventListener("click", () => {
  sound("reset");
  resetBoard();
});

if (VS_COMPUTER) {
  document.title = "Sega \u00b7 You vs. Computer";
  document.querySelector(".back")?.setAttribute("href", "../mode.html?game=sega");
}

createBoard();
updateStatus();
