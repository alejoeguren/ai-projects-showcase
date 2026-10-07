import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  BookOpen, 
  Search, 
  MapPin, 
  Users, 
  TrendingUp, 
  Star,
  Check,
  ArrowLeft,
  Filter
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useDocumentStats } from "@/hooks/useDocumentStats";
import { useToast } from "@/hooks/use-toast";
import { useSchools } from "@/hooks/useSchools";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast as sonnerToast } from "sonner";

const Schools = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSchools, setSelectedSchools] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(true);
  const { stats: docStats, loading: docLoading } = useDocumentStats();
  const { schools, loading: schoolsLoading } = useSchools();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Pre-populate with already-selected schools
  useEffect(() => {
    const loadExisting = async () => {
      if (!user) { setLoadingExisting(false); return; }
      try {
        const { data } = await supabase
          .from('user_schools')
          .select('school_id')
          .eq('user_id', user.id);
        if (data && data.length > 0) {
          setSelectedSchools(data.map(s => s.school_id));
        }
      } catch (e) {
        console.error('Error loading existing schools:', e);
      } finally {
        setLoadingExisting(false);
      }
    };
    loadExisting();
  }, [user]);

  const filteredSchools = schools.filter(school =>
    school.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    school.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleSchoolSelection = (schoolId: number) => {
    setSelectedSchools(prev => 
      prev.includes(schoolId) 
        ? prev.filter(id => id !== schoolId)
        : [...prev, schoolId]
    );
  };

  const handleContinue = async () => {
    if (!user) {
      sonnerToast.error("Please log in to save school selections");
      return;
    }

    if (!docStats.hasResume) {
      toast({
        title: "Upload Resume First",
        description: "Please upload your resume before continuing with school selection.",
        variant: "destructive",
      });
      navigate('/documents');
      return;
    }

    if (selectedSchools.length === 0) {
      sonnerToast.error("Please select at least one school");
      return;
    }

    setSaving(true);
    try {
      // Check if user can add more schools
      const { data: canSelect, error: checkError } = await supabase.rpc('can_select_school', {
        _user_id: user.id,
      });

      if (checkError) throw checkError;

      // Get existing school selections
      const { data: existingSelections } = await supabase
        .from('user_schools')
        .select('school_id')
        .eq('user_id', user.id);

      const existingSchoolIds = existingSelections?.map(s => s.school_id) || [];
      const newSchools = selectedSchools.filter(id => !existingSchoolIds.includes(id));

      if (newSchools.length > 0 && !canSelect) {
        sonnerToast.error("You've reached your school limit for your current plan. Upgrade your plan to add more schools.", {
          duration: 5000,
        });
        setSaving(false);
        return;
      }

      // Get user's tier to set correct interviews_limit for new schools
      const { data: tierLimits } = await supabase.rpc('get_tier_limits', {
        _tier: (await supabase.from('profiles').select('subscription_tier').eq('user_id', user.id).single()).data?.subscription_tier || 'free',
      });
      const interviewsPerSchool = tierLimits?.[0]?.interviews_per_school ?? 0;

      // Insert only new school selections
      if (newSchools.length > 0) {
        const schoolSelections = newSchools.map(schoolId => ({
          user_id: user.id,
          school_id: schoolId,
          interviews_limit: interviewsPerSchool,
          interviews_used: 0,
        }));

        const { error } = await supabase
          .from('user_schools')
          .insert(schoolSelections);

        if (error) {
          if (error.message?.includes('row-level security')) {
            sonnerToast.error("You've reached your school limit. Upgrade your plan to add more.", { duration: 5000 });
          } else {
            throw error;
          }
          setSaving(false);
          return;
        }
      }

      sonnerToast.success(`${selectedSchools.length} school${selectedSchools.length > 1 ? 's' : ''} saved successfully`);
      navigate('/dashboard');
    } catch (error) {
      console.error('Error saving schools:', error);
      sonnerToast.error('Failed to save school selections');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 space-y-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/dashboard">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Link>
            </Button>
          </div>
          <h1 className="text-3xl font-bold text-foreground">MBA Programs</h1>
          <p className="text-muted-foreground">
            Select the business schools you're targeting for personalized interview practice.
          </p>
        </div>

        {/* Loading State */}
        {schoolsLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        )}

        {!schoolsLoading && (
          <>

        {/* Search and Filters */}
        <div className="mb-8 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search schools by name or location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline">
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
        </div>

        {/* Selected Counter */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Badge variant="secondary" className="px-3 py-1">
              {selectedSchools.length} Selected
            </Badge>
            {selectedSchools.length > 0 && (
              <span className="text-sm text-muted-foreground">
                Ready for personalized practice
              </span>
            )}
          </div>
          {selectedSchools.length > 0 && (
            <Button onClick={handleContinue} disabled={saving}>
              <Check className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save & Continue'}
            </Button>
          )}
        </div>

        {/* Schools Grid */}
        <div className="grid lg:grid-cols-2 gap-6">
          {filteredSchools.map((school) => (
            <Card 
              key={school.id} 
              className={`shadow-card hover:shadow-card-hover transition-all cursor-pointer ${
                selectedSchools.includes(school.id) 
                  ? 'ring-2 ring-primary bg-primary-muted/20' 
                  : ''
              }`}
              onClick={() => toggleSchoolSelection(school.id)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Star className="h-5 w-5 text-accent fill-current" />
                      <Badge variant="outline">#{school.ranking}</Badge>
                    </div>
                    <CardTitle className="text-xl mb-1">{school.name}</CardTitle>
                    <CardDescription className="flex items-center">
                      <MapPin className="h-4 w-4 mr-1" />
                      {school.location} • {school.program}
                    </CardDescription>
                  </div>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    selectedSchools.includes(school.id)
                      ? 'bg-primary border-primary'
                      : 'border-muted-foreground'
                  }`}>
                    {selectedSchools.includes(school.id) && (
                      <Check className="h-4 w-4 text-primary-foreground" />
                    )}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <p className="text-muted-foreground mb-4 text-sm leading-relaxed">
                  {school.description}
                </p>

                {/* Specialties */}
                <div className="mb-4">
                  <div className="flex flex-wrap gap-2">
                    {school.specialties?.map((specialty) => (
                      <Badge key={specialty} variant="secondary" className="text-xs">
                        {specialty}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-1">
                      <TrendingUp className="h-4 w-4 text-success mr-1" />
                    </div>
                     <p className="text-sm font-medium text-foreground">{school.acceptance_rate}</p>
                     <p className="text-xs text-muted-foreground">Accept Rate</p>
                   </div>
                   <div className="text-center">
                     <div className="flex items-center justify-center mb-1">
                       <Users className="h-4 w-4 text-primary mr-1" />
                     </div>
                     <p className="text-sm font-medium text-foreground">{school.avg_gmat}</p>
                     <p className="text-xs text-muted-foreground">Avg GMAT</p>
                   </div>
                 </div>
               </CardContent>
             </Card>
           ))}
         </div>

         {/* Bottom Action */}
         {selectedSchools.length > 0 && (
           <div className="mt-8 text-center">
             <Button size="lg" className="bg-gradient-primary hover:opacity-90" onClick={handleContinue}>
               <Check className="h-5 w-5 mr-2" />
               Start Practice with {selectedSchools.length} School{selectedSchools.length !== 1 ? 's' : ''}
             </Button>
           </div>
         )}
         </>
        )}
       </div>
    </div>
  );
};

export default Schools;