"use client";

import { Button } from "@/components/ui/button";
import { Timer } from "@/components/ui/timer";
import { useSocket } from "@/contexts/SocketContext";
import { Clock, Pause, Play, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { AddPlayerDialog } from "./AddPlayerDialog";
import { GameOver } from "./GameOver";
import { TimerSettings } from "./TimerSettings";

export interface Player {
  id: string;
  name: string;
  score: number;
}

const DEFAULT_ROUND_DURATION = 60;

interface GameControllerProps {
  onNextRound: () => void;
  onDrawingEnabledChange: (enabled: boolean) => void;
  roundDuration?: number; // New prop
}

export function GameController({
  onDrawingEnabledChange,
  onNextRound,
  roundDuration = DEFAULT_ROUND_DURATION, // Default value
}: GameControllerProps) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentDrawer, setCurrentDrawer] = useState<Player | null>(null);
  const [nextDrawer, setNextDrawer] = useState<Player | null>(null);
  const [isGameActive, setIsGameActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [timeLeft, setTimeLeft] = useState(roundDuration);
  const [playedRounds, setPlayedRounds] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isAddPlayerOpen, setIsAddPlayerOpen] = useState(false);
  const [isTimerSettingsOpen, setIsTimerSettingsOpen] = useState(false);
  const [currentRoundDuration, setCurrentRoundDuration] =
    useState(roundDuration);
  const { socket } = useSocket();

  const addPlayer = (name: string) => {
    const newPlayer: Player = {
      id: Date.now().toString(),
      name,
      score: 0,
    };
    const updatedPlayers = [...players, newPlayer];
    setPlayers(updatedPlayers);
  };

  const selectNextDrawer = () => {
    const availablePlayers = players.filter((p) => p.id !== currentDrawer?.id);
    return availablePlayers[
      Math.floor(Math.random() * availablePlayers.length)
    ];
  };

  const startRound = () => {
    if (players.length < 2) {
      alert("Need at least 2 players to start!");
      return;
    }

    const drawer = nextDrawer || players[0];

    setCurrentDrawer(drawer);
    setNextDrawer(null);
    setIsGameActive(true);
    setIsPaused(false);
    setTimeLeft(currentRoundDuration);
    onDrawingEnabledChange(true);
    onNextRound();
  };

  const calculateScore = (timeLeft: number) => {
    return Math.round((timeLeft / currentRoundDuration) * 10);
  };

  const handleTimeUp = () => {
    if (currentDrawer) {
      const points = calculateScore(timeLeft);
      const updatedPlayers = players.map((player) =>
        player.id === currentDrawer.id
          ? { ...player, score: player.score + points }
          : player
      );
      setPlayers(updatedPlayers);
    }

    if (players.length >= 2) {
      const newPlayedRounds = playedRounds + 1;
      const totalRounds = players.length;

      if (newPlayedRounds >= totalRounds) {
        setIsGameOver(true);
        setIsGameActive(false);
        onDrawingEnabledChange(false);

        return;
      }

      const next = selectNextDrawer();
      setPlayedRounds(newPlayedRounds);
      setNextDrawer(next);
      setIsPaused(true);
      onDrawingEnabledChange(false);
    } else {
      setIsGameActive(false);
      setCurrentDrawer(null);
      onDrawingEnabledChange(false);
    }
  };

  const handleSetTimer = (seconds: number) => {
    setCurrentRoundDuration(seconds);
    setTimeLeft(seconds);
  };

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === "+" && !isGameActive) {
        e.preventDefault();
        setIsAddPlayerOpen(true);
      }
    };

    window.addEventListener("keypress", handleKeyPress);
    return () => window.removeEventListener("keypress", handleKeyPress);
  }, [isGameActive]);

  useEffect(() => {
    if (!socket) return;

    socket.on("game-state-update", (gameState) => {
      // Only update if the state is different from current state
      if (JSON.stringify(gameState.players) !== JSON.stringify(players)) {
        setPlayers(gameState.players);
      }
      if (gameState.currentDrawer?.id !== currentDrawer?.id) {
        setCurrentDrawer(gameState.currentDrawer);
      }
      if (gameState.nextDrawer?.id !== nextDrawer?.id) {
        setNextDrawer(gameState.nextDrawer);
      }
      if (gameState.isGameActive !== isGameActive) {
        setIsGameActive(gameState.isGameActive);
      }
      if (gameState.isPaused !== isPaused) {
        setIsPaused(gameState.isPaused);
      }
      if (gameState.timeLeft !== timeLeft) {
        setTimeLeft(gameState.timeLeft);
      }
      if (gameState.playedRounds !== playedRounds) {
        setPlayedRounds(gameState.playedRounds);
      }
      if (gameState.isGameOver !== isGameOver) {
        setIsGameOver(gameState.isGameOver);
      }
      onDrawingEnabledChange(gameState.drawingEnabled);
    });

    return () => {
      socket.off("game-state-update");
    };
  }, [
    socket,
    players,
    currentDrawer,
    nextDrawer,
    isGameActive,
    isPaused,
    timeLeft,
    playedRounds,
    isGameOver,
    onDrawingEnabledChange,
  ]);

  useEffect(() => {
    socket?.emit("game-state-update", {
      players,
      currentDrawer,
      nextDrawer,
      isGameActive,
      isPaused,
      timeLeft,
      playedRounds,
      isGameOver,
      drawingEnabled: !isPaused && isGameActive,
    });
  }, [
    socket,
    players,
    currentDrawer,
    nextDrawer,
    isGameActive,
    isPaused,
    timeLeft,
    playedRounds,
    isGameOver,
  ]);

  return (
    <div className="flex flex-col gap-2 bg-black/20 p-2 rounded-md min-w-[200px]">
      {!isGameActive && (
        <Button
          onClick={() => setIsTimerSettingsOpen(true)}
          size="sm"
          variant="outline"
          title="Set Timer"
        >
          <Clock className="mr-2 w-4 h-4" />
          {currentRoundDuration}s
        </Button>
      )}
      {isGameOver ? (
        <GameOver
          players={[...players].sort((a, b) => b.score - a.score)}
          onNewGame={() => {
            setIsGameOver(false);
            setPlayedRounds(0);
            setPlayers(players.map((p) => ({ ...p, score: 0 })));
          }}
        />
      ) : (
        <>
          {!isGameActive ? (
            <Button
              disabled={players.length < 2}
              size="sm"
              variant={"secondary"}
              onClick={startRound}
            >
              <Play />
              Start Game
            </Button>
          ) : isPaused ? (
            <div className="space-y-2">
              <div className="bg-white/90 p-2 rounded-lg text-center">
                <p>
                  Next player: <strong>{nextDrawer?.name}</strong>
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
          {isGameActive && (
            <div className="bg-white/90 p-2 rounded-lg text-center text-sm">
              Round {playedRounds + 1} of {players.length}
            </div>
          )}
          {isGameActive && !isPaused && (
            <div className="bg-white/90 p-4 rounded-lg">
              <Timer
                timeLeft={timeLeft}
                setTimeLeft={setTimeLeft}
                onTimeUp={handleTimeUp}
                isActive={isGameActive && !isPaused}
              />
            </div>
          )}
          <div className="space-y-2 bg-white/90 p-4 rounded-lg">
            {players.map((player) => (
              <div
                key={player.id}
                className={`flex items-center gap-2 ${
                  currentDrawer?.id === player.id ? "font-bold" : ""
                }`}
              >
                <span>{player.name}</span>
                <span className="text-sm">({player.score} pts)</span>
                {currentDrawer?.id === player.id && (
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
            currentTime={currentRoundDuration}
          />
        </>
      )}
    </div>
  );
}
