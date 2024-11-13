// Constants

import { Player, Topic } from "@/types";

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
