"use client";

import { GameController } from "@/components/GameController";
import { useCanvas } from "@/hooks/useCanvas";
import { useGameState } from "@/hooks/useGameState";
import { useSocketEvents } from "@/hooks/useSocketEvents";
import { useRef } from "react";
import Canvas from "../Canvas";
import { DrawingToolbar } from "../DrawingToolbar";

export default function Whiteboard() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { gameState, actions: gameActions } = useGameState();

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

  useSocketEvents({
    canvasRef,
    clearCanvas,
    handleDrawOperation,
    onGameStateUpdate: gameActions.updateGameState,
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
    <div className="fixed inset-0 gap-2 grid grid-cols-[300px_1fr] grid-rows-[auto_1fr] p-4">
      <DrawingToolbar
        canUndo={history.length > 1}
        onUndo={undo}
        onClear={clear}
        onToolChange={handleToolChange}
      />
      <aside className="self-stretch">
        <GameController
          gameState={gameState}
          onStartRound={() => {
            gameActions.startRound();
            clear();
          }}
          onTimeUp={gameActions.handleTimeUp}
          onNewGame={() => {
            gameActions.newGame();
            clear();
          }}
          onAddPlayer={gameActions.addPlayer}
          onSetTimer={gameActions.setTimer}
        />
      </aside>
      <Canvas
        canvasRef={canvasRef}
        isErasing={isErasing}
        drawingEnabled={gameState.isGameActive && !gameState.isPaused}
        currentSize={currentSize}
        onDraw={draw}
        onStartDrawing={startDrawing}
        onStopDrawing={stopDrawing}
      />
    </div>
  );
}
