/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  calculateScore,
  DEFAULT_ROUND_DURATION,
  fetchTopics,
  getInitialState,
  getOrCreateGameState,
  getRandomTopic,
  GUESS_POINTS,
} from "@/lib/gameServices";
import {
  deletePlayer,
  fetchPlayers,
  getOrCreatePlayer,
  resetPlayerScores,
  selectNextDrawer,
  updatePlayerScore,
} from "@/lib/playerService";
import { GameState, Player, Topic } from "@/types";
import { assign, fromPromise, setup } from "xstate";

import { createBrowserInspector } from "@statelyai/inspect";
import { createActor } from "xstate";

const inspector = createBrowserInspector();

type DbEvent = "INSERT" | "UPDATE" | "DELETE";

// Context type combining all needed data
type GameContext = {
  gameState: GameState;
  players: Player[];
  currentPlayer?: Player;
  playerIdToDelete?: string;
  topics: Topic[];
  currentTopic?: Topic;
  isLoading: {
    players: boolean;
    game: boolean;
    topics: boolean;
  };
  loadingState: "loading" | "deletingPlayer" | "addingPlayer" | "idle";
};

// Events that can occur in the game

type DataLoadingEvent = { type: "DATA_LOADED" };
type AddPlayerEvent = { type: "ADD_PLAYER"; name: string };
type DeletePlayerEvent = { type: "DELETE_PLAYER"; id: string };
type SyncPlayerEvent = {
  type: "SYNC_PLAYER";
  data: {
    eventType: DbEvent;
    newPlayer: Player;
    oldPlayer: Player;
  };
};
type StartGameEvent = { type: "START_GAME" };
type StartDrawingEvent = { type: "START_DRAWING" };
type EndDrawingEvent = { type: "END_DRAWING"; timeLeft: number };
type SelectWinnerEvent = { type: "SELECT_WINNER"; winnerId: string };
type NewGameEvent = { type: "NEW_GAME" };
type SetTimerEvent = { type: "SET_TIMER"; seconds: number };

type GameEvent =
  | DataLoadingEvent
  | AddPlayerEvent
  | DeletePlayerEvent
  | SyncPlayerEvent
  | StartGameEvent
  | StartDrawingEvent
  | EndDrawingEvent
  | SelectWinnerEvent
  | NewGameEvent
  | SetTimerEvent;

// Add these types at the top
type LoadDataResult = {
  gameState: GameState;
  players: Player[];
  topics: Topic[];
};

export const gameMachine = setup({
  types: {} as {
    context: GameContext;
    events: GameEvent;
  },
  actors: {
    loadInitialData: fromPromise(async (): Promise<LoadDataResult> => {
      const gameId = "spindox";
      const [gameState, playersData, topicsData] = await Promise.all([
        getOrCreateGameState(gameId, getInitialState(DEFAULT_ROUND_DURATION)),
        fetchPlayers(),
        fetchTopics(),
      ]);

      return {
        gameState,
        players: playersData || [],
        topics: topicsData,
      };
    }),
    addPlayer: fromPromise<Player, { name: string }>(async ({ input }) => {
      const { player } = await getOrCreatePlayer(input.name);
      return player;
    }),
    deletePlayer: fromPromise<any, { id: string }>(async ({ input }) => {
      await deletePlayer(input.id);
    }),
    syncPlayer: fromPromise<SyncPlayerEvent, SyncPlayerEvent>(
      async ({ input }) => {
        return input;
      }
    ),
  },
  actions: {
    startGame: assign({
      gameState: ({ context }) => {
        const drawer = selectNextDrawer(context.players);
        const randomTopic = getRandomTopic(
          context.topics,
          context.gameState.pastTopics
        );

        return {
          ...context.gameState,
          currentDrawer: drawer,
          nextDrawer: null,
          currentTopic: randomTopic?.id,
          pastTopics: [...context.gameState.pastTopics, randomTopic?.id].filter(
            Boolean
          ) as string[],
          // status: "showTopic",
          timeLeft: context.gameState.currentRoundDuration,
        };
      },
    }),
    handleEndDrawing: assign({
      gameState: ({ context, event }) => {
        if (event.type !== "END_DRAWING") return context.gameState;

        const points = calculateScore(
          event.timeLeft,
          context.gameState.currentRoundDuration
        );
        const next = selectNextDrawer(
          context.players,
          context.gameState.currentDrawer?.id
        );

        if (context.gameState.currentDrawer) {
          updatePlayerScore(
            context.gameState.currentDrawer.id,
            context.gameState.currentDrawer.score + points,
            true
          );
        }

        return {
          ...context.gameState,
          // status: "waitingForWinner",
          nextDrawer: next,
          playedRounds: context.gameState.playedRounds + 1,
        };
      },
    }),
    setTimer: assign({
      gameState: ({ context, event }) => {
        console.log("event :>> ", event);
        if (event.type !== "SET_TIMER") return context.gameState;
        const state = {
          ...context.gameState,
          currentRoundDuration: event.seconds,
          timeLeft: event.seconds,
        };
        console.log("setTimer state :>> ", state);
        return state;
      },
    }),
    clearCanvas: () => {
      // This will be handled by the UI through an atom
    },
    handleWinnerSelection: assign({
      gameState: ({ context, event }) => {
        if (event.type !== "SELECT_WINNER") return context.gameState;

        const winner = context.players.find((p) => p.id === event.winnerId);
        if (winner) {
          updatePlayerScore(
            winner.id,
            winner.score + GUESS_POINTS,
            !!winner.hasPlayed
          );
        }

        return context.gameState;
      },
    }),
    prepareNextRound: assign({
      gameState: ({ context }) => {
        const randomTopic = getRandomTopic(
          context.topics,
          context.gameState.pastTopics
        );

        return {
          ...context.gameState,
          currentDrawer: context.gameState.nextDrawer,
          currentTopic: randomTopic?.id,
          pastTopics: [...context.gameState.pastTopics, randomTopic?.id].filter(
            Boolean
          ) as string[],
          // status: "showTopic",
          timeLeft: context.gameState.currentRoundDuration,
        };
      },
    }),
    resetGame: assign(({ context }) => {
      resetPlayerScores();
      const initialState = getInitialState(
        context.gameState.currentRoundDuration
      );
      return {
        ...context,
        gameState: {
          ...initialState,
          // status: "idle",
        },
      };
    }),
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5RQIYFswGIDKBNAcgMID6ACgDICCuAogEoDaADALqKgAOA9rAJYAuvLgDt2IAB6IAtAEYAzAFYAdAA4VCgCwAmGUy1aAbBoDsCgwBoQAT2kyZGpfL12AnC5kutcrQF8fl1AwlABsuFAheYShMCBEwJUiANy4Aa3jA+NDwyKgEJK4AYxRBEWYWMrFuPhLRJAlbJjklJmMVGU0NdRUXJgMVSxsEeSamdzs+mWMNFwMWvwD0ePCIqNJglCswACdMSgARPbIqWkZWSp4BIVrQSQQpHsczLRM1TxcNOQtrRDkNA0cVKYDAoZICtN1jPMQBklMs1httjE4glhMk0koYXD1pstnlUYVilcyhU6lVLiIxLd5C4lAZjHJ7AotL0DB5PANEJ0ZI9dApjKMmHyegYoTDYFZhAV4TikcJ4vl0WKJVLsds8ckijViWdSRcapTEM8moC7Ex2nSFG53hy7jItMYlL85KYNEwVDoDH0NKLFgkIMEsHsaOQaAAVGhHaj0EmcPVXA0IDSgxyuvme7wKM39b4IGmKFzOhRyJglwzGSH+aG+3j+rDYUOUOih4gAcUoAFkaDGQGT9XVbqyHcW-gonlM5DbvA4dLozS53So9C4fUEawGcGHiKGAJKd05sXXVeP9xCaGmzwwlnpFhk20FMVRyFQGcGL8Gjzor+IQMABwSrVUdliOUUTRdJfR-P8cmlNV8k1IlWG7XtjxuQ05BpXotEzYx0w0TQJxzZ4H3Q7xGktQVFEFL8lFgAALLgAHdQy4DheAKHAGybYg9joSgAHVt3wFskLjCkTwQd0aS0GZhRcYwsMzFwbQ+ZQix6X4kw+XpqIgLYUAYnJMBofBDh4-jBOEnVYyPMTUKGGQDCaK1510dDM00ZTFCUNTGg0TTixFSsYQYlBLiiAAxLgtj4yI5R2bBgxoQhmwE-B8GjKye1E656nskElHcYx5wolwFHUDQbSMB1LWdRo3H5ExvSC30ClosAChSFtFmwfhigAV1gTARJsnLbiBZoWndAwxneAjBjpLRVGZZkcPtQVQWo1r2s67rev4AahpkA9rPJUbEEc-5OndS0+Qc+ktBtUdFrpPy3EmhbqK4RJEXSvjWw7LtMuQ2zcr8-5Zk0HRpOmVps0GYx2kcSZxnpN0iqaythC4H94DqDJzhGhNZBUY1yp0PRDBMMwbSkfRlCcHRXTsP41GorIVigAnTqJ8ZvILcs3A8dp5AqnNZEcTx+XpPkyLUPlqOWaDAK5vs7KkNpaXBAtM06Yt1Dmw1WVUaacLpVo3GdBWIAgGCthVlDcrtf52lMaT3jK9RLUnaalBMTw6c9ek-mo8VJVt+2QapZQZk6PzDEmaWWhp+QHUc5x7Tw5402otcwAjs7E3LZoUf0abppLBRJz+AEgRBMEIR038wH-KBw8PbnxLp7yWfdLw52dO9eiUN3OiwqYvGeFQQ-opiWLY-OE09Z6iqMUZtD8pllLK7z2jK0x3A+EnAoWIJdP0nIF-E1zwcBEEN78ySt5UHfR1vg+n0+aiQrCqBIui2LtiXzsuMBwrRFJUznI5R69JfZml0PeaS3g5CbTah1LqGAer9VxidVWuUIQTVaHaSuOY6QPhlh6FSrJGifW+nbduuCxpFxJsyTQFczCshtPSZ+oxCzyHUO0OYfgfBAA */

  id: "game",
  initial: "loading",
  context: {
    gameState: getInitialState(DEFAULT_ROUND_DURATION),
    players: [],
    topics: [],
    isLoading: {
      players: true,
      game: true,
      topics: true,
    },
    loadingState: "idle",
  },
  on: {
    SYNC_PLAYER: ".syncPlayer",
  },
  states: {
    loading: {
      invoke: {
        src: "loadInitialData",
        onDone: {
          target: "addingPlayer",
          actions: assign({
            gameState: ({ event }) => event.output.gameState,
            players: ({ event }) => event.output.players,
            topics: ({ event }) => event.output.topics,
            isLoading: () => ({
              players: false,
              game: false,
              topics: false,
            }),
          }),
        },
      },
    },
    addingPlayer: {
      on: {
        ADD_PLAYER: {
          target: "addPlayer",
        },
      },
    },
    addPlayer: {
      invoke: {
        src: "addPlayer",
        input: ({ event }) => event as AddPlayerEvent,
        onDone: {
          target: "idle",
          actions: assign({
            currentPlayer: ({ event }) => event.output,
          }),
        },
      },
    },
    syncPlayer: {
      invoke: {
        src: "syncPlayer",
        input: ({ event }) => event as SyncPlayerEvent,
        onDone: {
          actions: assign({
            players: ({ context, event }) => {
              console.log("event :>> ", event);
              let newPlayers: Player[] = [...context.players];
              const payload = event.output;
              const { eventType, newPlayer, oldPlayer } = payload.data;

              if (eventType === "INSERT") {
                newPlayers = [...newPlayers, newPlayer];
              } else if (eventType === "DELETE") {
                newPlayers = newPlayers.filter((p) => p.id !== oldPlayer.id);
              } else if (eventType === "UPDATE") {
                newPlayers = newPlayers.map((p) =>
                  p.id === newPlayer.id ? newPlayer : p
                );
              }
              console.log("newPlayers :>> ", newPlayers);
              return newPlayers;
            },
          }),
        },
      },
    },
    idle: {
      on: {
        DELETE_PLAYER: {
          target: "deletingPlayer",
          actions: assign({
            playerIdToDelete: ({ event }) => (event as DeletePlayerEvent).id,
            loadingState: "deletingPlayer",
          }),
        },
        START_GAME: {
          target: "showTopic",
          guard: ({ context }) => context.players.length >= 2,
          actions: "startGame",
        },
        SET_TIMER: {
          actions: "setTimer",
        },
      },
    },
    deletingPlayer: {
      invoke: {
        src: "deletePlayer",
        input: ({ event }) => event as DeletePlayerEvent,
        onDone: {
          target: "idle",
          actions: assign({
            // players: ({ context }) =>
            //   context.players.filter(
            //     (player) => player.id !== context.playerIdToDelete
            //   ),
            playerIdToDelete: undefined,
            loadingState: "idle",
          }),
        },
      },
    },
    showTopic: {
      on: {
        START_DRAWING: {
          target: "drawing",
          actions: "clearCanvas",
        },
      },
    },

    drawing: {
      on: {
        END_DRAWING: {
          target: "waitingForWinner",
          actions: "handleEndDrawing",
        },
      },
    },

    waitingForWinner: {
      on: {
        SELECT_WINNER: {
          target: "checkGameStatus",
          actions: "handleWinnerSelection",
        },
      },
    },

    checkGameStatus: {
      always: [
        {
          target: "over",
          guard: ({ context }) =>
            context.gameState.playedRounds >= context.players.length,
        },
        {
          target: "showTopic",
          actions: "prepareNextRound",
        },
      ],
    },

    over: {
      on: {
        NEW_GAME: {
          target: "idle",
          actions: "resetGame",
        },
      },
    },
  },
});

// ...
const actor = createActor(gameMachine, {
  inspect: inspector.inspect,
});

actor.start();
