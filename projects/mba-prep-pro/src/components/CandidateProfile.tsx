import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useCandidateMetadata } from '@/hooks/useCandidateMetadata';
import { Skeleton } from '@/components/ui/skeleton';
import { User, Briefcase, GraduationCap, Target, Building, Award } from 'lucide-react';
const CandidateProfile = () => {
  const {
    metadata,
    isLoading
  } = useCandidateMetadata();
  if (isLoading) {
    return <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Candidate Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </CardContent>
      </Card>;
  }
  if (!metadata?.resume_processed_at) {
    return;
  }
  return <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Candidate Profile
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Skills */}
        {metadata.processed_skills && metadata.processed_skills.length > 0 && <div>
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <Award className="h-4 w-4" />
              Skills
            </h4>
            <div className="flex flex-wrap gap-2">
              {metadata.processed_skills.map((skill, index) => <Badge key={index} variant="secondary">
                  {skill}
                </Badge>)}
            </div>
          </div>}

        {/* Work Experience */}
        {metadata.work_experience_summary && <>
            <Separator />
            <div>
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                Work Experience
              </h4>
              <p className="text-sm text-muted-foreground">
                {metadata.work_experience_summary}
              </p>
            </div>
          </>}

        {/* Education */}
        {metadata.education_background && <>
            <Separator />
            <div>
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <GraduationCap className="h-4 w-4" />
                Education
              </h4>
              <p className="text-sm text-muted-foreground">
                {metadata.education_background}
              </p>
            </div>
          </>}

        {/* Career Objectives */}
        {metadata.career_objectives && <>
            <Separator />
            <div>
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Target className="h-4 w-4" />
                Career Objectives
              </h4>
              <p className="text-sm text-muted-foreground">
                {metadata.career_objectives}
              </p>
            </div>
          </>}

        {/* Industry Experience */}
        {metadata.industry_experience && metadata.industry_experience.length > 0 && <>
            <Separator />
            <div>
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Building className="h-4 w-4" />
                Industry Experience
              </h4>
              <div className="flex flex-wrap gap-2">
                {metadata.industry_experience.map((industry, index) => <Badge key={index} variant="outline">
                    {industry}
                  </Badge>)}
              </div>
            </div>
          </>}

        {/* Leadership Examples */}
        {metadata.leadership_examples && <>
            <Separator />
            <div>
              <h4 className="font-medium mb-2">Leadership Experience</h4>
              <p className="text-sm text-muted-foreground">
                {metadata.leadership_examples}
              </p>
            </div>
          </>}

        {/* Metadata */}
        {metadata.resume_metadata && Object.keys(metadata.resume_metadata).length > 0 && <>
            <Separator />
            <div>
              <h4 className="font-medium mb-2">Additional Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                {metadata.resume_metadata.yearsOfExperience && <div>
                    <span className="font-medium">Experience:</span>{' '}
                    <span className="text-muted-foreground">
                      {metadata.resume_metadata.yearsOfExperience} years
                    </span>
                  </div>}
                {metadata.resume_metadata.currentRole && <div>
                    <span className="font-medium">Current Role:</span>{' '}
                    <span className="text-muted-foreground">
                      {metadata.resume_metadata.currentRole}
                    </span>
                  </div>}
              </div>
            </div>
          </>}

      </CardContent>
    </Card>;
};
export default CandidateProfile;