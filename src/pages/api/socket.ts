/* eslint-disable @typescript-eslint/no-explicit-any */
import { Server } from "socket.io";

const ioHandler = (req: any, res: any) => {
  if (!res.socket.server.io) {
    const io = new Server(res.socket.server);
    res.socket.server.io = io;

    io.on("connection", (socket) => {
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
    });
  }
  res.end();
};

export default ioHandler;
