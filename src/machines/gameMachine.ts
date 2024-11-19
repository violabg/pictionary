/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  calculateScore,
  DEFAULT_ROUND_DURATION,
  fetchTopics,
  getInitialState,
  getOrCreateGameState,
  getRandomTopic,
  GUESS_POINTS,
  updateGame,
} from "@/lib/gameServices";
import {
  deletePlayer,
  fetchPlayers,
  getOrCreatePlayer,
  getPlayerById,
  resetPlayerScores,
  selectNextDrawer,
  updatePlayerScore,
} from "@/lib/playerService";
import { GameState, GameStateRemote, Player, Topic } from "@/types";
import { assign, fromPromise, setup } from "xstate";

import { createBrowserInspector } from "@statelyai/inspect";
import { createActorContext } from "@xstate/react";
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
  loadingState: "loadingData" | "deletingPlayer" | "addingPlayer" | "idle";
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
type SyncGameStateEvent = {
  type: "SYNC_GAME_STATE";
  data: {
    eventType: DbEvent;
    newState: GameStateRemote;
    oldState: GameStateRemote;
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
  | SyncGameStateEvent
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

export const gameId = "spindox";

export const gameMachine = setup({
  types: {} as {
    context: GameContext;
    events: GameEvent;
  },
  actors: {
    loadInitialData: fromPromise(async (): Promise<LoadDataResult> => {
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
    syncGameState: fromPromise<SyncGameStateEvent, SyncGameStateEvent>(
      async ({ input }) => {
        return input;
      }
    ),
    updateGameState: fromPromise<GameState, GameState>(async ({ input }) => {
      await updateGame(gameId, input);
      return input;
    }),
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
        if (event.type !== "SET_TIMER") return context.gameState;
        const state = {
          ...context.gameState,
          currentRoundDuration: event.seconds,
          timeLeft: event.seconds,
        };
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
  /** @xstate-layout N4IgpgJg5mDOIC5RQIYFswGIDKBNAcgMID6ACgDICCuAogEoDaADALqKgAOA9rAJYAuvLgDt2IAB6IAtAEYAzAFYAdAA4VCgCwAmGUy1aAbBoDsCgwBoQAT2kyZGpfL12AnC5kutcrQF8fl1AwcAhIAcUoAWRpibAAVSliaZjYkEG4+QRExSQQNE1UVYxNvBVMmXTlLGwRZe0c5ZxkDLRdnfT8A9DAlABsuFAheYShMCBFuoYA3LgBrbsDuvoGhqAQprgBjFEzhZOSxdIEhUVSc2SY5JSZjFRlNDXUVVoMVKsR5S6Z3OxeZIpcDNcOiAFkoBoNhqQeigrGAAE6YSgAESRZCotEYrAOPCOWVO0lajjMWhMak8Lg0cgs1kQcg0BkchTMChkhS0T2MwNB4KhMPho3GSnWcyU3IgEF5sLha2E0y2Oz2WNShx22XechcSgMxjk9gUWiYBgMHk8b1ytyJulKXyYpWeXK6SlgVmEG0l-LGwgmstm80dztd7ul63lx0VKU4ONV+IQJMuhTs5TMpjcFLNsi0xiUdLkpg0TBUOiNKg0DowTpdG1CXWw-G2WE93umItBAarNbr-DAMrl2zDrH2yqjxzVCE8lwpOs8RWMRhcxnT8gZxqY+YpT31GgUcjLEwgPSwSJo5BoiTR1Hog8jGRHMY0rMc+dKRpK5VeNLH2YULlz26Y-8MYxOX8EFHV4fcsDiSg6FiYhwiiK80mHPFQByY0swaekFGJIpKg-bwHB0XRyhcQsVD0FxdyFCCcFPYhYgASSiTEIyQm8UIkRBNE1YjDH-Vpt11M1WSYVQ5BUZo1D0dRNBUKiIDAA9BEhaEpQFL0hR9FtHQUpSViDHtNj7ERw2xdiTlQxAvE1Q0tAUa4Xy3SkzRJUSNW8C5v1tRRbSo2AAAsuAAd1iLgOF4DYcHiGDiCROhKAAdQY-BQkQlVb0shBC01FoDGeec7PslwzUpZRt1aOl70pQ15LhFAgpWTAaHwVE4sS5LUqVa9cQsziEB+CdU1uC4XHszQSsUJRyouPJ7AaAwqKClAjmGAAxLg4QSoYvQRbBjxoQhYKS-B8EvLq2J60c7BZJR3GMUjvNG9QNDNIws2-XMRvnVciiojZ-LADYZmrDBa22ABXWBMDS5DepyUwGX-G5DG+Ck8OqbUtFUA0DVnTNbVZP6AaBkGwDB-hIehmRWPSji0KpJQHkLb9SiaHUtDNbCse1PI3GuCTjF8EDQS4SZ+VOhK4MiJJztpuHEDyZdbW0GQWg0ec1DNYw7kcP4fh1At7tLYFhC4BT4FSBYzMumNZBUeNnp0PRDBMMx0y8LNKSNzRMz11WqKWCEoGt6NMtqBkPqAtwPDueQXo-WRHGna5FGMTy1FKKjwX01T4RDjK+qkC1JJ-eyHgadR0as41VDy2dtRuNxcyz8Ug3zun3kMIlTBaCkFAz78zSpTUTE8fQzG1OkFuF-1KzbodzKu5QAQePJDD+HV7IXBP5CzAwGh0TMtxJZ8-MrUnybAdv5YQbUVCUQW3G3NPbmJRd1du3NxxLDcPAUKjwIHmvqOEwWZyhs30HlPK-4FBD3pIyBGLI2QcnkopMAykoDz26qHPq48pr0jUPoBoHhczCUNEoXuDw7JFC8CSOSM9ywBWCqFcKGxgExiNNze6RgvjaDyPqEq-cpp3H7imOa9tp6dHLBAOqDVhjsMyhUZcTJ7BOSocVD8W574smwkydwlIJGLWWhg9am1tp5wXjbRRTQHA3CKq7Ei+9OY6kZuAt8FFvA7gYd0f6gNgYdghhbbBBccgciuPzVWsCPzalEtaIspUVxeKkd0UWFjgkdwQEBLM9sDSaBgRPGQWtxJXB-KYeQ6g7hAj8D4IAA */

  id: "game",
  initial: "loading",
  context: {
    gameState: getInitialState(DEFAULT_ROUND_DURATION),
    players: [],
    topics: [],
    loadingState: "loadingData",
  },
  on: {
    SYNC_PLAYER: ".syncPlayer",
    SYNC_GAME_STATE: ".syncGameState",
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
            loadingState: "idle",
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
              return newPlayers;
            },
          }),
        },
      },
    },
    syncGameState: {
      invoke: {
        src: "syncGameState",
        input: ({ event }) => event as SyncGameStateEvent,
        onDone: {
          actions: assign({
            gameState: ({ context, event }) => {
              const payload = event.output;
              const { eventType, newState } = payload.data;

              if (eventType === "INSERT" || eventType === "UPDATE") {
                const {
                  currentDrawer: _currentDrawer,
                  nextDrawer: _nextDrawer,
                  ...rest
                } = newState;

                const nextDrawer = getPlayerById(
                  context.players,
                  _nextDrawer ?? ""
                );
                const currentDrawer = getPlayerById(
                  context.players,
                  _currentDrawer ?? ""
                );
                return {
                  ...rest,
                  currentDrawer,
                  nextDrawer,
                };
              }
              return context.gameState;
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

export default createActorContext(gameMachine);

// ...
const actor = createActor(gameMachine, {
  inspect: inspector.inspect,
});

actor.start();
