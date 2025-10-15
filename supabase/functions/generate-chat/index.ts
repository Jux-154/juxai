import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LM_STUDIO_URL = 'http://192.168.1.91:1234/v1/chat/completions';
const MODEL_NAME = 'qwen/qwen2.5-vl-7b';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Received request to generate-chat function');
    
    // Parse and validate request
    const { prompt } = await req.json();
    
    if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
      console.error('Invalid prompt received:', prompt);
      return new Response(
        JSON.stringify({ error: 'Jux a échoué à votre demande, pour en savoir plus, consultez la FAQ dans les paramètres.' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Sending prompt to LM Studio:', prompt.substring(0, 100) + '...');
    
    // Call LM Studio API
    const lmStudioResponse = await fetch(LM_STUDIO_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL_NAME,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!lmStudioResponse.ok) {
      const errorText = await lmStudioResponse.text();
      console.error('LM Studio API error:', lmStudioResponse.status, errorText);
      return new Response(
        JSON.stringify({
          error: 'Jux a échoué à votre demande, pour en savoir plus, consultez la FAQ dans les paramètres.',
          details: errorText
        }),
        {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const data = await lmStudioResponse.json();
    console.log('Received response from LM Studio');
    
    // Extract the generated text from LM Studio response
    const generatedText = data.choices?.[0]?.message?.content || '';
    
    if (!generatedText) {
      console.error('No content in LM Studio response:', data);
      return new Response(
        JSON.stringify({ error: 'Jux a échoué à votre demande, pour en savoir plus, consultez la FAQ dans les paramètres.' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Successfully generated response');
    
    return new Response(
      JSON.stringify({ response: generatedText }), 
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in generate-chat function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    return new Response(
      JSON.stringify({
        error: 'Jux a échoué à votre demande, pour en savoir plus, consultez la FAQ dans les paramètres.',
        message: errorMessage
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
