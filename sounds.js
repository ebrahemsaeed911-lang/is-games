/*
 * Sound effects shared by both games.
 *
 * Every sound is synthesised with the Web Audio API, so the project does not
 * need any audio files. A game just calls playSound("place"), playSound("win"),
 * etc. The 🔊 button (created below) mutes/unmutes and remembers the choice.
 */

const SOUND_STORAGE_KEY = "is-games-muted";
const MASTER_LEVEL = 0.32;

let audioContext = null;
let muted = readMuted();

function readMuted() {
  try {
    return localStorage.getItem(SOUND_STORAGE_KEY) === "1";
  } catch (error) {
    return false;
  }
}

function saveMuted(value) {
  try {
    localStorage.setItem(SOUND_STORAGE_KEY, value ? "1" : "0");
  } catch (error) {
    /* private mode: keep the choice for this page only */
  }
}

// Created on the first sound so browsers allow it (needs a user gesture).
function audio() {
  const AudioCtor = window.AudioContext || window.webkitAudioContext;

  if (!AudioCtor) return null;

  if (!audioContext) audioContext = new AudioCtor();
  if (audioContext.state === "suspended") audioContext.resume();

  return audioContext;
}

function tone({
  from,
  to = from,
  type = "sine",
  start = 0,
  duration = 0.12,
  level = 0.6,
}) {
  const ctx = audio();
  if (!ctx) return;

  const when = ctx.currentTime + start;
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  const peak = Math.max(0.0001, level * MASTER_LEVEL);

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(from, when);
  if (to !== from) {
    oscillator.frequency.exponentialRampToValueAtTime(to, when + duration);
  }

  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.exponentialRampToValueAtTime(peak, when + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);

  oscillator.connect(gain).connect(ctx.destination);
  oscillator.start(when);
  oscillator.stop(when + duration + 0.05);
}

const SOUNDS = {
  // A piece lands on the board: short rising blip.
  place: () =>
    tone({ from: 560, to: 840, type: "triangle", duration: 0.1, level: 0.9 }),

  // Picking a piece up (Sega only): soft low tick.
  pick: () => tone({ from: 360, to: 260, type: "sine", duration: 0.08, level: 0.7 }),

  // Illegal move: two low buzzes.
  error: () => {
    tone({ from: 190, to: 150, type: "square", duration: 0.1, level: 0.35 });
    tone({
      from: 150,
      to: 120,
      type: "square",
      start: 0.11,
      duration: 0.12,
      level: 0.35,
    });
  },

  // Win: C-E-G-C arpeggio plus a little sparkle.
  win: () => {
    [523.25, 659.25, 783.99, 1046.5].forEach((frequency, index) =>
      tone({
        from: frequency,
        type: "triangle",
        start: index * 0.1,
        duration: 0.3,
        level: 0.85,
      })
    );
    tone({
      from: 1568,
      to: 2093,
      type: "sine",
      start: 0.4,
      duration: 0.35,
      level: 0.4,
    });
  },

  // Draw: two descending notes.
  draw: () => {
    tone({ from: 420, type: "sine", duration: 0.22, level: 0.6 });
    tone({ from: 330, type: "sine", start: 0.16, duration: 0.32, level: 0.6 });
  },

  // Reset button: quick upward sweep.
  reset: () => tone({ from: 300, to: 620, type: "sine", duration: 0.14, level: 0.5 }),
};

function playSound(name) {
  if (muted) return;

  const sound = SOUNDS[name];
  if (!sound) return;

  try {
    sound();
  } catch (error) {
    /* sound is a nice-to-have, never break the game over it */
  }
}

/* ---------- Mute button ---------- */

const soundToggle = document.createElement("button");

soundToggle.type = "button";
soundToggle.className = "sound-toggle";
soundToggle.id = "sound-toggle";

function renderToggle() {
  soundToggle.textContent = muted ? "\u{1F507}" : "\u{1F50A}";
  soundToggle.setAttribute("aria-label", muted ? "Unmute sounds" : "Mute sounds");
  soundToggle.setAttribute("aria-pressed", String(!muted));
  soundToggle.title = muted ? "Unmute sounds" : "Mute sounds";
  soundToggle.classList.toggle("sound-toggle--muted", muted);
}

soundToggle.addEventListener("click", () => {
  muted = !muted;
  saveMuted(muted);
  renderToggle();

  // Little confirmation when turning the sound back on.
  if (!muted) playSound("place");
});

document.body.appendChild(soundToggle);
renderToggle();
