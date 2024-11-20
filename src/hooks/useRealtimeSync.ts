import { supabase } from "@/lib/supabaseClient";
import { GameState, GameStateRemote, Player } from "@/types";
import { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { useCallback, useEffect } from "react";

type SyncHandlers = {
  onGameUpdate: (gameState: GameState) => void;
  onPlayerUpdate: (players: Player[]) => void;
};

export function useRealtimeSync(
  gameId: string,
  players: Player[],
  handlers: SyncHandlers
) {
  const { onGameUpdate, onPlayerUpdate } = handlers;

  const handleGameUpdate = useCallback(
    (payload: RealtimePostgresChangesPayload<GameStateRemote>) => {
      if (["INSERT", "UPDATE"].includes(payload.eventType)) {
        const game = payload.new as GameStateRemote;

        const {
          currentDrawer: _currentDrawer,
          nextDrawer: _nextDrawer,
          ...rest
        } = game;
        // map remote player IDs to local player objects
        const nextDrawer = players.find((p) => p.id === _nextDrawer);
        const currentDrawer = players.find((p) => p.id === _currentDrawer);

        onGameUpdate({
          ...rest,
          currentDrawer,
          nextDrawer,
        });
      }
    },
    [players, onGameUpdate]
  );

  const handlePlayerChange = useCallback(
    (payload: RealtimePostgresChangesPayload<Player>) => {
      const player = payload.new as Player;

      switch (payload.eventType) {
        case "INSERT":
          onPlayerUpdate([...players, player]);
          break;
        case "DELETE":
          onPlayerUpdate(players.filter((p) => p.id !== payload.old.id));
          break;
        case "UPDATE":
          onPlayerUpdate(players.map((p) => (p.id === player.id ? player : p)));
          break;
      }
    },
    [players, onPlayerUpdate]
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
      .subscribe();

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
      supabase.removeChannel(gameSubscription);
      supabase.removeChannel(playersSubscription);
    };
  }, [gameId, handleGameUpdate, handlePlayerChange]);
}
