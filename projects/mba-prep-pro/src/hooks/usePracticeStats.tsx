import { useEffect, useState } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';

interface PracticeStats {
  totalSessions: number;
  completedSessions: number;
  inProgressSessions: number;
  overallScore: number | null;
  avgSubstance: number | null;
  avgStructure: number | null;
  avgPresence: number | null;
  // Keep legacy fields for backward compat
  categoryScores: {
    behavioral: number | null;
    technical: number | null;
    caseStudy: number | null;
  };
}

export const usePracticeStats = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<PracticeStats>({
    totalSessions: 0,
    completedSessions: 0,
    inProgressSessions: 0,
    overallScore: null,
    avgSubstance: null,
    avgStructure: null,
    avgPresence: null,
    categoryScores: {
      behavioral: null,
      technical: null,
      caseStudy: null,
    },
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const { data: sessions, error: sessionsError } = await supabase
          .from('interview_sessions')
          .select('*')
          .eq('user_id', user.id);

        if (sessionsError) throw sessionsError;

        const totalSessions = sessions?.length || 0;
        const completedSessions = sessions?.filter(s => s.status === 'completed').length || 0;
        const inProgressSessions = sessions?.filter(s => s.status === 'in-progress' || s.status === 'evaluating').length || 0;

        // Calculate scores from completed sessions (0-15 scale → percentage)
        const scored = sessions?.filter(s => s.status === 'completed' && s.overall_score != null) || [];
        
        const overallScore = scored.length > 0
          ? scored.reduce((sum, s) => sum + (s.overall_score || 0), 0) / scored.length
          : null;

        const avgSubstance = scored.length > 0
          ? (scored.reduce((sum, s) => sum + (s.substance_score || 0), 0) / scored.length / 5) * 100
          : null;

        const avgStructure = scored.length > 0
          ? (scored.reduce((sum, s) => sum + (s.structure_score || 0), 0) / scored.length / 5) * 100
          : null;

        const avgPresence = scored.length > 0
          ? (scored.reduce((sum, s) => sum + (s.presence_score || 0), 0) / scored.length / 5) * 100
          : null;

        setStats({
          totalSessions,
          completedSessions,
          inProgressSessions,
          overallScore,
          avgSubstance,
          avgStructure,
          avgPresence,
          categoryScores: {
            behavioral: avgSubstance,
            technical: avgStructure,
            caseStudy: avgPresence,
          },
        });
      } catch (error) {
        console.error('Error fetching practice stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user]);

  return { stats, loading };
};
