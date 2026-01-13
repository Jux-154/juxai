import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

interface GenerationBlockerProps {
  isActive: boolean;
  progress: number;
}

export const GenerationBlocker = ({ isActive, progress }: GenerationBlockerProps) => {
  if (!isActive) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9998] bg-background/80 backdrop-blur-sm flex items-center justify-center"
    >
      <div className="text-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
        <p className="text-lg font-medium text-foreground mb-2">Génération en cours...</p>
        <p className="text-sm text-muted-foreground">
          {progress > 0 ? `${Math.round(progress)}%` : "En attente..."}
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          Veuillez patienter, l'application sera disponible une fois la génération terminée
        </p>
      </div>
    </motion.div>
  );
};
