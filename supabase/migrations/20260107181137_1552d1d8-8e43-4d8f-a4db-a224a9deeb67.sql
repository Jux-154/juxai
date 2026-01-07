-- Ajouter la colonne progress pour le pourcentage
ALTER TABLE public.image_requests 
ADD COLUMN IF NOT EXISTS progress integer DEFAULT 0;

-- Ajouter une politique SELECT pour les utilisateurs authentifiés
CREATE POLICY "Authenticated users can read image_requests"
ON public.image_requests
FOR SELECT
TO authenticated
USING (true);

-- Ajouter une politique SELECT pour anon aussi (pour le polling)
CREATE POLICY "Anon can read image_requests"
ON public.image_requests
FOR SELECT
TO anon
USING (true);