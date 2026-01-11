import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { History, Heart, User as UserIcon } from "lucide-react";
import { motion } from "framer-motion";

interface ViewedHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
}

interface ViewedImage {
  id: string;
  title: string | null;
  image_url: string;
  user_pseudo: string | null;
  likes_count: number;
  viewed_at: string;
}

export const ViewedHistoryModal = ({ isOpen, onClose, user }: ViewedHistoryModalProps) => {
  const [viewedImages, setViewedImages] = useState<ViewedImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isOpen || !user) return;

    const fetchViewedHistory = async () => {
      setIsLoading(true);
      try {
        const { data: viewed } = await supabase
          .from("viewed_publications")
          .select("publication_id, viewed_at")
          .eq("user_id", user.id)
          .order("viewed_at", { ascending: false })
          .limit(50);

        if (viewed && viewed.length > 0) {
          const pubIds = viewed.map((v) => v.publication_id);
          const { data: pubs } = await supabase
            .from("publications")
            .select("id, title, user_id, image_id")
            .in("id", pubIds);

          if (pubs) {
            const enriched = await Promise.all(
              pubs.map(async (pub) => {
                const viewedEntry = viewed.find((v) => v.publication_id === pub.id);

                const { data: img } = await supabase
                  .from("user_images")
                  .select("storage_path")
                  .eq("id", pub.image_id)
                  .single();

                const { data: settings } = await supabase
                  .from("user_settings")
                  .select("pseudo")
                  .eq("user_id", pub.user_id)
                  .single();

                const { count } = await supabase
                  .from("likes")
                  .select("*", { count: "exact", head: true })
                  .eq("publication_id", pub.id);

                return {
                  id: pub.id,
                  title: pub.title,
                  image_url: img?.storage_path
                    ? supabase.storage.from("images").getPublicUrl(img.storage_path).data.publicUrl
                    : "",
                  user_pseudo: settings?.pseudo || "Anonyme",
                  likes_count: count || 0,
                  viewed_at: viewedEntry?.viewed_at || "",
                };
              })
            );

            // Trier par date de visionnage
            enriched.sort((a, b) => new Date(b.viewed_at).getTime() - new Date(a.viewed_at).getTime());
            setViewedImages(enriched);
          }
        }
      } catch (error) {
        console.error("Error fetching viewed history:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchViewedHistory();
  }, [isOpen, user]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            Historique des créations vues
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 max-h-[60vh]">
          {isLoading ? (
            <div className="flex items-center justify-center h-40">
              <div className="animate-pulse text-muted-foreground">Chargement...</div>
            </div>
          ) : viewedImages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-center">
              <History className="h-10 w-10 text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">Aucun historique</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 p-1">
              {viewedImages.map((img, index) => (
                <motion.div
                  key={img.id}
                  className="relative rounded-xl overflow-hidden group"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <img
                    src={img.image_url}
                    alt={img.title || "Image vue"}
                    className="w-full aspect-square object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                    <div className="flex items-center gap-1 text-white text-xs mb-1">
                      <UserIcon className="h-3 w-3" />
                      @{img.user_pseudo}
                    </div>
                    <div className="flex items-center gap-1 text-white/80 text-xs">
                      <Heart className="h-3 w-3" />
                      {img.likes_count}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
