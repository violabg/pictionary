import { useSupabase } from "@/contexts/SupabaseContext";
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

export function useChannelEvents({
  canvasRef,
  clearCanvas,
  handleDrawOperation,
  onGameStateUpdate,
  setHistory,
  updateCanvasFromHistory,
}: UseSocketEventsParams) {
  const { channel } = useSupabase();

  useEffect(() => {
    if (!channel) return;

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

    channel.on("broadcast", { event: "draw-line" }, ({ payload }) => {
      handleDrawLine(payload);
    });
    channel.on("broadcast", { event: "undo-drawing" }, ({ payload }) => {
      handleUndoDrawing(payload);
    });
    channel.on("broadcast", { event: "game-state-update" }, ({ payload }) => {
      handleGameStateUpdate(payload);
    });
    channel.on("broadcast", { event: "clear-canvas" }, () => {
      clearCanvas();
    });

    return () => {
      channel.unsubscribe();
    };
  }, [
    canvasRef,
    clearCanvas,
    handleDrawOperation,
    onGameStateUpdate,
    setHistory,
    channel,
    updateCanvasFromHistory,
  ]);

  return channel;
}
