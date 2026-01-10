import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface UserImage {
  id: string;
  url: string;
  prompt: string;
  createdAt: string;
  isPublished: boolean;
}

export const useUserImages = (userId: string | undefined) => {
  const [images, setImages] = useState<UserImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchImages = useCallback(async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from("user_images")
        .select(`
          id,
          storage_path,
          prompt,
          created_at,
          publications (id)
        `)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const enrichedImages: UserImage[] = (data || []).map((img: any) => ({
        id: img.id,
        url: supabase.storage.from("images").getPublicUrl(img.storage_path).data.publicUrl,
        prompt: img.prompt,
        createdAt: img.created_at,
        isPublished: Array.isArray(img.publications) && img.publications.length > 0,
      }));

      setImages(enrichedImages);
    } catch (error) {
      console.error("Error fetching images:", error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  const saveImage = async (base64: string, prompt: string): Promise<UserImage | null> => {
    if (!userId) return null;

    try {
      // Convertir base64 en blob
      const byteCharacters = atob(base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: "image/png" });

      // Upload vers Storage
      const fileName = `${userId}/${Date.now()}.png`;
      const { error: uploadError } = await supabase.storage
        .from("images")
        .upload(fileName, blob, { contentType: "image/png" });

      if (uploadError) throw uploadError;

      // Créer l'entrée dans user_images
      const { data, error } = await supabase
        .from("user_images")
        .insert({
          user_id: userId,
          storage_path: fileName,
          prompt,
        })
        .select()
        .single();

      if (error) throw error;

      const newImage: UserImage = {
        id: data.id,
        url: supabase.storage.from("images").getPublicUrl(fileName).data.publicUrl,
        prompt,
        createdAt: data.created_at,
        isPublished: false,
      };

      setImages((prev) => [newImage, ...prev]);
      return newImage;
    } catch (error) {
      console.error("Error saving image:", error);
      toast({ title: "Erreur", description: "Impossible de sauvegarder l'image", variant: "destructive" });
      return null;
    }
  };

  const deleteImage = async (imageId: string) => {
    if (!userId) return;

    try {
      const image = images.find((img) => img.id === imageId);
      if (!image) return;

      // Extraire le path du storage
      const url = new URL(image.url);
      const path = url.pathname.split("/images/")[1];

      if (path) {
        await supabase.storage.from("images").remove([path]);
      }

      await supabase.from("user_images").delete().eq("id", imageId);

      setImages((prev) => prev.filter((img) => img.id !== imageId));
      toast({ title: "Image supprimée" });
    } catch (error) {
      console.error("Error deleting image:", error);
      toast({ title: "Erreur", description: "Impossible de supprimer l'image", variant: "destructive" });
    }
  };

  const publishImage = async (imageId: string, title: string, description: string) => {
    if (!userId) return;

    try {
      // Créer la publication
      const { data: pub, error: pubError } = await supabase
        .from("publications")
        .insert({
          user_id: userId,
          image_id: imageId,
          title: title || null,
          description: description || null,
        })
        .select()
        .single();

      if (pubError) throw pubError;

      // Extraire et créer les hashtags
      const hashtags = description.match(/#\w+/g) || [];
      for (const tag of hashtags) {
        const tagName = tag.slice(1).toLowerCase();

        // Upsert le hashtag
        const { data: existingTag } = await supabase
          .from("hashtags")
          .select("id")
          .eq("name", tagName)
          .single();

        let hashtagId: string;
        if (existingTag) {
          hashtagId = existingTag.id;
        } else {
          const { data: newTag, error: tagError } = await supabase
            .from("hashtags")
            .insert({ name: tagName })
            .select()
            .single();
          if (tagError) continue;
          hashtagId = newTag.id;
        }

        // Lier le hashtag à la publication
        await supabase
          .from("publication_hashtags")
          .insert({ publication_id: pub.id, hashtag_id: hashtagId });
      }

      // Mettre à jour l'état local
      setImages((prev) =>
        prev.map((img) => (img.id === imageId ? { ...img, isPublished: true } : img))
      );

      toast({ title: "Image publiée !", description: "Votre création est maintenant visible" });
    } catch (error) {
      console.error("Error publishing image:", error);
      toast({ title: "Erreur", description: "Impossible de publier l'image", variant: "destructive" });
    }
  };

  return {
    images,
    isLoading,
    saveImage,
    deleteImage,
    publishImage,
    refreshImages: fetchImages,
  };
};
