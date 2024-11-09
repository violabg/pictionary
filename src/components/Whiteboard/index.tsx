"use client";

import { GameController } from "@/components/GameController";
import { useCanvas } from "@/hooks/useCanvas";
import { useChannelEvents } from "@/hooks/useChannelEvents";
import { useCurrentPlayer } from "@/hooks/useCurrentPlayer";
import { useGameState } from "@/hooks/useGameState";
import { Player } from "@/types";
import { useCallback, useEffect, useRef, useState } from "react";
import Canvas from "../Canvas";
import { DrawingToolbar } from "../DrawingToolbar";
import { AddPlayerDialog } from "../GameController/AddPlayerDialog";

export default function Whiteboard() {
  const {
    currentPlayer,
    allPlayers,
    loadPlayers,
    selectOrCreatePlayer,
    canDraw,
    canStartRound,
  } = useCurrentPlayer();
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const { gameState, actions: gameActions } = useGameState();
  console.log("gameState.isGameActive :>> ", gameState.isGameActive);
  useEffect(() => {
    const initializePlayers = async () => {
      const players = await loadPlayers();
      gameActions.syncInitialPlayers(players);
      setIsLoading(false);
      setShowAuthDialog(!currentPlayer);
    };
    if (!gameState.isGameActive) {
      initializePlayers();
    }
  }, [loadPlayers, gameActions, currentPlayer, gameState.isGameActive]);

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

  const handlePlayerSync = useCallback(
    (player: Player) => {
      console.log("2handlePlayerSync :>> ", player);
      if (!allPlayers.some((p) => p.id === player.id)) {
        loadPlayers();
      }
    },
    [allPlayers, loadPlayers]
  );

  useChannelEvents({
    canvasRef,
    gameActions,
    clearCanvas,
    handleDrawOperation,
    onGameStateUpdate: gameActions.updateGameState,
    setHistory,
    updateCanvasFromHistory,
    onPlayerSync: handlePlayerSync,
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
    const player = await selectOrCreatePlayer(name);
    if (player) {
      if (!allPlayers.some((p) => p.id === player.id)) {
        gameActions.addPlayer(name);
      }
      setShowAuthDialog(false);
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

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
      <DrawingToolbar
        canUndo={history.length > 1}
        onUndo={undo}
        onClear={clear}
        onToolChange={handleToolChange}
      />

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
          onNewGame={() => {
            gameActions.newGame();
            clear();
          }}
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
