"use client";

import { useEffect } from "react";

interface TimerProps {
  timeLeft: number;
  setTimeLeft: (time: number) => void;
  onTimeUp: () => void;
  isActive: boolean;
}

export function Timer({
  timeLeft,
  setTimeLeft,
  onTimeUp,
  isActive,
}: TimerProps) {
  useEffect(() => {
    if (!isActive) return;

    const interval = setInterval(() => {
      setTimeLeft((time) => {
        if (time <= 1) {
          clearInterval(interval);
          setTimeout(() => onTimeUp(), 0);
          return 0;
        }
        return time - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, onTimeUp, setTimeLeft]);

  return (
    <div className="font-bold text-2xl">
      {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, "0")}
    </div>
  );
}
