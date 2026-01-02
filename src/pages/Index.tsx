import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ChatMessage } from "@/components/ChatMessage";
import { ChatInput } from "@/components/ChatInput";
import { ConversationItem } from "@/components/ConversationItem";
import { SidebarToggle } from "@/components/SidebarToggle";
import { CommunityGoal } from "@/components/CommunityGoal";
import { Settings } from "@/components/Settings";
import { Updates } from "@/components/Updates";
import { ModelSelector, modelSupportsImages } from "@/components/ModelSelector";

import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Sparkles, Plus, Loader2, LogOut, User as UserIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { scaleVariants, slideInVariants, floatingVariants, useIntersectionObserver, staggerContainer } from "@/lib/animations";

interface SearchResult {
  title: string;
  snippet: string;
  url: string;
  date?: string;
  score?: number;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string | MessageContent[];
  timestamp: number;
  searchResults?: SearchResult[];
}

interface MessageContent {
  type: "text" | "image_url";
  text?: string;
  image_url?: { url: string };
}

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

const Index = () => {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isConversationLoading, setIsConversationLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [selectedModel, setSelectedModel] = useState("liquid/lfm2-1.2b");

  const currentRequestIdRef = useRef<string | null>(null);
  const shouldStopRef = useRef(false);

  const [titleAnimationState, setTitleAnimationState] = useState<'idle' | 'removing' | 'waiting' | 'completing' | 'arriving'>('idle');
  const { toast } = useToast();
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Auth effect
  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // User is logged in - not a guest
          setIsGuest(false);
          localStorage.removeItem("juxGuestMode");
          // Restore saved model or default to advanced
          const savedModel = localStorage.getItem("juxSelectedModel");
          setSelectedModel(savedModel || "google/gemma-3-4b");
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (!session) {
        // Check if guest mode
        const guestMode = localStorage.getItem("juxGuestMode");
        if (guestMode === "true") {
          setIsGuest(true);
          setSelectedModel("liquid/lfm2-1.2b");
        } else {
          // Not logged in and not a guest - redirect to auth
          navigate("/auth");
        }
      } else {
        setIsGuest(false);
        const savedModel = localStorage.getItem("juxSelectedModel");
        setSelectedModel(savedModel || "google/gemma-3-4b");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = () => {
    const stored = localStorage.getItem("conversations");
    const loadedConversations = stored ? JSON.parse(stored) : [];
    setConversations(loadedConversations);
    if (loadedConversations.length === 0) {
      createNewChat();
    } else {
      setCurrentConversationId(loadedConversations[0].id);
    }
  };

  const saveConversations = (convs: Conversation[]) => {
    localStorage.setItem("conversations", JSON.stringify(convs));
    setConversations(convs);
  };

  const createNewChat = () => {
    const newConv: Conversation = {
      id: Date.now().toString(),
      title: "Nouvelle conversation",
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const updated = [newConv, ...conversations];
    saveConversations(updated);
    setCurrentConversationId(newConv.id);
    setIsSidebarOpen(false);
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  const handleModelChange = (model: string) => {
    setSelectedModel(model);
    localStorage.setItem("juxSelectedModel", model);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("juxGuestMode");
    localStorage.removeItem("juxSelectedModel");
    setUser(null);
    setSession(null);
    setIsGuest(false);
    navigate("/auth");
  };

  const handleGoToAuth = () => {
    navigate("/auth");
  };

  const getCurrentConversation = () => {
    return conversations.find((c) => c.id === currentConversationId);
  };

  const updateConversation = (id: string, updates: Partial<Conversation>) => {
    const updated = conversations.map((c) =>
      c.id === id ? { ...c, ...updates, updatedAt: Date.now() } : c
    );
    saveConversations(updated);
  };

  const handleRenameConversation = (id: string, newTitle: string) => {
    updateConversation(id, { title: newTitle });
    setIsSidebarOpen(false);
    toast({
      title: "Conversation renommée",
      description: `Le titre a été changé en "${newTitle}"`,
    });
  };

  const handleDeleteConversation = (id: string) => {
    if (conversations.length === 1) {
      // Si c'est la dernière conversation, créer une nouvelle d'abord
      const newConv: Conversation = {
        id: (Date.now() + 1).toString(),
        title: "Nouvelle conversation",
        messages: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      const updated = [newConv];
      saveConversations(updated);
      setCurrentConversationId(newConv.id);
    } else {
      const filtered = conversations.filter((c) => c.id !== id);
      saveConversations(filtered);

      if (id === currentConversationId) {
        setCurrentConversationId(filtered[0].id);
      }
    }

    setIsSidebarOpen(false);
    toast({
      title: "Conversation supprimée",
      description: "La conversation a été supprimée avec succès",
    });
  };

  const handleStopGeneration = async () => {
    shouldStopRef.current = true;
    
    // Mettre à jour le status dans Supabase pour arrêter le streaming côté serveur
    if (currentRequestIdRef.current) {
      try {
        await supabase
          .from("requests")
          .update({ status: "cancelled" })
          .eq("id", currentRequestIdRef.current);
      } catch (error) {
        console.error("Erreur lors de l'arrêt:", error);
      }
    }
    
    setIsLoading(false);
    setIsConversationLoading(false);
    toast({
      title: "Génération arrêtée",
      description: "La génération a été interrompue",
    });
  };

  const handleSendMessage = async (content: string, imageBase64?: string, useDocumentImport?: boolean, generateImage?: boolean, documentContents?: { name: string; type: string; content: string; base64: boolean }[]) => {
    if (!currentConversationId) return;

    let userMessage: Message;
    if (imageBase64) {
      userMessage = {
        id: Date.now().toString(),
        role: "user",
        content: [
          { type: "text", text: content },
          { type: "image_url", image_url: { url: imageBase64 } },
        ],
        timestamp: Date.now(),
      };
    } else {
      userMessage = {
        id: Date.now().toString(),
        role: "user",
        content,
        timestamp: Date.now(),
      };
    }

    const conv = getCurrentConversation();
    if (!conv) return;

    const updatedMessages = [...conv.messages, userMessage];
    updateConversation(currentConversationId, { messages: updatedMessages });

    // Trigger title animation sequence for new conversations
    if (conv.messages.length === 0) {
      // Immediately clear the title when first message is sent
      updateConversation(currentConversationId, { title: "" });
      setTitleAnimationState('removing');
      setTimeout(() => setTitleAnimationState('waiting'), 300);
    }

    setIsLoading(true);
    setIsConversationLoading(true);
    shouldStopRef.current = false;

    try {
      // Si on génère une image, on ne passe pas par Supabase/LM Studio
      if (generateImage) {
        console.log("Génération d'image en cours...");
        const { generateFromText } = await import("@/utils/generateImages");
        const generatedImageUrl = await generateFromText(content);

        console.log("Image générée:", generatedImageUrl);
        toast({
          title: "Image générée",
          description: "Votre image a été créée avec succès",
        });

        // Créer le message assistant avec juste l'image générée
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: [
            { type: "text", text: `Voici l'image générée pour : "${content}"` },
            { type: "image_url", image_url: { url: generatedImageUrl } }
          ],
          timestamp: Date.now(),
        };

        // Mettre à jour la conversation avec le message image
        updateConversation(currentConversationId, {
          messages: [...updatedMessages, assistantMessage],
        });

        // Auto-scroll to the new assistant message with smooth animation
        setTimeout(() => {
          if (scrollAreaRef.current) {
            const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
            if (scrollContainer) {
              scrollContainer.scrollTo({ top: scrollContainer.scrollHeight, behavior: 'smooth' });
            }
          }
        }, 100);

        return; // Sortir de la fonction, pas besoin d'aller plus loin
      }

      // Pour les autres cas (chat normal ou import document), continuer avec Supabase
      // Récupérer les paramètres de personnalisation
      let personalizationContext = "";
      const savedPersonalization = localStorage.getItem("juxPersonalization");
      if (savedPersonalization) {
        try {
          const settings = JSON.parse(savedPersonalization);
          const parts: string[] = [];
          
          if (settings.userName) {
            parts.push(`L'utilisateur s'appelle "${settings.userName}". Utilise ce nom pour t'adresser à lui.`);
          }
          if (settings.userInfo) {
            parts.push(`Informations sur l'utilisateur : ${settings.userInfo}`);
          }
          if (settings.responseStyle && settings.responseStyle !== "default") {
            const styleDescriptions: Record<string, string> = {
              "concis": "Réponds de manière concise, courte et directe. Va droit au but.",
              "socratique": "Guide l'utilisateur avec des questions d'exploration plutôt que des réponses directes.",
              "formel": "Utilise un ton académique et professionnel dans tes réponses."
            };
            if (styleDescriptions[settings.responseStyle]) {
              parts.push(styleDescriptions[settings.responseStyle]);
            }
          }
          if (settings.customInstruction) {
            parts.push(`Instructions personnalisées : ${settings.customInstruction}`);
          }
          
          if (parts.length > 0) {
            personalizationContext = "=== PERSONNALISATION ===\n" + parts.join("\n") + "\n=== FIN PERSONNALISATION ===\n\n";
          }
        } catch (e) {
          console.error("Erreur lecture personnalisation:", e);
        }
      }

      // Construire l'historique de conversation (derniers 20 messages)
      const historyMessages = conv.messages.slice(-20); // Prendre les 20 derniers messages avant le nouveau
      let conversationHistory = "";
      if (historyMessages.length > 0) {
        conversationHistory = "Voici les échanges précédents dans cette conversation :\n\n";
        historyMessages.forEach((msg) => {
          const roleLabel = msg.role === "user" ? "Utilisateur" : "Assistant";
          let msgContent = "";
          if (typeof msg.content === "string") {
            msgContent = msg.content;
          } else if (Array.isArray(msg.content)) {
            // Extraire seulement le texte, ignorer les images pour l'historique
            msgContent = msg.content
              .filter(part => part.type === "text" && part.text)
              .map(part => part.text)
              .join(" ");
          }
          if (msgContent.trim()) {
            conversationHistory += `${roleLabel}: ${msgContent}\n\n`;
          }
        });
        conversationHistory += "Nouvelle question :\n";
      }

      // Préparer le prompt pour Supabase avec personnalisation et historique
      const currentPrompt = imageBase64
        ? `${content} [Image: ${imageBase64}]`
        : content;
      const fullPrompt = personalizationContext + conversationHistory + currentPrompt;

      // Insérer la requête dans la table requests
      const { data: insertData, error: insertError } = await supabase
        .from("requests")
        .insert([
          {
            prompt: fullPrompt,
            imput_message: { 
              text: content, 
              has_documents: useDocumentImport || false,
              documents: documentContents || []
            },
            status: "pending",
            use_web_search: false,
            model: selectedModel,
          },
        ])
        .select()
        .single();

      if (insertError) throw insertError;

      const requestId = insertData.id;
      currentRequestIdRef.current = requestId;
      console.log("Requête insérée:", requestId);

      // Poller pour la réponse avec streaming en temps réel
      let response = "";
      let streamingMessageId = (Date.now() + 1).toString();
      let isStreaming = false;
      let lastResponse = "";
      let currentMessages = [...updatedMessages]; // Track messages locally

      while (true) {
        // Vérifier si l'utilisateur a demandé l'arrêt
        if (shouldStopRef.current) {
          break;
        }
        
        // Polling plus rapide pendant le streaming (80ms), sinon 400ms
        await new Promise((resolve) => setTimeout(resolve, isStreaming ? 80 : 400));

        const { data: pollData, error: pollError } = await supabase
          .from("requests")
          .select("response, status, search_results")
          .eq("id", requestId)
          .single();

        if (pollError) throw pollError;

        // Gérer le streaming en temps réel
        if ((pollData.status === "streaming" || pollData.status === "pending") && pollData.response) {
          isStreaming = true;
          const currentResponse = pollData.response;
          
          // Mettre à jour seulement si la réponse a changé
          if (currentResponse !== lastResponse) {
            lastResponse = currentResponse;
            
            // Créer ou mettre à jour le message assistant en streaming
            const streamingMessage: Message = {
              id: streamingMessageId,
              role: "assistant",
              content: currentResponse,
              timestamp: Date.now(),
            };

            // Trouver si le message assistant existe déjà
            const existingIndex = currentMessages.findIndex(m => m.id === streamingMessageId);
            
            if (existingIndex >= 0) {
              currentMessages[existingIndex] = streamingMessage;
            } else {
              currentMessages = [...currentMessages, streamingMessage];
            }
            
            // Mettre à jour immédiatement la conversation
            updateConversation(currentConversationId, { messages: [...currentMessages] });
            
            // Auto-scroll pendant le streaming seulement si l'utilisateur est déjà en bas
            if (scrollAreaRef.current) {
              const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
              if (scrollContainer) {
                const isNearBottom = scrollContainer.scrollHeight - scrollContainer.scrollTop - scrollContainer.clientHeight < 150;
                if (isNearBottom) {
                  scrollContainer.scrollTo({ top: scrollContainer.scrollHeight, behavior: 'smooth' });
                }
              }
            }
          }
        }

        if (pollData.status === "done") {
          response = pollData.response || "";

          // Vérifier si la réponse contient titre et contenu (nouvelle conversation)
          let finalContent = response;
          let conversationTitle = null;

          try {
            const parsedResponse = JSON.parse(response);
            if (parsedResponse.title && parsedResponse.content) {
              conversationTitle = parsedResponse.title;
              finalContent = parsedResponse.content;
            }
          } catch (e) {
            // Pas de JSON, réponse normale
          }

          // Stocker les résultats de recherche si disponibles
          const searchResults = pollData.search_results
            ? (pollData.search_results as any).results
            : undefined;

          // Créer le message assistant final avec les sources
          const assistantMessage: Message = {
            id: streamingMessageId,
            role: "assistant",
            content: finalContent,
            timestamp: Date.now(),
            searchResults: searchResults,
          };

          // Mettre à jour les messages finaux
          const existingIndex = currentMessages.findIndex(m => m.id === streamingMessageId);
          if (existingIndex >= 0) {
            currentMessages[existingIndex] = assistantMessage;
          } else {
            currentMessages = [...currentMessages, assistantMessage];
          }

          const updates: Partial<Conversation> = {
            messages: [...currentMessages],
          };

          if (conversationTitle) {
            if (titleAnimationState === 'waiting') {
              setTitleAnimationState('completing');
              updates.title = conversationTitle;
              updateConversation(currentConversationId, updates);
              setTimeout(() => {
                setTitleAnimationState('removing');
                setTimeout(() => {
                  setTitleAnimationState('arriving');
                  setTimeout(() => setTitleAnimationState('idle'), 500);
                }, 300);
              }, 500);
            } else {
              setTitleAnimationState('removing');
              setTimeout(() => {
                updates.title = conversationTitle;
                updateConversation(currentConversationId, updates);
                setTitleAnimationState('arriving');
                setTimeout(() => setTitleAnimationState('idle'), 500);
              }, 300);
            }
          } else {
            updateConversation(currentConversationId, updates);
          }

          // Auto-scroll final seulement si l'utilisateur est déjà en bas
          setTimeout(() => {
            if (scrollAreaRef.current) {
              const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
              if (scrollContainer) {
                const isNearBottom = scrollContainer.scrollHeight - scrollContainer.scrollTop - scrollContainer.clientHeight < 150;
                if (isNearBottom) {
                  scrollContainer.scrollTo({ top: scrollContainer.scrollHeight, behavior: 'smooth' });
                }
              }
            }
          }, 100);

          break;
        } else if (pollData.status === "error") {
          throw new Error(pollData.response || "Erreur inconnue");
        } else if (pollData.status === "cancelled") {
          break;
        }
      }

    } catch (error: any) {
      console.error("Erreur:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de générer une réponse",
        variant: "destructive",
      });

      // Remove the user message if there was an error
      updateConversation(currentConversationId, {
        messages: conv.messages,
      });
    } finally {
      setIsLoading(false);
      setIsConversationLoading(false);
      currentRequestIdRef.current = null;
      shouldStopRef.current = false;
    }
  };

  const currentMessages = getCurrentConversation()?.messages || [];

  return (
    <div className="flex h-screen bg-background relative overflow-hidden">
      <SidebarToggle onClick={toggleSidebar} isSidebarOpen={isSidebarOpen} />

      {/* Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999]"
            onClick={closeSidebar}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.div 
        className={`w-72 sm:w-80 md:w-[340px] border-r border-sidebar-border/50 glass-sidebar flex flex-col fixed top-0 left-0 h-screen z-[1000] ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ transition: "transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)" }}
      >
        {/* Sidebar Header */}
        <div className="p-5 border-b border-sidebar-border/50">
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Button
              onClick={createNewChat}
              className="w-full h-12 bg-gradient-to-r from-primary to-secondary text-primary-foreground font-semibold rounded-xl glow-button transition-all duration-200"
            >
              <Plus className="h-5 w-5 mr-2" />
              Nouvelle conversation
            </Button>
          </motion.div>
        </div>
        
        {/* Conversations List */}
        <ScrollArea className="flex-1 px-3">
          <div className="py-3 space-y-1">
            {conversations.map((conv, index) => (
              <motion.div
                key={conv.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.03 }}
              >
                <ConversationItem
                  id={conv.id}
                  title={conv.title}
                  isActive={conv.id === currentConversationId}
                  onClick={() => {
                    setCurrentConversationId(conv.id);
                    closeSidebar();
                  }}
                  onRename={handleRenameConversation}
                  onDelete={handleDeleteConversation}
                  isMobile={true}
                  animationState={conv.id === currentConversationId ? titleAnimationState : 'idle'}
                />
              </motion.div>
            ))}
          </div>
        </ScrollArea>
        
        {/* Sidebar Footer */}
        <div className="p-4 border-t border-sidebar-border/50 space-y-4 bg-sidebar-background/50 backdrop-blur-sm">
          {/* Model Selector */}
          <div className="flex items-center justify-between">
            <ModelSelector
              isGuest={isGuest}
              selectedModel={selectedModel}
              onModelChange={handleModelChange}
            />
          </div>
          
          {/* Auth Status & Actions */}
          <div className="flex items-center gap-2 pt-2 border-t border-sidebar-border/30">
            <Settings />
            <Updates />
            <div className="flex-1" />
            {user ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-xs gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" />
                Déconnexion
              </Button>
            ) : isGuest ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleGoToAuth}
                className="text-xs gap-1.5 border-primary/30 hover:bg-primary/10 hover:border-primary/50"
              >
                <UserIcon className="h-3.5 w-3.5" />
                Se connecter
              </Button>
            ) : null}
          </div>
        </div>
      </motion.div>

      {/* Main Chat */}
      <div className="flex-1 flex flex-col">
        {/* Chat Area */}
        <div className="flex-1 overflow-hidden relative">
          {/* Subtle gradient overlay at top */}
          <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-background to-transparent z-10 pointer-events-none" />
          
          <ScrollArea ref={scrollAreaRef} className="h-full">
            <div className="max-w-4xl mx-auto">
              {currentMessages.length === 0 ? (
                <motion.div
                  className="flex flex-col items-center justify-center h-full min-h-[600px] text-center px-4 py-12"
                  variants={staggerContainer}
                  initial="initial"
                  animate="animate"
                >
                  {/* Animated background orbs */}
                  <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <motion.div 
                      className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/5 rounded-full blur-3xl"
                      animate={{ 
                        x: [0, 50, 0], 
                        y: [0, 30, 0],
                        scale: [1, 1.1, 1]
                      }}
                      transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                    />
                    <motion.div 
                      className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-secondary/5 rounded-full blur-3xl"
                      animate={{ 
                        x: [0, -40, 0], 
                        y: [0, -20, 0],
                        scale: [1, 1.15, 1]
                      }}
                      transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                    />
                  </div>
                  
                  <motion.div
                    variants={slideInVariants.slideInUp}
                    className="relative z-10"
                  >
                    {/* Logo */}
                    <motion.div
                      className="mb-6 flex justify-center"
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
                    >
                      <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-primary to-secondary rounded-2xl blur-xl opacity-40" />
                        <div className="relative bg-gradient-to-br from-primary to-secondary p-4 rounded-2xl">
                          <Sparkles className="h-10 w-10 text-primary-foreground" />
                        </div>
                      </div>
                    </motion.div>
                    
                    <motion.h1
                      className="text-4xl sm:text-5xl font-bold mb-4 bg-gradient-to-r from-primary via-primary to-secondary bg-clip-text text-transparent"
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.8, delay: 0.2 }}
                    >
                      Discutez avec Jux
                    </motion.h1>
                  </motion.div>

                  <motion.p
                    className="text-muted-foreground max-w-md mb-8 text-lg"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.4 }}
                  >
                    Votre assistant IA intelligent, prêt à vous aider
                  </motion.p>

                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.8 }}
                    className="relative z-10"
                  >
                    <CommunityGoal />
                  </motion.div>
                </motion.div>
              ) : (
                <div className="space-y-0 pb-4">
                  <AnimatePresence mode="popLayout">
                    {currentMessages.map((message, index) => (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index === currentMessages.length - 1 ? 0 : 0 }}
                        className={`px-4 sm:px-6 py-5 sm:py-6 transition-colors ${
                          message.role === "user" 
                            ? "bg-background" 
                            : "bg-card/50 border-y border-border/30"
                        }`}
                      >
                        <div className="max-w-4xl mx-auto">
                          <ChatMessage
                            role={message.role}
                            content={message.content}
                          />
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {isLoading && !currentMessages.some(m => m.role === 'assistant' && currentMessages.indexOf(m) === currentMessages.length - 1) && (
                    <motion.div
                      className="px-4 sm:px-6 py-5 sm:py-6 bg-card/50 border-y border-border/30"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="max-w-4xl mx-auto flex gap-4 items-center">
                        <div className="relative">
                          <motion.div
                            className="absolute inset-0 bg-primary/20 rounded-lg blur-md"
                            animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0.8, 0.5] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                          />
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            className="relative"
                          >
                            <Loader2 className="h-6 w-6 text-primary" />
                          </motion.div>
                        </div>
                        <motion.div
                          className="text-muted-foreground font-medium"
                          animate={{ opacity: [0.6, 1, 0.6] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        >
                          Jux réfléchit...
                        </motion.div>
                      </div>
                    </motion.div>
                  )}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Input Area */}
        <div className="border-t border-border/50 bg-background/80 backdrop-blur-xl">
          <div className="px-3 sm:px-4 py-4 sm:py-5 max-w-4xl mx-auto">
            <ChatInput 
              onSend={handleSendMessage} 
              onStop={handleStopGeneration} 
              isLoading={isLoading}
              imageDisabled={!modelSupportsImages(selectedModel)}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
