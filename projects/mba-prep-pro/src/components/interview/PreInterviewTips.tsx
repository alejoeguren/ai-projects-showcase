import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Volume2,
  Clock,
  MessageSquare,
  Lightbulb,
  ArrowRight,
  X,
  Mic,
  Bot,
  Hand,
} from "lucide-react";

interface PreInterviewTipsProps {
  schoolName: string;
  onStart: () => void;
  onBack: () => void;
}

const tips = [
  {
    icon: Mic,
    title: "Find a Quiet Space",
    description:
      "Use headphones if possible and find a quiet spot with minimal background noise. This helps the AI hear you clearly.",
  },
  {
    icon: Bot,
    title: "AI Pacing May Vary",
    description:
      "The AI interviewer may pause briefly before responding or occasionally reply quickly. This is normal — don't let the pacing throw you off.",
  },
  {
    icon: MessageSquare,
    title: "Focus on Your Content",
    description:
      "Concentrate on the substance of your answers rather than the conversational flow. Structure your responses clearly with specific examples and outcomes.",
  },
  {
    icon: Clock,
    title: "Take Your Time",
    description:
      "It's okay to pause and gather your thoughts before answering. A brief moment of reflection leads to better, more thoughtful responses.",
  },
  {
    icon: Lightbulb,
    title: "Be Specific & Personal",
    description:
      "Use real examples from your experience. Mention specific decisions you made, challenges you faced, and measurable outcomes you achieved.",
  },
  {
    icon: Hand,
    title: "Ending the Interview",
    description:
      "When you feel the interview is complete, click the \"End Interview\" button. The AI will then evaluate your performance and provide detailed feedback.",
  },
];

const PreInterviewTips = ({ schoolName, onStart, onBack }: PreInterviewTipsProps) => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Back button */}
        <div className="mb-4">
          <Button variant="ghost" size="sm" onClick={onBack} className="gap-2">
            <X className="h-4 w-4" />
            Back to School Selection
          </Button>
        </div>

        <div className="max-w-2xl mx-auto space-y-8">
          {/* Header */}
          <div className="text-center space-y-3">
            <div className="w-16 h-16 bg-primary-muted rounded-full flex items-center justify-center mx-auto">
              <Volume2 className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">Before You Begin</h1>
            <p className="text-muted-foreground text-lg">
              A few tips to help you get the most out of your <span className="font-medium text-foreground">{schoolName}</span> practice interview.
            </p>
          </div>

          {/* AI Notice */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="py-4 flex items-start gap-3">
              <Bot className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <p className="text-sm text-foreground">
                This is an <strong>AI-powered voice interview</strong>. You'll speak naturally with an AI interviewer who will ask follow-up questions just like a real admissions officer. Your microphone will be used throughout the session.
              </p>
            </CardContent>
          </Card>

          {/* Tips */}
          <div className="space-y-3">
            {tips.map((tip, i) => (
              <Card key={i} className="shadow-sm">
                <CardContent className="py-4 flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <tip.icon className="h-5 w-5 text-foreground" />
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground mb-1">{tip.title}</h3>
                    <p className="text-sm text-muted-foreground">{tip.description}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Start Button */}
          <div className="text-center pt-4 pb-8">
            <Button
              size="lg"
              onClick={onStart}
              className="bg-gradient-primary hover:opacity-90 gap-2 text-lg px-8 py-6"
            >
              I'm Ready — Start Interview
              <ArrowRight className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PreInterviewTips;
