import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ComfyUI server address - configurable via env
const COMFYUI_ADDRESS = Deno.env.get('COMFYUI_ADDRESS') || '192.168.1.91:8000';

interface GenerateImageRequest {
  prompt: string;
  negativePrompt?: string;
}

// Load workflow from environment or use embedded default
function loadWorkflow(): Record<string, any> {
  const workflowJson = Deno.env.get('COMFYUI_WORKFLOW');
  if (workflowJson) {
    try {
      return JSON.parse(workflowJson);
    } catch (e) {
      console.error('Error parsing COMFYUI_WORKFLOW:', e);
    }
  }
  
  // Return a minimal workflow structure - user should set COMFYUI_WORKFLOW env var
  // with their full "Image Gen.json" content
  console.warn('No COMFYUI_WORKFLOW env var set, using minimal structure');
  return {};
}

// Update prompt in workflow (nodes 16 and 40)
function updatePromptInWorkflow(
  workflow: Record<string, any>, 
  prompt: string, 
  negativePrompt: string = ""
): Record<string, any> {
  const updatedWorkflow = JSON.parse(JSON.stringify(workflow));
  
  // Node 16: Positive prompt
  if (updatedWorkflow["16"]?.inputs) {
    updatedWorkflow["16"]["inputs"]["text"] = prompt;
  }
  
  // Node 40: Negative prompt
  if (updatedWorkflow["40"]?.inputs) {
    updatedWorkflow["40"]["inputs"]["text"] = negativePrompt;
  }
  
  return updatedWorkflow;
}

// Queue prompt to ComfyUI server
async function queuePrompt(workflow: Record<string, any>): Promise<{ prompt_id: string }> {
  const url = `http://${COMFYUI_ADDRESS}/prompt`;
  console.log('Sending workflow to:', url);
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: workflow }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`HTTP Error ${response.status}: ${response.statusText}`);
    console.error('Details:', errorText);
    throw new Error(`ComfyUI error: ${response.status} - ${errorText}`);
  }

  return await response.json();
}

// Get image from history when generation is complete
async function getImageFromHistory(promptId: string): Promise<string | null> {
  const historyUrl = `http://${COMFYUI_ADDRESS}/history/${promptId}`;
  console.log('Checking history:', historyUrl);
  
  const response = await fetch(historyUrl);
  if (!response.ok) {
    return null;
  }

  const history = await response.json();
  
  if (!history[promptId]) {
    return null;
  }

  const outputs = history[promptId].outputs;
  
  // Find output node with images
  for (const nodeId in outputs) {
    const nodeOutput = outputs[nodeId];
    if (nodeOutput.images && nodeOutput.images.length > 0) {
      const imageInfo = nodeOutput.images[0];
      
      // Fetch the actual image
      const imageUrl = `http://${COMFYUI_ADDRESS}/view?filename=${encodeURIComponent(imageInfo.filename)}&subfolder=${encodeURIComponent(imageInfo.subfolder || '')}&type=${encodeURIComponent(imageInfo.type || 'output')}`;
      
      console.log('Fetching image from:', imageUrl);
      const imageResponse = await fetch(imageUrl);
      
      if (imageResponse.ok) {
        const imageBlob = await imageResponse.arrayBuffer();
        const base64 = btoa(String.fromCharCode(...new Uint8Array(imageBlob)));
        return `data:image/png;base64,${base64}`;
      }
    }
  }
  
  return null;
}

// Check execution status via queue endpoint
async function checkQueueStatus(promptId: string): Promise<{ running: boolean; pending: boolean; position: number }> {
  try {
    const queueUrl = `http://${COMFYUI_ADDRESS}/queue`;
    const response = await fetch(queueUrl);
    
    if (!response.ok) {
      return { running: false, pending: false, position: -1 };
    }

    const queueInfo = await response.json();
    const running = queueInfo.queue_running || [];
    const pending = queueInfo.queue_pending || [];
    
    const isRunning = running.some((item: any) => item[1] === promptId);
    const pendingIndex = pending.findIndex((item: any) => item[1] === promptId);
    
    return {
      running: isRunning,
      pending: pendingIndex >= 0,
      position: pendingIndex >= 0 ? pendingIndex + 1 : -1
    };
  } catch (e) {
    console.error('Error checking queue:', e);
    return { running: false, pending: false, position: -1 };
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('='.repeat(50));
    console.log('🎨 Générateur d\'images ComfyUI');
    console.log('='.repeat(50));
    
    const { prompt, negativePrompt = "" } = await req.json() as GenerateImageRequest;
    
    if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
      console.error('❌ Le prompt ne peut pas être vide!');
      return new Response(
        JSON.stringify({ error: 'Le prompt ne peut pas être vide' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`✓ Prompt reçu: ${prompt}`);
    if (negativePrompt) {
      console.log(`✓ Prompt négatif: ${negativePrompt}`);
    }

    // Load and update workflow
    const workflow = loadWorkflow();
    
    if (Object.keys(workflow).length === 0) {
      console.error('❌ Erreur: Le workflow est vide. Configurez COMFYUI_WORKFLOW');
      return new Response(
        JSON.stringify({ 
          error: 'Workflow non configuré. Ajoutez COMFYUI_WORKFLOW dans les secrets Supabase.' 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('✓ Workflow chargé avec succès');
    
    const updatedWorkflow = updatePromptInWorkflow(workflow, prompt, negativePrompt);

    // Queue the prompt
    console.log('\n⏳ Envoi du workflow au serveur...');
    let response;
    try {
      response = await queuePrompt(updatedWorkflow);
    } catch (e) {
      console.error('❌ Erreur lors de l\'envoi du prompt:', e);
      return new Response(
        JSON.stringify({ 
          error: 'Erreur de connexion à ComfyUI',
          details: e instanceof Error ? e.message : 'Unknown error'
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const promptId = response.prompt_id;
    if (!promptId) {
      console.error('❌ Erreur: Pas d\'ID de prompt reçu');
      return new Response(
        JSON.stringify({ error: 'Pas d\'ID de prompt reçu de ComfyUI' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`✓ Prompt mis en queue avec l'ID: ${promptId}`);
    console.log(`\n⏳ Attente de l'image pour le prompt ID: ${promptId}`);

    // Poll for completion
    let imageData: string | null = null;
    const maxAttempts = 180; // 3 minutes max (1 second per attempt)
    let attempt = 0;
    let lastStatus = '';

    while (attempt < maxAttempts && !imageData) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempt++;

      // Check queue status
      const status = await checkQueueStatus(promptId);
      
      if (status.running && lastStatus !== 'running') {
        console.log('🔄 Génération en cours...');
        lastStatus = 'running';
      } else if (status.pending && lastStatus !== 'pending') {
        console.log(`⏳ En attente (position ${status.position})...`);
        lastStatus = 'pending';
      }

      // Check if image is ready in history
      if (!status.running && !status.pending) {
        imageData = await getImageFromHistory(promptId);
        
        if (imageData) {
          console.log('✓ Exécution terminée');
          console.log('📥 Image reçue');
          break;
        }
      }

      // Also check history periodically even while running
      if (attempt % 5 === 0) {
        imageData = await getImageFromHistory(promptId);
        if (imageData) {
          console.log('✓ Exécution terminée');
          console.log('📥 Image reçue');
          break;
        }
      }
    }

    if (!imageData) {
      console.error('❌ Erreur: Impossible de récupérer l\'image (timeout)');
      return new Response(
        JSON.stringify({ 
          error: 'Timeout lors de la génération de l\'image',
          promptId: promptId
        }),
        { status: 504, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('='.repeat(50));
    console.log('✅ Image générée avec succès!');
    console.log('='.repeat(50));
    
    return new Response(
      JSON.stringify({ 
        imageUrl: imageData,
        promptId: promptId,
        success: true
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
