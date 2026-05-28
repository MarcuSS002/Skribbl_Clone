# Skribbl Clone

A real-time multiplayer drawing and guessing game inspired by Skribbl.io.

Players can create a room, invite friends, choose words, draw on a shared canvas, guess through chat, and compete for the highest score across multiple rounds.

## Live Demo

Play the deployed app here:

https://skribbl-clone-awsr.vercel.app/

## What This Project Does

Skribbl Clone is a full-stack web app built with React and Socket.IO. It uses real-time WebSocket communication so every player in a room sees drawing, chat, guesses, scores, and game state updates instantly.

The app supports:

- Private multiplayer rooms
- Host-controlled game start
- Real-time canvas drawing
- Word selection for the drawer
- Live guesses and chat messages
- Score updates after correct guesses
- Round timer and hints
- Final leaderboard and winner screen

## Tech Stack

| Part | Technology |
| --- | --- |
| Frontend | React, Vite, React Router, Tailwind CSS |
| Real-time client | Socket.IO Client |
| Drawing | HTML5 Canvas API |
| Backend | Node.js, Express, Socket.IO |
| Room IDs | nanoid |
| Database | None, rooms are stored in memory |

## Project Structure

```text
.
|-- backend/
|   |-- classes/       # Player, Room, and RoomManager logic
|   |-- handlers/      # Socket.IO event handlers
|   |-- utils/         # Helper functions and word list
|   |-- index.js       # Express and Socket.IO server
|   `-- package.json
|
|-- client/
|   |-- public/
|   |-- src/           # React pages, components, context, socket setup
|   |-- index.html
|   |-- vite.config.js
|   `-- package.json
|
`-- README.md
```

## Local Setup

Follow these steps to run the project on your machine.

### Prerequisites

Make sure you have these installed:

- Node.js
- npm
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/skribbl-clone.git
cd skribbl-clone
```

Replace `your-username` with your actual GitHub username if you fork or upload this repository.

### 2. Start the Backend

```bash
cd backend
npm install
```

Create a `.env` file inside the `backend` folder:

```env
PORT=3001
CLIENT_ORIGIN=http://localhost:5173
```

Start the backend server:

```bash
npm run dev
```

The backend will run at:

```text
http://localhost:3001
```

You can test it with:

```text
http://localhost:3001/health
```

### 3. Start the Frontend

Open a second terminal from the project root:

```bash
cd client
npm install
```

Create a `.env` file inside the `client` folder:

```env
VITE_SERVER_URL=http://localhost:3001
```

Start the frontend:

```bash
npm run dev
```

The app will run at:

```text
http://localhost:5173
```

## How to Play

1. Enter your name.
2. Create a new room or join an existing room code.
3. Share the room code with other players.
4. The host starts the game.
5. One player chooses a word and draws it.
6. Other players guess the word in chat.
7. Correct guesses earn points.
8. After all rounds, the leaderboard shows the winner.

## Available Scripts

### Backend

Run these inside `backend/`:

```bash
npm run dev
```

Starts the backend using nodemon.

```bash
node index.js
```

Starts the backend normally.

### Frontend

Run these inside `client/`:

```bash
npm run dev
```

Starts the Vite development server.

```bash
npm run build
```

Builds the frontend for production.

```bash
npm run preview
```

Previews the production build locally.

```bash
npm run lint
```

Runs ESLint.

## Environment Variables

### Backend

| Variable | Required | Description | Example |
| --- | --- | --- | --- |
| `PORT` | No | Port for the backend server | `3001` |
| `CLIENT_ORIGIN` | Yes | Frontend URL allowed by CORS | `http://localhost:5173` |

### Frontend

| Variable | Required | Description | Example |
| --- | --- | --- | --- |
| `VITE_SERVER_URL` | Yes | Backend server URL used by Socket.IO | `http://localhost:3001` |

## Deployment Notes

The frontend is deployed on Vercel:

```text
https://skribbl-clone-awsr.vercel.app/
```

For production deployment:

- Set `VITE_SERVER_URL` in the frontend deployment to your deployed backend URL.
- Set `CLIENT_ORIGIN` in the backend deployment to `https://skribbl-clone-awsr.vercel.app`.
- Deploy the backend on a platform that supports WebSocket connections because Socket.IO needs persistent real-time communication.

## Important Notes

- Rooms are stored in backend memory, so active rooms disappear when the server restarts.
- This project does not use a database.
- The backend is the source of truth for game state, scoring, rounds, and room management.
- Canvas coordinates are normalized so drawings work across different screen sizes.
