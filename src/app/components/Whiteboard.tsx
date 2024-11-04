"use client";

import { useEffect, useRef, useState } from "react";
import { FaEraser, FaPencilAlt, FaTrash } from "react-icons/fa";

const SizeControl = ({
  value,
  onChange,
}: {
  value: number;
  onChange: (size: number) => void;
}) => (
  <input
    type="range"
    min="1"
    max="50"
    value={value}
    onChange={(e) => onChange(Number(e.target.value))}
    className="ml-2"
  />
);

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
        <button
          className={`px-4 py-2 rounded flex items-center gap-2 border transition-colors ${
            !isErasing
              ? "bg-blue-500 border-blue-500 text-white"
              : "border-gray-400 text-gray-700 hover:bg-gray-100"
          }`}
          onClick={() => setIsErasing(false)}
        >
          <FaPencilAlt />
          <span>Draw</span>
        </button>
        {!isErasing && <SizeControl value={lineSize} onChange={setLineSize} />}
        <button
          className={`px-4 py-2 rounded flex items-center gap-2 border transition-colors ${
            isErasing
              ? "bg-blue-500 border-blue-500 text-white"
              : "border-gray-400 text-gray-700 hover:bg-gray-100"
          }`}
          onClick={() => setIsErasing(true)}
        >
          <FaEraser />
          <span>Erase</span>
        </button>
        {isErasing && (
          <SizeControl value={eraserSize} onChange={setEraserSize} />
        )}
        <button
          className="px-4 py-2 rounded flex items-center gap-2 border border-red-500 text-red-500 hover:bg-red-50 transition-colors"
          onClick={clearCanvas}
        >
          <FaTrash />
          <span>Clear</span>
        </button>
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
