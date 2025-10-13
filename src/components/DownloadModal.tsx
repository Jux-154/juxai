import { X, Smartphone } from "lucide-react";

interface DownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DownloadModal = ({ isOpen, onClose }: DownloadModalProps) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[1000] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-gradient-to-br from-[#1e1e2f] via-[#252545] to-[#1e1e2f] m-auto p-8 rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] w-full max-w-[500px] text-[#eee] relative border border-[#488aec]/20"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#ccc] text-2xl font-bold cursor-pointer hover:text-white transition-all duration-200 hover:scale-110"
        >
          <X className="h-6 w-6" />
        </button>

        <div className="text-center">
          <div className="mb-6 flex justify-center">
            <div className="w-20 h-20 bg-gradient-to-br from-[#488aec] to-[#3a7bd5] rounded-2xl flex items-center justify-center shadow-lg">
              <Smartphone className="h-10 w-10 text-white" />
            </div>
          </div>

          <h2 className="text-2xl font-bold mb-3 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
            Découvrez tous les services Jux
          </h2>

          <div className="w-16 h-1 bg-gradient-to-r from-[#488aec] to-[#3a7bd5] rounded-full mx-auto mb-6"></div>

          <p className="text-gray-300 mb-8 max-w-sm mx-auto leading-relaxed">
            Téléchargez notre application mobile pour découvrir tous les autres services de Jux.
            <span className="block mt-2 font-semibold text-[#488aec]">Disponible uniquement sur Android.</span>
          </p>

          <button
            onClick={() => window.open("https://jux-androidversion.netlify.app", "_blank")}
            className="group relative bg-gradient-to-r from-[#488aec] to-[#3a7bd5] hover:from-[#3a7bd5] hover:to-[#2c5aa0] text-white font-bold py-4 px-8 rounded-xl transition-all duration-300 shadow-lg hover:shadow-2xl hover:shadow-[#488aec]/25 transform hover:scale-105 active:scale-95"
          >
            <span className="flex items-center gap-2">
              Télécharger l'application
              <Smartphone className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </span>
            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#488aec] to-[#3a7bd5] opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
          </button>

          <p className="text-xs text-gray-400 mt-4">
            App gratuite • Téléchargement rapide • Interface intuitive
          </p>
        </div>
      </div>
    </div>
  );
};
