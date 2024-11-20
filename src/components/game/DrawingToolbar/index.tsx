"use client";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Eraser, Pencil, Trash, Undo } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { SizeSlider } from "./SizeSlider";

type Tools = "pen" | "eraser";

type Props = {
  canUndo: boolean;
  isDrawer: boolean;
  onUndo: () => void;
  onClear: () => void;
  onToolChange: (config: {
    isErasing: boolean;
    size: number;
    color: string;
  }) => void;
};

export function DrawingToolbar({
  canUndo,
  isDrawer,
  onUndo,
  onClear,
  onToolChange,
}: Props) {
  const [selectedTool, setSelectedTool] = useState<Tools>("pen");
  const [penColor, setPenColor] = useState("#000000");
  const [penSize, setPenSize] = useState(2);
  const [eraserSize, setEraserSize] = useState(30);

  const handleToolChange = useCallback(
    (tool: Tools) => {
      const isErasing = tool === "eraser";
      setSelectedTool(tool);
      onToolChange({
        isErasing,
        size: isErasing ? eraserSize : penSize,
        color: penColor,
      });
    },
    [eraserSize, penSize, penColor, onToolChange]
  );

  const handleSizeChange = useCallback(
    (size: number) => {
      const isErasing = selectedTool === "eraser";
      if (isErasing) {
        setEraserSize(size);
      } else {
        setPenSize(size);
      }
      onToolChange({ isErasing, size, color: penColor });
    },
    [selectedTool, penColor, onToolChange]
  );

  const handleColorChange = useCallback(
    (color: string) => {
      setPenColor(color);
      if (selectedTool === "pen") {
        onToolChange({
          isErasing: false,
          size: penSize,
          color,
        });
      }
    },
    [selectedTool, penSize, onToolChange]
  );

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
          handleToolChange("pen");
        } else if (e.key === "e") {
          handleToolChange("eraser");
        } else if (e.key === "c") {
          onClear();
        }
      }
    };
    if (isDrawer) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isDrawer, handleToolChange, onClear, onUndo]);

  return (
    <>
      <div className="flex flex-1 items-center gap-1">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={selectedTool === "pen" ? "outline" : "ghost"}
              onClick={() => handleToolChange("pen")}
              className="p-0 w-10 h-10"
              title="Pen tool (P)"
            >
              <Pencil className="w-4 h-4" />
              <span className="sr-only">Pen tool</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64">
            <div className="space-y-2">
              <label
                htmlFor="penColor"
                className="block font-medium text-sm white"
              >
                Pen Color
              </label>
              <input
                type="color"
                id="penColor"
                value={penColor}
                onChange={(e) => handleColorChange(e.target.value)}
                className="block w-full"
              />
              <label
                htmlFor="penSize"
                className="block font-medium text-sm white"
              >
                Pen Size: {penSize}px
              </label>
              <SizeSlider
                min={1}
                max={50}
                value={penSize}
                onChange={handleSizeChange}
              />
            </div>
          </PopoverContent>
        </Popover>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={selectedTool === "eraser" ? "outline" : "ghost"}
              onClick={() => handleToolChange("eraser")}
              className="p-0 w-10 h-10"
              title="Eraser (E)"
            >
              <Eraser className="w-4 h-4" />
              <span className="sr-only">Eraser tool</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64">
            <div className="space-y-2">
              <label
                htmlFor="eraserSize"
                className="block font-medium text-sm text-white"
              >
                Eraser Size: {eraserSize}px
              </label>
              <SizeSlider
                min={1}
                max={100}
                value={eraserSize}
                onChange={handleSizeChange}
              />
            </div>
          </PopoverContent>
        </Popover>
      </div>
      <Button
        variant="ghost"
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
    </>
  );
}
