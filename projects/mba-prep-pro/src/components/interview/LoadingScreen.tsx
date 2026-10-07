import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Mic, Heart, Star, Target } from 'lucide-react';

interface LoadingScreenProps {
  onComplete: () => void;
  duration?: number; // in milliseconds, default 4 seconds
}

const inspirationalMessages = [
  "Take a deep breath...",
  "You've got this!",
  "Remember to answer the questions clearly",
  "Stay confident and authentic",
  "Think before you speak",
  "Show your passion for business",
  "Demonstrate your leadership potential",
  "Be specific with your examples"
];

const LoadingScreen = ({ onComplete, duration = 4000 }: LoadingScreenProps) => {
  const [currentMessage, setCurrentMessage] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Progress animation
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev + (100 / (duration / 50)); // Update every 50ms
        if (newProgress >= 100) {
          clearInterval(progressInterval);
          // Use setTimeout to prevent React warning about updating during render
          setTimeout(() => onComplete(), 0);
          return 100;
        }
        return newProgress;
      });
    }, 50);

    // Message rotation
    const messageInterval = setInterval(() => {
      setCurrentMessage(prev => (prev + 1) % inspirationalMessages.length);
    }, duration / 3); // Change message 3 times during loading

    return () => {
      clearInterval(progressInterval);
      clearInterval(messageInterval);
    };
  }, [duration, onComplete]);

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center">
      <Card className="p-12 text-center max-w-md shadow-card-hover">
        <div className="mb-8">
          <div className="w-16 h-16 bg-primary-muted rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Mic className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Preparing Your Interview
          </h2>
        </div>

        {/* Inspirational Message */}
        <div className="mb-8 h-16 flex items-center justify-center">
          <p className="text-lg text-muted-foreground transition-all duration-500 font-medium">
            {inspirationalMessages[currentMessage]}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="space-y-4">
          <div className="w-full bg-muted rounded-full h-2">
            <div 
              className="h-2 bg-gradient-primary rounded-full transition-all duration-100"
              style={{ width: `${progress}%` }}
            />
          </div>
          
          {/* Floating Icons */}
          <div className="flex justify-center space-x-6 opacity-60">
            <Heart className="h-4 w-4 text-success animate-bounce" style={{ animationDelay: '0s' }} />
            <Star className="h-4 w-4 text-accent animate-bounce" style={{ animationDelay: '0.2s' }} />
            <Target className="h-4 w-4 text-primary animate-bounce" style={{ animationDelay: '0.4s' }} />
          </div>
        </div>
      </Card>
    </div>
  );
};

export default LoadingScreen;