import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Copy, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CreateRoomDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const generateRoomCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let code = '';
  for (let i = 0; i < 16; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

export const CreateRoomDialog = ({ open, onOpenChange }: CreateRoomDialogProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isCreating, setIsCreating] = useState(false);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCreateRoom = async () => {
    setIsCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: "Erreur", description: "Vous devez être connecté", variant: "destructive" });
        return;
      }

      const code = generateRoomCode();
      
      // Create the room
      const { data: room, error: roomError } = await supabase
        .from('multi_rooms')
        .insert({
          code,
          host_id: user.id,
        })
        .select()
        .single();

      if (roomError) throw roomError;

      // Add host as admin member
      const { error: memberError } = await supabase
        .from('room_members')
        .insert({
          room_id: room.id,
          user_id: user.id,
          role: 'admin',
        });

      if (memberError) throw memberError;

      setRoomCode(code);
    } catch (error: any) {
      console.error('Error creating room:', error);
      toast({ 
        title: "Erreur", 
        description: "Impossible de créer le salon", 
        variant: "destructive" 
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopyLink = async () => {
    if (!roomCode) return;
    const link = `${window.location.origin}/room/${roomCode}`;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Lien copié !" });
  };

  const handleJoinRoom = () => {
    if (roomCode) {
      onOpenChange(false);
      navigate(`/room/${roomCode}`);
    }
  };

  const handleClose = () => {
    setRoomCode(null);
    setCopied(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Créer un salon multi</DialogTitle>
          <DialogDescription>
            Créez un salon et partagez le lien avec vos amis (max 5 personnes)
          </DialogDescription>
        </DialogHeader>
        
        {!roomCode ? (
          <div className="flex flex-col gap-4 pt-4">
            <Button 
              onClick={handleCreateRoom} 
              disabled={isCreating}
              className="w-full bg-gradient-to-r from-primary to-secondary"
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Création...
                </>
              ) : (
                "Créer le salon"
              )}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-4 pt-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground mb-2">Lien du salon :</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-sm break-all">
                  {window.location.origin}/room/{roomCode}
                </code>
                <Button 
                  size="icon" 
                  variant="ghost"
                  onClick={handleCopyLink}
                >
                  {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <Button 
              onClick={handleJoinRoom}
              className="w-full bg-gradient-to-r from-primary to-secondary"
            >
              Rejoindre le salon
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
