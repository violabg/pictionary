"use client";

import { GameController, GameState } from "@/components/game/GameController";
import { useSocket } from "@/contexts/SocketContext";
import {
  base64ToImageData,
  imageDataToBase64,
  normalizeCoordinates,
} from "@/utils/canvas";
import { useCallback, useEffect, useRef, useState } from "react";
import { DrawingToolbar } from "./DrawingToolbar";

type DrawingData = {
  x: number;
  y: number;
  isDrawing: boolean;
  isErasing: boolean;
  lineSize: number;
  sourceWidth: number;
  sourceHeight: number;
};

export default function Whiteboard() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  const [isDrawing, setIsDrawing] = useState(false);
  const [isErasing, setIsErasing] = useState(false);
  const [currentSize, setCurrentSize] = useState(2);
  const [history, setHistory] = useState<ImageData[]>([]);
  const [drawingEnabled, setDrawingEnabled] = useState(false);
  const { socket } = useSocket();

  const updateCanvasSize = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const container = canvas.parentElement;
    if (!container) return;

    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    // Calculate dimensions maintaining 16:9 aspect ratio
    let width = containerWidth;
    let height = containerWidth * (9 / 16);

    if (height > containerHeight) {
      height = containerHeight;
      width = containerHeight * (16 / 9);
    }

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.lineWidth = 2;
  };

  const handleDrawOperation = useCallback(
    (drawingData: DrawingData, isRemoteEvent = false) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      let x = drawingData.x;
      let y = drawingData.y;
      let lineWidth = drawingData.lineSize;

      // Only normalize coordinates for remote events
      if (isRemoteEvent) {
        const normalized = normalizeCoordinates(
          x,
          y,
          drawingData.sourceWidth,
          drawingData.sourceHeight,
          canvas.width,
          canvas.height
        );
        x = normalized.x;
        y = normalized.y;
        lineWidth = drawingData.lineSize * normalized.scale;
      }

      ctx.globalCompositeOperation = drawingData.isErasing
        ? "destination-out"
        : "source-over";
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = lineWidth;

      if (!drawingData.isDrawing) {
        ctx.beginPath();
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
        ctx.stroke();
      }

      // Emit the drawing data to other clients if this is a local event
      if (!isRemoteEvent) {
        socket?.emit("draw-line", {
          ...drawingData,
          sourceWidth: canvas.width,
          sourceHeight: canvas.height,
        });
      }
    },
    [socket]
  );

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawingEnabled) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    handleDrawOperation({
      x,
      y,
      isDrawing: false,
      isErasing,
      lineSize: currentSize, // Simplified
      sourceWidth: canvas.width,
      sourceHeight: canvas.height,
    });

    setIsDrawing(true);
  };

  const updateCursor = (e: React.MouseEvent) => {
    if (cursorRef.current) {
      setCursorPosition({
        x: e.clientX,
        y: e.clientY,
      });
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    updateCursor(e);
    if (!isDrawing || !drawingEnabled) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    handleDrawOperation({
      x,
      y,
      isDrawing: true,
      isErasing,
      lineSize: currentSize,
      sourceWidth: canvas.width,
      sourceHeight: canvas.height,
    });
  };

  const stopDrawing = () => {
    if (isDrawing) {
      saveCanvasState();
    }
    setIsDrawing(false);
  };

  const saveCanvasState = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setHistory((prev) => [...prev, imageData]);
  };

  const undo = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx || history.length === 0) return;

    const previousState = history[history.length - 2];
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (previousState) {
      ctx.putImageData(previousState, 0, 0);
    }

    const newHistory = history.slice(0, -1);
    setHistory(newHistory);

    // Convert history to base64 strings before sending
    const base64History = newHistory.map(imageDataToBase64);
    socket?.emit("undo-drawing", { history: base64History });
  }, [history, socket]);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHistory([]);
  }, []);

  const clear = useCallback(() => {
    clearCanvas();
    socket?.emit("clear-canvas");
  }, [clearCanvas, socket]);

  const handleToolChange = useCallback(
    ({
      isErasing: newIsErasing,
      size,
    }: {
      isErasing: boolean;
      size: number;
    }) => {
      setIsErasing(newIsErasing);
      setCurrentSize(size);
    },
    []
  );

  useEffect(() => {
    updateCanvasSize();
    window.addEventListener("resize", updateCanvasSize);

    return () => {
      window.removeEventListener("resize", updateCanvasSize);
    };
  }, []);

  useEffect(() => {
    if (!socket) return;

    socket.on("draw-line", (drawingData: DrawingData) => {
      handleDrawOperation(drawingData, true);
    });

    socket.on("undo-drawing", async (data: { history: string[] }) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Clear the canvas first
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const newHistory: ImageData[] = [];

      // Convert and apply all history states
      for (const base64 of data.history) {
        try {
          const imageData = await base64ToImageData(base64, canvas);
          newHistory.push(imageData);
        } catch (error) {
          console.error("Failed to convert history state:", error);
        }
      }

      // Apply the last state if available
      if (newHistory.length > 0) {
        const lastState = newHistory[newHistory.length - 1];
        ctx.putImageData(lastState, 0, 0);
      }

      setHistory(newHistory);
    });

    socket.on("game-state-update", (gameState: GameState) => {
      if (gameState.drawingEnabled !== drawingEnabled) {
        setDrawingEnabled(gameState.drawingEnabled ?? false);
      }
    });

    socket.on("clear-canvas", clearCanvas);

    return () => {
      socket.off("draw-line");
      socket.off("undo-drawing");
      socket.off("clear-canvas");
    };
  }, [handleDrawOperation, clearCanvas, drawingEnabled, socket]);

  return (
    <div className="fixed inset-0 gap-2 grid grid-cols-[300px_1fr] grid-rows-[auto_1fr] p-4">
      <DrawingToolbar
        canUndo={history.length > 1}
        onUndo={undo}
        onClear={clear}
        onToolChange={handleToolChange}
      />

      <aside className="self-start">
        <GameController
          onDrawingEnabledChange={setDrawingEnabled}
          onNextRound={clear}
        />
      </aside>

      <main className="relative bg-black/20 p-2 rounded-md">
        <div className="relative pb-[56.25%] w-full">
          {/* Aspect ratio container */}
          <div className="absolute inset-0">
            <canvas
              ref={canvasRef}
              className={`w-full h-full bg-white rounded-md ${
                isErasing ? "cursor-none" : "cursor-crosshair"
              } ${!drawingEnabled ? "pointer-events-none" : ""}`}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
            />
            {!drawingEnabled && (
              <div className="absolute inset-0 flex justify-center items-center bg-black/20 rounded-md">
                <div className="bg-white shadow-lg p-6 rounded-lg text-center">
                  <h2 className="font-bold text-xl">Waiting to start...</h2>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {isErasing && (
        <div
          ref={cursorRef}
          className="fixed border-2 border-black rounded-full pointer-events-none"
          style={{
            width: `${currentSize}px`,
            height: `${currentSize}px`,
            transform: "translate(-50%, -50%)",
            left: cursorPosition.x,
            top: cursorPosition.y,
          }}
        />
      )}
    </div>
  );
}
