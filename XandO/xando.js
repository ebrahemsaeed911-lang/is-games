/*
 * X & O \u2014 classic mode.
 *
 * Rules:
 *   - Unlimited pieces, every player just places one on their turn.
 *   - Pieces can never be moved or removed.
 *   - A round ends on a line or when the board is full (draw).
 */

const ROWS = 3;
const TOTAL_CELLS = ROWS * ROWS;

let currentPlayer = "X";
let board = emptyBoard();
let moves = 0;
let gameOver = false;
let endTimer = null;

const boardElement = () => document.querySelector(".board");
const cells = () => [...document.querySelectorAll(".cell")];
const statusElement = () => document.querySelector("#status");
const at = (index) => [Math.floor(index / ROWS), index % ROWS];
const sound = (name) => window.playSound?.(name);

function emptyBoard() {
  return Array.from({ length: ROWS }, () => Array(ROWS).fill(null));
}

function updateStatus() {
  const status = statusElement();

  if (status) status.textContent = `Player ${currentPlayer}'s turn.`;
}

/* ---------- Winning lines ---------- */

function winningCells(player) {
  const lines = [];

  for (let i = 0; i < ROWS; i++) {
    lines.push([0, 1, 2].map((c) => i * ROWS + c)); // rows
    lines.push([0, 1, 2].map((r) => r * ROWS + i)); // columns
  }

  lines.push([0, 1, 2].map((i) => i * ROWS + i)); // main diagonal
  lines.push([0, 1, 2].map((i) => i * ROWS + (ROWS - 1 - i))); // anti diagonal

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
  for (let i = 0; i < TOTAL_CELLS; i++) element.appendChild(createCell(i));

  document.documentElement.style.setProperty("--grid-rows", ROWS);
  container.insertAdjacentElement("afterbegin", element);
}

/* ---------- Moves ---------- */

function cellClickHandler(event, index) {
  if (gameOver) return;

  const cell = event.target.closest(".cell") || event.currentTarget;
  const [row, col] = at(index);

  if (board[row][col] !== null) return;

  board[row][col] = currentPlayer;
  moves++;
  paint(cell, currentPlayer);
  sound("place");

  if (winningCells(currentPlayer)) {
    highlightWinner(currentPlayer);
    endRound("win", currentPlayer);
    return;
  }

  if (moves === TOTAL_CELLS) {
    endRound("draw");
    return;
  }

  currentPlayer = currentPlayer === "X" ? "O" : "X";
  updateStatus();
}

/* ---------- Round end ---------- */

function highlightWinner(player) {
  winningCells(player)?.forEach((index) =>
    cells()[index].classList.add("cell--win")
  );
}

function endRound(kind, player) {
  gameOver = true;
  sound(kind === "draw" ? "draw" : "win");
  endTimer = setTimeout(() => {
    openModal(
      kind === "draw"
        ? {
            mark: "=",
            eyebrow: "Draw",
            title: "It's a draw!",
            text: "No winner this time \u2014 give it another go.",
          }
        : {
            mark: player,
            eyebrow: "Winner",
            title: `Player ${player} wins!`,
            text: "Nice line! The board resets for the next round.",
          }
    );
  }, 200);
}

function resetBoard() {
  clearTimeout(endTimer);

  boardElement()?.remove();
  createBoard();

  board = emptyBoard();
  currentPlayer = "X";
  moves = 0;
  gameOver = false;

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

function openModal({ mark, eyebrow, title, text }) {
  document.querySelector("#modal-mark").textContent = mark;
  document.querySelector("#modal-eyebrow").textContent = eyebrow;
  document.querySelector("#modal-title").textContent = title;
  document.querySelector("#modal-text").textContent = text;

  const badge = document.querySelector("#modal-badge");

  badge.classList.toggle("modal__badge--o", mark === "O");
  badge.classList.toggle("modal__badge--draw", mark === "=");
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
