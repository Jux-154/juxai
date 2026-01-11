import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Heart, ImageIcon, Sparkles, LogOut, User as UserIcon } from "lucide-react";
import { motion } from "framer-motion";

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  credits: number;
  onLogout: () => void;
}

interface PublishedImage {
  id: string;
  title: string | null;
  description: string | null;
  image_url: string;
  likes_count: number;
  created_at: string;
}

interface LikedImage {
  id: string;
  title: string | null;
  image_url: string;
  user_pseudo: string | null;
}

export const ProfileModal = ({ isOpen, onClose, user, credits, onLogout }: ProfileModalProps) => {
  const [publishedImages, setPublishedImages] = useState<PublishedImage[]>([]);
  const [likedImages, setLikedImages] = useState<LikedImage[]>([]);
  const [pseudo, setPseudo] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isOpen || !user) return;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch pseudo and avatar
        const { data: settings } = await supabase
          .from("user_settings")
          .select("pseudo, avatar_url")
          .eq("user_id", user.id)
          .maybeSingle();
        setPseudo(settings?.pseudo || null);
        setAvatarUrl(settings?.avatar_url || null);

        // Fetch published images
        const { data: pubs } = await supabase
          .from("publications")
          .select("id, title, description, created_at, image_id")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (pubs) {
          const enriched = await Promise.all(
            pubs.map(async (pub) => {
              const { data: img } = await supabase
                .from("user_images")
                .select("storage_path")
                .eq("id", pub.image_id)
                .single();

              const { count } = await supabase
                .from("likes")
                .select("*", { count: "exact", head: true })
                .eq("publication_id", pub.id);

              return {
                id: pub.id,
                title: pub.title,
                description: pub.description,
                image_url: img?.storage_path
                  ? supabase.storage.from("images").getPublicUrl(img.storage_path).data.publicUrl
                  : "",
                likes_count: count || 0,
                created_at: pub.created_at,
              };
            })
          );
          setPublishedImages(enriched);
        }

        // Fetch liked images
        const { data: likes } = await supabase
          .from("likes")
          .select("publication_id")
          .eq("user_id", user.id);

        if (likes && likes.length > 0) {
          const likedPubIds = likes.map((l) => l.publication_id);
          const { data: likedPubs } = await supabase
            .from("publications")
            .select("id, title, user_id, image_id")
            .in("id", likedPubIds);

          if (likedPubs) {
            const enriched = await Promise.all(
              likedPubs.map(async (pub) => {
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

                return {
                  id: pub.id,
                  title: pub.title,
                  image_url: img?.storage_path
                    ? supabase.storage.from("images").getPublicUrl(img.storage_path).data.publicUrl
                    : "",
                  user_pseudo: settings?.pseudo || "Anonyme",
                };
              })
            );
            setLikedImages(enriched);
          }
        }
      } catch (error) {
        console.error("Error fetching profile data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [isOpen, user]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            Profil
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Info utilisateur */}
          <div className="glass-card rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 border-2 border-primary/20">
                {avatarUrl ? (
                  <AvatarImage src={avatarUrl} alt="Avatar" />
                ) : null}
                <AvatarFallback className="bg-primary/10">
                  <UserIcon className="h-8 w-8 text-primary" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-medium text-foreground text-lg">@{pseudo || "Anonyme"}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Crédits</p>
                <p className="text-2xl font-bold text-primary">{credits}/5</p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="published" className="flex-1">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="published" className="gap-2">
                <ImageIcon className="h-4 w-4" />
                Publiées ({publishedImages.length})
              </TabsTrigger>
              <TabsTrigger value="liked" className="gap-2">
                <Heart className="h-4 w-4" />
                Likées ({likedImages.length})
              </TabsTrigger>
            </TabsList>

            <ScrollArea className="h-[300px] mt-4">
              <TabsContent value="published" className="mt-0">
                {isLoading ? (
                  <div className="flex items-center justify-center h-40">
                    <div className="animate-pulse text-muted-foreground">Chargement...</div>
                  </div>
                ) : publishedImages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 text-center">
                    <ImageIcon className="h-10 w-10 text-muted-foreground/50 mb-2" />
                    <p className="text-sm text-muted-foreground">Aucune publication</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {publishedImages.map((img) => (
                      <motion.div
                        key={img.id}
                        className="relative rounded-xl overflow-hidden group"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                      >
                        <img
                          src={img.image_url}
                          alt={img.title || "Publication"}
                          className="w-full aspect-square object-cover"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                          <div className="flex items-center gap-1 text-white text-xs">
                            <Heart className="h-3 w-3" />
                            {img.likes_count}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="liked" className="mt-0">
                {isLoading ? (
                  <div className="flex items-center justify-center h-40">
                    <div className="animate-pulse text-muted-foreground">Chargement...</div>
                  </div>
                ) : likedImages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 text-center">
                    <Heart className="h-10 w-10 text-muted-foreground/50 mb-2" />
                    <p className="text-sm text-muted-foreground">Aucun like</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {likedImages.map((img) => (
                      <motion.div
                        key={img.id}
                        className="relative rounded-xl overflow-hidden"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                      >
                        <img
                          src={img.image_url}
                          alt={img.title || "Liked image"}
                          className="w-full aspect-square object-cover"
                        />
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                          <p className="text-white text-xs truncate">@{img.user_pseudo}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </ScrollArea>
          </Tabs>

          {/* Bouton déconnexion */}
          <Button
            variant="outline"
            className="w-full gap-2 text-destructive hover:text-destructive"
            onClick={onLogout}
          >
            <LogOut className="h-4 w-4" />
            Déconnexion
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
