import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface GenerateImageRequest {
  prompt: string;
  negativePrompt?: string;
  inputImage?: string | null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authentification requise' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { prompt, negativePrompt = "", inputImage = null } = await req.json() as GenerateImageRequest;
    
    if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
      return new Response(
        JSON.stringify({ error: 'Le prompt ne peut pas être vide' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const isEditMode = !!inputImage;
    console.log(`🎨 Nouvelle requête ${isEditMode ? 'ÉDITION' : 'GÉNÉRATION'}: ${prompt.substring(0, 50)}...`);

    const insertResponse = await fetch(`${SUPABASE_URL}/rest/v1/image_requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        prompt: prompt.trim(),
        negative: negativePrompt.trim() || null,
        input_image: inputImage || null,
        status: 'pending'
      })
    });

    if (!insertResponse.ok) {
      const errorText = await insertResponse.text();
      console.error('Erreur insertion:', errorText);
      return new Response(
        JSON.stringify({ error: 'Erreur lors de la création de la requête', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const insertedData = await insertResponse.json();
    const data = Array.isArray(insertedData) ? insertedData[0] : insertedData;

    console.log(`✓ Requête créée avec l'ID: ${data.id} (mode: ${isEditMode ? 'edit' : 'generate'})`);

    const countResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/image_requests?select=id&status=in.(pending,generating)&created_at=lt.${data.created_at}`,
      {
        headers: {
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'Prefer': 'count=exact'
        }
      }
    );

    const countHeader = countResponse.headers.get('content-range');
    const count = countHeader ? parseInt(countHeader.split('/')[1]) || 0 : 0;
    const queuePosition = count + 1;

    return new Response(
      JSON.stringify({ 
        requestId: data.id,
        status: 'pending',
        queuePosition: queuePosition,
        mode: isEditMode ? 'edit' : 'generate',
        message: `Requête ajoutée à la file d'attente (position ${queuePosition})`
      }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erreur dans generate-image:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    return new Response(
      JSON.stringify({
        error: 'Erreur lors de la génération de l\'image',
        message: errorMessage
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
