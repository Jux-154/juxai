import { AlertCircle, Send, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useState } from "react";

const DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/1462940773530992794/X8cx7-kRXWL6Q4iMRqoGWlyZ-OzVX2P7tWbIlThZe9GV7Qg2llzyI-RLeeRTeppdlD0Q";

export const ApiOfflineAlert = () => {
  const [isRequesting, setIsRequesting] = useState(false);
  const [hasRequested, setHasRequested] = useState(false);

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
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-4 glass-card rounded-xl p-3 sm:p-4 bg-destructive/10 border border-destructive/20"
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-semibold text-destructive text-sm">API indisponible</h3>
          <p className="text-destructive/80 text-xs mt-1">
            L'API est actuellement hors ligne. Vous ne pouvez pas générer d'images pour le moment.
          </p>
        </div>
      </div>
      
      <Button
        size="sm"
        variant="outline"
        className="w-full mt-3 bg-destructive/10 hover:bg-destructive/20 border-destructive/30 text-destructive text-xs gap-2"
        onClick={handleRequestReactivation}
        disabled={isRequesting || hasRequested}
      >
        {isRequesting ? (
          <>
            <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
            Envoi en cours...
          </>
        ) : hasRequested ? (
          <>
            <CheckCircle2 className="w-3 h-3" />
            Demande envoyée à l'admin
          </>
        ) : (
          <>
            <Send className="w-3 h-3" />
            Demander la réactivation
          </>
        )}
      </Button>
    </motion.div>
  );
};
