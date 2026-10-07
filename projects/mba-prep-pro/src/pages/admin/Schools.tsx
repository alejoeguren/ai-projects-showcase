import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, School as SchoolIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface School {
  id: number;
  name: string;
  type: string;
  location: string;
  program: string;
  ranking: number;
  acceptance_rate: string;
  avg_gmat: number;
  description: string;
  specialties: string[];
  interview_style: string | null;
  required_documents: string[];
}

export default function AdminSchools() {
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSchool, setEditingSchool] = useState<School | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    type: "university",
    location: "",
    program: "2-year MBA",
    ranking: 0,
    acceptance_rate: "",
    avg_gmat: 0,
    description: "",
    specialties: "",
    interview_style: "",
    required_documents: "resume" as "resume" | "resume_full_application",
  });

  useEffect(() => {
    fetchSchools();
  }, []);

  const fetchSchools = async () => {
    try {
      const { data, error } = await supabase
        .from('schools')
        .select('*')
        .order('ranking', { ascending: true });

      if (error) throw error;
      setSchools(data || []);
    } catch (error) {
      console.error('Error fetching schools:', error);
      toast.error('Failed to load schools');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const schoolData = {
        name: formData.name,
        type: formData.type,
        location: formData.location,
        program: formData.program,
        ranking: Number(formData.ranking),
        acceptance_rate: formData.acceptance_rate,
        avg_gmat: Number(formData.avg_gmat),
        description: formData.description,
        specialties: formData.specialties.split(',').map(s => s.trim()).filter(Boolean),
        interview_style: formData.interview_style || null,
        required_documents: formData.required_documents === "resume_full_application" 
          ? ['resume', 'full_application'] 
          : ['resume'],
      };

      if (editingSchool) {
        const { error } = await supabase
          .from('schools')
          .update(schoolData)
          .eq('id', editingSchool.id);

        if (error) throw error;
        toast.success('School updated successfully');
      } else {
        const { error } = await supabase
          .from('schools')
          .insert([schoolData]);

        if (error) throw error;
        toast.success('School created successfully');
      }

      setDialogOpen(false);
      resetForm();
      fetchSchools();
    } catch (error) {
      console.error('Error saving school:', error);
      toast.error('Failed to save school');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this school? This will also remove all user selections for this school.')) return;

    try {
      const { error } = await supabase
        .from('schools')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('School deleted successfully');
      fetchSchools();
    } catch (error) {
      console.error('Error deleting school:', error);
      toast.error('Failed to delete school');
    }
  };

  const handleEdit = (school: School) => {
    setEditingSchool(school);
    const hasFullApp = school.required_documents?.includes('full_application');
    setFormData({
      name: school.name,
      type: school.type || "university",
      location: school.location || "",
      program: school.program || "2-year MBA",
      ranking: school.ranking || 0,
      acceptance_rate: school.acceptance_rate || "",
      avg_gmat: school.avg_gmat || 0,
      description: school.description || "",
      specialties: school.specialties?.join(', ') || "",
      interview_style: school.interview_style || "",
      required_documents: hasFullApp ? "resume_full_application" : "resume",
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingSchool(null);
    setFormData({
      name: "",
      type: "university",
      location: "",
      program: "2-year MBA",
      ranking: 0,
      acceptance_rate: "",
      avg_gmat: 0,
      description: "",
      specialties: "",
      interview_style: "",
      required_documents: "resume",
    });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Schools Management</h1>
            <p className="text-muted-foreground">Manage MBA programs and school information</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add School
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingSchool ? 'Edit' : 'Create'} School</DialogTitle>
                <DialogDescription>
                  {editingSchool ? 'Update' : 'Add new'} MBA program information
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">School Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ranking">Ranking *</Label>
                    <Input
                      id="ranking"
                      type="number"
                      value={formData.ranking}
                      onChange={(e) => setFormData({ ...formData, ranking: parseInt(e.target.value) || 0 })}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="location">Location *</Label>
                    <Input
                      id="location"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder="City, State"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="program">Program</Label>
                    <Input
                      id="program"
                      value={formData.program}
                      onChange={(e) => setFormData({ ...formData, program: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="acceptance_rate">Acceptance Rate</Label>
                    <Input
                      id="acceptance_rate"
                      value={formData.acceptance_rate}
                      onChange={(e) => setFormData({ ...formData, acceptance_rate: e.target.value })}
                      placeholder="11%"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="avg_gmat">Avg GMAT</Label>
                    <Input
                      id="avg_gmat"
                      type="number"
                      value={formData.avg_gmat}
                      onChange={(e) => setFormData({ ...formData, avg_gmat: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="specialties">Specialties (comma-separated)</Label>
                  <Input
                    id="specialties"
                    value={formData.specialties}
                    onChange={(e) => setFormData({ ...formData, specialties: e.target.value })}
                    placeholder="Finance, Consulting, Healthcare"
                  />
                </div>

                <div className="border-t pt-4 mt-4">
                  <h4 className="font-medium mb-4">Interview & Documents</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="interview_style">Interview Style</Label>
                      <Input
                        id="interview_style"
                        value={formData.interview_style}
                        onChange={(e) => setFormData({ ...formData, interview_style: e.target.value })}
                        placeholder="e.g., Blind interview, Team-based"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Required Documents</Label>
                      <div className="flex flex-col gap-2 pt-1">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="required_documents"
                            checked={formData.required_documents === "resume"}
                            onChange={() => setFormData({ ...formData, required_documents: "resume" })}
                            className="h-4 w-4"
                          />
                          <span className="text-sm">Resume only</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="required_documents"
                            checked={formData.required_documents === "resume_full_application"}
                            onChange={() => setFormData({ ...formData, required_documents: "resume_full_application" })}
                            className="h-4 w-4"
                          />
                          <span className="text-sm">Resume + Full Application</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingSchool ? 'Update' : 'Create'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : schools.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <SchoolIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-medium text-foreground mb-2">No schools yet</h3>
              <p className="text-muted-foreground mb-4">Add your first MBA program to get started.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {schools.map((school) => (
              <Card key={school.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <CardTitle>{school.name}</CardTitle>
                        <Badge variant="outline">#{school.ranking}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{school.location}</p>
                      <p className="text-sm text-muted-foreground mb-3">{school.description}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        {school.acceptance_rate && (
                          <Badge variant="secondary">{school.acceptance_rate} acceptance</Badge>
                        )}
                        {school.avg_gmat > 0 && (
                          <Badge variant="secondary">GMAT: {school.avg_gmat}</Badge>
                        )}
                        {school.interview_style && (
                          <Badge variant="default">Interview: {school.interview_style}</Badge>
                        )}
                        <Badge variant={school.required_documents?.includes('full_application') ? "destructive" : "secondary"}>
                          {school.required_documents?.includes('full_application') ? "Full application" : "Resume only"}
                        </Badge>
                        {school.specialties?.map((specialty) => (
                          <Badge key={specialty} variant="outline">{specialty}</Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost" onClick={() => handleEdit(school)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(school.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
