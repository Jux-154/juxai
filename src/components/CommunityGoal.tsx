import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { Target, Sparkles, MessageSquare } from 'lucide-react';

const GOAL = 10000;

export const CommunityGoal = () => {
  const [messageCount, setMessageCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const fetchMessageCount = async () => {
    const { count, error } = await supabase
      .from('requests')
      .select('*', { count: 'exact', head: true });
    
    if (!error && count !== null) {
      setMessageCount(count);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMessageCount();

    // Écouter les nouveaux messages en temps réel
    const channel = supabase
      .channel('community-goal')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'requests'
        },
        () => {
          setMessageCount(prev => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const progress = Math.min((messageCount / GOAL) * 100, 100);
  const isGoalReached = messageCount >= GOAL;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="max-w-[350px] w-full p-5 rounded-[20px] mt-5"
      style={{
        background: 'linear-gradient(to top right, rgb(7 16 45), rgb(58 60 84))',
        border: '1px solid rgb(84 90 106)'
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <Target className="w-4 h-4 text-primary" />
        <span className="text-sm font-semibold text-primary">Défi Communautaire</span>
      </div>

      {isGoalReached ? (
        <>
          <div className="flex items-center gap-2 my-2">
            <Sparkles className="w-6 h-6 text-yellow-400" />
            <h3 className="text-white text-[22px] font-semibold leading-[26px]">
              Objectif atteint ! 🎉
            </h3>
          </div>
          <p className="text-[13px] font-semibold mb-3" style={{ color: 'rgb(151 153 167)' }}>
            La génération d'images sera disponible dans la prochaine grande mise à jour !
          </p>
        </>
      ) : (
        <>
          <h3 className="text-white text-[20px] font-semibold leading-[24px] my-2">
            Débloquez la génération d'images
          </h3>
          <p className="text-[13px] font-semibold mb-3" style={{ color: 'rgb(151 153 167)' }}>
            Envoyez des messages pour débloquer cette fonctionnalité pour toute la communauté !
          </p>
        </>
      )}

      {/* Compteur */}
      <div className="flex items-center justify-center gap-2 my-3">
        <MessageSquare className="w-5 h-5 text-primary" />
        <div className="text-center">
          {loading ? (
            <span className="text-white/50 text-lg">Chargement...</span>
          ) : (
            <motion.span 
              key={messageCount}
              initial={{ scale: 1.2 }}
              animate={{ scale: 1 }}
              className="text-white text-2xl font-bold"
            >
              {messageCount.toLocaleString('fr-FR')}
            </motion.span>
          )}
          <span className="text-white/60 text-lg mx-1">/</span>
          <span className="text-white/80 text-lg font-semibold">{GOAL.toLocaleString('fr-FR')}</span>
        </div>
      </div>

      {/* Barre de progression */}
      <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden mt-2">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className="h-full rounded-full"
          style={{
            background: isGoalReached 
              ? 'linear-gradient(90deg, #10b981, #34d399)' 
              : 'linear-gradient(90deg, #488aec, #7c3aed)'
          }}
        />
      </div>

      <p className="text-center text-xs text-white/50 mt-2">
        {Math.round(progress)}% de l'objectif
      </p>
    </motion.div>
  );
};
