"use client";

import { useEffect } from "react";

type Props = {
  displayTime: number;
  isActive: boolean;
  setDisplayTime: (timeLeft: number) => void;
  onTimeUp: (timeLeft: number) => void;
};

export function Timer({
  isActive,
  displayTime,
  setDisplayTime,
  onTimeUp,
}: Props) {
  useEffect(() => {
    if (!isActive) return;

    const interval = setInterval(() => {
      if (displayTime <= 1) {
        clearInterval(interval);
        setTimeout(() => onTimeUp(displayTime), 0);
        return setDisplayTime(0);
      }
      return setDisplayTime(displayTime - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, onTimeUp, setDisplayTime, displayTime]);

  return (
    <div className="font-bold text-2xl">
      {Math.floor(displayTime / 60)}:
      {(displayTime % 60).toString().padStart(2, "0")}
    </div>
  );
}
