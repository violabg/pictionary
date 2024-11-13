import { GameState, Player } from "@/types";
import { atom } from "jotai";

export const playersAtom = atom<Player[]>([]);
export const currentPlayerAtom = atom<Player>();
export const DEFAULT_ROUND_DURATION = 120;
// Initial State
export const getInitialState = (roundDuration: number): GameState => ({
  status: "idle",
  currentDrawer: null,
  nextDrawer: null,
  playedRounds: 0,
  currentRoundDuration: roundDuration,
  timeLeft: roundDuration,
  currentTopic: null,
  pastTopics: [],
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
