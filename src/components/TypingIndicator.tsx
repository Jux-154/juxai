import { motion } from "framer-motion";

interface TypingIndicatorProps {
  name?: string;
}

export const TypingIndicator = ({ name = "Jux" }: TypingIndicatorProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex items-center gap-3 px-4 py-3"
    >
      {/* Avatar */}
      <div className="relative">
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-primary to-secondary rounded-xl blur-md opacity-40"
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        <div className="relative h-10 w-10 rounded-xl bg-gradient-to-br from-primary via-primary/90 to-secondary flex items-center justify-center overflow-hidden">
          <img
            src="https://i.ibb.co/Kzs6bzhM/Jux.jpg"
            alt="Jux"
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      {/* Typing animation */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-card/60 backdrop-blur-sm rounded-xl border border-border/30">
        <span className="text-sm text-muted-foreground font-medium mr-1">
          {name} écrit
        </span>
        <div className="flex gap-1">
          <div className="typing-dot" />
          <div className="typing-dot" />
          <div className="typing-dot" />
        </div>
      </div>
    </motion.div>
  );
};
