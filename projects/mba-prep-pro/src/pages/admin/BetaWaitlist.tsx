import { useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { UserPlus, Users, Shield, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function BetaWaitlist() {
  const [newEmail, setNewEmail] = useState("");
  const queryClient = useQueryClient();

  // Fetch beta mode setting
  const { data: betaMode } = useQuery({
    queryKey: ['beta-mode'],
    queryFn: async () => {
      const { data } = await supabase
        .from('app_settings' as any)
        .select('value')
        .eq('key', 'beta_mode')
        .single();
      return (data as any)?.value === 'true';
    },
  });

  // Fetch whitelist
  const { data: whitelist = [] } = useQuery({
    queryKey: ['beta-whitelist'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('beta_whitelist' as any)
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  // Fetch waitlist
  const { data: waitlist = [] } = useQuery({
    queryKey: ['waitlist'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('waitlist' as any)
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  // Toggle beta mode
  const toggleBetaMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const { error } = await supabase
        .from('app_settings' as any)
        .update({ value: enabled ? 'true' : 'false' } as any)
        .eq('key', 'beta_mode');
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['beta-mode'] });
      toast.success('Beta mode updated');
    },
  });

  // Add to whitelist
  const addWhitelistMutation = useMutation({
    mutationFn: async (email: string) => {
      const { error } = await supabase
        .from('beta_whitelist' as any)
        .insert({ email: email.toLowerCase() } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['beta-whitelist'] });
      setNewEmail("");
      toast.success('Email added to whitelist');
    },
    onError: (err: any) => {
      toast.error(err.message?.includes('duplicate') ? 'Email already whitelisted' : 'Failed to add email');
    },
  });

  // Remove from whitelist
  const removeWhitelistMutation = useMutation({
    mutationFn: async (email: string) => {
      const { error } = await supabase
        .from('beta_whitelist' as any)
        .delete()
        .eq('email', email);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['beta-whitelist'] });
      toast.success('Email removed from whitelist');
    },
  });

  // Promote from waitlist to whitelist
  const promoteMutation = useMutation({
    mutationFn: async (entry: any) => {
      // Add to whitelist
      await supabase
        .from('beta_whitelist' as any)
        .insert({ email: entry.email.toLowerCase() } as any);
      // Remove from waitlist
      await supabase
        .from('waitlist' as any)
        .delete()
        .eq('id', entry.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['beta-whitelist'] });
      queryClient.invalidateQueries({ queryKey: ['waitlist'] });
      toast.success('User promoted to beta!');
    },
    onError: () => toast.error('Failed to promote user'),
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Beta & Waitlist</h1>
          <p className="text-muted-foreground">Manage beta access and waitlist signups</p>
        </div>

        {/* Beta Mode Toggle */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Beta Mode
            </CardTitle>
            <CardDescription>
              When enabled, only whitelisted emails can create accounts. Others are directed to the waitlist.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Switch
                checked={betaMode ?? false}
                onCheckedChange={(checked) => toggleBetaMutation.mutate(checked)}
              />
              <Label>{betaMode ? 'Beta Mode Active' : 'Beta Mode Off (open registration)'}</Label>
            </div>
          </CardContent>
        </Card>

        {/* Whitelist Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Beta Whitelist
              <Badge variant="secondary">{whitelist.length}</Badge>
            </CardTitle>
            <CardDescription>
              Manually add emails that are allowed to sign up
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (newEmail.trim()) addWhitelistMutation.mutate(newEmail.trim());
              }}
              className="flex gap-2"
            >
              <Input
                placeholder="email@example.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                type="email"
                className="max-w-sm"
              />
              <Button type="submit" disabled={addWhitelistMutation.isPending}>
                Add to Whitelist
              </Button>
            </form>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {whitelist.map((entry: any) => (
                  <TableRow key={entry.id}>
                    <TableCell>{entry.email}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(entry.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeWhitelistMutation.mutate(entry.email)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {whitelist.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                      No whitelisted emails yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Waitlist */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Waitlist Signups
              <Badge variant="secondary">{waitlist.length}</Badge>
            </CardTitle>
            <CardDescription>
              Users who signed up for the waitlist. Promote them to beta to grant access.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Signed Up</TableHead>
                  <TableHead className="w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {waitlist.map((entry: any) => (
                  <TableRow key={entry.id}>
                    <TableCell>{entry.email}</TableCell>
                    <TableCell>{entry.name || '—'}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(entry.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        onClick={() => promoteMutation.mutate(entry)}
                        disabled={promoteMutation.isPending}
                      >
                        Add to Beta
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {waitlist.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      No waitlist signups yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
