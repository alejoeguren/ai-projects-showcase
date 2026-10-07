import { ReactNode } from 'react';
import { Progress } from '@/components/ui/progress';
import { BookOpen } from 'lucide-react';
import { OnboardingStep } from '@/hooks/useOnboarding';

interface OnboardingLayoutProps {
  children: ReactNode;
  currentStep: OnboardingStep;
  title: string;
  description: string;
}

const stepToProgress = {
  'school-selection': 25,
  'resume-upload': 50,
  'pricing': 75,
  'completed': 100,
};

const OnboardingLayout = ({ children, currentStep, title, description }: OnboardingLayoutProps) => {
  const progress = stepToProgress[currentStep];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <nav className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 h-16 flex items-center">
          <div className="flex items-center space-x-2">
            <BookOpen className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold text-foreground">MBA Prep Pro</span>
          </div>
        </div>
      </nav>

      {/* Progress Bar */}
      <div className="bg-card/30 border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="max-w-2xl mx-auto">
            <div className="mb-4">
              <h1 className="text-2xl font-bold text-foreground mb-2">{title}</h1>
              <p className="text-muted-foreground">{description}</p>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Getting Started</span>
                <span>{progress}% Complete</span>
              </div>
              <Progress value={progress} className="h-3" />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

export default OnboardingLayout;