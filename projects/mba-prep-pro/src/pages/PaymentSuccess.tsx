import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Loader2, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useOnboarding } from '@/hooks/useOnboarding';

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { completeOnboarding } = useOnboarding();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [errorMessage, setErrorMessage] = useState('');
  const [resultData, setResultData] = useState<any>(null);
  const verificationStarted = useRef(false);

  const sessionId = searchParams.get('session_id');
  const tier = searchParams.get('tier');
  const type = searchParams.get('type');
  const schoolId = searchParams.get('school_id');

  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      // After Stripe redirect, session may take a moment to restore.
      // Wait briefly before giving up and redirecting to auth.
      const timeout = setTimeout(() => {
        if (!sessionId) {
          navigate('/auth');
        } else {
          // Try to restore session one more time
          supabase.auth.getSession().then(({ data: { session } }) => {
            if (!session) {
              navigate('/auth');
            }
          });
        }
      }, 2000);
      return () => clearTimeout(timeout);
    }
    
    if (!sessionId) {
      setStatus('error');
      setErrorMessage('Missing payment information.');
      return;
    }

    if (verificationStarted.current) return;
    verificationStarted.current = true;

    const verifyPayment = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('verify-payment', {
          body: { session_id: sessionId, tier, type, school_id: schoolId },
        });

        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        setResultData(data);
        setStatus('success');
        // Complete onboarding after successful payment
        completeOnboarding();
      } catch (err: any) {
        console.error('Payment verification error:', err);
        setErrorMessage(err.message || 'Failed to verify payment');
        setStatus('error');
        verificationStarted.current = false; // Allow retry on error
      }
    };

    verifyPayment();
  }, [sessionId, tier, type, schoolId, user, authLoading, navigate]);

  const tierNames: Record<string, string> = {
    essential: 'Essential',
    professional: 'Professional',
    premium: 'Premium',
  };

  const isAddon = type === 'addon' || resultData?.type === 'addon';

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          {status === 'verifying' && (
            <>
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
              <CardTitle>Verifying Payment...</CardTitle>
            </>
          )}
          {status === 'success' && (
            <>
              <CheckCircle className="h-12 w-12 text-success mx-auto mb-4" />
              <CardTitle>Payment Successful!</CardTitle>
            </>
          )}
          {status === 'error' && (
            <>
              <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <CardTitle>Payment Issue</CardTitle>
            </>
          )}
        </CardHeader>
        <CardContent className="text-center space-y-4">
          {status === 'verifying' && (
            <p className="text-muted-foreground">Please wait while we confirm your payment.</p>
          )}
          {status === 'success' && resultData && (
            <>
              {isAddon ? (
                <>
                  <p className="text-muted-foreground">
                    Your additional mock interview has been added!
                  </p>
                  <div className="bg-muted rounded-lg p-4 text-sm">
                    <p>🎤 <strong>+1 mock interview</strong> added to your school</p>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-muted-foreground">
                    Your <strong>{tierNames[resultData.tier] || resultData.tier}</strong> plan is now active!
                  </p>
                  <div className="bg-muted rounded-lg p-4 text-sm space-y-1">
                    <p>🎓 Up to <strong>{resultData.schools_limit}</strong> target school{resultData.schools_limit > 1 ? 's' : ''}</p>
                    <p>🎤 <strong>{resultData.interviews_per_school}</strong> mock interviews per school</p>
                  </div>
                </>
              )}
              <Button className="w-full" size="lg" onClick={() => navigate('/dashboard')}>
                Go to Dashboard
              </Button>
            </>
          )}
          {status === 'error' && (
            <>
              <p className="text-muted-foreground">{errorMessage}</p>
              <div className="flex flex-col gap-2">
                <Button variant="outline" onClick={() => navigate('/pricing')}>
                  Back to Pricing
                </Button>
                <Link to="/support" className="text-sm text-muted-foreground hover:underline">
                  Contact Support
                </Link>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentSuccess;
