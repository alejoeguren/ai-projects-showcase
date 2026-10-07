import { Seo } from "@/components/Seo";
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Zap, Crown, Target, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

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
  },
];

const Pricing = () => {
  const { user } = useAuth();
  const [loadingTier, setLoadingTier] = useState<string | null>(null);

  const [userSchoolCount, setUserSchoolCount] = useState(0);

  useEffect(() => {
    const fetchSchoolCount = async () => {
      if (!user) return;
      const { count } = await supabase
        .from('user_schools')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      setUserSchoolCount(count || 0);
    };
    fetchSchoolCount();
  }, [user]);

  const handleSelectTier = async (tierKey: string) => {
    if (!user) {
      window.location.href = '/auth';
      return;
    }

    const tierLimit = TIER_SCHOOL_LIMITS[tierKey];
    if (userSchoolCount > tierLimit) {
      toast.error(
        `You have ${userSchoolCount} schools selected, but the ${tierKey.charAt(0).toUpperCase() + tierKey.slice(1)} plan only allows ${tierLimit}. Please remove ${userSchoolCount - tierLimit} school${userSchoolCount - tierLimit > 1 ? 's' : ''} first.`
      );
      return;
    }

    setLoadingTier(tierKey);
    try {
      const { data, error } = await supabase.functions.invoke('create-payment', {
        body: { tier: tierKey },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      console.error('Payment error:', err);
      toast.error(err.message || 'Failed to start checkout');
    } finally {
      setLoadingTier(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title="Pricing & Plans — MBA Prep Pro"
        description="Compare MBA Prep Pro plans. Choose the number of schools and AI mock interviews you need for your business school application season."
        path="/pricing"
      />

      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="text-xl font-bold text-primary">
              MBA Prep Pro
            </Link>
            <div className="flex items-center gap-4">
              {user ? (
                <Link to="/dashboard">
                  <Button variant="ghost">Dashboard</Button>
                </Link>
              ) : (
                <>
                  <Link to="/auth">
                    <Button variant="ghost">Sign In</Button>
                  </Link>
                  <Link to="/auth">
                    <Button>Get Started</Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 bg-gradient-hero">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-primary-foreground mb-6">
            Choose Your Success Plan
          </h1>
          <p className="text-xl text-primary-foreground/90 mb-8 max-w-2xl mx-auto">
            From focused to comprehensive preparation, find the perfect plan to ace your MBA interviews
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-16 -mt-8">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
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
        </div>
      </section>

      {/* Add-on Section */}
      <section className="py-16 bg-background-secondary">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-6">Need More Practice?</h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Exhausted your mock interviews for a school? Get additional practice sessions to perfect your performance.
          </p>

          <Card className="max-w-md mx-auto">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 p-3 rounded-full bg-accent-muted">
                <Zap className="h-6 w-6 text-accent" />
              </div>
              <CardTitle>Additional Mock Interview</CardTitle>
              <div className="mt-2">
                <span className="text-3xl font-bold text-primary">$25</span>
                <span className="text-muted-foreground">/interview</span>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 mb-6 text-sm">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-success" />
                  <span>Additional practice for any school</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-success" />
                  <span>Full AI-powered feedback</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-success" />
                  <span>Detailed performance report</span>
                </li>
              </ul>
              <Button className="w-full" variant="outline" disabled>
                Available After Purchase
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Frequently Asked Questions</h2>
          <div className="max-w-3xl mx-auto space-y-8">
            <div>
              <h3 className="text-lg font-semibold mb-2">What's included in mock interviews?</h3>
              <p className="text-muted-foreground">Each mock interview includes AI-powered questions, real-time feedback, performance scoring, and detailed analytics to help you improve.</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">Can I upgrade my plan later?</h3>
              <p className="text-muted-foreground">Yes! You can upgrade from any tier to a higher tier, and we'll credit the difference towards your new plan.</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">How do add-on interviews work?</h3>
              <p className="text-muted-foreground">Once you've used all interviews for a school, you can purchase additional sessions for $25 each to continue practicing.</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">Is there a time limit on my plan?</h3>
              <p className="text-muted-foreground">No! Once you purchase a plan, you have lifetime access to your mock interviews and can use them at your own pace.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-background-secondary py-8 border-t">
        <div className="container mx-auto px-4 text-center">
          <p className="text-muted-foreground">MBA Prep Pro. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Pricing;
