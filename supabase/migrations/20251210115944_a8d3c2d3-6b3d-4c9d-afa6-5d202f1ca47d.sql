-- Add model field to requests table
ALTER TABLE public.requests 
ADD COLUMN model text DEFAULT 'liquid/lfm2-1.2b';

-- Update existing rows
UPDATE public.requests SET model = 'google/gemma-3-4b' WHERE model IS NULL;