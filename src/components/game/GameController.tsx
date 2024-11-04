"use client";

import { Button } from "@/components/ui/button";
import { Timer } from "@/components/ui/timer";
import { Pause, Play, UserPlus } from "lucide-react";
import { useState } from "react";

interface Player {
  id: string;
  name: string;
  score: number;
}

interface GameControllerProps {
  onDrawingEnabledChange: (enabled: boolean) => void;
}

export function GameController({
  onDrawingEnabledChange,
}: GameControllerProps) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentDrawer, setCurrentDrawer] = useState<Player | null>(null);
  const [isGameActive, setIsGameActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);

  const addPlayer = () => {
    const name = prompt("Enter player name:");
    if (name) {
      const newPlayer: Player = {
        id: Date.now().toString(),
        name,
        score: 0,
      };
      setPlayers([...players, newPlayer]);
    }
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

    const nextDrawer = currentDrawer ? selectNextDrawer() : players[0];
    setCurrentDrawer(nextDrawer);
    setIsGameActive(true);
    setTimeLeft(60);
    onDrawingEnabledChange(true);
  };

  const calculateScore = (timeLeft: number) => {
    return Math.round((timeLeft / 60) * 10);
  };

  const handleTimeUp = () => {
    if (currentDrawer) {
      const points = calculateScore(timeLeft);
      setPlayers(
        players.map((player) =>
          player.id === currentDrawer.id
            ? { ...player, score: player.score + points }
            : player
        )
      );
    }

    // Instead of ending the game, start a new round with the next player
    if (players.length >= 2) {
      startRound();
    } else {
      setIsGameActive(false);
      onDrawingEnabledChange(false);
      setCurrentDrawer(null);
    }
  };

  return (
    <div className="flex flex-col gap-2 bg-black/20 p-2 rounded-md min-w-[200px]">
      {!isGameActive ? (
        <Button onClick={startRound} size="sm" disabled={players.length < 2}>
          <Play />
          Start Round
        </Button>
      ) : (
        <Button onClick={handleTimeUp} size="sm" variant="destructive">
          <Pause />
          End Round
        </Button>
      )}
      {isGameActive && (
        <div className="bg-white/90 p-4 rounded-lg">
          <Timer
            timeLeft={timeLeft}
            setTimeLeft={setTimeLeft}
            onTimeUp={handleTimeUp}
            isActive={isGameActive}
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
      <Button onClick={addPlayer} size="sm">
        <UserPlus />
        Add Player
      </Button>
    </div>
  );
}
