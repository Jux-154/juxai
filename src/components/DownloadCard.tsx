export const DownloadCard = () => {
  return (
    <div className="max-w-[350px] w-full p-5 rounded-[20px] mt-5" style={{
      background: 'linear-gradient(to top right, rgb(7 16 45), rgb(58 60 84))',
      border: '1px solid rgb(84 90 106)'
    }}>
      <span className="text-sm font-semibold" style={{ color: '#488aec' }}>Nouveau modèle disponible !</span>
      <h3 className="text-white text-[26px] font-semibold leading-[26px] my-2">
        Qwen3-VL-30B : Modèle multimodal avancé.
      </h3>
      <p className="text-[13px] font-semibold mb-3" style={{ color: 'rgb(151 153 167)' }}>
        Découvrez le modèle Qwen3-VL-30B pour la génération de contenu et textuel par IA. Il analyse aussi les images.
      </p>
      <div className="flex items-center justify-center gap-2.5 mt-2.5">
        <button
          onClick={() => window.open("https://qwen.ai/blog?id=99f0335c4ad9ff6153e517418d48535ab6d8afef&from=research.latest-advancements-list", "_blank")}
          className="flex items-center justify-between rounded-[10px] px-3 py-1.5 cursor-pointer hover:opacity-80 transition-opacity"
          style={{
            backgroundColor: '#488aec',
            boxShadow: '0 4px 6px -1px #488aec31, 0 2px 4px -1px #488aec17'
          }}
        >
          <span className="text-white font-bold">En savoir plus</span>
        </button>
      </div>
    </div>
  );
};
