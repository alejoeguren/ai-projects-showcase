import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, ArrowLeft, ArrowRight, Target, Zap, Crown, Loader2 } from 'lucide-react';
import { useOnboarding } from '@/hooks/useOnboarding';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import OnboardingLayout from './OnboardingLayout';

const TIER_SCHOOL_LIMITS: Record<string, number> = {
  essential: 1,
  professional: 3,
  premium: 5,
};

const tiers = [
  {
    key: 'essential',
    name: 'Essential',
    price: '$150',
    period: 'one-time',
    description: 'Perfect for focused preparation',
    icon: Target,
    features: ['1 target school', '3 mock interviews', 'AI-powered feedback', 'Performance analytics', 'Interview recordings', 'Detailed reports', 'Upload resume & documents'],
    popular: false,
    schoolsLimit: 1,
  },
  {
    key: 'professional',
    name: 'Professional',
    price: '$200',
    period: 'one-time',
    description: 'For comprehensive preparation',
    icon: Zap,
    features: ['Everything in Essential', '3 target schools', '9 total mock interviews', 'School-specific feedback', 'Comparative analytics', 'Priority support'],
    popular: true,
    schoolsLimit: 3,
  },
  {
    key: 'premium',
    name: 'Premium',
    price: '$250',
    period: 'one-time',
    description: 'Maximum preparation coverage',
    icon: Crown,
    features: ['Everything in Professional', '5 target schools', '15 total mock interviews', 'Advanced analytics', 'Dedicated support'],
    popular: false,
    schoolsLimit: 5,
  },
];

const OnboardingPricing = () => {
  const { setCurrentStep, completeOnboarding, selectedSchools } = useOnboarding();
  const [canSkip, setCanSkip] = useState(false);
  const [loadingTier, setLoadingTier] = useState<string | null>(null);

  useEffect(() => {
    const checkSkipPricing = async () => {
      const { data } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'skip_pricing')
        .single();
      setCanSkip(data?.value === 'true');
    };
    checkSkipPricing();
  }, []);

  const handleBack = () => {
    setCurrentStep('resume-upload');
  };

  const handleSelectTier = async (tierKey: string) => {
    const tierLimit = TIER_SCHOOL_LIMITS[tierKey];
    if (selectedSchools.length > tierLimit) {
      toast.error(
        `You've selected ${selectedSchools.length} schools, but the ${tierKey.charAt(0).toUpperCase() + tierKey.slice(1)} plan only allows ${tierLimit}. Please go back and deselect ${selectedSchools.length - tierLimit} school${selectedSchools.length - tierLimit > 1 ? 's' : ''}.`
      );
      return;
    }
    setLoadingTier(tierKey);
    try {
      const { data, error } = await supabase.functions.invoke('create-payment', {
        body: { tier: tierKey, source: 'onboarding' },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.url) {
        // Don't complete onboarding here — it will be completed after payment verification
        window.location.href = data.url;
      }
    } catch (err: any) {
      console.error('Payment error:', err);
      toast.error(err.message || 'Failed to start checkout');
    } finally {
      setLoadingTier(null);
    }
  };

  const handleSkip = () => {
    completeOnboarding();
  };

  return (
    <OnboardingLayout
      currentStep="pricing"
      title="Choose Your Plan"
      description="Select a plan to unlock personalized mock interviews and AI-powered feedback."
    >
      {/* Back button */}
      <div className="flex items-center justify-between mb-8">
        <Button variant="outline" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Resume
        </Button>

        {canSkip && (
          <Button
            size="lg"
            variant="outline"
            onClick={handleSkip}
            className="border-primary text-primary"
          >
            Skip for Now
            <ArrowRight className="h-5 w-5 ml-2" />
          </Button>
        )}
      </div>

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {tiers.map((tier) => {
          const IconComponent = tier.icon;
          const isLoading = loadingTier === tier.key;
          return (
            <Card
              key={tier.key}
              className={`relative flex flex-col h-full transition-all duration-300 hover:shadow-card-hover ${
                tier.popular ? 'ring-2 ring-accent border-accent/20 scale-105' : ''
              }`}
            >
              {tier.popular && (
                <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-accent text-accent-foreground">
                  Most Popular
                </Badge>
              )}

              <CardHeader className="text-center pb-4">
                <div className="mx-auto mb-4 p-3 rounded-full bg-primary-muted">
                  <IconComponent className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-xl font-bold">{tier.name}</CardTitle>
                <div className="mt-2">
                  <span className="text-3xl font-bold text-primary">{tier.price}</span>
                  <span className="text-muted-foreground">/{tier.period}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">{tier.description}</p>
              </CardHeader>

              <CardContent className="pt-0 flex-1 flex flex-col">
                <ul className="space-y-3 mb-6 flex-1">
                  {tier.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-success mt-0.5 shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  className="w-full"
                  size="lg"
                  disabled={loadingTier !== null}
                  onClick={() => handleSelectTier(tier.key)}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Redirecting...
                    </>
                  ) : (
                    `Choose ${tier.name}`
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </OnboardingLayout>
  );
};

export default OnboardingPricing;
