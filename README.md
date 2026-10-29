<h1 align="center">
  <img src="favicon.svg" width="88" height="88" alt="IS Games icon" /><br />
  IS Games
</h1>

<p align="center">
  Two board games for two players on one screen.<br />
  No install, no build step, no dependencies.
</p>

![IS Games home screen](docs/home.png)

## Games

| Game | Rules | Win condition | Computer |
| --- | --- | --- | --- |
| **X & O** | Classic tic-tac-toe. Unlimited pieces, one mark per turn, pieces can never be moved. | A full row, column or diagonal. A full board with no line is a draw. | Yes |
| **Sega** | Each player has at most **3 pieces**. On your turn you either place a new piece or move one of your own to an empty cell. | A full **row or column** only. Diagonals do not count. | Soon |

Picking a game opens a mode screen: play with a friend on the same device, or against the computer.

<p align="center">
  <img src="docs/xando.png" width="49%" alt="X & O board" />
  <img src="docs/sega.png" width="49%" alt="Sega board" />
</p>

![Mode screen](docs/mode.png)

## Playing the computer

X & O has a computer opponent. You are always **X** and you move first; the computer
answers with **O**. The result card names the sides — **You** or **CPU** — instead of
showing X and O.

The computer rates every empty cell by the chance that it leads to a win. It looks at
the eight winning lines: a line blocked by you is worth nothing, one of its pieces
makes a live line (1 point), two pieces mean one move from a win (12), three is a win
(1000). The same sum is computed for you as if you took that cell, and the move's score
is `attack - 0.9 × defence`:

- **Forks** — two open threats at once — outweigh any single line, so it takes them and
  tries not to hand you one.
- A **win** on the board is always taken.
- About **one move in three** it stops paying attention and plays somewhere else instead
  of blocking you — that is the gap you play for.
- On a tie it prefers the centre, then the corners.

There are two levels: `normal`, which the game uses, and `hard`, which is the same
engine with the slip turned off. `node XandO/ai.test.js` checks both — `hard` is played
against every possible line and never loses (it draws against perfect play), while
`normal` is played against an ordinary player and has to be beatable.

<p align="center">
  <img src="docs/xando-bot.png" width="49%" alt="X & O against the computer" />
  <img src="docs/xando-win.png" width="49%" alt="You win result card" />
</p>

## Features

- **Two rule sets, two clean scripts** - `XandO/xando.js` and `sega/sega.js` are independent, so neither game is cluttered with branches for the other.
- **Mode screen** - one shared `mode.html?game=xando|sega` picks up the game you chose on the home screen, so both games get the same "friend or computer" step without duplicated markup. The computer card is live for X & O and marked "coming soon" for Sega.
- **Computer opponent** - `XandO/ai.js` scores every empty cell with a probability model, then plays the best one. It answers after a short "thinking" beat and blocks the board while it moves. The default level still slips up now and then, so a round is winnable.
- **Shared look** - one `game.css` for both boards, with the same artwork and palette as the home screen.
- **Animated result modal** - the winning line glows first, then a card pops in for a win or a draw. Close it with the button, the backdrop or <kbd>Esc</kbd>, and the board resets.
- **Sound effects** - placement, pick-up, illegal move, win and draw are synthesised with the Web Audio API at runtime, so the repo ships no audio files. The 🔊 button mutes everything and remembers the choice.
- **Responsive** - the board fills the width of a phone with 12px side margins, stays centred on tall screens, and fits short landscape screens without clipping.
- **Keyboard friendly** - cells are focusable and respond to <kbd>Enter</kbd> / <kbd>Space</kbd>.
- **Icon set** - SVG, multi-size ICO and an Apple touch icon, all generated from the same geometry.

## Run it

Open `index.html` in a browser. That is enough.

If you prefer a local server (recommended when testing layout in iframes):

```bash
python -m http.server 8765
# then open http://127.0.0.1:8765/
```

## Project structure

```
is-games/
├── index.html            # home screen with the two game cards
├── style.css             # home screen styles
├── mode.html             # "friend or computer" screen (shared by both games)
├── mode.css              # mode screen styles
├── game.css              # shared styles for both boards
├── sounds.js             # Web Audio sound effects + mute button
├── favicon.svg           # scalable app icon
├── favicon.ico           # 16 / 32 / 48 / 64 in one file
├── apple-touch-icon.png  # 180x180 icon for iOS
├── pattern.jpg           # background artwork
├── docs/                 # screenshots used in this README
├── sega/
│   ├── index.html
│   └── sega.js           # place / move / 3-piece limit
└── XandO/
    ├── index.html
    ├── ai.js             # probability model for the computer opponent
    ├── ai.test.js        # checks that it never loses (node XandO/ai.test.js)
    └── xando.js          # placement, draw detection, friend / computer turns
```

## How it is built

Plain HTML, CSS and JavaScript. No frameworks, no bundler, no npm install.

- Colors and radii live in CSS custom properties.
- The board is a CSS grid sized by `--grid-rows`, so it could grow past 3×3.
- The computer opponent lives in its own file (`XandO/ai.js`) and knows nothing about the DOM: `chooseMove(cells, me, them)` takes a flat 9-cell board and returns an index, which is what makes `ai.test.js` possible.
- Its move is delayed by 420–680 ms so the reply feels deliberate, and the board ignores clicks until it lands.
- Sounds are short oscillator envelopes scheduled on a lazily created `AudioContext` (browsers require a user gesture first).
- The mute preference is stored in `localStorage`.

### Browser support

Any current Chrome, Edge, Firefox or Safari. The code uses optional chaining and `??`, so very old browsers are not supported.

## بالعربي

**IS Games** موقع بسيط فيه لعبتين للعب على شاشة واحدة:

- **X & O**: تكتيك كلاسيكي - قطع غير محدودة، بدون تحريك، والفوز بصف أو عمود أو قطر.
- **Sega**: كل لاعب عنده **3 قطع** بس، وبيحرّك قطعة من قطعه بدل ما يحط واحدة جديدة، والفوز بصف أو عمود فقط (بدون أقطار).

الموقع شغّال من غير أي تثبيت: افتح `index.html` وابدأ اللعب. فيه مؤثرات صوتية متولّدة في المتصفح (وزرار كتم)، ومودال متحرك للفوز والتعادل، وتصميم متجاوب للموبايل والشاشات الكبيرة.

بعد اختيار اللعبة بتظهر شاشة اختيار الوضع: **اللعب مع صاحبك** على نفس الجهاز، أو **اللعب مع الكمبيوتر**.

لعبة **X & O** بقى فيها خصم كمبيوتر شغّال: انت دايمًا **X** وبتبدأ، والكمبيوتر بيلعب **O**. الكمبيوتر بيحسب لكل خانة فاضية احتمال إنها توصّله لخط فوز (الخط المفتوح = نقطة، نص الخط = 12، الخط الكامل = فوز)، وبيخصم منها احتمال إن الخانة تفيدك انت كمان. بياخد أي فوز شايفه، بس في **حوالي حركة من كل 3** بيسرح ويلعب حاجة تانية بدل ما يسدّ عليك — ودي الفرصة اللي تكسب منها. فيه كمان مستوى **hard** مش بيغلط خالص ومستحيل تكسبه. لما الجولة تخلص، البطل بيتعرض باسمه: **You** أو **CPU** بدل X و O.

تأكد بنفسك: `node XandO/ai.test.js` — بيختبر إن مستوى **hard** مش بيخسر ولا مرة، وإن المستوى العادي **ممكن تكسبه**.
