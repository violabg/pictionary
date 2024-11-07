export type Player = {
  id: string;
  name: string;
  score: number;
  hasPlayed?: boolean;
};

export type GameState = {
  players: Player[];
  currentDrawer: Player | null;
  nextDrawer: Player | null;
  isGameActive: boolean;
  isPaused: boolean;
  playedRounds: number;
  isGameOver: boolean;
  currentRoundDuration: number;
};
