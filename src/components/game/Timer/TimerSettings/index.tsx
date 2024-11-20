import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Clock } from "lucide-react";
import { useState } from "react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSetTimer: (seconds: number) => void;
  currentTime: number;
};

export function TimerSettings({
  open,
  onOpenChange,
  onSetTimer,
  currentTime,
}: Props) {
  const [seconds, setSeconds] = useState(currentTime);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSetTimer(seconds);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Set Round Duration</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <Input
              type="number"
              min={10}
              max={300}
              value={seconds}
              onChange={(e) => setSeconds(Number(e.target.value))}
            />
            <span className="text-sm">seconds</span>
          </div>
          <Button type="submit" className="w-full">
            Save
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
