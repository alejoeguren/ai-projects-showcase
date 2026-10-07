import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useOnboarding } from '@/hooks/useOnboarding';
import { useQueryClient } from '@tanstack/react-query';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, firstName?: string, lastName?: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // On sign-out, reset onboarding and clear query cache
        if (event === 'SIGNED_OUT') {
          useOnboarding.getState().resetOnboarding();
          queryClient.clear();
        }

        // Reset onboarding for new signups
        if (event === 'SIGNED_IN' && session?.user) {
          setTimeout(() => {
            checkAndResetOnboarding(session.user.id);
          }, 0);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAndResetOnboarding = async (userId: string) => {
    try {
      const onboardingState = useOnboarding.getState();

      // If onboarding is already complete, nothing to do
      if (onboardingState.isOnboardingComplete) {
        return;
      }

      // Check if user profile was just created (brand new user)
      const { data: profile } = await supabase
        .from('profiles')
        .select('created_at')
        .eq('user_id', userId)
        .single();
      
      if (profile) {
        const createdAt = new Date(profile.created_at);
        const now = new Date();
        const diffMinutes = (now.getTime() - createdAt.getTime()) / 1000 / 60;
        
        if (diffMinutes < 1) {
          // Brand new user — reset onboarding to start fresh
          useOnboarding.getState().resetOnboarding();
          return;
        }
      }

      // Returning user — restore onboarding step from DB data
      const { data: userSchools } = await supabase
        .from('user_schools')
        .select('school_id')
        .eq('user_id', userId);

      if (userSchools && userSchools.length > 0) {
        // User has selected schools — advance past school selection
        useOnboarding.getState().setSelectedSchools(userSchools.map(s => s.school_id));
        useOnboarding.getState().setCurrentStep('resume-upload');
      }
    } catch (error) {
      console.error('Error checking onboarding:', error);
    }
  };

  const signUp = async (email: string, password: string, firstName?: string, lastName?: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          first_name: firstName,
          last_name: lastName
        }
      }
    });

    if (error) {
      toast({
        title: "Sign Up Failed",
        description: error.message,
        variant: "destructive"
      });
    } else {
      toast({
        title: "Check Your Email",
        description: "We've sent you a confirmation link to complete your registration."
      });
    }

    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      toast({
        title: "Sign In Failed",
        description: error.message,
        variant: "destructive"
      });
    } else {
      toast({
        title: "Welcome Back!",
        description: "You've been successfully signed in."
      });
    }

    return { error };
  };

  const signOut = async () => {
    const clearSupabaseAuthStorage = () => {
      if (typeof window === 'undefined') return;

      const clearStorage = (storage: Storage) => {
        const keysToRemove: string[] = [];

        for (let i = 0; i < storage.length; i++) {
          const key = storage.key(i);
          if (!key) continue;

          if (/^sb-.*-auth-token$/.test(key) || key === 'supabase.auth.token') {
            keysToRemove.push(key);
          }
        }

        keysToRemove.forEach((key) => storage.removeItem(key));
      };

      clearStorage(window.localStorage);
      clearStorage(window.sessionStorage);
    };

    useOnboarding.getState().resetOnboarding();
    queryClient.clear();

    const { error } = await supabase.auth.signOut({ scope: 'local' });

    // Always hard-clear local auth artifacts to prevent stale-session restoration on refresh
    clearSupabaseAuthStorage();
    setSession(null);
    setUser(null);
    setLoading(false);

    if (error) {
      console.error('Error signing out:', error);
      toast({
        title: "Signed Out Locally",
        description: "Your local session was cleared. Please refresh if needed.",
      });
      return;
    }

    toast({
      title: "Signed Out",
      description: "You've been successfully signed out."
    });
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      signUp,
      signIn,
      signOut
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};