import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LifeBuoy, Send, Loader2, CheckCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Support = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState<string>("question");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !subject.trim() || !message.trim()) return;

    setSubmitting(true);
    const { error } = await supabase.from("support_tickets").insert([{
      user_id: user.id,
      subject: subject.trim(),
      message: message.trim(),
      category: category as "bug" | "question" | "feature_request" | "other",
    }]);

    if (error) {
      toast({ title: "Error", description: "Failed to submit request.", variant: "destructive" });
    } else {
      setSubmitted(true);
    }
    setSubmitting(false);
  };

  const handleNewRequest = () => {
    setSubject("");
    setMessage("");
    setCategory("question");
    setSubmitted(false);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Support</h1>
        <p className="text-muted-foreground">Need help? Submit a support request and we'll get back to you.</p>
      </div>

      {submitted ? (
        <Card>
          <CardContent className="py-12 text-center space-y-4">
            <CheckCircle className="h-12 w-12 text-success mx-auto" />
            <h2 className="text-xl font-semibold text-foreground">Request Submitted!</h2>
            <p className="text-muted-foreground">Thank you for reaching out. We'll review your request and get back to you soon.</p>
            <Button variant="outline" onClick={handleNewRequest}>Submit Another Request</Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LifeBuoy className="h-5 w-5" />
              New Support Request
            </CardTitle>
            <CardDescription>Describe your issue and we'll help you out.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="support-subject" className="text-sm font-medium">Subject</label>
                  <Input
                    id="support-subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Brief description of your issue"
                    maxLength={200}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="support-category" className="text-sm font-medium">Category</label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger id="support-category" aria-label="Category">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="question">Question</SelectItem>
                      <SelectItem value="bug">Bug Report</SelectItem>
                      <SelectItem value="feature_request">Feature Request</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <label htmlFor="support-message" className="text-sm font-medium">Message</label>
                <Textarea
                  id="support-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Describe your issue in detail..."
                  rows={4}
                  maxLength={2000}
                  required
                />
              </div>

              <Button type="submit" disabled={submitting} className="gap-2">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Submit Request
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Support;
