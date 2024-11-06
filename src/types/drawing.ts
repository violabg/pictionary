export interface DrawingData {
  x: number;
  y: number;
  isDrawing: boolean;
  isErasing: boolean;
  lineSize: number;
  sourceWidth: number;
  sourceHeight: number;
}

export interface DrawingTools {
  isErasing: boolean;
  size: number;
}
