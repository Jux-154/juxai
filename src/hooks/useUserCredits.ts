import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface UserCredits {
  credits: number;
  lastResetDate: string;
}

export const useUserCredits = (userId: string | undefined) => {
  const [credits, setCredits] = useState<UserCredits | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCredits = useCallback(async () => {
    if (!userId) return;

    try {
      // Essayer de récupérer les crédits existants
      const { data, error } = await supabase
        .from("user_credits")
        .select("credits, last_reset_date")
        .eq("user_id", userId)
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;

      if (data) {
        // Vérifier si on doit reset (minuit UTC-4)
        const today = new Date().toISOString().split("T")[0];
        if (data.last_reset_date < today) {
          // Reset les crédits
          const { data: updated, error: updateError } = await supabase
            .from("user_credits")
            .update({ credits: 5, last_reset_date: today })
            .eq("user_id", userId)
            .select("credits, last_reset_date")
            .single();

          if (updateError) throw updateError;
          setCredits({ credits: updated.credits, lastResetDate: updated.last_reset_date });
        } else {
          setCredits({ credits: data.credits, lastResetDate: data.last_reset_date });
        }
      } else {
        // Créer l'entrée si elle n'existe pas
        const { data: newData, error: insertError } = await supabase
          .from("user_credits")
          .insert({ user_id: userId, credits: 5 })
          .select("credits, last_reset_date")
          .single();

        if (insertError) throw insertError;
        setCredits({ credits: newData.credits, lastResetDate: newData.last_reset_date });
      }
    } catch (error) {
      console.error("Error fetching credits:", error);
      setCredits({ credits: 5, lastResetDate: new Date().toISOString().split("T")[0] });
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchCredits();
  }, [fetchCredits]);

  const useCredit = async (): Promise<boolean> => {
    if (!userId || !credits) return false;
    
    if (credits.credits <= 0) return false;

    try {
      const newCredits = credits.credits - 1;
      const { error } = await supabase
        .from("user_credits")
        .update({ credits: newCredits })
        .eq("user_id", userId);

      if (error) throw error;
      
      setCredits(prev => prev ? { ...prev, credits: newCredits } : null);
      return true;
    } catch (error) {
      console.error("Error using credit:", error);
      return false;
    }
  };

  return {
    credits: credits?.credits ?? 0,
    lastResetDate: credits?.lastResetDate,
    isLoading,
    useCredit,
    refreshCredits: fetchCredits,
  };
};
