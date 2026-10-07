import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

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

interface UserSchool {
  id: string;
  user_id: string;
  school_id: number;
  interviews_limit: number;
  interviews_used: number;
  application_status: string;
  created_at: string;
  school: School;
}

export const useUserSchools = () => {
  const [userSchools, setUserSchools] = useState<UserSchool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchUserSchools = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_schools')
        .select(`
          *,
          school:schools(*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setUserSchools(data || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching user schools:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch schools');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserSchools();
  }, [user]);

  const addSchool = async (schoolId: number) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('user_schools')
        .insert({
          user_id: user.id,
          school_id: schoolId,
          interviews_limit: 0,
          interviews_used: 0
        });

      if (error) throw error;

      await fetchUserSchools(); // Refresh the list
    } catch (err) {
      console.error('Error adding school:', err);
      throw err;
    }
  };

  const removeSchool = async (schoolId: number) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('user_schools')
        .delete()
        .eq('user_id', user.id)
        .eq('school_id', schoolId);

      if (error) throw error;

      await fetchUserSchools(); // Refresh the list
    } catch (err) {
      console.error('Error removing school:', err);
      throw err;
    }
  };

  return {
    userSchools,
    loading,
    error,
    fetchUserSchools,
    addSchool,
    removeSchool,
  };
};