export type DrawingData = {
  x: number;
  y: number;
  isDrawing: boolean;
  isErasing: boolean;
  lineSize: number;
  sourceWidth: number;
  sourceHeight: number;
};

export type DrawingTools = {
  isErasing: boolean;
  size: number;
};

export type DrawingSettings = {
  size: number;
  isErasing: boolean;
};

export type CanvasOperation = {
  execute: (ctx: CanvasRenderingContext2D) => void;
};

export type Player = {
  id: string;
  name: string;
  score: number;
  hasPlayed?: boolean;
};

export type GameState = {
  id?: string; // Supabase record id
  currentDrawer: string | null;
  nextDrawer: string | null;
  isGameActive: boolean;
  isPaused: boolean;
  playedRounds: number;
  isGameOver: boolean;
  currentRoundDuration: number;
  timeLeft: number;
};

export interface CurrentPlayer {
  id: string;
  name: string;
}
