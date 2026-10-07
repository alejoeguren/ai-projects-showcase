import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface AIConfiguration {
  id: string;
  name: string;
  system_prompt: string;
  guardrails: string[];
  tools_config: Record<string, any>;
  is_active: boolean;
  created_at: string;
}

interface GuardrailInput {
  id: string;
  value: string;
}

export default function AIConfiguration() {
  const [configurations, setConfigurations] = useState<AIConfiguration[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<AIConfiguration | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    system_prompt: "",
    guardrails: [{ id: "1", value: "" }] as GuardrailInput[],
    tools_config: "{}",
  });

  useEffect(() => {
    fetchConfigurations();
  }, []);

  const fetchConfigurations = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_configurations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Map data to correct types
      const mappedData = (data || []).map(config => ({
        ...config,
        guardrails: Array.isArray(config.guardrails) ? config.guardrails as string[] : [],
        tools_config: typeof config.tools_config === 'object' ? config.tools_config as Record<string, any> : {},
      }));
      
      setConfigurations(mappedData);
    } catch (error) {
      console.error('Error fetching configurations:', error);
      toast.error('Failed to load configurations');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (config?: AIConfiguration) => {
    if (config) {
      setEditingConfig(config);
      setFormData({
        name: config.name,
        system_prompt: config.system_prompt,
        guardrails: config.guardrails.length > 0 
          ? config.guardrails.map((g, i) => ({ id: String(i + 1), value: g }))
          : [{ id: "1", value: "" }],
        tools_config: JSON.stringify(config.tools_config, null, 2),
      });
    } else {
      setEditingConfig(null);
      setFormData({
        name: "",
        system_prompt: "",
        guardrails: [{ id: "1", value: "" }],
        tools_config: "{}",
      });
    }
    setDialogOpen(true);
  };

  const addGuardrail = () => {
    setFormData({
      ...formData,
      guardrails: [...formData.guardrails, { id: String(Date.now()), value: "" }],
    });
  };

  const removeGuardrail = (id: string) => {
    if (formData.guardrails.length === 1) return;
    setFormData({
      ...formData,
      guardrails: formData.guardrails.filter(g => g.id !== id),
    });
  };

  const updateGuardrail = (id: string, value: string) => {
    setFormData({
      ...formData,
      guardrails: formData.guardrails.map(g => g.id === id ? { ...g, value } : g),
    });
  };

  const handleSave = async () => {
    if (!formData.name || !formData.system_prompt) {
      toast.error('Name and system prompt are required');
      return;
    }

    setSaving(true);
    try {
      let toolsConfig;
      try {
        toolsConfig = JSON.parse(formData.tools_config);
      } catch {
        toast.error('Invalid JSON in tools configuration');
        setSaving(false);
        return;
      }

      const guardrails = formData.guardrails
        .map(g => g.value.trim())
        .filter(g => g.length > 0);

      const payload = {
        name: formData.name,
        system_prompt: formData.system_prompt,
        guardrails,
        tools_config: toolsConfig,
      };

      if (editingConfig) {
        const { error } = await supabase
          .from('ai_configurations')
          .update(payload)
          .eq('id', editingConfig.id);

        if (error) throw error;
        toast.success('Configuration updated successfully');
      } else {
        const { error } = await supabase
          .from('ai_configurations')
          .insert(payload);

        if (error) throw error;
        toast.success('Configuration created successfully');
      }

      setDialogOpen(false);
      fetchConfigurations();
    } catch (error) {
      console.error('Error saving configuration:', error);
      toast.error('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleActivate = async (id: string) => {
    try {
      const { error } = await supabase.rpc('activate_ai_configuration', {
        _config_id: id,
      });

      if (error) throw error;
      toast.success('Configuration activated');
      fetchConfigurations();
    } catch (error) {
      console.error('Error activating configuration:', error);
      toast.error('Failed to activate configuration');
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;

    try {
      const { error } = await supabase
        .from('ai_configurations')
        .delete()
        .eq('id', deletingId);

      if (error) throw error;
      toast.success('Configuration deleted');
      setDeleteDialogOpen(false);
      setDeletingId(null);
      fetchConfigurations();
    } catch (error) {
      console.error('Error deleting configuration:', error);
      toast.error('Failed to delete configuration');
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">AI Configuration</h1>
            <p className="text-muted-foreground">
              Manage system prompts, guardrails, and tool configurations
            </p>
          </div>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            New Configuration
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Configuration Presets</CardTitle>
            <CardDescription>
              Create and manage different AI behavior configurations
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : configurations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No configurations yet. Create your first one!
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Guardrails</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {configurations.map((config) => (
                    <TableRow key={config.id}>
                      <TableCell className="font-medium">{config.name}</TableCell>
                      <TableCell>
                        {config.is_active ? (
                          <Badge variant="default">Active</Badge>
                        ) : (
                          <Badge variant="outline">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell>{config.guardrails.length} rules</TableCell>
                      <TableCell>
                        {new Date(config.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {!config.is_active && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleActivate(config.id)}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDialog(config)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setDeletingId(config.id);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingConfig ? 'Edit Configuration' : 'New Configuration'}
              </DialogTitle>
              <DialogDescription>
                Define the AI's behavior, constraints, and available tools
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Configuration Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Interview Assistant v1"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="system_prompt">System Prompt</Label>
                <Textarea
                  id="system_prompt"
                  value={formData.system_prompt}
                  onChange={(e) => setFormData({ ...formData, system_prompt: e.target.value })}
                  placeholder="You are a helpful AI assistant that..."
                  rows={6}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Guardrails</Label>
                  <Button variant="outline" size="sm" onClick={addGuardrail}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Rule
                  </Button>
                </div>
                {formData.guardrails.map((guardrail) => (
                  <div key={guardrail.id} className="flex gap-2">
                    <Input
                      value={guardrail.value}
                      onChange={(e) => updateGuardrail(guardrail.id, e.target.value)}
                      placeholder="e.g., Never reveal confidential information"
                    />
                    {formData.guardrails.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeGuardrail(guardrail.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <Label htmlFor="tools_config">Tools Configuration (JSON)</Label>
                <Textarea
                  id="tools_config"
                  value={formData.tools_config}
                  onChange={(e) => setFormData({ ...formData, tools_config: e.target.value })}
                  placeholder='{"tool_name": {"enabled": true, "config": {}}}'
                  rows={8}
                  className="font-mono text-sm"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save Configuration'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Configuration</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this configuration? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
}
