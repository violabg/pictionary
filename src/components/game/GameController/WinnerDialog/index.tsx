import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Player, Topic } from "@/types";
import { useState } from "react";
import { TopicCard } from "../TopicCard";

interface WinnerDialogProps {
  open: boolean;
  players: Player[];
  currentDrawer?: Player | null;
  onSelectWinner: (playerId: string) => void;
  onOpenChange?: (open: boolean) => void;
  topic?: Topic | null;
}

export function WinnerDialog({
  open,
  players,
  currentDrawer,
  onSelectWinner,
  onOpenChange,
  topic,
}: WinnerDialogProps) {
  const [selectedPlayer, setSelectedPlayer] = useState<string>("");
  const eligiblePlayers = players.filter((p) => p.id !== currentDrawer?.id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader className="gap-2">
          <DialogTitle>Correct answer:</DialogTitle>
        </DialogHeader>
        {topic && <TopicCard topic={topic} />}
        <p className="font-bold text-sm">
          Select the player who correctly guessed the word.
        </p>
        <RadioGroup
          value={selectedPlayer}
          onValueChange={setSelectedPlayer}
          className="gap-4"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="none" id="none" />
            <Label htmlFor="none">Nessuno</Label>
          </div>
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
