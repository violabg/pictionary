import { createServer } from "http";
import next from "next";
import { Server } from "socket.io";
import { parse } from "url";

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(server);

  io.on("connection", (socket) => {
    console.log("Client connected");

    socket.on("draw-line", (drawingData) => {
      socket.broadcast.emit("draw-line", drawingData);
    });

    socket.on("clear-canvas", () => {
      socket.broadcast.emit("clear-canvas");
    });

    socket.on("game-state-update", (gameState) => {
      socket.broadcast.emit("game-state-update", gameState);
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected");
    });
  });

  server.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
  });
});
