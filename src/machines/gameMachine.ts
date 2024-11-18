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
  resetPlayerScores,
  selectNextDrawer,
  updatePlayerScore,
} from "@/lib/playerService";
import { supabase } from "@/lib/supabaseClient";
import { GameState, Player, Topic } from "@/types";
import { assign, fromPromise, setup } from "xstate";

// Context type combining all needed data
type GameContext = {
  gameState: GameState;
  players: Player[];
  topics: Topic[];
  currentTopic?: Topic;
  isLoading: {
    players: boolean;
    game: boolean;
    topics: boolean;
  };
  currentPlayer?: Player;
};

// Events that can occur in the game
type GameEvent =
  | { type: "DATA_LOADED" }
  | { type: "ADD_PLAYER"; name: string }
  | { type: "START_GAME" }
  | { type: "START_DRAWING" }
  | { type: "END_DRAWING"; timeLeft: number }
  | { type: "SELECT_WINNER"; winnerId: string }
  | { type: "NEW_GAME" }
  | { type: "SET_TIMER"; seconds: number };

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
        supabase.from("players").select("*"),
        fetchTopics(),
      ]);

      return {
        gameState,
        players: playersData?.data || [],
        topics: topicsData,
      };
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
        return {
          ...context.gameState,
          currentRoundDuration: event.seconds,
          timeLeft: event.seconds,
        };
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
  /** @xstate-layout N4IgpgJg5mDOIC5RQIYFswDoA2B7FEAlgHZQDEEuxWJAbrgNZaoY75GkJ24DGKALoSoBtAAwBdMeMSgADrliFBVGSAAeiAGwAWAKyZRAZgCMxgJy7Nhs5oAcAdm0AaEAE9E2q5m2jNAJl1bT01je1E-bQBfSJcWGghsMDIAZQAVAEEAJVSAfQBxdIBZAFEpVXlFZWJVDQQzR0wgw017G20zM21DPxd3BE9jTDNfP39w2z9W3WjY9HjElOLc1IBJEsyypBAKpSFqrdqzP1tMVuHwwIjjZzdEQ27Ma9FTQ1FdX11DbSiYkDjMWAAC1wAHdUrhZIQeCkMtkcgARTLpADqKwAcnlNnIFLsVAdEMZ7oZMJpnno-ISrLZRGZeh5dNoSZYIvZNJ8whYZn85pgIAAnFAgkjkYpo+EIpGojFY7Y4qo1AlWTQGEzGZ6iVp+Qy6On9BlM-zaVnsmnTX7-EEoXakABiuD5yJI1D5iwAMsUAMK5KVo4obCTlOV7BUIYxKlWmdWa7W62yDdodCxGXRa7S2Ln-HiAsA8Bh5ObJfgCACusDIMp28vxCCuQ0TZjjtlJXzeuusfkeoXMgQZdl7GZ5WZzeYLRf4pfLxmkW0rwertfrDeMTaMPh1txrAUwx2GIWXfgCx3T5p5uFoYBdvuR+SKpQDM6DeNAtR0+iMpgsVhsDhufWayomONRlCCkW0MaJfmIXAIDgVQ4kDSo52fRAAFpNF1NCDFEbCiV0exRgiEwB1YPACGFBDcX2ZD+lGEku17doGXaXUBiGPQvl0cxjHecJiPmMAKKraim2JbQ1TVc5DDCVsNzTfRvk+KS3msTozD4gFgTBCEoUEpD1AJPwjEaQyKWeaw3jwlj7BObtJl8ewwlCSx1P5QVyIfRCn300MU0ZMTrG1MwWz8WlZOsx4LG6UZWm0CIm3Uy1rSgO0HSdC9dK82pl3ebd2ibIIyUmUK+iNDs9yOELNDMUwfE0dSh1zfMMELEt4A8yiQ1ittWm8Cq3isexzGsuqT1YM90vaoTvPaYlDKq6qDwcHc22GTBmnw54hqCToIMiIA */

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
  },
  states: {
    loading: {
      invoke: {
        src: "loadInitialData",
        onDone: {
          target: "idle",
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
    idle: {
      on: {
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
