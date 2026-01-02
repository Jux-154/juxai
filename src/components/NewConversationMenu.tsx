import { useState } from "react";
import { Plus, Users, User, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CreateRoomDialog } from "./CreateRoomDialog";

interface NewConversationMenuProps {
  onCreateSolo: () => void;
  isAuthenticated: boolean;
  userPseudo: string | null;
  onNeedPseudo: () => void;
  onNeedAuth: () => void;
}

export const NewConversationMenu = ({
  onCreateSolo,
  isAuthenticated,
  userPseudo,
  onNeedPseudo,
  onNeedAuth,
}: NewConversationMenuProps) => {
  const [showCreateRoom, setShowCreateRoom] = useState(false);

  const handleMultiClick = () => {
    if (!isAuthenticated) {
      onNeedAuth();
      return;
    }
    if (!userPseudo) {
      onNeedPseudo();
      return;
    }
    setShowCreateRoom(true);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            className="w-full h-12 bg-gradient-to-r from-primary to-secondary text-primary-foreground font-semibold rounded-xl glow-button transition-all duration-200"
          >
            <Plus className="h-5 w-5 mr-2" />
            Nouvelle conversation
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" className="w-64">
          <DropdownMenuItem 
            onClick={onCreateSolo}
            className="flex items-center gap-3 py-3 cursor-pointer"
          >
            <User className="h-5 w-5 text-primary" />
            <div>
              <div className="font-medium">Conversation Solo</div>
              <div className="text-xs text-muted-foreground">Discutez seul avec Jux</div>
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={handleMultiClick}
            className="flex items-center gap-3 py-3 cursor-pointer"
          >
            <Users className="h-5 w-5 text-secondary" />
            <div className="flex-1">
              <div className="font-medium flex items-center gap-2">
                Conversation Multi
                {!isAuthenticated && <Lock className="h-3 w-3 text-muted-foreground" />}
              </div>
              <div className="text-xs text-muted-foreground">Jusqu'à 5 personnes</div>
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CreateRoomDialog 
        open={showCreateRoom} 
        onOpenChange={setShowCreateRoom}
      />
    </>
  );
};
