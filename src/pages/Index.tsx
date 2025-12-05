import { useState, useEffect, useRef } from "react";
import { ChatMessage } from "@/components/ChatMessage";
import { ChatInput } from "@/components/ChatInput";
import { ConversationItem } from "@/components/ConversationItem";
import { SidebarToggle } from "@/components/SidebarToggle";
import { DownloadCard } from "@/components/DownloadCard";
import { VersionCard } from "@/components/VersionCard";
import { PauseNotice } from "@/components/PauseNotice";

import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Sparkles, Plus, Loader2 } from "lucide-react";
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
  const showPauseNotice = false; // Set to true to show the pause notice again
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isConversationLoading, setIsConversationLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const currentRequestIdRef = useRef<string | null>(null);
  const shouldStopRef = useRef(false);

  const [titleAnimationState, setTitleAnimationState] = useState<'idle' | 'removing' | 'waiting' | 'completing' | 'arriving'>('idle');
  const { toast } = useToast();
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadConversations();

    // Request fullscreen on page load
    const requestFullscreen = async () => {
      try {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        } else if ((document.documentElement as any).webkitRequestFullscreen) {
          await (document.documentElement as any).webkitRequestFullscreen();
        } else if ((document.documentElement as any).mozRequestFullScreen) {
          await (document.documentElement as any).mozRequestFullScreen();
        } else if ((document.documentElement as any).msRequestFullscreen) {
          await (document.documentElement as any).msRequestFullscreen();
        }
      } catch (error) {
        console.log("Fullscreen request failed:", error);
      }
    };

    // Small delay to ensure DOM is ready
    setTimeout(requestFullscreen, 100);
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

  const handleSendMessage = async (content: string, imageBase64?: string, useWebSearch?: boolean, generateImage?: boolean) => {
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

      // Pour les autres cas (chat normal ou recherche web), continuer avec Supabase
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

      // Préparer le prompt pour Supabase avec historique
      const currentPrompt = imageBase64
        ? `${content} [Image: ${imageBase64}]`
        : content;
      const fullPrompt = conversationHistory + currentPrompt;

      // Insérer la requête dans la table requests
      const { data: insertData, error: insertError } = await supabase
        .from("requests")
        .insert([
          {
            prompt: fullPrompt,
            imput_message: { text: content },
            status: "pending",
            use_web_search: useWebSearch || false,
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
            
            // Auto-scroll pendant le streaming
            if (scrollAreaRef.current) {
              const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
              if (scrollContainer) {
                scrollContainer.scrollTo({ top: scrollContainer.scrollHeight, behavior: 'smooth' });
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
          const searchResults = useWebSearch && pollData.search_results
            ? (pollData.search_results as any).results
            : undefined;

          // Si recherche web, afficher un toast avec les résultats
          if (useWebSearch && pollData.search_results) {
            const searchData = pollData.search_results as any;
            toast({
              title: "Recherche web effectuée",
              description: `${searchData.count || 0} résultats trouvés`,
            });
          }

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

          // Auto-scroll final
          setTimeout(() => {
            if (scrollAreaRef.current) {
              const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
              if (scrollContainer) {
                scrollContainer.scrollTo({ top: scrollContainer.scrollHeight, behavior: 'smooth' });
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
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-[999] transition-opacity"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <div className={`w-64 sm:w-72 md:w-80 border-r border-sidebar-border bg-sidebar flex flex-col transition-transform duration-300 fixed top-0 left-0 h-screen z-[1000] ${
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      }`}>
        <div className="p-4 border-b border-sidebar-border">
          <Button
            onClick={createNewChat}
            className="w-full bg-gradient-to-r from-primary to-secondary text-primary-foreground font-semibold hover:scale-105 transition-all hover:shadow-[var(--shadow-ai)]"
          >
            <Plus className="h-5 w-5 mr-2" />
            Nouvelle conversation
          </Button>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {conversations.map((conv) => (
              <ConversationItem
                key={conv.id}
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
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Main Chat */}
      <div className="flex-1 flex flex-col">
        {/* Chat Area */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea ref={scrollAreaRef} className="h-full">
            <div className="max-w-4xl mx-auto">
              {currentMessages.length === 0 ? (
                <motion.div
                  className="flex flex-col items-center justify-center h-full min-h-[600px] text-center px-4"
                  variants={staggerContainer}
                  initial="initial"
                  animate="animate"
                >
                  <motion.div
                    variants={slideInVariants.slideInUp}
                    className="relative"
                  >
                    <motion.h1
                      className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent"
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.8, delay: 0.2 }}
                    >
                      Discutez avec Jux
                    </motion.h1>
                  </motion.div>

                  <motion.p
                    className="text-muted-foreground max-w-md mb-4"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.4 }}
                  >
                    Démarrez une conversation avec le modèle Qwen
                  </motion.p>

                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, delay: 0.6 }}
                  >
                    {showPauseNotice && <PauseNotice />}
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.8 }}
                  >
                    <DownloadCard onDownloadClick={() => setIsModalOpen(true)} />
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, delay: 1.0 }}
                  >
                    <VersionCard />
                  </motion.div>
                </motion.div>
              ) : (
                <div className="space-y-0">
                  {currentMessages.map((message) => (
                    <div
                      key={message.id}
                      className={`px-3 sm:px-6 py-4 sm:py-6 ${
                        message.role === "user" ? "bg-background" : "bg-card"
                      }`}
                    >
                      <div className="max-w-4xl mx-auto">
                        <ChatMessage
                          role={message.role}
                          content={message.content}
                        />
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <motion.div
                      className="px-3 sm:px-6 py-4 sm:py-6 bg-card"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="max-w-4xl mx-auto flex gap-4 items-center">
                        <motion.div
                          animate={{
                            rotate: 360,
                            scale: [1, 1.2, 1]
                          }}
                          transition={{
                            rotate: { duration: 1, repeat: Infinity, ease: "linear" },
                            scale: { duration: 1, repeat: Infinity, ease: "easeInOut" }
                          }}
                        >
                          <Loader2 className="h-5 w-5 text-primary" />
                        </motion.div>
                        <motion.div
                          className="text-muted-foreground"
                          animate={{ opacity: [0.5, 1, 0.5] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        >
                          En train de réfléchir...
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
        <div className="border-t border-border bg-background">
          <div className="px-2 sm:px-4 py-3 sm:py-5 max-w-4xl mx-auto">
            <ChatInput onSend={handleSendMessage} onStop={handleStopGeneration} isLoading={isLoading} />
          </div>
        </div>
      </div>



    </div>
  );
};

export default Index;
