"use client";

import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Eraser, Pen, Trash, Undo } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type SizeSliderProps = {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
};

function SizeSlider({ value, min, max, onChange }: SizeSliderProps) {
  return (
    <Slider
      className="w-20"
      value={[value]}
      min={min}
      max={max}
      step={1}
      onValueChange={(values) => onChange(values[0])}
    />
  );
}

type DrawingToolbarProps = {
  canUndo: boolean;
  onUndo: () => void;
  onClear: () => void;
  onToolChange: (config: { isErasing: boolean; size: number }) => void;
};

export function DrawingToolbar({
  canUndo,
  onUndo,
  onClear,
  onToolChange,
}: DrawingToolbarProps) {
  const [isErasing, setIsErasing] = useState(false);
  const [lineSize, setLineSize] = useState(2);
  const [eraserSize, setEraserSize] = useState(30);

  const handleToolChange = useCallback(
    (newIsErasing: boolean) => {
      setIsErasing(newIsErasing);
      onToolChange({
        isErasing: newIsErasing,
        size: newIsErasing ? eraserSize : lineSize,
      });
    },
    [eraserSize, lineSize, onToolChange]
  );

  const handleSizeChange = (size: number) => {
    if (isErasing) {
      setEraserSize(size);
    } else {
      setLineSize(size);
    }
    onToolChange({ isErasing, size });
  };

  // Add useEffect for keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Handle undo with modifier keys
      if ((e.metaKey || e.ctrlKey) && e.key === "z") {
        e.preventDefault();
        onUndo();
        return;
      }

      // Only handle other shortcuts if no modifier keys are pressed
      if (!e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey) {
        if (e.key === "p") {
          handleToolChange(false);
        } else if (e.key === "e") {
          handleToolChange(true);
        } else if (e.key === "c") {
          onClear();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleToolChange, onClear, onUndo]);

  return (
    <header className="flex items-center gap-2 col-span-2 bg-black/20 p-2 rounded-md">
      <div className="flex flex-1 items-center gap-4">
        <Button
          variant={!isErasing ? undefined : "outline"}
          className={`transition-colors`}
          onClick={() => handleToolChange(false)}
          size={"icon"}
          title="Pen tool (P)"
        >
          <Pen />
        </Button>
        <span>{`${lineSize}px`}</span>
        {!isErasing && (
          <SizeSlider
            value={lineSize}
            min={1}
            max={30}
            onChange={handleSizeChange}
          />
        )}
        <Button
          variant={isErasing ? undefined : "outline"}
          className={`transition-colors`}
          onClick={() => handleToolChange(true)}
          size={"icon"}
          title="Eraser (E)"
        >
          <Eraser />
        </Button>
        <span>{`${eraserSize}px`}</span>
        {isErasing && (
          <SizeSlider
            value={eraserSize}
            min={1}
            max={100}
            onChange={handleSizeChange}
          />
        )}
      </div>
      <Button
        variant="outline"
        className="transition-colors"
        onClick={onUndo}
        size="icon"
        disabled={!canUndo}
        title="Undo (Ctrl+Z)"
      >
        <Undo />
      </Button>
      <Button variant="destructive" onClick={onClear}>
        <Trash />
        <span>Clear</span>
      </Button>
    </header>
  );
}
