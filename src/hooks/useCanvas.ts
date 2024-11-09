import { useSupabase } from "@/contexts/SupabaseContext";
import { CanvasOperation, DrawingData, DrawingSettings } from "@/types";
import {
  get2DContext,
  imageDataToBase64,
  normalizeCoordinates,
  updateCanvasSize,
} from "@/utils/canvas";
import { useCallback, useEffect, useState } from "react";

export function useCanvas(canvasRef: React.RefObject<HTMLCanvasElement>) {
  const { channel } = useSupabase();
  const [isDrawing, setIsDrawing] = useState(false);
  const canvas = canvasRef.current;

  const [drawingSettings, setDrawingSettings] = useState<DrawingSettings>({
    size: 2,
    isErasing: false,
  });
  const [history, setHistory] = useState<ImageData[]>([]);

  // Execute canvas operation with proper context checking
  const executeCanvasOperation = useCallback(
    (operation: CanvasOperation): boolean => {
      if (!canvas) return false;
      const ctx = get2DContext(canvas);
      if (!ctx) return false;

      operation.execute(ctx);
      return true;
    },
    [canvas]
  );

  const handleDrawOperation = useCallback(
    (drawingData: DrawingData, isRemoteEvent = false) => {
      if (!canvas) return;

      const { x: originalX, y: originalY } = drawingData;
      let x = originalX;
      let y = originalY;
      let lineWidth = drawingData.lineSize;

      if (isRemoteEvent) {
        const normalized = normalizeCoordinates(
          x,
          y,
          drawingData.sourceWidth,
          drawingData.sourceHeight,
          canvas.width,
          canvas.height
        );
        x = normalized.x;
        y = normalized.y;
        lineWidth = drawingData.lineSize * normalized.scale;
      }

      executeCanvasOperation({
        execute: (ctx) => {
          ctx.globalCompositeOperation = drawingData.isErasing
            ? "destination-out"
            : "source-over";
          ctx.strokeStyle = "#000000";
          ctx.lineWidth = lineWidth;

          if (!drawingData.isDrawing) {
            ctx.beginPath();
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
            ctx.stroke();
          }
        },
      });

      if (!isRemoteEvent) {
        channel?.send({
          type: "broadcast",
          event: "draw-line",
          payload: {
            ...drawingData,
            sourceWidth: canvas.width,
            sourceHeight: canvas.height,
          },
        });
      }
    },
    [canvas, channel, executeCanvasOperation]
  );

  const handleMouseEvent = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>, isStarting = false) => {
      if (!canvas || (!isDrawing && !isStarting)) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      handleDrawOperation({
        x,
        y,
        isDrawing: !isStarting,
        isErasing: drawingSettings.isErasing,
        lineSize: drawingSettings.size,
        sourceWidth: canvas.width,
        sourceHeight: canvas.height,
      });
    },
    [canvas, isDrawing, drawingSettings, handleDrawOperation]
  );

  const saveCanvasState = useCallback(() => {
    executeCanvasOperation({
      execute: (ctx) => {
        const canvas = canvasRef.current!;
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        setHistory((prev) => [...prev, imageData]);
      },
    });
  }, [canvasRef, executeCanvasOperation]);

  const startDrawing = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      handleMouseEvent(e, true);
      setIsDrawing(true);
    },
    [handleMouseEvent]
  );

  const draw = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      handleMouseEvent(e);
    },
    [handleMouseEvent]
  );

  const stopDrawing = useCallback(() => {
    if (isDrawing) {
      saveCanvasState();
    }
    setIsDrawing(false);
  }, [isDrawing, saveCanvasState]);

  const updateCanvasFromHistory = useCallback(
    (history: ImageData[]) => {
      executeCanvasOperation({
        execute: (ctx) => {
          const canvas = canvasRef.current!;
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          if (history.length > 0) {
            const lastState = history[history.length - 1];
            ctx.putImageData(lastState, 0, 0);
          }
        },
      });
    },
    [canvasRef, executeCanvasOperation]
  );

  const clearCanvas = useCallback(() => {
    executeCanvasOperation({
      execute: (ctx) => {
        const canvas = canvasRef.current!;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setHistory([]);
      },
    });
  }, [canvasRef, executeCanvasOperation]);

  const clear = useCallback(() => {
    clearCanvas();
    channel?.send({
      type: "broadcast",
      event: "clear-canvas",
    });
  }, [clearCanvas, channel]);

  const undo = useCallback(() => {
    if (history.length === 0) return;

    const newHistory = history.slice(0, -1);
    setHistory(newHistory);
    updateCanvasFromHistory(newHistory);

    const base64History = newHistory.map(imageDataToBase64);
    channel?.send({
      type: "broadcast",
      event: "undo-drawing",
      payload: { history: base64History },
    });
  }, [history, updateCanvasFromHistory, channel]);

  const updateCanvasSizeCallback = useCallback(() => {
    if (!canvas) return;
    updateCanvasSize(canvas);
  }, [canvas]);

  useEffect(() => {
    updateCanvasSizeCallback();
    window.addEventListener("resize", updateCanvasSizeCallback);

    return () => {
      window.removeEventListener("resize", updateCanvasSizeCallback);
    };
  }, [updateCanvasSizeCallback]);

  return {
    currentSize: drawingSettings.size,
    isDrawing,
    isErasing: drawingSettings.isErasing,
    history,
    draw,
    handleDrawOperation,
    saveCanvasState,
    setCurrentSize: (size: number) =>
      setDrawingSettings((prev) => ({ ...prev, size })),
    setIsDrawing,
    setIsErasing: (isErasing: boolean) =>
      setDrawingSettings((prev) => ({ ...prev, isErasing })),
    setHistory,
    startDrawing,
    stopDrawing,
    clear,
    clearCanvas,
    undo,
    updateCanvasFromHistory,
  };
}
