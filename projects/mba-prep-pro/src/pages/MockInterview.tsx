import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mic, MicOff, Play, X, Star, MapPin, FileWarning, AlertCircle, Phone, Upload, FileText, Loader2, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useDocumentStats } from '@/hooks/useDocumentStats';
import { useSchools } from '@/hooks/useSchools';
import { useUserSchools } from '@/hooks/useUserSchools';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import InterviewTimer from '@/components/interview/InterviewTimer';
import LoadingScreen from '@/components/interview/LoadingScreen';
import InterviewResults from '@/components/interview/InterviewResults';
import PreInterviewTips from '@/components/interview/PreInterviewTips';
import { toast as sonnerToast } from 'sonner';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

type InterviewState = 'ready' | 'prep' | 'loading' | 'active' | 'evaluating' | 'completed';
type Message = {
  role: 'interviewer' | 'candidate';
  content: string;
  timestamp: Date;
};

const formatDocType = (type: string): string => {
  return type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, ' ');
};

const MockInterview = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { stats: docStats, hasRequiredDocuments, loading: docLoading, refetch: refetchDocs } = useDocumentStats();
  const { schools, loading: schoolsLoading } = useSchools();
  const { userSchools, loading: userSchoolsLoading } = useUserSchools();
  const { user } = useAuth();
  const schoolId = searchParams.get('school');
  const schoolName = searchParams.get('name') || 'General MBA Interview';

  const [interviewState, setInterviewState] = useState<InterviewState>('ready');
  const [selectedSchoolId, setSelectedSchoolId] = useState<number | null>(null);
  const [interviewStartTime, setInterviewStartTime] = useState<Date | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [hasStarted, setHasStarted] = useState(false);
  const [evaluationResults, setEvaluationResults] = useState<import('@/components/interview/InterviewResults').EvaluationResult | null>(null);
  const [evaluationFailed, setEvaluationFailed] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isRetryingEvaluation, setIsRetryingEvaluation] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [aiSpeaking, setAiSpeaking] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<string>('');
  const [fullAppDialogOpen, setFullAppDialogOpen] = useState(false);
  const [fullAppSchool, setFullAppSchool] = useState<any>(null);
  const [isUploadingFullApp, setIsUploadingFullApp] = useState(false);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  const userSelectedSchools = schools.filter(school =>
    userSchools.some(us => us.school_id === school.id)
  );

  useEffect(() => {
    if (interviewState === 'active' && hasStarted && !interviewStartTime) {
      setInterviewStartTime(new Date());
    }
  }, [interviewState, hasStarted, interviewStartTime]);

  // Cleanup WebRTC on unmount
  useEffect(() => {
    return () => {
      cleanupWebRTC();
    };
  }, []);

  const cleanupWebRTC = useCallback(() => {
    if (dcRef.current) {
      try { dcRef.current.close(); } catch (e) { /* ignore */ }
      dcRef.current = null;
    }
    if (pcRef.current) {
      try { pcRef.current.close(); } catch (e) { /* ignore */ }
      pcRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    if (audioElRef.current) {
      audioElRef.current.srcObject = null;
      audioElRef.current = null;
    }
  }, []);

  const handleDataChannelMessage = useCallback((event: MessageEvent) => {
    try {
      const msg = JSON.parse(event.data);

      if (msg.type === 'response.audio_transcript.done') {
        // AI finished a complete response
        const text = msg.transcript;
        if (text) {
          setMessages(prev => [...prev, {
            role: 'interviewer',
            content: text,
            timestamp: new Date()
          }]);
        }
        setAiSpeaking(false);
      } else if (msg.type === 'response.audio.delta') {
        setAiSpeaking(true);
      } else if (msg.type === 'conversation.item.input_audio_transcription.completed') {
        // User speech transcribed
        const text = msg.transcript;
        if (text?.trim()) {
          setMessages(prev => [...prev, {
            role: 'candidate',
            content: text.trim(),
            timestamp: new Date()
          }]);
        }
      } else if (msg.type === 'response.done') {
        setAiSpeaking(false);
      } else if (msg.type === 'error') {
        console.error('Realtime API error:', msg.error);
        toast({
          title: "Interview Error",
          description: msg.error?.message || "An error occurred",
          variant: "destructive",
        });
      }
    } catch (e) {
      // Non-JSON message, ignore
    }
  }, [toast]);

  const startWebRTCSession = async () => {
    setIsConnecting(true);
    setConnectionStatus('Getting microphone access...');

    try {
      // 1. Get microphone
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;

      setConnectionStatus('Creating interview session...');

      // 2. Get ephemeral token from our edge function
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Not authenticated');

      const selectedSchool = schools.find(s => s.id === selectedSchoolId);
      const currentSchoolName = selectedSchool?.name || schoolName;

      const tokenResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/realtime-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          schoolName: currentSchoolName,
          schoolId: selectedSchoolId,
        }),
      });

      if (!tokenResponse.ok) {
        const err = await tokenResponse.json();
        throw new Error(err.error || 'Failed to create session');
      }

      const { client_secret, model: realtimeModel } = await tokenResponse.json();
      const ephemeralKey = client_secret.value;
      const sdpModel = realtimeModel || 'gpt-realtime';

      setConnectionStatus('Connecting to interviewer...');

      // 3. Create WebRTC peer connection
      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      // Set up remote audio playback
      const audioEl = document.createElement('audio');
      audioEl.autoplay = true;
      audioElRef.current = audioEl;

      pc.ontrack = (event) => {
        audioEl.srcObject = event.streams[0];
      };

      // Add local mic track
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      // Create data channel for events
      const dc = pc.createDataChannel('oai-events');
      dcRef.current = dc;

      dc.onopen = () => {
        console.log('Data channel open');
        // Send a response.create to trigger the initial greeting
        dc.send(JSON.stringify({
          type: 'response.create',
        }));
      };

      dc.onmessage = handleDataChannelMessage;

      // 4. Create offer and connect
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const sdpResponse = await fetch(`https://api.openai.com/v1/realtime/calls?model=${encodeURIComponent(sdpModel)}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ephemeralKey}`,
          'Content-Type': 'application/sdp',
        },
        body: offer.sdp,
      });

      if (!sdpResponse.ok) {
        throw new Error(`WebRTC SDP exchange failed: ${sdpResponse.status}`);
      }

      const answerSdp = await sdpResponse.text();
      await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });

      pc.oniceconnectionstatechange = () => {
        console.log('ICE state:', pc.iceConnectionState);
        if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
          setConnectionStatus('');
          setIsConnecting(false);
          setHasStarted(true);
          setInterviewStartTime(new Date());
        } else if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
          toast({
            title: "Connection Lost",
            description: "The interview connection was interrupted.",
            variant: "destructive",
          });
        }
      };

    } catch (error: any) {
      console.error('WebRTC setup error:', error);
      setIsConnecting(false);
      setConnectionStatus('');
      toast({
        title: "Connection Failed",
        description: error.message || "Could not start the interview. Please try again.",
        variant: "destructive",
      });
    }
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const getSchoolInterviewStatus = (schoolId: number) => {
    const userSchool = userSchools.find(us => us.school_id === schoolId);
    if (!userSchool) return { available: false, used: 0, limit: 0, exhausted: true };
    const used = userSchool.interviews_used ?? 0;
    const limit = userSchool.interviews_limit ?? 0;
    const isUnlimited = limit >= 9999;
    return { available: isUnlimited || used < limit, used, limit, exhausted: !isUnlimited && used >= limit, isUnlimited };
  };

  const [purchasingSchoolId, setPurchasingSchoolId] = useState<number | null>(null);

  const handlePurchaseAddon = async (schoolId: number) => {
    setPurchasingSchoolId(schoolId);
    try {
      const { data, error } = await supabase.functions.invoke('create-payment', {
        body: { type: 'addon', school_id: schoolId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      console.error('Payment error:', err);
      sonnerToast.error(err.message || 'Failed to start checkout');
    } finally {
      setPurchasingSchoolId(null);
    }
  };

  const handleStartInterviewWithSchool = (school: any) => {
    // Check interview availability first
    const status = getSchoolInterviewStatus(school.id);
    if (status.exhausted) {
      sonnerToast.error(
        `No interviews remaining for ${school.name}`,
        {
          description: 'Purchase an additional interview to continue practicing.',
          duration: 5000,
        }
      );
      return;
    }

    // Only require resume - school-specific materials are optional enhancements
    if (!docStats.hasResume) {
      sonnerToast.error(
        `Please upload your resume first`,
        {
          description: `A resume is required before starting an interview.`,
          duration: 5000,
        }
      );
      return;
    }

    // Check if school requires full application
    if (school.required_documents?.includes('full_application')) {
      // Check if they already uploaded it
      const hasFullApp = docStats.documentTypes.includes('full_application') || 
        docStats.documentTypes.includes('other'); // check for school materials
      
      if (!hasFullApp) {
        setFullAppSchool(school);
        setFullAppDialogOpen(true);
        return;
      }
    }

    setSelectedSchoolId(school.id);
    setInterviewState('prep');
  };

  const handleFullAppUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user || !fullAppSchool) return;

    try {
      setIsUploadingFullApp(true);

      const fileExt = file.name.split('.').pop();
      const randomPrefix = crypto.randomUUID();
      const fileName = `${randomPrefix}-${fullAppSchool.name.replace(/\s+/g, '_').toLowerCase()}_app.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { error: docError } = await supabase
        .from('documents')
        .insert({
          user_id: user.id,
          title: `${fullAppSchool.name} Materials`,
          file_name: fileName,
          file_path: filePath,
          file_size: file.size,
          file_type: file.type,
          document_type: 'other'
        });
      if (docError) throw docError;

      await refetchDocs();
      sonnerToast.success(`${fullAppSchool.name} application uploaded!`);
      setFullAppDialogOpen(false);
      
      // Now start the interview
      setSelectedSchoolId(fullAppSchool.id);
      setInterviewState('prep');
    } catch (error) {
      console.error('Upload error:', error);
      sonnerToast.error('Failed to upload application');
    } finally {
      setIsUploadingFullApp(false);
    }
  };

  const handleSkipFullApp = () => {
    setFullAppDialogOpen(false);
    if (fullAppSchool) {
      setSelectedSchoolId(fullAppSchool.id);
      setInterviewState('prep');
    }
  };

  const handleLoadingComplete = async () => {
    setInterviewState('active');
    setHasStarted(false);
    setMessages([]);
  };

  const handleBeginInterview = () => {
    startWebRTCSession();
  };

  const handleInterviewComplete = async () => {
    // Stop WebRTC
    cleanupWebRTC();

    // If the user never actually started (clicked "Begin Interview"), don't count it
    if (!hasStarted || messages.length === 0) {
      sonnerToast.info('Interview exited — no credit was used.');
      navigate('/dashboard');
      return;
    }

    setInterviewState('evaluating');

    const duration = calculateDuration();
    const selectedSchool = schools.find(s => s.id === selectedSchoolId);
    const currentSchoolName = selectedSchool?.name || schoolName;

    let createdSessionId: string | null = null;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Not authenticated');
      const userId = session.user.id;

      // 1. Create interview session record
      const durationMinutes = interviewStartTime
        ? Math.round((Date.now() - interviewStartTime.getTime()) / 60000)
        : 0;

      const { data: sessionRecord, error: sessionError } = await supabase
        .from('interview_sessions')
        .insert({
          user_id: userId,
          session_type: selectedSchool ? `school_${selectedSchoolId}` : 'general',
          status: 'evaluating',
          started_at: interviewStartTime?.toISOString() || new Date().toISOString(),
          duration_minutes: durationMinutes,
        })
        .select('id')
        .single();

      if (sessionError) {
        console.error('Failed to create session record:', sessionError);
      } else if (sessionRecord?.id) {
        createdSessionId = sessionRecord.id;
        setCurrentSessionId(sessionRecord.id);
      }

      // 2. Track school interview usage
      if (selectedSchoolId) {
        try {
          await supabase.rpc('use_school_interview', {
            _user_id: userId,
            _school_id: selectedSchoolId,
          });
        } catch (e) {
          console.error('Failed to track interview usage:', e);
        }
      }

      // 3. Evaluate with session ID so results get saved
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/evaluate-interview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          messages,
          schoolName: currentSchoolName,
          duration,
          sessionId: createdSessionId,
        }),
      });

      if (!response.ok) throw new Error('Evaluation failed');

      const evaluation = await response.json();
      setEvaluationResults(evaluation);
      setEvaluationFailed(false);
    } catch (error) {
      console.error('Evaluation error:', error);

      // Mark session as failed in DB so we can retry
      if (createdSessionId) {
        const transcript = messages
          .map(msg => `${msg.role === 'interviewer' ? 'INTERVIEWER' : 'CANDIDATE'}: ${msg.content}`)
          .join('\n\n');
        await supabase
          .from('interview_sessions')
          .update({ status: 'failed', transcript })
          .eq('id', createdSessionId);
      }

      setEvaluationFailed(true);
      setEvaluationResults(null);
      toast({
        title: "Evaluation Failed",
        description: "Could not generate AI feedback. You can retry the evaluation.",
        variant: "destructive",
      });
    }

    setInterviewState('completed');
  };

  const retryEvaluation = async () => {
    if (!currentSessionId || messages.length === 0) return;

    setIsRetryingEvaluation(true);
    setEvaluationFailed(false);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Not authenticated');

      const selectedSchool = schools.find(s => s.id === selectedSchoolId);
      const currentSchoolName = selectedSchool?.name || schoolName;
      const duration = calculateDuration();

      // Update session status to evaluating
      await supabase
        .from('interview_sessions')
        .update({ status: 'evaluating' })
        .eq('id', currentSessionId);

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/evaluate-interview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          messages,
          schoolName: currentSchoolName,
          duration,
          sessionId: currentSessionId,
        }),
      });

      if (!response.ok) throw new Error('Evaluation failed');

      const evaluation = await response.json();
      setEvaluationResults(evaluation);
      setEvaluationFailed(false);

      toast({
        title: "Evaluation Complete",
        description: "Your interview has been scored successfully!",
      });
    } catch (error) {
      console.error('Retry evaluation error:', error);
      setEvaluationFailed(true);

      await supabase
        .from('interview_sessions')
        .update({ status: 'failed' })
        .eq('id', currentSessionId);

      toast({
        title: "Retry Failed",
        description: "Could not evaluate. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRetryingEvaluation(false);
    }
  };

  const calculateDuration = () => {
    if (!interviewStartTime) return '0:00';
    const now = new Date();
    const diff = Math.floor((now.getTime() - interviewStartTime.getTime()) / 1000);
    const minutes = Math.floor(diff / 60);
    const seconds = diff % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (interviewState === 'prep') {
    const selectedSchool = schools.find(s => s.id === selectedSchoolId);
    const currentSchoolName = selectedSchool?.name || schoolName;
    return (
      <PreInterviewTips
        schoolName={currentSchoolName}
        onStart={() => setInterviewState('loading')}
        onBack={() => {
          setInterviewState('ready');
          setSelectedSchoolId(null);
        }}
      />
    );
  }

  if (interviewState === 'loading') {
    return <LoadingScreen onComplete={handleLoadingComplete} />;
  }

  if (interviewState === 'evaluating') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-6">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto"></div>
          <h2 className="text-2xl font-semibold text-foreground">Evaluating Your Interview...</h2>
          <p className="text-muted-foreground">Our AI is analyzing your responses</p>
        </div>
      </div>
    );
  }

  if (interviewState === 'completed' && evaluationFailed) {
    const transcript = messages
      .map(msg => `${msg.role.toUpperCase()}: ${msg.content}`)
      .join('\n\n');

    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-lg w-full shadow-card">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <CardTitle className="text-2xl">Evaluation Pending</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-muted-foreground">
              Your interview was recorded but the AI evaluation could not be completed. 
              Your transcript has been saved — click below to retry scoring.
            </p>
            <div className="flex flex-col gap-3">
              <Button 
                onClick={retryEvaluation} 
                disabled={isRetryingEvaluation}
                className="bg-gradient-primary hover:opacity-90"
              >
                {isRetryingEvaluation ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Retrying Evaluation...
                  </>
                ) : (
                  'Retry Evaluation'
                )}
              </Button>
              <Button variant="outline" onClick={() => navigate('/dashboard')}>
                Back to Dashboard
              </Button>
            </div>
            {transcript && (
              <details className="text-left mt-4">
                <summary className="text-sm text-muted-foreground cursor-pointer">View Transcript</summary>
                <div className="bg-muted rounded-lg p-3 mt-2 text-xs font-mono leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">
                  {transcript}
                </div>
              </details>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (interviewState === 'completed' && evaluationResults) {
    const selectedSchool = schools.find(s => s.id === selectedSchoolId);
    const currentSchoolName = selectedSchool?.name || schoolName;
    const transcript = messages
      .map(msg => `${msg.role.toUpperCase()}: ${msg.content}`)
      .join('\n\n');

    return (
      <InterviewResults
        evaluation={evaluationResults}
        duration={calculateDuration()}
        transcript={transcript}
        schoolName={currentSchoolName}
        onRetry={() => {
          setInterviewState('ready');
          setSelectedSchoolId(null);
          setMessages([]);
          setInterviewStartTime(null);
          setEvaluationResults(null);
          setIsMuted(false);
          setAiSpeaking(false);
        }}
      />
    );
  }

  if (interviewState === 'ready') {
    const isLoading = schoolsLoading || userSchoolsLoading || docLoading;

    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          {/* Exit Button */}
          <div className="mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/dashboard')}
              className="flex items-center space-x-2"
            >
              <X className="h-4 w-4" />
              <span>Exit Interview</span>
            </Button>
          </div>

          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="text-center space-y-4 mb-8">
              <h1 className="text-4xl font-bold text-foreground">
                Mock Interview
              </h1>
              <p className="text-xl text-muted-foreground">
                Choose a school to practice your MBA interview
              </p>
            </div>

            {isLoading ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Loading schools...</p>
              </div>
            ) : userSelectedSchools.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {userSelectedSchools.map((school) => {
                  const hasResume = docStats.hasResume;
                  const interviewStatus = getSchoolInterviewStatus(school.id);
                  const isExhausted = interviewStatus.exhausted;
                  const isPurchasing = purchasingSchoolId === school.id;

                  return (
                    <Card
                      key={school.id}
                      className={`shadow-card transition-all ${
                        isExhausted
                          ? 'border-amber-500/50'
                          : hasResume
                          ? 'hover:shadow-card-hover cursor-pointer hover:scale-105'
                          : 'opacity-75 border-destructive/50'
                      }`}
                      onClick={() => !isExhausted && handleStartInterviewWithSchool(school)}
                    >
                      <CardHeader>
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Star className="h-5 w-5 text-accent fill-current" />
                            {school.ranking && <Badge variant="outline">#{school.ranking}</Badge>}
                          </div>
                          {isExhausted ? (
                            <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                              {interviewStatus.used}/{interviewStatus.limit} Used
                            </Badge>
                          ) : hasResume ? (
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {interviewStatus.isUnlimited ? '∞' : `${interviewStatus.used}/${interviewStatus.limit}`}
                              </Badge>
                              <Play className="h-6 w-6 text-primary" />
                            </div>
                          ) : (
                            <FileWarning className="h-6 w-6 text-destructive" />
                          )}
                        </div>
                        <CardTitle className="text-lg mb-1">{school.name}</CardTitle>
                        <div className="flex items-center text-muted-foreground text-sm">
                          <MapPin className="h-4 w-4 mr-1" />
                          {school.location}
                        </div>
                      </CardHeader>

                      <CardContent>
                        {isExhausted && (
                          <Alert className="mb-4 border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
                            <AlertCircle className="h-4 w-4 text-amber-600" />
                            <AlertTitle className="text-amber-800 dark:text-amber-200">Interviews Exhausted</AlertTitle>
                            <AlertDescription className="text-xs text-amber-700 dark:text-amber-300">
                              You've used all {interviewStatus.limit} interviews. Purchase an additional one to continue.
                            </AlertDescription>
                          </Alert>
                        )}

                        {!hasResume && !isExhausted && (
                          <Alert variant="destructive" className="mb-4">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Resume Required</AlertTitle>
                            <AlertDescription className="text-xs">
                              Please upload your resume before starting an interview.
                            </AlertDescription>
                          </Alert>
                        )}

                        <p className="text-muted-foreground mb-4 text-sm leading-relaxed">
                          {school.description}
                        </p>

                        {/* Specialties */}
                        {school.specialties && school.specialties.length > 0 && (
                          <div className="mb-4">
                            <div className="flex flex-wrap gap-1">
                              {school.specialties.slice(0, 2).map((specialty: string) => (
                                <Badge key={specialty} variant="outline" className="text-xs">
                                  {specialty}
                                </Badge>
                              ))}
                              {school.specialties.length > 2 && (
                                <Badge variant="outline" className="text-xs">
                                  +{school.specialties.length - 2}
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}

                        {isExhausted ? (
                          <Button
                            className="w-full"
                            variant="default"
                            disabled={isPurchasing}
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePurchaseAddon(school.id);
                            }}
                          >
                            {isPurchasing ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Processing...
                              </>
                            ) : (
                              <>
                                <Plus className="h-4 w-4 mr-2" />
                                Buy Additional Interview — $25
                              </>
                            )}
                          </Button>
                        ) : (
                          /* Stats */
                          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                            <div className="text-center">
                              <p className="text-sm font-medium text-foreground">{school.acceptance_rate || 'N/A'}</p>
                              <p className="text-xs text-muted-foreground">Accept Rate</p>
                            </div>
                            <div className="text-center">
                              <p className="text-sm font-medium text-foreground">{school.avg_gmat || 'N/A'}</p>
                              <p className="text-xs text-muted-foreground">Avg GMAT</p>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-lg text-muted-foreground mb-4">
                  No schools selected yet
                </p>
                <Button
                  variant="outline"
                  onClick={() => navigate('/schools')}
                >
                  Select Schools
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Full Application Upload Dialog */}
        <Dialog open={fullAppDialogOpen} onOpenChange={setFullAppDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Full Application Required
              </DialogTitle>
              <DialogDescription>
                {fullAppSchool?.name} requires a full application for the best interview experience. Upload your application now, or skip and proceed without it.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <input
                id="full-app-upload"
                type="file"
                accept=".pdf"
                onChange={handleFullAppUpload}
                className="hidden"
              />
              {isUploadingFullApp ? (
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                  <Loader2 className="h-8 w-8 text-primary mx-auto mb-2 animate-spin" />
                  <p className="text-sm text-muted-foreground">Uploading application...</p>
                </div>
              ) : (
                <label htmlFor="full-app-upload" className="cursor-pointer block">
                  <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors hover:bg-muted/50">
                    <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm font-medium text-foreground">Upload Full Application</p>
                    <p className="text-xs text-muted-foreground mt-1">PDF only, up to 10MB</p>
                  </div>
                </label>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleSkipFullApp} disabled={isUploadingFullApp}>
                Skip & Start Interview
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Exit Button - Top Left */}
      <div className="absolute top-4 left-4 z-50">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/dashboard')}
          className="flex items-center space-x-2"
        >
          <X className="h-4 w-4" />
          <span>Exit</span>
        </Button>
      </div>

      {/* Main Content - Centered */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="max-w-2xl w-full text-center space-y-8">
          {/* School Badge */}
          <Badge variant="secondary" className="px-4 py-2 text-lg">
            {schools.find(s => s.id === selectedSchoolId)?.name || 'Mock Interview'}
          </Badge>

          {/* Timer - Large and Central */}
          <div className="py-8">
            <InterviewTimer onComplete={handleInterviewComplete} maxDuration={1920} displayDuration={1800} />
          </div>

          {!hasStarted ? (
            <div className="py-8 space-y-4">
              <Button
                size="lg"
                onClick={handleBeginInterview}
                className="px-8 py-6"
                disabled={isConnecting}
              >
                {isConnecting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Mic className="h-5 w-5 mr-2" />
                    Let's begin
                  </>
                )}
              </Button>
              {connectionStatus && (
                <p className="text-sm text-muted-foreground animate-pulse">{connectionStatus}</p>
              )}
            </div>
          ) : (
            <>
              {/* Status Text */}
              <div className="space-y-4">
                <h2 className="text-2xl font-semibold text-foreground">
                  {aiSpeaking ? "Interviewer is speaking..." : "I'm listening..."}
                </h2>
                <p className="text-lg text-muted-foreground">
                  {aiSpeaking
                    ? 'Listen to the interviewer'
                    : 'Speak naturally — the interviewer will respond when you pause'
                  }
                </p>
              </div>

              {/* Microphone Button - Mute/Unmute Toggle */}
              <div className="py-8">
                <Button
                  size="lg"
                  variant={isMuted ? "default" : "destructive"}
                  onClick={toggleMute}
                  className={`w-24 h-24 rounded-full text-white shadow-lg hover:shadow-xl transition-all ${
                    isMuted
                      ? 'bg-primary hover:bg-primary/90'
                      : 'animate-pulse bg-destructive hover:bg-destructive/90'
                  }`}
                >
                  {isMuted ? (
                    <MicOff className="h-10 w-10" />
                  ) : (
                    <Mic className="h-10 w-10" />
                  )}
                </Button>
                <p className="text-sm text-muted-foreground mt-2">
                  {isMuted ? 'Mic muted — click to unmute' : 'Mic active — click to mute'}
                </p>
              </div>
            </>
          )}

          {/* End Interview Button */}
          <Button
            variant="outline"
            onClick={handleInterviewComplete}
            className="px-8 py-3"
          >
            <Phone className="h-4 w-4 mr-2 rotate-[135deg]" />
            End Interview
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MockInterview;
