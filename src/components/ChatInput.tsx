import { useState, FormEvent, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2, Image, X, FileText, Plus, Mic, MicOff, AlertTriangle, Square } from "lucide-react";
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
  onSend: (message: string, imageBase64?: string, useWebSearch?: boolean) => void;
  onStop?: () => void;
  isLoading: boolean;
  isWebView?: boolean;
}

export const ChatInput = ({ onSend, onStop, isLoading, isWebView = false }: ChatInputProps) => {
  const [input, setInput] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [documentFiles, setDocumentFiles] = useState<File[]>([]);
  const [useDocumentImport, setUseDocumentImport] = useState(false);
  const [mode, setMode] = useState<"none" | "image" | "document">("none");
  const [isRecording, setIsRecording] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);



  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if ((input.trim() || imageBase64 || documentFiles.length > 0) && !isLoading) {
      onSend(input.trim(), imageBase64 || undefined, useDocumentImport);
      setInput("");
      setImagePreview(null);
      setImageBase64(null);
      setDocumentFiles([]);
      setMode("none");
      setUseDocumentImport(false);
    }
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
        {documentFiles.length > 0 && (
          <div className="absolute bottom-full left-0 mb-2 p-2 bg-card rounded-lg border shadow-lg max-w-[300px]">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-4 w-4" />
              <span className="text-sm font-medium">
                {documentFiles.length} document{documentFiles.length > 1 ? 's' : ''} sélectionné{documentFiles.length > 1 ? 's' : ''}
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
            <div className="space-y-1 max-h-[100px] overflow-y-auto">
              {documentFiles.map((file, index) => (
                <div key={index} className="text-xs text-muted-foreground flex items-center gap-2">
                  <FileText className="h-3 w-3" />
                  <span className="truncate">{file.name}</span>
                  <span>({Math.round(file.size / 1024)}KB)</span>
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
              variant={(imageBase64 || useDocumentImport) ? "default" : "outline"}
              className={cn(
                "shrink-0 transition-all h-9 w-9 sm:h-11 sm:w-11 md:h-12 md:w-12",
                (imageBase64 || useDocumentImport)
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
              className={cn("flex items-center gap-2", useDocumentImport && "opacity-50 cursor-not-allowed")}
              disabled={useDocumentImport}
            >
              <Image className="h-4 w-4" />
              Ajouter une image
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                documentInputRef.current?.click();
                setMode("document");
              }}
              className={cn("flex items-center gap-2", imageBase64 && "opacity-50 cursor-not-allowed")}
              disabled={!!imageBase64}
            >
              <FileText className="h-4 w-4" />
              Importer un document
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
        {isLoading ? (
          <Button
            type="button"
            size="icon"
            onClick={onStop}
            className={cn(
              "shrink-0 transition-all min-w-[40px] sm:min-w-[50px] md:min-w-[60px] h-9 w-9 sm:h-11 sm:w-11 md:h-12 md:w-12",
              "bg-destructive text-destructive-foreground hover:bg-destructive/90 hover:scale-105"
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
              "shrink-0 transition-all min-w-[40px] sm:min-w-[50px] md:min-w-[60px] h-9 w-9 sm:h-11 sm:w-11 md:h-12 md:w-12",
              "bg-primary text-background hover:bg-primary/90 hover:scale-105"
            )}
          >
            <Send className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
        )}
      </div>


    </form>
  );
};
