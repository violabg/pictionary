import {
  clearCanvasAtom,
  currentPlayerAtom,
  DEFAULT_ROUND_DURATION,
  gameStateAtom,
  getInitialState,
  playersAtom,
} from "@/atoms";
import { supabase } from "@/lib/supabaseClient";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useCallback, useEffect, useState } from "react";
import { GameState, GameStateRemote, Player, Topic } from "../types";
import { getPlayerById } from "./../lib/playerService";

// Constants

const POINTS_MULTIPLIER = 20;
const MIN_PLAYERS = 2;
const GUESS_POINTS = 5;

/** Types for game actions and their corresponding payloads */
export type GameActions = {
  startRound: () => void;
  handleTimeUp: (timeLeft: number) => void;
  setTimeLeft: (seconds: number) => void;
  setTimer: (seconds: number) => void;
  newGame: () => void;
  updateGameState: (newGameState: GameState) => void;
  handleWinnerSelection: (winnerId: string) => Promise<void>;
};

// Helper Functions
const selectNextDrawer = (
  players: Player[],
  currentDrawerId?: string | null
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
  const setClearCanvas = useSetAtom(clearCanvasAtom);
  const [topic, setTopic] = useState<Topic>();
  const [topics, setTopics] = useState<Topic[]>([]);

  const updateGameState = useCallback(async (newState: GameState) => {
    const { id, ...rest } = newState;
    const state: GameStateRemote = {
      ...rest,
      currentDrawer: newState.currentDrawer?.id ?? null,
      nextDrawer: newState.nextDrawer?.id ?? null,
    };

    await supabase.from("games").update(state).eq("room_id", gameId);
  }, []);

  const fetchTopics = useCallback(async () => {
    const { data } = await supabase.from("topics").select("*");
    if (data) {
      setTopics(data);
    }
  }, []);

  const startRound = () => {
    if (players.length < MIN_PLAYERS) {
      alert(`Need at least ${MIN_PLAYERS} players to start!`);
      return gameState;
    }

    // Select a random topic that hasn't been used yet
    const availableTopics = topics.filter(
      (topic) => !gameState.pastTopics.includes(topic.id)
    );
    const randomTopic =
      availableTopics[Math.floor(Math.random() * availableTopics.length)];

    const drawer = gameState?.nextDrawer || currentPlayer;
    const newState = {
      ...gameState,
      currentDrawer: drawer,
      nextDrawer: null,
      currentTopic: randomTopic?.id,
      pastTopics: [...gameState.pastTopics, randomTopic?.id].filter(
        Boolean
      ) as string[],
      isGameActive: true,
      isPaused: false,
      timeLeft: gameState?.currentRoundDuration,
    };
    setClearCanvas((prev) => prev + 1);
    updateGameState(newState);
    return newState;
  };

  const handleTimeUp = async (timeLeft: number) => {
    if (gameState?.currentDrawer) {
      const points = calculateScore(timeLeft, gameState.currentRoundDuration);
      const newPlayer = getPlayerById(players, gameState.currentDrawer.id);
      if (newPlayer) {
        await supabase
          .from("players")
          .update({ score: newPlayer.score + points, hasPlayed: true })
          .eq("id", newPlayer.id);
      }
    }
    const next = selectNextDrawer(players, gameState.currentDrawer?.id);
    updateGameState({
      ...gameState,
      isPaused: true,
      nextDrawer: next,
    });
  };

  const handleWinnerSelection = async (winnerId: string) => {
    const winner = getPlayerById(players, winnerId);
    console.log("winner :>> ", winner);
    if (winner) {
      await supabase
        .from("players")
        .update({ score: winner.score + GUESS_POINTS })
        .eq("id", winner.id);
    }

    if (players.length >= MIN_PLAYERS) {
      const newPlayedRounds = gameState.playedRounds + 1;
      const totalRounds = players.length;

      // check if the game is over
      if (newPlayedRounds >= totalRounds) {
        updateGameState({
          ...gameState,
          isGameOver: true,
          isGameActive: false,
        });
        return;
      }

      updateGameState({
        ...gameState,
        playedRounds: newPlayedRounds,
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
        .from("games")
        .select("*")
        .eq("room_id", gameId)
        .single();

      if (!data) {
        // Create new game state if it doesn't exist
        const initialState = getInitialState(DEFAULT_ROUND_DURATION);
        const { data: newGameState } = await supabase
          .from("games")
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
      .channel("games")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "games",
          filter: `room_id=eq.${gameId}`,
        },
        (payload) => {
          const game = payload.new as GameStateRemote;
          if (
            payload.eventType === "INSERT" ||
            payload.eventType === "UPDATE"
          ) {
            const {
              currentDrawer: _currentDrawer,
              nextDrawer: _nextDrawer,
              ...rest
            } = game;
            const nextDrawer = getPlayerById(players, _nextDrawer ?? "");
            const currentDrawer = getPlayerById(players, _currentDrawer ?? "");
            setGameState({
              ...rest,
              currentDrawer,
              nextDrawer,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(gameSubscription);
    };
  }, [isLoading, players, setGameState, updateGameState]);

  useEffect(() => {
    fetchTopics();
  }, [fetchTopics]);

  useEffect(() => {
    if (gameState.currentTopic) {
      const topic = topics.find((topic) => topic.id === gameState.currentTopic);
      setTopic(topic);
    }
  }, [gameState.currentTopic, topics]);

  return {
    currentPlayer,
    isLoading,
    gameState,
    players,
    topic,
    topics,
    handleTimeUp,
    handleWinnerSelection,
    newGame,
    setTimeLeft,
    setTimer,
    startRound,
  };
}
