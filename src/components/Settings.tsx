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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface PersonalizationSettings {
  userName: string;
  userInfo: string;
  responseStyle: string;
  customInstruction: string;
}

export const Settings = () => {
  const [settings, setSettings] = useState<PersonalizationSettings>({
    userName: "",
    userInfo: "",
    responseStyle: "default",
    customInstruction: "",
  });

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
  }, []);

  const updateSetting = (key: keyof PersonalizationSettings, value: string) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    localStorage.setItem("juxPersonalization", JSON.stringify(newSettings));
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
          <DialogTitle>Personnaliser Jux</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
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
            <Select value={settings.responseStyle} onValueChange={(value) => updateSetting("responseStyle", value)}>
              <SelectTrigger className="text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Par défaut - Équilibre pro et convivialité.</SelectItem>
                <SelectItem value="concis">Concis - Court, direct, au but.</SelectItem>
                <SelectItem value="socratique">Socratique - Guides avec des questions d'exploration.</SelectItem>
                <SelectItem value="formel">Formel - Utilise un ton académique ou professionnel.</SelectItem>
              </SelectContent>
            </Select>
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
