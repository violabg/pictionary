import { Timer } from "@/components/Timer";
import { Button } from "@/components/ui/button";
import { GameState } from "@/types";
import { Pause } from "lucide-react";
import { useState } from "react";

type Props = {
  gameState: GameState;
  isDrawer: boolean;
  onTimeUp: (time: number) => void;
};
const TimerWithButton = (props: Props) => {
  const { gameState, isDrawer, onTimeUp } = props;
  const [displayTime, setDisplayTime] = useState(
    gameState.currentRoundDuration
  );

  const onEndRound = () => {
    onTimeUp(displayTime);
  };

  return (
    <>
      {isDrawer && (
        <Button onClick={onEndRound} size="sm" variant="destructive">
          <Pause />
          End Round
        </Button>
      )}
      <div className="bg-white/90 p-4 rounded-lg">
        <Timer
          displayTime={displayTime}
          setDisplayTime={setDisplayTime}
          isActive={gameState.status === "drawing"}
          onTimeUp={onTimeUp}
        />
      </div>
    </>
  );
};

export default TimerWithButton;
