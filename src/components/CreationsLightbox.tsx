import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Heart, Share2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface CreationsLightboxProps {
  publication: {
    id: string;
    title: string | null;
    description: string | null;
    image_url: string;
    user_pseudo: string;
    user_avatar: string | null;
    likes_count: number;
    is_liked: boolean;
    prompt?: string;
  } | null;
  onClose: () => void;
  onLike: (pubId: string) => void;
  onShare: (url: string) => void;
  onRemix: (prompt: string, addition: string) => void;
  canRemix: boolean;
}

export const CreationsLightbox = ({ 
  publication, 
  onClose, 
  onLike, 
  onShare, 
  onRemix,
  canRemix 
}: CreationsLightboxProps) => {
  const { toast } = useToast();
  const [showRemixModal, setShowRemixModal] = useState(false);
  const [remixAddition, setRemixAddition] = useState("");

  if (!publication) return null;

  const handleRemix = () => {
    if (!canRemix) {
      toast({ 
        title: "Plus de crédits", 
        description: "Vos crédits seront réinitialisés à minuit (UTC-4)", 
        variant: "destructive" 
      });
      return;
    }
    setShowRemixModal(true);
  };

  const confirmRemix = () => {
    // Utiliser le prompt original ou la description
    const basePrompt = publication.prompt || publication.description || publication.title || "";
    onRemix(basePrompt, remixAddition);
    setShowRemixModal(false);
    setRemixAddition("");
  };

  return (
    <>
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[2000] flex items-center justify-center"
          onClick={onClose}
        >
          {/* Backdrop avec blur */}
          <motion.div
            initial={{ backdropFilter: "blur(0px)" }}
            animate={{ backdropFilter: "blur(20px)" }}
            exit={{ backdropFilter: "blur(0px)" }}
            className="absolute inset-0 bg-black/80"
          />

          {/* Image zoomée */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative z-10 max-w-[90vw] max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={publication.image_url}
              alt={publication.title || "Création"}
              className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl object-contain"
            />

            {/* Bouton fermer */}
            <Button
              size="icon"
              variant="secondary"
              className="absolute -top-3 -right-3 h-10 w-10 rounded-full shadow-lg"
              onClick={onClose}
            >
              <X className="h-5 w-5" />
            </Button>

            {/* Actions en bas */}
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2">
              <Button
                onClick={() => onLike(publication.id)}
                variant="outline"
                className={`rounded-full shadow-lg gap-2 bg-card/90 backdrop-blur-sm border border-border ${
                  publication.is_liked ? "text-red-500 border-red-500/50" : ""
                }`}
              >
                <Heart className={`h-4 w-4 ${publication.is_liked ? "fill-red-500" : ""}`} />
                {publication.likes_count}
              </Button>

              <Button
                onClick={() => onShare(publication.image_url)}
                variant="outline"
                className="rounded-full shadow-lg gap-2 bg-card/90 backdrop-blur-sm border border-border"
              >
                <Share2 className="h-4 w-4" />
                Partager
              </Button>

              <Button
                onClick={handleRemix}
                className="rounded-full shadow-lg gap-2 bg-gradient-to-r from-primary to-secondary hover:opacity-90"
              >
                <Sparkles className="h-4 w-4" />
                Remixer
              </Button>
            </div>

            {/* Info auteur */}
            <div className="absolute bottom-16 left-4 right-4">
              <div className="p-3 rounded-xl bg-card/90 backdrop-blur-sm border border-border">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden">
                    {publication.user_avatar ? (
                      <img src={publication.user_avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs">👤</span>
                    )}
                  </div>
                  <span className="text-sm font-medium text-foreground">@{publication.user_pseudo}</span>
                </div>
                {publication.title && (
                  <p className="text-sm font-semibold text-foreground">{publication.title}</p>
                )}
                {publication.description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{publication.description}</p>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>

      {/* Modal Remix */}
      <Dialog open={showRemixModal} onOpenChange={setShowRemixModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Remixer cette image
            </DialogTitle>
            <DialogDescription>
              Ajoutez votre touche personnelle à cette création (optionnel)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground mb-1">Prompt original</p>
              <p className="text-sm text-foreground">
                {publication.prompt || publication.description || publication.title || "Pas de prompt disponible"}
              </p>
            </div>

            <Textarea
              placeholder="Ajoutez vos modifications... (ex: 'avec un fond de coucher de soleil')"
              value={remixAddition}
              onChange={(e) => setRemixAddition(e.target.value)}
              className="min-h-[80px]"
            />
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowRemixModal(false)}>
              Annuler
            </Button>
            <Button onClick={confirmRemix} className="gap-2">
              <Sparkles className="h-4 w-4" />
              Lancer la génération
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
