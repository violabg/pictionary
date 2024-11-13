"use client";

import { isDrawerAtom, isNextDrawerAtom } from "@/atoms";
import { Button } from "@/components/ui/button";
import { useGameState } from "@/hooks/useGameState";
import { useAtomValue } from "jotai";
import { Clock, Play } from "lucide-react";
import { useState } from "react";
import { TimerSettings } from "../Timer/TimerSettings";
import { GameOver } from "./GameOver";
import PlayersList from "./PlayersList";
import TimerWithButton from "./TimerWithButton";
import { TopicCard } from "./TopicCard";
import { WinnerDialog } from "./WinnerDialog";

export function GameController() {
  const {
    isLoading,
    gameState,
    players,
    topic,
    startRound,
    handleTimeUp,
    setTimer,
    newGame,
    handleWinnerSelection,
  } = useGameState();
  const [isTimerSettingsOpen, setIsTimerSettingsOpen] = useState(false);
  const [showWinnerDialog, setShowWinnerDialog] = useState(false);
  const isDrawer = useAtomValue(isDrawerAtom);
  const isNextDrawer = useAtomValue(isNextDrawerAtom);

  const onHandleTimeUp = async (timeLeft: number) => {
    await handleTimeUp(timeLeft);
    setShowWinnerDialog(true);
  };

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
          {gameState.isGameActive &&
            !gameState.isPaused &&
            isDrawer &&
            topic && <TopicCard topic={topic} />}
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
            gameState.isPaused &&
            topic && (
              <div className="space-y-2">
                <TopicCard topic={topic} />
                {isNextDrawer && (
                  <Button
                    className="w-full"
                    size="sm"
                    variant={"secondary"}
                    onClick={startRound}
                  >
                    <Play />
                    {"I'm Ready"}
                  </Button>
                )}
                <div className="bg-white/90 p-2 rounded-lg text-center">
                  <p>
                    Next player: <strong>{gameState.nextDrawer?.name}</strong>
                  </p>
                </div>
              </div>
            )
          )}
          {gameState.isGameActive && !gameState.isPaused && (
            <TimerWithButton
              gameState={gameState}
              isDrawer={isDrawer}
              onTimeUp={onHandleTimeUp}
            />
          )}
          <PlayersList />
          <TimerSettings
            open={isTimerSettingsOpen}
            onOpenChange={setIsTimerSettingsOpen}
            onSetTimer={setTimer}
            currentTime={gameState.currentRoundDuration}
          />
          {isDrawer && (
            <WinnerDialog
              open={showWinnerDialog}
              players={players}
              currentDrawer={gameState.currentDrawer}
              topic={topic}
              onSelectWinner={async (winnerId) => {
                await handleWinnerSelection(winnerId);
                setShowWinnerDialog(false);
              }}
              onOpenChange={setShowWinnerDialog}
            />
          )}
        </>
      )}
    </div>
  );
}
