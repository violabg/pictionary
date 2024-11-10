import { useSupabase } from "@/contexts/SupabaseContext";
import { DrawingData } from "@/types";
import { base64ToImageData } from "@/utils/canvas";
import { useEffect } from "react";

interface UseSocketEventsParams {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  clearCanvas: () => void;
  handleDrawOperation: (drawingData: DrawingData, flag: boolean) => void;
  setHistory: (history: ImageData[]) => void;
  updateCanvasFromHistory: (history: ImageData[]) => void;
}

export function useChannelEvents({
  canvasRef,
  clearCanvas,
  handleDrawOperation,
  setHistory,
  updateCanvasFromHistory,
}: UseSocketEventsParams) {
  const { channel } = useSupabase();

  useEffect(() => {
    if (!channel) return;

    const handleDrawLine = (drawingData: DrawingData) => {
      console.log("drawingData :>> ", drawingData);
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

    channel.on("broadcast", { event: "draw-line" }, ({ payload }) => {
      console.log("game-state-update :>> ", payload);
      handleDrawLine(payload);
    });
    channel.on("broadcast", { event: "undo-drawing" }, ({ payload }) => {
      handleUndoDrawing(payload);
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
    setHistory,
    channel,
    updateCanvasFromHistory,
  ]);

  return channel;
}
