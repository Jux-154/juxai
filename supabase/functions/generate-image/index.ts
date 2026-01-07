import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ComfyUI server address - configurable via env
const COMFYUI_ADDRESS = Deno.env.get('COMFYUI_ADDRESS') || '192.168.1.91:8000';

// Load the workflow template
const workflowTemplate = {
  "16": {
    "inputs": {
      "text": ""  // Positive prompt - will be updated
    },
    "class_type": "CLIPTextEncode"
  },
  "40": {
    "inputs": {
      "text": ""  // Negative prompt - will be updated  
    },
    "class_type": "CLIPTextEncode"
  }
};

interface GenerateImageRequest {
  prompt: string;
  negativePrompt?: string;
  requestId: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Received image generation request');
    
    const { prompt, negativePrompt = "", requestId } = await req.json() as GenerateImageRequest;
    
    if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
      console.error('Invalid prompt received:', prompt);
      return new Response(
        JSON.stringify({ error: 'Le prompt ne peut pas être vide' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Generating image with prompt:', prompt.substring(0, 100) + '...');
    
    // Load and update workflow with prompts
    const workflow = JSON.parse(JSON.stringify(workflowTemplate));
    workflow["16"]["inputs"]["text"] = prompt;
    workflow["40"]["inputs"]["text"] = negativePrompt;

    // Try to load the full workflow from environment or use a basic one
    let fullWorkflow;
    const workflowJson = Deno.env.get('COMFYUI_WORKFLOW');
    if (workflowJson) {
      try {
        fullWorkflow = JSON.parse(workflowJson);
        fullWorkflow["16"]["inputs"]["text"] = prompt;
        fullWorkflow["40"]["inputs"]["text"] = negativePrompt;
      } catch (e) {
        console.error('Error parsing workflow JSON:', e);
        fullWorkflow = workflow;
      }
    } else {
      fullWorkflow = workflow;
    }

    // Send workflow to ComfyUI queue
    const queueUrl = `http://${COMFYUI_ADDRESS}/prompt`;
    console.log('Sending to ComfyUI:', queueUrl);
    
    const queueResponse = await fetch(queueUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt: fullWorkflow }),
    });

    if (!queueResponse.ok) {
      const errorText = await queueResponse.text();
      console.error('ComfyUI queue error:', queueResponse.status, errorText);
      return new Response(
        JSON.stringify({
          error: 'Erreur de connexion à ComfyUI',
          details: errorText
        }),
        {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const queueData = await queueResponse.json();
    const promptId = queueData.prompt_id;

    if (!promptId) {
      console.error('No prompt_id received from ComfyUI');
      return new Response(
        JSON.stringify({ error: 'Pas d\'ID de prompt reçu de ComfyUI' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Prompt queued with ID:', promptId);

    // Poll for completion with progress updates
    let imageData: string | null = null;
    let progress = 0;
    const maxAttempts = 120; // 2 minutes max
    let attempt = 0;

    while (attempt < maxAttempts && !imageData) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempt++;

      try {
        // Check history for completion
        const historyUrl = `http://${COMFYUI_ADDRESS}/history/${promptId}`;
        const historyResponse = await fetch(historyUrl);
        
        if (historyResponse.ok) {
          const history = await historyResponse.json();
          
          if (history[promptId]) {
            const outputs = history[promptId].outputs;
            
            // Find the output with images
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
                  imageData = `data:image/png;base64,${base64}`;
                  progress = 100;
                  console.log('Image successfully retrieved');
                }
                break;
              }
            }
          }
        }

        // Check queue for progress estimation
        if (!imageData) {
          const queueInfoUrl = `http://${COMFYUI_ADDRESS}/queue`;
          const queueInfoResponse = await fetch(queueInfoUrl);
          
          if (queueInfoResponse.ok) {
            const queueInfo = await queueInfoResponse.json();
            const running = queueInfo.queue_running || [];
            const pending = queueInfo.queue_pending || [];
            
            // Estimate progress based on position
            const isRunning = running.some((item: any) => item[1] === promptId);
            const pendingIndex = pending.findIndex((item: any) => item[1] === promptId);
            
            if (isRunning) {
              progress = Math.min(50 + (attempt / maxAttempts) * 50, 95);
            } else if (pendingIndex >= 0) {
              progress = Math.min((attempt / maxAttempts) * 30, 30);
            }
          }
        }

      } catch (pollError) {
        console.error('Polling error:', pollError);
        // Continue polling
      }
    }

    if (!imageData) {
      return new Response(
        JSON.stringify({ 
          error: 'Timeout lors de la génération de l\'image',
          progress: progress 
        }),
        {
          status: 504,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Successfully generated image');
    
    return new Response(
      JSON.stringify({ 
        imageUrl: imageData,
        promptId: promptId,
        progress: 100
      }), 
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in generate-image function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    return new Response(
      JSON.stringify({
        error: 'Erreur lors de la génération de l\'image',
        message: errorMessage
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
