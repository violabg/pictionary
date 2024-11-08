"use client";

import { GameController } from "@/components/GameController";
import { useCanvas } from "@/hooks/useCanvas";
import { useChannelEvents } from "@/hooks/useChannelEvents";
import { useCurrentPlayer } from "@/hooks/useCurrentPlayer";
import { useGameState } from "@/hooks/useGameState";
import { useRef, useState } from "react";
import Canvas from "../Canvas";
import { DrawingToolbar } from "../DrawingToolbar";
import { AddPlayerDialog } from "../GameController/AddPlayerDialog";

export default function Whiteboard() {
  const {
    currentPlayer,
    checkPlayerExists,
    createPlayer,
    canDraw,
    canStartRound,
  } = useCurrentPlayer();
  const [showAuthDialog, setShowAuthDialog] = useState(!currentPlayer);
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

  useChannelEvents({
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

  const handleAddPlayer = async (name: string) => {
    const exists = await checkPlayerExists(name);
    if (exists) {
      alert(
        "A player with this name already exists. Please choose another name."
      );
      return;
    }

    const player = await createPlayer(name);
    if (player) {
      gameActions.addPlayer(name);
      setShowAuthDialog(false);
    }
  };

  if (showAuthDialog) {
    return (
      <AddPlayerDialog
        open={true}
        onOpenChange={() => {}}
        onAddPlayer={handleAddPlayer}
      />
    );
  }

  return (
    <div className="fixed inset-0 gap-2 grid grid-cols-[300px_1fr] grid-rows-[auto_1fr] p-4">
      {canDraw(gameState) && (
        <DrawingToolbar
          canUndo={history.length > 1}
          onUndo={undo}
          onClear={clear}
          onToolChange={handleToolChange}
        />
      )}
      <aside className="self-stretch">
        <GameController
          gameState={gameState}
          currentPlayer={currentPlayer}
          canStartRound={canStartRound(gameState)}
          onStartRound={() => {
            gameActions.startRound();
            clear();
          }}
          onTimeUp={gameActions.handleTimeUp}
          onNewGame={gameActions.newGame}
          onSetTimer={gameActions.setTimer}
        />
      </aside>
      <Canvas
        canvasRef={canvasRef}
        isErasing={isErasing}
        drawingEnabled={
          gameState.isGameActive && !gameState.isPaused && canDraw(gameState)
        }
        currentSize={currentSize}
        onDraw={draw}
        onStartDrawing={startDrawing}
        onStopDrawing={stopDrawing}
      />
    </div>
  );
}
