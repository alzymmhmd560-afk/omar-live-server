
const express = require("express");
const http = require("http");
const WebSocket = require("ws");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.json());

const PORT = process.env.PORT || 3000;
const rooms = new Map();

app.get("/", (req, res) => {
  res.json({
    name: "Omar Live Server",
    status: "online",
    version: "1.0.0"
  });
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

wss.on("connection", (ws) => {
  let currentRoom = null;

  ws.on("message", (data) => {
    try {
      const msg = JSON.parse(data.toString());

      if (msg.type === "join") {
        const room = String(msg.room || "").trim();

        if (!/^[a-zA-Z0-9_-]{4,64}$/.test(room)) {
          ws.send(JSON.stringify({
            type: "error",
            message: "Invalid room"
          }));
          return;
        }

        currentRoom = room;

        if (!rooms.has(room)) {
          rooms.set(room, new Set());
        }

        rooms.get(room).add(ws);

        ws.send(JSON.stringify({
          type: "joined",
          room
        }));

        return;
      }

      if (!currentRoom) return;

      const allowed = [
        "offer",
        "answer",
        "ice-candidate",
        "call-ended"
      ];

      if (!allowed.includes(msg.type)) return;

      const members = rooms.get(currentRoom);
      if (!members) return;

      const message = JSON.stringify(msg);

      members.forEach((client) => {
        if (client !== ws &&
            client.readyState === WebSocket.OPEN) {
          client.send(message);
        }
      });

    } catch (error) {
      ws.send(JSON.stringify({
        type: "error",
        message: "Invalid message"
      }));
    }
  });

  ws.on("close", () => {
    if (currentRoom && rooms.has(currentRoom)) {
      const members = rooms.get(currentRoom);
      members.delete(ws);

      if (members.size === 0) {
        rooms.delete(currentRoom);
      }
    }
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log("Omar Live Server running on port " + PORT);
});
