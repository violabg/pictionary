// Constants

import { supabase } from "@/lib/supabaseClient";
import { GameState, GameStateRemote, Player, Topic } from "@/types";

export const DEFAULT_ROUND_DURATION = 150;
export const GUESS_POINTS = 5;
export const MIN_PLAYERS = 2;
export const POINTS_MULTIPLIER = 20;

// Initial State
export const getInitialState = (roundDuration: number): GameState => ({
  status: "idle",
  currentDrawer: null,
  nextDrawer: null,
  playedRounds: 0,
  currentRoundDuration: roundDuration,
  timeLeft: roundDuration,
  currentTopic: null,
  pastTopics: [],
});

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

export const convertRemoteToLocal = (
  remote: GameStateRemote,
  getPlayerById: (id: string | null) => Player | undefined
): GameState => {
  const {
    currentDrawer: currentDrawerId,
    nextDrawer: nextDrawerId,
    ...rest
  } = remote;

  return {
    ...rest,
    currentDrawer: getPlayerById(currentDrawerId),
    nextDrawer: getPlayerById(nextDrawerId),
  } as GameState;
};

/************
 * API calls
 * **********/

export const fetchTopics = async () => {
  const { data } = await supabase.from("topics").select("*");
  return data ?? [];
};

export const getGameState = async (gameId: string) => {
  const { data } = await supabase
    .from("games")
    .select("*")
    .eq("room_id", gameId)
    .single();

  return data as GameStateRemote | null;
};

export const getOrCreateGameState = async (
  gameId: string,
  initialState: GameState
) => {
  const data = await getGameState(gameId);

  // create a new game state if none exists
  if (!data) {
    const { data: newGameState } = await supabase
      .from("games")
      .insert([{ room_id: gameId, ...initialState }])
      .select()
      .single();
    return newGameState;
  } else if (data.status !== "idle") {
    const { data: updatedGameState } = await supabase
      .from("games")
      .update(initialState)
      .eq("room_id", gameId)
      .select()
      .single();
    return updatedGameState;
  }

  return data;
};

export const updateGame = async (gameId: string, newState: GameState) => {
  const { id, ...rest } = newState;
  const state: GameStateRemote = {
    ...rest,
    currentDrawer: newState.currentDrawer?.id ?? null,
    nextDrawer: newState.nextDrawer?.id ?? null,
  };

  return await supabase.from("games").update(state).eq("room_id", gameId);
};
