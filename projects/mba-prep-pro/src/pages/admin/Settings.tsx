import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Settings as SettingsIcon, Shield, Mail, Database, CreditCard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function AdminSettings() {
  const [skipPricing, setSkipPricing] = useState(false);
  const [loadingSetting, setLoadingSetting] = useState(true);
  const [platformName, setPlatformName] = useState("MBA Prep Pro");
  const [supportEmail, setSupportEmail] = useState("");
  const [savingPlatform, setSavingPlatform] = useState(false);
  const [welcomeEmails, setWelcomeEmails] = useState(true);
  const [interviewReminders, setInterviewReminders] = useState(true);
  const [progressReports, setProgressReports] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase
        .from('app_settings')
        .select('key, value')
        .in('key', ['skip_pricing', 'platform_name', 'support_email', 'welcome_emails', 'interview_reminders', 'progress_reports']);
      
      data?.forEach((row) => {
        if (row.key === 'skip_pricing') setSkipPricing(row.value === 'true');
        if (row.key === 'platform_name') setPlatformName(row.value);
        if (row.key === 'support_email') setSupportEmail(row.value);
        if (row.key === 'welcome_emails') setWelcomeEmails(row.value === 'true');
        if (row.key === 'interview_reminders') setInterviewReminders(row.value === 'true');
        if (row.key === 'progress_reports') setProgressReports(row.value === 'true');
      });
      setLoadingSetting(false);
    };
    fetchSettings();
  }, []);

  const savePlatformSettings = async () => {
    setSavingPlatform(true);
    try {
      const { error: e1 } = await supabase
        .from('app_settings')
        .upsert({ key: 'platform_name', value: platformName }, { onConflict: 'key' });
      const { error: e2 } = await supabase
        .from('app_settings')
        .upsert({ key: 'support_email', value: supportEmail }, { onConflict: 'key' });
      
      if (e1 || e2) {
        toast.error('Failed to save platform settings');
      } else {
        toast.success('Platform settings saved!');
      }
    } catch {
      toast.error('An unexpected error occurred');
    } finally {
      setSavingPlatform(false);
    }
  };

  const saveEmailSettings = async () => {
    setSavingEmail(true);
    try {
      const settings = [
        { key: 'welcome_emails', value: String(welcomeEmails) },
        { key: 'interview_reminders', value: String(interviewReminders) },
        { key: 'progress_reports', value: String(progressReports) },
      ];
      const results = await Promise.all(
        settings.map(s => supabase.from('app_settings').upsert(s, { onConflict: 'key' }))
      );
      if (results.some(r => r.error)) {
        toast.error('Failed to save email settings');
      } else {
        toast.success('Email settings saved!');
      }
    } catch {
      toast.error('An unexpected error occurred');
    } finally {
      setSavingEmail(false);
    }
  };

  const toggleSkipPricing = async (checked: boolean) => {
    setSkipPricing(checked);
    const { error } = await supabase
      .from('app_settings')
      .upsert({ key: 'skip_pricing', value: String(checked) }, { onConflict: 'key' });
    if (error) {
      toast.error('Failed to update setting');
      setSkipPricing(!checked);
    } else {
      toast.success(`Skip Pricing ${checked ? 'enabled' : 'disabled'}`);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Admin Settings</h1>
          <p className="text-muted-foreground">Manage platform configuration and settings</p>
        </div>

        <div className="grid gap-6">
          {/* Platform Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SettingsIcon className="h-5 w-5" />
                Platform Settings
              </CardTitle>
              <CardDescription>
                Configure general platform settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="platform-name">Platform Name</Label>
                <Input id="platform-name" value={platformName} onChange={(e) => setPlatformName(e.target.value)} />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="support-email">Support Email</Label>
                <Input id="support-email" type="email" value={supportEmail} onChange={(e) => setSupportEmail(e.target.value)} placeholder="support@mbainterviewace.com" />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Maintenance Mode</Label>
                  <p className="text-sm text-muted-foreground">
                    Temporarily disable user access to the platform
                  </p>
                </div>
                <Switch />
              </div>

              <Separator />

              <Button onClick={savePlatformSettings} disabled={savingPlatform}>
                {savingPlatform ? 'Saving...' : 'Save Platform Settings'}
              </Button>
            </CardContent>
          </Card>

          {/* Onboarding Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Onboarding Settings
              </CardTitle>
              <CardDescription>
                Control the onboarding flow for new users
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Skip Pricing Step</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow users to skip the pricing page during onboarding (for testing)
                  </p>
                </div>
                <Switch
                  checked={skipPricing}
                  onCheckedChange={toggleSkipPricing}
                  disabled={loadingSetting}
                />
              </div>
            </CardContent>
          </Card>

          {/* User Management Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                User Management
              </CardTitle>
              <CardDescription>
                Configure user registration and access settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Allow New Registrations</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable or disable new user sign-ups
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Require Email Verification</Label>
                  <p className="text-sm text-muted-foreground">
                    Users must verify email before accessing platform
                  </p>
                </div>
                <Switch />
              </div>

              <div className="space-y-2">
                <Label htmlFor="default-tier">Default User Tier</Label>
                <Input id="default-tier" defaultValue="free" disabled />
                <p className="text-xs text-muted-foreground">
                  New users are assigned the free tier by default
                </p>
              </div>

              <Separator />

              <Button>Save User Settings</Button>
            </CardContent>
          </Card>

          {/* Email Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Email Settings
              </CardTitle>
              <CardDescription>
                Configure email notifications and templates
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Welcome Emails</Label>
                  <p className="text-sm text-muted-foreground">
                    Send welcome email to new users
                  </p>
                </div>
                <Switch checked={welcomeEmails} onCheckedChange={setWelcomeEmails} />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Interview Reminders</Label>
                  <p className="text-sm text-muted-foreground">
                    Send reminders for upcoming practice sessions
                  </p>
                </div>
                <Switch checked={interviewReminders} onCheckedChange={setInterviewReminders} />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Progress Reports</Label>
                  <p className="text-sm text-muted-foreground">
                    Send weekly progress reports to users
                  </p>
                </div>
                <Switch checked={progressReports} onCheckedChange={setProgressReports} />
              </div>

              <Separator />

              <Button onClick={saveEmailSettings} disabled={savingEmail}>
                {savingEmail ? 'Saving...' : 'Save Email Settings'}
              </Button>
            </CardContent>
          </Card>

          {/* Database & Storage */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Database & Storage
              </CardTitle>
              <CardDescription>
                Manage database and file storage
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Database Status</Label>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500"></div>
                  <span className="text-sm text-muted-foreground">Connected</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Storage Usage</Label>
                <p className="text-sm text-muted-foreground">
                  Storage metrics coming soon...
                </p>
              </div>

              <Separator />

              <div className="flex gap-2">
                <Button variant="outline">View Database</Button>
                <Button variant="outline">Manage Storage</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
