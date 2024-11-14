"use client";

import { isDrawerAtom } from "@/atoms";
import { Section } from "@/components/ui/Section";
import { useCanvas } from "@/hooks/useCanvas";
import { useAtomValue } from "jotai";
import { useRef } from "react";
import Canvas from "../Canvas";
import { DrawingToolbar } from "../DrawingToolbar";

export default function Whiteboard() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawer = useAtomValue(isDrawerAtom);

  const {
    currentSize,
    isErasing,
    history,
    draw,
    setCurrentSize,
    setIsErasing,
    startDrawing,
    stopDrawing,
    clear,
    undo,
  } = useCanvas(canvasRef);

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

  const _onStartDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDrawer) startDrawing(e);
  };
  const _onStopDrawing = () => {
    if (isDrawer) stopDrawing();
  };

  return (
    <>
      {isDrawer && (
        <Section
          as="header"
          className="flex items-center gap-2 [grid-area:header] col-span-2"
        >
          <DrawingToolbar
            canUndo={history.length > 1}
            isDrawer={isDrawer}
            onUndo={undo}
            onClear={clear}
            onToolChange={handleToolChange}
          />
        </Section>
      )}
      <Section as="main" className="relative [grid-area:content]">
        <Canvas
          canvasRef={canvasRef}
          isErasing={isErasing}
          currentSize={currentSize}
          onDraw={draw}
          onStartDrawing={_onStartDrawing}
          onStopDrawing={_onStopDrawing}
        />
      </Section>
    </>
  );
}
