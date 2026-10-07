import { Seo } from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowRight, BookOpen, Upload, School, Mic, BarChart3, ChevronRight, LogIn } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useOnboarding } from "@/hooks/useOnboarding";

const LearnMore = () => {
  const { user } = useAuth();
  const { isOnboardingComplete } = useOnboarding();

  const journeySteps = [
    {
      icon: Upload,
      title: "Upload Your Resume",
      description: "Start by uploading your resume and any additional application materials. Our AI analyzes your background to personalize your interview experience.",
      color: "text-primary",
      bgColor: "bg-primary-muted"
    },
    {
      icon: School,
      title: "Select Target Schools",
      description: "Choose from top MBA programs including Harvard, Wharton, Stanford, and more. Each school has unique interview styles and focus areas.",
      color: "text-accent",
      bgColor: "bg-accent-muted"
    },
    {
      icon: Mic,
      title: "Practice Mock Interviews",
      description: "Engage in realistic voice-based interviews with AI. Practice behavioral questions, case studies, and school-specific scenarios.",
      color: "text-success",
      bgColor: "bg-success-muted"
    },
    {
      icon: BarChart3,
      title: "Get Personalized Dashboard",
      description: "Track your progress, view detailed feedback, and access customized improvement recommendations based on your performance.",
      color: "text-warning",
      bgColor: "bg-warning-muted"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title="How MBA Prep Pro Works — AI Interview Practice"
        description="See how MBA Prep Pro builds school-specific mock interviews from your resume and grades your substance, structure, and presence."
        path="/learn-more"
      />

      {/* Navigation */}
      <nav className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-2">
            <BookOpen className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold text-foreground">MBA Prep Pro</span>
          </Link>
          <div className="flex items-center space-x-4">
            <Link to="/pricing">
              <Button variant="ghost">Pricing</Button>
            </Link>
            {user ? (
              <Link to={isOnboardingComplete ? "/dashboard" : "/onboarding"}>
                <Button variant="ghost">Dashboard</Button>
              </Link>
            ) : (
              <Link to="/auth">
                <Button>
                  <LogIn className="h-4 w-4 mr-2" />
                  Sign In
                </Button>
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 bg-gradient-hero">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-5xl font-bold text-white mb-6">
            Your Journey to MBA Success
          </h1>
          <p className="text-xl text-white/90 max-w-3xl mx-auto leading-relaxed">
            Discover how MBA Prep Pro transforms your interview preparation with personalized,
            AI-powered practice sessions tailored to your target schools and background.
          </p>
        </div>
      </section>

      {/* Journey Steps */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-foreground mb-4">
              How It Works
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Follow these simple steps to master your MBA interview and increase your chances of admission.
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            {journeySteps.map((step, index) => (
              <div key={index} className="flex items-start mb-12 last:mb-0">
                <div className="flex-shrink-0 mr-8">
                  <div className={`w-16 h-16 ${step.bgColor} rounded-full flex items-center justify-center`}>
                    <step.icon className={`h-8 w-8 ${step.color}`} />
                  </div>
                  {index < journeySteps.length - 1 && (
                    <div className="w-px h-16 bg-border mx-8 mt-4"></div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <span className="text-sm font-semibold text-muted-foreground mr-4">
                      STEP {index + 1}
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold text-foreground mb-4">{step.title}</h3>
                  <p className="text-lg text-muted-foreground leading-relaxed">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Deep Dive */}
      <section className="py-20 bg-background-secondary">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-foreground mb-4">
              Why Choose MBA Prep Pro?
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Our platform combines cutting-edge AI technology with deep understanding of MBA admissions.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="p-8 shadow-card hover:shadow-card-hover transition-all duration-300">
              <h3 className="text-xl font-semibold text-foreground mb-4 flex items-center">
                <ChevronRight className="h-5 w-5 text-primary mr-2" />
                School-Specific Questions
              </h3>
              <p className="text-muted-foreground mb-4">
                Practice with questions specifically designed for each business school's interview style and values.
              </p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Harvard Business School</li>
                <li>• Wharton School</li>
                <li>• Stanford Graduate School of Business</li>
                <li>• And 20+ more top programs</li>
              </ul>
            </Card>

            <Card className="p-8 shadow-card hover:shadow-card-hover transition-all duration-300">
              <h3 className="text-xl font-semibold text-foreground mb-4 flex items-center">
                <ChevronRight className="h-5 w-5 text-primary mr-2" />
                AI-Powered Feedback
              </h3>
              <p className="text-muted-foreground mb-4">
                Get detailed analysis of your responses including content quality, delivery, and areas for improvement.
              </p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Communication clarity</li>
                <li>• Story structure</li>
                <li>• Confidence level</li>
                <li>• Leadership examples</li>
              </ul>
            </Card>

            <Card className="p-8 shadow-card hover:shadow-card-hover transition-all duration-300">
              <h3 className="text-xl font-semibold text-foreground mb-4 flex items-center">
                <ChevronRight className="h-5 w-5 text-primary mr-2" />
                Progress Tracking
              </h3>
              <p className="text-muted-foreground mb-4">
                Monitor your improvement over time with detailed analytics and personalized recommendations.
              </p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Performance metrics</li>
                <li>• Improvement trends</li>
                <li>• Weakness identification</li>
                <li>• Success predictions</li>
              </ul>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold mb-6">Ready to Start Your Journey?</h2>
          <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
            Join thousands of successful MBA candidates who used our platform to land their dream school.
          </p>
          <Link to={user ? (isOnboardingComplete ? "/dashboard" : "/onboarding") : "/auth"}>
            <Button size="lg" className="bg-white text-primary hover:bg-white/90 shadow-button">
              {user ? 'Go to Dashboard' : 'Get Started Today'}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
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
    </div>
  );
};

export default LearnMore;