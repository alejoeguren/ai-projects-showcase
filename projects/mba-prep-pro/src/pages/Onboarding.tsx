import { useEffect, useState } from 'react';
import { useOnboarding } from '@/hooks/useOnboarding';
import SchoolSelection from '@/components/onboarding/SchoolSelection';
import ResumeUpload from '@/components/onboarding/ResumeUpload';
import OnboardingPricing from '@/components/onboarding/OnboardingPricing';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

const Onboarding = () => {
  const { currentStep, isOnboardingComplete, completeOnboarding, setCurrentStep, setSelectedSchools, setHasUploadedResume } = useOnboarding();
  const { user } = useAuth();
  const [checking, setChecking] = useState(true);

  // On mount, check DB to see if user already has schools + resume
  useEffect(() => {
    if (!user || isOnboardingComplete) {
      setChecking(false);
      return;
    }

    const checkExistingData = async () => {
      try {
        const [schoolsRes, docsRes, profileRes, skipPricingRes] = await Promise.all([
          supabase.from('user_schools').select('school_id').eq('user_id', user.id),
          supabase.from('documents').select('id').eq('user_id', user.id).eq('document_type', 'resume').limit(1),
          supabase.from('profiles').select('subscription_tier').eq('user_id', user.id).single(),
          supabase.from('app_settings').select('value').eq('key', 'skip_pricing').single(),
        ]);

        const hasSchools = (schoolsRes.data?.length || 0) > 0;
        const hasResume = (docsRes.data?.length || 0) > 0;
        const tier = profileRes.data?.subscription_tier;
        const hasPaid = !!tier && tier !== 'free';
        const canSkipPricing = skipPricingRes.data?.value === 'true';

        if (hasSchools && hasResume && (hasPaid || canSkipPricing)) {
          // User already completed onboarding previously (with payment)
          setSelectedSchools(schoolsRes.data!.map(s => s.school_id));
          setHasUploadedResume(true);
          completeOnboarding();
        } else if (hasSchools && hasResume) {
          // Schools + resume done but no payment — go to pricing step
          setSelectedSchools(schoolsRes.data!.map(s => s.school_id));
          setHasUploadedResume(true);
          setCurrentStep('pricing');
        } else if (hasSchools && !hasResume) {
          // Schools selected but no resume — go to resume step
          setSelectedSchools(schoolsRes.data!.map(s => s.school_id));
          setCurrentStep('resume-upload');
        }
        // else: fresh user, start from school-selection (default)
      } catch (e) {
        console.error('Error checking onboarding status:', e);
      } finally {
        setChecking(false);
      }
    };

    checkExistingData();
  }, [user]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (isOnboardingComplete) {
    return <Navigate to="/dashboard" replace />;
  }

  switch (currentStep) {
    case 'school-selection':
      return <SchoolSelection />;
    case 'resume-upload':
      return <ResumeUpload />;
    case 'pricing':
      return <OnboardingPricing />;
    default:
      return <Navigate to="/dashboard" replace />;
  }
};

export default Onboarding;
