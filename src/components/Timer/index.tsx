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
      if (timeLeft <= 1) {
        clearInterval(interval);
        setTimeout(() => onTimeUp(), 0);
        return setTimeLeft(0);
      }
      return setTimeLeft(timeLeft - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, onTimeUp, setTimeLeft, timeLeft]);

  return (
    <div className="font-bold text-2xl">
      {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, "0")}
    </div>
  );
}
