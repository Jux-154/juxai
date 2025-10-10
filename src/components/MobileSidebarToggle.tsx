import { Menu } from "lucide-react";

interface MobileSidebarToggleProps {
  onClick: () => void;
}

export const MobileSidebarToggle = ({ onClick }: MobileSidebarToggleProps) => {
  return (
    <button
      onClick={onClick}
      className="md:hidden fixed top-4 left-4 z-[1001] bg-card border border-border rounded-lg p-3 text-foreground hover:bg-accent transition-all"
    >
      <Menu className="h-5 w-5" />
    </button>
  );
};
