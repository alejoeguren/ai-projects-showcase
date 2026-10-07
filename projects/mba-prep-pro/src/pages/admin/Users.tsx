import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Pencil, Gift, Loader2 } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  subscription_tier: string;
  created_at: string;
  interviews_used: number;
  interviews_limit: number;
}

interface UserSchoolRow {
  school_id: number;
  interviews_limit: number;
  interviews_used: number;
  school: { id: number; name: string } | null;
}

export default function Users() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [newTier, setNewTier] = useState<string>("");
  const [updating, setUpdating] = useState(false);

  // Grant interview state
  const [grantUser, setGrantUser] = useState<UserProfile | null>(null);
  const [grantSchools, setGrantSchools] = useState<UserSchoolRow[]>([]);
  const [grantSchoolId, setGrantSchoolId] = useState<string>("");
  const [grantCount, setGrantCount] = useState<string>("1");
  const [grantLoading, setGrantLoading] = useState(false);
  const [grantFetchingSchools, setGrantFetchingSchools] = useState(false);

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'beta': return 'destructive';
      case 'premium': return 'default';
      case 'professional': return 'secondary';
      case 'essential': return 'outline';
      default: return 'secondary';
    }
  };

  const handleEditTier = (user: UserProfile) => {
    setEditingUser(user);
    setNewTier(user.subscription_tier || 'free');
  };

  const handleUpdateTier = async () => {
    if (!editingUser) return;
    setUpdating(true);
    try {
      const { error } = await supabase.rpc('upgrade_user_tier', {
        _user_id: editingUser.user_id,
        _new_tier: newTier,
      });
      if (error) throw error;
      toast.success('User tier updated successfully');
      setEditingUser(null);
      fetchUsers();
    } catch (error) {
      console.error('Error updating tier:', error);
      toast.error('Failed to update user tier');
    } finally {
      setUpdating(false);
    }
  };

  const handleOpenGrant = async (user: UserProfile) => {
    setGrantUser(user);
    setGrantSchoolId("");
    setGrantCount("1");
    setGrantFetchingSchools(true);
    try {
      const { data, error } = await supabase
        .from('user_schools')
        .select('school_id, interviews_limit, interviews_used, school:schools(id, name)')
        .eq('user_id', user.user_id);
      if (error) throw error;
      setGrantSchools((data as unknown as UserSchoolRow[]) || []);
    } catch {
      toast.error('Failed to load user schools');
      setGrantSchools([]);
    } finally {
      setGrantFetchingSchools(false);
    }
  };

  const handleGrantInterview = async () => {
    if (!grantUser || !grantSchoolId) return;
    setGrantLoading(true);
    try {
      const count = Math.max(1, Math.min(10, parseInt(grantCount) || 1));
      const schoolIdNum = parseInt(grantSchoolId);
      const currentSchool = grantSchools.find(s => s.school_id === schoolIdNum);
      if (!currentSchool) throw new Error('School not found');

      const newLimit = (currentSchool.interviews_limit ?? 0) + count;
      const { error: updateError } = await supabase
        .from('user_schools')
        .update({ interviews_limit: newLimit })
        .eq('user_id', grantUser.user_id)
        .eq('school_id', schoolIdNum);

      if (updateError) throw updateError;

      const schoolName = currentSchool.school?.name || `School #${schoolIdNum}`;
      toast.success(`Granted ${count} interview${count > 1 ? 's' : ''} for ${schoolName}`);
      setGrantUser(null);
    } catch (error) {
      console.error('Error granting interview:', error);
      toast.error('Failed to grant interview');
    } finally {
      setGrantLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">User Management</h1>
          <p className="text-muted-foreground">View and manage user accounts</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Users ({users.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead>Interviews</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        {user.first_name && user.last_name
                          ? `${user.first_name} ${user.last_name}`
                          : 'N/A'}
                      </TableCell>
                      <TableCell>{user.email || 'N/A'}</TableCell>
                      <TableCell>
                        <Badge variant={getTierColor(user.subscription_tier)}>
                          {user.subscription_tier || 'free'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.interviews_used}/{user.interviews_limit}
                      </TableCell>
                      <TableCell>
                        {new Date(user.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => handleEditTier(user)} title="Edit tier">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleOpenGrant(user)} title="Grant free interview">
                            <Gift className="h-4 w-4" />
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

        {/* Edit Tier Dialog */}
        <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Update User Tier</DialogTitle>
              <DialogDescription>
                Change the subscription tier for {editingUser?.first_name} {editingUser?.last_name}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Select value={newTier} onValueChange={setNewTier}>
                <SelectTrigger>
                  <SelectValue placeholder="Select tier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="beta">Beta Tester</SelectItem>
                  <SelectItem value="essential">Essential</SelectItem>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="premium">Premium</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingUser(null)} disabled={updating}>Cancel</Button>
              <Button onClick={handleUpdateTier} disabled={updating}>
                {updating ? 'Updating...' : 'Update Tier'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Grant Interview Dialog */}
        <Dialog open={!!grantUser} onOpenChange={() => setGrantUser(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Gift className="h-5 w-5" />
                Grant Free Interview
              </DialogTitle>
              <DialogDescription>
                Add interview credits for {grantUser?.first_name} {grantUser?.last_name} ({grantUser?.email})
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              {grantFetchingSchools ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : grantSchools.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  This user has no schools selected. They need to select schools first.
                </p>
              ) : (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">School</label>
                    <Select value={grantSchoolId} onValueChange={setGrantSchoolId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select school" />
                      </SelectTrigger>
                      <SelectContent>
                        {grantSchools.map((s) => (
                          <SelectItem key={s.school_id} value={String(s.school_id)}>
                            {s.school?.name || `School #${s.school_id}`} — {s.interviews_used}/{s.interviews_limit} used
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Number of interviews to add</label>
                    <Select value={grantCount} onValueChange={setGrantCount}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 5, 10].map(n => (
                          <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setGrantUser(null)} disabled={grantLoading}>Cancel</Button>
              <Button onClick={handleGrantInterview} disabled={grantLoading || !grantSchoolId || grantSchools.length === 0}>
                {grantLoading ? <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Granting...</> : 'Grant Interview'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
