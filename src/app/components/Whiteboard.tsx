"use client";

import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Eraser, Pen, Trash } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export default function Whiteboard() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  const [isDrawing, setIsDrawing] = useState(false);
  const [isErasing, setIsErasing] = useState(false);
  const [lineSize, setLineSize] = useState(2);
  const [eraserSize, setEraserSize] = useState(20);

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

  useEffect(() => {
    updateCanvasSize();
    window.addEventListener("resize", updateCanvasSize);

    return () => {
      window.removeEventListener("resize", updateCanvasSize);
    };
  }, []);

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
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

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
        >
          <Eraser />
        </Button>
        <span>{`${eraserSize}px`}</span>
        {isErasing && (
          <Slider
            className="w-20"
            defaultValue={[eraserSize]}
            min={1}
            max={50}
            step={1}
            onValueChange={(value) => setEraserSize(value[0])}
          />
        )}
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
