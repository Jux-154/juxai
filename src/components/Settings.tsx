import { useState, useEffect } from "react";
import { Settings as SettingsIcon } from "lucide-react";
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
}

export const Settings = () => {
  const { toast } = useToast();
  const [settings, setSettings] = useState<UserSettings>({
    pseudo: "",
    feedMode: "tiktok",
  });
  const [userId, setUserId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      setUserId(session.user.id);

      const { data } = await supabase
        .from("user_settings")
        .select("pseudo, feed_mode")
        .eq("user_id", session.user.id)
        .single();

      if (data) {
        setSettings({
          pseudo: data.pseudo || "",
          feedMode: (data.feed_mode as "tiktok" | "pinterest") || "tiktok",
        });
      }
    };

    loadSettings();
  }, []);

  const saveSettings = async () => {
    if (!userId) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("user_settings")
        .upsert({
          user_id: userId,
          pseudo: settings.pseudo || null,
          feed_mode: settings.feedMode,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      toast({ title: "Paramètres sauvegardés" });
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible de sauvegarder", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog>
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
            <Input
              id="pseudo"
              value={settings.pseudo}
              onChange={(e) => setSettings({ ...settings, pseudo: e.target.value })}
              placeholder="Votre pseudo..."
              maxLength={30}
            />
            <p className="text-xs text-muted-foreground">
              Ce pseudo sera affiché sur vos publications
            </p>
          </div>

          {/* Feed Mode */}
          <div className="space-y-2">
            <Label className="text-sm">Mode d'affichage du feed</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
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
            disabled={isSaving}
            className="w-full"
          >
            {isSaving ? "Sauvegarde..." : "Sauvegarder"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
