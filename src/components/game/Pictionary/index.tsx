"use client";

import { showDrawingToolsAtom } from "@/atoms";
import { jotaiStore } from "@/atoms/store";
import { GameController } from "@/components/game/GameController";
import { Provider, useAtomValue } from "jotai";
import Whiteboard from "../Whiteboard";

function PictionaryContent() {
  const showDrawingTools = useAtomValue(showDrawingToolsAtom);

  return (
    <div
      className={`gap-2 grid grid-cols-[300px_1fr] ${
        showDrawingTools
          ? "grid-rows-[auto_1fr] [grid-template-areas:'sidebar_header'_'sidebar_content']"
          : "grid-rows-[1fr] [grid-template-areas:'sidebar_content']"
      } p-2 h-[100vh]`}
    >
      <GameController />
      <Whiteboard />
    </div>
  );
}

export default function Pictionary() {
  return (
    <Provider store={jotaiStore}>
      <PictionaryContent />
    </Provider>
  );
}
