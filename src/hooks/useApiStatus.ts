import { useState, useEffect } from "react";

const SUPABASE_URL = "https://vgfixrbwptoefiyofixe.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZnZml4cmJ3cHRvZWZpeW9maXhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0MzU2OTcsImV4cCI6MjA4MTAxMTY5N30.xtWg0A5B7X_YuAQnZ6q3Y_aWGtMR3WQnZ_AAe4RzOg4";

interface ServerStatus {
  id: string;
  last_heartbeat: number;
  status: string;
}

export const useApiStatus = () => {
  const [status, setStatus] = useState<"online" | "offline">("online");
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    const checkApiStatus = async () => {
      setIsChecking(true);
      try {
        // Appel REST direct pour éviter les problèmes de types
        const response = await fetch(
          `${SUPABASE_URL}/rest/v1/server_status?id=eq.jux-ai-server&select=last_heartbeat`,
          {
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${SUPABASE_KEY}`,
            }
          }
        );

        if (!response.ok) {
          setStatus("offline");
          return;
        }

        const data: ServerStatus[] = await response.json();

        if (!data || data.length === 0) {
          setStatus("offline");
          return;
        }

        // Vérifier si le heartbeat est récent (moins de 15 secondes)
        const lastHeartbeat = data[0].last_heartbeat;
        const currentTime = Date.now() / 1000; // en secondes
        const timeSinceHeartbeat = currentTime - lastHeartbeat;

        if (timeSinceHeartbeat < 15) {
          setStatus("online");
        } else {
          setStatus("offline");
        }
      } catch (error: any) {
        // Si la requête échoue, l'API est hors ligne
        setStatus("offline");
      } finally {
        setIsChecking(false);
      }
    };

    // Vérification initiale
    checkApiStatus();

    // Vérification toutes les 2 secondes pour un retour rapide
    const interval = setInterval(checkApiStatus, 2000);

    return () => clearInterval(interval);
  }, []);

  return { status, isChecking };
};
