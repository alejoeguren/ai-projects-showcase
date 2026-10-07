import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Trophy, RotateCcw, Home, CheckCircle, XCircle, Sparkles, Target, Lightbulb, BookOpen, MessageCircle, Send, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import FeedbackWidget from '@/components/FeedbackWidget';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast as sonnerToast } from 'sonner';

// Types
export interface DimensionScore {
  checked: string[];
  unchecked: string[];
  checklist_points: number;
  quality_bonus: 0 | 1;
  score: number;
  justifications: Record<string, string>;
}

export interface OpportunityArea {
  title: string;
  related_items: string[];
  why_it_matters: string;
  action: string;
  micro_drill: string;
  example_rewrite: string;
}

export interface EvaluationResult {
  scores: {
    substance: DimensionScore;
    structure: DimensionScore;
    presence: DimensionScore;
  };
  overall_score_15: number;
  top_opportunities: OpportunityArea[];
}

interface InterviewResultsProps {
  evaluation: EvaluationResult;
  schoolName: string;
  duration: string;
  transcript: string;
  sessionId?: string;
  onRetry?: () => void;
}

const DIMENSION_META: Record<string, { label: string; icon: React.ReactNode; description: string }> = {
  substance: {
    label: 'Substance',
    icon: <BookOpen className="h-5 w-5" />,
    description: 'Content quality, ownership, decisions, and outcomes',
  },
  structure: {
    label: 'Structure',
    icon: <Target className="h-5 w-5" />,
    description: 'Organization, flow, and reflection',
  },
  presence: {
    label: 'Presence',
    icon: <Sparkles className="h-5 w-5" />,
    description: 'Concision, confidence, tone, and composure',
  },
};

const ITEM_LABELS: Record<string, string> = {
  answered_question: 'Answered the question directly',
  ownership_role: 'Showed personal ownership',
  decision_tradeoff: 'Included decision/tradeoff',
  specific_outcome: 'Provided specific outcome',
  fast_context: 'Set context quickly',
  sequenced_actions: 'Logical action sequence',
  clear_result: 'Clear result/resolution',
  reflection_learning: 'Reflection & learning',
  concise: 'Concise delivery',
  confident_language: 'Confident language',
  conversational_tone: 'Conversational tone',
  composure_under_pressure: 'Composure under pressure',
};

const getScoreColor = (score: number, max: number) => {
  const pct = score / max;
  if (pct >= 0.8) return 'text-success';
  if (pct >= 0.5) return 'text-accent';
  return 'text-destructive';
};

const getOverallLabel = (score: number) => {
  if (score >= 13) return 'Outstanding';
  if (score >= 10) return 'Strong';
  if (score >= 7) return 'Developing';
  if (score >= 4) return 'Needs Work';
  return 'Early Stage';
};

const DimensionCard = ({ dimension, data }: { dimension: string; data: DimensionScore }) => {
  const meta = DIMENSION_META[dimension];
  return (
    <Card className="shadow-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {meta.icon}
            <CardTitle className="text-lg">{meta.label}</CardTitle>
          </div>
          <div className={`text-2xl font-bold ${getScoreColor(data.score, 5)}`}>
            {data.score}/5
          </div>
        </div>
        <CardDescription className="text-xs">{meta.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Progress value={(data.score / 5) * 100} className="h-2" />

        {/* Checklist items */}
        <div className="space-y-2">
          {data.checked.map((item) => (
            <div key={item} className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
              <div>
                <span className="text-sm font-medium">{ITEM_LABELS[item] || item}</span>
                {data.justifications[item] && (
                  <p className="text-xs text-muted-foreground">{data.justifications[item]}</p>
                )}
              </div>
            </div>
          ))}
          {data.unchecked.map((item) => (
            <div key={item} className="flex items-start gap-2">
              <XCircle className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div>
                <span className="text-sm font-medium text-muted-foreground">{ITEM_LABELS[item] || item}</span>
                {data.justifications[item] && (
                  <p className="text-xs text-muted-foreground">{data.justifications[item]}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Quality bonus */}
        {data.quality_bonus === 1 && (
          <Badge variant="secondary" className="gap-1">
            <Sparkles className="h-3 w-3" /> Quality Bonus
          </Badge>
        )}
      </CardContent>
    </Card>
  );
};

const EMPTY_DIMENSION: DimensionScore = {
  checked: [],
  unchecked: [],
  checklist_points: 0,
  quality_bonus: 0,
  score: 0,
  justifications: {},
};

const InterviewSupportCard = ({ sessionId, schoolName }: { sessionId?: string; schoolName: string }) => {
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!message.trim() || !user) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from('support_tickets').insert({
        user_id: user.id,
        subject: `Interview Issue — ${schoolName}`,
        message: `${message.trim()}${sessionId ? `\n\n[Session ID: ${sessionId}]` : ''}`,
        category: 'bug' as const,
      });
      if (error) throw error;
      setSubmitted(true);
      sonnerToast.success('Thanks! We\'ll look into it.');
    } catch {
      sonnerToast.error('Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <Card className="border-muted">
        <CardContent className="py-4 text-center text-sm text-muted-foreground">
          <CheckCircle className="h-5 w-5 text-success mx-auto mb-2" />
          Thanks for letting us know — we'll get back to you!
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-muted">
      <CardContent className="py-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <MessageCircle className="h-4 w-4" />
          Something didn't go well? Let us know and we'll get back to you.
        </div>
        <div className="flex gap-2">
          <Textarea
            placeholder="Describe what went wrong..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="min-h-[60px] text-sm resize-none"
          />
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!message.trim() || submitting}
            className="self-end"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

const InterviewResults = ({
  evaluation,
  schoolName,
  duration,
  transcript,
  sessionId,
  onRetry,
}: InterviewResultsProps) => {
  const scores = evaluation?.scores ?? {
    substance: EMPTY_DIMENSION,
    structure: EMPTY_DIMENSION,
    presence: EMPTY_DIMENSION,
  };
  const overall_score_15 = evaluation?.overall_score_15 ?? 0;
  const top_opportunities = evaluation?.top_opportunities ?? [];

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="w-20 h-20 bg-primary-muted rounded-full flex items-center justify-center mx-auto">
            <Trophy className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Interview Complete!</h1>
          <p className="text-muted-foreground">
            {schoolName} Mock Interview • Duration: {duration}
          </p>
        </div>

        {/* Overall Score */}
        <Card className="shadow-card">
          <CardContent className="pt-6 text-center space-y-4">
            <div className={`text-6xl font-bold ${getScoreColor(overall_score_15, 15)}`}>
              {overall_score_15}/15
            </div>
            <div className={`text-lg font-medium ${getScoreColor(overall_score_15, 15)}`}>
              {getOverallLabel(overall_score_15)}
            </div>
            <div className="max-w-md mx-auto">
              <Progress value={(overall_score_15 / 15) * 100} className="h-3" />
            </div>
          </CardContent>
        </Card>

        {/* 3 Dimension Cards */}
        <div className="grid md:grid-cols-3 gap-4">
          <DimensionCard dimension="substance" data={scores.substance} />
          <DimensionCard dimension="structure" data={scores.structure} />
          <DimensionCard dimension="presence" data={scores.presence} />
        </div>

        {/* Top 3 Opportunities */}
        {top_opportunities.length > 0 && (
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-accent" />
                Top Opportunities
              </CardTitle>
              <CardDescription>Your highest-leverage improvements</CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="multiple" className="w-full">
                {top_opportunities.map((opp, idx) => (
                  <AccordionItem key={idx} value={`opp-${idx}`}>
                    <AccordionTrigger className="text-left">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="shrink-0">{idx + 1}</Badge>
                        <span className="font-medium">{opp.title}</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-3 pl-8">
                      <div className="flex flex-wrap gap-1">
                        {opp.related_items.map((item) => (
                          <Badge key={item} variant="secondary" className="text-xs">{item}</Badge>
                        ))}
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Why it matters</p>
                        <p className="text-sm">{opp.why_it_matters}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Action</p>
                        <p className="text-sm">{opp.action}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Micro-drill</p>
                        <p className="text-sm">{opp.micro_drill}</p>
                      </div>
                      {opp.example_rewrite && (
                        <div className="bg-muted rounded-lg p-3">
                          <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Example rewrite</p>
                          <p className="text-sm italic">"{opp.example_rewrite}"</p>
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        )}

        {/* Transcript */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Interview Transcript</CardTitle>
            <CardDescription>Review your responses for future reference</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-muted rounded-lg p-4 text-sm font-mono leading-relaxed whitespace-pre-wrap max-h-96 overflow-y-auto">
              {transcript}
            </div>
          </CardContent>
        </Card>

        {/* Feedback */}
        <FeedbackWidget context="post_interview" sessionId={sessionId} />

        {/* Support Quick-Submit */}
        <InterviewSupportCard sessionId={sessionId} schoolName={schoolName} />

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {onRetry && (
            <Button variant="outline" size="lg" onClick={onRetry}>
              <RotateCcw className="h-5 w-5 mr-2" />
              Try Again
            </Button>
          )}
          <Link to="/dashboard">
            <Button size="lg" className="bg-gradient-primary hover:opacity-90">
              <Home className="h-5 w-5 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default InterviewResults;
