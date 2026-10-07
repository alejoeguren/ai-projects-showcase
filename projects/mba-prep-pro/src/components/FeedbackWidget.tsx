import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Star, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface FeedbackWidgetProps {
  context: "dashboard" | "post_interview" | "report_review";
  sessionId?: string;
  compact?: boolean;
}

const FeedbackWidget = ({ context, sessionId, compact = false }: FeedbackWidgetProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!user || (rating === 0 && !comment.trim())) return;

    setSubmitting(true);
    const { error } = await supabase.from("feedback").insert([{
      user_id: user.id,
      context,
      rating: rating || null,
      comment: comment.trim() || null,
      session_id: sessionId || null,
    }]);

    if (error) {
      toast({ title: "Error", description: "Failed to submit feedback.", variant: "destructive" });
    } else {
      toast({ title: "Thank you!", description: "Your feedback has been recorded." });
      setSubmitted(true);
    }
    setSubmitting(false);
  };

  if (submitted) {
    return (
      <Card className={cn(compact && "border-0 shadow-none bg-muted/30")}>
        <CardContent className="py-6 text-center">
          <MessageSquare className="h-8 w-8 text-primary mx-auto mb-2" />
          <p className="text-sm font-medium text-foreground">Thanks for your feedback!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(compact && "border-0 shadow-none bg-muted/30")}>
      <CardHeader className={cn("pb-3", compact && "pb-2")}>
        <CardTitle className="text-base flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          Send Feedback
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Star Rating */}
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              className="p-0.5 transition-colors"
            >
              <Star
                className={cn(
                  "h-6 w-6 transition-colors",
                  (hoverRating || rating) >= star
                    ? "fill-primary text-primary"
                    : "text-muted-foreground/30"
                )}
              />
            </button>
          ))}
        </div>

        <Textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Share your thoughts, suggestions, or ideas..."
          rows={3}
          maxLength={1000}
        />

        <Button
          onClick={handleSubmit}
          disabled={submitting || (rating === 0 && !comment.trim())}
          size="sm"
          className="gap-2"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
          Send Feedback
        </Button>
      </CardContent>
    </Card>
  );
};

export default FeedbackWidget;
