import { gameMachine } from "@/machines/gameMachine";
import { useMachine } from "@xstate/react";

const gameId = "spindox";

/**
 * Custom hook for managing the Pictionary game state
 * Handles real-time game state updates, player management, and game flow
 */
export function useGameState() {
  const [state, send] = useMachine(gameMachine);
  const { gameState, players, topics, isLoading } = state.context;

  const topic = topics.find((t) => t.id === gameState.currentTopic);

  return {
    currentPlayer: state.context.currentPlayer,
    isLoading:
      state.matches("loading") || Object.values(isLoading).some(Boolean),
    gameState,
    players,
    topic,
    topics,
    endDrawing: (timeLeft: number) => send({ type: "END_DRAWING", timeLeft }),
    handleWinnerSelection: (winnerId: string) =>
      send({ type: "SELECT_WINNER", winnerId }),
    newGame: () => send({ type: "NEW_GAME" }),
    setTimer: (seconds: number) => send({ type: "SET_TIMER", seconds }),
    startGame: () => send({ type: "START_GAME" }),
    startDrawing: () => send({ type: "START_DRAWING" }),
  };
}
