require("dotenv").config();

const http = require("http");
const express = require("express");
const cors = require("cors");
const { Server } = require("socket.io");

const registerRoomHandlers = require("./handlers/roomHandlers");
const registerGameHandlers = require("./handlers/gameHandlers");
const registerDrawHandlers = require("./handlers/drawHandlers");
const registerChatHandlers = require("./handlers/chatHandlers");

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";

app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

const io = new Server(server, {
  cors: {
    origin: CLIENT_ORIGIN,
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  registerRoomHandlers(io, socket);
  registerGameHandlers(io, socket);
  registerDrawHandlers(io, socket);
  registerChatHandlers(io, socket);
});

server.listen(PORT, () => {
  console.log(`Skribbl clone backend listening on port ${PORT}`);
});
