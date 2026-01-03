-- Ajouter une colonne expires_at pour la suppression automatique après 7 jours
ALTER TABLE public.multi_rooms 
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '7 days');

-- Mettre à jour les salons existants
UPDATE public.multi_rooms 
SET expires_at = created_at + interval '7 days' 
WHERE expires_at IS NULL;

-- Créer une fonction pour nettoyer les salons expirés
CREATE OR REPLACE FUNCTION public.cleanup_expired_rooms()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Supprimer les messages des salons expirés
  DELETE FROM room_messages 
  WHERE room_id IN (
    SELECT id FROM multi_rooms WHERE expires_at < now()
  );
  
  -- Supprimer les membres des salons expirés
  DELETE FROM room_members 
  WHERE room_id IN (
    SELECT id FROM multi_rooms WHERE expires_at < now()
  );
  
  -- Supprimer la queue des salons expirés
  DELETE FROM message_queue 
  WHERE room_id IN (
    SELECT id FROM multi_rooms WHERE expires_at < now()
  );
  
  -- Supprimer les salons expirés
  DELETE FROM multi_rooms WHERE expires_at < now();
END;
$$;

-- Ajouter politique RLS pour permettre à l'hôte d'expulser des membres
DROP POLICY IF EXISTS "Host can manage members" ON room_members;
CREATE POLICY "Host can manage members" ON room_members
FOR DELETE USING (
  auth.uid() = user_id OR 
  EXISTS (
    SELECT 1 FROM multi_rooms 
    WHERE multi_rooms.id = room_members.room_id 
    AND multi_rooms.host_id = auth.uid()
  )
);