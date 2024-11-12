import { Player } from "@/types";
import { supabase } from "./supabaseClient";

export const checkPlayerExists = async (name: string) => {
  const { data, error } = await supabase
    .from("players")
    .select("*")
    .ilike("name", name.toLowerCase())
    .single();

  return { player: data as Player, error };
};

export const createPlayer = async (name: string) => {
  const { data, error } = await supabase
    .from("players")
    .insert([{ name }])
    .select()
    .single();

  return { player: data as Player, error };
};

export const getOrCreatePlayer = async (name: string) => {
  const { player: existingPlayer } = await checkPlayerExists(name);

  if (existingPlayer) {
    return { player: existingPlayer };
  }

  return createPlayer(name);
};

export const getPlayerById = (players: Player[], id: string) =>
  players.find((player) => player.id === id);
