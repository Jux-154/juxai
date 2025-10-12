-- Ajouter colonne pour indiquer si la recherche web est activée
ALTER TABLE requests 
ADD COLUMN use_web_search boolean DEFAULT false;

-- Ajouter colonne pour stocker les résultats de recherche
ALTER TABLE requests 
ADD COLUMN search_results jsonb DEFAULT null;

-- Index pour améliorer les performances du polling
CREATE INDEX IF NOT EXISTS idx_requests_pending_web_search 
ON requests(status, use_web_search, created_at) 
WHERE status = 'pending' AND use_web_search = true;