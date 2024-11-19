import { clearCanvasAtom } from "@/atoms";
import { useSupabase } from "@/contexts/SupabaseContext";
import { CanvasOperation, DrawingData, DrawingSettings } from "@/types";
import {
  base64ToImageData,
  get2DContext,
  imageDataToBase64,
  normalizeCoordinates,
  updateCanvasSize,
} from "@/utils/canvas";
import { useAtomValue } from "jotai";
import { useCallback, useEffect, useState } from "react";

/**
 * Custom hook for managing canvas drawing functionality
 * Handles drawing operations, history, and real-time collaboration
 * @param canvasRef - Reference to the canvas HTML element
 */
export function useCanvas(canvasRef: React.RefObject<HTMLCanvasElement>) {
  // State management for drawing context and settings
  const { channel } = useSupabase();
  const [isDrawing, setIsDrawing] = useState(false);
  const canvas = canvasRef.current;

  // Drawing settings state including brush size and eraser mode
  const [drawingSettings, setDrawingSettings] = useState<DrawingSettings>({
    size: 2,
    isErasing: false,
    color: "#000000",
  });

  // Maintain canvas state history for undo operations
  const [history, setHistory] = useState<ImageData[]>([]);
  const clearCount = useAtomValue(clearCanvasAtom);

  /**
   * Executes a canvas operation after checking context validity
   * @param operation - The canvas operation to execute
   * @returns boolean indicating if operation was successful
   */
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

  /**
   * Handles drawing operations on the canvas
   * Supports both local and remote drawing events
   * @param drawingData - Data about the drawing operation
   * @param isRemoteEvent - Whether the event comes from another user
   */
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
          ctx.strokeStyle = drawingData.isErasing
            ? "#000000"
            : drawingData.color;
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

  /**
   * Processes pointer events for drawing
   * Converts pointer coordinates to canvas coordinates and initiates drawing
   */
  const handlePointerEvent = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>, isStarting = false) => {
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
        color: drawingSettings.color,
        sourceWidth: canvas.width,
        sourceHeight: canvas.height,
      });
    },
    [canvas, isDrawing, drawingSettings, handleDrawOperation]
  );

  /**
   * Saves current canvas state to history
   * Used for undo functionality
   */
  const saveCanvasState = useCallback(() => {
    executeCanvasOperation({
      execute: (ctx) => {
        const canvas = canvasRef.current!;
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        setHistory((prev) => [...prev, imageData]);
      },
    });
  }, [canvasRef, executeCanvasOperation]);

  /**
   * Drawing control functions
   * startDrawing: Initiates drawing process
   * draw: Continues drawing based on mouse movement
   * stopDrawing: Ends drawing and saves state
   */
  const startDrawing = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      handlePointerEvent(e, true);
      setIsDrawing(true);
    },
    [handlePointerEvent]
  );

  const draw = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      handlePointerEvent(e);
    },
    [handlePointerEvent]
  );

  const stopDrawing = useCallback(() => {
    if (isDrawing) {
      saveCanvasState();
    }
    setIsDrawing(false);
  }, [isDrawing, saveCanvasState]);

  /**
   * Canvas state management functions
   * updateCanvasFromHistory: Restores canvas to a previous state
   * clearCanvas: Resets canvas to blank state
   * clear: Broadcasts clear action to all users
   * undo: Reverts to previous state and broadcasts change
   */
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

  /**
   * Canvas size management
   * Handles canvas resizing on window resize
   */
  const updateCanvasSizeCallback = useCallback(() => {
    if (!canvas) return;
    updateCanvasSize(canvas);
  }, [canvas]);

  // Effect hooks for initialization and real-time updates
  useEffect(() => {
    updateCanvasSizeCallback();
    window.addEventListener("resize", updateCanvasSizeCallback);

    return () => {
      window.removeEventListener("resize", updateCanvasSizeCallback);
    };
  }, [updateCanvasSizeCallback]);

  /**
   * Real-time collaboration effect
   * Sets up listeners for remote drawing events
   */
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

    channel.on("broadcast", { event: "draw-line" }, ({ payload }) => {
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

  // Clear canvas when clearCount changes
  useEffect(() => {
    clear();
  }, [clear, clearCount]);

  // Return hook interface
  return {
    currentSize: drawingSettings.size,
    isDrawing,
    isErasing: drawingSettings.isErasing,
    history,
    clear,
    draw,
    saveCanvasState,
    setCurrentSize: (size: number) =>
      setDrawingSettings((prev) => ({ ...prev, size })),
    setIsDrawing,
    setIsErasing: (isErasing: boolean) =>
      setDrawingSettings((prev) => ({ ...prev, isErasing })),
    startDrawing,
    stopDrawing,
    undo,
    setColor: (color: string) =>
      setDrawingSettings((prev) => ({ ...prev, color })),
  };
}
