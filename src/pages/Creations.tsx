import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Heart, Share2, User as UserIcon, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { ViewedHistoryModal } from "@/components/ViewedHistoryModal";
import { CreationsLightbox } from "@/components/CreationsLightbox";
import { useUserCredits } from "@/hooks/useUserCredits";

interface Publication {
  id: string;
  title: string | null;
  description: string | null;
  created_at: string;
  user_id: string;
  image_url: string;
  user_pseudo: string;
  user_avatar: string | null;
  likes_count: number;
  is_liked: boolean;
  prompt?: string;
}

const Creations = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [publications, setPublications] = useState<Publication[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [feedMode, setFeedMode] = useState<"tiktok" | "pinterest">("tiktok");
  const [isLoading, setIsLoading] = useState(true);
  const [allViewed, setAllViewed] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [selectedPub, setSelectedPub] = useState<Publication | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const { credits } = useUserCredits(user?.id);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      setUser(session.user);

      // Charger les paramètres utilisateur
      const { data: settings } = await supabase
        .from("user_settings")
        .select("feed_mode")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (settings?.feed_mode) {
        setFeedMode(settings.feed_mode as "tiktok" | "pinterest");
      }
    };

    checkAuth();
  }, [navigate]);

  const fetchPublications = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      // Récupérer les hashtags des publications likées par l'utilisateur
      const { data: likedPubs } = await supabase
        .from("likes")
        .select("publication_id")
        .eq("user_id", user.id);

      const likedIds = likedPubs?.map(l => l.publication_id) || [];

      // Récupérer les publications déjà vues
      const { data: viewedPubs } = await supabase
        .from("viewed_publications")
        .select("publication_id")
        .eq("user_id", user.id);

      const viewedIds = viewedPubs?.map(v => v.publication_id) || [];

      // Récupérer les publications (exclure les siennes)
      let query = supabase
        .from("publications")
        .select(`
          id,
          title,
          description,
          created_at,
          user_id,
          image_id
        `)
        .neq("user_id", user.id) // Exclure ses propres publications
        .order("created_at", { ascending: false })
        .limit(50);

      // Exclure les publications déjà vues
      if (viewedIds.length > 0) {
        query = query.not("id", "in", `(${viewedIds.join(",")})`);
      }

      const { data: pubs, error } = await query;

      if (error) throw error;

      // Vérifier si toutes les publications ont été vues
      if ((!pubs || pubs.length === 0) && viewedIds.length > 0) {
        setAllViewed(true);
      } else {
        setAllViewed(false);
      }

      // Enrichir avec les données supplémentaires
      const enrichedPubs: Publication[] = await Promise.all(
        (pubs || []).map(async (pub) => {
          // Image URL et prompt
          const { data: imageData } = await supabase
            .from("user_images")
            .select("storage_path, prompt")
            .eq("id", pub.image_id)
            .single();

          const imageUrl = imageData?.storage_path
            ? supabase.storage.from("images").getPublicUrl(imageData.storage_path).data.publicUrl
            : "";

          // User pseudo and avatar
          const { data: settings } = await supabase
            .from("user_settings")
            .select("pseudo, avatar_url")
            .eq("user_id", pub.user_id)
            .maybeSingle();

          // Likes count
          const { count: likesCount } = await supabase
            .from("likes")
            .select("*", { count: "exact", head: true })
            .eq("publication_id", pub.id);

          return {
            id: pub.id,
            title: pub.title,
            description: pub.description,
            created_at: pub.created_at,
            user_id: pub.user_id,
            image_url: imageUrl,
            user_pseudo: settings?.pseudo || "Anonyme",
            user_avatar: settings?.avatar_url || null,
            likes_count: likesCount || 0,
            is_liked: likedIds.includes(pub.id),
            prompt: imageData?.prompt,
          };
        })
      );

      setPublications(enrichedPubs);
    } catch (error) {
      console.error("Error fetching publications:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchPublications();
    }
  }, [user, fetchPublications]);

  const handleLike = async (pubId: string) => {
    if (!user) return;

    const pub = publications.find(p => p.id === pubId);
    if (!pub) return;

    try {
      if (pub.is_liked) {
        await supabase
          .from("likes")
          .delete()
          .eq("user_id", user.id)
          .eq("publication_id", pubId);
      } else {
        await supabase
          .from("likes")
          .insert({ user_id: user.id, publication_id: pubId });
      }

      setPublications(prev =>
        prev.map(p =>
          p.id === pubId
            ? { ...p, is_liked: !p.is_liked, likes_count: p.is_liked ? p.likes_count - 1 : p.likes_count + 1 }
            : p
        )
      );
      
      // Mettre à jour aussi selectedPub si c'est la même
      if (selectedPub?.id === pubId) {
        setSelectedPub(prev => prev ? {
          ...prev,
          is_liked: !prev.is_liked,
          likes_count: prev.is_liked ? prev.likes_count - 1 : prev.likes_count + 1
        } : null);
      }
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible de liker", variant: "destructive" });
    }
  };

  const markAsViewed = async (pubId: string) => {
    if (!user) return;
    try {
      await supabase
        .from("viewed_publications")
        .upsert({ user_id: user.id, publication_id: pubId });
    } catch (error) {
      console.error("Error marking as viewed:", error);
    }
  };

  const handleShare = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: "Lien copié !" });
    } catch {
      toast({ title: "Erreur", variant: "destructive" });
    }
  };

  const handleRemix = (prompt: string, addition: string) => {
    // Construire le prompt final
    const finalPrompt = addition.trim() 
      ? `${prompt}, ${addition.trim()}`
      : prompt;
    
    // Naviguer vers l'accueil avec le prompt en state
    navigate("/", { state: { remixPrompt: finalPrompt, autoGenerate: true } });
  };

  // TikTok-style scroll
  useEffect(() => {
    if (feedMode !== "tiktok" || !containerRef.current) return;

    const handleScroll = () => {
      const container = containerRef.current;
      if (!container) return;

      const index = Math.round(container.scrollTop / container.clientHeight);
      if (index !== currentIndex && publications[index]) {
        setCurrentIndex(index);
        markAsViewed(publications[index].id);
      }
    };

    const container = containerRef.current;
    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [feedMode, currentIndex, publications]);

  if (isLoading) {
    return (
      <div className="h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background overflow-hidden">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 p-4 bg-gradient-to-b from-background to-transparent">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
            className="rounded-full bg-card/50 backdrop-blur-sm"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold text-foreground">Créations</h1>
          <div className="w-10" />
        </div>
      </div>

      {/* Viewed History Modal */}
      <ViewedHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        user={user}
      />

      {/* Lightbox pour Pinterest */}
      <AnimatePresence>
        {selectedPub && (
          <CreationsLightbox
            publication={selectedPub}
            onClose={() => setSelectedPub(null)}
            onLike={handleLike}
            onShare={handleShare}
            onRemix={handleRemix}
            canRemix={credits > 0}
          />
        )}
      </AnimatePresence>

      {publications.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center p-8 text-center">
          <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mb-4">
            <Heart className="h-10 w-10 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold mb-2">
            {allViewed ? "Tout vu !" : "Aucune création"}
          </h2>
          <p className="text-muted-foreground text-sm max-w-xs mb-4">
            {allViewed 
              ? "Vous avez vu toutes les créations disponibles. Revenez plus tard pour découvrir de nouvelles publications !"
              : "Les créations publiées par la communauté apparaîtront ici"
            }
          </p>
          {allViewed && (
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => setIsHistoryOpen(true)}
            >
              <History className="h-4 w-4" />
              Historique
            </Button>
          )}
        </div>
      ) : feedMode === "tiktok" ? (
        /* TikTok Mode - Full screen scroll */
        <div
          ref={containerRef}
          className="h-screen overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
          style={{ scrollSnapType: "y mandatory" }}
        >
          {publications.map((pub, index) => (
            <div
              key={pub.id}
              className="h-screen w-full snap-start snap-always relative flex items-center justify-center"
            >
              {/* Image */}
              <img
                src={pub.image_url}
                alt={pub.title || "Création"}
                className="max-w-full max-h-full object-contain"
              />

              {/* Overlay gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

              {/* Actions (right side) */}
              <div className="absolute right-4 bottom-32 flex flex-col gap-4 items-center">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleLike(pub.id)}
                  className="flex flex-col items-center gap-1"
                >
                  <div className={`p-3 rounded-full ${pub.is_liked ? "bg-red-500" : "bg-white/20 backdrop-blur-sm"}`}>
                    <Heart className={`h-6 w-6 ${pub.is_liked ? "text-white fill-white" : "text-white"}`} />
                  </div>
                  <span className="text-white text-xs font-medium">{pub.likes_count}</span>
                </motion.button>

                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleShare(pub.image_url)}
                  className="flex flex-col items-center gap-1"
                >
                  <div className="p-3 rounded-full bg-white/20 backdrop-blur-sm">
                    <Share2 className="h-6 w-6 text-white" />
                  </div>
                  <span className="text-white text-xs font-medium">Partager</span>
                </motion.button>
              </div>

              {/* Info (bottom) */}
              <div className="absolute bottom-8 left-4 right-20">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden">
                    {pub.user_avatar ? (
                      <img src={pub.user_avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <UserIcon className="h-4 w-4 text-primary" />
                    )}
                  </div>
                  <span className="text-white font-medium text-sm">@{pub.user_pseudo}</span>
                </div>
                {pub.title && (
                  <h3 className="text-white font-semibold text-lg mb-1">{pub.title}</h3>
                )}
                {pub.description && (
                  <p className="text-white/80 text-sm line-clamp-2">{pub.description}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Pinterest Mode - Grid */
        <ScrollArea className="h-screen pt-20">
          <div className="max-w-6xl mx-auto px-4 pb-8">
            <div className="columns-2 md:columns-3 lg:columns-4 gap-4">
              {publications.map((pub) => (
                <motion.div
                  key={pub.id}
                  className="mb-4 break-inside-avoid cursor-pointer"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ scale: 1.02 }}
                  onClick={() => {
                    setSelectedPub(pub);
                    markAsViewed(pub.id);
                  }}
                >
                  <div className="relative rounded-xl overflow-hidden bg-card border border-border group">
                    <img
                      src={pub.image_url}
                      alt={pub.title || "Création"}
                      className="w-full object-cover"
                    />
                    
                    {/* Overlay on hover */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center overflow-hidden">
                            {pub.user_avatar ? (
                              <img src={pub.user_avatar} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <UserIcon className="h-3 w-3 text-white" />
                            )}
                          </div>
                          <span className="text-white text-xs">@{pub.user_pseudo}</span>
                        </div>
                        <div className="flex items-center gap-1 text-white text-xs">
                          <Heart className={`h-3 w-3 ${pub.is_liked ? "fill-red-500 text-red-500" : ""}`} />
                          {pub.likes_count}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {pub.title && (
                    <p className="mt-2 text-sm font-medium text-foreground truncate">{pub.title}</p>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </ScrollArea>
      )}
    </div>
  );
};

export default Creations;
