import { Layers, Globe, Image, Sparkles, Zap } from "lucide-react";

export const VersionCard = () => {
  return (
    <div className="w-[190px] h-[120px] transition-all duration-500 text-center overflow-hidden mt-5 rounded-[20px] hover:h-[180px] group cursor-pointer" style={{
      background: 'rgba(255, 255, 255, 0.1)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      boxShadow: '15px 15px 30px rgba(25, 25, 25, 0.11), -15px -15px 30px rgba(60, 60, 60, 0.082)'
    }}>
      <div className="p-5 flex flex-col items-center justify-center mb-4" style={{ background: '#212121' }}>
        <div className="w-[50px]">
          <Layers className="w-full h-full" style={{ color: 'rgba(66,193,110,1)' }} />
        </div>
        <span className="text-sm tracking-wider font-black uppercase py-1 px-0 pb-3.5 transition-all duration-500 group-hover:p-0 group-hover:text-primary" style={{ color: '#edededc5' }}>
          Version v1.1
        </span>
      </div>
      <div className="block text-left mx-4.5">
        <div className="flex items-center gap-2 transition-all duration-300 group-hover:translate-x-1">
          <Globe className="w-4 h-4 text-blue-400" />
          <p className="transition-all duration-500 text-xs font-semibold" style={{ color: '#e0e0e0' }}>
            Recherche web
          </p>
        </div>
      </div>
    </div>
  );
};
