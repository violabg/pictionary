import { supabase } from "@/lib/supabaseClient";
import { GameState, GameStateRemote, Player, Topic } from "@/types";

export const POINTS_MULTIPLIER = 20;
export const MIN_PLAYERS = 2;
export const GUESS_POINTS = 5;

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

export const fetchGameState = async (gameId: string) => {
  const { data } = await supabase
    .from("games")
    .select("*")
    .eq("room_id", gameId)
    .single();
  return data;
};

export const createGameState = async (
  gameId: string,
  initialState: GameState
) => {
  const { data } = await supabase
    .from("games")
    .insert([{ room_id: gameId, ...initialState }])
    .select()
    .single();
  return data;
};

export const updateGameState = async (gameId: string, newState: GameState) => {
  const { id, ...rest } = newState;
  const state: GameStateRemote = {
    ...rest,
    currentDrawer: newState.currentDrawer?.id ?? null,
    nextDrawer: newState.nextDrawer?.id ?? null,
  };

  await supabase.from("games").update(state).eq("room_id", gameId);
};

export const fetchTopics = async (): Promise<Topic[]> => {
  const { data } = await supabase.from("topics").select("*");
  return data || [];
};

export const subscribeToGameChanges = (
  gameId: string,
  callback: (game: GameStateRemote) => void
) => {
  return supabase
    .channel("games")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "games",
        filter: `room_id=eq.${gameId}`,
      },
      (payload) => {
        if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
          callback(payload.new as GameStateRemote);
        }
      }
    )
    .subscribe();
};
