import { currentPlayerAtom, gameStateAtom, playersAtom } from "@/atoms";
import { getOrCreatePlayer } from "@/lib/playerService";
import { supabase } from "@/lib/supabaseClient";
import type { Player } from "@/types";
import { useAtom, useAtomValue } from "jotai";
import { useEffect, useState } from "react";
import { AddPlayerDialog } from "../AddPlayerDialog";

export function PlayersList() {
  const gameState = useAtomValue(gameStateAtom);
  const [players, setPlayers] = useAtom(playersAtom);
  const [currentPlayer, setCurrentPlayer] = useAtom(currentPlayerAtom);
  const [isLoading, setIsLoading] = useState(true);
  const [showAuthDialog, setShowAuthDialog] = useState(!currentPlayer);

  useEffect(() => {
    const getPlayers = async () => {
      const { data } = await supabase.from("players").select("*");

      if (data) {
        const players = data.map((p) => ({
          id: p.id,
          name: p.name,
          score: 0,
          hasPlayed: false,
        }));
        setPlayers(players);
      } else {
        setPlayers([]);
      }
      setIsLoading(false);
    };
    getPlayers();

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
          const player = payload.new as Player;

          if (payload.eventType === "INSERT") {
            setPlayers((current) => [...current, player]);
          } else if (payload.eventType === "DELETE") {
            setPlayers((current) =>
              current.filter((p) => p.id !== payload.old.id)
            );
          } else if (payload.eventType === "UPDATE") {
            setPlayers((current) =>
              current.map((p) => (p.id === player.id ? player : p))
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(playersSubscription);
    };
  }, [setPlayers]);

  const handleAddPlayer = async (name: string) => {
    const { player } = await getOrCreatePlayer(name);
    setCurrentPlayer(player);
    setShowAuthDialog(false);
  };

  return (
    <div className="space-y-1 bg-white/90 px-2 py-4 rounded-lg">
      {isLoading ? (
        <div>Loading...</div>
      ) : (
        <>
          {players.map((player) => {
            return (
              <div
                key={player.id}
                className={`flex items-center gap-2 py-1 px-2 rounded-sm ${
                  gameState.currentDrawer?.id === player.id
                    ? "font-bold bg-secondary text-white"
                    : ""
                }`}
              >
                <span
                  className={`${
                    player.id === currentPlayer?.id ? "font-bold" : ""
                  }`}
                >
                  {player.name}
                </span>
                <span className="text-sm">({player.score} pts)</span>
                {gameState.currentDrawer?.id === player.id && (
                  <span className="text-sm text-white">(Drawing)</span>
                )}
              </div>
            );
          })}
        </>
      )}
      {showAuthDialog && (
        <AddPlayerDialog
          open={true}
          onOpenChange={() => {}}
          onAddPlayer={handleAddPlayer}
        />
      )}
    </div>
  );
}

export default PlayersList;
