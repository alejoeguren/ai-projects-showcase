import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LifeBuoy, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AdminLayout } from "@/components/AdminLayout";

interface Ticket {
  id: string;
  user_id: string;
  subject: string;
  message: string;
  category: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
  user_email?: string;
}

const STATUS_OPTIONS = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "resolved", label: "Resolved" },
];

const CATEGORY_OPTIONS = [
  { value: "bug", label: "Bug" },
  { value: "question", label: "Question" },
  { value: "feature_request", label: "Feature Request" },
  { value: "other", label: "Other" },
];

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  open: "outline",
  in_progress: "secondary",
  resolved: "default",
};

const AdminSupportTickets = () => {
  const { toast } = useToast();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState("");
  const [editStatus, setEditStatus] = useState<"open" | "in_progress" | "resolved">("open");
  const [saving, setSaving] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [filter, setFilter] = useState<string>("all");

  const fetchTickets = async () => {
    const { data, error } = await supabase
      .from("support_tickets")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) {
      // Fetch emails for all user_ids
      const userIds = [...new Set(data.map(t => t.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, email")
        .in("user_id", userIds);
      const emailMap = new Map(profiles?.map(p => [p.user_id, p.email]) || []);
      setTickets(data.map(t => ({ ...t, user_email: emailMap.get(t.user_id) || undefined })));
    }
    setLoading(false);
  };

  useEffect(() => { fetchTickets(); }, []);

  const handleEdit = (ticket: Ticket) => {
    setEditingId(ticket.id);
    setEditNotes(ticket.admin_notes || "");
    setEditStatus(ticket.status as "open" | "in_progress" | "resolved");
  };

  const handleSave = async (ticketId: string) => {
    setSaving(true);
    const { error } = await supabase
      .from("support_tickets")
      .update({ status: editStatus, admin_notes: editNotes.trim() || null })
      .eq("id", ticketId);

    if (error) {
      toast({ title: "Error", description: "Failed to update ticket.", variant: "destructive" });
    } else {
      toast({ title: "Updated", description: "Ticket updated successfully." });
      setEditingId(null);
      fetchTickets();
    }
    setSaving(false);
  };

  const filtered = tickets
    .filter(t => filter === "all" || t.status === filter)
    .filter(t => categoryFilter === "all" || t.category === categoryFilter);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Support Tickets</h1>
          <p className="text-muted-foreground">Manage user support requests.</p>
        </div>

        <div className="flex items-center gap-4">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {STATUS_OPTIONS.map(s => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {CATEGORY_OPTIONS.map(c => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Badge variant="secondary">{filtered.length} ticket{filtered.length !== 1 ? "s" : ""}</Badge>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <LifeBuoy className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">No tickets found.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filtered.map((ticket) => (
              <Card key={ticket.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-base">{ticket.subject}</CardTitle>
                      <CardDescription>
                        {new Date(ticket.created_at).toLocaleString()} • {ticket.category.replace("_", " ")} • {ticket.user_email || `User: ${ticket.user_id.slice(0, 8)}…`}
                      </CardDescription>
                    </div>
                    <Badge variant={STATUS_VARIANT[ticket.status] || "outline"}>
                      {STATUS_OPTIONS.find(s => s.value === ticket.status)?.label || ticket.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm">{ticket.message}</p>

                  {editingId === ticket.id ? (
                    <div className="space-y-3 border-t pt-3">
                      <Select value={editStatus} onValueChange={(v) => setEditStatus(v as "open" | "in_progress" | "resolved")}>
                        <SelectTrigger className="w-48">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.map(s => (
                            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Textarea
                        value={editNotes}
                        onChange={(e) => setEditNotes(e.target.value)}
                        placeholder="Add admin notes / response..."
                        rows={3}
                        maxLength={2000}
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleSave(ticket.id)} disabled={saving}>
                          {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                          Save
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between border-t pt-3">
                      {ticket.admin_notes && (
                        <div className="bg-muted rounded-md p-2 flex-1 mr-4">
                          <p className="text-xs font-medium text-muted-foreground mb-1">Admin Notes</p>
                          <p className="text-sm">{ticket.admin_notes}</p>
                        </div>
                      )}
                      <Button size="sm" variant="outline" onClick={() => handleEdit(ticket)}>
                        Respond
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminSupportTickets;
