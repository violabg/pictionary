import {
  clearCanvasAtom,
  currentPlayerAtom,
  DEFAULT_ROUND_DURATION,
  gameStateAtom,
  getInitialState,
  playersAtom,
} from "@/atoms";
import {
  calculateScore,
  getRandomTopic,
  GUESS_POINTS,
  MIN_PLAYERS,
  selectNextDrawer,
} from "@/lib/gameStateServices";
import { getPlayerById } from "@/lib/playerService";
import { supabase } from "@/lib/supabaseClient";
import { GameState, GameStateRemote, GameStatus, Topic } from "@/types";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useCallback, useEffect, useState } from "react";

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

  const startGame = async () => {
    if (players.length < MIN_PLAYERS) {
      alert(`Need at least ${MIN_PLAYERS} players to start!`);
      return gameState;
    }

    // Reset all players
    await supabase
      .from("players")
      .update({ score: 0, hasPlayed: false })
      .or("score.gt.0,hasPlayed.eq.true");

    const randomTopic = getRandomTopic(topics, gameState.pastTopics);

    const drawer = selectNextDrawer(players, gameState.currentDrawer?.id);
    const newState = {
      ...gameState,
      currentDrawer: drawer,
      nextDrawer: null,
      currentTopic: randomTopic?.id,
      pastTopics: [...gameState.pastTopics, randomTopic?.id].filter(
        Boolean
      ) as string[],
      status: "showTopic" as GameStatus,
      timeLeft: gameState?.currentRoundDuration,
    };
    updateGameState(newState);
  };

  const startDrawing = () => {
    updateGameState({
      ...gameState,
      status: "drawing",
    });
    setClearCanvas((prev) => prev + 1);
  };
  const endDrawing = async (timeLeft: number) => {
    const points = calculateScore(timeLeft, gameState.currentRoundDuration);
    if (gameState?.currentDrawer) {
      const newPlayer = getPlayerById(players, gameState.currentDrawer.id);
      if (newPlayer) {
        await supabase
          .from("players")
          .update({ score: newPlayer.score + points, hasPlayed: true })
          .eq("id", newPlayer.id);
      }
    }
    const next = selectNextDrawer(players, gameState.currentDrawer?.id);
    const newPlayedRounds = gameState.playedRounds + 1;

    updateGameState({
      ...gameState,
      status: "waitingForWinner",
      nextDrawer: next,
      playedRounds: newPlayedRounds,
    });
  };

  const handleWinnerSelection = async (winnerId: string) => {
    const winner = getPlayerById(players, winnerId);
    if (winner) {
      await supabase
        .from("players")
        .update({ score: winner.score + GUESS_POINTS })
        .eq("id", winner.id);
    }

    const totalRounds = players.length;

    if (gameState.playedRounds >= totalRounds) {
      updateGameState({
        ...gameState,
        status: "over",
      });
      return;
    }

    const randomTopic = getRandomTopic(topics, gameState.pastTopics);

    updateGameState({
      ...gameState,
      currentDrawer: gameState.nextDrawer,
      currentTopic: randomTopic?.id,
      pastTopics: [...gameState.pastTopics, randomTopic?.id].filter(
        Boolean
      ) as string[],
      status: "showTopic",
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
    const initialState = getInitialState(gameState.currentRoundDuration);
    updateGameState({
      ...initialState,
      status: "idle",
    });
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
    if (gameState.currentTopic) {
      const topic = topics.find((topic) => topic.id === gameState.currentTopic);
      setTopic(topic);
    }
  }, [gameState.currentTopic, topics]);

  /**********
   * fetchTopics
   * ********/

  const fetchTopics = useCallback(async () => {
    const { data } = await supabase.from("topics").select("*");
    if (data) {
      setTopics(data);
    }
  }, []);

  useEffect(() => {
    fetchTopics();
  }, [fetchTopics]);

  return {
    currentPlayer,
    isLoading,
    gameState,
    players,
    topic,
    topics,
    endDrawing,
    handleWinnerSelection,
    newGame,
    setTimeLeft,
    setTimer,
    startGame,
    startDrawing,
  };
}
