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
  createGameState,
  fetchGameState,
  fetchTopics,
  getRandomTopic,
  GUESS_POINTS,
  MIN_PLAYERS,
  selectNextDrawer,
  updateGameState,
} from "@/lib/gameService";
import {
  getPlayerById,
  resetPlayers,
  updatePlayerScore,
} from "@/lib/playerService";
import { supabase } from "@/lib/supabaseClient";
import { GameStateRemote, GameStatus, Topic } from "@/types";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useCallback, useEffect, useState } from "react";

const gameId = "spindox";

export const useGameState = () => {
  const [gameState, setGameState] = useAtom(gameStateAtom);
  const players = useAtomValue(playersAtom);
  const currentPlayer = useAtomValue(currentPlayerAtom);
  const [isLoading, setIsLoading] = useState(true);
  const setClearCanvas = useSetAtom(clearCanvasAtom);
  const [topic, setTopic] = useState<Topic>();
  const [topics, setTopics] = useState<Topic[]>([]);

  const startGame = async () => {
    if (players.length < MIN_PLAYERS) {
      alert(`Need at least ${MIN_PLAYERS} players to start!`);
      return gameState;
    }

    await resetPlayers();
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
    await updateGameState(gameId, newState);
  };

  const startDrawing = () => {
    updateGameState(gameId, {
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
        await updatePlayerScore(newPlayer.id, newPlayer.score + points, true);
      }
    }
    const next = selectNextDrawer(players, gameState.currentDrawer?.id);
    const newPlayedRounds = gameState.playedRounds + 1;

    updateGameState(gameId, {
      ...gameState,
      status: "waitingForWinner",
      nextDrawer: next,
      playedRounds: newPlayedRounds,
    });
  };

  const handleWinnerSelection = async (winnerId: string) => {
    const winner = getPlayerById(players, winnerId);
    if (winner) {
      await updatePlayerScore(
        winner.id,
        winner.score + GUESS_POINTS,
        !!winner.hasPlayed
      );
    }

    const totalRounds = players.length;

    if (gameState.playedRounds >= totalRounds) {
      updateGameState(gameId, {
        ...gameState,
        status: "over",
      });
      return;
    }

    const randomTopic = getRandomTopic(topics, gameState.pastTopics);

    updateGameState(gameId, {
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
    updateGameState(gameId, { ...gameState, timeLeft: seconds });
  };

  const setTimer = (seconds: number) => {
    updateGameState(gameId, {
      ...gameState,
      currentRoundDuration: seconds,
    });
  };

  const newGame = () => {
    const initialState = getInitialState(gameState.currentRoundDuration);
    updateGameState(gameId, {
      ...initialState,
      status: "idle",
    });
  };

  useEffect(() => {
    const getGameState = async () => {
      const data = await fetchGameState(gameId);

      if (!data) {
        const initialState = getInitialState(DEFAULT_ROUND_DURATION);
        const newGameState = await createGameState(gameId, initialState);
        setGameState(newGameState);
        setIsLoading(false);
      } else {
        await updateGameState(gameId, getInitialState(DEFAULT_ROUND_DURATION));
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
  }, [isLoading, players, setGameState]);

  /**********
   * fetchTopics
   * ********/

  const _fetchTopics = useCallback(async () => {
    const data = await fetchTopics();
    setTopics(data);
  }, []);

  useEffect(() => {
    _fetchTopics();
  }, [_fetchTopics]);

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
    endDrawing,
    handleWinnerSelection,
    newGame,
    setTimeLeft,
    setTimer,
    startGame,
    startDrawing,
  };
};
