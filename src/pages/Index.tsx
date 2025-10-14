import { useState, useEffect, useRef } from "react";
import { ChatMessage } from "@/components/ChatMessage";
import { ChatInput } from "@/components/ChatInput";
import { ConversationItem } from "@/components/ConversationItem";
import { MobileSidebarToggle } from "@/components/MobileSidebarToggle";
import { DownloadCard } from "@/components/DownloadCard";
import { VersionCard } from "@/components/VersionCard";

import { DownloadModal } from "@/components/DownloadModal";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Sparkles, Plus } from "lucide-react";

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
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isConversationLoading, setIsConversationLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isWebView, setIsWebView] = useState(false);
  const { toast } = useToast();
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Detect if running in WebView
    const detectWebView = () => {
      const ua = navigator.userAgent.toLowerCase();
      return ua.includes('wv') ||
             (window.navigator as any).standalone ||
             !!(window as any).webkit?.messageHandlers;
    };
    setIsWebView(detectWebView());

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

  const handleSendMessage = async (content: string, imageBase64?: string, useWebSearch?: boolean) => {
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

    // Update title with first message
    if (updatedMessages.length === 1) {
      const title =
        (typeof userMessage.content === "string"
          ? userMessage.content
          : userMessage.content[0]?.text || ""
        ).slice(0, 50) +
        ((typeof userMessage.content === "string"
          ? userMessage.content
          : userMessage.content[0]?.text || ""
        ).length > 50
          ? "..."
          : "");
      updateConversation(currentConversationId, { title });
    }

    setIsLoading(true);
    setIsConversationLoading(true);

    try {
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
      console.log("Requête insérée:", requestId);

      // Poller pour la réponse
      let response = "";
      let attempts = 0;
      const maxAttempts = 60; // 60 secondes maximum

      while (attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const { data: pollData, error: pollError } = await supabase
          .from("requests")
          .select("response, status, search_results")
          .eq("id", requestId)
          .single();

        if (pollError) throw pollError;

        if (pollData.status === "done") {
          response = pollData.response || "";

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

          // Créer le message assistant avec les sources
          const assistantMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: response,
            timestamp: Date.now(),
            searchResults: searchResults,
          };

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

          break;
        } else if (pollData.status === "error") {
          throw new Error(pollData.response || "Erreur inconnue");
        }

        attempts++;
      }

      if (!response && attempts >= maxAttempts) {
        throw new Error("Timeout: aucune réponse reçue");
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
    }
  };

  const currentMessages = getCurrentConversation()?.messages || [];

  return (
    <div className="flex h-screen bg-background relative overflow-hidden">
      <MobileSidebarToggle onClick={toggleSidebar} isSidebarOpen={isSidebarOpen} />

      {/* Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-[999] transition-opacity"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <div className={`w-64 sm:w-72 md:w-80 border-r border-sidebar-border bg-sidebar flex flex-col transition-transform duration-300 md:relative md:translate-x-0 fixed top-0 left-0 h-screen z-[1000] ${
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
                <div className="flex flex-col items-center justify-center h-full min-h-[600px] text-center px-4">
                  <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                    Discutez avec Jux
                  </h1>
                  <p className="text-muted-foreground max-w-md mb-4">
                    Démarrez une conversation avec le modèle Qwen
                  </p>
                  {!isWebView && <DownloadCard onDownloadClick={() => setIsModalOpen(true)} />}
                  <VersionCard />
                </div>
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
                    <div className="px-3 sm:px-6 py-4 sm:py-6 bg-card">
                      <div className="max-w-4xl mx-auto flex gap-4">
                        <div className="loader">
                          <svg id="cloud" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
                            <defs>
                              <filter id="roundness">
                                <feGaussianBlur in="SourceGraphic" stdDeviation="1.5"></feGaussianBlur>
                                <feColorMatrix
                                  values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 20 -10"
                                ></feColorMatrix>
                              </filter>
                              <mask id="shapes">
                                <g fill="white">
                                  <polygon points="50 37.5 80 75 20 75 50 37.5"></polygon>
                                  <circle cx="20" cy="60" r="15"></circle>
                                  <circle cx="80" cy="60" r="15"></circle>
                                  <g>
                                    <circle cx="20" cy="60" r="15"></circle>
                                    <circle cx="20" cy="60" r="15"></circle>
                                    <circle cx="20" cy="60" r="15"></circle>
                                  </g>
                                </g>
                              </mask>
                              <mask id="clipping" clipPathUnits="userSpaceOnUse">
                                <g id="lines" filter="url(#roundness)">
                                  <g mask="url(#shapes)" stroke="white">
                                    <line x1="-50" y1="-40" x2="150" y2="-40"></line>
                                    <line x1="-50" y1="-31" x2="150" y2="-31"></line>
                                    <line x1="-50" y1="-22" x2="150" y2="-22"></line>
                                    <line x1="-50" y1="-13" x2="150" y2="-13"></line>
                                    <line x1="-50" y1="-4" x2="150" y2="-4"></line>
                                    <line x1="-50" y1="5" x2="150" y2="5"></line>
                                    <line x1="-50" y1="14" x2="150" y2="14"></line>
                                    <line x1="-50" y1="23" x2="150" y2="23"></line>
                                    <line x1="-50" y1="32" x2="150" y2="32"></line>
                                    <line x1="-50" y1="41" x2="150" y2="41"></line>
                                    <line x1="-50" y1="50" x2="150" y2="50"></line>
                                    <line x1="-50" y1="59" x2="150" y2="59"></line>
                                    <line x1="-50" y1="68" x2="150" y2="68"></line>
                                    <line x1="-50" y1="77" x2="150" y2="77"></line>
                                    <line x1="-50" y1="86" x2="150" y2="86"></line>
                                    <line x1="-50" y1="95" x2="150" y2="95"></line>
                                    <line x1="-50" y1="104" x2="150" y2="104"></line>
                                    <line x1="-50" y1="113" x2="150" y2="113"></line>
                                    <line x1="-50" y1="122" x2="150" y2="122"></line>
                                    <line x1="-50" y1="131" x2="150" y2="131"></line>
                                    <line x1="-50" y1="140" x2="150" y2="140"></line>
                                  </g>
                                </g>
                              </mask>
                            </defs>
                            <rect
                              x="0"
                              y="0"
                              width="100"
                              height="100"
                              rx="0"
                              ry="0"
                              mask="url(#clipping)"
                            ></rect>
                            <g>
                              <path
                                d="M33.52,68.12 C35.02,62.8 39.03,58.52 44.24,56.69 C49.26,54.93 54.68,55.61 59.04,58.4 C59.04,58.4 56.24,60.53 56.24,60.53 C55.45,61.13 55.68,62.37 56.63,62.64 C56.63,62.64 67.21,65.66 67.21,65.66 C67.98,65.88 68.75,65.3 68.74,64.5 C68.74,64.5 68.68,53.5 68.68,53.5 C68.67,52.51 67.54,51.95 66.75,52.55 C66.75,52.55 64.04,54.61 64.04,54.61 C57.88,49.79 49.73,48.4 42.25,51.03 C35.2,53.51 29.78,59.29 27.74,66.49 C27.29,68.08 28.22,69.74 29.81,70.19 C30.09,70.27 30.36,70.31 30.63,70.31 C31.94,70.31 33.14,69.44 33.52,68.12Z"
                              ></path>
                              <path
                                d="M69.95,74.85 C68.35,74.4 66.7,75.32 66.25,76.92 C64.74,82.24 60.73,86.51 55.52,88.35 C50.51,90.11 45.09,89.43 40.73,86.63 C40.73,86.63 43.53,84.51 43.53,84.51 C44.31,83.91 44.08,82.67 43.13,82.4 C43.13,82.4 32.55,79.38 32.55,79.38 C31.78,79.16 31.02,79.74 31.02,80.54 C31.02,80.54 31.09,91.54 31.09,91.54 C31.09,92.53 32.22,93.09 33.01,92.49 C33.01,92.49 35.72,90.43 35.72,90.43 C39.81,93.63 44.77,95.32 49.84,95.32 C52.41,95.32 55,94.89 57.51,94.01 C64.56,91.53 69.99,85.75 72.02,78.55 C72.47,76.95 71.54,75.3 69.95,74.85Z"
                              ></path>
                            </g>
                          </svg>
                        </div>
                        <div className="text-muted-foreground">En train de réfléchir...</div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Input Area */}
        <div className="border-t border-border bg-background">
          <div className="px-2 sm:px-4 py-3 sm:py-5 max-w-4xl mx-auto">
            <ChatInput onSend={handleSendMessage} isLoading={isLoading} isWebView={isWebView} />
          </div>
        </div>
      </div>


      {!isWebView && <DownloadModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />}
    </div>
  );
};

export default Index;
