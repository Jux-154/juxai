import { useState, useEffect } from "react";
import { Loader2, Crown, UserIcon } from "lucide-react";
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

interface RoomMember {
  user_id: string;
  role: string;
  pseudo: string;
}

interface JoinRoomDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roomCode: string;
  roomId: string;
  onJoin: () => void;
}

export const JoinRoomDialog = ({ 
  open, 
  onOpenChange, 
  roomCode, 
  roomId,
  onJoin 
}: JoinRoomDialogProps) => {
  const { toast } = useToast();
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [isJoining, setIsJoining] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (open && roomId) {
      fetchMembers();
    }
  }, [open, roomId]);

  const fetchMembers = async () => {
    setIsLoading(true);
    try {
      const { data: membersData, error } = await supabase
        .from('room_members')
        .select(`
          user_id,
          role
        `)
        .eq('room_id', roomId);

      if (error) throw error;

      // Fetch pseudos for each member
      const membersWithPseudo = await Promise.all(
        (membersData || []).map(async (member) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('pseudo')
            .eq('user_id', member.user_id)
            .single();
          
          return {
            ...member,
            pseudo: profile?.pseudo || 'Anonyme',
          };
        })
      );

      setMembers(membersWithPseudo);
    } catch (error) {
      console.error('Error fetching members:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoin = async () => {
    setIsJoining(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: "Erreur", description: "Vous devez être connecté", variant: "destructive" });
        return;
      }

      if (members.length >= 5) {
        toast({ title: "Salon complet", description: "Ce salon a atteint la limite de 5 personnes", variant: "destructive" });
        return;
      }

      // Check if already a member
      const isAlreadyMember = members.some(m => m.user_id === user.id);
      
      if (!isAlreadyMember) {
        const { error } = await supabase
          .from('room_members')
          .insert({
            room_id: roomId,
            user_id: user.id,
            role: 'guest',
          });

        if (error) throw error;
      }

      onJoin();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error joining room:', error);
      toast({ 
        title: "Erreur", 
        description: "Impossible de rejoindre le salon", 
        variant: "destructive" 
      });
    } finally {
      setIsJoining(false);
    }
  };

  return (
<Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md z-50">
        <DialogHeader>
          <DialogTitle>Rejoindre le salon ?</DialogTitle>
          <DialogDescription>
            Vous êtes sur le point de rejoindre un salon de conversation multi
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <h4 className="text-sm font-medium mb-3">Participants ({members.length}/5)</h4>
          {isLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-2">
              {members.map((member) => (
                <div 
                  key={member.user_id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                >
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                    {member.role === 'admin' ? (
                      <Crown className="h-4 w-4 text-primary-foreground" />
                    ) : (
                      <UserIcon className="h-4 w-4 text-primary-foreground" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{member.pseudo}</p>
                    <p className="text-xs text-muted-foreground">
                      {member.role === 'admin' ? 'Hôte' : 'Invité'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <Button 
            variant="outline" 
            className="flex-1"
            onClick={() => onOpenChange(false)}
          >
            Annuler
          </Button>
          <Button 
            onClick={handleJoin}
            disabled={isJoining || members.length >= 5}
            className="flex-1 bg-gradient-to-r from-primary to-secondary"
          >
            {isJoining ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Connexion...
              </>
            ) : (
              "Rejoindre"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
