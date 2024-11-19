"use client";
import { isDrawerAtom } from "@/atoms";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loading } from "@/components/ui/loading";
import { Section } from "@/components/ui/Section";
import { supabase } from "@/lib/supabaseClient";
import GameMachineContext, { gameId } from "@/machines/gameMachine";
import { GameStateRemote, Player } from "@/types";
import { useAtomValue } from "jotai";
import { Clock, Play } from "lucide-react";
import { useEffect, useState } from "react";
import { TimerSettings } from "../Timer/TimerSettings";
import { GameOver } from "./GameOver";
import PlayersList from "./PlayersList";
import TimerWithButton from "./TimerWithButton";
import { TopicCard } from "./TopicCard";
import { WinnerDialog } from "./WinnerDialog";

export function GameController() {
  const { send } = GameMachineContext.useActorRef();
  const gameState = GameMachineContext.useSelector(
    (state) => state.context.gameState
  );
  const players = GameMachineContext.useSelector(
    (state) => state.context.players
  );
  const loadingState = GameMachineContext.useSelector(
    (state) => state.context.loadingState
  );
  const topics = GameMachineContext.useSelector(
    (state) => state.context.topics
  );

  const isLoading = loadingState === "loadingData";

  const [isTimerSettingsOpen, setIsTimerSettingsOpen] = useState(false);

  const isDrawer = useAtomValue(isDrawerAtom);
  const topic = topics.find((t) => t.id === gameState.currentTopic);

  const onSetTimer = (seconds: number) => {
    send({ type: "SET_TIMER", seconds });
  };

  /**
   * Effect hook for getting players from the database and setting up real-time subscriptions
   */
  useEffect(() => {
    // Real-time subscription
    const playersSubscription = supabase
      .channel("players_channel")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "players",
        },
        (payload) => {
          send({
            type: "SYNC_PLAYER",
            data: {
              eventType: payload.eventType,
              newPlayer: payload.new as Player,
              oldPlayer: payload.old as Player,
            },
          });
        }
      )
      .subscribe();

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
          console.log("payload :>> ", payload);
          send({
            type: "SYNC_GAME_STATE",
            data: {
              eventType: payload.eventType,
              newState: payload.new as GameStateRemote,
              oldState: payload.old as GameStateRemote,
            },
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(playersSubscription);
      supabase.removeChannel(gameSubscription);
    };
  }, [send]);

  return (
    <Section
      as="aside"
      className="flex flex-col gap-2 [grid-area:sidebar] p-2 min-w-[200px] h-full"
    >
      {isLoading ? (
        <Loading />
      ) : (
        <>
          {gameState.status === "idle" && (
            <>
              <Button
                onClick={() => setIsTimerSettingsOpen(true)}
                variant="outline"
                title="Set Timer"
              >
                <Clock className="mr-2 w-4 h-4" />
                {`Change current time ${gameState.currentRoundDuration}s`}
              </Button>
              <Button
                disabled={players.length < 2}
                onClick={() => send({ type: "START_GAME" })}
              >
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

          {(gameState.status === "waitingForWinner" ||
            (gameState.status === "showTopic" && !isDrawer)) &&
            gameState.nextDrawer && (
              <Card className="p-2 text-center">
                <p>
                  Next player: <strong>{gameState.nextDrawer?.name}</strong>
                </p>
              </Card>
            )}

          {gameState.status === "showTopic" && isDrawer && topic && (
            <>
              <TopicCard topic={topic} />
              <Button onClick={() => send({ type: "START_DRAWING" })}>
                Start Drawing
              </Button>
            </>
          )}

          {gameState.status === "drawing" && (
            <>
              {isDrawer && topic && <TopicCard topic={topic} />}
              <TimerWithButton
                gameState={gameState}
                isDrawer={isDrawer}
                onTimeUp={(timeLeft: number) =>
                  send({ type: "END_DRAWING", timeLeft })
                }
              />
            </>
          )}

          {gameState.status === "waitingForWinner" && (
            <WinnerDialog
              open={true}
              players={players}
              currentDrawer={gameState.currentDrawer}
              topic={topic}
              onSelectWinner={(winnerId: string) =>
                send({ type: "SELECT_WINNER", winnerId })
              }
            />
          )}

          {gameState.status !== "over" ? (
            <PlayersList />
          ) : (
            <GameOver
              players={[...players].sort((a, b) => b.score - a.score)}
              onNewGame={() => send({ type: "NEW_GAME" })}
            />
          )}

          <TimerSettings
            open={isTimerSettingsOpen}
            onOpenChange={setIsTimerSettingsOpen}
            onSetTimer={onSetTimer}
            currentTime={gameState.currentRoundDuration}
          />
        </>
      )}
    </Section>
  );
}
