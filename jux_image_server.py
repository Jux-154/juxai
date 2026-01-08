"""
Serveur Jux-AI - Génération d'images ComfyUI
Version améliorée avec meilleure gestion des erreurs et file d'attente
"""

import json
import urllib.request
import urllib.error
import time
import os
import base64
import io
import threading
from queue import Queue
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
WORKFLOW_FILE = "Image Gen.json"

# Délais et retry
MAX_RETRIES = 3
RETRY_DELAY = 2
POLL_INTERVAL = 2
WS_TIMEOUT = 300  # 5 minutes max pour une génération

# ================= SUPABASE CLIENT =================

def get_supabase_client() -> Client:
    """Crée un nouveau client Supabase (thread-safe)"""
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

print("🎨 Serveur Jux-AI Image démarré (ComfyUI + Supabase)")
print(f"📡 ComfyUI: {COMFYUI_ADDRESS}")
print(f"📄 Workflow: {WORKFLOW_FILE}")

# ================= WORKFLOW =================

def load_workflow():
    """Charge le fichier workflow JSON"""
    try:
        with open(WORKFLOW_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"❌ Fichier workflow introuvable: {WORKFLOW_FILE}")
        raise
    except json.JSONDecodeError as e:
        print(f"❌ Erreur JSON dans le workflow: {e}")
        raise

def update_workflow(workflow: dict, prompt: str, negative: str) -> dict:
    """Met à jour le workflow avec le prompt"""
    workflow = json.loads(json.dumps(workflow))  # Deep copy
    workflow["16"]["inputs"]["text"] = prompt
    workflow["40"]["inputs"]["text"] = negative if negative else ""
    return workflow

# ================= COMFYUI =================

def check_comfyui_status() -> bool:
    """Vérifie si ComfyUI est accessible"""
    try:
        url = f"http://{COMFYUI_ADDRESS}/system_stats"
        req = urllib.request.Request(url, method="GET")
        with urllib.request.urlopen(req, timeout=5) as res:
            return res.status == 200
    except Exception:
        return False

def queue_prompt(workflow: dict) -> dict:
    """Envoie le workflow à ComfyUI"""
    url = f"http://{COMFYUI_ADDRESS}/prompt"
    data = json.dumps({"prompt": workflow}).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
    
    for attempt in range(MAX_RETRIES):
        try:
            with urllib.request.urlopen(req, timeout=30) as res:
                return json.loads(res.read().decode("utf-8"))
        except urllib.error.URLError as e:
            print(f"⚠️ Tentative {attempt + 1}/{MAX_RETRIES} échouée: {e}")
            if attempt < MAX_RETRIES - 1:
                time.sleep(RETRY_DELAY)
            else:
                raise

def get_image_ws(prompt_id: str, req_id: str, update_progress, supabase: Client) -> Image.Image | None:
    """Récupère l'image via WebSocket avec gestion robuste"""
    ws_url = f"ws://{COMFYUI_ADDRESS}/ws?clientId=jux-ai-{req_id[:8]}"
    ws = None
    
    try:
        ws = websocket.create_connection(ws_url, timeout=WS_TIMEOUT)
        ws.settimeout(5)  # Timeout pour chaque message
        current_progress = 0
        last_check = time.time()

        while True:
            # Vérifier annulation toutes les 500ms
            if time.time() - last_check > 0.5:
                if check_cancel(req_id, supabase):
                    print(f"⛔ Annulation détectée pour {req_id[:8]}")
                    return None
                last_check = time.time()

            try:
                msg = ws.recv()
            except websocket.WebSocketTimeoutException:
                continue  # Timeout normal, on continue
            except Exception as e:
                print(f"❌ Erreur WebSocket recv: {e}")
                break

            if isinstance(msg, str):
                try:
                    data = json.loads(msg)
                except json.JSONDecodeError:
                    continue

                # Suivi de progression
                if data.get("type") == "progress":
                    value = data.get("data", {}).get("value", 0)
                    max_val = data.get("data", {}).get("max", 1)
                    new_progress = int((value / max_val) * 100)
                    if new_progress != current_progress:
                        current_progress = new_progress
                        update_progress(current_progress)

                # Fin de génération
                if data.get("type") == "executing":
                    exec_data = data.get("data", {})
                    if exec_data.get("node") is None and exec_data.get("prompt_id") == prompt_id:
                        print("✅ Génération terminée, attente image...")
                        # Continuer pour recevoir l'image binaire

            elif isinstance(msg, bytes) and len(msg) > 8:
                # Image reçue (skip les 8 premiers bytes de header)
                try:
                    image = Image.open(io.BytesIO(msg[8:]))
                    return image
                except Exception as e:
                    print(f"❌ Erreur décodage image: {e}")

    except websocket.WebSocketException as e:
        print(f"❌ Erreur WebSocket: {e}")
    except Exception as e:
        print(f"❌ Erreur inattendue: {e}")
    finally:
        if ws:
            try:
                ws.close()
            except:
                pass

    return None

# ================= SUPABASE OPERATIONS =================

def check_cancel(req_id: str, supabase: Client) -> bool:
    """Vérifie si la requête a été annulée ou supprimée"""
    try:
        r = supabase.table("image_requests").select("status").eq("id", req_id).execute()
        if not r.data or len(r.data) == 0:
            return True  # Supprimée
        return r.data[0]["status"] in ("cancelled", "error")
    except Exception:
        return True  # En cas d'erreur, on considère annulé

def update_progress_db(req_id: str, progress: int, supabase: Client):
    """Met à jour la progression dans la DB"""
    try:
        supabase.table("image_requests").update({
            "progress": progress
        }).eq("id", req_id).execute()
    except Exception as e:
        print(f"⚠️ Erreur update progress: {e}")

def update_status(req_id: str, status: str, supabase: Client, **kwargs):
    """Met à jour le status et autres champs"""
    try:
        data = {"status": status, **kwargs}
        supabase.table("image_requests").update(data).eq("id", req_id).execute()
    except Exception as e:
        print(f"⚠️ Erreur update status: {e}")

def get_pending_requests(supabase: Client) -> list:
    """Récupère les requêtes en attente"""
    try:
        res = supabase.table("image_requests") \
            .select("*") \
            .eq("status", "pending") \
            .order("created_at", desc=False) \
            .execute()
        return res.data or []
    except Exception as e:
        print(f"❌ Erreur récupération requêtes: {e}")
        return []

def cleanup_stale_requests(supabase: Client):
    """Nettoie les requêtes bloquées en 'generating' depuis trop longtemps"""
    try:
        # Les requêtes 'generating' depuis plus de 5 minutes sont considérées bloquées
        from datetime import datetime, timedelta
        threshold = (datetime.utcnow() - timedelta(minutes=5)).isoformat()
        
        res = supabase.table("image_requests") \
            .select("id") \
            .eq("status", "generating") \
            .lt("created_at", threshold) \
            .execute()
        
        for req in (res.data or []):
            print(f"🧹 Nettoyage requête bloquée: {req['id'][:8]}")
            supabase.table("image_requests").update({
                "status": "error",
                "image_base64": "Génération bloquée - timeout serveur"
            }).eq("id", req["id"]).execute()
    except Exception as e:
        print(f"⚠️ Erreur cleanup: {e}")

# ================= IMAGE UTILS =================

def image_to_base64(img: Image.Image) -> str:
    """Convertit une image PIL en base64 PNG"""
    buffer = io.BytesIO()
    img.save(buffer, format="PNG", optimize=True)
    return base64.b64encode(buffer.getvalue()).decode("utf-8")

# ================= TRAITEMENT =================

def process_request(req: dict, supabase: Client):
    """Traite une requête de génération d'image"""
    req_id = req["id"]
    prompt = req["prompt"]
    negative = req.get("negative", "")

    print(f"\n{'='*50}")
    print(f"➡️ Traitement: {req_id[:8]}")
    print(f"📝 Prompt: {prompt[:80]}...")

    # Vérifier si déjà annulé
    if check_cancel(req_id, supabase):
        print("⛔ Requête déjà annulée")
        return

    # Marquer comme en cours
    update_status(req_id, "generating", supabase, progress=0)

    try:
        # Charger et configurer le workflow
        workflow = load_workflow()
        workflow = update_workflow(workflow, prompt, negative)

        # Envoyer à ComfyUI
        result = queue_prompt(workflow)
        prompt_id = result.get("prompt_id")

        if not prompt_id:
            raise Exception("Pas de prompt_id retourné par ComfyUI")

        print(f"📤 Envoyé à ComfyUI: {prompt_id}")

        # Callback de progression
        def update_progress(p):
            update_progress_db(req_id, p, supabase)
            print(f"📊 Progression: {p}%")

        # Récupérer l'image
        image = get_image_ws(prompt_id, req_id, update_progress, supabase)

        if image is None:
            # Vérifier si c'est une annulation
            if check_cancel(req_id, supabase):
                print("⛔ Génération annulée")
                return
            raise Exception("Aucune image reçue de ComfyUI")

        # Convertir et sauvegarder
        img_b64 = image_to_base64(image)

        update_status(req_id, "done", supabase, progress=100, image_base64=img_b64)
        print(f"✅ Image générée avec succès ({len(img_b64)} caractères)")

    except Exception as e:
        error_msg = str(e)
        print(f"❌ Erreur: {error_msg}")
        update_status(req_id, "error", supabase, image_base64=error_msg)

# ================= MAIN LOOP =================

def main():
    print("\n🚀 Démarrage du serveur...")
    
    # Vérifier ComfyUI au démarrage
    if not check_comfyui_status():
        print(f"⚠️ ComfyUI non accessible sur {COMFYUI_ADDRESS}")
        print("   En attente de connexion...")

    cleanup_counter = 0
    
    while True:
        try:
            # Créer un nouveau client pour chaque itération (thread-safe)
            supabase = get_supabase_client()
            
            # Nettoyage périodique (toutes les 30 itérations = ~1 minute)
            cleanup_counter += 1
            if cleanup_counter >= 30:
                cleanup_stale_requests(supabase)
                cleanup_counter = 0

            # Récupérer les requêtes en attente
            pending = get_pending_requests(supabase)

            if pending:
                print(f"\n📋 File d'attente: {len(pending)} requête(s)")
                
                # Vérifier ComfyUI avant de traiter
                if not check_comfyui_status():
                    print("⚠️ ComfyUI non disponible, attente...")
                    time.sleep(5)
                    continue

                # Traiter la première requête
                process_request(pending[0], supabase)

            time.sleep(POLL_INTERVAL)

        except KeyboardInterrupt:
            print("\n\n👋 Arrêt du serveur demandé")
            break
        except Exception as e:
            print(f"\n❌ Erreur système: {e}")
            time.sleep(5)

    print("🛑 Serveur arrêté")

if __name__ == "__main__":
    main()
