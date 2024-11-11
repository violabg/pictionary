import {
  currentPlayerAtom,
  DEFAULT_ROUND_DURATION,
  gameStateAtom,
  getInitialState,
  playersAtom,
} from "@/atoms";
import { supabase } from "@/lib/supabaseClient";
import { useAtom, useAtomValue } from "jotai";
import { useCallback, useEffect, useState } from "react";
import { GameState, Player } from "../types";

// Constants

const POINTS_MULTIPLIER = 20;
const MIN_PLAYERS = 2;

/** Types for game actions and their corresponding payloads */
export type GameActions = {
  startRound: () => void;
  handleTimeUp: (timeLeft: number) => void;
  setTimeLeft: (seconds: number) => void;
  setTimer: (seconds: number) => void;
  newGame: () => void;
  updateGameState: (newGameState: GameState) => void;
};

// Helper Functions
const selectNextDrawer = (
  players: Player[],
  currentDrawerId: string | null
) => {
  const availablePlayers = players.filter(
    (p) => !p.hasPlayed && p.id !== currentDrawerId
  );
  return availablePlayers[Math.floor(Math.random() * availablePlayers.length)];
};

const calculateScore = (timeLeft: number, roundDuration: number) =>
  Math.round((timeLeft / roundDuration) * POINTS_MULTIPLIER);

const gameId = "spindox";

export function useGameState() {
  const [gameState, setGameState] = useAtom(gameStateAtom);
  const players = useAtomValue(playersAtom);
  const currentPlayer = useAtomValue(currentPlayerAtom);
  const [isLoading, setIsLoading] = useState(true);

  const updateGameState = useCallback(async (newState: GameState) => {
    // setGameState(newState);
    const { id, ...state } = newState;
    await supabase.from("game_states").update(state).eq("room_id", gameId);
  }, []);

  const startRound = () => {
    if (players.length < MIN_PLAYERS) {
      alert(`Need at least ${MIN_PLAYERS} players to start!`);
      return gameState;
    }
    const drawer = gameState?.nextDrawer || players[0].id;
    const newState = {
      ...gameState,
      currentDrawer: drawer,
      nextDrawer: null,
      isGameActive: true,
      isPaused: false,
      timeLeft: gameState?.currentRoundDuration,
    };
    updateGameState(newState);
    return newState;
  };

  const handleTimeUp = (timeLeft: number) => {
    if (!gameState) return;

    if (gameState?.currentDrawer) {
      const points = calculateScore(timeLeft, gameState.currentRoundDuration);

      const newPlayer = players.find(
        (player) => player.id === gameState.currentDrawer
      );

      if (newPlayer) {
        supabase
          .from("players")
          .update({ score: newPlayer.score + points, hasPlayed: true })
          .eq("id", newPlayer.id);
      }
    }

    if (players.length >= MIN_PLAYERS) {
      const newPlayedRounds = gameState.playedRounds + 1;
      const totalRounds = players.length;

      if (newPlayedRounds >= totalRounds) {
        updateGameState({
          ...gameState,
          isGameOver: true,
          isGameActive: false,
        });
        return;
      }

      const next = selectNextDrawer(players, gameState.currentDrawer);
      updateGameState({
        ...gameState,
        playedRounds: newPlayedRounds,
        nextDrawer: next.id,
        isPaused: true,
      });
      return;
    }

    updateGameState({
      ...gameState,
      isGameActive: false,
      currentDrawer: null,
    });
  };

  const setTimeLeft = (seconds: number) => {
    updateGameState({ ...gameState, timeLeft: seconds });
  };

  const setTimer = (seconds: number) => {
    updateGameState({
      ...gameState,
      currentRoundDuration: seconds,
    });
  };

  const newGame = () => {
    updateGameState(getInitialState(gameState.currentRoundDuration));
  };

  useEffect(() => {
    const getGameState = async () => {
      const { data } = await supabase
        .from("game_states")
        .select("*")
        .eq("room_id", gameId)
        .single();

      if (!data) {
        // Create new game state if it doesn't exist
        const initialState = getInitialState(DEFAULT_ROUND_DURATION);
        const { data: newGameState } = await supabase
          .from("game_states")
          .insert([{ room_id: gameId, ...initialState }])
          .select()
          .single();

        setGameState(newGameState);
        setIsLoading(false);
      } else {
        await updateGameState(getInitialState(DEFAULT_ROUND_DURATION));
        setIsLoading(false);
      }
    };

    if (isLoading) {
      getGameState();
    }

    // Real-time subscription
    const gameSubscription = supabase
      .channel("game_states")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "game_states",
          filter: `room_id=eq.${gameId}`,
        },
        (payload) => {
          const game = payload.new as GameState;
          if (
            payload.eventType === "INSERT" ||
            payload.eventType === "UPDATE"
          ) {
            setGameState(game);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(gameSubscription);
    };
  }, [isLoading, setGameState, updateGameState]);

  return {
    currentPlayer,
    isLoading,
    gameState,
    players,
    startRound,
    handleTimeUp,
    setTimeLeft,
    setTimer,
    newGame,
  };
}
