-- Permettre à tout le monde de voir les images qui sont publiées
CREATE POLICY "Anyone can view published images" 
ON user_images 
FOR SELECT 
USING (
  id IN (SELECT image_id FROM publications)
);

-- Table des crédits utilisateur
CREATE TABLE public.user_credits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  credits INTEGER NOT NULL DEFAULT 5,
  last_reset_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS pour les crédits
ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own credits" 
ON user_credits 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own credits" 
ON user_credits 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own credits" 
ON user_credits 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Fonction pour reset les crédits à minuit UTC-4
CREATE OR REPLACE FUNCTION public.reset_daily_credits()
RETURNS TRIGGER AS $$
BEGIN
  -- Si la date de reset est différente de aujourd'hui, reset les crédits
  IF NEW.last_reset_date < CURRENT_DATE THEN
    NEW.credits := 5;
    NEW.last_reset_date := CURRENT_DATE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger pour vérifier le reset avant chaque mise à jour
CREATE TRIGGER check_credits_reset
BEFORE UPDATE ON user_credits
FOR EACH ROW
EXECUTE FUNCTION reset_daily_credits();