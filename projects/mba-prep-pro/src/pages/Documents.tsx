import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Upload, 
  FileText, 
  Plus,
  Trash2,
  Check,
  Brain,
  Eye,
  X,
  ArrowLeft,
  Loader2
} from "lucide-react";
import { Link } from "react-router-dom";
import { useCandidateMetadata } from "@/hooks/useCandidateMetadata";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import CandidateProfile from "@/components/CandidateProfile";

interface UserSchoolWithName {
  school_id: number;
  school_name: string;
  required_documents: string[] | null;
}

interface ExistingDocument {
  id: string;
  title: string;
  file_name: string;
  document_type: string;
  created_at: string;
}

const Documents = () => {
  const { processResumeDocument, isProcessing, metadata } = useCandidateMetadata();
  const { user } = useAuth();
  
  const [existingResumeDoc, setExistingResumeDoc] = useState<any>(null);
  const [existingSchoolDocs, setExistingSchoolDocs] = useState<Record<number, ExistingDocument>>({});
  const [userSchools, setUserSchools] = useState<UserSchoolWithName[]>([]);
  const [resumeUploaded, setResumeUploaded] = useState(false);
  
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadingSchoolId, setUploadingSchoolId] = useState<number | null>(null);

  // Fetch user's selected schools and existing documents
  const fetchData = useCallback(async () => {
    if (!user) return;

    // Fetch user schools with names
    const { data: schoolData } = await supabase
      .from('user_schools')
      .select('school_id, schools(name, required_documents)')
      .eq('user_id', user.id);

    if (schoolData) {
      setUserSchools(schoolData.map((s: any) => ({
        school_id: s.school_id,
        school_name: s.schools?.name || `School ${s.school_id}`,
        required_documents: s.schools?.required_documents || null,
      })));
    }

    // Fetch existing documents
    const { data: docs } = await supabase
      .from('documents')
      .select('*')
      .eq('user_id', user.id);

    if (docs) {
      const resume = docs.find(d => d.document_type === 'resume');
      if (resume) {
        setExistingResumeDoc(resume);
        if (metadata?.resume_processed_at) {
          setResumeUploaded(true);
        }
      }

      // School docs use document_type='other' with title='{SchoolName} Materials'
      // We match them to schools after both queries complete
      const otherDocs = docs.filter(d => d.document_type === 'other' && d.title.endsWith(' Materials'));
      if (schoolData) {
        const matched: Record<number, ExistingDocument> = {};
        for (const s of schoolData) {
          const schoolName = (s as any).schools?.name || '';
          const doc = otherDocs.find(d => d.title === `${schoolName} Materials`);
          if (doc) matched[s.school_id] = doc;
        }
        setExistingSchoolDocs(matched);
      }
    }
  }, [user, metadata?.resume_processed_at]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleResumeUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    try {
      setIsUploading(true);
      setUploadProgress(0);

      const fileExt = file.name.split('.').pop();
      const randomPrefix = crypto.randomUUID();
      const fileName = `${randomPrefix}-resume_${Date.now()}.${fileExt}`;
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
      
      setResumeUploaded(true);
      setExistingResumeDoc(document);
      toast.success('Resume uploaded and processed successfully');

    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload resume');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const [processingSchoolId, setProcessingSchoolId] = useState<number | null>(null);

  const handleSchoolDocUpload = async (event: React.ChangeEvent<HTMLInputElement>, schoolId: number, schoolName: string) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    try {
      setUploadingSchoolId(schoolId);

      const fileExt = file.name.split('.').pop();
      const randomPrefix = crypto.randomUUID();
      const fileName = `${randomPrefix}-${schoolName.replace(/\s+/g, '_').toLowerCase()}_${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: document, error: docError } = await supabase
        .from('documents')
        .insert({
          user_id: user.id,
          title: `${schoolName} Materials`,
          file_name: fileName,
          file_path: filePath,
          file_size: file.size,
          file_type: file.type,
          document_type: 'other'
        })
        .select()
        .single();

      if (docError) throw docError;

      setExistingSchoolDocs(prev => ({ ...prev, [schoolId]: document }));
      setUploadingSchoolId(null);

      // Trigger AI analysis
      setProcessingSchoolId(schoolId);
      toast.info(`Analyzing ${schoolName} materials with AI...`);

      const { data: session } = await supabase.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-school-materials`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.session?.access_token}`,
          },
          body: JSON.stringify({ schoolId, schoolName, filePath }),
        }
      );

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to analyze materials');
      }

      toast.success(`${schoolName} materials analyzed and ready for interview prep`);

    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || `Failed to process ${schoolName} materials`);
    } finally {
      setUploadingSchoolId(null);
      setProcessingSchoolId(null);
    }
  };

  const handleRemoveResume = () => {
    setResumeUploaded(false);
    setExistingResumeDoc(null);
  };

  const handleRemoveSchoolDoc = async (schoolId: number) => {
    const doc = existingSchoolDocs[schoolId];
    if (doc && user) {
      await supabase.from('documents').delete().eq('id', doc.id);
      // Also remove from storage
      await supabase.storage.from('documents').remove([`${user.id}/${doc.file_name}`]);
    }
    setExistingSchoolDocs(prev => {
      const next = { ...prev };
      delete next[schoolId];
      return next;
    });
  };

  const totalRequired = 1; // resume
  const uploadedRequired = resumeUploaded ? 1 : 0;
  const progressPercent = (uploadedRequired / totalRequired) * 100;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-8">
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
          <h1 className="text-3xl font-bold text-foreground">Documents</h1>
          <p className="text-muted-foreground">
            Upload your resume and school-specific application materials for AI-powered personalized interview practice.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Progress Overview */}
            <Card className="shadow-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-foreground">Upload Progress</h3>
                    <p className="text-sm text-muted-foreground">
                      {uploadedRequired} of {totalRequired} required documents uploaded
                      {Object.keys(existingSchoolDocs).length > 0 && ` + ${Object.keys(existingSchoolDocs).length} school materials`}
                    </p>
                  </div>
                  <Badge variant={resumeUploaded ? "default" : "secondary"}>
                    {Math.round(progressPercent)}% Complete
                  </Badge>
                </div>
                <Progress value={progressPercent} className="h-2" />
              </CardContent>
            </Card>

            {/* Resume Upload */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="h-5 w-5 mr-2 text-primary" />
                  Resume
                </CardTitle>
                <CardDescription>
                  Upload your resume for AI-powered analysis and personalized interview prep
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!resumeUploaded && !isUploading && !isProcessing ? (
                  existingResumeDoc && !metadata?.resume_processed_at ? (
                    <div className="flex items-center justify-between p-4 bg-muted rounded-lg border">
                      <div className="flex items-center">
                        <FileText className="h-5 w-5 text-muted-foreground mr-3" />
                        <div>
                          <p className="font-medium text-foreground">Resume uploaded</p>
                          <p className="text-sm text-muted-foreground">Not yet processed by AI</p>
                        </div>
                      </div>
                      <Button onClick={() => processResumeDocument(existingResumeDoc.id)}>
                        <Brain className="h-4 w-4 mr-2" />
                        Process Resume
                      </Button>
                    </div>
                  ) : (
                  <div>
                    <input
                      id="resume-upload"
                      type="file"
                      accept=".pdf"
                      onChange={handleResumeUpload}
                      className="hidden"
                    />
                    <div 
                      className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
                      onClick={() => document.getElementById('resume-upload')?.click()}
                    >
                      <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="font-medium text-foreground mb-2">Upload Resume</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        PDF only, up to 10MB. We'll analyze it with AI to extract key information.
                      </p>
                      <Button variant="outline" type="button" onClick={(e) => { e.stopPropagation(); document.getElementById('resume-upload')?.click(); }}>
                        <Plus className="h-4 w-4 mr-2" />
                        Choose File
                      </Button>
                    </div>
                  </div>
                  )
                ) : (isUploading || isProcessing) ? (
                  <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                    {isProcessing ? (
                      <Brain className="h-12 w-12 text-primary mx-auto mb-4" />
                    ) : (
                      <Upload className="h-12 w-12 text-primary mx-auto mb-4" />
                    )}
                    <h3 className="font-medium text-foreground mb-2">
                      {isProcessing ? 'Processing with AI...' : 'Uploading Resume...'}
                    </h3>
                    <Progress value={uploadProgress} className="h-2 mb-2" />
                    <p className="text-sm text-muted-foreground">{uploadProgress}% complete</p>
                    {isProcessing && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Extracting skills, experience, and key information from your resume
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-4 bg-success-muted rounded-lg border border-success/20">
                    <div className="flex items-center">
                      <Check className="h-5 w-5 text-success mr-3" />
                      <div>
                        <p className="font-medium text-foreground">Resume uploaded and processed</p>
                        <p className="text-sm text-success">AI analysis completed</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className="bg-success text-success-foreground">All Schools</Badge>
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleRemoveResume}
                        aria-label="Remove uploaded resume"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* School-Specific Documents - only for full_application schools */}
            {userSchools.filter(s => s.required_documents?.includes('full_application')).map((school) => (
              <Card key={school.school_id} className="shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <FileText className="h-5 w-5 mr-2 text-primary" />
                    {school.school_name} Materials
                  </CardTitle>
                  <CardDescription>
                    School-specific essays, recommendations, or other application materials
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {existingSchoolDocs[school.school_id] && processingSchoolId !== school.school_id ? (
                    <div className="flex items-center justify-between p-4 bg-success-muted rounded-lg border border-success/20">
                      <div className="flex items-center">
                        <Check className="h-5 w-5 text-success mr-3" />
                        <div>
                          <p className="font-medium text-foreground">{school.school_name} materials uploaded</p>
                          <p className="text-sm text-success">AI analysis completed</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline">{school.school_name}</Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveSchoolDoc(school.school_id)}
                          aria-label={`Remove ${school.school_name} materials`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : processingSchoolId === school.school_id ? (
                    <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                      <Brain className="h-12 w-12 text-primary mx-auto mb-4 animate-pulse" />
                      <h3 className="font-medium text-foreground mb-2">Analyzing {school.school_name} Materials with AI...</h3>
                      <p className="text-sm text-muted-foreground">Extracting key themes, essays, and goals for interview personalization</p>
                    </div>
                  ) : uploadingSchoolId === school.school_id ? (
                    <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                      <Loader2 className="h-12 w-12 text-primary mx-auto mb-4 animate-spin" />
                      <h3 className="font-medium text-foreground mb-2">Uploading {school.school_name} Materials...</h3>
                    </div>
                  ) : (
                    <div>
                      <input
                        id={`school-${school.school_id}-upload`}
                        type="file"
                        accept=".pdf"
                        onChange={(e) => handleSchoolDocUpload(e, school.school_id, school.school_name)}
                        className="hidden"
                      />
                      <div
                        className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
                        onClick={() => document.getElementById(`school-${school.school_id}-upload`)?.click()}
                      >
                        <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="font-medium text-foreground mb-2">Upload {school.school_name} Materials</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          Essays, recommendations, or other application materials
                        </p>
                        <Button variant="outline" type="button" onClick={(e) => { e.stopPropagation(); document.getElementById(`school-${school.school_id}-upload`)?.click(); }}>
                          <Plus className="h-4 w-4 mr-2" />
                          Choose File
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            {userSchools.length === 0 && (
              <Card className="shadow-card">
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground">No target schools selected yet.</p>
                  <Button variant="outline" className="mt-4" asChild>
                    <Link to="/schools">Select Schools</Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <CandidateProfile />
            
            {/* Upload Tips */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>Upload Tips</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2" />
                  <p className="text-sm text-muted-foreground">
                    Upload your most recent resume in PDF format for best AI analysis results
                  </p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2" />
                  <p className="text-sm text-muted-foreground">
                    Include school-specific essays to get tailored interview practice questions
                  </p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2" />
                  <p className="text-sm text-muted-foreground">
                    AI processes your documents to create personalized interview scenarios based on your background
                  </p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2" />
                  <p className="text-sm text-muted-foreground">
                    All documents are processed securely and used only for interview preparation
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Documents;