import { useSocket } from "@/contexts/SocketContext";
import { DrawingData } from "@/types/drawing";
import { normalizeCoordinates } from "@/utils/canvas";
import { useCallback, useState } from "react";

export function useCanvas(canvasRef: React.RefObject<HTMLCanvasElement>) {
  const { socket } = useSocket();
  const [isDrawing, setIsDrawing] = useState(false);
  const [isErasing, setIsErasing] = useState(false);
  const [currentSize, setCurrentSize] = useState(2);
  const [history, setHistory] = useState<ImageData[]>([]);

  const handleDrawOperation = useCallback(
    (drawingData: DrawingData, isRemoteEvent = false) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      let x = drawingData.x;
      let y = drawingData.y;
      let lineWidth = drawingData.lineSize;

      // Only normalize coordinates for remote events
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

      // Emit the drawing data to other clients if this is a local event
      if (!isRemoteEvent) {
        socket?.emit("draw-line", {
          ...drawingData,
          sourceWidth: canvas.width,
          sourceHeight: canvas.height,
        });
      }
    },
    [canvasRef, socket]
  );

  const saveCanvasState = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setHistory((prev) => [...prev, imageData]);
  }, [canvasRef]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    handleDrawOperation({
      x,
      y,
      isDrawing: false,
      isErasing,
      lineSize: currentSize, // Simplified
      sourceWidth: canvas.width,
      sourceHeight: canvas.height,
    });

    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    handleDrawOperation({
      x,
      y,
      isDrawing: true,
      isErasing,
      lineSize: currentSize,
      sourceWidth: canvas.width,
      sourceHeight: canvas.height,
    });
  };

  const stopDrawing = () => {
    if (isDrawing) {
      saveCanvasState();
    }
    setIsDrawing(false);
  };

  return {
    currentSize,
    isDrawing,
    isErasing,
    history,
    draw,
    handleDrawOperation,
    saveCanvasState,
    setCurrentSize,
    setIsDrawing,
    setIsErasing,
    setHistory,
    startDrawing,
    stopDrawing,
  };
}
