import { Player } from "@/types";
import { supabase } from "./supabaseClient";

export const fetchPlayers = async () => {
  const { data } = await supabase.from("players").select("*");
  let players: Player[] = [];

  if (data) {
    players = data.map((p) => ({
      id: p.id,
      name: p.name,
      score: 0,
      hasPlayed: false,
    }));
  }
  return players;
};

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

export const deletePlayer = async (playerId: string) => {
  const { error } = await supabase.from("players").delete().eq("id", playerId);

  return error;
};

export const resetPlayerScores = async () => {
  return await supabase
    .from("players")
    .update({ score: 0, hasPlayed: false })
    .or("score.gt.0,hasPlayed.eq.true");
};

export const updatePlayerScore = async (
  playerId: string,
  score: number,
  hasPlayed: boolean
) => {
  return await supabase
    .from("players")
    .update({ score, hasPlayed })
    .eq("id", playerId);
};

// Helper Functions
export const selectNextDrawer = (
  players: Player[],
  currentDrawerId?: string | null
) => {
  const availablePlayers = players.filter(
    (p) => !p.hasPlayed && p.id !== currentDrawerId
  );
  return availablePlayers[Math.floor(Math.random() * availablePlayers.length)];
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
