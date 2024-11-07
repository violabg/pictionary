import { useSocket } from "@/contexts/SocketContext";
import { DrawingData, GameState } from "@/types";
import { base64ToImageData } from "@/utils/canvas";
import { useEffect } from "react";

interface UseSocketEventsParams {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  clearCanvas: () => void;
  handleDrawOperation: (drawingData: DrawingData, flag: boolean) => void;
  onGameStateUpdate: (state: GameState) => void;
  setHistory: (history: ImageData[]) => void;
  updateCanvasFromHistory: (history: ImageData[]) => void;
}

export function useSocketEvents({
  canvasRef,
  clearCanvas,
  handleDrawOperation,
  onGameStateUpdate,
  setHistory,
  updateCanvasFromHistory,
}: UseSocketEventsParams) {
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket) return;

    const handleDrawLine = (drawingData: DrawingData) => {
      handleDrawOperation(drawingData, true);
    };

    const handleUndoDrawing = async (data: { history: string[] }) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const newHistory: ImageData[] = [];

      // Convert and apply all history states
      for (const base64 of data.history) {
        try {
          const imageData = await base64ToImageData(base64, canvas);
          newHistory.push(imageData);
        } catch (error) {
          console.error("Failed to convert history state:", error);
        }
      }

      setHistory(newHistory);
      updateCanvasFromHistory(newHistory);
    };

    const handleGameStateUpdate = (newGameState: GameState) => {
      onGameStateUpdate(newGameState);
    };

    socket.on("draw-line", handleDrawLine);
    socket.on("undo-drawing", handleUndoDrawing);
    socket.on("game-state-update", handleGameStateUpdate);
    socket.on("clear-canvas", clearCanvas);

    return () => {
      socket.off("draw-line", handleDrawLine);
      socket.off("undo-drawing", handleUndoDrawing);
      socket.off("game-state-update", handleGameStateUpdate);
      socket.off("clear-canvas", clearCanvas);
    };
  }, [
    canvasRef,
    clearCanvas,
    handleDrawOperation,
    onGameStateUpdate,
    setHistory,
    socket,
    updateCanvasFromHistory,
  ]);

  return socket;
}
