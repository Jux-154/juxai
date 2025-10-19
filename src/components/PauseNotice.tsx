import { AlertCircle } from "lucide-react";

export const PauseNotice = () => {
  return (
    <div className="max-w-[350px] w-full p-4 rounded-xl mt-5 border border-amber-500/30 bg-gradient-to-br from-amber-950/40 via-amber-900/20 to-amber-950/40 backdrop-blur-sm">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          <AlertCircle className="h-5 w-5 text-amber-400" />
        </div>
        <div>
          <h3 className="text-amber-100 text-sm font-semibold mb-1">
            Projet en pause
          </h3>
          <p className="text-amber-200/70 text-xs leading-relaxed">
            Le développement de ce projet est actuellement en pause. La communication avec l'IA est impossible jusqu'à nouvel ordre.
          </p>
        </div>
      </div>
    </div>
  );
};
