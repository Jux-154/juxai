import { CheckCircle2, AlertCircle, Send } from "lucide-react";
import { useApiStatus } from "@/hooks/useApiStatus";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/1462940773530992794/X8cx7-kRXWL6Q4iMRqoGWlyZ-OzVX2P7tWbIlThZe9GV7Qg2llzyI-RLeeRTeppdlD0Q";

export const ApiStatus = () => {
  const { status } = useApiStatus();
  const [isVisible, setIsVisible] = useState(true);
  const [displayStatus, setDisplayStatus] = useState<"online" | "offline">(status);
  const [key, setKey] = useState(0);
  const [isRequesting, setIsRequesting] = useState(false);
  const [hasRequested, setHasRequested] = useState(false);

  useEffect(() => {
    // Quand le statut change, show le badge avec animation
    if (status !== displayStatus) {
      setDisplayStatus(status);
      setIsVisible(true);
      setKey(prev => prev + 1); // Force une nouvelle animation
      
      // Reset hasRequested quand l'API revient en ligne
      if (status === "online") {
        setHasRequested(false);
      }
    }
  }, [status, displayStatus]);

  useEffect(() => {
    // Ne pas auto-hide si offline
    if (!isVisible || displayStatus === "offline") return;

    // Après 5 secondes, commence le fade out (seulement si online)
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 5000);

    return () => clearTimeout(timer);
  }, [isVisible, key, displayStatus]);

  const handleRequestReactivation = async () => {
    if (isRequesting || hasRequested) return;
    
    setIsRequesting(true);
    
    try {
      const response = await fetch(DISCORD_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: "🔴 **Demande de réactivation de l'API**\n\nUn utilisateur a demandé la remise en ligne de l'API Jux-AI.\n\n📅 Date: " + new Date().toLocaleString('fr-FR', { timeZone: 'America/Guadeloupe' }) + "\n🌐 Source: Application Web",
          username: "Jux-AI Alert",
          avatar_url: "https://cdn-icons-png.flaticon.com/512/4712/4712109.png"
        }),
      });

      if (response.ok) {
        setHasRequested(true);
        toast.success("Demande envoyée !", {
          description: "L'administrateur a été notifié. L'API sera remise en ligne prochainement.",
        });
      } else {
        throw new Error("Erreur lors de l'envoi");
      }
    } catch (error) {
      toast.error("Erreur", {
        description: "Impossible d'envoyer la demande. Réessayez plus tard.",
      });
    } finally {
      setIsRequesting(false);
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.ul
          key={key}
          className="fixed top-5 right-5 z-[1000] max-w-[350px] list-none md:top-5 md:right-5 md:max-w-[350px] mobile:top-2.5 mobile:right-2.5 mobile:max-w-[280px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <li
            className={`relative flex flex-col gap-3 overflow-hidden p-3 px-4 rounded-md shadow-[rgba(111,111,111,0.2)_0px_8px_24px] transition-all duration-250 mobile:p-2.5 mobile:px-3 ${
              displayStatus === "online"
                ? "bg-[#7dffbc] text-[#047857]"
                : "bg-[#ff7e7e] text-[#7f1d1d]"
            }`}
            style={{
              backgroundImage: `linear-gradient(0deg, transparent 23%, ${
                displayStatus === "online"
                  ? "rgba(16, 185, 129, 0.25)"
                  : "rgba(239, 68, 68, 0.25)"
              } 24%, ${
                displayStatus === "online"
                  ? "rgba(16, 185, 129, 0.25)"
                  : "rgba(239, 68, 68, 0.25)"
              } 25%, transparent 26%, transparent 73%, ${
                displayStatus === "online"
                  ? "rgba(16, 185, 129, 0.25)"
                  : "rgba(239, 68, 68, 0.25)"
              } 74%, ${
                displayStatus === "online"
                  ? "rgba(16, 185, 129, 0.25)"
                  : "rgba(239, 68, 68, 0.25)"
              } 75%, transparent 76%, transparent), linear-gradient(90deg, transparent 23%, ${
                displayStatus === "online"
                  ? "rgba(16, 185, 129, 0.25)"
                  : "rgba(239, 68, 68, 0.25)"
              } 24%, ${
                displayStatus === "online"
                  ? "rgba(16, 185, 129, 0.25)"
                  : "rgba(239, 68, 68, 0.25)"
              } 25%, transparent 26%, transparent 73%, ${
                displayStatus === "online"
                  ? "rgba(16, 185, 129, 0.25)"
                  : "rgba(239, 68, 68, 0.25)"
              } 74%, ${
                displayStatus === "online"
                  ? "rgba(16, 185, 129, 0.25)"
                  : "rgba(239, 68, 68, 0.25)"
              } 75%, transparent 76%, transparent)`,
              backgroundSize: "55px 55px",
            }}
          >
            <div className="flex justify-start items-center gap-2">
              <div className="w-4 h-4">
                {displayStatus === "online" ? (
                  <CheckCircle2 className="w-full h-full" />
                ) : (
                  <AlertCircle className="w-full h-full" />
                )}
              </div>
              <div className="text-xs select-none mobile:text-[0.7em] font-medium">
                {displayStatus === "online" ? "En ligne" : "API Indisponible"}
              </div>
            </div>
            
            {displayStatus === "offline" && (
              <Button
                size="sm"
                variant="secondary"
                className="w-full bg-white/90 hover:bg-white text-[#7f1d1d] text-xs gap-2"
                onClick={handleRequestReactivation}
                disabled={isRequesting || hasRequested}
              >
                {isRequesting ? (
                  <>
                    <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Envoi...
                  </>
                ) : hasRequested ? (
                  <>
                    <CheckCircle2 className="w-3 h-3" />
                    Demande envoyée
                  </>
                ) : (
                  <>
                    <Send className="w-3 h-3" />
                    Demander la réactivation
                  </>
                )}
              </Button>
            )}
          </li>
        </motion.ul>
      )}
    </AnimatePresence>
  );
};
