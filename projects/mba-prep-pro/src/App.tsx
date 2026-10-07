import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { AppSidebar } from "@/components/AppSidebar";
import { AdminRoute } from "@/components/AdminRoute";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { useOnboarding } from "@/hooks/useOnboarding";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Schools from "./pages/Schools";
import Documents from "./pages/Documents";
import Reports from "./pages/Reports";
import Onboarding from "./pages/Onboarding";
import MockInterview from "./pages/MockInterview";
import Pricing from "./pages/Pricing";
import Auth from "./pages/Auth";
import Settings from "./pages/Settings";
import LearnMore from "./pages/LearnMore";
import NotFound from "./pages/NotFound";
import PaymentSuccess from "./pages/PaymentSuccess";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminStudyMaterials from "./pages/admin/StudyMaterials";
import StudyMaterials from "./pages/StudyMaterials";
import Blog from "./pages/Blog";
import MbaInterviewQuestions from "./pages/MbaInterviewQuestions";

import Users from "./pages/admin/Users";
import AdminSchools from "./pages/admin/Schools";
import AdminSettings from "./pages/admin/Settings";
import AdminAIConfiguration from "./pages/admin/AIConfiguration";
import AdminQuestions from "./pages/admin/Questions";
import AdminBetaWaitlist from "./pages/admin/BetaWaitlist";
import Support from "./pages/Support";
import AdminSupportTickets from "./pages/admin/SupportTickets";
import AdminFeedback from "./pages/admin/Feedback";

const queryClient = new QueryClient();

// Protected route component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};

// Requires auth + completed onboarding
const OnboardingGuard = ({ children }: { children: React.ReactNode }) => {
  const { isOnboardingComplete } = useOnboarding();

  if (!isOnboardingComplete) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
};

const AppContent = () => {
  const location = useLocation();
  
  // Pages that should not show the sidebar
  const noSidebarPages = ['/', '/auth', '/onboarding', '/mock-interview', '/pricing', '/learn-more', '/blog', '/mba-interview-questions', '/payment-success'];
  const showSidebar = !noSidebarPages.includes(location.pathname) && !location.pathname.startsWith('/admin');

  if (!showSidebar) {
    return (
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/mba-interview-questions" element={<MbaInterviewQuestions />} />

        <Route path="/pricing" element={<Pricing />} />
        <Route path="/payment-success" element={
          <ProtectedRoute>
            <PaymentSuccess />
          </ProtectedRoute>
        } />
        <Route path="/learn-more" element={<LearnMore />} />
        <Route path="/onboarding" element={
          <ProtectedRoute>
            <Onboarding />
          </ProtectedRoute>
        } />
        <Route path="/mock-interview" element={
          <ProtectedRoute>
            <MockInterview />
          </ProtectedRoute>
        } />
        <Route path="/admin" element={
          <AdminRoute>
            <AdminDashboard />
          </AdminRoute>
        } />
        <Route path="/study-materials" element={
          <ProtectedRoute>
            <StudyMaterials />
          </ProtectedRoute>
        } />
        <Route path="/admin/materials" element={
          <AdminRoute>
            <AdminStudyMaterials />
          </AdminRoute>
        } />
        <Route path="/admin/users" element={
          <AdminRoute>
            <Users />
          </AdminRoute>
        } />
        <Route path="/admin/schools" element={
          <AdminRoute>
            <AdminSchools />
          </AdminRoute>
        } />
        <Route path="/admin/ai-config" element={
          <AdminRoute>
            <AdminAIConfiguration />
          </AdminRoute>
        } />
        <Route path="/admin/questions" element={
          <AdminRoute>
            <AdminQuestions />
          </AdminRoute>
        } />
        <Route path="/admin/beta" element={
          <AdminRoute>
            <AdminBetaWaitlist />
          </AdminRoute>
        } />
        <Route path="/admin/settings" element={
          <AdminRoute>
            <AdminSettings />
          </AdminRoute>
        } />
        <Route path="/admin/support" element={
          <AdminRoute>
            <AdminSupportTickets />
          </AdminRoute>
        } />
        <Route path="/admin/feedback" element={
          <AdminRoute>
            <AdminFeedback />
          </AdminRoute>
        } />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        
        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Header with trigger */}
          <header className="h-14 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex items-center h-full px-4">
              <SidebarTrigger className="mr-4" />
            </div>
          </header>
          
          {/* Page Content */}
          <main className="flex-1 overflow-auto">
            <Routes>
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <OnboardingGuard>
                    <Dashboard />
                  </OnboardingGuard>
                </ProtectedRoute>
              } />
              <Route path="/schools" element={
                <ProtectedRoute>
                  <OnboardingGuard>
                    <Schools />
                  </OnboardingGuard>
                </ProtectedRoute>
              } />
              <Route path="/documents" element={
                <ProtectedRoute>
                  <OnboardingGuard>
                    <Documents />
                  </OnboardingGuard>
                </ProtectedRoute>
              } />
              <Route path="/reports" element={
                <ProtectedRoute>
                  <OnboardingGuard>
                    <Reports />
                  </OnboardingGuard>
                </ProtectedRoute>
              } />
              <Route path="/settings" element={
                <ProtectedRoute>
                  <OnboardingGuard>
                    <Settings />
                  </OnboardingGuard>
                </ProtectedRoute>
              } />
              <Route path="/support" element={
                <ProtectedRoute>
                  <OnboardingGuard>
                    <Support />
                  </OnboardingGuard>
                </ProtectedRoute>
              } />
              <Route path="/study-materials" element={
                <ProtectedRoute>
                  <OnboardingGuard>
                    <StudyMaterials />
                  </OnboardingGuard>
                </ProtectedRoute>
              } />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
