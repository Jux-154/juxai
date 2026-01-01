-- Recréer la table requests pour Jux-AI
CREATE TABLE IF NOT EXISTS public.requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prompt TEXT NOT NULL,
  imput_message JSONB,
  model TEXT DEFAULT 'liquid/lfm2-1.2b',
  response TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  use_web_search BOOLEAN DEFAULT false,
  search_results JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Activer RLS
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;

-- Politique pour permettre les opérations anonymes (pour le fonctionnement avec le script Python)
CREATE POLICY "Allow anonymous insert" ON public.requests FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous select" ON public.requests FOR SELECT USING (true);
CREATE POLICY "Allow anonymous update" ON public.requests FOR UPDATE USING (true);
CREATE POLICY "Allow anonymous delete" ON public.requests FOR DELETE USING (true);

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_requests_updated_at
  BEFORE UPDATE ON public.requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();