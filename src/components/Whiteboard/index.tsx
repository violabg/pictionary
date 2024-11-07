"use client";

import { GameController } from "@/components/GameController";
import { useSocket } from "@/contexts/SocketContext";
import { useDrawing } from "@/hooks/useDrawing";
import { useGameState } from "@/hooks/useGameState";
import { useSocketEvents } from "@/hooks/useSocketEvents";
import { imageDataToBase64, updateCanvasSize } from "@/utils/canvas";
import { useCallback, useEffect, useRef } from "react";
import Canvas from "../Canvas";
import { DrawingToolbar } from "../DrawingToolbar";

export default function Whiteboard() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { socket } = useSocket();

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
  } = useDrawing(canvasRef);

  const updateCanvasSizeCallback = useCallback(() => {
    updateCanvasSize(canvasRef);
  }, []);

  const updateCanvasFromHistory = (history: ImageData[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (history.length > 0) {
      const lastState = history[history.length - 1];
      ctx.putImageData(lastState, 0, 0);
    }
  };

  const undo = useCallback(() => {
    if (history.length === 0) return;

    const newHistory = history.slice(0, -1);
    setHistory(newHistory);
    updateCanvasFromHistory(newHistory);

    // Convert history to base64 strings before sending
    const base64History = newHistory.map(imageDataToBase64);
    socket?.emit("undo-drawing", { history: base64History });
  }, [history, setHistory, socket]);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHistory([]);
  }, [setHistory]);

  const clear = useCallback(() => {
    clearCanvas();
    socket?.emit("clear-canvas");
  }, [clearCanvas, socket]);

  const handleToolChange = useCallback(
    ({
      isErasing: newIsErasing,
      size,
    }: {
      isErasing: boolean;
      size: number;
    }) => {
      setIsErasing(newIsErasing);
      setCurrentSize(size);
    },
    [setCurrentSize, setIsErasing]
  );

  useEffect(() => {
    updateCanvasSizeCallback();
    window.addEventListener("resize", updateCanvasSizeCallback);

    return () => {
      window.removeEventListener("resize", updateCanvasSizeCallback);
    };
  }, [updateCanvasSizeCallback]);

  useSocketEvents({
    handleDrawOperation,
    clearCanvas,
    updateCanvasFromHistory,
    setHistory,
    canvasRef,
    gameState,
    onGameStateUpdate: gameActions.updateGameState,
  });

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
