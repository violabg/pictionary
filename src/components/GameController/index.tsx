"use client";

import { Button } from "@/components/ui/button";
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
  hasPlayed?: boolean;
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

type Props = {
  gameState: GameState;
  onStartRound: () => void;
  onTimeUp: () => void;
  onNewGame: () => void;
  onAddPlayer: (name: string) => void;
  onSetTimeLeft: (seconds: number) => void;
  onSetTimer: (seconds: number) => void;
};

export function GameController({
  gameState,
  onStartRound,
  onTimeUp,
  onNewGame,
  onAddPlayer,
  onSetTimeLeft,
  onSetTimer,
}: Props) {
  const [isAddPlayerOpen, setIsAddPlayerOpen] = useState(false);
  const [isTimerSettingsOpen, setIsTimerSettingsOpen] = useState(false);

  // Keep only the keyboard shortcut effect
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

  return (
    <div className="flex flex-col gap-2 bg-black/20 p-2 rounded-md min-w-[200px] h-full">
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
              onClick={onStartRound}
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
                onClick={onStartRound}
              >
                <Play />
                {"I'm Ready"}
              </Button>
            </div>
          ) : (
            <Button onClick={onTimeUp} size="sm" variant="destructive">
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
                setTimeLeft={onSetTimeLeft}
                onTimeUp={onTimeUp}
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
          {!gameState.isGameActive && (
            <Button
              onClick={() => setIsAddPlayerOpen(true)}
              size="sm"
              title="Add Player (+)"
            >
              <UserPlus />
              Add Player
            </Button>
          )}
          <AddPlayerDialog
            open={isAddPlayerOpen}
            onOpenChange={setIsAddPlayerOpen}
            onAddPlayer={onAddPlayer}
          />
          <TimerSettings
            open={isTimerSettingsOpen}
            onOpenChange={setIsTimerSettingsOpen}
            onSetTimer={onSetTimer}
            currentTime={gameState.currentRoundDuration}
          />
        </>
      )}
    </div>
  );
}
