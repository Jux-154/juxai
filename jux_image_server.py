"""
Serveur Jux-AI - Génération d'images ComfyUI
Supporte: Génération (texte) et Édition (texte + image)
"""

import json
import urllib.request
import urllib.error
import time
import os
import base64
import io
import threading
from PIL import Image
from supabase import create_client, Client

try:
    import websocket
except ImportError:
    os.system("pip install websocket-client")
    import websocket

# ================= CONFIG =================

SUPABASE_URL = "https://vgfixrbwptoefiyofixe.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZnZml4cmJ3cHRvZWZpeW9maXhlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDU0MzAxNywiZXhwIjoyMDgwMTE5MDE3fQ.F-nQs0PsHWDnaFvzu-CVmtwYzS-rmtYsA5vFp47I5PY"

COMFYUI_ADDRESS = "127.0.0.1:8000"
COMFYUI_INPUT_DIR = "./ComfyUI/input"

WORKFLOW_GENERATE = "Image Gen.json"
WORKFLOW_EDIT = "Image Edit.json"
INPUT_IMAGE_FILENAME = "jux_edit_input.png"

MAX_RETRIES = 3
RETRY_DELAY = 2
POLL_INTERVAL = 2
WS_TIMEOUT = 300

# ================= SUPABASE CLIENT =================

def get_supabase_client() -> Client:
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

# ================= HEARTBEAT =================

def update_server_heartbeat(supabase: Client):
    """Met à jour le timestamp du serveur dans Supabase"""
    try:
        supabase.table("server_status").upsert({
            "id": "jux-ai-server",
            "status": "online",
            "last_heartbeat": int(time.time())
        }).execute()
    except Exception as e:
        print(f"⚠️ Heartbeat error: {e}")

def start_heartbeat_thread(supabase: Client):
    """Lance un thread qui met à jour régulièrement le heartbeat"""
    def heartbeat_loop():
        while True:
            try:
                update_server_heartbeat(supabase)
                time.sleep(5)
            except Exception as e:
                print(f"❌ Heartbeat error: {e}")
                time.sleep(5)
    
    thread = threading.Thread(target=heartbeat_loop, daemon=True)
    thread.start()
    print("💓 Heartbeat thread started")

print("🎨 Serveur Jux-AI Image démarré")
print(f"📄 Workflow Génération: {WORKFLOW_GENERATE}")
print(f"📄 Workflow Édition: {WORKFLOW_EDIT}")

# ================= WORKFLOW =================

def load_workflow(filepath: str) -> dict:
    with open(filepath, "r", encoding="utf-8") as f:
        return json.load(f)

def update_generate_workflow(workflow: dict, prompt: str, negative: str) -> dict:
    """Met à jour le workflow de génération (texte vers image)"""
    workflow = json.loads(json.dumps(workflow))  # Deep copy
    workflow["16"]["inputs"]["text"] = prompt
    workflow["40"]["inputs"]["text"] = negative if negative else ""
    return workflow

def update_edit_workflow(workflow: dict, prompt: str, negative: str) -> dict:
    """Met à jour le workflow d'édition (image + texte vers image)
    
    Nodes utilisés:
    - "6" = Positive prompt (CLIPTextEncode)
    - "7" = Negative prompt (CLIPTextEncode)
    - "13" = Load Image (le fichier doit être dans le dossier input de ComfyUI)
    """
    workflow = json.loads(json.dumps(workflow))  # Deep copy
    
    # Mettre à jour le prompt positif
    workflow["6"]["inputs"]["text"] = prompt
    
    # Mettre à jour le prompt négatif
    workflow["7"]["inputs"]["text"] = negative if negative else "low quality, blurry, distorted"
    
    # Mettre à jour le nom du fichier image d'entrée
    workflow["13"]["inputs"]["image"] = INPUT_IMAGE_FILENAME
    
    return workflow

def save_input_image(base64_data: str) -> bool:
    """Sauvegarde l'image base64 dans le dossier input de ComfyUI"""
    try:
        os.makedirs(COMFYUI_INPUT_DIR, exist_ok=True)
        image_data = base64.b64decode(base64_data)
        image = Image.open(io.BytesIO(image_data))
        
        # Convertir en RGB si nécessaire
        if image.mode in ('RGBA', 'LA', 'P'):
            background = Image.new('RGB', image.size, (255, 255, 255))
            if image.mode == 'P':
                image = image.convert('RGBA')
            background.paste(image, mask=image.split()[-1] if image.mode == 'RGBA' else None)
            image = background
        elif image.mode != 'RGB':
            image = image.convert('RGB')
        
        filepath = os.path.join(COMFYUI_INPUT_DIR, INPUT_IMAGE_FILENAME)
        image.save(filepath, format="PNG")
        print(f"📁 Image d'entrée sauvegardée: {filepath}")
        return True
    except Exception as e:
        print(f"❌ Erreur sauvegarde image: {e}")
        return False

# ================= COMFYUI =================

def check_comfyui_status() -> bool:
    try:
        url = f"http://{COMFYUI_ADDRESS}/system_stats"
        req = urllib.request.Request(url, method="GET")
        with urllib.request.urlopen(req, timeout=5) as res:
            return res.status == 200
    except Exception:
        return False

def queue_prompt(workflow: dict) -> dict:
    url = f"http://{COMFYUI_ADDRESS}/prompt"
    payload = {"prompt": workflow}
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
    
    for attempt in range(MAX_RETRIES):
        try:
            with urllib.request.urlopen(req, timeout=30) as res:
                return json.loads(res.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            error_body = e.read().decode("utf-8")
            print(f"⚠️ Tentative {attempt + 1}/{MAX_RETRIES} échouée: HTTP {e.code}")
            print(f"   Response: {error_body[:200]}")
            if attempt < MAX_RETRIES - 1:
                time.sleep(RETRY_DELAY)
            else:
                raise
        except urllib.error.URLError as e:
            print(f"⚠️ Tentative {attempt + 1}/{MAX_RETRIES} échouée: {e}")
            if attempt < MAX_RETRIES - 1:
                time.sleep(RETRY_DELAY)
            else:
                raise

def get_image_ws(prompt_id: str, req_id: str, update_progress, supabase: Client) -> Image.Image | None:
    ws_url = f"ws://{COMFYUI_ADDRESS}/ws?clientId=jux-ai-{req_id[:8]}"
    ws = None
    
    try:
        ws = websocket.create_connection(ws_url, timeout=WS_TIMEOUT)
        ws.settimeout(5)
        current_progress = 0
        last_check = time.time()

        while True:
            if time.time() - last_check > 0.5:
                if check_cancel(req_id, supabase):
                    return None
                last_check = time.time()

            try:
                msg = ws.recv()
            except websocket.WebSocketTimeoutException:
                continue
            except Exception as e:
                print(f"❌ Erreur WebSocket: {e}")
                break

            if isinstance(msg, str):
                try:
                    data = json.loads(msg)
                except json.JSONDecodeError:
                    continue

                if data.get("type") == "progress":
                    value = data.get("data", {}).get("value", 0)
                    max_val = data.get("data", {}).get("max", 1)
                    new_progress = int((value / max_val) * 100)
                    if new_progress != current_progress:
                        current_progress = new_progress
                        update_progress(current_progress)

                if data.get("type") == "executing":
                    exec_data = data.get("data", {})
                    if exec_data.get("node") is None and exec_data.get("prompt_id") == prompt_id:
                        print("✅ Génération terminée")

            elif isinstance(msg, bytes) and len(msg) > 8:
                try:
                    return Image.open(io.BytesIO(msg[8:]))
                except Exception as e:
                    print(f"❌ Erreur décodage: {e}")

    except Exception as e:
        print(f"❌ Erreur: {e}")
    finally:
        if ws:
            try:
                ws.close()
            except:
                pass
    return None

# ================= SUPABASE OPERATIONS =================

def check_cancel(req_id: str, supabase: Client) -> bool:
    try:
        r = supabase.table("image_requests").select("status").eq("id", req_id).execute()
        if not r.data:
            return True
        return r.data[0]["status"] in ("cancelled", "error")
    except:
        return True

def update_progress_db(req_id: str, progress: int, supabase: Client):
    try:
        supabase.table("image_requests").update({"progress": progress}).eq("id", req_id).execute()
    except Exception as e:
        print(f"⚠️ Erreur progress: {e}")

def update_status(req_id: str, status: str, supabase: Client, **kwargs):
    try:
        supabase.table("image_requests").update({"status": status, **kwargs}).eq("id", req_id).execute()
    except Exception as e:
        print(f"⚠️ Erreur status: {e}")

def get_pending_requests(supabase: Client) -> list:
    try:
        res = supabase.table("image_requests").select("*").eq("status", "pending").order("created_at", desc=False).execute()
        return res.data or []
    except Exception as e:
        print(f"❌ Erreur: {e}")
        return []

def cleanup_stale_requests(supabase: Client):
    try:
        from datetime import datetime, timedelta, timezone
        threshold = (datetime.now(timezone.utc) - timedelta(minutes=5)).isoformat()
        res = supabase.table("image_requests").select("id").eq("status", "generating").lt("created_at", threshold).execute()
        for req in (res.data or []):
            print(f"🧹 Nettoyage: {req['id'][:8]}")
            supabase.table("image_requests").update({
                "status": "error",
                "image_base64": "Timeout serveur"
            }).eq("id", req["id"]).execute()
    except Exception as e:
        print(f"⚠️ Erreur cleanup: {e}")

def image_to_base64(img: Image.Image) -> str:
    buffer = io.BytesIO()
    img.save(buffer, format="PNG", optimize=True)
    return base64.b64encode(buffer.getvalue()).decode("utf-8")

# ================= TRAITEMENT =================

def process_request(req: dict, supabase: Client):
    req_id = req["id"]
    prompt = req["prompt"]
    negative = req.get("negative", "")
    input_image = req.get("input_image")
    
    is_edit_mode = input_image is not None and len(input_image) > 0
    mode_str = "ÉDITION" if is_edit_mode else "GÉNÉRATION"

    print(f"\n{'='*50}")
    print(f"➡️ [{mode_str}]: {req_id[:8]}")
    print(f"📝 Prompt: {prompt[:80]}...")

    if check_cancel(req_id, supabase):
        print("⛔ Annulée")
        return

    update_status(req_id, "generating", supabase, progress=0)

    try:
        if is_edit_mode:
            # Mode édition: sauvegarder l'image et utiliser le workflow d'édition
            if not save_input_image(input_image):
                raise Exception("Impossible de sauvegarder l'image d'entrée")
            workflow = load_workflow(WORKFLOW_EDIT)
            workflow = update_edit_workflow(workflow, prompt, negative)
            print(f"📄 Workflow: {WORKFLOW_EDIT}")
        else:
            # Mode génération: utiliser le workflow de génération standard
            workflow = load_workflow(WORKFLOW_GENERATE)
            workflow = update_generate_workflow(workflow, prompt, negative)
            print(f"📄 Workflow: {WORKFLOW_GENERATE}")

        result = queue_prompt(workflow)
        prompt_id = result.get("prompt_id")
        if not prompt_id:
            raise Exception("Pas de prompt_id retourné par ComfyUI")

        print(f"📤 ComfyUI: {prompt_id}")

        def update_progress(p):
            update_progress_db(req_id, p, supabase)
            print(f"📊 {p}%")

        image = get_image_ws(prompt_id, req_id, update_progress, supabase)

        if image is None:
            if check_cancel(req_id, supabase):
                print("⛔ Annulée")
                return
            raise Exception("Aucune image reçue de ComfyUI")

        img_b64 = image_to_base64(image)
        update_status(req_id, "done", supabase, progress=100, image_base64=img_b64)
        print(f"✅ Terminé ({len(img_b64)} chars)")

    except Exception as e:
        print(f"❌ Erreur: {e}")
        update_status(req_id, "error", supabase, image_base64=str(e))

# ================= MAIN =================

def main():
    print("\n🚀 Démarrage...")
    
    supabase = get_supabase_client()
    
    # Lancer le thread de heartbeat
    start_heartbeat_thread(supabase)
    
    if not check_comfyui_status():
        print(f"⚠️ ComfyUI non accessible sur {COMFYUI_ADDRESS}")

    cleanup_counter = 0
    
    while True:
        try:
            supabase = get_supabase_client()
            
            cleanup_counter += 1
            if cleanup_counter >= 30:
                cleanup_stale_requests(supabase)
                cleanup_counter = 0

            pending = get_pending_requests(supabase)

            if pending:
                print(f"\n📋 File: {len(pending)} requête(s)")
                if not check_comfyui_status():
                    print("⚠️ ComfyUI indisponible")
                    time.sleep(5)
                    continue
                process_request(pending[0], supabase)

            time.sleep(POLL_INTERVAL)

        except KeyboardInterrupt:
            print("\n👋 Arrêt")
            break
        except Exception as e:
            print(f"❌ Erreur: {e}")
            time.sleep(5)

    print("🛑 Arrêté")

if __name__ == "__main__":
    main()
