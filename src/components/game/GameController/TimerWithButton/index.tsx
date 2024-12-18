import { Timer } from "@/components/game/Timer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
      <Card className="p-4">
        <Timer
          displayTime={displayTime}
          setDisplayTime={setDisplayTime}
          isActive={gameState.status === "drawing"}
          onTimeUp={onTimeUp}
        />
      </Card>
    </>
  );
};

export default TimerWithButton;
