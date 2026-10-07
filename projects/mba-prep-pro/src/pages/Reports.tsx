import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { 
  BarChart3, 
  TrendingUp, 
  Clock, 
  Target,
  ArrowLeft,
  Trophy,
  BookOpen,
  Sparkles,
  FileText,
  Lightbulb,
  CheckCircle,
  ThumbsUp,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import FeedbackWidget from "@/components/FeedbackWidget";

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

const DIMENSION_LABELS: Record<string, string> = {
  substance: 'Substance',
  structure: 'Structure',
  presence: 'Presence',
};

interface SessionReport {
  id: string;
  session_type: string;
  status: string;
  overall_score: number | null;
  substance_score: number | null;
  structure_score: number | null;
  presence_score: number | null;
  duration_minutes: number | null;
  top_opportunities: any;
  detailed_evaluation: any;
  transcript: string | null;
  created_at: string;
  completed_at: string | null;
}

/** Extract top 3 strengths from a session's detailed_evaluation (checked items with justifications) */
const getSessionStrengths = (evaluation: any): { title: string; detail: string }[] => {
  if (!evaluation) return [];
  const strengths: { title: string; detail: string; dimension: string }[] = [];
  for (const dim of ['substance', 'structure', 'presence']) {
    const d = evaluation[dim];
    if (!d?.checked) continue;
    for (const item of d.checked) {
      strengths.push({
        title: ITEM_LABELS[item] || item,
        detail: d.justifications?.[item] || '',
        dimension: DIMENSION_LABELS[dim] || dim,
      });
    }
  }
  return strengths.slice(0, 3).map(s => ({
    title: `${s.title} (${s.dimension})`,
    detail: s.detail,
  }));
};

/** Get session opportunities from top_opportunities field */
const getSessionOpportunities = (topOpps: any): { title: string; action: string }[] => {
  if (!Array.isArray(topOpps)) return [];
  return topOpps.slice(0, 3).map((o: any) => ({
    title: o.title || '',
    action: o.action || '',
  }));
};

/** Aggregate cross-session themes */
const useAggregateThemes = (sessions: SessionReport[]) => {
  return useMemo(() => {
    const scored = sessions.filter(s => s.status === 'completed' && s.detailed_evaluation);

    // Aggregate strengths: count how often each item is checked
    const strengthCounts: Record<string, { count: number; dimension: string; lastJustification: string }> = {};
    // Aggregate opportunities: count how often each title appears
    const oppCounts: Record<string, { count: number; lastAction: string }> = {};

    for (const session of scored) {
      const eval_ = session.detailed_evaluation;
      if (eval_) {
        for (const dim of ['substance', 'structure', 'presence']) {
          const d = eval_[dim];
          if (!d?.checked) continue;
          for (const item of d.checked) {
            const key = item;
            if (!strengthCounts[key]) {
              strengthCounts[key] = { count: 0, dimension: DIMENSION_LABELS[dim] || dim, lastJustification: '' };
            }
            strengthCounts[key].count++;
            if (d.justifications?.[item]) {
              strengthCounts[key].lastJustification = d.justifications[item];
            }
          }
        }
      }

      if (Array.isArray(session.top_opportunities)) {
        for (const opp of session.top_opportunities) {
          const title = opp.title || '';
          if (!title) continue;
          if (!oppCounts[title]) {
            oppCounts[title] = { count: 0, lastAction: '' };
          }
          oppCounts[title].count++;
          if (opp.action) oppCounts[title].lastAction = opp.action;
        }
      }
    }

    const topStrengths = Object.entries(strengthCounts)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 3)
      .map(([item, data]) => ({
        title: ITEM_LABELS[item] || item,
        dimension: data.dimension,
        count: data.count,
        detail: data.lastJustification,
      }));

    const topOpportunities = Object.entries(oppCounts)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 3)
      .map(([title, data]) => ({
        title,
        count: data.count,
        action: data.lastAction,
      }));

    return { topStrengths, topOpportunities, totalSessions: scored.length };
  }, [sessions]);
};

const Reports = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<SessionReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSessions = async () => {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from('interview_sessions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setSessions(data || []);
      } catch (e) {
        console.error('Error fetching sessions:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchSessions();
  }, [user]);

  const completedSessions = sessions.filter(s => s.status === 'completed');
  const scoredSessions = completedSessions.filter(s => s.overall_score != null);
  const { topStrengths, topOpportunities, totalSessions } = useAggregateThemes(sessions);

  const averageScore = scoredSessions.length > 0
    ? scoredSessions.reduce((acc, s) => acc + (s.overall_score || 0), 0) / scoredSessions.length
    : 0;

  const avgDuration = completedSessions.length > 0
    ? Math.round(completedSessions.reduce((acc, s) => acc + (s.duration_minutes || 0), 0) / completedSessions.length)
    : 0;

  const improvement = scoredSessions.length >= 2
    ? (scoredSessions[0].overall_score || 0) - (scoredSessions[scoredSessions.length - 1].overall_score || 0)
    : 0;

  const getSchoolName = (sessionType: string) => {
    if (sessionType.startsWith('school_')) return `School Interview`;
    return 'General Interview';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 13) return 'Outstanding';
    if (score >= 10) return 'Strong';
    if (score >= 7) return 'Developing';
    if (score >= 4) return 'Needs Work';
    return 'Early Stage';
  };

  const getScoreVariant = (score: number): "default" | "secondary" | "outline" => {
    if (score >= 10) return "default";
    if (score >= 7) return "secondary";
    return "outline";
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/dashboard">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Link>
            </Button>
          </div>
          <h1 className="text-3xl font-bold text-foreground">Practice Reports</h1>
          <p className="text-muted-foreground">
            Track your interview performance and improvement over time.
          </p>
        </div>

        {/* Overview Stats */}
        <h2 className="text-xl font-semibold text-foreground">Performance overview</h2>
        <div className="grid md:grid-cols-3 gap-6">

          <Card className="shadow-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Sessions</p>
                  <p className="text-2xl font-bold text-foreground">{loading ? '...' : sessions.length}</p>
                </div>
                <div className="w-12 h-12 bg-primary-muted rounded-full flex items-center justify-center">
                  <BarChart3 className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Average Score</p>
                  <p className="text-2xl font-bold text-foreground">
                    {loading ? '...' : scoredSessions.length > 0 ? `${averageScore.toFixed(1)}/15` : '—'}
                  </p>
                </div>
                <div className="w-12 h-12 bg-success-muted rounded-full flex items-center justify-center">
                  <Target className="h-6 w-6 text-success" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Improvement</p>
                  <p className="text-2xl font-bold text-foreground">
                    {loading ? '...' : scoredSessions.length >= 2 ? `${improvement > 0 ? '+' : ''}${improvement.toFixed(1)}` : '—'}
                  </p>
                </div>
                <div className="w-12 h-12 bg-accent-muted rounded-full flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-accent" />
                </div>
              </div>
            </CardContent>
          </Card>

        </div>

        {/* Aggregate Themes — Top Strengths & Opportunities */}
        {!loading && totalSessions > 0 && (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Top Strengths */}
            <Card className="shadow-card border-success/20">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ThumbsUp className="h-5 w-5 text-success" />
                  Top Strengths
                </CardTitle>
                <CardDescription>
                  Consistent strengths across {totalSessions} session{totalSessions !== 1 ? 's' : ''}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {topStrengths.length > 0 ? topStrengths.map((s, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-success/5 rounded-lg">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-success/10 text-success text-xs font-bold shrink-0 mt-0.5">
                      {i + 1}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{s.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {s.dimension} • appeared in {s.count} session{s.count !== 1 ? 's' : ''}
                      </p>
                      {s.detail && <p className="text-xs text-muted-foreground mt-1">{s.detail}</p>}
                    </div>
                  </div>
                )) : (
                  <p className="text-sm text-muted-foreground">More sessions needed to identify patterns.</p>
                )}
              </CardContent>
            </Card>

            {/* Top Opportunities */}
            <Card className="shadow-card border-accent/20">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Lightbulb className="h-5 w-5 text-accent" />
                  Top Opportunities
                </CardTitle>
                <CardDescription>
                  Recurring areas for improvement
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {topOpportunities.length > 0 ? topOpportunities.map((o, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-accent/5 rounded-lg">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-accent/10 text-accent text-xs font-bold shrink-0 mt-0.5">
                      {i + 1}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{o.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        appeared in {o.count} session{o.count !== 1 ? 's' : ''}
                      </p>
                      {o.action && <p className="text-xs text-muted-foreground mt-1">{o.action}</p>}
                    </div>
                  </div>
                )) : (
                  <p className="text-sm text-muted-foreground">More sessions needed to identify patterns.</p>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Session History */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Interview History</CardTitle>
            <CardDescription>
              {completedSessions.length > 0
                ? 'Detailed breakdown of your practice sessions'
                : 'Complete your first interview to see your history'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : completedSessions.length === 0 ? (
              <div className="text-center py-12">
                <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <h3 className="font-medium text-foreground mb-2">No completed sessions yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Start a mock interview to see your performance tracked here.
                </p>
                <Button asChild>
                  <Link to="/mock-interview">Start Interview</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                {completedSessions.map((session) => {
                  const strengths = getSessionStrengths(session.detailed_evaluation);
                  const opportunities = getSessionOpportunities(session.top_opportunities);

                  return (
                    <div key={session.id} className="border rounded-lg p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <h3 className="font-semibold text-foreground">{getSchoolName(session.session_type)}</h3>
                          <p className="text-sm text-muted-foreground">
                            {new Date(session.created_at).toLocaleDateString()}
                            {session.duration_minutes ? ` • ${session.duration_minutes} min` : ''}
                          </p>
                        </div>
                        {session.overall_score != null && (
                          <div className="flex items-center space-x-4">
                            <div className="text-center">
                              <p className="text-2xl font-bold text-foreground">{session.overall_score}</p>
                              <p className="text-xs text-muted-foreground">/15</p>
                            </div>
                            <Badge variant={getScoreVariant(session.overall_score)}>
                              {getScoreLabel(session.overall_score)}
                            </Badge>
                          </div>
                        )}
                      </div>

                      {session.overall_score != null && (
                        <>
                          <Progress value={(session.overall_score / 15) * 100} className="h-2" />

                          <div className="grid grid-cols-3 gap-4">
                            <div className="flex items-center gap-2">
                              <BookOpen className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="text-sm font-medium">Substance</p>
                                <p className="text-xs text-muted-foreground">{session.substance_score ?? '—'}/5</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Target className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="text-sm font-medium">Structure</p>
                                <p className="text-xs text-muted-foreground">{session.structure_score ?? '—'}/5</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Sparkles className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="text-sm font-medium">Presence</p>
                                <p className="text-xs text-muted-foreground">{session.presence_score ?? '—'}/5</p>
                              </div>
                            </div>
                          </div>
                        </>
                      )}

                      {/* Per-session Strengths & Opportunities */}
                      {(strengths.length > 0 || opportunities.length > 0) && (
                        <div className="grid md:grid-cols-2 gap-4 pt-2">
                          {strengths.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-1">
                                <CheckCircle className="h-3 w-3 text-success" />
                                Top Strengths
                              </p>
                              {strengths.map((s, i) => (
                                <div key={i} className="text-sm pl-4 border-l-2 border-success/30">
                                  <p className="font-medium text-foreground">{s.title}</p>
                                  {s.detail && <p className="text-xs text-muted-foreground">{s.detail}</p>}
                                </div>
                              ))}
                            </div>
                          )}
                          {opportunities.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-1">
                                <Lightbulb className="h-3 w-3 text-accent" />
                                Top Opportunities
                              </p>
                              {opportunities.map((o, i) => (
                                <div key={i} className="text-sm pl-4 border-l-2 border-accent/30">
                                  <p className="font-medium text-foreground">{o.title}</p>
                                  {o.action && <p className="text-xs text-muted-foreground">{o.action}</p>}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {session.transcript && (
                        <Accordion type="single" collapsible className="w-full">
                          <AccordionItem value="transcript" className="border-none">
                            <AccordionTrigger className="py-2 text-sm hover:no-underline">
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <FileText className="h-4 w-4" />
                                View Transcript
                              </div>
                            </AccordionTrigger>
                            <AccordionContent>
                              <div className="bg-muted rounded-lg p-4 text-sm leading-relaxed whitespace-pre-wrap max-h-80 overflow-y-auto">
                                {session.transcript}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Feedback */}
        <FeedbackWidget context="report_review" />
      </div>
    </div>
  );
};

export default Reports;