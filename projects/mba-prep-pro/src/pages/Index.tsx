import { Seo } from "@/components/Seo";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowRight, BookOpen, Mic, Target, Trophy, Users, LogIn, CheckCircle } from "lucide-react";
import { Link, Navigate } from "react-router-dom";
import { useOnboarding } from "@/hooks/useOnboarding";
import { useAuth } from "@/hooks/useAuth";
import { useBetaMode } from "@/hooks/useBetaMode";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import heroImage from "@/assets/hero-professional.webp";

const Index = () => {
  const { isOnboardingComplete } = useOnboarding();
  const { user, loading, signOut } = useAuth();
  const { isBetaMode } = useBetaMode();
  const [waitlistEmail, setWaitlistEmail] = useState("");
  const [waitlistSubmitted, setWaitlistSubmitted] = useState(false);
  const [waitlistLoading, setWaitlistLoading] = useState(false);

  const handleWaitlistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!waitlistEmail.trim()) return;
    setWaitlistLoading(true);
    const { error } = await supabase
      .from('waitlist' as any)
      .insert({ email: waitlistEmail.toLowerCase().trim() } as any);
    setWaitlistLoading(false);
    if (error) {
      if (error.message?.includes('duplicate') || error.code === '23505') {
        setWaitlistSubmitted(true); // Already on waitlist, show success
      } else {
        toast.error("Something went wrong. Please try again.");
      }
    } else {
      setWaitlistSubmitted(true);
    }
  };

  // Redirect authenticated users to dashboard if they have completed onboarding
  if (!loading && user && isOnboardingComplete) {
    return <Navigate to="/dashboard" replace />;
  }
  return <div className="min-h-screen bg-background">
      <Seo
        title="MBA Prep Pro — AI-Powered MBA Mock Interviews"
        description="Practice realistic MBA admissions interviews with AI, tailored to your target business schools, and get scored feedback on every answer."
        path="/"
      />

      {/* Navigation */}
      <nav className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <BookOpen className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold text-foreground">MBA Prep Pro</span>
          </div>
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <Link to={isOnboardingComplete ? "/dashboard" : "/onboarding"}>
                  <Button variant="ghost">Dashboard</Button>
                </Link>
                <Button variant="ghost" onClick={signOut}>
                  Sign Out
                </Button>
              </>
            ) : (
              <>
                <Link to="/auth">
                  <Button variant="ghost">
                    <LogIn className="h-4 w-4 mr-2" />
                    Sign In
                  </Button>
                </Link>
                {!isBetaMode && (
                  <Link to="/auth">
                    <Button>Get Started</Button>
                  </Link>
                )}
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 bg-gradient-hero">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            <div className="space-y-8 relative z-10">
              <div className="space-y-4">
                <h1 className="text-5xl lg:text-6xl font-bold text-white leading-tight">
                  Master Your MBA Interview
                </h1>
                <p className="text-xl text-white/90 leading-relaxed">
                  Practice with AI-powered mock interviews tailored to your target business schools. 
                  Get personalized feedback and boost your confidence before the real thing.
                </p>
              </div>
              <div className="flex flex-col gap-4">
                {user ? (
                  <div className="flex flex-wrap gap-4">
                    <Link to={isOnboardingComplete ? "/dashboard" : "/onboarding"}>
                      <Button size="lg" className="bg-white text-primary hover:bg-white/90 shadow-button text-base">
                        Continue Practicing
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </Button>
                    </Link>
                    <Link to="/learn-more">
                      <Button size="lg" variant="outline" className="border-white text-white bg-slate-950 hover:bg-slate-800">
                        Learn More About MBA Interview Prep
                      </Button>
                    </Link>
                  </div>
                ) : isBetaMode ? (
                  waitlistSubmitted ? (
                    <div className="flex items-center gap-2 bg-white/20 rounded-lg px-6 py-3">
                      <CheckCircle className="h-5 w-5 text-green-300" />
                      <span className="text-white font-medium">You're on the waitlist! We'll be in touch.</span>
                    </div>
                  ) : (
                    <>
                      <form onSubmit={handleWaitlistSubmit} className="flex flex-col sm:flex-row gap-2 max-w-md">
                        <Input
                          type="email"
                          placeholder="Enter your email"
                          value={waitlistEmail}
                          onChange={(e) => setWaitlistEmail(e.target.value)}
                          required
                          className="bg-white/90 text-foreground placeholder:text-muted-foreground"
                        />
                        <Button size="lg" type="submit" disabled={waitlistLoading} className="bg-white text-primary hover:bg-white/90 shadow-button text-base whitespace-nowrap">
                          {waitlistLoading ? 'Joining...' : 'Join the Waitlist'}
                          <ArrowRight className="ml-2 h-5 w-5" />
                        </Button>
                      </form>
                      <Link to="/learn-more" className="w-fit">
                        <Button size="lg" variant="outline" className="border-white text-white bg-slate-950 hover:bg-slate-800">
                          Learn More About MBA Interview Prep
                        </Button>
                      </Link>
                    </>
                  )
                ) : (
                  <div className="flex flex-wrap gap-4">
                    <Link to="/auth">
                      <Button size="lg" className="bg-white text-primary hover:bg-white/90 shadow-button text-base">
                        Start Practicing Now
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </Button>
                    </Link>
                    <Link to="/learn-more">
                      <Button size="lg" variant="outline" className="border-white text-white bg-slate-950 hover:bg-slate-800">
                        Learn More About MBA Interview Prep
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </div>
            <div className="relative">
              <img src={heroImage} alt="Professional MBA candidate ready for interview success" width={628} height={418} fetchPriority="high" className="rounded-lg shadow-card-hover w-full h-auto" />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-background-secondary">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-foreground mb-4">
              Everything You Need to Succeed
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Our comprehensive platform provides personalized interview practice for every top MBA program.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="p-8 text-center shadow-card hover:shadow-card-hover transition-all duration-300">
              <div className="w-16 h-16 bg-primary-muted rounded-full flex items-center justify-center mx-auto mb-6">
                <Target className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-4">School-Specific Prep</h3>
              <p className="text-muted-foreground">
                Practice with questions tailored to each business school's unique culture and requirements.
              </p>
            </Card>

            <Card className="p-8 text-center shadow-card hover:shadow-card-hover transition-all duration-300">
              <div className="w-16 h-16 bg-accent-muted rounded-full flex items-center justify-center mx-auto mb-6">
                <Mic className="h-8 w-8 text-accent" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-4">Voice Practice</h3>
              <p className="text-muted-foreground">
                Realistic voice-based interviews that simulate the actual interview experience.
              </p>
            </Card>

            <Card className="p-8 text-center shadow-card hover:shadow-card-hover transition-all duration-300">
              <div className="w-16 h-16 bg-success-muted rounded-full flex items-center justify-center mx-auto mb-6">
                <Trophy className="h-8 w-8 text-success" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-4">Detailed Feedback</h3>
              <p className="text-muted-foreground">
                Get comprehensive analysis of your performance with actionable improvement suggestions.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Blog/Resources Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-foreground mb-4">
              MBA Interview Insights
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Expert guides and strategies to help you prepare for your admissions interview.
            </p>
          </div>
          <div className="text-center flex flex-wrap gap-4 justify-center">
            <Link to="/mba-interview-questions">
              <Button size="lg">
                Common MBA Interview Questions
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link to="/blog">
              <Button size="lg" variant="outline">
                <BookOpen className="mr-2 h-5 w-5" />
                Browse All Articles
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>

        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold mb-6">Ready to Ace Your MBA Interview?</h2>
          <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
            Join thousands of successful MBA candidates who used our platform to land their dream school.
          </p>
          {user ? (
            <Link to={isOnboardingComplete ? "/dashboard" : "/onboarding"}>
              <Button size="lg" className="bg-white text-primary hover:bg-white/90 shadow-button">
                Go to Dashboard
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          ) : !isBetaMode ? (
            <Link to="/auth">
              <Button size="lg" className="bg-white text-primary hover:bg-white/90 shadow-button">
                Get Started Today
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          ) : null}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-card border-t">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <BookOpen className="h-6 w-6 text-primary" />
              <span className="text-lg font-semibold text-foreground">MBA Prep Pro</span>
            </div>
            <p className="text-muted-foreground">
              MBA Prep Pro. Empowering future business leaders.
            </p>
          </div>
        </div>
      </footer>
    </div>;
};
export default Index;