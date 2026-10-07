import { useEffect, useState, useCallback } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';

interface DocumentStats {
  totalDocuments: number;
  hasResume: boolean;
  additionalDocuments: number;
  documentTypes: string[];
}

export const useDocumentStats = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DocumentStats>({
    totalDocuments: 0,
    hasResume: false,
    additionalDocuments: 0,
    documentTypes: [],
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data: documents, error } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;

      const hasResume = documents?.some(doc => doc.document_type === 'resume') || false;
      const additionalDocuments = documents?.filter(doc => doc.document_type !== 'resume').length || 0;
      const documentTypes = [...new Set(documents?.map(doc => doc.document_type) || [])];

      setStats({
        totalDocuments: documents?.length || 0,
        hasResume,
        additionalDocuments,
        documentTypes,
      });
    } catch (error) {
      console.error('Error fetching document stats:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Helper function to check if user has all required documents for a school
  const hasRequiredDocuments = (requiredDocs: string[]): { valid: boolean; missing: string[] } => {
    const missing = requiredDocs.filter(doc => !stats.documentTypes.includes(doc));
    return {
      valid: missing.length === 0,
      missing,
    };
  };

  return { stats, loading, hasRequiredDocuments, refetch: fetchStats };
};
