import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Upload, Check, ArrowRight, ArrowLeft, Brain, Info, FileText, Sparkles, Building2 } from 'lucide-react';
import { useOnboarding } from '@/hooks/useOnboarding';
import { useCandidateMetadata } from '@/hooks/useCandidateMetadata';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import OnboardingLayout from './OnboardingLayout';
import { Separator } from '@/components/ui/separator';
import {
  Alert,
  AlertDescription,
} from "@/components/ui/alert";

const ResumeUpload = () => {
  const { 
    selectedSchools, 
    hasUploadedResume, 
    setHasUploadedResume, 
    setCurrentStep, 
    completeOnboarding,
    canSkipToComplete
  } = useOnboarding();
  
  const { processResumeDocument, isProcessing, metadata, refetch } = useCandidateMetadata();
  const { user } = useAuth();
  
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [fullAppSchools, setFullAppSchools] = useState<string[]>([]);

  // Check if any selected schools require full application
  useEffect(() => {
    const checkFullAppSchools = async () => {
      if (selectedSchools.length === 0) return;
      
      const { data: schools } = await supabase
        .from('schools')
        .select('name, required_documents')
        .in('id', selectedSchools);
      
      if (schools) {
        const fullApp = schools
          .filter(s => s.required_documents?.includes('full_application'))
          .map(s => s.name);
        setFullAppSchools(fullApp);
      }
    };
    checkFullAppSchools();
  }, [selectedSchools]);

  const handleResumeUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    try {
      setIsUploading(true);
      setUploadProgress(0);

      const fileExt = file.name.split('.').pop();
      const randomPrefix = crypto.randomUUID();
      const fileName = `${randomPrefix}-resume.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      setUploadProgress(50);

      const { data: document, error: docError } = await supabase
        .from('documents')
        .insert({
          user_id: user.id,
          title: 'Resume',
          file_name: fileName,
          file_path: filePath,
          file_size: file.size,
          file_type: file.type,
          document_type: 'resume'
        })
        .select()
        .single();

      if (docError) throw docError;

      setUploadProgress(75);

      await processResumeDocument(document.id);

      setUploadProgress(100);
      setHasUploadedResume(true);
      await refetch();
      toast.success('Resume uploaded and processed successfully');

    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload resume');
    } finally {
      setIsUploading(false);
    }
  };

  const handleContinue = () => {
    setCurrentStep('pricing');
  };

  const handleBack = () => {
    setCurrentStep('school-selection');
  };

  return (
    <OnboardingLayout
      currentStep="resume-upload"
      title="Upload Your Resume"
      description="Upload your resume and we'll analyze it with AI to build your personalized interview preparation profile."
    >
      {/* Full Application Info Banner */}
      {fullAppSchools.length > 0 && (
        <Alert className="mb-8 border-primary/30 bg-primary-muted/20">
          <Info className="h-4 w-4 text-primary" />
          <AlertDescription className="text-sm text-foreground">
            <strong>{fullAppSchools.join(', ')}</strong> require{fullAppSchools.length === 1 ? 's' : ''} a full application for the best interview experience. Don't worry — we'll ask for it when you start a mock interview for {fullAppSchools.length === 1 ? 'that school' : 'those schools'}.
          </AlertDescription>
        </Alert>
      )}

      {/* Navigation - Top */}
      <div className="flex items-center justify-between mb-8">
        <Button variant="outline" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Schools
        </Button>
        
        {hasUploadedResume && (
          <Button 
            size="lg" 
            className="bg-gradient-primary hover:opacity-90"
            onClick={handleContinue}
          >
            Continue to Pricing
            <ArrowRight className="h-5 w-5 ml-2" />
          </Button>
        )}
      </div>

      {/* Resume Upload Card */}
      <Card className="shadow-card mb-8">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Upload className="h-5 w-5 mr-2 text-primary" />
            Resume Upload
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!hasUploadedResume && !isUploading && !isProcessing && (
            <div>
              <input
                id="resume-upload"
                type="file"
                accept=".pdf"
                onChange={handleResumeUpload}
                className="hidden"
              />
              <label htmlFor="resume-upload" className="cursor-pointer block">
                <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors hover:bg-muted/50">
                  <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-medium text-foreground mb-2">Upload Your Resume</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    PDF only, up to 10MB
                  </p>
                  <div className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors h-10 px-4 py-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground">
                    Choose File
                  </div>
                </div>
              </label>
            </div>
          )}

          {(isUploading || isProcessing) && (
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
              {isProcessing ? (
                <Brain className="h-12 w-12 text-primary mx-auto mb-4 animate-pulse" />
              ) : (
                <Upload className="h-12 w-12 text-primary mx-auto mb-4" />
              )}
              <h3 className="font-medium text-foreground mb-2">
                {isProcessing ? 'Analyzing your resume with AI...' : 'Uploading Resume...'}
              </h3>
              <Progress value={uploadProgress} className="h-2 mb-2" />
              <p className="text-sm text-muted-foreground">{uploadProgress}% complete</p>
              {isProcessing && (
                <p className="text-xs text-muted-foreground mt-2">
                  Extracting skills, experience, and identifying strengths & opportunities
                </p>
              )}
            </div>
          )}

          {hasUploadedResume && (
            <div className="text-center py-4">
              <Check className="h-12 w-12 text-success mx-auto mb-3" />
              <h3 className="font-medium text-success mb-1">Resume Processed Successfully</h3>
              <p className="text-sm text-muted-foreground">
                See your candidate preview below
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Candidate Preview - shown after resume processing */}
      {hasUploadedResume && metadata?.resume_processed_at && (
        <Card className="shadow-card mb-8 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Your Candidate Preview
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Here's what our AI identified from your resume — this will power your personalized interviews.
            </p>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Strengths */}
            {metadata.processed_skills && metadata.processed_skills.length > 0 && (
              <div>
                <h4 className="font-medium mb-2 text-sm text-foreground flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-success" />
                  Key Strengths
                </h4>
                <div className="flex flex-wrap gap-2">
                  {metadata.processed_skills.map((skill, index) => (
                    <Badge key={index} variant="secondary" className="bg-success-muted text-success border-success/20">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Industry Focus Areas - moved after Key Strengths */}
            {metadata.industry_experience && metadata.industry_experience.length > 0 && (
              <>
                <Separator />
                <div>
                  <h4 className="font-medium mb-2 text-sm text-foreground flex items-center gap-1.5">
                    <Building2 className="h-4 w-4 text-primary" />
                    Industry Focus Areas
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {metadata.industry_experience.map((industry, index) => (
                      <Badge key={index} variant="outline" className="border-primary/30 text-primary">
                        {industry}
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}

            {metadata.work_experience_summary && (
              <>
                <Separator />
                <div>
                  <h4 className="font-medium mb-1 text-sm text-foreground">Experience Summary</h4>
                  <p className="text-sm text-muted-foreground">{metadata.work_experience_summary}</p>
                </div>
              </>
            )}

            {metadata.education_background && (
              <>
                <Separator />
                <div>
                  <h4 className="font-medium mb-1 text-sm text-foreground">Education</h4>
                  <p className="text-sm text-muted-foreground">{metadata.education_background}</p>
                </div>
              </>
            )}

            {metadata.career_objectives && (
              <>
                <Separator />
                <div>
                  <h4 className="font-medium mb-1 text-sm text-foreground">Career Direction</h4>
                  <p className="text-sm text-muted-foreground">{metadata.career_objectives}</p>
                </div>
              </>
            )}

            {metadata.leadership_examples && (
              <>
                <Separator />
                <div>
                  <h4 className="font-medium mb-1 text-sm text-foreground">Leadership Highlights</h4>
                  <p className="text-sm text-muted-foreground">{metadata.leadership_examples}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Bottom Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Schools
        </Button>
        
        {hasUploadedResume && (
          <Button 
            size="lg" 
            className="bg-gradient-primary hover:opacity-90"
            onClick={handleContinue}
          >
            Continue to Pricing
            <ArrowRight className="h-5 w-5 ml-2" />
          </Button>
        )}
      </div>
    </OnboardingLayout>
  );
};

export default ResumeUpload;
