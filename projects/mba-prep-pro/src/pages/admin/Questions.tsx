import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Plus, Pencil, Trash2, HelpCircle } from 'lucide-react';
 import { Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSchools } from '@/hooks/useSchools';
import { useToast } from '@/hooks/use-toast';
 import { BulkUploadDialog } from '@/components/admin/BulkUploadDialog';

interface QuestionBank {
  id: string;
  school_id: number | null;
  questions_text: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const Questions = () => {
  const { schools, loading: schoolsLoading } = useSchools();
  const { toast } = useToast();
  const [questionBanks, setQuestionBanks] = useState<QuestionBank[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBank, setEditingBank] = useState<QuestionBank | null>(null);
  
  // Form state
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>('general');
  const [questionsText, setQuestionsText] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
   const [bulkUploadOpen, setBulkUploadOpen] = useState(false);

  const fetchQuestionBanks = async () => {
    try {
      const { data, error } = await supabase
        .from('school_interview_questions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setQuestionBanks(data || []);
    } catch (error) {
      console.error('Error fetching question banks:', error);
      toast({
        title: 'Error',
        description: 'Failed to load question banks',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestionBanks();
  }, []);

  const getSchoolName = (schoolId: number | null) => {
    if (schoolId === null) return 'General - All Schools';
    const school = schools.find(s => s.id === schoolId);
    return school?.name || 'Unknown School';
  };

  const handleOpenDialog = (bank?: QuestionBank) => {
    if (bank) {
      setEditingBank(bank);
      setSelectedSchoolId(bank.school_id?.toString() || 'general');
      setQuestionsText(bank.questions_text);
      setIsActive(bank.is_active);
    } else {
      setEditingBank(null);
      setSelectedSchoolId('general');
      setQuestionsText('');
      setIsActive(true);
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!questionsText.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please enter some questions',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const schoolId = selectedSchoolId === 'general' ? null : parseInt(selectedSchoolId);
      
      if (editingBank) {
        // Update existing
        const { error } = await supabase
          .from('school_interview_questions')
          .update({
            school_id: schoolId,
            questions_text: questionsText,
            is_active: isActive,
          })
          .eq('id', editingBank.id);

        if (error) throw error;
        toast({ title: 'Success', description: 'Question bank updated' });
      } else {
        // Create new
        const { error } = await supabase
          .from('school_interview_questions')
          .insert({
            school_id: schoolId,
            questions_text: questionsText,
            is_active: isActive,
          });

        if (error) {
          if (error.code === '23505') {
            toast({
              title: 'Already Exists',
              description: 'A question bank for this school already exists. Please edit the existing one.',
              variant: 'destructive',
            });
            return;
          }
          throw error;
        }
        toast({ title: 'Success', description: 'Question bank created' });
      }

      setDialogOpen(false);
      fetchQuestionBanks();
    } catch (error) {
      console.error('Error saving question bank:', error);
      toast({
        title: 'Error',
        description: 'Failed to save question bank',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this question bank?')) return;

    try {
      const { error } = await supabase
        .from('school_interview_questions')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: 'Success', description: 'Question bank deleted' });
      fetchQuestionBanks();
    } catch (error) {
      console.error('Error deleting question bank:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete question bank',
        variant: 'destructive',
      });
    }
  };

  const toggleActive = async (bank: QuestionBank) => {
    try {
      const { error } = await supabase
        .from('school_interview_questions')
        .update({ is_active: !bank.is_active })
        .eq('id', bank.id);

      if (error) throw error;
      fetchQuestionBanks();
    } catch (error) {
      console.error('Error toggling active state:', error);
      toast({
        title: 'Error',
        description: 'Failed to update status',
        variant: 'destructive',
      });
    }
  };

  // Get schools that don't have a question bank yet
  const availableSchools = schools.filter(
    school => !questionBanks.some(qb => qb.school_id === school.id) || 
              editingBank?.school_id === school.id
  );
  const hasGeneralBank = questionBanks.some(qb => qb.school_id === null);
  const showGeneralOption = !hasGeneralBank || editingBank?.school_id === null;

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Question Banks</h1>
            <p className="text-muted-foreground mt-1">
              Manage interview questions for each school
            </p>
          </div>
           <div className="flex items-center gap-2">
             <Button variant="outline" onClick={() => setBulkUploadOpen(true)}>
               <Upload className="h-4 w-4 mr-2" />
               Bulk Upload
             </Button>
             <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Add Question Bank
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingBank ? 'Edit Question Bank' : 'Create Question Bank'}
                </DialogTitle>
                <DialogDescription>
                  Paste all interview questions for this school. The AI will naturally incorporate these during interviews.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {/* School Selection */}
                <div className="space-y-2">
                  <Label htmlFor="school">School</Label>
                  <Select 
                    value={selectedSchoolId} 
                    onValueChange={setSelectedSchoolId}
                    disabled={!!editingBank}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a school" />
                    </SelectTrigger>
                    <SelectContent>
                      {showGeneralOption && (
                        <SelectItem value="general">
                          General - All Schools
                        </SelectItem>
                      )}
                      {availableSchools.map(school => (
                        <SelectItem key={school.id} value={school.id.toString()}>
                          {school.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {editingBank && (
                    <p className="text-xs text-muted-foreground">
                      School cannot be changed after creation
                    </p>
                  )}
                </div>

                {/* Questions Text */}
                <div className="space-y-2">
                  <Label htmlFor="questions">Interview Questions</Label>
                  <Textarea
                    id="questions"
                    value={questionsText}
                    onChange={(e) => setQuestionsText(e.target.value)}
                    placeholder="Paste all interview questions here...&#10;&#10;Example:&#10;1. Tell me about yourself&#10;2. Why do you want an MBA?&#10;3. What are your short and long-term goals?"
                    className="min-h-[300px] font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    You can use any format: numbered lists, bullet points, or plain text. The AI will interpret them naturally.
                  </p>
                </div>

                {/* Active Toggle */}
                <div className="flex items-center space-x-2">
                  <Switch
                    id="active"
                    checked={isActive}
                    onCheckedChange={setIsActive}
                  />
                  <Label htmlFor="active">Active</Label>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving...' : 'Save'}
                </Button>
              </DialogFooter>
            </DialogContent>
           </Dialog>
           </div>
         </div>
 
         {/* Bulk Upload Dialog */}
         <BulkUploadDialog
           open={bulkUploadOpen}
           onOpenChange={setBulkUploadOpen}
           schools={schools}
           existingBanks={questionBanks.map(qb => ({ school_id: qb.school_id }))}
           onSuccess={fetchQuestionBanks}
         />
 
         {/* Question Banks List */}
         {loading || schoolsLoading ? (
           <div className="text-center py-12">
            <p className="text-muted-foreground">Loading question banks...</p>
          </div>
        ) : questionBanks.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <HelpCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">No Question Banks Yet</p>
              <p className="text-muted-foreground mb-4">
                Create your first question bank to provide interview context to the AI.
              </p>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Create Question Bank
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {questionBanks.map(bank => (
              <Card key={bank.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        {getSchoolName(bank.school_id)}
                        <Badge variant={bank.is_active ? 'default' : 'secondary'}>
                          {bank.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </CardTitle>
                      <CardDescription>
                        {bank.questions_text.split('\n').filter(l => l.trim()).length} questions • 
                        Updated {new Date(bank.updated_at).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={bank.is_active}
                        onCheckedChange={() => toggleActive(bank)}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenDialog(bank)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(bank.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <pre className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-4 font-sans">
                    {bank.questions_text}
                  </pre>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default Questions;
