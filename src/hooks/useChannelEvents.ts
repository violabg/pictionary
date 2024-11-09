import { useSupabase } from "@/contexts/SupabaseContext";
import { supabase } from "@/lib/supabaseClient";
import { CurrentPlayer, DrawingData, GameState, Player } from "@/types";
import { base64ToImageData } from "@/utils/canvas";
import { useEffect } from "react";
import { GameActions } from "./useGameState";

interface UseSocketEventsParams {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  gameActions: GameActions;
  clearCanvas: () => void;
  handleDrawOperation: (drawingData: DrawingData, flag: boolean) => void;
  onGameStateUpdate: (state: GameState) => void;
  setHistory: (history: ImageData[]) => void;
  updateCanvasFromHistory: (history: ImageData[]) => void;
  onPlayerSync?: (player: Player) => void;
}

export function useChannelEvents({
  canvasRef,
  gameActions,
  clearCanvas,
  handleDrawOperation,
  onGameStateUpdate,
  setHistory,
  updateCanvasFromHistory,
  onPlayerSync,
}: UseSocketEventsParams) {
  const { channel } = useSupabase();

  useEffect(() => {
    if (!channel) return;

    const handleDrawLine = (drawingData: DrawingData) => {
      console.log("drawingData :>> ", drawingData);
      handleDrawOperation(drawingData, true);
    };

    const handleUndoDrawing = async (data: { history: string[] }) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const newHistory: ImageData[] = [];

      // Convert and apply all history states
      for (const base64 of data.history) {
        try {
          const imageData = await base64ToImageData(base64, canvas);
          newHistory.push(imageData);
        } catch (error) {
          console.error("Failed to convert history state:", error);
        }
      }

      setHistory(newHistory);
      updateCanvasFromHistory(newHistory);
    };

    const handleGameStateUpdate = (newGameState: GameState) => {
      onGameStateUpdate(newGameState);
    };

    channel.on("broadcast", { event: "draw-line" }, ({ payload }) => {
      console.log("game-state-update :>> ", payload);
      handleDrawLine(payload);
    });
    channel.on("broadcast", { event: "undo-drawing" }, ({ payload }) => {
      handleUndoDrawing(payload);
    });
    channel.on("broadcast", { event: "game-state-update" }, ({ payload }) => {
      console.log("game-state-update :>> ", payload);
      handleGameStateUpdate(payload);
    });
    channel.on("broadcast", { event: "clear-canvas" }, () => {
      clearCanvas();
    });

    supabase
      .channel("custom-all-channel")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "players" },
        (payload) => {
          console.log("Change received!", payload);
          if (payload.eventType === "INSERT") {
            const player = payload.new as CurrentPlayer;
            gameActions.addPlayer(player.name);
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [
    canvasRef,
    clearCanvas,
    handleDrawOperation,
    onGameStateUpdate,
    setHistory,
    channel,
    updateCanvasFromHistory,
    onPlayerSync,
    gameActions,
  ]);

  return channel;
}
