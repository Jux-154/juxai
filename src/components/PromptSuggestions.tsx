import { motion } from "framer-motion";
import { Lightbulb, Code, PenTool, HelpCircle } from "lucide-react";

interface PromptSuggestionsProps {
  onSelect: (prompt: string) => void;
}

const suggestions = [
  {
    icon: Lightbulb,
    title: "Explique-moi",
    prompt: "Explique-moi le concept de ",
    color: "text-yellow-400",
  },
  {
    icon: Code,
    title: "Aide-moi à coder",
    prompt: "Aide-moi à écrire du code pour ",
    color: "text-primary",
  },
  {
    icon: PenTool,
    title: "Rédige un texte",
    prompt: "Rédige un texte sur ",
    color: "text-secondary",
  },
  {
    icon: HelpCircle,
    title: "Réponds à ma question",
    prompt: "J'ai une question : ",
    color: "text-emerald-400",
  },
];

export const PromptSuggestions = ({ onSelect }: PromptSuggestionsProps) => {
  return (
    <div className="grid grid-cols-2 gap-3 w-full max-w-lg">
      {suggestions.map((suggestion, index) => {
        const Icon = suggestion.icon;
        return (
          <motion.button
            key={suggestion.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 + index * 0.1, duration: 0.4 }}
            onClick={() => onSelect(suggestion.prompt)}
            className="prompt-card text-left group"
          >
            <div className="flex items-start gap-3">
              <div className={`${suggestion.color} transition-transform group-hover:scale-110`}>
                <Icon className="h-5 w-5" />
              </div>
              <span className="text-sm font-medium text-foreground/90">
                {suggestion.title}
              </span>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
};
