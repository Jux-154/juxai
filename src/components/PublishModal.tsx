import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Upload, Hash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface PublishModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPublish: (title: string, description: string) => Promise<void>;
  imageUrl: string;
}

export const PublishModal = ({ isOpen, onClose, onPublish, imageUrl }: PublishModalProps) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);

  // Détecter les hashtags dans la description
  const hashtags = description.match(/#\w+/g) || [];

  const handlePublish = async () => {
    setIsPublishing(true);
    try {
      await onPublish(title, description);
      setTitle("");
      setDescription("");
    } finally {
      setIsPublishing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[3000] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
        
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="relative z-10 w-full max-w-lg bg-card rounded-2xl border border-border shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h2 className="text-lg font-semibold text-foreground">Publier l'image</h2>
            <Button size="icon" variant="ghost" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Content */}
          <div className="p-4 space-y-4">
            {/* Preview */}
            <div className="aspect-video rounded-xl overflow-hidden bg-muted">
              <img src={imageUrl} alt="Preview" className="w-full h-full object-contain" />
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Titre (optionnel)</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Donnez un titre à votre création..."
                maxLength={100}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description (avec #hashtags)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ajoutez une description avec des #hashtags pour être découvert..."
                rows={3}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground text-right">{description.length}/500</p>
            </div>

            {/* Hashtags detected */}
            {hashtags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {hashtags.map((tag, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary text-xs"
                  >
                    <Hash className="h-3 w-3" />
                    {tag.slice(1)}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-border flex justify-end gap-3">
            <Button variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button
              onClick={handlePublish}
              disabled={isPublishing}
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              {isPublishing ? "Publication..." : "Publier"}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
