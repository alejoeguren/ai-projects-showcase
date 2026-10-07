import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Upload, FileText, School, Mic, Trophy, Plus, User, Calendar, Clock, Target, TrendingUp, Play, BookOpen, Award, MapPin, AlertTriangle, X as XIcon } from "lucide-react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useOnboarding } from "@/hooks/useOnboarding";
import { useUserSchools } from "@/hooks/useUserSchools";
import { usePracticeStats } from "@/hooks/usePracticeStats";
import { useDocumentStats } from "@/hooks/useDocumentStats";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import CandidateProfile from "@/components/CandidateProfile";
import FeedbackWidget from "@/components/FeedbackWidget";
import { useToast } from "@/hooks/use-toast";
import { useAdmin } from "@/hooks/useAdmin";
import { Shield } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { toast as sonnerToast } from "sonner";

const Dashboard = () => {
  const { user } = useAuth();
  const [schoolsOverLimit, setSchoolsOverLimit] = useState(false);
  const [schoolsLimit, setSchoolsLimit] = useState<number | null>(null);
  const [removingSchool, setRemovingSchool] = useState<number | null>(null);

  const {
    isOnboardingComplete
  } = useOnboarding();
  const {
    userSchools,
    loading
  } = useUserSchools();
  const {
    stats,
    loading: statsLoading
  } = usePracticeStats();
  const {
    stats: docStats,
    loading: docLoading
  } = useDocumentStats();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin } = useAdmin();

  // Check if user has more schools than their tier allows
  useEffect(() => {
    const checkSchoolLimits = async () => {
      if (!user || loading) return;
      const { data: profile } = await supabase
        .from('profiles')
        .select('schools_limit, subscription_tier')
        .eq('user_id', user.id)
        .single();

      if (profile?.schools_limit && userSchools.length > profile.schools_limit) {
        setSchoolsOverLimit(true);
        setSchoolsLimit(profile.schools_limit);
      } else {
        setSchoolsOverLimit(false);
        setSchoolsLimit(profile?.schools_limit ?? null);
      }
    };
    checkSchoolLimits();
  }, [user, userSchools, loading]);

  const { removeSchool, fetchUserSchools } = useUserSchools();

  const handleRemoveSchool = async (schoolId: number) => {
    setRemovingSchool(schoolId);
    try {
      await removeSchool(schoolId);
      await fetchUserSchools();
      sonnerToast.success('School removed');
    } catch {
      sonnerToast.error('Failed to remove school');
    } finally {
      setRemovingSchool(null);
    }
  };

  const handleStartInterview = () => {
    if (schoolsOverLimit) {
      sonnerToast.error(`Please reduce your schools to ${schoolsLimit} before starting an interview.`, { duration: 5000 });
      return;
    }

    if (userSchools.length === 0) {
      toast({
        title: "Select Schools First",
        description: "Please select at least one target school before starting an interview.",
        variant: "destructive",
      });
      navigate('/schools');
      return;
    }

    if (!docStats.hasResume) {
      toast({
        title: "Upload Resume First",
        description: "Please upload your resume before starting an interview.",
        variant: "destructive",
      });
      navigate('/documents');
      return;
    }

    navigate('/mock-interview');
  };


  return <div className="bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* School Limit Warning */}
        {schoolsOverLimit && schoolsLimit && (
          <Alert className="mb-6 border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-800 dark:text-amber-200">Too Many Schools Selected</AlertTitle>
            <AlertDescription className="text-amber-700 dark:text-amber-300">
              Your plan allows up to <strong>{schoolsLimit}</strong> school{schoolsLimit > 1 ? 's' : ''}, but you have <strong>{userSchools.length}</strong> selected. 
              Please remove {userSchools.length - schoolsLimit} school{userSchools.length - schoolsLimit > 1 ? 's' : ''} to continue using the platform, or{' '}
              <Link to="/pricing" className="underline font-medium">upgrade your plan</Link>.
            </AlertDescription>
          </Alert>
        )}

        {/* Welcome Section */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">MBA Interview Dashboard</h1>
            <p className="text-muted-foreground">Continue your MBA interview preparation journey with AI-powered personalized practice.</p>
          </div>
          {isAdmin && (
            <Button variant="outline" onClick={() => navigate('/admin')} className="gap-2">
              <Shield className="h-4 w-4" />
              Admin Panel
            </Button>
          )}
        </div>

        {/* Quick Actions - moved to top */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="h-5 w-5" />
              Quick Actions
            </CardTitle>
            <CardDescription>
              Start your interview preparation journey
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button size="lg" className="h-24 flex flex-col space-y-2 bg-gradient-primary hover:opacity-90" onClick={handleStartInterview}>
              <Mic className="h-8 w-8" />
              <span>Start Practice Interview</span>
            </Button>
            
            <Button size="lg" variant="outline" className="h-24 flex flex-col space-y-2 hover:shadow-card-hover transition-all" onClick={() => navigate('/schools')}>
              <School className="h-8 w-8 text-accent" />
              <span>Browse Schools</span>
            </Button>
            
            <Button size="lg" variant="outline" className="h-24 flex flex-col space-y-2 hover:shadow-card-hover transition-all" onClick={() => navigate('/study-materials')}>
              <BookOpen className="h-8 w-8 text-primary" />
              <span>Study Materials</span>
            </Button>
            
            <Button size="lg" variant="outline" className="h-24 flex flex-col space-y-2 hover:shadow-card-hover transition-all" onClick={() => navigate('/reports')}>
              <Trophy className="h-8 w-8 text-success" />
              <span>View Progress</span>
            </Button>
          </CardContent>
        </Card>

        {/* Progress Overview */}
        <h2 className="text-xl font-semibold text-foreground mb-4">Your progress</h2>
        <div className="grid md:grid-cols-3 gap-6 mb-8">

          {/* Target Schools */}
          <Card className="shadow-card cursor-pointer hover:shadow-card-hover transition-all" onClick={() => navigate('/schools')}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-accent-muted rounded-full flex items-center justify-center">
                  <School className="h-6 w-6 text-accent" />
                </div>
                <Badge variant="secondary">{userSchools.length} Selected</Badge>
              </div>
              <h3 className="font-semibold text-foreground mb-2">Target Schools</h3>
              <p className="text-sm text-muted-foreground mb-3">Choose your MBA programs</p>
              <Progress value={schoolsLimit ? Math.min((userSchools.length / schoolsLimit) * 100, 100) : (userSchools.length > 0 ? 100 : 0)} className="h-2" />
            </CardContent>
          </Card>

          {/* Practice Sessions */}
          <Card className="shadow-card cursor-pointer hover:shadow-card-hover transition-all" onClick={handleStartInterview}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-success-muted rounded-full flex items-center justify-center">
                  <Trophy className="h-6 w-6 text-success" />
                </div>
                <Badge variant="secondary">
                  {statsLoading ? '...' : `${stats.completedSessions} Completed`}
                </Badge>
              </div>
              <h3 className="font-semibold text-foreground mb-2">Practice Sessions</h3>
              <p className="text-sm text-muted-foreground mb-3">Mock interviews completed</p>
              <Progress value={stats.completedSessions > 0 ? Math.min(stats.completedSessions / 10 * 100, 100) : 0} className="h-2" />
            </CardContent>
          </Card>

          {/* Latest Practice Session Score */}
          <Card className="shadow-card cursor-pointer hover:shadow-card-hover transition-all" onClick={() => navigate('/reports')}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-primary-muted rounded-full flex items-center justify-center">
                  <Award className="h-6 w-6 text-primary" />
                </div>
                <Badge variant="secondary">
                  {statsLoading ? '...' : stats.overallScore !== null ? `${Math.round(stats.overallScore)}/15` : 'N/A'}
                </Badge>
              </div>
              <h3 className="font-semibold text-foreground mb-2">Latest Practice Score</h3>
              <p className="text-sm text-muted-foreground mb-3">
                {stats.overallScore !== null ? 'Your most recent interview score' : 'Complete an interview to see your score'}
              </p>
              <Progress value={stats.overallScore !== null ? (stats.overallScore / 15) * 100 : 0} className="h-2" />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {/* Your Schools Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <School className="h-5 w-5" />
                Your Target Schools
              </CardTitle>
              <CardDescription>
                {userSchools.length > 0 ? 'Schools you selected for interview preparation' : 'Add schools to get personalized interview practice'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div> : userSchools.length > 0 ? <div className="space-y-4">
                  {userSchools.map(userSchool => <div key={userSchool.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted transition-colors" onClick={() => navigate('/reports')}>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary-muted rounded-full flex items-center justify-center">
                          <School className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h4 className="font-medium text-foreground">{userSchool.school?.name || 'Unknown School'}</h4>
                          <div className="flex items-center text-sm text-muted-foreground">
                            <MapPin className="h-3 w-3 mr-1" />
                            {userSchool.school?.location || 'Location not available'}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          {userSchool.interviews_limit >= 9999 ? 'Unlimited' : `${userSchool.interviews_used}/${userSchool.interviews_limit}`} interviews
                        </Badge>
                        {schoolsOverLimit ? (
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={removingSchool === userSchool.school_id}
                            onClick={(e) => { e.stopPropagation(); handleRemoveSchool(userSchool.school_id); }}
                          >
                            {removingSchool === userSchool.school_id ? '...' : 'Remove'}
                          </Button>
                        ) : (
                          <Button size="sm" variant="ghost" asChild onClick={(e) => e.stopPropagation()}>
                            <Link to={`/mock-interview?school=${userSchool.school_id}`}>
                              Practice
                            </Link>
                          </Button>
                        )}
                      </div>
                    </div>)}
                  <Button variant="outline" className="w-full" asChild>
                    <Link to="/schools">
                      <Plus className="h-4 w-4 mr-2" />
                      Add More Schools
                    </Link>
                  </Button>
                </div> : <div className="text-center py-8">
                  <School className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-medium text-foreground mb-2">No schools selected yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Select your target MBA programs to get personalized interview practice.
                  </p>
                  <Button asChild>
                    <Link to="/schools">
                      <Plus className="h-4 w-4 mr-2" />
                      Select Schools
                    </Link>
                  </Button>
                </div>}
            </CardContent>
          </Card>

          {/* Practice Stats */}
          <Card className="cursor-pointer hover:shadow-card-hover transition-all" onClick={() => navigate('/reports')}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Practice Stats
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {statsLoading ? <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div> : stats.completedSessions === 0 ? <div className="text-center py-6">
                  <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                  <p className="text-sm text-muted-foreground">
                    No practice sessions yet. Start your first mock interview to see your stats!
                  </p>
                </div> : <>
                  {stats.overallScore !== null && <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Overall Score</span>
                        <span className="font-medium">{Math.round(stats.overallScore)}/15</span>
                      </div>
                      <Progress value={(stats.overallScore / 15) * 100} className="h-2" />
                    </div>}
                  
                  <div className="grid grid-cols-3 gap-4 pt-2">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-foreground">{stats.completedSessions}</p>
                      <p className="text-xs text-muted-foreground">Completed</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-foreground">{stats.totalSessions}</p>
                      <p className="text-xs text-muted-foreground">Total Sessions</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-foreground">
                        {stats.overallScore !== null ? `${Math.round(stats.overallScore)}/15` : '—'}
                      </p>
                      <p className="text-xs text-muted-foreground">Avg Score</p>
                    </div>
                  </div>
                </>}
            </CardContent>
          </Card>

          {/* Candidate Profile */}
          <CandidateProfile />

          {/* Feedback */}
          <FeedbackWidget context="dashboard" />
        </div>
      </div>
    </div>;
};
export default Dashboard;