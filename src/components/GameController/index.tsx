"use client";

import { isDrawerAtom } from "@/atoms";
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
    startGame,
    startDrawing,
    endDrawing,
    setTimer,
    newGame,
    handleWinnerSelection,
  } = useGameState();
  const [isTimerSettingsOpen, setIsTimerSettingsOpen] = useState(false);
  const isDrawer = useAtomValue(isDrawerAtom);

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="flex flex-col gap-2 bg-black/20 p-2 rounded-md min-w-[200px] h-full">
      {gameState.status === "idle" && (
        <>
          <Button
            onClick={() => setIsTimerSettingsOpen(true)}
            size="sm"
            variant="outline"
            title="Set Timer"
          >
            <Clock className="mr-2 w-4 h-4" />
            {gameState.currentRoundDuration}s
          </Button>
          <Button
            disabled={players.length < 2}
            size="sm"
            variant={"secondary"}
            onClick={startGame}
          >
            <Play />
            Start Game
          </Button>
        </>
      )}

      {gameState.status === "over" && (
        <GameOver
          players={[...players].sort((a, b) => b.score - a.score)}
          onNewGame={newGame}
        />
      )}

      {gameState.status !== "idle" && gameState.status !== "over" && (
        <div className="bg-white/90 p-2 rounded-lg text-center text-sm">
          Round {gameState.playedRounds + 1} of {players.length}
        </div>
      )}
      {gameState.status === "waitingForWinner" && (
        <div className="bg-white/90 p-2 rounded-lg text-center">
          <p>
            Next player: <strong>{gameState.nextDrawer?.name}</strong>
          </p>
        </div>
      )}

      {gameState.status === "showTopic" && isDrawer && topic && (
        <>
          <TopicCard topic={topic} />
          <Button onClick={startDrawing}>Start Drawing</Button>
        </>
      )}

      {gameState.status === "drawing" && (
        <>
          {isDrawer && topic && <TopicCard topic={topic} />}
          <TimerWithButton
            gameState={gameState}
            isDrawer={isDrawer}
            onTimeUp={endDrawing}
          />
        </>
      )}

      {gameState.status === "waitingForWinner" && (
        <WinnerDialog
          open={true}
          players={players}
          currentDrawer={gameState.currentDrawer}
          topic={topic}
          onSelectWinner={async (winnerId) => {
            await handleWinnerSelection(winnerId);
          }}
        />
      )}

      {gameState.status !== "over" && <PlayersList />}
      <TimerSettings
        open={isTimerSettingsOpen}
        onOpenChange={setIsTimerSettingsOpen}
        onSetTimer={setTimer}
        currentTime={gameState.currentRoundDuration}
      />
    </div>
  );
}
