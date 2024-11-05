import next from "next";
import { createServer } from "node:http";
import { Server } from "socket.io";

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handler = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(handler);

  const io = new Server(httpServer, {
    cors: {
      origin: process.env.NODE_ENV === "production"
        ? "https://sp-pictionary.vercel.app"
        : "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true
    },
  });

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

    socket.on("undo-drawing", (data) => {
      socket.broadcast.emit("undo-drawing", data);
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected");
    });
  });

  const port = process.env.PORT || 3000;
  httpServer
    .once("error", (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on port ${port}`);
    });
});
