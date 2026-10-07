import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageSquare, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/AdminLayout";

interface FeedbackItem {
  id: string;
  user_id: string;
  context: string;
  session_id: string | null;
  rating: number | null;
  comment: string | null;
  created_at: string;
}

const CONTEXT_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  post_interview: "Post Interview",
  report_review: "Report Review",
};

const AdminFeedback = () => {
  const [feedbackList, setFeedbackList] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    const fetch = async () => {
      const { data, error } = await supabase
        .from("feedback")
        .select("*")
        .order("created_at", { ascending: false });
      if (!error) setFeedbackList(data || []);
      setLoading(false);
    };
    fetch();
  }, []);

  const filtered = filter === "all" ? feedbackList : feedbackList.filter(f => f.context === filter);

  const avgRating = (() => {
    const rated = filtered.filter(f => f.rating != null);
    if (rated.length === 0) return null;
    return (rated.reduce((s, f) => s + (f.rating || 0), 0) / rated.length).toFixed(1);
  })();

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">User Feedback</h1>
          <p className="text-muted-foreground">View feedback and ideas from users.</p>
        </div>

        <div className="flex items-center gap-4">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by context" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Feedback</SelectItem>
              <SelectItem value="dashboard">Dashboard</SelectItem>
              <SelectItem value="post_interview">Post Interview</SelectItem>
              <SelectItem value="report_review">Report Review</SelectItem>
            </SelectContent>
          </Select>
          <Badge variant="secondary">{filtered.length} entries</Badge>
          {avgRating && (
            <Badge variant="outline" className="gap-1">
              <Star className="h-3 w-3 fill-primary text-primary" /> {avgRating} avg
            </Badge>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">No feedback yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((fb) => (
              <Card key={fb.id}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{CONTEXT_LABELS[fb.context] || fb.context}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(fb.created_at).toLocaleString()}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          User: {fb.user_id.slice(0, 8)}…
                        </span>
                      </div>
                      {fb.comment && <p className="text-sm mt-2">{fb.comment}</p>}
                    </div>
                    {fb.rating != null && (
                      <div className="flex items-center gap-0.5 shrink-0">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`h-4 w-4 ${s <= fb.rating! ? "fill-primary text-primary" : "text-muted-foreground/20"}`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminFeedback;
