"use client";

import { Button } from "@/components/ui/button";
import { useGameState } from "@/hooks/useGameState";
import { Clock, Play } from "lucide-react";
import { useState } from "react";
import { TimerSettings } from "../Timer/TimerSettings";
import { GameOver } from "./GameOver";
import PlayersList from "./PlayersList";
import TimerWithButton from "./TimerWithButton";

// type Props = {
// };

export function GameController() {
  const {
    isLoading,
    gameState,
    players,
    startRound,
    handleTimeUp,
    setTimer,
    newGame,
  } = useGameState();
  const [isTimerSettingsOpen, setIsTimerSettingsOpen] = useState(false);

  if (isLoading) {
    return <div>Loading...</div>;
  }

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
          players={[...players].sort((a, b) => b.score - a.score)}
          onNewGame={newGame}
        />
      ) : (
        <>
          {gameState.isGameActive && (
            <div className="bg-white/90 p-2 rounded-lg text-center text-sm">
              Round {gameState.playedRounds + 1} of {players.length}
            </div>
          )}
          {!gameState.isGameActive ? (
            <Button
              disabled={players.length < 2}
              size="sm"
              variant={"secondary"}
              onClick={startRound}
            >
              <Play />
              Start Game
            </Button>
          ) : (
            gameState.isPaused && (
              <div className="space-y-2">
                <Button
                  className="w-full"
                  size="sm"
                  variant={"secondary"}
                  onClick={startRound}
                >
                  <Play />
                  {"I'm Ready"}
                </Button>
                <div className="bg-white/90 p-2 rounded-lg text-center">
                  <p>
                    Next player: <strong>{gameState.nextDrawer?.name}</strong>
                  </p>
                </div>
              </div>
            )
          )}
          {gameState.isGameActive && !gameState.isPaused && (
            <TimerWithButton gameState={gameState} onTimeUp={handleTimeUp} />
          )}
          <PlayersList gameState={gameState} />
          <TimerSettings
            open={isTimerSettingsOpen}
            onOpenChange={setIsTimerSettingsOpen}
            onSetTimer={setTimer}
            currentTime={gameState.currentRoundDuration}
          />
        </>
      )}
    </div>
  );
}
