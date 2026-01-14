import { useState, useEffect } from "react";

export const useApiStatus = () => {
  const [status, setStatus] = useState<"online" | "offline">("online");
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    const checkApiStatus = async () => {
      setIsChecking(true);
      try {
        // Vérifier si le serveur Python de statut est accessible sur le port 5000
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000); // 3 secondes de timeout

        const response = await fetch("http://127.0.0.1:5000/status", {
          method: "GET",
          signal: controller.signal,
        });

        clearTimeout(timeout);

        // Si on reçoit une réponse 200, l'API est en ligne
        if (response.ok) {
          setStatus("online");
        } else {
          setStatus("offline");
        }
      } catch (error: any) {
        // Si la requête échoue (erreur réseau, timeout, CORS, etc.), l'API est hors ligne
        setStatus("offline");
      } finally {
        setIsChecking(false);
      }
    };

    // Vérification initiale
    checkApiStatus();

    // Vérification toutes les 3 secondes pour un retour plus rapide
    const interval = setInterval(checkApiStatus, 3000);

    return () => clearInterval(interval);
  }, []);

  return { status, isChecking };
};
