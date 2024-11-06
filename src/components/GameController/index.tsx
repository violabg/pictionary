"use client";

import { Button } from "@/components/ui/button";
import { useSocket } from "@/contexts/SocketContext";
import { Clock, Pause, Play, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { Timer } from "../Timer";
import { TimerSettings } from "../Timer/TimerSettings";
import { AddPlayerDialog } from "./AddPlayerDialog";
import { GameOver } from "./GameOver";

export type Player = {
  id: string;
  name: string;
  score: number;
};

export type GameState = {
  players: Player[];
  currentDrawer: Player | null;
  nextDrawer: Player | null;
  isGameActive: boolean;
  isPaused: boolean;
  playedRounds: number;
  isGameOver: boolean;
  timeLeft: number;
  currentRoundDuration: number;
  drawingEnabled?: boolean;
};

const DEFAULT_ROUND_DURATION = 120;
const POINTS_MULTIPLIER = 20;
const getInitialState = (roundDuration: number) => {
  const state: GameState = {
    // players: [],
    players: [
      {
        id: "1",
        name: "Player 1",
        score: 0,
      },
      {
        id: "2",
        name: "Player 2",
        score: 0,
      },
    ],
    currentDrawer: null,
    nextDrawer: null,
    isGameActive: false,
    isPaused: false,
    playedRounds: 0,
    isGameOver: false,
    timeLeft: roundDuration,
    currentRoundDuration: roundDuration,
  };
  return state;
};

interface GameControllerProps {
  onNextRound: () => void;
  onDrawingEnabledChange: (enabled: boolean) => void;
  roundDuration?: number;
}

export function GameController({
  onDrawingEnabledChange,
  onNextRound,
  roundDuration = DEFAULT_ROUND_DURATION,
}: GameControllerProps) {
  const [gameState, setGameState] = useState<GameState>(
    getInitialState(roundDuration)
  );
  // Add new state to track drawing enabled status
  const [shouldEnableDrawing, setShouldEnableDrawing] = useState(false);
  const [isAddPlayerOpen, setIsAddPlayerOpen] = useState(false);
  const [isTimerSettingsOpen, setIsTimerSettingsOpen] = useState(false);

  const { socket } = useSocket();

  const addPlayer = (name: string) => {
    const newPlayer: Player = {
      id: Date.now().toString(),
      name,
      score: 0,
    };
    setGameState((prev) => ({
      ...prev,
      players: [...prev.players, newPlayer],
    }));
  };

  const selectNextDrawer = () => {
    const availablePlayers = gameState.players.filter(
      (p) => p.id !== gameState.currentDrawer?.id
    );
    return availablePlayers[
      Math.floor(Math.random() * availablePlayers.length)
    ];
  };

  const startRound = () => {
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
    setShouldEnableDrawing(true);
    onNextRound();
  };

  const calculateScore = (timeLeft: number) => {
    return Math.round(
      (timeLeft / gameState.currentRoundDuration) * POINTS_MULTIPLIER
    );
  };

  const handleTimeUp = () => {
    setGameState((prev) => {
      const newState = { ...prev };
      // If there is a current drawer, calculate and update their score
      if (prev.currentDrawer) {
        const points = calculateScore(prev.timeLeft);
        newState.players = prev.players.map((player) =>
          player.id === prev.currentDrawer?.id
            ? { ...player, score: player.score + points }
            : player
        );
      }

      // Check if there are at least 2 players to continue the game
      if (prev.players.length >= 2) {
        const newPlayedRounds = prev.playedRounds + 1;
        const totalRounds = prev.players.length;

        // If all players have drawn, end the game
        if (newPlayedRounds >= totalRounds) {
          newState.isGameOver = true;
          newState.isGameActive = false;
          setShouldEnableDrawing(false);
          return newState;
        }

        // Select the next drawer and pause the game
        const next = selectNextDrawer();
        newState.playedRounds = newPlayedRounds;
        newState.nextDrawer = next;
        newState.isPaused = true;
      } else {
        // If there are less than 2 players, end the game
        newState.isGameActive = false;
        newState.currentDrawer = null;
      }

      // Disable drawing
      setShouldEnableDrawing(false);
      return newState;
    });
  };

  const handleSetTimer = (seconds: number) => {
    setGameState((prev) => ({
      ...prev,
      currentRoundDuration: seconds,
      timeLeft: seconds,
    }));
  };

  const onNewGame = () => {
    setGameState((prev) => ({
      ...prev,
      isGameOver: false,
      playedRounds: 0,
      players: prev.players.map((p) => ({ ...p, score: 0 })),
    }));
    // Reset the drawing enabled state
    onNextRound();
  };

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === "+" && !gameState.isGameActive) {
        e.preventDefault();
        setIsAddPlayerOpen(true);
      }
    };

    window.addEventListener("keypress", handleKeyPress);
    return () => window.removeEventListener("keypress", handleKeyPress);
  }, [gameState.isGameActive]);

  // Split the socket effect into two separate effects
  useEffect(() => {
    if (!socket) return;

    socket.on("game-state-update", (newGameState: GameState) => {
      setGameState((prev) => {
        if (JSON.stringify(prev) === JSON.stringify(newGameState)) {
          return prev;
        }
        if (typeof newGameState.drawingEnabled === "boolean") {
          setShouldEnableDrawing(newGameState.drawingEnabled);
        }
        return newGameState;
      });
    });

    return () => {
      socket.off("game-state-update");
    };
  }, [socket]);

  // Add a separate effect for handling drawing enabled state
  useEffect(() => {
    onDrawingEnabledChange(shouldEnableDrawing);
  }, [shouldEnableDrawing, onDrawingEnabledChange]);

  useEffect(() => {
    socket?.emit("game-state-update", {
      ...gameState,
      drawingEnabled: shouldEnableDrawing,
    });
  }, [socket, gameState, shouldEnableDrawing]);

  return (
    <div className="flex flex-col gap-2 bg-black/20 p-2 rounded-md min-w-[200px]">
      {!gameState.isGameActive && (
        <Button
          onClick={() => setIsTimerSettingsOpen(true)}
          size="sm"
          variant="outline"
          title="Set Timer"
        >
          <Clock className="mr-2 w-4 h-4" />
          {gameState.currentRoundDuration}s
        </Button>
      )}
      {gameState.isGameOver ? (
        <GameOver
          players={[...gameState.players].sort((a, b) => b.score - a.score)}
          onNewGame={onNewGame}
        />
      ) : (
        <>
          {!gameState.isGameActive ? (
            <Button
              disabled={gameState.players.length < 2}
              size="sm"
              variant={"secondary"}
              onClick={startRound}
            >
              <Play />
              Start Game
            </Button>
          ) : gameState.isPaused ? (
            <div className="space-y-2">
              <div className="bg-white/90 p-2 rounded-lg text-center">
                <p>
                  Next player: <strong>{gameState.nextDrawer?.name}</strong>
                </p>
              </div>
              <Button
                className="w-full"
                size="sm"
                variant={"secondary"}
                onClick={startRound}
              >
                <Play />
                {"I'm Ready"}
              </Button>
            </div>
          ) : (
            <Button onClick={handleTimeUp} size="sm" variant="destructive">
              <Pause />
              End Round
            </Button>
          )}
          {gameState.isGameActive && (
            <div className="bg-white/90 p-2 rounded-lg text-center text-sm">
              Round {gameState.playedRounds + 1} of {gameState.players.length}
            </div>
          )}
          {gameState.isGameActive && !gameState.isPaused && (
            <div className="bg-white/90 p-4 rounded-lg">
              <Timer
                timeLeft={gameState.timeLeft}
                setTimeLeft={(time) =>
                  setGameState((prev) => ({ ...prev, timeLeft: time }))
                }
                onTimeUp={handleTimeUp}
                isActive={gameState.isGameActive && !gameState.isPaused}
              />
            </div>
          )}
          <div className="space-y-2 bg-white/90 p-4 rounded-lg">
            {gameState.players.map((player) => (
              <div
                key={player.id}
                className={`flex items-center gap-2 ${
                  gameState.currentDrawer?.id === player.id ? "font-bold" : ""
                }`}
              >
                <span>{player.name}</span>
                <span className="text-sm">({player.score} pts)</span>
                {gameState.currentDrawer?.id === player.id && (
                  <span className="text-blue-600 text-sm">(Drawing)</span>
                )}
              </div>
            ))}
          </div>
          <Button
            onClick={() => setIsAddPlayerOpen(true)}
            size="sm"
            title="Add Player (+)"
          >
            <UserPlus />
            Add Player
          </Button>
          <AddPlayerDialog
            open={isAddPlayerOpen}
            onOpenChange={setIsAddPlayerOpen}
            onAddPlayer={addPlayer}
          />
          <TimerSettings
            open={isTimerSettingsOpen}
            onOpenChange={setIsTimerSettingsOpen}
            onSetTimer={handleSetTimer}
            currentTime={gameState.currentRoundDuration}
          />
        </>
      )}
    </div>
  );
}
