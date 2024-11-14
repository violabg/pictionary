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
  fetchTopics,
  getOrCreateGameState,
  getRandomTopic,
  GUESS_POINTS,
  MIN_PLAYERS,
  updateGame,
} from "@/lib/gameServices";
import {
  getPlayerById,
  resetPlayerScores,
  selectNextDrawer,
  updatePlayerScore,
} from "@/lib/playerService";
import { supabase } from "@/lib/supabaseClient";
import { GameState, GameStateRemote, GameStatus, Topic } from "@/types";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useCallback, useEffect, useState } from "react";

const gameId = "spindox";

/**
 * Custom hook for managing the Pictionary game state
 * Handles real-time game state updates, player management, and game flow
 */
export function useGameState() {
  // State management atoms and local state
  const [isLoading, setIsLoading] = useState(true);
  const [gameState, setGameState] = useAtom(gameStateAtom);

  const players = useAtomValue(playersAtom);
  const currentPlayer = useAtomValue(currentPlayerAtom);

  const setClearCanvas = useSetAtom(clearCanvasAtom);

  const [topic, setTopic] = useState<Topic>();
  const [topics, setTopics] = useState<Topic[]>([]);

  /**
   * Updates the game state in the Supabase database
   * Converts local state to remote format by handling player references
   */
  const updateGameState = useCallback(
    async (newState: GameState) => {
      await updateGame(gameId, newState);
      setGameState(newState);
    },
    [setGameState]
  );

  /**
   * Initiates a new game session
   * Validates minimum players, resets scores, and selects first drawer
   */
  const startGame = async () => {
    // Validate minimum player requirement
    if (players.length < MIN_PLAYERS) {
      alert(`Need at least ${MIN_PLAYERS} players to start!`);
      return gameState;
    }

    // Reset player scores and states
    await resetPlayerScores();

    // Select random topic and initialize new round
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

  /**
   * Transitions game state to drawing phase and clears canvas
   */
  const startDrawing = () => {
    updateGameState({
      ...gameState,
      status: "drawing",
    });
    setClearCanvas((prev) => prev + 1);
  };

  /**
   * Handles end of drawing phase
   * Calculates scores, updates player points, and prepares for next round
   */
  const endDrawing = async (timeLeft: number) => {
    // Calculate and award points to drawer
    const points = calculateScore(timeLeft, gameState.currentRoundDuration);
    if (gameState?.currentDrawer) {
      const newPlayer = getPlayerById(players, gameState.currentDrawer.id);
      if (newPlayer) {
        await updatePlayerScore(newPlayer.id, newPlayer.score + points, true);
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

  /**
   * Processes winner selection and initiates next round
   * Awards points to winner and checks if game should end
   */
  const handleWinnerSelection = async (winnerId: string) => {
    // Award points to the winner
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

  const setTimer = (seconds: number) => {
    updateGameState({
      ...gameState,
      currentRoundDuration: seconds,
    });
  };

  /**
   * Resets the game to initial state while preserving round duration
   */
  const newGame = () => {
    const initialState = getInitialState(gameState.currentRoundDuration);
    updateGameState({
      ...initialState,
      status: "idle",
    });
  };

  /**
   * Effect hook for initializing game state and setting up real-time subscriptions
   * Handles initial game state creation and updates from Supabase
   */
  useEffect(() => {
    const getGameState = async () => {
      const data = await getOrCreateGameState(
        gameId,
        getInitialState(DEFAULT_ROUND_DURATION)
      );
      setGameState(data);
      setIsLoading(false);
    };

    // Initialize game state if loading
    if (isLoading) {
      getGameState();
    }

    // Set up real-time subscription to game state changes
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

  /**
   * Effect hook for updating current topic when it changes
   */
  useEffect(() => {
    if (gameState.currentTopic) {
      const topic = topics.find((topic) => topic.id === gameState.currentTopic);
      setTopic(topic);
    }
  }, [gameState.currentTopic, topics]);

  /**
   * Fetches available topics from the database
   */
  const initTopics = useCallback(async () => {
    const data = await fetchTopics();
    setTopics(data);
  }, []);

  // Initialize topics on component mount
  useEffect(() => {
    initTopics();
  }, [initTopics]);

  // Return hook interface
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
    setTimer,
    startGame,
    startDrawing,
  };
}
