import { useState } from "react";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import "./LoaderAnimation.css";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface ConversationItemProps {
  id: string;
  title: string;
  isActive: boolean;
  onClick: () => void;
  onRename: (id: string, newTitle: string) => void;
  onDelete: (id: string) => void;
  isMobile?: boolean;
  animationState?: 'idle' | 'removing' | 'waiting' | 'completing' | 'arriving';
}

export const ConversationItem = ({
  id,
  title,
  isActive,
  onClick,
  onRename,
  onDelete,
  isMobile = false,
  animationState = 'idle',
}: ConversationItemProps) => {
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState(title);
  const [touchTimer, setTouchTimer] = useState<NodeJS.Timeout | null>(null);

  const handleRename = () => {
    if (newTitle.trim()) {
      onRename(id, newTitle.trim());
      setIsRenameDialogOpen(false);
    }
  };

  const handleDelete = () => {
    onDelete(id);
    setIsDeleteDialogOpen(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const timer = setTimeout(() => {
      e.preventDefault();
      setIsRenameDialogOpen(true);
    }, 500);
    setTouchTimer(timer);
  };

  const handleTouchEnd = () => {
    if (touchTimer) {
      clearTimeout(touchTimer);
      setTouchTimer(null);
    }
  };

  const ConversationButton = (
    <button
      onClick={onClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className={`w-full text-left px-3 py-3 rounded-lg text-sm transition-all flex items-center gap-2 group relative ${
        isActive
          ? "bg-accent text-accent-foreground border-l-2 border-primary"
          : "hover:bg-accent/50"
      }`}
    >
      <div
        className={`truncate flex-1 transition-all duration-300 ${
          animationState === 'removing'
            ? 'animate-pulse opacity-50 transform translate-x-2'
            : animationState === 'completing'
            ? 'opacity-100 transition-opacity duration-200'
            : animationState === 'arriving'
            ? 'animate-in slide-in-from-left duration-500'
            : ''
        }`}
      >
        {title}
      </div>

      {(animationState === 'waiting' || animationState === 'completing' || animationState === 'removing') && (
        <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-200 ${
          animationState === 'completing' ? 'opacity-100' :
          animationState === 'removing' ? 'opacity-0' : ''
        }`}>
          <div className="progress-loader">
            <div className="progress"></div>
          </div>
        </div>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
          <button className={`${isMobile ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} p-1 hover:bg-accent rounded transition-opacity`}>
            <MoreVertical className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              setNewTitle(title);
              setIsRenameDialogOpen(true);
            }}
          >
            <Pencil className="h-4 w-4 mr-2" />
            Renommer
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              setIsDeleteDialogOpen(true);
            }}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Supprimer
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </button>
  );

  return (
    <>
      {isRenameDialogOpen && (
        <div className="fixed inset-0 bg-black/50 z-[9998]" onClick={() => setIsRenameDialogOpen(false)} />
      )}
      <ContextMenu>
        <ContextMenuTrigger asChild>{ConversationButton}</ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem
            onClick={(e) => {
              e.stopPropagation();
              setNewTitle(title);
              setIsRenameDialogOpen(true);
            }}
          >
            <Pencil className="h-4 w-4 mr-2" />
            Renommer
          </ContextMenuItem>
          <ContextMenuItem
            onClick={(e) => {
              e.stopPropagation();
              setIsDeleteDialogOpen(true);
            }}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Supprimer
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
        <DialogContent className="z-[9999]">
          <DialogHeader>
            <DialogTitle>Renommer la conversation</DialogTitle>
            <DialogDescription>
              Donnez un nouveau nom à cette conversation.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRename();
            }}
            placeholder="Titre de la conversation"
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRenameDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleRename}>Renommer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la conversation ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. La conversation et tous ses messages seront
              définitivement supprimés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
