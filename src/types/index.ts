export type DrawingData = {
  x: number;
  y: number;
  color: string;
  isDrawing: boolean;
  isErasing: boolean;
  lineSize: number;
  sourceWidth: number;
  sourceHeight: number;
};

export type DrawingSettings = {
  color: string;
  isErasing: boolean;
  size: number;
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

export type GameStatus =
  | "idle"
  | "drawing"
  | "waitingForWinner"
  | "showTopic"
  | "over";

export type GameStateRemote = {
  id?: string;
  currentDrawer: string | null;
  nextDrawer: string | null;
  status: GameStatus;
  playedRounds: number;
  currentRoundDuration: number;
  timeLeft: number;
  currentTopic: string | null;
  pastTopics: string[];
};

export type GameState = {
  id?: string;
  currentDrawer?: Player | null;
  nextDrawer?: Player | null;
  status: GameStatus;
  playedRounds: number;
  currentRoundDuration: number;
  timeLeft: number;
  currentTopic: string | null;
  pastTopics: string[];
};

export interface CurrentPlayer {
  id: string;
  name: string;
}

export type Topic = {
  id: string;
  title: string;
  description: string;
};
