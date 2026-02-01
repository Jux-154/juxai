import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

interface PatchNote {
  version: string;
  title: string;
  changes: string[];
  date: string;
}

const PATCH_NOTES: PatchNote[] = [
  {
    version: "v1.3",
    title: "Mode Édition d'images",
    changes: [
      "🖼️ Ajout du mode Éditer pour modifier vos images avec l'IA"
    ],
    date: "1 Février 2026"
  }
];

const STORAGE_KEY = "juxai_viewed_patch_notes";

export const PatchNotes = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [canClose, setCanClose] = useState(false);
  const [currentPatch, setCurrentPatch] = useState<PatchNote | null>(null);

  useEffect(() => {
    // Vérifier les notes de patch non vues
    const viewedNotes = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    
    const unviewedPatch = PATCH_NOTES.find(patch => !viewedNotes.includes(patch.version));
    
    if (unviewedPatch) {
      setCurrentPatch(unviewedPatch);
      setIsOpen(true);
      
      // Timer de 10 secondes avant de pouvoir fermer
      const timer = setTimeout(() => {
        setCanClose(true);
      }, 10000);
      
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    if (!canClose) return;
    
    if (currentPatch) {
      const viewedNotes = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      viewedNotes.push(currentPatch.version);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(viewedNotes));
    }
    
    setIsOpen(false);
  };

  return (
    <AnimatePresence>
      {isOpen && currentPatch && (
        <motion.div
          key="patch-notes-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[1001] flex items-center justify-center p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ duration: 0.3 }}
            className="bg-card/40 backdrop-blur-2xl border border-border/30 rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="text-sm font-semibold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent mb-2"
                >
                  {currentPatch.version}
                </motion.div>
                <h2 className="text-2xl font-bold text-foreground">
                  {currentPatch.title}
                </h2>
              </div>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleClose}
                disabled={!canClose}
                className={`p-2 rounded-lg transition-all ${
                  canClose
                    ? "hover:bg-card/50 text-foreground cursor-pointer"
                    : "text-muted-foreground/30 cursor-not-allowed"
                }`}
              >
                <X className="w-5 h-5" />
              </motion.button>
            </div>

            {/* Date */}
            <p className="text-sm text-muted-foreground/70 mb-6">
              {currentPatch.date}
            </p>

            {/* Changes */}
            <div className="space-y-3 mb-8">
              {currentPatch.changes.map((change, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + index * 0.1 }}
                  className="flex items-start gap-3 text-sm text-foreground/90"
                >
                  <span className="mt-1">{change.split(" ")[0]}</span>
                  <span>{change.substring(change.indexOf(" ") + 1)}</span>
                </motion.div>
              ))}
            </div>

            {/* Timer indicator */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="flex items-center gap-2 text-xs text-muted-foreground/60"
            >
              <div className="flex-1">
                <div className="relative h-1 bg-border/30 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: "0%" }}
                    animate={{ width: canClose ? "100%" : "100%" }}
                    transition={{ 
                      duration: canClose ? 0 : 10, 
                      ease: "linear" 
                    }}
                    className="h-full bg-gradient-to-r from-cyan-400 to-blue-500"
                  />
                </div>
              </div>
              {!canClose && (
                <span className="text-right min-w-fit">
                  Fermeture dans 10s
                </span>
              )}
            </motion.div>

            {canClose && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs text-center text-muted-foreground/60 mt-3"
              >
                Cliquez sur la croix ou l'overlay pour fermer
              </motion.p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
