"use client";

import { isDrawerAtom, showDrawingToolsAtom } from "@/atoms";
import { Section } from "@/components/ui/Section";
import { useCanvas } from "@/hooks/useCanvas";
import { DrawingSettings } from "@/types";
import { useAtomValue } from "jotai";
import { useRef } from "react";
import Canvas from "../Canvas";
import { DrawingToolbar } from "../DrawingToolbar";

export default function Whiteboard() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawer = useAtomValue(isDrawerAtom);
  const showDrawingTools = useAtomValue(showDrawingToolsAtom);

  const {
    currentSize,
    isErasing,
    history,
    draw,
    setColor,
    setCurrentSize,
    setIsErasing,
    startDrawing,
    stopDrawing,
    clear,
    undo,
  } = useCanvas(canvasRef);

  const handleToolChange = ({
    color,
    isErasing: newIsErasing,
    size,
  }: DrawingSettings) => {
    setColor(color);
    setCurrentSize(size);
    setIsErasing(newIsErasing);
  };

  const _onStartDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDrawer) startDrawing(e);
  };
  const _onStopDrawing = () => {
    if (isDrawer) stopDrawing();
  };

  return (
    <>
      {showDrawingTools && (
        <Section
          as="header"
          className="flex items-center gap-2 [grid-area:header]"
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
