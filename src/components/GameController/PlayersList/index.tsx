// components/PlayersList.tsx
import { currentPlayerAtom, gameStateAtom, playersAtom } from "@/atoms";
import { getOrCreatePlayer } from "@/lib/playerService";
import { supabase } from "@/lib/supabaseClient";
import type { Player } from "@/types";
import { useAtom, useAtomValue } from "jotai";
import { useEffect, useState } from "react";
import { AddPlayerDialog } from "../AddPlayerDialog";

// type Props = {
//   gameState: GameState;
// };

export function PlayersList() {
  const gameState = useAtomValue(gameStateAtom);
  const [players, setPlayers] = useAtom(playersAtom);
  const [currentPlayer, setCurrentPlayer] = useAtom(currentPlayerAtom);
  const [isLoading, setIsLoading] = useState(true);
  const [showAuthDialog, setShowAuthDialog] = useState(true);

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
    // if (players.some((player) => player.name === name)) {
    //   alert(`${name} è già presente nella lista dei giocatori`);
    //   return;
    // }
    const { player } = await getOrCreatePlayer(name);
    setCurrentPlayer(player);
    setShowAuthDialog(false);
  };

  return (
    <div className="space-y-2 bg-white/90 p-4 rounded-lg">
      {isLoading ? (
        <div>Loading...</div>
      ) : (
        <>
          {players.map((player) => {
            return (
              <div
                key={player.id}
                className={`flex items-center gap-2 ${
                  gameState.currentDrawer === player.id ? "font-bold" : ""
                }`}
              >
                <span
                  className={`${
                    player.id === currentPlayer?.id ? "text-primary" : ""
                  }`}
                >
                  {player.name}
                </span>
                <span className="text-sm">({player.score} pts)</span>
                {gameState.currentDrawer === player.id && (
                  <span className="text-blue-600 text-sm">(Drawing)</span>
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
