import { supabase } from "@/lib/supabaseClient";
import { CurrentPlayer, GameState, Player } from "@/types";
import { useCallback, useState } from "react";

export function useCurrentPlayer() {
  const [currentPlayer, setCurrentPlayer] = useState<CurrentPlayer | null>(
    null
  );
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);

  const loadPlayers = useCallback(async () => {
    const { data } = await supabase.from("players").select("*");

    if (data) {
      const players = data.map((p) => ({
        id: p.id,
        name: p.name,
        score: 0,
        hasPlayed: false,
      }));
      setAllPlayers(players);
      return players;
    }
    return [];
  }, []);

  const selectOrCreatePlayer = useCallback(
    async (name: string) => {
      // Check if player exists in current list
      const existingPlayer = allPlayers.find(
        (p) => p.name.toLowerCase() === name.toLowerCase()
      );

      if (existingPlayer) {
        setCurrentPlayer({ id: existingPlayer.id, name: existingPlayer.name });
        return existingPlayer;
      }

      // Create new player if doesn't exist
      const { data, error } = await supabase
        .from("players")
        .insert([{ name }])
        .select()
        .single();

      if (!error && data) {
        const newPlayer = {
          id: data.id,
          name: data.name,
          score: 0,
          hasPlayed: false,
        };
        setCurrentPlayer({ id: data.id, name: data.name });
        setAllPlayers([...allPlayers, newPlayer]);

        return newPlayer;
      }
      return null;
    },
    [allPlayers]
  );

  const canDraw = useCallback(
    (gameState: GameState) => {
      return gameState.currentDrawer?.id === currentPlayer?.id;
    },
    [currentPlayer]
  );

  const canStartRound = useCallback(
    (gameState: GameState) => {
      return gameState.nextDrawer?.id === currentPlayer?.id;
    },
    [currentPlayer]
  );

  return {
    currentPlayer,
    allPlayers,
    loadPlayers,
    selectOrCreatePlayer,
    canDraw,
    canStartRound,
  };
}
