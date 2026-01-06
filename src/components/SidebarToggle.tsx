import { Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface SidebarToggleProps {
  onClick: () => void;
  isSidebarOpen?: boolean;
}

export const SidebarToggle = ({ onClick, isSidebarOpen }: SidebarToggleProps) => {
  return (
    <motion.button
      onClick={onClick}
      className="fixed top-3 sm:top-4 left-3 sm:left-4 z-[1001] bg-card/90 backdrop-blur-sm border border-border/50 rounded-xl p-2.5 sm:p-3 text-foreground hover:bg-accent hover:border-primary/30 transition-all duration-200 shadow-lg"
      initial={false}
      animate={{
        x: isSidebarOpen ? -100 : 0,
        opacity: isSidebarOpen ? 0 : 1,
      }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <Menu className="h-5 w-5" />
    </motion.button>
  );
};
