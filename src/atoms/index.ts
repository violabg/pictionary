import { DEFAULT_ROUND_DURATION, getInitialState } from "@/lib/gameServices";
import { GameState, Player } from "@/types";
import { atom } from "jotai";

export const isLoadingAtom = atom(true);

export const playersAtom = atom<Player[]>([]);
export const currentPlayerAtom = atom<Player>();

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

export const showDrawingToolsAtom = atom((get) => {
  const gameState = get(gameStateAtom);
  const isDrawer = get(isDrawerAtom);
  return isDrawer && gameState.status === "drawing";
});

export const isNextDrawerAtom = atom((get) => {
  const gameState = get(gameStateAtom);
  const currentPlayer = get(currentPlayerAtom);
  return !currentPlayer
    ? false
    : gameState.nextDrawer?.id === currentPlayer?.id;
});

export const clearCanvasAtom = atom<number>(0);
