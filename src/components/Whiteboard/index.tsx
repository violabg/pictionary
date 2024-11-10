"use client";

import { jotaiStore } from "@/atoms/store";
import { GameController } from "@/components/GameController";
import { useCanvas } from "@/hooks/useCanvas";
import { useChannelEvents } from "@/hooks/useChannelEvents";
import { Provider } from "jotai";
import { useRef } from "react";
import Canvas from "../Canvas";
import { DrawingToolbar } from "../DrawingToolbar";

export default function Whiteboard() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const {
    currentSize,
    isErasing,
    history,
    draw,
    handleDrawOperation,
    setCurrentSize,
    setIsErasing,
    setHistory,
    startDrawing,
    stopDrawing,
    clear,
    undo,
    updateCanvasFromHistory,
    clearCanvas,
  } = useCanvas(canvasRef);

  useChannelEvents({
    canvasRef,
    clearCanvas,
    handleDrawOperation,
    setHistory,
    updateCanvasFromHistory,
  });

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

  return (
    <Provider store={jotaiStore}>
      <div className="gap-2 grid grid-cols-[300px_1fr] grid-rows-[auto_1fr] [grid-template-areas:'sidebar_header'_'sidebar_content'] p-2 h-[100vh]">
        <aside className="[grid-area:sidebar]">
          <GameController />
        </aside>
        <header className="[grid-area:header] flex items-center gap-2 col-span-2 bg-black/20 p-2 rounded-md }">
          <DrawingToolbar
            canUndo={history.length > 1}
            onUndo={undo}
            onClear={clear}
            onToolChange={handleToolChange}
          />
        </header>
        <main className="relative [grid-area:content] bg-black/20 p-2 rounded-md">
          <Canvas
            canvasRef={canvasRef}
            isErasing={isErasing}
            currentSize={currentSize}
            onDraw={draw}
            onStartDrawing={startDrawing}
            onStopDrawing={stopDrawing}
          />
        </main>
      </div>
    </Provider>
  );
}
