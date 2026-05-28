# FRONTEND_AGENTS.md — React Frontend Context for AI Coding Agents

## Project
Skribbl.io clone frontend. React + Vite. Connects to a working Node.js + Socket.IO backend.
Backend is already complete — do NOT modify it. Frontend must match all event names exactly.

---

## Stack
```
Framework  : React 18 + Vite
Routing    : react-router-dom v6
Socket     : socket.io-client
Styling    : Tailwind CSS utilities (no UI library)
Canvas     : HTML5 Canvas API (no Fabric.js, no Konva)
State      : React useState + useContext (no Redux)
```

### Install commands
```bash
npm create vite@latest client -- --template react
cd client
npm install socket.io-client react-router-dom
```

---

## Folder Structure
```
client/src/
├── main.jsx                    # ReactDOM.createRoot, BrowserRouter
├── App.jsx                     # Routes only
├── socket.js                   # Single socket instance (export)
├── context/
│   └── GameContext.jsx         # Global state + all socket listeners
├── pages/
│   ├── HomePage.jsx            # Name input + create/join room
│   ├── LobbyPage.jsx           # Player list + settings + start button
│   ├── GamePage.jsx            # Main game screen
│   └── GameOverPage.jsx        # Winner + leaderboard
├── components/
│   ├── Canvas.jsx              # HTML5 canvas — drawing + receiving strokes
│   ├── Toolbar.jsx             # Color picker, brush size, undo, clear (drawer only)
│   ├── ChatBox.jsx             # Messages list + guess input
│   ├── PlayerList.jsx          # Sidebar with scores and drawing indicator
│   ├── WordDisplay.jsx         # Blank hints or actual word
│   ├── TopBar.jsx              # Round counter + timer countdown bar
│   └── WordPicker.jsx          # Modal overlay — drawer picks 1 of N words
└── index.css                   # Tailwind import + small shared component classes
```

---

## Socket Singleton — `src/socket.js`
```js
import { io } from 'socket.io-client';

const socket = io(import.meta.env.VITE_SERVER_URL || 'http://localhost:3001', {
  autoConnect: false,   // connect manually after name is set
});

export default socket;
```

Connect manually in HomePage after the user submits their name:
```js
socket.connect();
socket.emit('create_room', { playerName, settings });
```

---

## Global State — `src/context/GameContext.jsx`

Store EVERYTHING here. No prop-drilling.

```js
const initialState = {
  // Identity
  myId: null,           // socket.id
  myName: '',
  isHost: false,
  isDrawing: false,

  // Room
  roomId: null,
  players: [],          // Player[] from server

  // Game
  phase: 'lobby',       // lobby | picking | drawing | roundEnd | gameOver
  currentRound: 0,
  totalRounds: 3,
  drawerId: null,
  drawerName: '',

  // Word / hint
  myWord: null,         // only set for the drawer (from 'your_word' event)
  hintString: '',       // e.g. "_ _ a _ _" shown to guessers
  wordLength: 0,
  wordOptions: [],      // shown to drawer during picking phase

  // Chat
  messages: [],         // { id, playerId, playerName, text, type, correct? }

  // Timer
  timeLeft: 0,

  // Canvas
  strokes: [],          // for replay on join
};
```

### Socket listeners to register in GameContext (useEffect on mount):

```
socket.on('room_created',   ...)   → set roomId, myId, players, navigate('/lobby')
socket.on('room_joined',    ...)   → set roomId, myId, players, navigate('/lobby')
socket.on('player_joined',  ...)   → update players[]
socket.on('player_left',    ...)   → update players[], update isHost if newHostId === myId
socket.on('game_state',     ...)   → update phase, players
socket.on('round_start',    ...)   → update drawerId, drawerName, round, wordOptions
                                      if myId === drawerId → phase = 'picking'
                                      else → phase = 'drawing'
socket.on('your_word',      ...)   → set myWord (drawer only), phase = 'drawing'
socket.on('word_chosen',    ...)   → set hintString, wordLength (for guessers)
socket.on('hint_update',    ...)   → update hintString
socket.on('round_end',      ...)   → phase = 'roundEnd', update players scores, show word
socket.on('game_over',      ...)   → phase = 'gameOver', navigate('/gameover')
socket.on('guess_result',   ...)   → update players scores; if correct add system message
socket.on('correct_word',   ...)   → show "You got it!" toast, update own hintString
socket.on('close_guess',    ...)   → show "So close! 🔥" toast
socket.on('chat_message',   ...)   → append to messages[]
socket.on('canvas_cleared', ...)   → trigger canvas clear (via ref or event)
socket.on('canvas_replay',  ...)   → replay full strokes[] on canvas
socket.on('draw_data',      ...)   → draw incoming stroke on canvas
socket.on('error',          ...)   → show error toast
```

---

## Pages

### `HomePage.jsx`
**Purpose:** Entry point. User sets name, creates or joins a room.

**State:** `name` (input), `roomCode` (input for joining), `settings` (for creating)

**Actions:**
```js
// Create room
socket.connect();
socket.emit('create_room', {
  playerName: name.trim(),
  settings: { maxPlayers, rounds, drawTime, wordCount, hints }
});
// Listen for 'room_created' in GameContext → auto-navigates to /lobby

// Join room
socket.connect();
socket.emit('join_room', { roomId: roomCode.toUpperCase(), playerName: name.trim() });
// Listen for 'room_joined' in GameContext → auto-navigates to /lobby
```

**UI elements:**
- Large title "Skribbl Clone"
- Name input (required, max 20 chars)
- "Create Room" button → expands settings panel
- Settings panel: maxPlayers (2-20), rounds (2-10), drawTime (15-240s)
- Divider "— OR —"
- Room code input + "Join Room" button
- Error display (from socket `error` event)

---

### `LobbyPage.jsx`
**Purpose:** Waiting room. Shows players, room code, host controls.

**Guard:** If `roomId` is null → redirect to `/`

**UI elements:**
- Room code display with copy-to-clipboard button
- Player list (avatar circle with initials + name)
- "Waiting for players..." if < 2 players
- "Start Game" button — only rendered if `isHost === true`
  - Disabled if `players.length < 2`
- Game settings summary (read-only display)
- Share link: `window.location.origin + '/join/' + roomId`

**Actions:**
```js
// Host only
socket.emit('start_game');
// Server responds with game_state → GameContext navigates to /game
```

---

### `GamePage.jsx`
**Purpose:** Main game screen. Composed entirely from sub-components.

**Guard:** If `roomId` is null → redirect to `/`

**Layout (CSS Grid recommended):**
```
┌──────────────────────────────────────┐
│  TopBar (round + timer)              │
├────────────┬─────────────────────────┤
│ PlayerList │ CanvasArea + WordDisplay │
│  (scores) │ + Toolbar (if drawing)   │
├────────────┴─────────────────────────┤
│  ChatBox (messages + guess input)    │
└──────────────────────────────────────┘
```

**Phase-based rendering:**
```jsx
{phase === 'picking' && myId === drawerId && <WordPicker words={wordOptions} />}
{phase === 'roundEnd' && <RoundEndOverlay word={revealedWord} scores={players} />}
```

---

### `GameOverPage.jsx`
**Purpose:** Final leaderboard + winner announcement.

**Guard:** If `phase !== 'gameOver'` → redirect to `/`

**UI elements:**
- "🎉 [winner.name] wins!" heading
- Leaderboard table: rank, name, score (sorted by score desc)
- "Play Again" button → `socket.emit('leave_room')` + navigate to `/`

---

## Components

### `Canvas.jsx`
**This is the most critical component. Read carefully.**

```jsx
const canvasRef = useRef(null);
const isMouseDown = useRef(false);
const lastPos = useRef({ x: 0, y: 0 });
const currentStrokeColor = useRef('#000000');
const currentStrokeSize = useRef(4);
```

#### Coordinate normalization (REQUIRED)
```js
// Before emitting — normalize to 0–1
function getNormalized(e) {
  const rect = canvasRef.current.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) / rect.width,
    y: (e.clientY - rect.top) / rect.height,
  };
}

// Before drawing — denormalize from 0–1
function getPixel(nx, ny) {
  const canvas = canvasRef.current;
  return {
    x: nx * canvas.width,
    y: ny * canvas.height,
  };
}
```

#### Mouse event handlers (drawer only)
```js
function onMouseDown(e) {
  isMouseDown.current = true;
  const { x, y } = getNormalized(e);
  lastPos.current = { x, y };
  drawDot(x, y); // draw locally without waiting for server
  socket.emit('draw_start', { x, y, color: currentStrokeColor.current, size: currentStrokeSize.current });
}

function onMouseMove(e) {
  if (!isMouseDown.current) return;
  const { x, y } = getNormalized(e);
  drawLine(lastPos.current.x, lastPos.current.y, x, y, true); // local draw
  lastPos.current = { x, y };
  socket.emit('draw_move', { x, y });
}

function onMouseUp() {
  isMouseDown.current = false;
  socket.emit('draw_end');
}
```

**Important:** Attach `onMouseUp` and `onMouseLeave` to the canvas element, not `window`. Also handle touch events for mobile with `e.touches[0]`.

#### Receiving strokes from server
```js
// In GameContext or Canvas useEffect
socket.on('draw_data', ({ type, x, y, color, size }) => {
  const canvas = canvasRef.current;
  const ctx = canvas.getContext('2d');
  if (type === 'start') {
    ctx.beginPath();
    const p = getPixel(x, y);
    ctx.moveTo(p.x, p.y);
    // store current color/size for subsequent move events
    currentRemoteColor = color;
    currentRemoteSize = size;
  } else if (type === 'move') {
    const p = getPixel(x, y);
    ctx.strokeStyle = currentRemoteColor;
    ctx.lineWidth = currentRemoteSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  }
  // 'end' → nothing needed
});
```

#### Core draw function
```js
function drawLine(x1, y1, x2, y2, isNormalized = false) {
  const canvas = canvasRef.current;
  const ctx = canvas.getContext('2d');
  const p1 = isNormalized ? getPixel(x1, y1) : { x: x1, y: y1 };
  const p2 = isNormalized ? getPixel(x2, y2) : { x: x2, y: y2 };

  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.strokeStyle = currentStrokeColor.current;
  ctx.lineWidth = currentStrokeSize.current;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();
}
```

#### Canvas replay (for late joiners)
```js
socket.on('canvas_replay', ({ strokes }) => {
  const ctx = canvasRef.current.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  let color = '#000', size = 4;
  strokes.forEach(s => {
    if (s.type === 'start') {
      color = s.color; size = s.size;
      ctx.beginPath();
      const p = getPixel(s.x, s.y);
      ctx.moveTo(p.x, p.y);
    } else if (s.type === 'move') {
      const p = getPixel(s.x, s.y);
      ctx.strokeStyle = color;
      ctx.lineWidth = size;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }
  });
});
```

#### canvas_cleared
```js
socket.on('canvas_cleared', () => {
  const ctx = canvasRef.current.getContext('2d');
  ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
});
```

#### Canvas size
Set the canvas drawing buffer to a fixed resolution regardless of CSS size:
```js
useEffect(() => {
  canvasRef.current.width = 800;
  canvasRef.current.height = 600;
}, []);
```
CSS: `canvas { width: 100%; height: 100%; }` — the browser scales it, but coordinates use the 800×600 buffer.

---

### `Toolbar.jsx`
**Only rendered when `isDrawing === true`.**

Props: `onColorChange`, `onSizeChange`, `onUndo`, `onClear`

```jsx
// Colors
const COLORS = ['#000000','#ffffff','#ef4444','#f97316','#eab308',
                 '#22c55e','#3b82f6','#8b5cf6','#ec4899','#6b7280'];

// Sizes
const SIZES = [2, 4, 8, 16];

// Undo — server handles the stroke removal + broadcasts canvas_replay
function handleUndo() {
  socket.emit('draw_undo');
}

// Clear
function handleClear() {
  socket.emit('canvas_clear');
}
```

**UI:** Row of color swatches (circles) + size buttons + undo icon + clear icon.
Active color/size should show a selected ring.

---

### `ChatBox.jsx`
**Dual purpose:** shows chat messages AND guess results.

```jsx
// Message types from server:
// type: 'chat'   → normal chat, show in gray
// type: 'guess'  → wrong guess, show in gray-italic
// type: 'system' → "PlayerX guessed the word!", show in green bold

// Sending a guess (during drawing phase)
function handleSend(text) {
  if (phase === 'drawing' && !isDrawing && !hasGuessedCorrectly) {
    socket.emit('guess', { text });
  } else {
    socket.emit('chat', { text });
  }
  setInput('');
}
```

**Important:** Auto-scroll to bottom on every new message:
```js
const bottomRef = useRef(null);
useEffect(() => {
  bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
}, [messages]);
```

**Block input if:** `isDrawing` (drawer can't guess) OR `hasGuessedCorrectly` (already got it).
Show placeholder text accordingly: `"You already guessed it!"` or `"Type your guess..."`.

---

### `PlayerList.jsx`
**Props:** `players[]`, `drawerId`, `myId`

For each player, show:
- Initials avatar (colored by player index)
- Name (bold if drawing)
- Score
- ✏️ indicator if `player.id === drawerId`
- ✅ indicator if `player.hasGuessedCorrectly`
- 👑 indicator if `player.isHost`

Sort by score descending during game, preserve join order in lobby.

---

### `WordDisplay.jsx`
**Props:** `phase`, `hintString`, `myWord`, `isDrawing`, `wordLength`

```jsx
// Drawer sees: "Your word: ELEPHANT"
// Guessers see: "_ _ _ _ _ _ _ _" (hint string from server)
// roundEnd: "The word was: ELEPHANT"

if (isDrawing && myWord) {
  return <div>Draw: <strong>{myWord.toUpperCase()}</strong></div>;
}
if (phase === 'drawing') {
  return <div className="hint-display">{hintString}</div>;
}
if (phase === 'roundEnd') {
  return <div>The word was: <strong>{revealedWord}</strong></div>;
}
```

Style the hint string with wide letter spacing so blanks are readable.

---

### `WordPicker.jsx`
**Rendered as a full-screen overlay when `phase === 'picking' && isDrawing`.**

```jsx
// wordOptions comes from round_start event (array of strings)
function handlePick(word) {
  socket.emit('word_chosen', { word });
  // GameContext will set phase = 'drawing' on 'your_word' event response
}
```

UI: Modal overlay, 3 word buttons, "Pick a word to draw:" heading.
Auto-dismiss when `phase` changes away from `picking`.

---

### `TopBar.jsx`
**Props:** `round`, `totalRounds`, `timeLeft`, `drawTime`, `drawerName`, `phase`

```jsx
// Timer countdown bar (CSS width transition)
<div className="timer-track">
  <div
    className="timer-fill"
    style={{ width: `${(timeLeft / drawTime) * 100}%`,
             backgroundColor: timeLeft < 15 ? '#ef4444' : '#22c55e' }}
  />
</div>
```

**Timer is managed client-side** using `setInterval` — start on `round_start`, clear on `round_end`.
Do NOT rely on server for per-second updates — it's too chatty.

```js
// In GameContext, when round_start fires:
setTimeLeft(settings.drawTime);
const interval = setInterval(() => {
  setTimeLeft(prev => {
    if (prev <= 1) { clearInterval(interval); return 0; }
    return prev - 1;
  });
}, 1000);
// Clear this interval when round_end fires
```

---

## Routing — `App.jsx`
```jsx
import { Routes, Route, Navigate } from 'react-router-dom';

function App() {
  return (
    <Routes>
      <Route path="/"         element={<HomePage />} />
      <Route path="/lobby"    element={<LobbyPage />} />
      <Route path="/game"     element={<GamePage />} />
      <Route path="/gameover" element={<GameOverPage />} />
      <Route path="*"         element={<Navigate to="/" />} />
    </Routes>
  );
}
```

Navigation happens in GameContext listeners — never call `navigate()` inside a socket handler that's not inside a React component or hook.

---

## `.env` file
```
VITE_SERVER_URL=http://localhost:3001
```

For production (Vercel):
```
VITE_SERVER_URL=https://your-app.onrender.com
```

---

## Critical Gotchas for Agents

1. **Socket singleton** — import `socket` from `../socket.js` everywhere. Never call `io()` more than once.

2. **`socket.id` is only available after connect** — set `myId = socket.id` inside the `room_created` / `room_joined` handler, NOT on component mount.

3. **Canvas resize bug** — if the window resizes, re-draw from `room.strokes`. Subscribe to `window.resize` and emit `request_canvas`.

4. **Drawer draws locally** — drawer does NOT wait for `draw_data` echo. Draw immediately on mouse event. Only viewers use `draw_data`.

5. **Mouse leave = draw_end** — if mouse leaves canvas while drawing, emit `draw_end`. Otherwise strokes hang open.

6. **Phase transitions happen in GameContext** — components must NEVER emit `start_game`, `word_chosen`, etc. directly. Use a context action function that validates phase first.

7. **`round_start` fires for everyone** — the drawer sees `wordOptions` and enters `picking` phase. Everyone else skips `picking` and waits. Check `drawerId === myId` to branch.

8. **Guard pages** — every page except HomePage must redirect to `/` if `roomId` is null (handles F5 reload).

9. **`hasGuessedCorrectly` lives in players[]** — when `guess_result` fires with `correct: true`, update the matching player in `players[]` and check if `myId === playerId` to block your own guess input.

10. **Touch support on canvas** — add `onTouchStart`, `onTouchMove`, `onTouchEnd` mirroring mouse handlers. Use `e.touches[0]` for coordinates. Prevents mobile from scrolling while drawing.

---

## Event → Component Map

| Server Event       | Who handles it         | What changes in UI                        |
|--------------------|------------------------|-------------------------------------------|
| `room_created`     | GameContext            | Navigate to `/lobby`                      |
| `room_joined`      | GameContext            | Navigate to `/lobby`                      |
| `player_joined`    | GameContext → Lobby    | PlayerList updates                        |
| `player_left`      | GameContext → Lobby    | PlayerList updates, host badge transfers  |
| `game_state`       | GameContext            | Phase updates                             |
| `round_start`      | GameContext → TopBar   | Round counter, timer starts, WordPicker   |
| `your_word`        | GameContext → WordDisplay | Drawer sees actual word                |
| `word_chosen`      | GameContext → WordDisplay | Guessers see blank hint                |
| `hint_update`      | GameContext → WordDisplay | More letters revealed                  |
| `draw_data`        | Canvas                 | Remote stroke drawn                       |
| `canvas_cleared`   | Canvas                 | ctx.clearRect()                           |
| `canvas_replay`    | Canvas                 | Full redraw from strokes[]                |
| `guess_result`     | GameContext → ChatBox  | Green system message, score update        |
| `correct_word`     | GameContext            | Toast: "You got it! ✅"                   |
| `close_guess`      | GameContext            | Toast: "So close! 🔥"                     |
| `chat_message`     | GameContext → ChatBox  | New message appended                      |
| `round_end`        | GameContext → GamePage | RoundEnd overlay, timer clears            |
| `game_over`        | GameContext            | Navigate to `/gameover`                   |
| `error`            | GameContext            | Toast error message                       |

---

## Build for Production
```bash
npm run build
# Output: dist/
# Deploy dist/ to Vercel
# Set VITE_SERVER_URL env var in Vercel dashboard
```
