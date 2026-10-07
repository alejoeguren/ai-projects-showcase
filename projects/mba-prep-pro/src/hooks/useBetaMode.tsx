import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useBetaMode = () => {
  const { data: isBetaMode, isLoading } = useQuery({
    queryKey: ['beta-mode'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_settings' as any)
        .select('value')
        .eq('key', 'beta_mode')
        .single();
      
      if (error) return false;
      return (data as any)?.value === 'true';
    },
    staleTime: 1000 * 60 * 5, // cache for 5 min
  });

  return { isBetaMode: isBetaMode ?? false, isLoading };
};

export const checkEmailWhitelisted = async (email: string): Promise<{ whitelisted: boolean; error?: string }> => {
  const { data, error } = await supabase.rpc('is_email_whitelisted', {
    _email: email.toLowerCase(),
  });
  
  if (error) {
    console.error('Whitelist check failed:', error);
    return { whitelisted: false, error: error.message };
  }
  
  return { whitelisted: !!data };
};
