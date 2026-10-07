import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, MapPin, Users, TrendingUp, Star, Check, ArrowRight } from 'lucide-react';
import { useOnboarding } from '@/hooks/useOnboarding';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import OnboardingLayout from './OnboardingLayout';
import { useSchools } from '@/hooks/useSchools';

const SchoolSelection = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const { selectedSchools, setSelectedSchools, setCurrentStep } = useOnboarding();
  const { user } = useAuth();
  const { schools, loading: schoolsLoading } = useSchools();

  const filteredSchools = schools.filter(school =>
    school.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    school.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleSchoolSelection = (schoolId: number) => {
    const newSelected = selectedSchools.includes(schoolId) 
      ? selectedSchools.filter(id => id !== schoolId)
      : [...selectedSchools, schoolId];
    setSelectedSchools(newSelected);
  };

  const handleContinue = async () => {
    if (selectedSchools.length === 0) {
      toast.error('Please select at least one school to continue.');
      return;
    }
    await saveSelectedSchools();
    setCurrentStep('resume-upload');
  };

  const saveSelectedSchools = async () => {
    if (!user || selectedSchools.length === 0) return;
    
    try {
      // Save selected schools to database
      const schoolSelections = selectedSchools.map(schoolId => ({
        user_id: user.id,
        school_id: schoolId,
        interviews_limit: 0, // Will be set when user purchases a plan
        interviews_used: 0
      }));

      const { error } = await supabase
        .from('user_schools')
        .upsert(schoolSelections, { onConflict: 'user_id,school_id' });

      if (error) throw error;
      
      toast.success(`${selectedSchools.length} school${selectedSchools.length !== 1 ? 's' : ''} saved successfully!`);
    } catch (error) {
      console.error('Error saving schools:', error);
      toast.error('Failed to save school selections');
    }
  };

  return (
    <OnboardingLayout
      currentStep="school-selection"
      title="Choose Your Target Schools"
      description="Select the MBA programs you're applying to for personalized interview practice. You can always add more later."
    >
      {/* Loading State */}
      {schoolsLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : (
        <>
          {/* Search */}
          <div className="mb-8">
            <div className="relative max-w-md mx-auto">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search schools by name or location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

      {/* Selected Counter */}
      <div className="mb-6 text-center">
        <Badge variant="secondary" className="px-4 py-2 text-base">
          {selectedSchools.length} School{selectedSchools.length !== 1 ? 's' : ''} Selected
        </Badge>
      </div>

      {/* Navigation Button - Top */}
      <div className="flex justify-center mb-8">
        <Button 
          size="lg" 
          className="bg-gradient-primary hover:opacity-90 w-full sm:w-auto"
          onClick={handleContinue}
          disabled={selectedSchools.length === 0}
        >
          {selectedSchools.length > 0 
            ? `Continue with ${selectedSchools.length} School${selectedSchools.length !== 1 ? 's' : ''}`
            : 'Select at Least One School'}
          <ArrowRight className="h-5 w-5 ml-2" />
        </Button>
      </div>

      {/* Schools Grid */}
      <div className="grid lg:grid-cols-2 gap-6 mb-8">
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
                  <div className="flex items-center text-muted-foreground text-sm">
                    <MapPin className="h-4 w-4 mr-1" />
                    {school.location}
                  </div>
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

      {/* Navigation Button - Bottom */}
      <div className="flex justify-center">
        <Button 
          size="lg" 
          className="bg-gradient-primary hover:opacity-90 w-full sm:w-auto"
          onClick={handleContinue}
          disabled={selectedSchools.length === 0}
        >
          {selectedSchools.length > 0 
            ? `Continue with ${selectedSchools.length} School${selectedSchools.length !== 1 ? 's' : ''}`
            : 'Select at Least One School'}
          <ArrowRight className="h-5 w-5 ml-2" />
        </Button>
      </div>
      </>
      )}
    </OnboardingLayout>
  );
};

export default SchoolSelection;