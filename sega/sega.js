/*
 * Sega \u2014 move mode.
 *
 * Rules:
 *   - Each player can have at most MAX_PIECES pieces on the board.
 *   - On your turn you may place a new piece, or move one of your own pieces
 *     to an empty cell.
 *   - A win is a full row or a full column. Diagonals do NOT count.
 */

const MAX_PIECES = 3;
const ROWS = 3;

let currentPlayer = "X";
let board = emptyBoard();
let held = null; // { index, row, col } while a piece is picked up
let gameOver = false;
let statusTimer = null;
let endTimer = null;

const boardElement = () => document.querySelector(".board");
const cells = () => [...document.querySelectorAll(".cell")];
const statusElement = () => document.querySelector("#status");
const at = (index) => [Math.floor(index / ROWS), index % ROWS];
const sound = (name) => window.playSound?.(name);

function emptyBoard() {
  return Array.from({ length: ROWS }, () => Array(ROWS).fill(null));
}

function countPieces(player) {
  return board.flat().filter((mark) => mark === player).length;
}

function updateStatus() {
  const status = statusElement();
  if (!status) return;

  if (held) {
    status.textContent = `Player ${currentPlayer}: tap an empty cell to place the piece, or tap it again to cancel.`;
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

function placeMark(cell, row, col) {
  board[row][col] = currentPlayer;

  paint(cell, currentPlayer);
  held = null;
  setHoldingState();
  sound("place");

  if (winningCells(currentPlayer)) {
    highlightWinner(currentPlayer);
    endRound(currentPlayer);
    return;
  }

  currentPlayer = currentPlayer === "X" ? "O" : "X";
  updateStatus();
}

function cellClickHandler(event, index) {
  if (gameOver) return;

  const cell = event.target.closest(".cell") || event.currentTarget;
  const [row, col] = at(index);
  const mark = board[row][col];

  if (held) {
    if (row === held.row && col === held.col) {
      putBackHeld();
      setHoldingState();
    } else if (mark === null) {
      placeMark(cell, row, col);
    } else if (mark === currentPlayer) {
      putBackHeld();
      pickUp(cell, index);
    } else {
      flashStatus(`You can only move Player ${currentPlayer}'s pieces.`);
      sound("error");
    }

    return;
  }

  if (mark === currentPlayer) {
    pickUp(cell, index);
  } else if (mark === null) {
    if (countPieces(currentPlayer) >= MAX_PIECES) {
      flashStatus(
        `Player ${currentPlayer} already has ${MAX_PIECES} pieces \u2014 move one of them instead.`
      );
      sound("error");
      return;
    }

    placeMark(cell, row, col);
  } else {
    flashStatus(
      `That's Player ${mark}'s piece. It's Player ${currentPlayer}'s turn.`
    );
    sound("error");
  }
}

/* ---------- Round end ---------- */

function highlightWinner(player) {
  const line = winningCells(player);

  line?.forEach((index) => cells()[index].classList.add("cell--win"));
}

function endRound(player) {
  gameOver = true;
  sound("win");
  endTimer = setTimeout(() => {
    openModal({
      mark: player,
      eyebrow: "Winner",
      title: `Player ${player} wins!`,
      text: "Nice line! The board resets for the next round.",
    });
  }, 200);
}

function resetBoard() {
  clearTimeout(endTimer);
  clearTimeout(statusTimer);

  boardElement()?.remove();
  createBoard();

  board = emptyBoard();
  currentPlayer = "X";
  held = null;
  gameOver = false;

  setHoldingState();
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

function openModal({ mark, eyebrow, title, text }) {
  document.querySelector("#modal-mark").textContent = mark;
  document.querySelector("#modal-eyebrow").textContent = eyebrow;
  document.querySelector("#modal-title").textContent = title;
  document.querySelector("#modal-text").textContent = text;

  const badge = document.querySelector("#modal-badge");

  badge.classList.toggle("modal__badge--o", mark === "O");
  modal.classList.toggle("modal--o", mark === "O");

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
createBoard();
updateStatus();
