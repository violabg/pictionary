// Constants

import { supabase } from "@/lib/supabaseClient";
import { GameState, GameStateRemote, Topic } from "@/types";

export const POINTS_MULTIPLIER = 20;
export const MIN_PLAYERS = 2;
export const GUESS_POINTS = 5;

export const getRandomTopic = (
  topics: Topic[],
  usedTopicIds: string[]
): Topic => {
  const availableTopics = topics.filter(
    (topic) => !usedTopicIds.includes(topic.id)
  );
  return availableTopics[Math.floor(Math.random() * availableTopics.length)];
};

export const calculateScore = (timeLeft: number, roundDuration: number) =>
  Math.round((timeLeft / roundDuration) * POINTS_MULTIPLIER);

export const updateGame = async (gameId: string, newState: GameState) => {
  const { id, ...rest } = newState;
  const state: GameStateRemote = {
    ...rest,
    currentDrawer: newState.currentDrawer?.id ?? null,
    nextDrawer: newState.nextDrawer?.id ?? null,
  };

  return await supabase.from("games").update(state).eq("room_id", gameId);
};

export const fetchTopics = async () => {
  const { data } = await supabase.from("topics").select("*");
  return data ?? [];
};

export const getOrCreateGameState = async (
  gameId: string,
  initialState: GameState
) => {
  const { data } = await supabase
    .from("games")
    .select("*")
    .eq("room_id", gameId)
    .single();

  // create a new game state if none exists
  if (!data) {
    const { data: newGameState } = await supabase
      .from("games")
      .insert([{ room_id: gameId, ...initialState }])
      .select()
      .single();
    return newGameState;
  }

  return data;
};
