import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ChatInput } from "@/components/ChatInput";
import { ChatMessage } from "@/components/ChatMessage";
import { JoinRoomDialog } from "@/components/JoinRoomDialog";
import { Crown, UserIcon, LogOut, Loader2, Users, Copy, Check, AlertCircle, Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Session } from "@supabase/supabase-js";

interface RoomMessage {
  id: string;
  content: string;
  user_id: string | null;
  is_ai_response: boolean;
  created_at: string;
  pseudo?: string;
}

interface RoomMember {
  user_id: string;
  role: string;
  pseudo: string;
}

interface QueueItem {
  id: string;
  user_id: string;
  position: number;
  is_processed: boolean;
  pseudo?: string;
}

const MultiRoom = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userPseudo, setUserPseudo] = useState<string | null>(null);
  
  const [roomId, setRoomId] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [isMember, setIsMember] = useState(false);
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isInQueue, setIsInQueue] = useState(false);
  const [myQueuePosition, setMyQueuePosition] = useState<number | null>(null);
  const [currentSpeaker, setCurrentSpeaker] = useState<string | null>(null);
  
  const [copied, setCopied] = useState(false);
  const [roomClosed, setRoomClosed] = useState(false);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [needsPseudo, setNeedsPseudo] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Auth check
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (!session) {
        setNeedsAuth(true);
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch user pseudo
  useEffect(() => {
    if (user) {
      fetchUserPseudo();
    }
  }, [user]);

  const fetchUserPseudo = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('profiles')
      .select('pseudo')
      .eq('user_id', user.id)
      .single();
    
    if (data?.pseudo) {
      setUserPseudo(data.pseudo);
    } else {
      setNeedsPseudo(true);
    }
    setIsLoading(false);
  };

  // Fetch room data - aussi déclenché quand on a user mais pas encore de pseudo vérifié
  useEffect(() => {
    if (code && user && userPseudo && !needsPseudo) {
      fetchRoomData();
    }
  }, [code, user, userPseudo, needsPseudo]);

  const fetchRoomData = async () => {
    if (!code || !user) return;
    
    try {
      // Get room
      const { data: room, error: roomError } = await supabase
        .from('multi_rooms')
        .select('*')
        .eq('code', code)
        .eq('is_active', true)
        .single();

      if (roomError || !room) {
        setRoomClosed(true);
        setIsLoading(false);
        return;
      }

      setRoomId(room.id);
      setIsHost(room.host_id === user.id);
      setCurrentSpeaker(room.current_speaker_id);

      // Check if already member
      const { data: membership } = await supabase
        .from('room_members')
        .select('*')
        .eq('room_id', room.id)
        .eq('user_id', user.id)
        .single();

      if (membership) {
        setIsMember(true);
        await fetchRoomContent(room.id);
      } else {
        setShowJoinDialog(true);
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching room:', error);
      setIsLoading(false);
    }
  };

  const fetchRoomContent = useCallback(async (roomIdParam: string) => {
    // Fetch members with pseudos
    const { data: membersData } = await supabase
      .from('room_members')
      .select('user_id, role')
      .eq('room_id', roomIdParam);

    if (membersData) {
      const membersWithPseudo = await Promise.all(
        membersData.map(async (member) => {
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
    }

    // Fetch messages
    const { data: messagesData } = await supabase
      .from('room_messages')
      .select('*')
      .eq('room_id', roomIdParam)
      .order('created_at', { ascending: true });

    if (messagesData) {
      const messagesWithPseudo = await Promise.all(
        messagesData.map(async (msg) => {
          if (msg.user_id) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('pseudo')
              .eq('user_id', msg.user_id)
              .single();
            return { ...msg, pseudo: profile?.pseudo || 'Anonyme' };
          }
          return msg;
        })
      );
      setMessages(prev => {
        // Only update if there are new messages (silent sync)
        if (JSON.stringify(prev.map(m => m.id)) !== JSON.stringify(messagesWithPseudo.map(m => m.id))) {
          return messagesWithPseudo;
        }
        return prev;
      });
    }

    // Fetch queue
    await fetchQueue(roomIdParam);

    // Fetch room status
    const { data: roomData } = await supabase
      .from('multi_rooms')
      .select('is_active, current_speaker_id')
      .eq('id', roomIdParam)
      .single();
    
    if (roomData) {
      if (!roomData.is_active) {
        setRoomClosed(true);
      }
      setCurrentSpeaker(roomData.current_speaker_id);
    }
  }, []);

  const fetchQueue = async (roomIdParam: string) => {
    const { data: queueData } = await supabase
      .from('message_queue')
      .select('*')
      .eq('room_id', roomIdParam)
      .eq('is_processed', false)
      .order('position', { ascending: true });

    if (queueData) {
      const queueWithPseudo = await Promise.all(
        queueData.map(async (item) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('pseudo')
            .eq('user_id', item.user_id)
            .single();
          return { ...item, pseudo: profile?.pseudo || 'Anonyme' };
        })
      );
      setQueue(queueWithPseudo);
      
      if (user) {
        const myItem = queueWithPseudo.find(q => q.user_id === user.id);
        setIsInQueue(!!myItem);
        setMyQueuePosition(myItem?.position ?? null);
      }
    }
  };

  // Silent sync every 5 seconds
  useEffect(() => {
    if (!roomId || !isMember) return;

    const syncInterval = setInterval(() => {
      fetchRoomContent(roomId);
    }, 5000);

    return () => clearInterval(syncInterval);
  }, [roomId, isMember, fetchRoomContent]);

  // Realtime subscriptions
  useEffect(() => {
    if (!roomId || !isMember) return;

    // Members channel
    const membersChannel = supabase
      .channel('room-members')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'room_members',
        filter: `room_id=eq.${roomId}`,
      }, () => {
        fetchRoomContent(roomId);
      })
      .subscribe();

    // Messages channel
    const messagesChannel = supabase
      .channel('room-messages')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'room_messages',
        filter: `room_id=eq.${roomId}`,
      }, async (payload) => {
        const newMsg = payload.new as RoomMessage;
        if (newMsg.user_id) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('pseudo')
            .eq('user_id', newMsg.user_id)
            .single();
          newMsg.pseudo = profile?.pseudo || 'Anonyme';
        }
        setMessages(prev => {
          // Avoid duplicates
          if (prev.find(m => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
      })
      .subscribe();

    // Room status channel
    const roomChannel = supabase
      .channel('room-status')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'multi_rooms',
        filter: `id=eq.${roomId}`,
      }, (payload) => {
        const room = payload.new as any;
        if (!room.is_active) {
          setRoomClosed(true);
        }
        setCurrentSpeaker(room.current_speaker_id);
      })
      .subscribe();

    // Queue channel
    const queueChannel = supabase
      .channel('room-queue')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'message_queue',
        filter: `room_id=eq.${roomId}`,
      }, () => {
        fetchQueue(roomId);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(membersChannel);
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(roomChannel);
      supabase.removeChannel(queueChannel);
    };
  }, [roomId, isMember, user, fetchRoomContent]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  const handleJoinRoom = () => {
    setIsMember(true);
    if (roomId) {
      fetchRoomContent(roomId);
    }
  };

  const handleJoinQueue = async () => {
    if (!roomId || !user || isInQueue) return;

    const nextPosition = queue.length > 0 
      ? Math.max(...queue.map(q => q.position)) + 1 
      : 1;

    await supabase.from('message_queue').insert({
      room_id: roomId,
      user_id: user.id,
      position: nextPosition,
    });
  };

  const handleLeaveQueue = async () => {
    if (!roomId || !user) return;

    await supabase
      .from('message_queue')
      .delete()
      .eq('room_id', roomId)
      .eq('user_id', user.id);
  };

  const handleSendMessage = async (content: string) => {
    if (!roomId || !user || isSending) return;

    // Check if it's user's turn (first in queue or no queue)
    const isMyTurn = queue.length === 0 || queue[0]?.user_id === user.id;
    if (!isMyTurn) {
      toast({ 
        title: "Ce n'est pas votre tour", 
        description: "Attendez votre tour dans la file d'attente",
        variant: "destructive" 
      });
      return;
    }

    setIsSending(true);

    try {
      // Set current speaker
      await supabase
        .from('multi_rooms')
        .update({ current_speaker_id: user.id })
        .eq('id', roomId);

      // Add user message
      await supabase.from('room_messages').insert({
        room_id: roomId,
        user_id: user.id,
        content,
        is_ai_response: false,
      });

      // Call AI via requests table (same as solo)
      const { data: request, error } = await supabase
        .from('requests')
        .insert({
          prompt: content,
          model: 'google/gemma-3-4b',
          use_web_search: false,
        })
        .select()
        .single();

      if (error) throw error;

      // Poll for response
      const pollForResponse = async () => {
        const maxAttempts = 60;
        let attempts = 0;
        
        while (attempts < maxAttempts) {
          const { data: updated } = await supabase
            .from('requests')
            .select('*')
            .eq('id', request.id)
            .single();

          if (updated?.status === 'done' && updated?.response) {
            // Add AI response
            await supabase.from('room_messages').insert({
              room_id: roomId,
              content: updated.response,
              is_ai_response: true,
            });

            // Clear current speaker
            await supabase
              .from('multi_rooms')
              .update({ current_speaker_id: null })
              .eq('id', roomId);

            // Remove from queue
            await supabase
              .from('message_queue')
              .delete()
              .eq('room_id', roomId)
              .eq('user_id', user.id);

            setIsSending(false);
            return;
          }

          if (updated?.status === 'error') {
            throw new Error('AI response failed');
          }

          await new Promise(resolve => setTimeout(resolve, 1000));
          attempts++;
        }

        throw new Error('Timeout waiting for AI response');
      };

      await pollForResponse();
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast({ 
        title: "Erreur", 
        description: "Impossible d'envoyer le message", 
        variant: "destructive" 
      });
      setIsSending(false);
    }
  };

  const handleLeaveRoom = async () => {
    if (!roomId || !user) return;

    if (isHost) {
      // Close room
      await supabase
        .from('multi_rooms')
        .update({ is_active: false })
        .eq('id', roomId);
    } else {
      // Just leave
      await supabase
        .from('room_members')
        .delete()
        .eq('room_id', roomId)
        .eq('user_id', user.id);
    }

    navigate('/');
  };

  const handleCopyLink = async () => {
    const link = `${window.location.origin}/#/room/${code}`;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Lien copié !" });
  };

  const handleGoToAuth = () => {
    navigate('/auth', { state: { returnTo: `/room/${code}` } });
  };

  const handleGoToSettings = () => {
    navigate('/', { state: { openSettings: true } });
  };

  // Sidebar Content Component (reused for mobile and desktop)
  const SidebarContent = () => (
    <>
      {/* Members */}
      <div className="p-3 md:p-4 border-b border-border/50">
        <h3 className="text-sm font-semibold mb-3">Participants</h3>
        <div className="space-y-2">
          {members.map((member) => (
            <div 
              key={member.user_id}
              className={`flex items-center gap-2 p-2 rounded-lg ${
                currentSpeaker === member.user_id ? 'bg-primary/20 ring-1 ring-primary' : 'bg-muted/30'
              }`}
            >
              <div className="h-6 w-6 md:h-7 md:w-7 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center flex-shrink-0">
                {member.role === 'admin' ? (
                  <Crown className="h-3 w-3 md:h-3.5 md:w-3.5 text-primary-foreground" />
                ) : (
                  <UserIcon className="h-3 w-3 md:h-3.5 md:w-3.5 text-primary-foreground" />
                )}
              </div>
              <span className="text-xs md:text-sm truncate flex-1">{member.pseudo}</span>
              {currentSpeaker === member.user_id && (
                <span className="text-xs text-primary animate-pulse">🎤</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Queue */}
      <div className="p-3 md:p-4 flex-1">
        <h3 className="text-sm font-semibold mb-3">File d'attente</h3>
        {queue.length === 0 ? (
          <p className="text-xs text-muted-foreground">Aucune personne en attente</p>
        ) : (
          <div className="space-y-2">
            {queue.map((item, index) => (
              <div 
                key={item.id}
                className={`flex items-center gap-2 p-2 rounded-lg ${
                  index === 0 ? 'bg-green-500/20' : 'bg-muted/30'
                }`}
              >
                <span className="text-xs font-mono w-5">{index + 1}.</span>
                <span className="text-xs md:text-sm truncate">{item.pseudo}</span>
                {index === 0 && <span className="text-xs">👆</span>}
              </div>
            ))}
          </div>
        )}
        
        <div className="mt-4">
          {isInQueue ? (
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full text-xs md:text-sm"
              onClick={handleLeaveQueue}
            >
              Quitter la file ({myQueuePosition})
            </Button>
          ) : (
            <Button 
              size="sm" 
              className="w-full bg-gradient-to-r from-primary to-secondary text-xs md:text-sm"
              onClick={handleJoinQueue}
              disabled={isSending}
            >
              Rejoindre la file
            </Button>
          )}
        </div>
      </div>
    </>
  );

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (needsAuth) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
        <div className="bg-card border border-border rounded-2xl p-6 md:p-8 shadow-2xl max-w-md w-full text-center">
          <AlertCircle className="h-10 w-10 md:h-12 md:w-12 text-destructive mx-auto mb-4" />
          <h1 className="text-lg md:text-xl font-bold mb-2">Connexion requise</h1>
          <p className="text-sm md:text-base text-muted-foreground mb-6">
            Vous devez vous connecter avec une adresse mail pour accéder aux salons multi
          </p>
          <Button onClick={handleGoToAuth} className="bg-gradient-to-r from-primary to-secondary w-full md:w-auto">
            Se connecter
          </Button>
        </div>
      </div>
    );
  }

  if (needsPseudo) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
        <div className="bg-card border border-border rounded-2xl p-6 md:p-8 shadow-2xl max-w-md w-full text-center">
          <UserIcon className="h-10 w-10 md:h-12 md:w-12 text-primary mx-auto mb-4" />
          <h1 className="text-lg md:text-xl font-bold mb-2">Pseudo requis</h1>
          <p className="text-sm md:text-base text-muted-foreground mb-6">
            Vous devez définir un pseudo dans les paramètres pour accéder aux salons multi
          </p>
          <Button onClick={handleGoToSettings} className="bg-gradient-to-r from-primary to-secondary w-full md:w-auto">
            Définir un pseudo
          </Button>
        </div>
      </div>
    );
  }

  if (roomClosed) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-background p-4">
        <AlertCircle className="h-10 w-10 md:h-12 md:w-12 text-muted-foreground mb-4" />
        <h1 className="text-lg md:text-xl font-bold mb-2">Salon fermé</h1>
        <p className="text-sm md:text-base text-muted-foreground text-center mb-6">
          Ce salon n'existe plus ou a été fermé par l'hôte
        </p>
        <Button onClick={() => navigate('/')} variant="outline">
          Retour à l'accueil
        </Button>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="border-b border-border/50 bg-card/50 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-3 md:px-4 py-2 md:py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-3">
            {/* Mobile sidebar trigger */}
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden h-8 w-8">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[280px] p-0 flex flex-col">
                <div className="p-3 border-b border-border/50 flex items-center justify-between">
                  <h2 className="font-semibold text-sm">Salon Multi</h2>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSidebarOpen(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex-1 overflow-auto">
                  <SidebarContent />
                </div>
              </SheetContent>
            </Sheet>
            
            <div className="h-8 w-8 md:h-10 md:w-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <Users className="h-4 w-4 md:h-5 md:w-5 text-primary-foreground" />
            </div>
            <div className="hidden sm:block">
              <h1 className="font-semibold text-sm md:text-base">Salon Multi</h1>
              <p className="text-xs text-muted-foreground">{members.length}/5 participants</p>
            </div>
            <span className="sm:hidden text-xs text-muted-foreground">{members.length}/5</span>
          </div>
          <div className="flex items-center gap-1 md:gap-2">
            <Button 
              variant="ghost" 
              size="icon"
              className="h-8 w-8"
              onClick={handleCopyLink}
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
            <Button 
              variant="destructive" 
              size="sm"
              className="h-8 text-xs md:text-sm px-2 md:px-3"
              onClick={handleLeaveRoom}
            >
              <LogOut className="h-4 w-4 md:mr-2" />
              <span className="hidden md:inline">{isHost ? 'Fermer' : 'Quitter'}</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Desktop only */}
        <div className="hidden md:flex w-56 lg:w-64 border-r border-border/50 bg-card/30 flex-col">
          <SidebarContent />
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col min-w-0">
          <ScrollArea ref={scrollAreaRef} className="flex-1">
            <div className="max-w-3xl mx-auto py-2 md:py-4">
              <AnimatePresence mode="popLayout">
                {messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`px-3 md:px-4 py-3 md:py-4 ${
                      message.is_ai_response 
                        ? "bg-card/50 border-y border-border/30" 
                        : "bg-background"
                    }`}
                  >
                    {!message.is_ai_response && (
                      <p className="text-xs text-primary font-medium mb-1">{message.pseudo}</p>
                    )}
                    <ChatMessage
                      role={message.is_ai_response ? "assistant" : "user"}
                      content={message.content}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {isSending && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="px-3 md:px-4 py-3 md:py-4 bg-card/50 border-y border-border/30"
                >
                  <div className="flex items-center gap-3">
                    <Loader2 className="h-4 w-4 md:h-5 md:w-5 animate-spin text-primary" />
                    <span className="text-sm text-muted-foreground">Jux réfléchit...</span>
                  </div>
                </motion.div>
              )}
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="border-t border-border/50 bg-background/80 backdrop-blur-xl">
            <div className="px-3 md:px-4 py-3 md:py-4 max-w-3xl mx-auto">
              {(queue.length === 0 || queue[0]?.user_id === user?.id) ? (
                <ChatInput 
                  onSend={handleSendMessage}
                  isLoading={isSending}
                  imageDisabled={true}
                />
              ) : (
                <div className="text-center py-2 md:py-3 text-muted-foreground">
                  <p className="text-xs md:text-sm">
                    {isInQueue 
                      ? `Votre position : ${myQueuePosition} - Attendez votre tour`
                      : "Rejoignez la file d'attente pour envoyer un message"
                    }
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Join Dialog */}
      {roomId && (
        <JoinRoomDialog
          open={showJoinDialog}
          onOpenChange={setShowJoinDialog}
          roomCode={code || ''}
          roomId={roomId}
          onJoin={handleJoinRoom}
        />
      )}
    </div>
  );
};

export default MultiRoom;
