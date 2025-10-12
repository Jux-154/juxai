import { useState, useEffect } from "react";
import { ChatMessage } from "@/components/ChatMessage";
import { ChatInput } from "@/components/ChatInput";
import { ConversationItem } from "@/components/ConversationItem";
import { MobileSidebarToggle } from "@/components/MobileSidebarToggle";
import { DownloadCard } from "@/components/DownloadCard";
import { VersionCard } from "@/components/VersionCard";
import { ApiStatus } from "@/components/ApiStatus";
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { toast } = useToast();

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
    toast({
      title: "Conversation renommée",
      description: `Le titre a été changé en "${newTitle}"`,
    });
  };

  const handleDeleteConversation = (id: string) => {
    const filtered = conversations.filter((c) => c.id !== id);
    saveConversations(filtered);
    
    if (id === currentConversationId) {
      if (filtered.length > 0) {
        setCurrentConversationId(filtered[0].id);
      } else {
        createNewChat();
      }
    }
    
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

    try {
      // Préparer le prompt pour Supabase
      const promptText = imageBase64
        ? `${content} [Image: ${imageBase64}]`
        : content;

      // Insérer la requête dans la table requests
      const { data: insertData, error: insertError } = await supabase
        .from("requests")
        .insert([
          {
            prompt: promptText,
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
    }
  };

  const currentMessages = getCurrentConversation()?.messages || [];

  return (
    <div className="flex h-screen bg-background relative">
      <MobileSidebarToggle onClick={toggleSidebar} />
      
      {/* Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-[999] transition-opacity"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <div className={`w-64 border-r border-sidebar-border bg-sidebar flex flex-col transition-transform duration-300 md:relative md:translate-x-0 fixed top-0 left-0 h-screen z-[1000] ${
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
              />
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Main Chat */}
      <div className="flex-1 flex flex-col">
        {/* Chat Area */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="max-w-4xl mx-auto">
              {currentMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full min-h-[600px] text-center px-4">
                  <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                    Discutez avec Jux
                  </h1>
                  <p className="text-muted-foreground max-w-md mb-4">
                    Démarrez une conversation avec le modèle Qwen
                  </p>
                  <DownloadCard onDownloadClick={() => setIsModalOpen(true)} />
                  <VersionCard />
                </div>
              ) : (
                <div className="space-y-0">
                  {currentMessages.map((message) => (
                    <div
                      key={message.id}
                      className={`px-6 py-6 ${
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
                    <div className="px-6 py-6 bg-card">
                      <div className="max-w-4xl mx-auto flex gap-4">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-primary to-secondary flex items-center justify-center flex-shrink-0">
                          <div className="w-4 h-4 border-2 border-background border-t-transparent rounded-full animate-spin" />
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
          <div className="px-4 py-5 max-w-4xl mx-auto">
            <ChatInput onSend={handleSendMessage} isLoading={isLoading} />
          </div>
        </div>
      </div>

      <ApiStatus />
      <DownloadModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
};

export default Index;
