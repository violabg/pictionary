import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Loader } from "lucide-react";
import { useState } from "react";

type Props = {
  isLoading: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddPlayer: (name: string) => void;
};

export function AddPlayerDialog({
  isLoading,
  open,
  onOpenChange,
  onAddPlayer,
}: Props) {
  const [playerName, setPlayerName] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (playerName.trim()) {
      onAddPlayer(playerName);
      setPlayerName("");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Player</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            placeholder="Player name"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            autoFocus
          />
          <DialogFooter>
            <Button type="submit" disabled={isLoading || !playerName.trim()}>
              Add Player
              {isLoading && <Loader className="mr-2 w-4 h-4" />}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
