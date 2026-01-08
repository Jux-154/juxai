import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { SidebarToggle } from "@/components/SidebarToggle";
import { Settings } from "@/components/Settings";
import { Updates } from "@/components/Updates";
import { ImageGenerationLoader } from "@/components/ImageGenerationLoader";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { LogOut, X, Send, Mic, MicOff, ChevronLeft, ChevronRight, Download, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface GeneratedImage {
  id: string;
  prompt: string;
  imageBase64: string;
  createdAt: number;
}

// Style presets for quick access
const STYLE_PRESETS = [
  { id: "croquis", name: "Croquis", prompt: "pencil sketch style, hand-drawn, artistic" },
  { id: "dramatique", name: "Dramatique", prompt: "dramatic lighting, cinematic, high contrast" },
  { id: "plushie", name: "Plushie", prompt: "cute plush toy style, soft, adorable, 3D render" },
  { id: "retro", name: "Rétro", prompt: "retro anime style, 80s, vintage colors" },
  { id: "figurine", name: "Figurine", prompt: "3D figurine, toy style, detailed miniature" },
  { id: "doodle", name: "Doodle", prompt: "doodle art style, hand-drawn, sketchy" },
  { id: "photoreal", name: "Photoréaliste", prompt: "photorealistic, highly detailed, 8k" },
  { id: "watercolor", name: "Aquarelle", prompt: "watercolor painting style, soft colors, artistic" },
];

const Index = () => {
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [styleScrollIndex, setStyleScrollIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);
  const { toast } = useToast();
  const shouldStopRef = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // État pour la génération d'image avec loader visuel
  const [imageGenState, setImageGenState] = useState<{
    isGenerating: boolean;
    progress: number;
    timeRemaining: number;
    status: "pending" | "generating";
    queuePosition: number;
  } | null>(null);

  // Auth effect - compte obligatoire
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (!session?.user) {
          navigate("/auth");
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Charger les images générées depuis localStorage
  useEffect(() => {
    const stored = localStorage.getItem("jux-generated-images");
    if (stored) {
      setGeneratedImages(JSON.parse(stored));
    }
  }, []);

  // Sauvegarder les images générées
  const saveImages = (images: GeneratedImage[]) => {
    localStorage.setItem("jux-generated-images", JSON.stringify(images));
    setGeneratedImages(images);
  };

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => setIsSidebarOpen(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const handleStyleClick = (style: typeof STYLE_PRESETS[0]) => {
    setPrompt(prev => {
      if (prev.trim()) {
        return `${prev.trim()}, ${style.prompt}`;
      }
      return style.prompt;
    });
  };

  const scrollStyles = (direction: "left" | "right") => {
    const maxIndex = Math.max(0, STYLE_PRESETS.length - 4);
    if (direction === "left") {
      setStyleScrollIndex(Math.max(0, styleScrollIndex - 1));
    } else {
      setStyleScrollIndex(Math.min(maxIndex, styleScrollIndex + 1));
    }
  };

  const startVoiceRecording = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast({ title: "Non supporté", description: "La reconnaissance vocale n'est pas disponible", variant: "destructive" });
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'fr-FR';

    recognition.onstart = () => setIsRecording(true);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setPrompt(prev => prev + (prev ? ' ' : '') + transcript);
    };
    recognition.onerror = () => setIsRecording(false);
    recognition.onend = () => setIsRecording(false);

    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopVoiceRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  const handleGenerateImage = async () => {
    if (!prompt.trim() || isLoading) return;

    setIsLoading(true);
    shouldStopRef.current = false;

    const TIMEOUT_MS = 2 * 60 * 1000;
    const startTime = Date.now();

    try {
      const { data, error } = await supabase.functions.invoke('generate-image', {
        body: { prompt: prompt.trim(), negativePrompt: "" }
      });

      if (error) throw error;

      const imageRequestId = data?.requestId;
      if (!imageRequestId) throw new Error("Pas d'ID de requête reçu");

      // Polling pour suivre la progression
      while (true) {
        const elapsed = Date.now() - startTime;
        const remaining = TIMEOUT_MS - elapsed;

        if (remaining <= 0) {
          setImageGenState(null);
          await supabase.from("image_requests").delete().eq("id", imageRequestId);
          toast({ title: "Délai dépassé", description: "La génération a été annulée après 2 minutes", variant: "destructive" });
          break;
        }

        if (shouldStopRef.current) {
          setImageGenState(null);
          await supabase.from("image_requests").delete().eq("id", imageRequestId);
          toast({ title: "Annulé", description: "Génération annulée" });
          break;
        }

        await new Promise(resolve => setTimeout(resolve, 500));

        const { data: pollData, error: pollError } = await supabase
          .from("image_requests")
          .select("status, image_base64, progress")
          .eq("id", imageRequestId)
          .maybeSingle();

        if (pollError) throw pollError;
        if (!pollData) continue;

        const progress = pollData.progress || 0;
        let queuePosition = 1;

        if (pollData.status === "pending") {
          const { count } = await supabase
            .from("image_requests")
            .select("*", { count: "exact", head: true })
            .in("status", ["pending", "generating"])
            .lt("created_at", new Date().toISOString());
          queuePosition = (count || 0) + 1;
        }

        setImageGenState({
          isGenerating: true,
          progress,
          timeRemaining: Math.max(0, remaining / 1000),
          status: pollData.status === "generating" ? "generating" : "pending",
          queuePosition,
        });

        if (pollData.status === "done" && pollData.image_base64) {
          setImageGenState(null);
          
          const newImage: GeneratedImage = {
            id: Date.now().toString(),
            prompt: prompt.trim(),
            imageBase64: pollData.image_base64,
            createdAt: Date.now(),
          };
          
          saveImages([newImage, ...generatedImages]);
          setPrompt("");
          toast({ title: "Image générée", description: "Votre image a été créée avec succès" });
          break;
        } else if (pollData.status === "error") {
          setImageGenState(null);
          throw new Error(pollData.image_base64 || "Erreur lors de la génération");
        } else if (pollData.status === "cancelled") {
          setImageGenState(null);
          await supabase.from("image_requests").delete().eq("id", imageRequestId);
          break;
        }
      }
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message || "Impossible de générer l'image", variant: "destructive" });
      setImageGenState(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStopGeneration = () => {
    shouldStopRef.current = true;
  };

  const handleDeleteImage = (id: string) => {
    const updated = generatedImages.filter(img => img.id !== id);
    saveImages(updated);
    toast({ title: "Image supprimée" });
  };

  const handleDownloadImage = (image: GeneratedImage) => {
    const link = document.createElement('a');
    link.href = `data:image/png;base64,${image.imageBase64}`;
    link.download = `jux-image-${image.id}.png`;
    link.click();
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  }, [prompt]);

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
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999]"
            onClick={closeSidebar}
          />
        )}
      </AnimatePresence>

      {/* Sidebar simplifié */}
      <motion.div 
        className={`w-72 border-r border-sidebar-border/30 glass-sidebar flex flex-col fixed top-0 left-0 h-screen z-[1000] ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ transition: "transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)" }}
      >
        <div className="p-4 border-b border-sidebar-border/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-primary to-secondary rounded-xl blur-md opacity-50" />
                <div className="relative h-10 w-10 rounded-xl overflow-hidden">
                  <img src="https://i.ibb.co/Kzs6bzhM/Jux.jpg" alt="Jux" className="w-full h-full object-cover" />
                </div>
              </div>
              <div>
                <h1 className="font-bold text-lg text-foreground">Jux AI</h1>
                <p className="text-xs text-muted-foreground">Génération d'images</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={closeSidebar} className="h-8 w-8 rounded-lg">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Infos utilisateur */}
        <div className="flex-1 p-4">
          <div className="glass-card rounded-xl p-4 mb-4">
            <p className="text-sm text-muted-foreground mb-1">Connecté en tant que</p>
            <p className="text-sm font-medium text-foreground truncate">{user?.email}</p>
          </div>
          
          <div className="glass-card rounded-xl p-4">
            <p className="text-sm text-muted-foreground mb-2">Images générées</p>
            <p className="text-2xl font-bold text-primary">{generatedImages.length}</p>
          </div>
        </div>
        
        {/* Footer Sidebar */}
        <div className="p-4 border-t border-sidebar-border/30 space-y-3 bg-sidebar-background/80">
          <div className="flex items-center gap-2">
            <Settings />
            <Updates />
            <div className="flex-1" />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-xs gap-1.5 text-muted-foreground hover:text-foreground hover:bg-destructive/10"
            >
              <LogOut className="h-3.5 w-3.5" />
              Déconnexion
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <ScrollArea className="flex-1">
          <div className="max-w-4xl mx-auto px-4 py-8">
            {/* Header */}
            <motion.div 
              className="text-center mb-8"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h1 className="text-3xl sm:text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Images
              </h1>
              <p className="text-muted-foreground">Décrivez l'image que vous souhaitez créer</p>
            </motion.div>

            {/* Input Zone */}
            <motion.div 
              className="mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="glass-card rounded-2xl p-4">
                <div className="flex items-end gap-3">
                  <Textarea
                    ref={textareaRef}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Décrire une nouvelle image..."
                    className="flex-1 min-h-[48px] max-h-[120px] resize-none bg-transparent border-0 focus-visible:ring-0 text-foreground placeholder:text-muted-foreground/50"
                    disabled={isLoading}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey && window.innerWidth > 768) {
                        e.preventDefault();
                        handleGenerateImage();
                      }
                    }}
                  />
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
                      className={`h-10 w-10 rounded-xl ${isRecording ? "bg-destructive/15 text-destructive" : "text-muted-foreground hover:text-primary"}`}
                      disabled={isLoading}
                    >
                      {isRecording ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                    </Button>
                    {isLoading ? (
                      <Button
                        onClick={handleStopGeneration}
                        size="icon"
                        className="h-10 w-10 rounded-xl bg-destructive hover:bg-destructive/90"
                      >
                        <X className="h-5 w-5" />
                      </Button>
                    ) : (
                      <Button
                        onClick={handleGenerateImage}
                        size="icon"
                        disabled={!prompt.trim()}
                        className="h-10 w-10 rounded-xl bg-gradient-to-r from-primary to-secondary hover:opacity-90 glow-button"
                      >
                        <Send className="h-5 w-5" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Loader visuel */}
            <AnimatePresence>
              {imageGenState?.isGenerating && (
                <motion.div
                  className="mb-8"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <ImageGenerationLoader
                    progress={imageGenState.progress}
                    timeRemaining={imageGenState.timeRemaining}
                    status={imageGenState.status}
                    queuePosition={imageGenState.queuePosition}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Style Presets */}
            <motion.div 
              className="mb-10"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-foreground">Appliquez un style</h2>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-full"
                    onClick={() => scrollStyles("left")}
                    disabled={styleScrollIndex === 0}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-full"
                    onClick={() => scrollStyles("right")}
                    disabled={styleScrollIndex >= STYLE_PRESETS.length - 4}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="overflow-hidden">
                <motion.div 
                  className="flex gap-4"
                  animate={{ x: -styleScrollIndex * 140 }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                >
                  {STYLE_PRESETS.map((style) => (
                    <motion.button
                      key={style.id}
                      onClick={() => handleStyleClick(style)}
                      className="flex-shrink-0 w-28 sm:w-32 group"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <div className="aspect-square rounded-xl bg-gradient-to-br from-card to-muted border border-border/50 mb-2 flex items-center justify-center group-hover:border-primary/50 transition-colors overflow-hidden">
                        <span className="text-3xl">🎨</span>
                      </div>
                      <p className="text-sm text-center text-foreground/80 group-hover:text-foreground">{style.name}</p>
                    </motion.button>
                  ))}
                </motion.div>
              </div>
            </motion.div>

            {/* Mes Images (Galerie) */}
            {generatedImages.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <h2 className="text-lg font-semibold text-foreground mb-4">Mes images</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {generatedImages.map((image) => (
                    <motion.div
                      key={image.id}
                      className="group relative aspect-square rounded-xl overflow-hidden border border-border/50 hover:border-primary/50 transition-colors"
                      whileHover={{ scale: 1.02 }}
                    >
                      <img
                        src={`data:image/png;base64,${image.imageBase64}`}
                        alt={image.prompt}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <Button
                          size="icon"
                          variant="secondary"
                          className="h-8 w-8 rounded-lg"
                          onClick={() => handleDownloadImage(image)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="destructive"
                          className="h-8 w-8 rounded-lg"
                          onClick={() => handleDeleteImage(image.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                        <p className="text-xs text-white truncate">{image.prompt}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Empty state */}
            {generatedImages.length === 0 && !imageGenState?.isGenerating && (
              <motion.div
                className="text-center py-16"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                <div className="w-24 h-24 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                  <span className="text-4xl">🎨</span>
                </div>
                <h3 className="text-lg font-medium text-foreground mb-2">Aucune image générée</h3>
                <p className="text-muted-foreground text-sm">Décrivez votre première image ci-dessus pour commencer</p>
              </motion.div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export default Index;
