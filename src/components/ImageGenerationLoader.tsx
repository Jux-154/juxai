import { motion } from "framer-motion";
import "./LoaderAnimation.css";

interface ImageGenerationLoaderProps {
  progress: number;
  timeRemaining: number; // en secondes
  status: "pending" | "generating";
  queuePosition?: number;
}

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

export const ImageGenerationLoader = ({
  progress,
  timeRemaining,
  status,
  queuePosition,
}: ImageGenerationLoaderProps) => {
  const progressPercent = Math.min(100, Math.max(0, progress));
  const isLowTime = timeRemaining <= 30;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center p-6 rounded-2xl glass-card w-full max-w-md mx-auto"
    >
      {/* Compte à rebours en grand */}
      <motion.div
        className={`text-6xl font-bold mb-4 tabular-nums ${
          isLowTime ? "text-red-400" : "text-primary"
        }`}
        animate={isLowTime ? { scale: [1, 1.05, 1] } : {}}
        transition={{ duration: 0.5, repeat: isLowTime ? Infinity : 0 }}
      >
        {formatTime(timeRemaining)}
      </motion.div>

      <p className="text-muted-foreground text-sm mb-6">
        {isLowTime ? "⚠️ Temps presque écoulé" : "⏱️ Temps restant"}
      </p>

      {/* Animation de chargement dots */}
      <div className="dots-container mb-6">
        <div className="dot"></div>
        <div className="dot"></div>
        <div className="dot"></div>
        <div className="dot"></div>
        <div className="dot"></div>
      </div>

      {/* Barre de progression */}
      <div className="w-full mb-4">
        <div className="flex justify-between text-sm text-muted-foreground mb-2">
          <span>
            {status === "pending" ? "🎨 En attente..." : "🔄 Génération en cours..."}
          </span>
          <span className="font-mono font-bold text-primary">{progressPercent}%</span>
        </div>
        <div className="progress-loader">
          <motion.div
            className="progress"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            style={{ 
              animation: "none",
              width: `${progressPercent}%`,
              background: "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--accent)))"
            }}
          />
        </div>
      </div>

      {/* Position dans la file */}
      {status === "pending" && queuePosition !== undefined && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-2 text-muted-foreground"
        >
          <span className="text-lg">📊</span>
          <span>Position dans la file : <span className="font-bold text-foreground">{queuePosition}</span></span>
        </motion.div>
      )}

      {/* Indication du statut */}
      {status === "generating" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-2"
        >
          <motion.div
            className="w-2 h-2 rounded-full bg-green-400"
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
          <span className="text-sm text-muted-foreground">Création de votre image...</span>
        </motion.div>
      )}
    </motion.div>
  );
};
