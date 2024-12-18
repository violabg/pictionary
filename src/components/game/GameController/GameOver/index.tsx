"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Player } from "@/types";
import { Trophy } from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const Confetti = dynamic(() => import("react-confetti"), { ssr: false });

type Props = {
  players: Player[];
  onNewGame: () => void;
};

export function GameOver({ players, onNewGame }: Props) {
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== "undefined" ? window.innerWidth : 0,
    height: typeof window !== "undefined" ? window.innerHeight : 0,
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <Card>
      <Confetti
        width={windowSize.width}
        height={windowSize.height}
        recycle={false}
        numberOfPieces={500}
      />
      <CardHeader>
        <CardTitle className="text-2xl text-center text-primary">
          Game Over!
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {players.map((player, index) => (
            <div
              key={player.id}
              className={`flex items-center gap-2 ${
                index === 0 ? "text-xl font-bold" : ""
              }`}
            >
              {index === 0 && <Trophy className="text-yellow-500" />}
              <span>
                {index + 1}. {player.name}
              </span>
              <span className="text-sm">({player.score} pts)</span>
            </div>
          ))}
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={onNewGame} className="mt-4 w-full">
          Play Again
        </Button>
      </CardFooter>
    </Card>
  );
}
