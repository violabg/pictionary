import { GameState, Player } from "@/types";
import { atom } from "jotai";

export const playersAtom = atom<Player[]>([]);
export const currentPlayerAtom = atom<Player>();
export const DEFAULT_ROUND_DURATION = 120;
// Initial State
export const getInitialState = (roundDuration: number): GameState => ({
  currentDrawer: null,
  nextDrawer: null,
  isGameActive: false,
  isPaused: false,
  playedRounds: 0,
  isGameOver: false,
  currentRoundDuration: roundDuration,
  timeLeft: roundDuration,
});

export const gameStateAtom = atom<GameState>(
  getInitialState(DEFAULT_ROUND_DURATION)
);

export const isDrawerAtom = atom((get) => {
  const gameState = get(gameStateAtom);
  const currentPlayer = get(currentPlayerAtom);
  return !currentPlayer
    ? false
    : gameState.currentDrawer?.id === currentPlayer?.id;
});

export const isNextDrawerAtom = atom((get) => {
  const gameState = get(gameStateAtom);
  const currentPlayer = get(currentPlayerAtom);
  return !currentPlayer
    ? false
    : gameState.nextDrawer?.id === currentPlayer?.id;
});

export const clearCanvasAtom = atom<number>(0);
