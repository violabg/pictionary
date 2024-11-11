"use client";

import { jotaiStore } from "@/atoms/store";
import { GameController } from "@/components/GameController";
import { Provider } from "jotai";
import Whiteboard from "../Whiteboard";

export default function Pictionary() {
  return (
    <Provider store={jotaiStore}>
      <div className="gap-2 grid grid-cols-[300px_1fr] grid-rows-[auto_1fr] [grid-template-areas:'sidebar_header'_'sidebar_content'] p-2 h-[100vh]">
        <aside className="[grid-area:sidebar]">
          <GameController />
        </aside>
        <Whiteboard />
      </div>
    </Provider>
  );
}
