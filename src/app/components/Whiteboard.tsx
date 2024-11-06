"use client";

import { GameController, GameState } from "@/components/game/GameController";
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
  sourceWidth: number; // Add these new properties
  sourceHeight: number;
}

// Add these helper functions after the component interfaces
const normalizeCoordinates = (
  x: number,
  y: number,
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number
) => {
  const scaleX = targetWidth / sourceWidth;
  const scaleY = targetHeight / sourceHeight;
  return {
    x: x * scaleX,
    y: y * scaleY,
    scale: Math.min(scaleX, scaleY),
  };
};

export default function Whiteboard() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  const [isDrawing, setIsDrawing] = useState(false);
  const [isErasing, setIsErasing] = useState(false);
  const [lineSize, setLineSize] = useState(2);
  const [eraserSize, setEraserSize] = useState(30);
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
    (drawingData: DrawingData, canvas: HTMLCanvasElement) => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const {
        x: normalizedX,
        y: normalizedY,
        scale,
      } = normalizeCoordinates(
        drawingData.x,
        drawingData.y,
        drawingData.sourceWidth,
        drawingData.sourceHeight,
        canvas.width,
        canvas.height
      );

      const normalizedLineSize = drawingData.lineSize * scale;

      ctx.globalCompositeOperation = drawingData.isErasing
        ? "destination-out"
        : "source-over";
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = normalizedLineSize;

      if (!drawingData.isDrawing) {
        ctx.beginPath();
        ctx.moveTo(normalizedX, normalizedY);
      } else {
        ctx.lineTo(normalizedX, normalizedY);
        ctx.stroke();
      }
    },
    []
  );

  const emitDrawOperation = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>, isDrawingActive: boolean) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const drawData: DrawingData = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        isDrawing: isDrawingActive,
        isErasing,
        lineSize: isErasing ? eraserSize : lineSize,
        sourceWidth: canvas.width,
        sourceHeight: canvas.height,
      };

      socket?.emit("draw-line", drawData);
      handleDrawOperation(drawData, canvas);
    },
    [eraserSize, handleDrawOperation, isErasing, lineSize, socket]
  );

  const startDrawing = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!drawingEnabled) return;
      setIsDrawing(true);
      emitDrawOperation(e, false);
    },
    [drawingEnabled, emitDrawOperation]
  );

  const updateCursor = useCallback((e: React.MouseEvent) => {
    if (cursorRef.current) {
      setCursorPosition({
        x: e.clientX,
        y: e.clientY,
      });
    }
  }, []);

  const draw = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      updateCursor(e);
      if (!isDrawing || !drawingEnabled) return;
      emitDrawOperation(e, true);
    },
    [drawingEnabled, emitDrawOperation, isDrawing, updateCursor]
  );

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

  const imageDataToBase64 = (imageData: ImageData): string => {
    const canvas = document.createElement("canvas");
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";

    ctx.putImageData(imageData, 0, 0);
    return canvas.toDataURL("image/png");
  };

  const base64ToImageData = (
    base64: string,
    targetCanvas: HTMLCanvasElement
  ): Promise<ImageData> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = targetCanvas.width;
        tempCanvas.height = targetCanvas.height;
        const tempCtx = tempCanvas.getContext("2d");
        if (!tempCtx) return;

        // Calculate scaled dimensions while maintaining aspect ratio
        const scale = Math.min(
          targetCanvas.width / img.width,
          targetCanvas.height / img.height
        );

        const scaledWidth = img.width * scale;
        const scaledHeight = img.height * scale;

        // Center the image
        const x = (targetCanvas.width - scaledWidth) / 2;
        const y = (targetCanvas.height - scaledHeight) / 2;

        // Clear and draw new image with proper scaling
        tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
        tempCtx.drawImage(img, x, y, scaledWidth, scaledHeight);

        resolve(
          tempCtx.getImageData(0, 0, targetCanvas.width, targetCanvas.height)
        );
      };
      img.src = base64;
    });
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
      const canvas = canvasRef.current;
      if (!canvas) return;
      handleDrawOperation(drawingData, canvas);
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
      socket.off("game-state-update");
    };
  }, [clearCanvas, drawingEnabled, handleDrawOperation, socket]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === "p") {
        setIsErasing(false);
      } else if (e.key === "e") {
        setIsErasing(true);
      } else if ((e.metaKey || e.ctrlKey) && e.key === "z") {
        e.preventDefault();
        undo();
      } else if (e.key === "c") {
        clear();
      }
    };

    window.addEventListener("keypress", handleKeyPress);
    window.addEventListener("keydown", handleKeyPress);
    return () => {
      window.removeEventListener("keypress", handleKeyPress);
      window.removeEventListener("keydown", handleKeyPress);
    };
  }, [clear, history, undo]);

  return (
    <div className="fixed inset-0 gap-2 grid grid-cols-[300px_1fr] grid-rows-[auto_1fr] p-4">
      <header className="flex items-center gap-2 col-span-2 bg-black/20 p-2 rounded-md">
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
        <Button variant="destructive" onClick={clear}>
          <Trash />
          <span>Clear</span>
        </Button>
      </header>

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
            width: `${eraserSize}px`,
            height: `${eraserSize}px`,
            transform: "translate(-50%, -50%)",
            left: cursorPosition.x,
            top: cursorPosition.y,
          }}
        />
      )}
    </div>
  );
}
