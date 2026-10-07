import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface School {
  id: number;
  name: string;
  type: string;
  location: string;
  program: string;
  ranking: number;
  acceptance_rate: string;
  avg_gmat: number;
  description: string;
  specialties: string[];
  required_documents: string[];
  interview_style: string | null;
}

export const useSchools = () => {
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSchools = async () => {
      try {
        const { data, error } = await supabase
          .from('schools')
          .select('*')
          .order('ranking', { ascending: true });

        if (error) throw error;

        setSchools(data || []);
        setError(null);
      } catch (err) {
        console.error('Error fetching schools:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch schools');
      } finally {
        setLoading(false);
      }
    };

    fetchSchools();
  }, []);

  return {
    schools,
    loading,
    error,
  };
};
