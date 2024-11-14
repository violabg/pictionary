import { GameState, Player } from "@/types";
import { atom } from "jotai";

export const playersAtom = atom<Player[]>([]);
export const currentPlayerAtom = atom<Player>();
export const DEFAULT_ROUND_DURATION = 150;
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

export const loadingAtom = atom<{
  players: boolean;
  game: boolean;
  topics: boolean;
}>({
  players: true,
  game: true,
  topics: true,
});

export const isLoadingAtom = atom((get) => {
  const loading = get(loadingAtom);
  return loading.players || loading.game || loading.topics;
});
