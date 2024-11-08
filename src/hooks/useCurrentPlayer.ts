import { supabase } from "@/lib/supabaseClient";
import { CurrentPlayer, GameState } from "@/types";
import { useCallback, useState } from "react";

export function useCurrentPlayer() {
  const [currentPlayer, setCurrentPlayer] = useState<CurrentPlayer | null>(
    null
  );

  const checkPlayerExists = useCallback(async (name: string) => {
    const { data } = await supabase
      .from("players")
      .select("name")
      .eq("name", name)
      .single();

    return !!data;
  }, []);

  const createPlayer = useCallback(async (name: string) => {
    const { data, error } = await supabase
      .from("players")
      .insert([{ name }])
      .select()
      .single();

    if (!error && data) {
      setCurrentPlayer({ id: data.id, name: data.name });
      return data;
    }
    return null;
  }, []);

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
    checkPlayerExists,
    createPlayer,
    canDraw,
    canStartRound,
  };
}
