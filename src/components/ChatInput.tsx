import { useState, FormEvent, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2, Image, X, FileText, Plus, Mic, MicOff, AlertTriangle, Square, Wand2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";

interface ChatInputProps {
  onSend: (message: string, imageBase64?: string, useDocumentImport?: boolean, generateImage?: boolean, documentContents?: DocumentContent[]) => void;
  onStop?: () => void;
  isLoading: boolean;
  isWebView?: boolean;
  imageDisabled?: boolean;
  isAuthenticated?: boolean;
}

interface DocumentContent {
  name: string;
  type: string;
  content: string;
  base64: boolean;
}

export const ChatInput = ({ onSend, onStop, isLoading, isWebView = false, imageDisabled = false, isAuthenticated = false }: ChatInputProps) => {
  const [input, setInput] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [documentFiles, setDocumentFiles] = useState<File[]>([]);
  const [useDocumentImport, setUseDocumentImport] = useState(false);
  const [mode, setMode] = useState<"none" | "image" | "document" | "generate-image">("none");
  const [isRecording, setIsRecording] = useState(false);
  const [generateImageMode, setGenerateImageMode] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);



  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if ((input.trim() || imageBase64 || documentFiles.length > 0) && !isLoading) {
      // Si des documents sont présents, lire leur contenu
      let docContents: DocumentContent[] | undefined;
      if (documentFiles.length > 0) {
        docContents = await Promise.all(
          documentFiles.map(async (file) => {
            const content = await readFileAsBase64(file);
            return {
              name: file.name,
              type: file.type,
              content,
              base64: true,
            };
          })
        );
      }
      
      // Pass generateImageMode flag to parent
      onSend(input.trim(), imageBase64 || undefined, useDocumentImport, generateImageMode, docContents);
      setInput("");
      setImagePreview(null);
      setImageBase64(null);
      setDocumentFiles([]);
      setMode("none");
      setUseDocumentImport(false);
      setGenerateImageMode(false);
    }
  };

  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Enlever le préfixe data:...;base64,
        const base64 = result.split(',')[1] || result;
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Veuillez sélectionner une image.");
      return;
    }

    // If document import is enabled, disable it when uploading image
    if (useDocumentImport) {
      setUseDocumentImport(false);
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

  const handleDocumentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Validate file types
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/csv'
    ];

    const invalidFiles = files.filter(file => !allowedTypes.includes(file.type));
    if (invalidFiles.length > 0) {
      alert("Formats acceptés: PDF, DOCX, TXT, CSV");
      return;
    }

    // Check total size (30MB)
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    if (totalSize > 30 * 1024 * 1024) {
      alert("La taille totale ne doit pas dépasser 30MB");
      return;
    }

    // If image is uploaded, disable it when uploading documents
    if (imageBase64) {
      setImagePreview(null);
      setImageBase64(null);
    }

    setDocumentFiles(files);
    setUseDocumentImport(true);
    setMode("document");

    if (documentInputRef.current) {
      documentInputRef.current.value = "";
    }
  };

  const removeDocuments = () => {
    setDocumentFiles([]);
    setUseDocumentImport(false);
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
      <div className="relative flex items-center gap-2 sm:gap-3">
        {imagePreview && (
          <div className="absolute bottom-full left-0 mb-3 p-3 bg-card/95 backdrop-blur-sm rounded-xl border border-border/50 shadow-xl">
            <div className="relative">
              <img
                src={imagePreview}
                alt="Aperçu"
                className="max-w-[180px] rounded-lg"
              />
              <Button
                type="button"
                size="icon"
                variant="destructive"
                className="absolute -top-2 -right-2 h-6 w-6 rounded-full shadow-lg"
                onClick={removeImage}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}
        {documentFiles.length > 0 && (
          <div className="absolute bottom-full left-0 mb-3 p-3 bg-card/95 backdrop-blur-sm rounded-xl border border-border/50 shadow-xl max-w-[300px]">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-4 w-4 text-secondary" />
              <span className="text-sm font-medium">
                {documentFiles.length} document{documentFiles.length > 1 ? 's' : ''}
              </span>
              <Button
                type="button"
                size="icon"
                variant="destructive"
                className="h-6 w-6 rounded-full ml-auto"
                onClick={removeDocuments}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
            <div className="space-y-1.5 max-h-[100px] overflow-y-auto">
              {documentFiles.map((file, index) => (
                <div key={index} className="text-xs text-muted-foreground flex items-center gap-2 bg-muted/30 rounded-lg px-2 py-1.5">
                  <FileText className="h-3 w-3 shrink-0" />
                  <span className="truncate flex-1">{file.name}</span>
                  <span className="text-muted-foreground/60">({Math.round(file.size / 1024)}KB)</span>
                </div>
              ))}
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
        <input
          ref={documentInputRef}
          type="file"
          accept=".pdf,.docx,.txt,.csv"
          multiple
          className="hidden"
          onChange={handleDocumentUpload}
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              size="icon"
              variant={(imageBase64 || useDocumentImport || generateImageMode) ? "default" : "outline"}
              className={cn(
                "shrink-0 transition-all duration-200 h-11 w-11 sm:h-12 sm:w-12 rounded-xl",
                generateImageMode
                  ? "bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white glow-button"
                  : (imageBase64 || useDocumentImport)
                    ? "bg-primary text-primary-foreground hover:bg-primary/90 glow-button"
                    : "bg-card/80 border-border/50 hover:bg-accent hover:border-primary/40"
              )}
              disabled={isLoading}
              title="Options de message"
            >
              {generateImageMode ? <Wand2 className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-52 p-2 bg-card/95 backdrop-blur-sm">
            <DropdownMenuItem
              onClick={() => {
                if (!imageDisabled) {
                  fileInputRef.current?.click();
                  setMode("image");
                }
              }}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer",
                (useDocumentImport || imageDisabled || generateImageMode) && "opacity-50 cursor-not-allowed"
              )}
              disabled={useDocumentImport || imageDisabled || generateImageMode}
            >
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Image className="h-4 w-4 text-primary" />
              </div>
              <span className="font-medium">{imageDisabled ? "Image non disponible" : "Ajouter une image"}</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                documentInputRef.current?.click();
                setMode("document");
              }}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer mt-1",
                (imageBase64 || generateImageMode) && "opacity-50 cursor-not-allowed"
              )}
              disabled={!!imageBase64 || generateImageMode}
            >
              <div className="h-8 w-8 rounded-lg bg-secondary/10 flex items-center justify-center">
                <FileText className="h-4 w-4 text-secondary" />
              </div>
              <span className="font-medium">Importer un document</span>
            </DropdownMenuItem>
            
            {/* Generate Image Option - Only for authenticated users */}
            <DropdownMenuItem
              onClick={() => {
                if (isAuthenticated) {
                  setGenerateImageMode(!generateImageMode);
                  setMode(generateImageMode ? "none" : "generate-image");
                  // Clear other modes
                  if (!generateImageMode) {
                    setImagePreview(null);
                    setImageBase64(null);
                    setDocumentFiles([]);
                    setUseDocumentImport(false);
                  }
                }
              }}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer mt-1",
                !isAuthenticated && "opacity-50 cursor-not-allowed",
                generateImageMode && "bg-gradient-to-r from-violet-500/20 to-fuchsia-500/20"
              )}
              disabled={!isAuthenticated}
            >
              <div className={cn(
                "h-8 w-8 rounded-lg flex items-center justify-center",
                generateImageMode 
                  ? "bg-gradient-to-r from-violet-500 to-fuchsia-500" 
                  : "bg-violet-500/10"
              )}>
                <Wand2 className={cn("h-4 w-4", generateImageMode ? "text-white" : "text-violet-500")} />
              </div>
              <div className="flex flex-col">
                <span className="font-medium">
                  {generateImageMode ? "Mode image activé" : "Créer une image"}
                </span>
                {!isAuthenticated && (
                  <span className="text-xs text-muted-foreground">Connexion requise</span>
                )}
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        
        <div className="relative flex-1 group">
          {generateImageMode && (
            <div className="absolute -top-8 left-0 right-0 flex items-center justify-center">
              <div className="px-3 py-1 bg-gradient-to-r from-violet-500/20 to-fuchsia-500/20 rounded-full border border-violet-500/30 text-xs text-violet-400 flex items-center gap-1.5">
                <Wand2 className="h-3 w-3" />
                Mode création d'image
              </div>
            </div>
          )}
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={generateImageMode ? "Décrivez l'image que vous souhaitez créer..." : "Envoyez un message..."}
            className={cn(
              "min-h-[44px] max-h-[120px] h-11 sm:h-12 transition-all duration-200 text-sm sm:text-base pr-12 resize-none rounded-xl",
              generateImageMode
                ? "bg-gradient-to-r from-violet-500/5 to-fuchsia-500/5 border-violet-500/30 focus:border-violet-500/50"
                : "bg-card/60 border-border/40 focus:border-primary/50 focus:bg-card/80",
              "focus-visible:ring-0 overflow-y-auto input-glow placeholder:text-muted-foreground/50"
            )}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                if (e.shiftKey) {
                  return;
                } else {
                  if (window.innerWidth > 768) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
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
              className={cn(
                "absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-lg transition-all",
                isRecording 
                  ? "bg-destructive/15 text-destructive" 
                  : "text-muted-foreground/60 hover:text-primary hover:bg-primary/10"
              )}
              onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
              disabled={isLoading}
              title={isRecording ? "Arrêter l'enregistrement" : "Enregistrement vocal"}
            >
              {isRecording ? (
                <MicOff className="h-4 w-4 animate-pulse" />
              ) : (
                <Mic className="h-4 w-4 transition-colors" />
              )}
            </Button>
          )}
        </div>
        
        {isLoading ? (
          <Button
            type="button"
            size="icon"
            onClick={onStop}
            className={cn(
              "shrink-0 transition-all duration-200 h-11 w-11 sm:h-12 sm:w-12 rounded-xl",
              "bg-destructive text-destructive-foreground hover:bg-destructive/90",
              "hover:scale-105 active:scale-95 shadow-lg"
            )}
            title="Arrêter la génération"
          >
            <Square className="h-4 w-4 sm:h-5 sm:w-5 fill-current" />
          </Button>
        ) : (
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() && !imageBase64}
            className={cn(
              "shrink-0 transition-all duration-200 h-11 w-11 sm:h-12 sm:w-12 rounded-xl",
              "bg-gradient-to-r from-primary to-primary hover:from-primary hover:to-secondary",
              "text-primary-foreground glow-button hover:scale-105 active:scale-95",
              "disabled:opacity-40 disabled:hover:scale-100 disabled:cursor-not-allowed disabled:from-muted disabled:to-muted"
            )}
            title="Envoyer le message"
          >
            <Send className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
        )}
      </div>
    </form>
  );
};
