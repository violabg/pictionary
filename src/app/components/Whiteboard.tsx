"use client";

import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Eraser, Pen, Trash, Undo } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

export default function Whiteboard() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  const [isDrawing, setIsDrawing] = useState(false);
  const [isErasing, setIsErasing] = useState(false);
  const [lineSize, setLineSize] = useState(2);
  const [eraserSize, setEraserSize] = useState(20);
  const [history, setHistory] = useState<ImageData[]>([]);

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
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

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
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

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

    const previousState = history[history.length - 2]; // Get second to last state
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (previousState) {
      ctx.putImageData(previousState, 0, 0);
    }

    setHistory((prev) => prev.slice(0, -1));
  }, [history]);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHistory([]);
  };

  useEffect(() => {
    updateCanvasSize();
    window.addEventListener("resize", updateCanvasSize);

    return () => {
      window.removeEventListener("resize", updateCanvasSize);
    };
  }, []);

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
    window.addEventListener("keydown", handleKeyPress); // Added for Ctrl+Z
    return () => {
      window.removeEventListener("keypress", handleKeyPress);
      window.removeEventListener("keydown", handleKeyPress);
    };
  }, [history, undo]); // Add history dependency

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
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
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
        }`}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
      />
    </div>
  );
}
