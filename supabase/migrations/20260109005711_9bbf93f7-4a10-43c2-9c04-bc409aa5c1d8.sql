-- Ajouter colonne pour l'image source (mode édition)
ALTER TABLE public.image_requests ADD COLUMN IF NOT EXISTS input_image text;