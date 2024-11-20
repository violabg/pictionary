import { DrawingData } from "@/types";
import { RealtimeChannel } from "@supabase/supabase-js";

export class CanvasSyncManager {
  constructor(private channel: RealtimeChannel) {}

  broadcastDraw(drawingData: DrawingData) {
    this.channel?.send({
      type: "broadcast",
      event: "draw-line",
      payload: drawingData,
    });
  }

  broadcastUndo(base64History: string[]) {
    this.channel?.send({
      type: "broadcast",
      event: "undo-drawing",
      payload: { history: base64History },
    });
  }

  broadcastClear() {
    this.channel?.send({
      type: "broadcast",
      event: "clear-canvas",
    });
  }

  subscribe(handlers: {
    onDraw: (data: DrawingData) => void;
    onUndo: (history: string[]) => void;
    onClear: () => void;
  }) {
    this.channel.on("broadcast", { event: "draw-line" }, ({ payload }) => {
      handlers.onDraw(payload);
    });

    this.channel.on("broadcast", { event: "undo-drawing" }, ({ payload }) => {
      handlers.onUndo(payload.history);
    });

    this.channel.on("broadcast", { event: "clear-canvas" }, () => {
      handlers.onClear();
    });

    return () => this.channel.unsubscribe();
  }
}
