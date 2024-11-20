import { convertRemoteToLocal } from "@/lib/gameServices";
import { supabase } from "@/lib/supabaseClient";
import { GameState, GameStateRemote, Player } from "@/types";
import { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { useCallback, useEffect } from "react";

export function useGameSync(
  gameId: string,
  onGameUpdate: (gameState: GameState) => void,
  getPlayerById: (id: string | null) => Player | undefined
) {
  const handleGameUpdate = useCallback(
    (payload: RealtimePostgresChangesPayload<GameStateRemote>) => {
      if (["INSERT", "UPDATE"].includes(payload.eventType)) {
        const remote = payload.new as GameStateRemote;
        const local = convertRemoteToLocal(remote, getPlayerById);
        onGameUpdate(local);
      }
    },
    [getPlayerById, onGameUpdate]
  );

  useEffect(() => {
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
        handleGameUpdate
      )
      // .on("system", { event: "*" }, (status) => {
      //   console.log("status :>> ", status);
      // })
      .subscribe();

    return () => {
      supabase.removeChannel(gameSubscription);
    };
  }, [gameId, handleGameUpdate]);
}
