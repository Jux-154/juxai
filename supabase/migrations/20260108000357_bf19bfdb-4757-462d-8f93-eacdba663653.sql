-- Allow authenticated and anonymous users to delete their image requests
CREATE POLICY "Anon can delete image_requests" 
ON public.image_requests 
FOR DELETE 
USING (true);

CREATE POLICY "Authenticated can delete image_requests" 
ON public.image_requests 
FOR DELETE 
TO authenticated
USING (true);