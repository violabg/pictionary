import { useSocket } from "@/contexts/SocketContext";
import { GameState, Player } from "@/types/game";
import { useCallback, useEffect, useState } from "react";

const DEFAULT_ROUND_DURATION = 120;
const POINTS_MULTIPLIER = 20;

const getInitialState = (roundDuration: number): GameState => ({
  players: [
    { id: "1", name: "Player 1", score: 0, hasPlayed: false },
    { id: "2", name: "Player 2", score: 0, hasPlayed: false },
  ],
  currentDrawer: null,
  nextDrawer: null,
  isGameActive: false,
  isPaused: false,
  playedRounds: 0,
  isGameOver: false,
  currentRoundDuration: roundDuration,
});

export function useGameState(roundDuration = DEFAULT_ROUND_DURATION) {
  const { socket } = useSocket();
  const [gameState, setGameState] = useState<GameState>(
    getInitialState(roundDuration)
  );

  const addPlayer = useCallback((name: string) => {
    const newPlayer: Player = {
      id: Date.now().toString(),
      name,
      score: 0,
      hasPlayed: false,
    };
    setGameState((prev) => ({
      ...prev,
      players: [...prev.players, newPlayer],
    }));
  }, []);

  const selectNextDrawer = useCallback(
    (currentDrawerId?: string) => {
      const availablePlayers = gameState.players.filter(
        (p) => !p.hasPlayed && p.id !== currentDrawerId
      );
      return availablePlayers[
        Math.floor(Math.random() * availablePlayers.length)
      ];
    },
    [gameState.players]
  );

  const startRound = useCallback(() => {
    if (gameState.players.length < 2) {
      alert("Need at least 2 players to start!");
      return;
    }

    const drawer = gameState.nextDrawer || gameState.players[0];

    setGameState((prev) => ({
      ...prev,
      currentDrawer: drawer,
      nextDrawer: null,
      isGameActive: true,
      isPaused: false,
      timeLeft: prev.currentRoundDuration,
    }));
  }, [gameState.nextDrawer, gameState.players]);

  const calculateScore = useCallback(
    (timeLeft: number) => {
      return Math.round(
        (timeLeft / gameState.currentRoundDuration) * POINTS_MULTIPLIER
      );
    },
    [gameState.currentRoundDuration]
  );

  const handleTimeUp = useCallback(
    (timeLeft: number) => {
      setGameState((prev) => {
        const newState = { ...prev };
        if (prev.currentDrawer) {
          const points = calculateScore(timeLeft);
          newState.players = prev.players.map((player) =>
            player.id === prev.currentDrawer?.id
              ? { ...player, score: player.score + points, hasPlayed: true }
              : player
          );
        }

        if (prev.players.length >= 2) {
          const newPlayedRounds = prev.playedRounds + 1;
          const totalRounds = prev.players.length;

          if (newPlayedRounds >= totalRounds) {
            newState.isGameOver = true;
            newState.isGameActive = false;
            return newState;
          }

          // Select next drawer specifically excluding current drawer
          const next = selectNextDrawer(prev.currentDrawer?.id);
          newState.playedRounds = newPlayedRounds;
          newState.nextDrawer = next;
          newState.isPaused = true;
        } else {
          newState.isGameActive = false;
          newState.currentDrawer = null;
        }

        return newState;
      });
    },
    [calculateScore, selectNextDrawer]
  );

  const setTimer = useCallback((seconds: number) => {
    setGameState((prev) => ({
      ...prev,
      currentRoundDuration: seconds,
    }));
  }, []);

  const setTimeLeft = useCallback((seconds: number) => {
    setGameState((prev) => ({
      ...prev,
      timeLeft: seconds,
    }));
  }, []);

  const newGame = useCallback(() => {
    setGameState((prev) => ({
      ...getInitialState(prev.currentRoundDuration),
      players: prev.players.map((p) => ({ ...p, score: 0, hasPlayed: false })),
    }));
  }, []);

  const updateGameState = useCallback((newGameState: GameState) => {
    setGameState((prev) => {
      if (JSON.stringify(prev) === JSON.stringify(newGameState)) {
        return prev;
      }
      return newGameState;
    });
  }, []);
  // Emit game state updates when drawing enabled state changes
  useEffect(() => {
    socket?.emit("game-state-update", gameState);
  }, [socket, gameState]);

  return {
    gameState,
    actions: {
      addPlayer,
      startRound,
      handleTimeUp,
      setTimeLeft,
      setTimer,
      newGame,
      updateGameState,
    },
  };
}
