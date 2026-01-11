-- Add avatar_url and pseudo_changed_at columns to user_settings
ALTER TABLE public.user_settings 
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS pseudo_changed_at TIMESTAMP WITH TIME ZONE;

-- Create unique index on pseudo (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS user_settings_pseudo_unique 
ON public.user_settings (LOWER(pseudo)) 
WHERE pseudo IS NOT NULL;

-- Function to check if pseudo is available
CREATE OR REPLACE FUNCTION public.check_pseudo_available(check_pseudo TEXT, current_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM public.user_settings 
    WHERE LOWER(pseudo) = LOWER(check_pseudo) 
    AND user_id != current_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to check if user can change pseudo (7 day cooldown)
CREATE OR REPLACE FUNCTION public.can_change_pseudo(check_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  last_change TIMESTAMP WITH TIME ZONE;
BEGIN
  SELECT pseudo_changed_at INTO last_change 
  FROM public.user_settings 
  WHERE user_id = check_user_id;
  
  IF last_change IS NULL THEN
    RETURN TRUE;
  END IF;
  
  RETURN (NOW() - last_change) > INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;