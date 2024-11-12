"use client";

import { isDrawerAtom } from "@/atoms";
import { useCanvas } from "@/hooks/useCanvas";
import { useAtomValue } from "jotai";
import { useRef } from "react";
import Canvas from "../Canvas";
import { DrawingToolbar } from "../DrawingToolbar";

export default function Whiteboard() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawer = useAtomValue(isDrawerAtom);

  const {
    currentSize,
    isErasing,
    history,
    draw,
    setCurrentSize,
    setIsErasing,
    startDrawing,
    stopDrawing,
    clear,
    undo,
  } = useCanvas(canvasRef);

  const handleToolChange = ({
    isErasing: newIsErasing,
    size,
  }: {
    isErasing: boolean;
    size: number;
  }) => {
    setIsErasing(newIsErasing);
    setCurrentSize(size);
  };

  const _onStartDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDrawer) startDrawing(e);
  };
  const _onStopDrawing = () => {
    if (isDrawer) stopDrawing();
  };

  return (
    <>
      {isDrawer && (
        <header className="[grid-area:header] flex items-center gap-2 col-span-2 bg-black/20 p-2 rounded-md }">
          <DrawingToolbar
            canUndo={history.length > 1}
            isDrawer={isDrawer}
            onUndo={undo}
            onClear={clear}
            onToolChange={handleToolChange}
          />
        </header>
      )}
      <main className="relative [grid-area:content] bg-black/20 p-2 rounded-md">
        <Canvas
          canvasRef={canvasRef}
          isErasing={isErasing}
          currentSize={currentSize}
          onDraw={draw}
          onStartDrawing={_onStartDrawing}
          onStopDrawing={_onStopDrawing}
        />
      </main>
    </>
  );
}
