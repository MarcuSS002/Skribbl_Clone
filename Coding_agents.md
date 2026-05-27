# AGENT SPEC: Skribbl.io Clone Assignment
> Machine-readable build plan for AI agents assisting on this project.
> Owner: Harsh Gautam (MERN Stack Developer, Fresher/SDE-1)
> Deadline: 48 hours from assignment receipt

---

## PROJECT IDENTITY

```json
{
  "project": "skribbl.io Clone",
  "type": "Multiplayer Real-time Drawing & Guessing Game",
  "owner": "Harsh Gautam",
  "stack": ["React", "Vite", "Node.js", "Express", "Socket.IO", "MongoDB"],
  "canvas": "HTML5 Canvas API (no Fabric.js)",
  "deploy_frontend": "Vercel",
  "deploy_backend": "Render",
  "deadline_hours": 48,
  "context": "Intern interview assignment — must be production-deployed and demo-ready"
}
```

---

## FOLDER STRUCTURE

```
skribbl-clone/
├── client/                  # React + Vite frontend
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Home.jsx         # Name input, create/join room
│   │   │   ├── Lobby.jsx        # Player list, host starts game
│   │   │   ├── Game.jsx         # Main game screen
│   │   │   └── GameOver.jsx     # Leaderboard + winner
│   │   ├── components/
│   │   │   ├── Canvas.jsx       # HTML5 canvas + draw logic
│   │   │   ├── Toolbar.jsx      # Colors, brush size, undo, clear
│   │   │   ├── ChatBox.jsx      # Guess input + message list
│   │   │   ├── PlayerList.jsx   # Scores + drawing indicator
│   │   │   ├── WordDisplay.jsx  # Blanks or revealed word
│   │   │   └── TopBar.jsx       # Round counter + timer
│   │   ├── socket.js            # Socket.IO client singleton
│   │   └── App.jsx
│   └── .env                     # VITE_SERVER_URL=https://your-render-url
│
└── server/                  # Node.js + Express + Socket.IO backend
    ├── classes/
    │   ├── Player.js            # id, name, score, isDrawing
    │   ├── Room.js              # Full game state machine
    │   └── Game.js              # Round logic, scoring, timer
    ├── roomManager.js           # Map<roomId, Room> singleton
    ├── words.js                 # Hardcoded word list array (100+ words)
    ├── index.js                 # Express + Socket.IO entrypoint
    └── .env                     # PORT=3001
```

---

## BACKEND CLASSES

### Player.js
```js
class Player {
  constructor(id, name) {
    this.id = id;           // socket.id
    this.name = name;
    this.score = 0;
    this.isDrawing = false;
    this.hasGuessed = false;
  }
}
```

### Room.js (core state machine)
```js
class Room {
  constructor(id, hostId, settings) {
    this.id = id;                        // 6-char alphanumeric
    this.hostId = hostId;
    this.players = [];                   // Player[]
    this.settings = {
      maxPlayers: settings.maxPlayers || 8,
      rounds: settings.rounds || 3,
      drawTime: settings.drawTime || 80,
      wordCount: settings.wordCount || 3,
      hints: settings.hints || 2
    };
    this.currentRound = 0;
    this.currentDrawerIndex = 0;
    this.currentWord = null;
    this.phase = 'lobby';               // lobby | picking | drawing | roundEnd | gameOver
    this.timer = null;
    this.guessedPlayers = new Set();
    this.revealedHints = [];
  }
}
```

### Game Phase State Machine
```
lobby → picking → drawing → roundEnd → (loop) → gameOver

lobby:      Waiting for host to start
picking:    Drawer gets N word choices (15s timeout, then auto-pick)
drawing:    Drawer draws, others guess (drawTime seconds)
roundEnd:   Show word + scores (5s pause)
gameOver:   All rounds complete, show leaderboard
```

---

## SOCKET.IO EVENTS REFERENCE

### Client → Server
| Event | Payload | When |
|-------|---------|------|
| `create_room` | `{ playerName, settings }` | Host creates room |
| `join_room` | `{ roomId, playerName }` | Player joins |
| `start_game` | `{}` | Host only, from lobby |
| `word_chosen` | `{ word }` | Drawer picks word |
| `draw_start` | `{ x, y, color, size }` | Mouse down on canvas |
| `draw_move` | `{ x, y }` | Mouse move while drawing |
| `draw_end` | `{}` | Mouse up |
| `draw_undo` | `{}` | Undo last stroke |
| `canvas_clear` | `{}` | Clear canvas (drawer only) |
| `guess` | `{ text }` | Player submits guess |
| `chat` | `{ text }` | General chat message |

### Server → Client(s)
| Event | Payload | To |
|-------|---------|-----|
| `room_created` | `{ roomId, player, settings }` | Creator only |
| `player_joined` | `{ player, players }` | All in room |
| `player_left` | `{ playerId, players }` | All in room |
| `game_state` | `{ phase, round, drawerId, hints }` | All |
| `round_start` | `{ drawerId, wordOptions, drawTime }` | All (drawer gets real words, others get count only) |
| `word_chosen` | `{ wordLength, phase }` | All (word masked) |
| `draw_data` | `{ x, y, lastX, lastY, color, size }` | All except drawer |
| `canvas_clear` | `{}` | All |
| `draw_undo` | `{ strokes }` | All |
| `hint_update` | `{ hints }` | All non-drawers |
| `guess_result` | `{ correct, playerId, playerName, points }` | All |
| `chat_message` | `{ playerId, playerName, text }` | All |
| `round_end` | `{ word, scores, nextDrawerId }` | All |
| `game_over` | `{ winner, leaderboard }` | All |
| `timer_update` | `{ timeLeft }` | All |

---

## CANVAS SYNC PROTOCOL

```
CRITICAL: Normalize coordinates before sending.

Sender:
  ratio_x = mouseX / canvas.width     // float 0-1
  ratio_y = mouseY / canvas.height    // float 0-1
  emit('draw_move', { x: ratio_x, y: ratio_y })

Receiver:
  actual_x = data.x * canvas.width
  actual_y = data.y * canvas.height
  drawLine(lastX, lastY, actual_x, actual_y, color, size)

WHY: Different screen sizes on different clients.
```

### drawLine utility
```js
function drawLine(ctx, x1, y1, x2, y2, color, size) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = color;
  ctx.lineWidth = size;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();
}
```

---

## SCORING LOGIC

```
Correct guesser:
  basePoints = 100
  timeBonus = Math.floor((timeLeft / drawTime) * 100)
  pointsAwarded = basePoints + timeBonus
  (First guesser gets max bonus; later guessers get less)

Drawer:
  drawerPoints = guessedCount * 20
  (Awarded at round end)

No one guessed: drawer gets 0 points
```

---

## BUILD ORDER (48-Hour Timeline)

```
Hour 00-02  → Project setup, both servers running, Socket.IO handshake working
Hour 02-06  → Backend: Player/Room/Game classes + all Socket.IO events + game loop
Hour 06-10  → Frontend: Home + Lobby screens + Socket connection
Hour 10-16  → Frontend: Game screen + Canvas sync (most critical)
Hour 16-18  → Frontend: ChatBox + guessing + word display + hints
Hour 18-20  → Polish: timer countdown, score updates, GameOver screen
Hour 20-24  → Deploy: Render (backend) + Vercel (frontend)
Hour 24-36  → Bug fixes, reconnect handling, CORS, Render cold start fix
Hour 36-42  → README, architecture doc, code cleanup
Hour 42-48  → Interview prep: practice explaining canvas sync + game state machine
```

---

## PRIORITY TIERS

```
TIER 1 — MUST SHIP (core loop):
  ✅ Create room, join room, lobby
  ✅ Turn-based rounds with drawer rotation
  ✅ Real-time canvas sync (draw_start, draw_move, draw_end)
  ✅ Guessing with correct/incorrect feedback
  ✅ Scoring + leaderboard
  ✅ Game over screen
  ✅ Deployed and publicly accessible

TIER 2 — SHOULD SHIP:
  ⚠️ Word selection (3 choices per drawer)
  ⚠️ Hints (letter reveal over time)
  ⚠️ Draw timer countdown
  ⚠️ Private room invite link
  ⚠️ Undo + clear canvas tools
  ⚠️ Disconnect handling (skip drawer if they leave)

TIER 3 — SKIP IF PRESSED:
  ❌ Word categories
  ❌ Kick/ban/votekick
  ❌ Avatars
  ❌ Spectator mode
  ❌ Replay
  ❌ Custom word list
```

---

## KNOWN GOTCHAS

| Issue | Fix |
|-------|-----|
| Canvas coords mismatch on different screens | Normalize to 0-1 ratio before emitting |
| draw_move fires too fast, floods socket | Throttle: only emit if `Date.now() - lastEmit > 10` |
| Render free tier sleeps after 15min | Add `/health` endpoint, ping every 14min via cron-job.org |
| CORS error on deploy | Set `cors origin` in BOTH Express and Socket.IO init to Vercel URL |
| Drawer disconnects mid-round | On `disconnect`, check if player was drawer → call `nextTurn()` |
| Socket reconnect loses game state | Store `playerId` in `localStorage`, emit `rejoin_room` on reconnect |
| Room state lost on server restart | Expected on Render free tier — document this in README |

---

## DEPLOYMENT CONFIG

### Backend (Render)
```
Build command:  npm install
Start command:  node index.js
Env vars:       PORT (auto-set by Render), CLIENT_URL=https://your-vercel-url.vercel.app
```

### Frontend (Vercel)
```
Build command:  npm run build
Output dir:     dist
Env vars:       VITE_SERVER_URL=https://your-render-url.onrender.com
```

### Socket.IO CORS (server/index.js)
```js
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL,
    methods: ["GET", "POST"]
  }
});
```

---

## AGENT INSTRUCTIONS

If you are an AI agent assisting on this project:

1. **Do not suggest Next.js, Fabric.js, Redis, or microservices.** Stack is fixed.
2. **Do not suggest MongoDB for game state.** In-memory Map is intentional for speed.
3. **MongoDB is only for word lists** (optional — hardcoded array is fine for MVP).
4. **Always ground suggestions in the classes defined above** (Player, Room, Game).
5. **Canvas sync and game loop are the highest-risk areas** — prioritize correctness there.
6. **All deployment advice must account for Render free tier constraints** (cold start, no persistent memory).
7. **Owner is a fresher** — keep code patterns simple, avoid over-abstraction.