import { useState, FormEvent, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2, Image, X, Globe, Plus, Mic, MicOff } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ChatInputProps {
  onSend: (message: string, imageBase64?: string, useWebSearch?: boolean) => void;
  isLoading: boolean;
  isWebView?: boolean;
}

export const ChatInput = ({ onSend, isLoading, isWebView = false }: ChatInputProps) => {
  const [input, setInput] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [useWebSearch, setUseWebSearch] = useState(false);
  const [mode, setMode] = useState<"none" | "image" | "web">("none");
  const [isRecording, setIsRecording] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if ((input.trim() || imageBase64) && !isLoading) {
      onSend(input.trim(), imageBase64 || undefined, useWebSearch);
      setInput("");
      setImagePreview(null);
      setImageBase64(null);
      setMode("none");
      setUseWebSearch(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Veuillez sélectionner une image.");
      return;
    }

    // If web search is enabled, disable it when uploading image
    if (useWebSearch) {
      setUseWebSearch(false);
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        const MAX_SIZE = 1024;
        if (width > MAX_SIZE || height > MAX_SIZE) {
          if (width > height) {
            height = Math.round((height * MAX_SIZE) / width);
            width = MAX_SIZE;
          } else {
            width = Math.round((width * MAX_SIZE) / height);
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const base64Image = canvas.toDataURL(file.type);
          setImageBase64(base64Image);
          setImagePreview(base64Image);
          setMode("image");
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeImage = () => {
    setImagePreview(null);
    setImageBase64(null);
  };

  const startVoiceRecording = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('La reconnaissance vocale n\'est pas supportée par votre navigateur.');
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'fr-FR'; // French language

    recognition.onstart = () => {
      setIsRecording(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(prev => prev + (prev ? ' ' : '') + transcript);
    };

    recognition.onerror = (event: any) => {
      console.error('Erreur de reconnaissance vocale:', event.error);
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopVoiceRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  // Auto-resize textarea based on content
  useEffect(() => {
    if (textareaRef.current) {
      if (input === '') {
        // Set initial height to match button height based on screen size
        const width = window.innerWidth;
        let height = '36px'; // default h-9
        if (width >= 640) height = '44px'; // sm:h-11
        if (width >= 768) height = '48px'; // md:h-12
        textareaRef.current.style.height = height;
      } else {
        textareaRef.current.style.height = 'auto';
        const scrollHeight = textareaRef.current.scrollHeight;
        const maxHeight = 100; // max-h-[100px]

        if (scrollHeight <= maxHeight) {
          textareaRef.current.style.height = scrollHeight + 'px';
        } else {
          textareaRef.current.style.height = maxHeight + 'px';
        }
      }
    }
  }, [input]);

  return (
    <form onSubmit={handleSubmit} className="relative">
      <div className="relative flex items-center gap-2">
        {imagePreview && (
          <div className="absolute bottom-full left-0 mb-2 p-2 bg-card rounded-lg border shadow-lg">
            <div className="relative">
              <img
                src={imagePreview}
                alt="Aperçu"
                className="max-w-[200px] rounded"
              />
              <Button
                type="button"
                size="icon"
                variant="destructive"
                className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                onClick={removeImage}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageUpload}
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              size="icon"
              variant={(imageBase64 || useWebSearch) ? "default" : "outline"}
              className={cn(
                "shrink-0 transition-all h-9 w-9 sm:h-11 sm:w-11 md:h-12 md:w-12",
                (imageBase64 || useWebSearch)
                  ? "bg-primary text-background hover:bg-primary/90 border-primary shadow-[0_0_10px_rgba(0,255,255,0.3)]"
                  : "bg-card border-border hover:bg-accent hover:border-primary"
              )}
              disabled={isLoading}
              title="Options de message"
            >
              <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuItem
              onClick={() => {
                fileInputRef.current?.click();
                setMode("image");
              }}
              className={cn("flex items-center gap-2", useWebSearch && "opacity-50 cursor-not-allowed")}
              disabled={useWebSearch}
            >
              <Image className="h-4 w-4" />
              Ajouter une image
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                // If image is uploaded, disable it when enabling web search
                if (imageBase64) {
                  setImagePreview(null);
                  setImageBase64(null);
                }
                setUseWebSearch(!useWebSearch);
                setMode(useWebSearch ? "none" : "web");
              }}
              className={cn("flex items-center gap-2", imageBase64 && "opacity-50 cursor-not-allowed")}
              disabled={!!imageBase64}
            >
              <Globe className="h-4 w-4" />
              {useWebSearch ? "Désactiver" : "Activer"} recherche web
              <span className="ml-1 text-[10px] bg-gray-400 text-white px-0.5 py-0.5 rounded">Beta</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <div className="relative flex-1">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Envoyez un message..."
            className={cn(
              "min-h-[36px] max-h-[100px] h-9 sm:h-11 md:h-12 transition-all text-sm sm:text-base pr-10 resize-none",
              "bg-card border-border focus:border-primary focus:shadow-[0_0_0_2px_rgba(0,255,255,0.1)]",
              "focus-visible:ring-0 overflow-y-auto"
            )}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                if (e.shiftKey) {
                  // Allow new line with Shift+Enter
                  return;
                } else {
                  // Submit on Enter (desktop) or if on mobile, allow new line
                  if (window.innerWidth > 768) {
                    // Desktop: submit on Enter
                    e.preventDefault();
                    handleSubmit(e);
                  }
                  // Mobile: allow new line on Enter
                }
              }
            }}
            disabled={isLoading}
            rows={1}
          />
          {!isWebView && (
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
              onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
              disabled={isLoading}
              title={isRecording ? "Arrêter l'enregistrement" : "Commencer l'enregistrement vocal"}
            >
              {isRecording ? (
                <MicOff className="h-4 w-4 text-red-500" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
        <Button
          type="submit"
          size="icon"
          disabled={(!input.trim() && !imageBase64) || isLoading}
          className={cn(
            "shrink-0 transition-all min-w-[40px] sm:min-w-[50px] md:min-w-[60px] h-9 w-9 sm:h-11 sm:w-11 md:h-12 md:w-12",
            "bg-primary text-background hover:bg-primary/90 hover:scale-105"
          )}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
          ) : (
            <Send className="h-4 w-4 sm:h-5 sm:w-5" />
          )}
        </Button>
      </div>
    </form>
  );
};
