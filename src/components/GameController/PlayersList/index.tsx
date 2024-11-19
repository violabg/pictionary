import { Card } from "@/components/ui/card";
import GameMachineContext from "@/machines/gameMachine";
import { Loader, Pencil, Trash } from "lucide-react";
import { useState } from "react";
import { AddPlayerDialog } from "../AddPlayerDialog";

export function PlayersList() {
  const { send } = GameMachineContext.useActorRef();
  const gameState = GameMachineContext.useSelector(
    (state) => state.context.gameState
  );
  const players = GameMachineContext.useSelector(
    (state) => state.context.players
  );
  const currentPlayer = GameMachineContext.useSelector(
    (state) => state.context.currentPlayer
  );
  const playerIdToDelete = GameMachineContext.useSelector(
    (state) => state.context.playerIdToDelete
  );
  const [showAuthDialog, setShowAuthDialog] = useState(!currentPlayer);

  const handleAddPlayer = async (name: string) => {
    send({ type: "ADD_PLAYER", name });
    setShowAuthDialog(false);
  };

  const handleDeletePlayer = async (id: string) => {
    send({ type: "DELETE_PLAYER", id });
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
                disabled={playerIdToDelete === player.id}
              >
                {playerIdToDelete === player.id ? (
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
          open={true}
          onOpenChange={() => {}}
          onAddPlayer={handleAddPlayer}
        />
      )}
    </Card>
  );
}

export default PlayersList;
