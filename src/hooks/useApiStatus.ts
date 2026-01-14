import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useApiStatus = () => {
  const [status, setStatus] = useState<"online" | "offline">("online");
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    const checkApiStatus = async () => {
      setIsChecking(true);
      try {
        // Vérifier le heartbeat du serveur dans Supabase
        const { data, error } = await supabase
          .from("server_status")
          .select("last_heartbeat")
          .eq("id", "jux-ai-server")
          .maybeSingle();

        if (error || !data) {
          setStatus("offline");
          return;
        }

        // Vérifier si le heartbeat est récent (moins de 15 secondes)
        const lastHeartbeat = data.last_heartbeat;
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
