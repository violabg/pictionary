import { gameStateAtom } from "@/atoms";
import { Card } from "@/components/ui/card";
import { useAtomValue } from "jotai";
import React, { useRef, useState } from "react";
import { Section } from "../ui/Section";

type Props = {
  isErasing: boolean;
  currentSize: number;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  onDraw: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onStartDrawing: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onStopDrawing: () => void;
};

const Canvas: React.FC<Props> = ({
  isErasing,
  currentSize,
  canvasRef,
  onDraw,
  onStartDrawing,
  onStopDrawing,
}) => {
  const cursorRef = useRef<HTMLDivElement>(null);
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  const gameState = useAtomValue(gameStateAtom);

  const drawingEnabled = gameState?.status === "drawing";

  const updateCursor = (e: React.MouseEvent) => {
    if (cursorRef.current) {
      setCursorPosition({
        x: e.clientX,
        y: e.clientY,
      });
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    updateCursor(e);
    onStartDrawing(e);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    updateCursor(e);
    onDraw(e);
  };

  const stopDrawing = () => {
    onStopDrawing();
  };

  return (
    <>
      <div className="relative pb-[56.25%] w-full">
        {/* Aspect ratio container */}
        <div className="absolute inset-0">
          <canvas
            ref={canvasRef}
            className={`w-full h-full bg-white rounded-lg ${
              isErasing ? "cursor-none" : "cursor-crosshair"
            } ${!drawingEnabled ? "pointer-events-none" : ""}`}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
          />
          {!drawingEnabled && (
            <Section className="absolute inset-0 flex justify-center items-center opacity-95">
              <Card className="shadow-lg p-6 text-center">
                <h2 className="font-bold text-xl">Waiting to start...</h2>
              </Card>
            </Section>
          )}
        </div>
      </div>

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
    </>
  );
};

export default Canvas;
