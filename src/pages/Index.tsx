import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { SidebarToggle } from "@/components/SidebarToggle";
import { Settings } from "@/components/Settings";
import { Updates } from "@/components/Updates";
import { ImageGenerationLoader } from "@/components/ImageGenerationLoader";
import { ImageLightbox, LightboxImage } from "@/components/ImageLightbox";
import { ProfileModal } from "@/components/ProfileModal";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { useToast } from "@/hooks/use-toast";
import { useUserImages } from "@/hooks/useUserImages";
import { useUserCredits } from "@/hooks/useUserCredits";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { X, Send, Mic, MicOff, ImagePlus, Sparkles, Wand2, Images, User as UserIcon, Coins } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Presets pour génération (texte seul)
const GENERATION_PRESETS = [
  { id: "croquis", name: "Croquis", prompt: "pencil sketch style, hand-drawn, artistic", emoji: "✏️" },
  { id: "dramatique", name: "Dramatique", prompt: "dramatic lighting, cinematic, high contrast", emoji: "🎭" },
  { id: "plushie", name: "Plushie", prompt: "cute plush toy style, soft, adorable, 3D render", emoji: "🧸" },
  { id: "photoreal", name: "Photoréaliste", prompt: "photorealistic, highly detailed, 8k", emoji: "📷" },
  { id: "watercolor", name: "Aquarelle", prompt: "watercolor painting style, soft colors, artistic", emoji: "🎨" },
  { id: "anime", name: "Anime", prompt: "anime style, vibrant colors, detailed", emoji: "🌸" },
];

// Presets pour édition (texte + image) - Désactivé pour l'instant
const EDIT_PRESETS = [
  { id: "background", name: "Changer fond", prompt: "change the background to", emoji: "🖼️" },
  { id: "enhance", name: "Améliorer", prompt: "enhance and improve the quality of this image", emoji: "✨" },
  { id: "style-transfer", name: "Style artistique", prompt: "transform this image into an artistic painting style", emoji: "🎨" },
  { id: "remove-bg", name: "Retirer objets", prompt: "remove unwanted objects and clean up the image", emoji: "🧹" },
  { id: "colorize", name: "Coloriser", prompt: "add vibrant colors and enhance saturation", emoji: "🌈" },
  { id: "vintage", name: "Vintage", prompt: "apply a vintage retro film effect to this image", emoji: "📼" },
];

const Index = () => {
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"generate" | "edit">("generate");
  const [lightboxImage, setLightboxImage] = useState<LightboxImage | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const recognitionRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { images, saveImage, deleteImage, publishImage } = useUserImages(user?.id);
  const { credits, useCredit, refreshCredits } = useUserCredits(user?.id);

  const [imageGenState, setImageGenState] = useState<{
    isGenerating: boolean;
    progress: number;
    timeRemaining: number;
    status: "pending" | "generating";
    queuePosition: number;
  } | null>(null);

  // Reprendre le polling d'une génération en cours après refresh/réveil
  useEffect(() => {
    const resumeGeneration = async () => {
      const savedRequest = localStorage.getItem("pendingImageRequest");
      if (!savedRequest) return;

      try {
        const { requestId, prompt: savedPrompt, startTime } = JSON.parse(savedRequest);
        
        // Vérifier si la requête existe encore
        const { data: pollData, error } = await supabase
          .from("image_requests")
          .select("status, image_base64, progress")
          .eq("id", requestId)
          .maybeSingle();

        if (error || !pollData) {
          localStorage.removeItem("pendingImageRequest");
          return;
        }

        // Si déjà terminée, traiter le résultat
        if (pollData.status === "done" && pollData.image_base64) {
          localStorage.removeItem("pendingImageRequest");
          await saveImage(pollData.image_base64, savedPrompt);
          toast({ title: "Image générée", description: "Votre image a été récupérée avec succès" });
          return;
        }

        if (pollData.status === "error" || pollData.status === "cancelled") {
          localStorage.removeItem("pendingImageRequest");
          return;
        }

        // Reprendre le polling
        setIsLoading(true);
        continuePolling(requestId, savedPrompt, startTime);
      } catch (e) {
        localStorage.removeItem("pendingImageRequest");
      }
    };

    resumeGeneration();
  }, []);

  const continuePolling = async (requestId: string, savedPrompt: string, startTime: number) => {
    const TIMEOUT_MS = 2 * 60 * 1000;

    try {
      while (true) {
        const elapsed = Date.now() - startTime;
        const remaining = TIMEOUT_MS - elapsed;

        if (remaining <= 0) {
          setImageGenState(null);
          localStorage.removeItem("pendingImageRequest");
          await supabase.from("image_requests").delete().eq("id", requestId);
          toast({ title: "Délai dépassé", description: "La génération a été annulée après 2 minutes", variant: "destructive" });
          break;
        }

        await new Promise(resolve => setTimeout(resolve, 500));

        const { data: pollData, error: pollError } = await supabase
          .from("image_requests")
          .select("status, image_base64, progress")
          .eq("id", requestId)
          .maybeSingle();

        if (pollError) throw pollError;
        if (!pollData) {
          localStorage.removeItem("pendingImageRequest");
          break;
        }

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
          timeRemaining: pollData.status === "generating" ? -1 : Math.max(0, remaining / 1000),
          status: pollData.status === "generating" ? "generating" : "pending",
          queuePosition,
        });

        if (pollData.status === "done" && pollData.image_base64) {
          setImageGenState(null);
          localStorage.removeItem("pendingImageRequest");
          await saveImage(pollData.image_base64, savedPrompt);
          toast({ title: "Image générée", description: "Votre image a été créée avec succès" });
          break;
        } else if (pollData.status === "error") {
          setImageGenState(null);
          localStorage.removeItem("pendingImageRequest");
          throw new Error(pollData.image_base64 || "Erreur lors de la génération");
        } else if (pollData.status === "cancelled") {
          setImageGenState(null);
          localStorage.removeItem("pendingImageRequest");
          await supabase.from("image_requests").delete().eq("id", requestId);
          break;
        }
      }
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message || "Impossible de générer l'image", variant: "destructive" });
      setImageGenState(null);
      localStorage.removeItem("pendingImageRequest");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (!session?.user) navigate("/auth");
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (!session) navigate("/auth");
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => setIsSidebarOpen(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const handleStyleClick = (preset: { prompt: string }) => {
    setPrompt(prev => prev.trim() ? `${prev.trim()}, ${preset.prompt}` : preset.prompt);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Erreur", description: "Veuillez sélectionner une image", variant: "destructive" });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = (event.target?.result as string)?.split(",")[1];
      if (base64) {
        setUploadedImage(base64);
        setActiveTab("edit");
        toast({ title: "Image ajoutée", description: "Mode édition activé" });
      }
    };
    reader.readAsDataURL(file);
  };

  const removeUploadedImage = () => {
    setUploadedImage(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
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
    if (recognitionRef.current) recognitionRef.current.stop();
  };

  const handleGenerateImage = async () => {
    if (!prompt.trim() || isLoading) return;

    if (activeTab === "edit" && !uploadedImage) {
      toast({ title: "Image requise", description: "Ajoutez une image pour le mode édition", variant: "destructive" });
      return;
    }

    // Vérifier les crédits
    if (credits <= 0) {
      toast({ 
        title: "Plus de crédits", 
        description: "Vos crédits seront réinitialisés à minuit (UTC-4)", 
        variant: "destructive" 
      });
      return;
    }

    // Utiliser un crédit
    const success = await useCredit();
    if (!success) {
      toast({ title: "Erreur", description: "Impossible d'utiliser un crédit", variant: "destructive" });
      return;
    }

    setIsLoading(true);

    const TIMEOUT_MS = 2 * 60 * 1000;
    const startTime = Date.now();

    try {
      const imageToSend = activeTab === "edit" ? uploadedImage : null;
      
      const { data, error } = await supabase.functions.invoke('generate-image', {
        body: { 
          prompt: prompt.trim(), 
          negativePrompt: "",
          inputImage: imageToSend
        }
      });

      if (error) throw error;

      const imageRequestId = data?.requestId;
      if (!imageRequestId) throw new Error("Pas d'ID de requête reçu");

      const currentPrompt = prompt.trim();

      // Sauvegarder dans localStorage pour reprendre après refresh/réveil
      localStorage.setItem("pendingImageRequest", JSON.stringify({
        requestId: imageRequestId,
        prompt: currentPrompt,
        startTime
      }));

      while (true) {
        const elapsed = Date.now() - startTime;
        const remaining = TIMEOUT_MS - elapsed;

        if (remaining <= 0) {
          setImageGenState(null);
          localStorage.removeItem("pendingImageRequest");
          await supabase.from("image_requests").delete().eq("id", imageRequestId);
          toast({ title: "Délai dépassé", description: "La génération a été annulée après 2 minutes", variant: "destructive" });
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
          timeRemaining: pollData.status === "generating" ? -1 : Math.max(0, remaining / 1000),
          status: pollData.status === "generating" ? "generating" : "pending",
          queuePosition,
        });

        if (pollData.status === "done" && pollData.image_base64) {
          setImageGenState(null);
          localStorage.removeItem("pendingImageRequest");
          
          // Sauvegarder dans Supabase Storage
          await saveImage(pollData.image_base64, currentPrompt);
          
          setPrompt("");
          removeUploadedImage();
          toast({ title: "Image générée", description: "Votre image a été créée avec succès" });
          break;
        } else if (pollData.status === "error") {
          setImageGenState(null);
          localStorage.removeItem("pendingImageRequest");
          throw new Error(pollData.image_base64 || "Erreur lors de la génération");
        } else if (pollData.status === "cancelled") {
          setImageGenState(null);
          localStorage.removeItem("pendingImageRequest");
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

  const handleDeleteImage = async (id: string) => {
    await deleteImage(id);
  };

  const handleImageClick = (image: typeof images[0]) => {
    setLightboxImage({
      id: image.id,
      url: image.url,
      prompt: image.prompt,
      isPublished: image.isPublished,
    });
  };

  const handlePublish = async (imageId: string, title: string, description: string) => {
    await publishImage(imageId, title, description);
    setLightboxImage(null);
  };

  const handleSetAsAvatar = async (imageUrl: string) => {
    if (!user) return;
    
    const { error } = await supabase
      .from("user_settings")
      .upsert({
        user_id: user.id,
        avatar_url: imageUrl,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });

    if (error) throw error;
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  }, [prompt]);

  const currentPresets = activeTab === "generate" ? GENERATION_PRESETS : EDIT_PRESETS;

  return (
    <div className="flex h-screen bg-background relative overflow-hidden">
      <SidebarToggle onClick={toggleSidebar} isSidebarOpen={isSidebarOpen} />

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
        
        <div className="flex-1 p-4 space-y-3">
          <div className="glass-card rounded-xl p-4">
            <p className="text-sm text-muted-foreground mb-1">Connecté en tant que</p>
            <p className="text-sm font-medium text-foreground truncate">{user?.email}</p>
          </div>
          
          <div className="glass-card rounded-xl p-4">
            <p className="text-sm text-muted-foreground mb-2">Images générées</p>
            <p className="text-2xl font-bold text-primary">{images.length}</p>
          </div>

          {/* Lien vers Créations */}
          <Button
            variant="outline"
            className="w-full gap-2 justify-start"
            onClick={() => { closeSidebar(); navigate("/creations"); }}
          >
            <Images className="h-4 w-4" />
            Créations
          </Button>
        </div>
        
        <div className="p-4 border-t border-sidebar-border/30 space-y-3 bg-sidebar-background/80">
          <div className="flex items-center gap-2">
            <Settings />
            <Updates />
            <div className="flex-1" />
            <Button
              variant="outline"
              size="sm"
              onClick={() => { closeSidebar(); setIsProfileOpen(true); }}
              className="text-xs gap-1.5"
            >
              <UserIcon className="h-3.5 w-3.5" />
              Profil
              <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">
                <Coins className="h-2.5 w-2.5 mr-0.5" />
                {credits}
              </Badge>
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Profile Modal */}
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        user={user}
        credits={credits}
        onLogout={handleLogout}
      />

      <div className="flex-1 flex flex-col">
        <ScrollArea className="flex-1">
          <div className="max-w-4xl mx-auto px-3 sm:px-4 py-6 sm:py-8">
            <motion.div 
              className="text-center mb-6 sm:mb-8"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h1 className="text-2xl sm:text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Images
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground">
                {activeTab === "generate" ? "Décrivez l'image que vous souhaitez créer" : "Modifiez une image avec votre description"}
              </p>
            </motion.div>

            {/* Tabs Génération / Édition */}
            <motion.div 
              className="flex gap-2 mb-4 sm:mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
            >
              <Button
                variant={activeTab === "generate" ? "default" : "outline"}
                onClick={() => { setActiveTab("generate"); removeUploadedImage(); }}
                className="flex-1 gap-2"
                size="sm"
              >
                <Sparkles className="h-4 w-4" />
                <span className="hidden sm:inline">Générer</span>
              </Button>
              <Button
                variant={activeTab === "edit" ? "default" : "outline"}
                onClick={() => setActiveTab("edit")}
                className="flex-1 gap-2 relative"
                size="sm"
                disabled
              >
                <Wand2 className="h-4 w-4" />
                <span className="hidden sm:inline">Éditer</span>
                <Badge variant="secondary" className="absolute -top-2 -right-2 text-[9px] px-1.5">
                  Bientôt
                </Badge>
              </Button>
            </motion.div>

            {/* Input Zone */}
            <motion.div 
              className="mb-4 sm:mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="glass-card rounded-2xl p-3 sm:p-4">
                {/* Image preview pour mode édition */}
                {activeTab === "edit" && (
                  <div className="mb-3">
                    {uploadedImage ? (
                      <div className="relative inline-block">
                        <img 
                          src={`data:image/png;base64,${uploadedImage}`} 
                          alt="Image à éditer" 
                          className="h-20 sm:h-24 rounded-lg border border-border/50"
                        />
                        <Button
                          size="icon"
                          variant="destructive"
                          className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                          onClick={removeUploadedImage}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        className="w-full h-20 sm:h-24 border-dashed gap-2"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <ImagePlus className="h-5 w-5" />
                        <span className="text-sm">Ajouter une image</span>
                      </Button>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </div>
                )}

                <div className="flex items-end gap-2 sm:gap-3">
                  <Textarea
                    ref={textareaRef}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder={activeTab === "generate" ? "Décrire une nouvelle image..." : "Décrivez les modifications..."}
                    className="flex-1 min-h-[44px] sm:min-h-[48px] max-h-[100px] sm:max-h-[120px] resize-none bg-transparent border-0 focus-visible:ring-0 text-sm sm:text-base text-foreground placeholder:text-muted-foreground/50"
                    disabled={isLoading}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey && window.innerWidth > 768) {
                        e.preventDefault();
                        handleGenerateImage();
                      }
                    }}
                  />
                  <div className="flex items-center gap-1 sm:gap-2">
                    {activeTab === "edit" && !uploadedImage && (
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => fileInputRef.current?.click()}
                        className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl text-muted-foreground hover:text-primary"
                        disabled={isLoading}
                      >
                        <ImagePlus className="h-4 w-4 sm:h-5 sm:w-5" />
                      </Button>
                    )}
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
                      className={`h-9 w-9 sm:h-10 sm:w-10 rounded-xl ${isRecording ? "bg-destructive/15 text-destructive" : "text-muted-foreground hover:text-primary"}`}
                      disabled={isLoading}
                    >
                      {isRecording ? <MicOff className="h-4 w-4 sm:h-5 sm:w-5" /> : <Mic className="h-4 w-4 sm:h-5 sm:w-5" />}
                    </Button>
                    <Button
                      onClick={handleGenerateImage}
                      size="icon"
                      disabled={!prompt.trim() || (activeTab === "edit" && !uploadedImage) || isLoading}
                      className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-gradient-to-r from-primary to-secondary hover:opacity-90 glow-button"
                    >
                      <Send className="h-4 w-4 sm:h-5 sm:w-5" />
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Loader visuel */}
            <AnimatePresence>
              {imageGenState?.isGenerating && (
                <motion.div
                  className="mb-6 sm:mb-8"
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
              className="mb-8 sm:mb-10"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h2 className="text-base sm:text-lg font-semibold text-foreground mb-3 sm:mb-4">
                {activeTab === "generate" ? "Styles de génération" : "Styles d'édition"}
              </h2>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3">
                {currentPresets.map((preset) => (
                  <motion.button
                    key={preset.id}
                    onClick={() => handleStyleClick(preset)}
                    className="group text-center"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <div className="aspect-square rounded-xl bg-gradient-to-br from-card to-muted border border-border/50 mb-1 sm:mb-2 flex items-center justify-center group-hover:border-primary/50 transition-colors">
                      <span className="text-xl sm:text-2xl">{preset.emoji}</span>
                    </div>
                    <p className="text-xs sm:text-sm text-foreground/80 group-hover:text-foreground truncate">{preset.name}</p>
                  </motion.button>
                ))}
              </div>
            </motion.div>

            {/* Mes Images (Galerie) */}
            {images.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <h2 className="text-base sm:text-lg font-semibold text-foreground mb-3 sm:mb-4">Mes images</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-4">
                  {images.map((image) => (
                    <motion.div
                      key={image.id}
                      className="group relative aspect-square rounded-xl overflow-hidden border border-border/50 hover:border-primary/50 transition-colors cursor-pointer"
                      whileHover={{ scale: 1.02 }}
                      onClick={() => handleImageClick(image)}
                    >
                      <img
                        src={image.url}
                        alt={image.prompt}
                        className="w-full h-full object-cover"
                      />
                      {image.isPublished && (
                        <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-primary/80 text-[10px] text-white font-medium">
                          Publié
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 p-1.5 sm:p-2 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                        <p className="text-[10px] sm:text-xs text-white truncate">{image.prompt}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Empty state */}
            {images.length === 0 && !imageGenState?.isGenerating && (
              <motion.div
                className="text-center py-12 sm:py-16"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                  <span className="text-3xl sm:text-4xl">🎨</span>
                </div>
                <h3 className="text-base sm:text-lg font-medium text-foreground mb-2">Aucune image générée</h3>
                <p className="text-muted-foreground text-xs sm:text-sm">Décrivez votre première image ci-dessus</p>
              </motion.div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxImage && (
          <ImageLightbox
            image={lightboxImage}
            onClose={() => setLightboxImage(null)}
            onPublish={handlePublish}
            onSetAsAvatar={handleSetAsAvatar}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Index;
