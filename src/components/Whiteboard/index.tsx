"use client";

import { GameController, GameState } from "@/components/GameController";
import { useSocket } from "@/contexts/SocketContext";
import {
  base64ToImageData,
  imageDataToBase64,
  normalizeCoordinates,
  updateCanvasSize,
} from "@/utils/canvas";
import { useCallback, useEffect, useRef, useState } from "react";
import Canvas from "../Canvas";
import { DrawingToolbar } from "../DrawingToolbar";

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
  const [isDrawing, setIsDrawing] = useState(false);
  const [isErasing, setIsErasing] = useState(false);
  const [currentSize, setCurrentSize] = useState(2);
  const [history, setHistory] = useState<ImageData[]>([]);
  const [drawingEnabled, setDrawingEnabled] = useState(false);
  const { socket } = useSocket();

  const updateCanvasSizeCallback = useCallback(() => {
    updateCanvasSize(canvasRef);
  }, []);

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

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
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

  const updateCanvasFromHistory = (history: ImageData[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (history.length > 0) {
      const lastState = history[history.length - 1];
      ctx.putImageData(lastState, 0, 0);
    }
  };

  const undo = useCallback(() => {
    if (history.length === 0) return;

    const newHistory = history.slice(0, -1);
    setHistory(newHistory);
    updateCanvasFromHistory(newHistory);

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
    updateCanvasSizeCallback();
    window.addEventListener("resize", updateCanvasSizeCallback);

    return () => {
      window.removeEventListener("resize", updateCanvasSizeCallback);
    };
  }, [updateCanvasSizeCallback]);

  useEffect(() => {
    if (!socket) return;

    const handleDrawLine = (drawingData: DrawingData) => {
      handleDrawOperation(drawingData, true);
    };

    const handleUndoDrawing = async (data: { history: string[] }) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

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

      setHistory(newHistory);
      updateCanvasFromHistory(newHistory);
    };

    const handleGameStateUpdate = (gameState: GameState) => {
      setDrawingEnabled(gameState.drawingEnabled ?? false);
    };

    socket.on("draw-line", handleDrawLine);
    socket.on("undo-drawing", handleUndoDrawing);
    socket.on("game-state-update", handleGameStateUpdate);
    socket.on("clear-canvas", clearCanvas);

    return () => {
      socket.off("draw-line", handleDrawLine);
      socket.off("undo-drawing", handleUndoDrawing);
      socket.off("game-state-update", handleGameStateUpdate);
      socket.off("clear-canvas", clearCanvas);
    };
  }, [handleDrawOperation, clearCanvas, socket]);

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

      <Canvas
        canvasRef={canvasRef}
        isErasing={isErasing}
        drawingEnabled={drawingEnabled}
        currentSize={currentSize}
        onDraw={draw}
        onStartDrawing={startDrawing}
        onStopDrawing={stopDrawing}
      />
    </div>
  );
}
