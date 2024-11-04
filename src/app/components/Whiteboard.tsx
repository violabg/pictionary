"use client";

import { GameController } from "@/components/game/GameController";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useSocket } from "@/contexts/SocketContext";
import { Eraser, Pen, Trash, Undo } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface DrawingData {
  x: number;
  y: number;
  isDrawing: boolean;
  isErasing: boolean;
  lineSize: number;
}

export default function Whiteboard() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  const [isDrawing, setIsDrawing] = useState(false);
  const [isErasing, setIsErasing] = useState(false);
  const [lineSize, setLineSize] = useState(2);
  const [eraserSize, setEraserSize] = useState(20);
  const [history, setHistory] = useState<ImageData[]>([]);
  const [drawingEnabled, setDrawingEnabled] = useState(false);
  const { socket } = useSocket();

  const updateCanvasSize = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.lineWidth = 2;
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawingEnabled) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    socket?.emit("draw-line", {
      x,
      y,
      isDrawing: false,
      isErasing,
      lineSize: isErasing ? eraserSize : lineSize,
    });

    if (isErasing) {
      ctx.globalCompositeOperation = "destination-out";
    } else {
      ctx.globalCompositeOperation = "source-over";
    }

    ctx.beginPath();
    ctx.moveTo(x, y);
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

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    socket?.emit("draw-line", {
      x,
      y,
      isDrawing: true,
      isErasing,
      lineSize: isErasing ? eraserSize : lineSize,
    });

    if (isErasing) {
      ctx.globalCompositeOperation = "destination-out";
    } else {
      ctx.globalCompositeOperation = "source-over";
    }

    ctx.strokeStyle = "#000000";
    ctx.lineWidth = isErasing ? eraserSize : lineSize;
    ctx.lineTo(x, y);
    ctx.stroke();
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

    setHistory((prev) => prev.slice(0, -1));
  }, [history]);

  const clearCanvas = useCallback(() => {
    console.log("clear-canvas");
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHistory([]);
    socket?.emit("clear-canvas");
  }, [socket]);

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
      console.log("draw-line");
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.globalCompositeOperation = drawingData.isErasing
        ? "destination-out"
        : "source-over";
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = drawingData.lineSize;

      if (!drawingData.isDrawing) {
        ctx.beginPath();
        ctx.moveTo(drawingData.x, drawingData.y);
      } else {
        ctx.lineTo(drawingData.x, drawingData.y);
        ctx.stroke();
      }
    });

    socket.on("game-state-update", (gameState) => {
      console.log("gameState :>> ", gameState);
      if (gameState.drawingEnabled !== drawingEnabled) {
        setDrawingEnabled(gameState.drawingEnabled);
      }
    });

    socket.on("clear-canvas", clearCanvas);

    return () => {
      socket.off("draw-line");
      socket.off("clear-canvas");
    };
  }, [clearCanvas, drawingEnabled, socket]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === "p") {
        setIsErasing(false);
      } else if (e.key === "e") {
        setIsErasing(true);
      } else if ((e.metaKey || e.ctrlKey) && e.key === "z") {
        e.preventDefault();
        undo();
      }
    };

    window.addEventListener("keypress", handleKeyPress);
    window.addEventListener("keydown", handleKeyPress);
    return () => {
      window.removeEventListener("keypress", handleKeyPress);
      window.removeEventListener("keydown", handleKeyPress);
    };
  }, [history, undo]);

  return (
    <div className="fixed inset-0">
      {isErasing && (
        <div
          ref={cursorRef}
          className="fixed border-2 border-black rounded-full pointer-events-none"
          style={{
            width: `${eraserSize}px`,
            height: `${eraserSize}px`,
            transform: "translate(-50%, -50%)",
            left: cursorPosition.x,
            top: cursorPosition.y,
          }}
        />
      )}
      <div className="top-[80px] left-4 z-10 absolute">
        <GameController
          onDrawingEnabledChange={setDrawingEnabled}
          onNextRound={clearCanvas}
        />
      </div>
      <div className="top-4 right-4 left-4 z-10 absolute flex items-center gap-2 bg-black/20 p-2 rounded-md">
        <div className="flex flex-1 items-center gap-4">
          <Button
            variant={!isErasing ? undefined : "outline"}
            className={`transition-colors`}
            onClick={() => setIsErasing(false)}
            size={"icon"}
            title="Pen tool (P)"
          >
            <Pen />
          </Button>
          <span>{`${lineSize}px`}</span>
          {!isErasing && (
            <Slider
              className="w-20"
              defaultValue={[lineSize]}
              min={1}
              max={30}
              step={1}
              onValueChange={(value) => setLineSize(value[0])}
            />
          )}
          <Button
            variant={isErasing ? undefined : "outline"}
            className={`transition-colors`}
            onClick={() => setIsErasing(true)}
            size={"icon"}
            title="Eraser (E)"
          >
            <Eraser />
          </Button>
          <span>{`${eraserSize}px`}</span>
          {isErasing && (
            <Slider
              className="w-20"
              defaultValue={[eraserSize]}
              min={1}
              max={100}
              step={1}
              onValueChange={(value) => setEraserSize(value[0])}
            />
          )}
        </div>
        <Button
          variant="outline"
          className="transition-colors"
          onClick={undo}
          size="icon"
          disabled={history.length <= 1}
          title="Undo (Ctrl+Z)"
        >
          <Undo />
        </Button>
        <Button variant="destructive" onClick={clearCanvas}>
          <Trash />
          <span>Clear</span>
        </Button>
      </div>
      <canvas
        ref={canvasRef}
        className={`w-full h-full bg-white ${
          isErasing ? "cursor-none" : "cursor-crosshair"
        } ${!drawingEnabled ? "pointer-events-none" : ""}`}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
      />
      {!drawingEnabled && (
        <div className="absolute inset-0 flex justify-center items-center bg-black/20">
          <div className="bg-white shadow-lg p-6 rounded-lg text-center">
            <h2 className="font-bold text-xl">Waiting to start...</h2>
          </div>
        </div>
      )}
    </div>
  );
}
