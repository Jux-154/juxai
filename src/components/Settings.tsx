import { useState, useEffect } from "react";
import { Settings as SettingsIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PersonalizationSettings {
  userName: string;
  userInfo: string;
  responseStyle: string;
  customInstruction: string;
}

interface SettingsProps {
  onPseudoChange?: (pseudo: string | null) => void;
}

export const Settings = ({ onPseudoChange }: SettingsProps) => {
  const { toast } = useToast();
  const [settings, setSettings] = useState<PersonalizationSettings>({
    userName: "",
    userInfo: "",
    responseStyle: "default",
    customInstruction: "",
  });
  const [pseudo, setPseudo] = useState("");
  const [isSavingPseudo, setIsSavingPseudo] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    // Load personalization settings from local storage
    const saved = localStorage.getItem("juxPersonalization");
    if (saved) {
      try {
        const parsedSettings = JSON.parse(saved);
        setSettings(parsedSettings);
      } catch (error) {
        console.error("Error loading personalization settings:", error);
      }
    }
    
    // Load pseudo from Supabase
    loadPseudo();
  }, []);

  const loadPseudo = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUserId(user.id);
      const { data } = await supabase
        .from('profiles')
        .select('pseudo')
        .eq('user_id', user.id)
        .single();
      
      if (data?.pseudo) {
        setPseudo(data.pseudo);
        onPseudoChange?.(data.pseudo);
      }
    }
  };

  const updateSetting = (key: keyof PersonalizationSettings, value: string) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    localStorage.setItem("juxPersonalization", JSON.stringify(newSettings));
  };

  const handleSavePseudo = async () => {
    if (!userId || !pseudo.trim()) return;
    
    setIsSavingPseudo(true);
    try {
      // Check if profile exists
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (existing) {
        // Update
        const { error } = await supabase
          .from('profiles')
          .update({ pseudo: pseudo.trim() })
          .eq('user_id', userId);
        
        if (error) throw error;
      } else {
        // Insert
        const { error } = await supabase
          .from('profiles')
          .insert({ user_id: userId, pseudo: pseudo.trim() });
        
        if (error) throw error;
      }
      
      toast({ title: "Pseudo enregistré !" });
      onPseudoChange?.(pseudo.trim());
    } catch (error: any) {
      console.error('Error saving pseudo:', error);
      toast({ 
        title: "Erreur", 
        description: "Impossible d'enregistrer le pseudo", 
        variant: "destructive" 
      });
    } finally {
      setIsSavingPseudo(false);
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
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Personnaliser Jux</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Pseudo for multi rooms */}
          {userId && (
            <div className="space-y-2 p-3 rounded-lg bg-muted/50 border border-border">
              <Label htmlFor="pseudo" className="text-xs font-semibold">
                Pseudo (pour les salons multi)
              </Label>
              <div className="flex gap-2">
                <Input
                  id="pseudo"
                  value={pseudo}
                  onChange={(e) => setPseudo(e.target.value)}
                  placeholder="Votre pseudo"
                  maxLength={32}
                  className="text-xs flex-1"
                />
                <Button 
                  size="sm" 
                  onClick={handleSavePseudo}
                  disabled={isSavingPseudo || !pseudo.trim()}
                >
                  {isSavingPseudo ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Sauver"
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Requis pour créer ou rejoindre des salons multi
              </p>
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="userName" className="text-xs">
              Comment souhaitez-vous que Jux vous appelle ?
            </Label>
            <Input
              id="userName"
              value={settings.userName}
              onChange={(e) => updateSetting("userName", e.target.value)}
              placeholder="Votre nom ou surnom"
              maxLength={128}
              className="text-xs"
            />
            <div className="text-xs text-muted-foreground text-right">
              {settings.userName.length}/128
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="userInfo" className="text-xs">
              Que souhaitez-vous que Jux sache à votre sujet pour mieux adapter ses réponses à vos besoins ?
            </Label>
            <Textarea
              id="userInfo"
              value={settings.userInfo}
              onChange={(e) => updateSetting("userInfo", e.target.value)}
              placeholder="Par exemple : Je suis développeur, j'aime les technologies, etc."
              maxLength={500}
              rows={3}
              className="text-xs resize-none"
            />
            <div className="text-xs text-muted-foreground text-right">
              {settings.userInfo.length}/500
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="responseStyle" className="text-xs">
              Comment souhaitez-vous que Jux réponde ?
            </Label>
            <select
              id="responseStyle"
              value={settings.responseStyle}
              onChange={(e) => updateSetting("responseStyle", e.target.value)}
              className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <option value="default">Par défaut - Équilibre pro et convivialité.</option>
              <option value="concis">Concis - Court, direct, au but.</option>
              <option value="socratique">Socratique - Guides avec des questions d'exploration.</option>
              <option value="formel">Formel - Utilise un ton académique ou professionnel.</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="customInstruction" className="text-xs">
              Instruction personnalisée : comment Jux devrait-il se comporter ?
            </Label>
            <Textarea
              id="customInstruction"
              value={settings.customInstruction}
              onChange={(e) => updateSetting("customInstruction", e.target.value)}
              placeholder="Instructions spécifiques pour Jux..."
              rows={3}
              className="text-xs resize-none"
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
