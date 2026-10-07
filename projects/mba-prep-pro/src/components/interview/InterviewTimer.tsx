import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Clock, Pause, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface InterviewTimerProps {
  onComplete?: () => void;
  maxDuration?: number; // in seconds, hard cap before auto-end
  displayDuration?: number; // in seconds, shown to user (e.g. 30 min while max is 32)
  running?: boolean; // control start/stop from parent (default: true)
  variant?: 'floating' | 'center'; // display style
}

const InterviewTimer = ({ onComplete, maxDuration = 1800, displayDuration, running = true, variant = 'floating' }: InterviewTimerProps) => {
  const shownDuration = displayDuration ?? maxDuration;
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(running);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    
    if (isRunning) {
      interval = setInterval(() => {
        setSeconds(prev => {
          if (prev >= maxDuration) {
            setIsRunning(false);
            onComplete?.();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isRunning, maxDuration, onComplete]);

  // Sync internal running state with prop
  useEffect(() => {
    setIsRunning(running);
  }, [running]);

  const formatTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleTimer = () => {
    setIsRunning(!isRunning);
  };

  const warningThreshold = 28 * 60; // 28 minutes
  const isNearEnd = seconds >= warningThreshold;
  const progress = (seconds / shownDuration) * 100;

  if (variant === 'center') {
    return (
      <div className="inline-flex flex-col items-center">
        <div className={`font-mono font-bold ${isNearEnd ? 'text-destructive' : 'text-foreground'} text-6xl md:text-7xl`}>
          {formatTime(seconds)}
        </div>
        <div className="mt-3 w-64 md:w-80 bg-muted rounded-full h-1.5">
          <div 
            className={`h-1.5 rounded-full transition-all duration-1000 ${
              isNearEnd ? 'bg-destructive' : 'bg-primary'
            }`}
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
        <div className="mt-4">
          <Button size="sm" variant="outline" onClick={toggleTimer}>
            {isRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Card className="fixed top-4 right-4 z-50 p-4 bg-card/95 backdrop-blur-sm border-2">
      <div className="flex items-center space-x-3">
        <Clock className={`h-5 w-5 ${isNearEnd ? 'text-destructive' : 'text-primary'}`} />
        <div className="text-lg font-mono font-bold">
          <span className={isNearEnd ? 'text-destructive' : 'text-foreground'}>
            {formatTime(seconds)}
          </span>
          <span className="text-muted-foreground text-sm ml-1">
            / {formatTime(shownDuration)}
          </span>
        </div>
        <Button size="sm" variant="outline" onClick={toggleTimer}>
          {isRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>
      </div>
      
      {/* Progress bar */}
      <div className="mt-2 w-full bg-muted rounded-full h-1">
        <div 
          className={`h-1 rounded-full transition-all duration-1000 ${
            isNearEnd ? 'bg-destructive' : 'bg-primary'
          }`}
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>
      
      {isNearEnd && (
        <div className="text-xs text-destructive mt-1 font-medium">
          Time running out!
        </div>
      )}
    </Card>
  );
};

export default InterviewTimer;