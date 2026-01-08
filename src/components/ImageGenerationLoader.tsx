import { motion } from "framer-motion";

interface ImageGenerationLoaderProps {
  progress: number;
  timeRemaining: number;
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
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center p-4 sm:p-6 rounded-xl glass-card w-full max-w-xs sm:max-w-sm mx-auto"
    >
      {/* Countdown */}
      <motion.div
        className={`text-4xl sm:text-5xl md:text-6xl font-bold mb-2 tabular-nums ${
          isLowTime ? "text-red-400" : "text-primary"
        }`}
        animate={isLowTime ? { scale: [1, 1.05, 1] } : {}}
        transition={{ duration: 0.5, repeat: isLowTime ? Infinity : 0 }}
      >
        {formatTime(timeRemaining)}
      </motion.div>

      <p className="text-muted-foreground text-xs sm:text-sm mb-4">
        {isLowTime ? "⚠️ Temps presque écoulé" : "⏱️ Temps restant"}
      </p>

      {/* Dots animation */}
      <div className="flex items-center justify-center gap-2 mb-4">
        {[0, 1, 2, 3, 4].map((i) => (
          <motion.div
            key={i}
            className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-primary"
            animate={{
              scale: [0.8, 1.2, 0.8],
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              delay: i * 0.15,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      {/* Progress bar */}
      <div className="w-full mb-3">
        <div className="flex justify-between text-xs sm:text-sm text-muted-foreground mb-1">
          <span>
            {status === "pending" ? "🎨 En attente..." : "🔄 Génération..."}
          </span>
          <span className="font-mono font-bold text-primary">{progressPercent}%</span>
        </div>
        <div className="w-full h-2 sm:h-3 bg-muted/30 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* Queue position */}
      {status === "pending" && queuePosition !== undefined && (
        <p className="text-xs sm:text-sm text-muted-foreground">
          📊 Position : <span className="font-bold text-foreground">{queuePosition}</span>
        </p>
      )}

      {/* Generating indicator */}
      {status === "generating" && (
        <div className="flex items-center gap-2">
          <motion.div
            className="w-2 h-2 rounded-full bg-green-400"
            animate={{ opacity: [1, 0.4, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
          <span className="text-xs sm:text-sm text-muted-foreground">Création en cours...</span>
        </div>
      )}
    </motion.div>
  );
};
