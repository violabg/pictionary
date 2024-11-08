import { useSupabase } from "@/contexts/SupabaseContext";
import { supabase } from "@/lib/supabaseClient";
import { useEffect, useMemo, useReducer } from "react";
import { GameState, Player } from "../types";

// Constants
const DEFAULT_ROUND_DURATION = 120;
const POINTS_MULTIPLIER = 20;
const MIN_PLAYERS = 2;

// Action Types
type GameAction =
  | { type: "ADD_PLAYER"; payload: string }
  | { type: "START_ROUND" }
  | { type: "TIME_UP"; payload: number }
  | { type: "SET_TIMER"; payload: number }
  | { type: "SET_TIME_LEFT"; payload: number }
  | { type: "NEW_GAME" }
  | { type: "UPDATE_GAME_STATE"; payload: GameState };

// Initial State
const getInitialState = (roundDuration: number): GameState => ({
  players: [],
  currentDrawer: null,
  nextDrawer: null,
  isGameActive: false,
  isPaused: false,
  playedRounds: 0,
  isGameOver: false,
  currentRoundDuration: roundDuration,
  timeLeft: roundDuration,
});

// Helper Functions
const selectNextDrawer = (players: Player[], currentDrawerId?: string) => {
  const availablePlayers = players.filter(
    (p) => !p.hasPlayed && p.id !== currentDrawerId
  );
  return availablePlayers[Math.floor(Math.random() * availablePlayers.length)];
};

const calculateScore = (timeLeft: number, roundDuration: number) =>
  Math.round((timeLeft / roundDuration) * POINTS_MULTIPLIER);

// Reducer
const gameReducer = (state: GameState, action: GameAction): GameState => {
  switch (action.type) {
    case "ADD_PLAYER":
      const newPlayer: Player = {
        id: Date.now().toString(),
        name: action.payload,
        score: 0,
        hasPlayed: false,
      };
      return { ...state, players: [...state.players, newPlayer] };

    case "START_ROUND":
      if (state.players.length < MIN_PLAYERS) {
        alert(`Need at least ${MIN_PLAYERS} players to start!`);
        return state;
      }
      const drawer = state.nextDrawer || state.players[0];
      return {
        ...state,
        currentDrawer: drawer,
        nextDrawer: null,
        isGameActive: true,
        isPaused: false,
        timeLeft: state.currentRoundDuration,
      };

    case "TIME_UP": {
      const newState = { ...state };
      if (state.currentDrawer) {
        const points = calculateScore(
          action.payload,
          state.currentRoundDuration
        );
        newState.players = state.players.map((player) =>
          player.id === state.currentDrawer?.id
            ? { ...player, score: player.score + points, hasPlayed: true }
            : player
        );
      }

      if (state.players.length >= MIN_PLAYERS) {
        const newPlayedRounds = state.playedRounds + 1;
        const totalRounds = state.players.length;

        if (newPlayedRounds >= totalRounds) {
          return {
            ...newState,
            isGameOver: true,
            isGameActive: false,
          };
        }

        const next = selectNextDrawer(state.players, state.currentDrawer?.id);
        return {
          ...newState,
          playedRounds: newPlayedRounds,
          nextDrawer: next,
          isPaused: true,
        };
      }

      return {
        ...newState,
        isGameActive: false,
        currentDrawer: null,
      };
    }

    case "SET_TIMER":
      return { ...state, currentRoundDuration: action.payload };

    case "SET_TIME_LEFT":
      return { ...state, timeLeft: action.payload };

    case "NEW_GAME":
      return {
        ...getInitialState(state.currentRoundDuration),
        players: state.players.map((p) => ({
          ...p,
          score: 0,
          hasPlayed: false,
        })),
      };

    case "UPDATE_GAME_STATE":
      return JSON.stringify(state) === JSON.stringify(action.payload)
        ? state
        : action.payload;

    default:
      return state;
  }
};

export function useGameState(roundDuration = DEFAULT_ROUND_DURATION) {
  const { channel } = useSupabase();
  const [gameState, dispatch] = useReducer(
    gameReducer,
    getInitialState(roundDuration)
  );

  const actions = useMemo(
    () => ({
      addPlayer: (name: string) =>
        dispatch({ type: "ADD_PLAYER", payload: name }),

      startRound: () => dispatch({ type: "START_ROUND" }),

      handleTimeUp: (timeLeft: number) =>
        dispatch({ type: "TIME_UP", payload: timeLeft }),

      setTimeLeft: (seconds: number) =>
        dispatch({ type: "SET_TIME_LEFT", payload: seconds }),

      setTimer: (seconds: number) =>
        dispatch({ type: "SET_TIMER", payload: seconds }),

      newGame: () => dispatch({ type: "NEW_GAME" }),

      updateGameState: (newGameState: GameState) =>
        dispatch({ type: "UPDATE_GAME_STATE", payload: newGameState }),
    }),
    [dispatch]
  );

  useEffect(() => {
    channel?.send({
      type: "broadcast",
      event: "game-state-update",
      payload: gameState,
    });
  }, [channel, gameState]);

  useEffect(() => {
    const updateGameStateInDB = async () => {
      if (!gameState.id) {
        const { data, error } = await supabase
          .from("games")
          .insert([gameState])
          .select()
          .single();

        if (!error && data) {
          dispatch({
            type: "UPDATE_GAME_STATE",
            payload: { ...gameState, id: data.id },
          });
        }
      } else {
        await supabase.from("games").update(gameState).eq("id", gameState.id);
      }
    };

    updateGameStateInDB();
  }, [gameState]);

  useEffect(() => {
    const channel = supabase
      .channel("drawing_room")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "games" },
        (payload) => {
          if (payload.new.id === gameState.id) {
            dispatch({
              type: "UPDATE_GAME_STATE",
              payload: payload.new,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameState.id]);

  return { gameState, actions };
}
