import { clearCanvasAtom } from "@/atoms";
import { useSupabase } from "@/contexts/SupabaseContext";
import { CanvasSyncManager } from "@/services/CanvasSyncManager";
import { CanvasOperation, DrawingData, DrawingSettings } from "@/types";
import {
  base64ToImageData,
  get2DContext,
  imageDataToBase64,
  normalizeCoordinates,
  updateCanvasSize,
} from "@/utils/canvas";
import { useAtomValue } from "jotai";
import { useCallback, useEffect, useMemo, useState } from "react";

/**
 * Custom hook for managing canvas drawing functionality
 * Handles drawing operations, history, and real-time collaboration
 * @param canvasRef - Reference to the canvas HTML element
 */
export function useCanvas(canvasRef: React.RefObject<HTMLCanvasElement>) {
  const { channel } = useSupabase();
  const syncManager = useMemo(
    () => (channel ? new CanvasSyncManager(channel) : null),
    [channel]
  );

  // State management for drawing context and settings
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
    },
    [canvas, executeCanvasOperation]
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

      const drawingData = {
        x,
        y,
        isDrawing: !isStarting,
        isErasing: drawingSettings.isErasing,
        lineSize: drawingSettings.size,
        color: drawingSettings.color,
        sourceWidth: canvas.width,
        sourceHeight: canvas.height,
      };

      handleDrawOperation(drawingData);
      syncManager?.broadcastDraw(drawingData);
    },
    [canvas, isDrawing, drawingSettings, handleDrawOperation, syncManager]
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
   */
  const startDrawing = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      handlePointerEvent(e, true);
      setIsDrawing(true);
    },
    [handlePointerEvent]
  );
  /**
   * Drawing control functions
   * draw: Continues drawing based on mouse movement
   */
  const draw = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      handlePointerEvent(e);
    },
    [handlePointerEvent]
  );
  /**
   * Drawing control functions
   * stopDrawing: Ends drawing and saves state
   */
  const stopDrawing = useCallback(() => {
    if (isDrawing) {
      saveCanvasState();
    }
    setIsDrawing(false);
  }, [isDrawing, saveCanvasState]);

  /**
   * updateCanvasFromHistory: Restores canvas to a previous state
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

  /**
   * undo: Reverts to previous state and broadcasts change
   */
  const undo = useCallback(() => {
    if (history.length === 0) return;

    const newHistory = history.slice(0, -1);
    setHistory(newHistory);
    updateCanvasFromHistory(newHistory);

    const base64History = newHistory.map(imageDataToBase64);
    syncManager?.broadcastUndo(base64History);
  }, [history, updateCanvasFromHistory, syncManager]);

  /**
   * clearCanvas: Resets canvas to blank state
   */
  const clearCanvas = useCallback(() => {
    executeCanvasOperation({
      execute: (ctx) => {
        const canvas = canvasRef.current!;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setHistory([]);
      },
    });
  }, [canvasRef, executeCanvasOperation]);

  /**
   * clear: Broadcasts clear action to all users
   */
  const clear = useCallback(() => {
    clearCanvas();
    syncManager?.broadcastClear();
  }, [clearCanvas, syncManager]);

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

  // Clear canvas when clearCount changes
  useEffect(() => {
    clear();
  }, [clear, clearCount]);

  // Handle remote events
  useEffect(() => {
    if (!syncManager) return;

    const unsubscribe = syncManager.subscribe({
      onDraw: (drawingData) => handleDrawOperation(drawingData, true),
      onUndo: async (base64History) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const newHistory: ImageData[] = [];
        for (const base64 of base64History) {
          try {
            const imageData = await base64ToImageData(base64, canvas);
            newHistory.push(imageData);
          } catch (error) {
            console.error("Failed to convert history state:", error);
          }
        }

        setHistory(newHistory);
        updateCanvasFromHistory(newHistory);
      },
      onClear: clearCanvas,
    });

    return () => {
      unsubscribe();
    };
  }, [
    syncManager,
    handleDrawOperation,
    clearCanvas,
    updateCanvasFromHistory,
    canvasRef,
  ]);

  // Return memoized interface
  return useMemo(
    () => ({
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
    }),
    [
      drawingSettings.size,
      drawingSettings.isErasing,
      isDrawing,
      history,
      clear,
      draw,
      saveCanvasState,
      setIsDrawing,
      startDrawing,
      stopDrawing,
      undo,
    ]
  );
}
