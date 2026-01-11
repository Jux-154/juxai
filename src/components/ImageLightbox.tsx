import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download, Eye, Share2, Upload, MoreVertical, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { toast as sonnerToast } from "@/components/ui/sonner";
import { PublishModal } from "./PublishModal";
import { supabase } from "@/integrations/supabase/client";

export interface LightboxImage {
  id: string;
  url: string;
  prompt: string;
  isPublished?: boolean;
}

interface ImageLightboxProps {
  image: LightboxImage | null;
  onClose: () => void;
  onPublish?: (imageId: string, title: string, description: string) => Promise<void>;
  onSetAsAvatar?: (imageUrl: string) => Promise<void>;
}

export const ImageLightbox = ({ image, onClose, onPublish, onSetAsAvatar }: ImageLightboxProps) => {
  const { toast } = useToast();
  const [showPrompt, setShowPrompt] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [isSettingAvatar, setIsSettingAvatar] = useState(false);

  if (!image) return null;

  const handleDownload = async () => {
    try {
      const response = await fetch(image.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `jux-image-${image.id}.png`;
      link.click();
      window.URL.revokeObjectURL(url);
      toast({ title: "Image téléchargée" });
    } catch {
      toast({ title: "Erreur", description: "Impossible de télécharger", variant: "destructive" });
    }
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(image.url);
      sonnerToast("Le lien de l'image a été copié");
    } catch {
      toast({ title: "Erreur", description: "Impossible de copier le lien", variant: "destructive" });
    }
  };

  const handlePublish = async (title: string, description: string) => {
    if (onPublish) {
      await onPublish(image.id, title, description);
      setShowPublishModal(false);
    }
  };

  const handleSetAsAvatar = async () => {
    if (!onSetAsAvatar) return;
    setIsSettingAvatar(true);
    try {
      await onSetAsAvatar(image.url);
      toast({ title: "Photo de profil mise à jour" });
    } catch {
      toast({ title: "Erreur", description: "Impossible de définir la photo de profil", variant: "destructive" });
    } finally {
      setIsSettingAvatar(false);
    }
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
              src={image.url}
              alt={image.prompt}
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

            {/* Menu options */}
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="lg"
                    className="rounded-full shadow-lg gap-2 bg-card/90 backdrop-blur-sm border border-border hover:bg-card"
                    variant="outline"
                  >
                    <MoreVertical className="h-5 w-5" />
                    Options
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" className="w-48 z-[3000]">
                  <DropdownMenuItem onClick={handleDownload}>
                    <Download className="h-4 w-4 mr-2" />
                    Télécharger
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowPrompt(!showPrompt)}>
                    <Eye className="h-4 w-4 mr-2" />
                    {showPrompt ? "Masquer le prompt" : "Voir le prompt"}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleShare}>
                    <Share2 className="h-4 w-4 mr-2" />
                    Partager
                  </DropdownMenuItem>
                  {!image.isPublished && onPublish && (
                    <DropdownMenuItem onClick={() => setShowPublishModal(true)}>
                      <Upload className="h-4 w-4 mr-2" />
                      Publier
                    </DropdownMenuItem>
                  )}
                  {onSetAsAvatar && (
                    <DropdownMenuItem onClick={handleSetAsAvatar} disabled={isSettingAvatar}>
                      <User className="h-4 w-4 mr-2" />
                      {isSettingAvatar ? "Chargement..." : "Photo de profil"}
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Affichage du prompt */}
            <AnimatePresence>
              {showPrompt && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="absolute bottom-16 left-4 right-4 p-4 rounded-xl bg-card/95 backdrop-blur-sm border border-border shadow-lg"
                >
                  <p className="text-sm text-foreground">{image.prompt}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      </AnimatePresence>

      {/* Modal de publication */}
      <PublishModal
        isOpen={showPublishModal}
        onClose={() => setShowPublishModal(false)}
        onPublish={handlePublish}
        imageUrl={image.url}
      />
    </>
  );
};
