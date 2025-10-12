import { Menu } from "lucide-react";

interface MobileSidebarToggleProps {
  onClick: () => void;
}

export const MobileSidebarToggle = ({ onClick }: MobileSidebarToggleProps) => {
  return (
    <button
      onClick={onClick}
      className="md:hidden fixed top-2 sm:top-4 left-2 sm:left-4 z-[1001] bg-card border border-border rounded-lg p-2 sm:p-3 text-foreground hover:bg-accent transition-all"
    >
      <Menu className="h-4 w-4 sm:h-5 sm:w-5" />
    </button>
  );
};
