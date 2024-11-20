import {
  currentPlayerAtom,
  gameStateAtom,
  loadingStatusAtom,
  playersAtom,
} from "@/atoms";
import { Card } from "@/components/ui/card";
import { deletePlayer, getOrCreatePlayer } from "@/lib/playerService";
import { useAtom, useAtomValue } from "jotai";
import { Loader, Pencil, Trash } from "lucide-react";
import { useState } from "react";
import { AddPlayerDialog } from "../AddPlayerDialog";

export function PlayersList() {
  const gameState = useAtomValue(gameStateAtom);
  const [players, setPlayers] = useAtom(playersAtom);
  const [loadingStatus, setLoadingStatus] = useAtom(loadingStatusAtom);
  const [currentPlayer, setCurrentPlayer] = useAtom(currentPlayerAtom);
  const [showAuthDialog, setShowAuthDialog] = useState(!currentPlayer);
  const [deletingPlayerId, setDeletingPlayerId] = useState<string | null>(null);

  const handleAddPlayer = async (name: string) => {
    setLoadingStatus("addingPlayer");
    const { player } = await getOrCreatePlayer(name);
    setCurrentPlayer(player);
    setLoadingStatus("idle");
    setShowAuthDialog(false);
  };

  const handleDeletePlayer = async (playerId: string) => {
    setDeletingPlayerId(playerId);
    await deletePlayer(playerId);
    setPlayers((current) => current.filter((p) => p.id !== playerId));
    setDeletingPlayerId(null);
  };

  return (
    <Card className="space-y-1 px-2 py-4">
      {players.map((player) => {
        return (
          <div
            key={player.id}
            className={`flex items-center gap-2 py-1 px-2 rounded-md ${
              gameState.currentDrawer?.id === player.id
                ? " text-white border border-secondary"
                : ""
            }`}
          >
            <span
              className={`${
                player.id === currentPlayer?.id ? "font-bold" : ""
              }`}
            >
              {player.name}
            </span>
            <span className="text-sm">({player.score} pts)</span>
            {gameState.currentDrawer?.id === player.id && (
              <Pencil className="ml-auto w-4 h-4 text-primary" />
            )}
            {gameState.status === "idle" && player.id !== currentPlayer?.id && (
              <button
                className="ml-auto"
                onClick={() => handleDeletePlayer(player.id)}
                disabled={deletingPlayerId === player.id}
              >
                {deletingPlayerId === player.id ? (
                  <Loader className="w-5 h-5 text-red-500 animate-spin" />
                ) : (
                  <Trash className="w-5 h-5 text-red-500" />
                )}
              </button>
            )}
          </div>
        );
      })}
      {showAuthDialog && (
        <AddPlayerDialog
          isLoading={loadingStatus === "addingPlayer"}
          open={true}
          onOpenChange={() => {}}
          onAddPlayer={handleAddPlayer}
        />
      )}
    </Card>
  );
}

export default PlayersList;
