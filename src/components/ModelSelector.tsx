import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Cpu, ChevronDown, Sparkles, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModelSelectorProps {
  isGuest: boolean;
  selectedModel: string;
  onModelChange: (model: string) => void;
}

const MODELS = {
  "liquid/lfm2-1.2b": {
    name: "LFM2 Basic",
    description: "Modèle léger et rapide",
    icon: Zap,
    supportsImages: false,
  },
  "google/gemma-3-4b": {
    name: "Gemma 3 4B",
    description: "Modèle avancé avec vision",
    icon: Sparkles,
    supportsImages: true,
  },
};

export const ModelSelector = ({ isGuest, selectedModel, onModelChange }: ModelSelectorProps) => {
  const currentModel = MODELS[selectedModel as keyof typeof MODELS] || MODELS["liquid/lfm2-1.2b"];
  const Icon = currentModel.icon;

  // En mode invité, ne pas afficher le sélecteur (ou le désactiver)
  if (isGuest) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-lg border border-border/50">
        <Zap className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">LFM2 Basic</span>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 h-8 text-xs bg-card hover:bg-accent"
        >
          <Icon className="h-3.5 w-3.5" />
          {currentModel.name}
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {Object.entries(MODELS).map(([modelId, model]) => {
          const ModelIcon = model.icon;
          return (
            <DropdownMenuItem
              key={modelId}
              onClick={() => onModelChange(modelId)}
              className={cn(
                "flex items-start gap-3 p-3 cursor-pointer",
                selectedModel === modelId && "bg-accent"
              )}
            >
              <ModelIcon className="h-4 w-4 mt-0.5 shrink-0" />
              <div className="flex flex-col gap-0.5">
                <span className="font-medium text-sm">{model.name}</span>
                <span className="text-xs text-muted-foreground">
                  {model.description}
                </span>
                {model.supportsImages && (
                  <span className="text-xs text-primary">✓ Supporte les images</span>
                )}
              </div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export const modelSupportsImages = (modelId: string): boolean => {
  return MODELS[modelId as keyof typeof MODELS]?.supportsImages ?? false;
};
