# AGENTS.md — Backend Context for AI Coding Agents

## Project
Skribbl.io clone backend. Node.js + Express + Socket.IO. No DB needed for MVP.

## Folder Structure
```
server/
├── index.js                   # Entry point — Express + Socket.IO bootstrap
├── classes/
│   ├── Player.js              # Player model (id, name, score, isDrawing)
│   ├── Room.js                # Room model + ALL game logic (phases, scoring, hints)
│   └── RoomManager.js        # Singleton Map<roomId, Room> — CRUD for rooms
├── handlers/
│   ├── roomHandlers.js        # create_room, join_room, disconnect, leave_room
│   ├── gameHandlers.js        # start_game, word_chosen
│   ├── drawHandlers.js        # draw_start, draw_move, draw_end, canvas_clear, draw_undo
│   └── chatHandlers.js        # guess, chat
└── utils/
    ├── words.js               # 150 hardcoded words + getRandomWords(n)
    └── helpers.js             # generateRoomId() using nanoid
```

## Game Phase State Machine
```
lobby → picking → drawing → roundEnd → (loop back to picking OR) → gameOver
```
- `lobby`: Players joining, host can start
- `picking`: Drawer has 15s to pick word, auto-picks if timeout
- `drawing`: Drawer draws, guessers type. Ends on time_up OR all_guessed
- `roundEnd`: 5s pause, shows word + scores
- `gameOver`: All rounds complete

## Key Design Decisions
1. **Server is single source of truth** — all state in Room class, clients just react to events
2. **Normalized coordinates** — canvas x/y sent as 0–1 ratios, client scales by canvas size
3. **No DB** — rooms live in memory (Map). This is intentional for MVP/demo
4. **nanoid v3** — not v4, because v4 is ESM-only. Package.json pins v3.

## Socket.IO Events Reference

### Room Events
| Event | Direction | Payload |
|-------|-----------|---------|
| create_room | C→S | { playerName, settings } |
| room_created | S→C | { roomId, player, room } |
| join_room | C→S | { roomId, playerName } |
| room_joined | S→C | { roomId, player, room } |
| player_joined | S→Room | { player, players } |
| player_left | S→Room | { playerId, players, newHostId } |
| leave_room | C→S | {} |
| get_rooms | C→S | {} |
| rooms_list | S→C | { rooms[] } |

### Game Events
| Event | Direction | Payload |
|-------|-----------|---------|
| start_game | C→S | {} |
| game_state | S→Room | { phase, round, totalRounds, players } |
| round_start | S→Room | { drawerId, drawerName, wordOptions, round, totalRounds } |
| word_chosen | C→S | { word } |
| word_chosen | S→Room | { drawerId, hint, wordLength } |
| your_word | S→Drawer | { word } |
| hint_update | S→Room | { hint } |
| round_end | S→Room | { word, reason, scores } |
| game_over | S→Room | { winner, leaderboard } |

### Drawing Events
| Event | Direction | Payload |
|-------|-----------|---------|
| draw_start | C→S | { x, y, color, size } (normalized 0-1) |
| draw_move | C→S | { x, y } (normalized 0-1) |
| draw_end | C→S | {} |
| draw_data | S→Room | { type, x?, y?, color?, size?, drawerId? } |
| canvas_clear | C→S | {} |
| canvas_cleared | S→Room | {} |
| draw_undo | C→S | {} |
| canvas_replay | S→C | { strokes[] } |
| request_canvas | C→S | {} |

### Chat Events
| Event | Direction | Payload |
|-------|-----------|---------|
| guess | C→S | { text } |
| guess_result | S→Room | { correct, playerId, playerName, points, scores } |
| correct_word | S→Guesser | { word } |
| close_guess | S→C | { message } |
| chat | C→S | { text } |
| chat_message | S→Room | { playerId, playerName, text, type } |

## Room Settings Object
```js
{
  maxPlayers: 2–20,   // default 8
  rounds: 2–10,       // default 3
  drawTime: 15–240,   // seconds, default 80
  wordCount: 1–5,     // choices shown to drawer, default 3
  hints: 0–5          // letters revealed, default 2
}
```

## Scoring Logic
- First correct guess: 100 pts
- Each subsequent correct guess: 10 pts less (min 25)
- Drawer: up to 50 pts based on (correct_guesses / total_guessers) ratio

## Common Gotchas for Agents
- `nanoid` must be v3 (not v4) — v4 is ESM only and won't work with require()
- Canvas coordinates MUST be normalized (0–1) before emitting, client denormalizes
- `room.pickTimer` must be cleared in `word_chosen` handler or both timers fire
- `endRound` must clear `room.drawTimer` before running to prevent double execution
- Drawer socket uses `socket.to(room.id)` not `io.to(room.id)` for word_chosen
  (drawer already knows the word, others get hint string)

## JavaScript Rules (Strict)

* Use JavaScript only
* Never generate TypeScript
* Never use `.ts` or `.tsx`
* Never use interfaces, types, enums, generics, or decorators
* Use CommonJS (`require/module.exports`) on backend
* Use `.js` and `.jsx` files only
* Use plain React + JavaScript with Vite
* Do not add TypeScript configs or typings
* Do not install `typescript`, `@types/*`, or `ts-node`

## Backend Standards

* Use Node.js + Express + Socket.IO only
* Use OOP structure with classes
* Keep socket handlers thin
* Put business logic inside `Room.js`
* Server is the single source of truth
* All timers must be managed in Room class
* Never trust client-side state

## Forbidden Patterns

* No TypeScript
* No Prisma
* No Redux
* No Zustand
* No Next.js
* No serverless sockets
* No global mutable arrays outside RoomManager
* No direct state mutation from handlers
* No emitting secret word to non-drawers
