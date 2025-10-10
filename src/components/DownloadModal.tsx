import { X } from "lucide-react";

interface DownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DownloadModal = ({ isOpen, onClose }: DownloadModalProps) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[1000] bg-black/50 backdrop-blur-sm flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-[#1e1e2f] m-auto p-8 rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.6)] w-4/5 max-w-[800px] text-[#eee] relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#ccc] text-3xl font-bold cursor-pointer hover:text-white transition-colors"
        >
          <X className="h-7 w-7" />
        </button>
        <iframe
          src="https://jux-androidversion.netlify.app"
          className="w-full h-[600px] border-0 rounded-lg"
          title="Télécharger Jux"
        />
      </div>
    </div>
  );
};
