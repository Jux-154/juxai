-- ============================================
-- USER IMAGES - Stockage des images générées
-- ============================================
CREATE TABLE public.user_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  prompt TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own images"
  ON public.user_images FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own images"
  ON public.user_images FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own images"
  ON public.user_images FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX idx_user_images_user_id ON public.user_images(user_id);
CREATE INDEX idx_user_images_created_at ON public.user_images(created_at DESC);

-- ============================================
-- PUBLICATIONS - Images publiées
-- ============================================
CREATE TABLE public.publications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  image_id UUID NOT NULL REFERENCES public.user_images(id) ON DELETE CASCADE,
  title TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(image_id)
);

ALTER TABLE public.publications ENABLE ROW LEVEL SECURITY;

-- Tout le monde peut voir les publications
CREATE POLICY "Anyone can view publications"
  ON public.publications FOR SELECT
  USING (true);

CREATE POLICY "Users can create their own publications"
  ON public.publications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own publications"
  ON public.publications FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX idx_publications_user_id ON public.publications(user_id);
CREATE INDEX idx_publications_created_at ON public.publications(created_at DESC);

-- ============================================
-- HASHTAGS - Tags des publications
-- ============================================
CREATE TABLE public.hashtags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  use_count INTEGER NOT NULL DEFAULT 0
);

ALTER TABLE public.hashtags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view hashtags"
  ON public.hashtags FOR SELECT
  USING (true);

CREATE POLICY "System can manage hashtags"
  ON public.hashtags FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE INDEX idx_hashtags_name ON public.hashtags(name);
CREATE INDEX idx_hashtags_use_count ON public.hashtags(use_count DESC);

-- ============================================
-- PUBLICATION_HASHTAGS - Liaison publications/hashtags
-- ============================================
CREATE TABLE public.publication_hashtags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  publication_id UUID NOT NULL REFERENCES public.publications(id) ON DELETE CASCADE,
  hashtag_id UUID NOT NULL REFERENCES public.hashtags(id) ON DELETE CASCADE,
  UNIQUE(publication_id, hashtag_id)
);

ALTER TABLE public.publication_hashtags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view publication hashtags"
  ON public.publication_hashtags FOR SELECT
  USING (true);

CREATE POLICY "Users can manage their publication hashtags"
  ON public.publication_hashtags FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================
-- LIKES - Likes sur les publications
-- ============================================
CREATE TABLE public.likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  publication_id UUID NOT NULL REFERENCES public.publications(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, publication_id)
);

ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view likes count"
  ON public.likes FOR SELECT
  USING (true);

CREATE POLICY "Users can like publications"
  ON public.likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike publications"
  ON public.likes FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX idx_likes_publication_id ON public.likes(publication_id);
CREATE INDEX idx_likes_user_id ON public.likes(user_id);

-- ============================================
-- VIEWED_PUBLICATIONS - Images déjà vues (pour le feed)
-- ============================================
CREATE TABLE public.viewed_publications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  publication_id UUID NOT NULL REFERENCES public.publications(id) ON DELETE CASCADE,
  viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, publication_id)
);

ALTER TABLE public.viewed_publications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own viewed publications"
  ON public.viewed_publications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can mark publications as viewed"
  ON public.viewed_publications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_viewed_publications_user_id ON public.viewed_publications(user_id);

-- ============================================
-- USER_SETTINGS - Paramètres utilisateur
-- ============================================
CREATE TABLE public.user_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  pseudo TEXT,
  feed_mode TEXT NOT NULL DEFAULT 'tiktok',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own settings"
  ON public.user_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings"
  ON public.user_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings"
  ON public.user_settings FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================
-- STORAGE BUCKET - Pour les images
-- ============================================
INSERT INTO storage.buckets (id, name, public) VALUES ('images', 'images', true);

-- Politiques de stockage
CREATE POLICY "Anyone can view images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'images');

CREATE POLICY "Users can upload images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ============================================
-- FUNCTION - Mettre à jour le compteur de hashtags
-- ============================================
CREATE OR REPLACE FUNCTION public.increment_hashtag_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.hashtags SET use_count = use_count + 1 WHERE id = NEW.hashtag_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_increment_hashtag_count
AFTER INSERT ON public.publication_hashtags
FOR EACH ROW EXECUTE FUNCTION public.increment_hashtag_count();

CREATE OR REPLACE FUNCTION public.decrement_hashtag_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.hashtags SET use_count = use_count - 1 WHERE id = OLD.hashtag_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_decrement_hashtag_count
AFTER DELETE ON public.publication_hashtags
FOR EACH ROW EXECUTE FUNCTION public.decrement_hashtag_count();