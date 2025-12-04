-- Create requests table for AI chat
CREATE TABLE public.requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prompt TEXT NOT NULL,
  imput_message JSONB,
  status TEXT NOT NULL DEFAULT 'pending',
  response TEXT,
  use_web_search BOOLEAN DEFAULT FALSE,
  search_results JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;

-- Allow all operations for now (public access for the Python script)
CREATE POLICY "Allow all operations on requests"
ON public.requests
FOR ALL
USING (true)
WITH CHECK (true);

-- Create index for status polling
CREATE INDEX idx_requests_status ON public.requests(status);
CREATE INDEX idx_requests_created_at ON public.requests(created_at DESC);