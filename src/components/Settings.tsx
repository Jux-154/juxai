import { useState, useEffect } from "react";
import { Settings as SettingsIcon, Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface UserSettings {
  pseudo: string;
  feedMode: "tiktok" | "pinterest";
  avatarUrl: string | null;
  pseudoChangedAt: string | null;
}

export const Settings = () => {
  const { toast } = useToast();
  const [settings, setSettings] = useState<UserSettings>({
    pseudo: "",
    feedMode: "tiktok",
    avatarUrl: null,
    pseudoChangedAt: null,
  });
  const [originalPseudo, setOriginalPseudo] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isCheckingPseudo, setIsCheckingPseudo] = useState(false);
  const [pseudoStatus, setPseudoStatus] = useState<"available" | "taken" | "unchanged" | null>(null);
  const [canChangePseudo, setCanChangePseudo] = useState(true);
  const [daysUntilChange, setDaysUntilChange] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      setUserId(session.user.id);

      const { data } = await supabase
        .from("user_settings")
        .select("pseudo, feed_mode, avatar_url, pseudo_changed_at")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (data) {
        setSettings({
          pseudo: data.pseudo || "",
          feedMode: (data.feed_mode as "tiktok" | "pinterest") || "tiktok",
          avatarUrl: data.avatar_url || null,
          pseudoChangedAt: data.pseudo_changed_at || null,
        });
        setOriginalPseudo(data.pseudo || "");

        // Check if can change pseudo
        if (data.pseudo_changed_at) {
          const changedAt = new Date(data.pseudo_changed_at);
          const now = new Date();
          const diffDays = Math.floor((now.getTime() - changedAt.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays < 7) {
            setCanChangePseudo(false);
            setDaysUntilChange(7 - diffDays);
          }
        }
      }
    };

    if (isOpen) {
      loadSettings();
    }
  }, [isOpen]);

  // Check pseudo availability with debounce
  useEffect(() => {
    if (!userId || !settings.pseudo.trim()) {
      setPseudoStatus(null);
      return;
    }

    if (settings.pseudo.trim().toLowerCase() === originalPseudo.toLowerCase()) {
      setPseudoStatus("unchanged");
      return;
    }

    const timer = setTimeout(async () => {
      setIsCheckingPseudo(true);
      try {
        const { data, error } = await supabase.rpc("check_pseudo_available", {
          check_pseudo: settings.pseudo.trim(),
          current_user_id: userId,
        });

        if (error) throw error;
        setPseudoStatus(data ? "available" : "taken");
      } catch (error) {
        console.error("Error checking pseudo:", error);
      } finally {
        setIsCheckingPseudo(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [settings.pseudo, userId, originalPseudo]);

  const saveSettings = async () => {
    if (!userId) return;

    // Validate pseudo if changed
    const pseudoChanged = settings.pseudo.trim().toLowerCase() !== originalPseudo.toLowerCase();
    if (pseudoChanged) {
      if (!canChangePseudo) {
        toast({ 
          title: "Impossible de changer le pseudo", 
          description: `Vous devez attendre ${daysUntilChange} jour(s)`, 
          variant: "destructive" 
        });
        return;
      }
      if (pseudoStatus === "taken") {
        toast({ title: "Ce pseudo est déjà utilisé", variant: "destructive" });
        return;
      }
    }

    setIsSaving(true);
    try {
      // Check if record exists
      const { data: existing } = await supabase
        .from("user_settings")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      const pseudoValue = settings.pseudo.trim() || null;
      const feedModeValue = settings.feedMode;
      const now = new Date().toISOString();

      if (existing) {
        // Update existing record
        const updateData: { pseudo?: string | null; feed_mode: string; updated_at: string; pseudo_changed_at?: string } = {
          feed_mode: feedModeValue,
          updated_at: now,
        };
        if (pseudoChanged) {
          updateData.pseudo = pseudoValue;
          updateData.pseudo_changed_at = now;
        } else {
          updateData.pseudo = pseudoValue;
        }

        const { error } = await supabase
          .from("user_settings")
          .update(updateData)
          .eq("user_id", userId);

        if (error) throw error;
      } else {
        // Insert new record
        const { error } = await supabase
          .from("user_settings")
          .insert({
            user_id: userId,
            pseudo: pseudoValue,
            feed_mode: feedModeValue,
            pseudo_changed_at: pseudoValue ? now : null,
          });

        if (error) throw error;
      }

      setOriginalPseudo(settings.pseudo.trim());
      if (pseudoChanged) {
        setCanChangePseudo(false);
        setDaysUntilChange(7);
      }
      setPseudoStatus(null);

      toast({ title: "Paramètres sauvegardés" });
      setIsOpen(false);
    } catch (error) {
      console.error("Error saving settings:", error);
      toast({ title: "Erreur", description: "Impossible de sauvegarder", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const isSaveDisabled = isSaving || isCheckingPseudo || pseudoStatus === "taken";

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="shrink-0 transition-all h-9 w-9 sm:h-11 sm:w-11 md:h-12 md:w-12 bg-card border-border hover:bg-accent hover:border-primary"
          title="Paramètres"
        >
          <SettingsIcon className="h-4 w-4 sm:h-5 sm:w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Paramètres</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          {/* Pseudo */}
          <div className="space-y-2">
            <Label htmlFor="pseudo" className="text-sm">
              Pseudo (pour le mode Créations)
            </Label>
            <div className="relative">
              <Input
                id="pseudo"
                value={settings.pseudo}
                onChange={(e) => setSettings({ ...settings, pseudo: e.target.value })}
                placeholder="Votre pseudo..."
                maxLength={30}
                disabled={!canChangePseudo && originalPseudo !== ""}
                className="pr-10"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {isCheckingPseudo && (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                )}
                {!isCheckingPseudo && pseudoStatus === "available" && (
                  <Check className="h-4 w-4 text-green-500" />
                )}
                {!isCheckingPseudo && pseudoStatus === "taken" && (
                  <X className="h-4 w-4 text-destructive" />
                )}
              </div>
            </div>
            {pseudoStatus === "taken" && (
              <p className="text-xs text-destructive">Ce pseudo est déjà utilisé</p>
            )}
            {pseudoStatus === "available" && (
              <p className="text-xs text-green-500">Ce pseudo est disponible</p>
            )}
            {!canChangePseudo && originalPseudo && (
              <p className="text-xs text-muted-foreground">
                Vous pourrez changer votre pseudo dans {daysUntilChange} jour(s)
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Ce pseudo sera affiché sur vos publications
            </p>
          </div>

          {/* Feed Mode */}
          <div className="space-y-2">
            <Label className="text-sm">Mode d'affichage du feed</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSettings({ ...settings, feedMode: "tiktok" })}
                className={`p-4 rounded-xl border-2 transition-all text-center ${
                  settings.feedMode === "tiktok"
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <div className="text-2xl mb-2">📱</div>
                <p className="text-sm font-medium">TikTok</p>
                <p className="text-xs text-muted-foreground">Scroll vertical plein écran</p>
              </button>
              <button
                type="button"
                onClick={() => setSettings({ ...settings, feedMode: "pinterest" })}
                className={`p-4 rounded-xl border-2 transition-all text-center ${
                  settings.feedMode === "pinterest"
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <div className="text-2xl mb-2">🎨</div>
                <p className="text-sm font-medium">Pinterest</p>
                <p className="text-xs text-muted-foreground">Grille masonry</p>
              </button>
            </div>
          </div>

          {/* Save Button */}
          <Button
            onClick={saveSettings}
            disabled={isSaveDisabled}
            className="w-full"
          >
            {isSaving ? "Sauvegarde..." : "Sauvegarder"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
