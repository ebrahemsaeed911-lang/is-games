/*
 * X & O — classic mode.
 *
 * Rules:
 *   - Unlimited pieces, every player just places one on their turn.
 *   - Pieces can never be moved or removed.
 *   - A round ends on a line or when the board is full (draw).
 *
 * Two ways to play, chosen on the mode screen:
 *   - friend:   two players share the screen, X always starts.
 *   - computer: the player is X, the computer is O and replies on its own
 *               (see ai.js for how it picks a cell).
 */

const ROWS = 3;
const TOTAL_CELLS = ROWS * ROWS;

const MODE = new URLSearchParams(location.search).get("mode");
const VS_COMPUTER = MODE === "computer";
const HUMAN = "X";
const COMPUTER = "O";

let currentPlayer = "X";
let board = emptyBoard();
let moves = 0;
let gameOver = false;
let thinking = false;
let endTimer = null;
let aiTimer = null;

const boardElement = () => document.querySelector(".board");
const cells = () => [...document.querySelectorAll(".cell")];
const statusElement = () => document.querySelector("#status");
const at = (index) => [Math.floor(index / ROWS), index % ROWS];
const sound = (name) => window.playSound?.(name);
const isComputerTurn = () => VS_COMPUTER && currentPlayer === COMPUTER;

function emptyBoard() {
  return Array.from({ length: ROWS }, () => Array(ROWS).fill(null));
}

function updateStatus() {
  const status = statusElement();

  if (!status) return;

  if (VS_COMPUTER) {
    status.textContent =
      currentPlayer === HUMAN
        ? "Your turn \u2014 you are X."
        : "Computer is thinking\u2026";
    status.classList.toggle("status--thinking", currentPlayer === COMPUTER);
    return;
  }

  status.classList.remove("status--thinking");
  status.textContent = `Player ${currentPlayer}'s turn.`;
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
  if (gameOver || thinking || isComputerTurn()) return;

  const cell = event.target.closest(".cell") || event.currentTarget;
  const [row, col] = at(index);

  if (board[row][col] !== null) return;

  playMove(cell, index, currentPlayer);
}

/* Places a piece, then either ends the round or hands over the turn. */
function playMove(cell, index, player) {
  const [row, col] = at(index);

  board[row][col] = player;
  moves++;
  paint(cell, player);
  sound("place");

  if (winningCells(player)) {
    highlightWinner(player);
    endRound("win", player);
    return;
  }

  if (moves === TOTAL_CELLS) {
    endRound("draw");
    return;
  }

  currentPlayer = player === "X" ? "O" : "X";
  updateStatus();

  if (isComputerTurn()) startComputerTurn();
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

    const index = window.XandoAI.chooseMove(
      board.flat(),
      COMPUTER,
      HUMAN,
      "normal"
    );

    if (index < 0) return;

    playMove(cells()[index], index, COMPUTER);
  }, 420 + Math.round(Math.random() * 260));
}

/* ---------- Round end ---------- */

function highlightWinner(player) {
  winningCells(player)?.forEach((index) =>
    cells()[index].classList.add("cell--win")
  );
}

function resultFor(kind, player) {
  if (kind === "draw") {
    return {
      mark: "=",
      eyebrow: "Draw",
      title: "It's a draw!",
      text: "No winner this time \u2014 give it another go.",
    };
  }

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

function endRound(kind, player) {
  gameOver = true;
  setThinking(false);
  sound(kind === "draw" ? "draw" : "win");

  const status = statusElement();

  if (status) {
    status.classList.remove("status--thinking");
    status.textContent =
      kind === "draw"
        ? "It's a draw."
        : VS_COMPUTER
        ? player === HUMAN
          ? "You win!"
          : "Computer wins."
        : `Player ${player} wins!`;
  }

  const result = resultFor(kind, player);

  endTimer = setTimeout(() => openModal(result), 200);
}

function resetBoard() {
  clearTimeout(endTimer);
  clearTimeout(aiTimer);
  endTimer = null;
  aiTimer = null;

  boardElement()?.remove();
  createBoard();

  board = emptyBoard();
  currentPlayer = "X";
  moves = 0;
  gameOver = false;
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
  const tone = accent || (mark === "O" ? "o" : mark === "=" ? "draw" : "x");

  badge.classList.toggle("modal__badge--o", tone === "o");
  badge.classList.toggle("modal__badge--draw", tone === "draw");
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
  document.title = "X & O \u00b7 You vs. Computer";
  document.querySelector(".back")?.setAttribute("href", "../mode.html?game=xando");
}

createBoard();
updateStatus();
