"use client";

import { isDrawerAtom } from "@/atoms";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/Card";
import { Section } from "@/components/ui/Section";
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
    <Section
      as="aside"
      className="flex flex-col gap-2 [grid-area:sidebar] p-2 min-w-[200px] h-full"
    >
      {gameState.status === "idle" && (
        <>
          <Button
            onClick={() => setIsTimerSettingsOpen(true)}
            variant="outline"
            title="Set Timer"
          >
            <Clock className="mr-2 w-4 h-4" />
            {gameState.currentRoundDuration}s
          </Button>
          <Button disabled={players.length < 2} onClick={startGame}>
            <Play />
            Start Game
          </Button>
        </>
      )}

      {gameState.status !== "idle" && gameState.status !== "over" && (
        <Card className="p-2 text-center text-sm">
          Round {gameState.playedRounds + 1} of {players.length}
        </Card>
      )}

      {gameState.status === "waitingForWinner" && (
        <Card className="p-2 text-center">
          <p>
            Next player: <strong>{gameState.nextDrawer?.name}</strong>
          </p>
        </Card>
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

      {gameState.status !== "over" ? (
        <PlayersList />
      ) : (
        <GameOver
          players={[...players].sort((a, b) => b.score - a.score)}
          onNewGame={newGame}
        />
      )}

      <TimerSettings
        open={isTimerSettingsOpen}
        onOpenChange={setIsTimerSettingsOpen}
        onSetTimer={setTimer}
        currentTime={gameState.currentRoundDuration}
      />
    </Section>
  );
}
