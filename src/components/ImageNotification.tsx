import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, ImageIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ImageNotificationProps {
  isVisible: boolean;
  onClose: () => void;
  onView?: () => void;
  imageUrl?: string;
}

export const ImageNotification = ({ isVisible, onClose, onView, imageUrl }: ImageNotificationProps) => {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -100, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -100, scale: 0.9 }}
          transition={{ type: "spring", damping: 20, stiffness: 300 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] max-w-md w-[calc(100%-2rem)]"
        >
          <div className="bg-card/95 backdrop-blur-xl border border-primary/30 rounded-2xl p-4 shadow-2xl shadow-primary/20">
            <div className="flex items-start gap-3">
              {/* Thumbnail ou icône */}
              <div className="relative flex-shrink-0">
                {imageUrl ? (
                  <div className="w-14 h-14 rounded-xl overflow-hidden border border-border/50">
                    <img src={imageUrl} alt="Generated" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                    <ImageIcon className="h-6 w-6 text-primary" />
                  </div>
                )}
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                  <CheckCircle className="h-3 w-3 text-white" />
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-foreground text-sm mb-0.5">Image générée !</h4>
                <p className="text-xs text-muted-foreground">Votre image a été créée avec succès</p>
                
                {onView && (
                  <Button
                    variant="link"
                    size="sm"
                    onClick={onView}
                    className="h-auto p-0 mt-1 text-xs text-primary hover:text-primary/80"
                  >
                    Voir l'image →
                  </Button>
                )}
              </div>

              {/* Close button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
