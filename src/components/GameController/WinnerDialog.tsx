import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Player } from "@/types";
import { useState } from "react";

interface WinnerDialogProps {
  open: boolean;
  players: Player[];
  currentDrawer?: Player | null;
  onSelectWinner: (playerId: string) => void;
  onOpenChange: (open: boolean) => void;
}

export function WinnerDialog({
  open,
  players,
  currentDrawer,
  onSelectWinner,
  onOpenChange,
}: WinnerDialogProps) {
  const [selectedPlayer, setSelectedPlayer] = useState<string>("");
  const eligiblePlayers = players.filter((p) => p.id !== currentDrawer?.id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Who guessed the word?</DialogTitle>
          <DialogDescription>
            Select the player who correctly guessed the word.
          </DialogDescription>
        </DialogHeader>
        <RadioGroup
          value={selectedPlayer}
          onValueChange={setSelectedPlayer}
          className="gap-4"
        >
          {eligiblePlayers.map((player) => (
            <div key={player.id} className="flex items-center space-x-2">
              <RadioGroupItem value={player.id} id={player.id} />
              <Label htmlFor={player.id}>{player.name}</Label>
            </div>
          ))}
        </RadioGroup>
        <Button
          disabled={!selectedPlayer}
          onClick={() => onSelectWinner(selectedPlayer)}
        >
          Confirm Winner
        </Button>
      </DialogContent>
    </Dialog>
  );
}
