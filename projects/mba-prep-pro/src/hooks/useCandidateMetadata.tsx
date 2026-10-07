import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface CandidateMetadata {
  resume_metadata: any;
  processed_skills: string[];
  work_experience_summary: string;
  education_background: string;
  career_objectives: string;
  industry_experience: string[];
  leadership_examples: string;
  resume_processed_at: string;
}

export const useCandidateMetadata = () => {
  const { user } = useAuth();
  const [metadata, setMetadata] = useState<CandidateMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchMetadata = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          resume_metadata,
          processed_skills,
          work_experience_summary,
          education_background,
          career_objectives,
          industry_experience,
          leadership_examples,
          resume_processed_at
        `)
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error fetching candidate metadata:', error);
        return;
      }

      setMetadata(data);
    } catch (error) {
      console.error('Error fetching metadata:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const processResumeDocument = async (documentId: string) => {
    if (!user || isProcessing) return;

    try {
      setIsProcessing(true);
      toast.info('Processing resume...', {
        description: 'This may take a few moments while we extract key information.'
      });

      const { data, error } = await supabase.functions.invoke('process-resume', {
        body: { documentId, userId: user.id }
      });

      if (error) throw error;

      const result = data;
      
      if (result.success) {
        if (result.alreadyProcessed) {
          toast.info('Resume already processed', {
            description: 'Your resume information is up to date.'
          });
        } else {
          toast.success('Resume processed successfully', {
            description: 'Your profile has been updated with extracted information.'
          });
        }
        
        // Refresh metadata
        await fetchMetadata();
      } else {
        throw new Error(result.error || 'Failed to process resume');
      }
    } catch (error) {
      console.error('Error processing resume:', error);
      toast.error('Failed to process resume', {
        description: error instanceof Error ? error.message : 'Please try again later.'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const hasProcessedResume = () => {
    return metadata?.resume_processed_at !== null;
  };

  const getProcessingStatus = () => {
    if (isProcessing) return 'processing';
    if (hasProcessedResume()) return 'processed';
    return 'not_processed';
  };

  useEffect(() => {
    fetchMetadata();
  }, [user]);

  return {
    metadata,
    isLoading,
    isProcessing,
    processResumeDocument,
    hasProcessedResume,
    getProcessingStatus,
    refetch: fetchMetadata
  };
};