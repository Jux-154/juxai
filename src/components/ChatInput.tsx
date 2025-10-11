import { useState, FormEvent, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2, Image, X, Globe } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSend: (message: string, imageBase64?: string, useWebSearch?: boolean) => void;
  isLoading: boolean;
}

export const ChatInput = ({ onSend, isLoading }: ChatInputProps) => {
  const [input, setInput] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [useWebSearch, setUseWebSearch] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if ((input.trim() || imageBase64) && !isLoading) {
      onSend(input.trim(), imageBase64 || undefined, useWebSearch);
      setInput("");
      setImagePreview(null);
      setImageBase64(null);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Veuillez sélectionner une image.");
      return;
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

  return (
    <form onSubmit={handleSubmit} className="relative">
      <div className="relative flex items-end gap-2">
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
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="shrink-0 bg-card border-border hover:bg-accent hover:border-primary transition-all h-11 w-11 md:h-12 md:w-12"
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading}
          title="Téléverser une image"
        >
          <Image className="h-5 w-5" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant={useWebSearch ? "default" : "outline"}
          className={cn(
            "shrink-0 transition-all h-11 w-11 md:h-12 md:w-12",
            useWebSearch 
              ? "bg-primary text-background hover:bg-primary/90 border-primary shadow-[0_0_10px_rgba(0,255,255,0.3)]" 
              : "bg-card border-border hover:bg-accent hover:border-primary"
          )}
          onClick={() => setUseWebSearch(!useWebSearch)}
          disabled={isLoading}
          title={useWebSearch ? "Mode recherche web activé" : "Activer la recherche web"}
        >
          <Globe className="h-5 w-5" />
        </Button>
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Envoyez un message..."
          className={cn(
            "min-h-[60px] max-h-[200px] resize-none transition-all",
            "bg-card border-border focus:border-primary focus:shadow-[0_0_0_2px_rgba(0,255,255,0.1)]",
            "focus-visible:ring-0"
          )}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
          disabled={isLoading}
        />
        <Button
          type="submit"
          size="icon"
          disabled={(!input.trim() && !imageBase64) || isLoading}
          className={cn(
            "shrink-0 transition-all min-w-[50px] md:min-w-[60px] h-11 w-11 md:h-12 md:w-12",
            "bg-primary text-background hover:bg-primary/90 hover:scale-105"
          )}
        >
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
        </Button>
      </div>
    </form>
  );
};
