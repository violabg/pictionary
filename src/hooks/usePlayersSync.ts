import { supabase } from "@/lib/supabaseClient";
import { Player } from "@/types";
import { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { useCallback, useEffect, useRef } from "react";

export function usePlayersSync(
  initialPlayers: Player[],
  onPlayerUpdate: (players: Player[]) => void
) {
  const playersRef = useRef<Player[]>(initialPlayers);
  const isInitializedRef = useRef(false);

  // Update ref when initial players change
  useEffect(() => {
    playersRef.current = initialPlayers;
    if (!isInitializedRef.current) {
      isInitializedRef.current = true;
      onPlayerUpdate(initialPlayers);
    }
  }, [initialPlayers, onPlayerUpdate]);

  const handlePlayerChange = useCallback(
    (payload: RealtimePostgresChangesPayload<Player>) => {
      if (!isInitializedRef.current) return;

      const player = payload.new as Player;
      let updatedPlayers: Player[];

      switch (payload.eventType) {
        case "INSERT":
          updatedPlayers = [...playersRef.current, player];
          break;
        case "DELETE":
          updatedPlayers = playersRef.current.filter(
            (p) => p.id !== payload.old.id
          );
          break;
        case "UPDATE":
          updatedPlayers = playersRef.current.map((p) =>
            p.id === player.id ? player : p
          );
          break;
        default:
          return;
      }

      playersRef.current = updatedPlayers;
      onPlayerUpdate(updatedPlayers);
    },
    [onPlayerUpdate]
  );

  useEffect(() => {
    const playersSubscription = supabase
      .channel("players_channel")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "players",
        },
        handlePlayerChange
      )
      .subscribe();

    return () => {
      supabase.removeChannel(playersSubscription);
    };
  }, [handlePlayerChange]);
}
