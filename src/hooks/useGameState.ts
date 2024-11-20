import {
  clearCanvasAtom,
  currentPlayerAtom,
  gameStateAtom,
  loadingStatusAtom,
  playersAtom,
} from "@/atoms";
import {
  calculateScore,
  convertRemoteToLocal,
  DEFAULT_ROUND_DURATION,
  fetchTopics,
  getGameState,
  getInitialState,
  getOrCreateGameState,
  getRandomTopic,
  GUESS_POINTS,
  MIN_PLAYERS,
  updateGame,
} from "@/lib/gameServices";
import {
  fetchPlayers,
  resetPlayerScores,
  selectNextDrawer,
  updatePlayerScore,
} from "@/lib/playerService";
import { GameState, GameStatus, Topic } from "@/types";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useCallback, useEffect, useState } from "react";
import { useGameSync } from "./useGameSync";
import { usePlayersSync } from "./usePlayersSync";

const gameId = "spindox";

/**
 * Custom hook for managing the Pictionary game state
 * Handles real-time game state updates, player management, and game flow
 */
export function useGameState() {
  const [loadingStatus, setLoadingStatus] = useAtom(loadingStatusAtom);
  // State management atoms and local state
  const [gameState, setGameState] = useAtom(gameStateAtom);

  const [players, setPlayers] = useAtom(playersAtom);
  const currentPlayer = useAtomValue(currentPlayerAtom);

  const setClearCanvas = useSetAtom(clearCanvasAtom);

  const [topic, setTopic] = useState<Topic>();
  const [topics, setTopics] = useState<Topic[]>([]);

  const getPlayerById = useCallback(
    (id: string | null) => players.find((p) => p.id === id),
    [players]
  );

  /**
   * Handle Supabase real-time subscriptions for game state and player updates
   */
  useGameSync(gameId, setGameState, getPlayerById);
  usePlayersSync(players, setPlayers);

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

  const syncGameState = useCallback(async () => {
    setLoadingStatus("sync");
    const currentGameState = await getGameState(gameId);
    const playersData = await fetchPlayers();

    if (currentGameState) {
      const local = convertRemoteToLocal(currentGameState, getPlayerById);
      setGameState(local);
    }
    setPlayers(playersData);
    setLoadingStatus("idle");
  }, [setLoadingStatus, setPlayers, getPlayerById, setGameState]);

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
    // Select random topic and player then initialize new round
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
      const newPlayer = getPlayerById(gameState.currentDrawer.id);
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
    const winner = getPlayerById(winnerId);
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

  /**
   * Resets the game to initial state while preserving round duration
   */
  const newGame = async () => {
    // Reset player scores and states
    await resetPlayerScores();
    const initialState = getInitialState(gameState.currentRoundDuration);
    updateGameState({
      ...initialState,
      status: "idle",
    });
  };

  /**
   * Sets the round duration for the current game
   */
  const setTimer = (seconds: number) => {
    updateGameState({
      ...gameState,
      currentRoundDuration: seconds,
    });
  };

  /**
   * Fetches the initial game state, players, and topics
   */
  useEffect(() => {
    const initServices = async () => {
      const [gameState, playersData, topicsData] = await Promise.all([
        getOrCreateGameState(gameId, getInitialState(DEFAULT_ROUND_DURATION)),
        fetchPlayers(),
        fetchTopics(),
      ]);

      setGameState(gameState);
      setPlayers(playersData);
      setTopics(topicsData);
      setLoadingStatus("idle");
    };

    if (loadingStatus === "initial") {
      initServices();
    }
  }, [loadingStatus, setGameState, setPlayers, setLoadingStatus]);

  /**
   * Effect hook for updating current topic when it changes
   */
  useEffect(() => {
    if (gameState.currentTopic) {
      const topic = topics.find((topic) => topic.id === gameState.currentTopic);
      setTopic(topic);
    }
  }, [gameState.currentTopic, topics]);

  // Return hook interface
  return {
    currentPlayer,
    loadingStatus,
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
    syncGameState,
  };
}
