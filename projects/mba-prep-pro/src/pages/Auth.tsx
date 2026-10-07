import { Seo } from "@/components/Seo";
import React, { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { BookOpen, Mail, Lock, User, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useOnboarding } from '@/hooks/useOnboarding';
import { useForm } from 'react-hook-form';
import { useBetaMode, checkEmailWhitelisted } from '@/hooks/useBetaMode';
import { supabase } from '@/integrations/supabase/client';

interface AuthFormData {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  confirmPassword?: string;
}

const Auth = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [waitlisted, setWaitlisted] = useState(false);
  const { user, loading, signIn, signUp } = useAuth();
  const { isOnboardingComplete } = useOnboarding();
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<AuthFormData>();
  const { isBetaMode } = useBetaMode();

  // Redirect authenticated users to onboarding if not complete, otherwise to dashboard
  if (!loading && user) {
    if (!isOnboardingComplete) {
      return <Navigate to="/onboarding" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-hero">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  const onSubmit = async (data: AuthFormData) => {
    if (isSignUp) {
      if (data.password !== data.confirmPassword) {
        return;
      }

      // Beta gate: check whitelist before allowing signup
      if (isBetaMode) {
        const result = await checkEmailWhitelisted(data.email);
        if (result.error) {
          // Don't block signup on check failure - let them through
          console.error('Whitelist check error, allowing signup:', result.error);
        } else if (!result.whitelisted) {
          // Add to waitlist
          const { error: waitlistError } = await supabase
            .from('waitlist' as any)
            .insert({ email: data.email.toLowerCase(), name: `${data.firstName || ''} ${data.lastName || ''}`.trim() || null } as any);
          if (waitlistError) {
            console.error('Failed to add to waitlist:', waitlistError);
          }
          setWaitlisted(true);
          return;
        }
      }

      await signUp(data.email, data.password, data.firstName, data.lastName);
    } else {
      await signIn(data.email, data.password);
    }
  };

  const password = watch("password");

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
      <Seo
        title="Sign In — MBA Prep Pro"
        description="Sign in or create your MBA Prep Pro account to start practicing AI mock interviews for your target business schools."
        path="/auth"
        noindex
      />

      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center space-x-2 text-white hover:text-white/80 transition-colors mb-6">
            <ArrowLeft className="h-5 w-5" />
            <span>Back to Home</span>
          </Link>
          <div className="flex items-center justify-center space-x-2 mb-4">
            <BookOpen className="h-8 w-8 text-white" />
            <span className="text-2xl font-bold text-white">MBA Prep Pro</span>
          </div>
        </div>

        <h1 className="sr-only">{isSignUp ? 'Create your MBA Prep Pro account' : 'Sign in to MBA Prep Pro'}</h1>

        {waitlisted ? (
          <Card className="shadow-card-hover">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">You're on the List! 🎉</CardTitle>
              <CardDescription className="text-base mt-2">
                Thanks for your interest in MBA Prep Pro! We're currently in private beta.
                We'll notify you as soon as your spot is ready.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button variant="outline" onClick={() => setWaitlisted(false)}>
                Back to Sign In
              </Button>
            </CardContent>
          </Card>
        ) : (
        <Card className="shadow-card-hover">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">
              {isSignUp ? 'Create Account' : 'Welcome Back'}
            </CardTitle>
            <CardDescription>
              {isSignUp 
                ? 'Start your MBA interview preparation journey'
                : 'Sign in to continue your preparation'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {isSignUp && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="firstName"
                        type="text"
                        placeholder="John"
                        className="pl-10"
                        {...register('firstName', { 
                          required: isSignUp ? 'First name is required' : false 
                        })}
                      />
                    </div>
                    {errors.firstName && (
                      <p className="text-sm text-destructive">{errors.firstName.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="lastName"
                        type="text"
                        placeholder="Doe"
                        className="pl-10"
                        {...register('lastName', { 
                          required: isSignUp ? 'Last name is required' : false 
                        })}
                      />
                    </div>
                    {errors.lastName && (
                      <p className="text-sm text-destructive">{errors.lastName.message}</p>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="john@example.com"
                    className="pl-10"
                    {...register('email', { 
                      required: 'Email is required',
                      pattern: {
                        value: /^\S+@\S+$/i,
                        message: 'Please enter a valid email address'
                      }
                    })}
                  />
                </div>
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    className="pl-10"
                    {...register('password', { 
                      required: 'Password is required',
                      minLength: {
                        value: 6,
                        message: 'Password must be at least 6 characters'
                      }
                    })}
                  />
                </div>
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password.message}</p>
                )}
              </div>

              {isSignUp && (
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="••••••••"
                      className="pl-10"
                      {...register('confirmPassword', { 
                        required: isSignUp ? 'Please confirm your password' : false,
                        validate: isSignUp ? (value) => value === password || 'Passwords do not match' : undefined
                      })}
                    />
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
                  )}
                </div>
              )}

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>{isSignUp ? 'Creating Account...' : 'Signing In...'}</span>
                  </div>
                ) : (
                  isSignUp ? 'Create Account' : 'Sign In'
                )}
              </Button>
            </form>

            <div className="mt-6">
              <Separator />
              <div className="text-center mt-4">
                <p className="text-sm text-muted-foreground">
                  {isSignUp ? 'Already have an account?' : "Don't have an account?"}
                </p>
                <Button
                  variant="link"
                  onClick={() => setIsSignUp(!isSignUp)}
                  className="text-primary"
                >
                  {isSignUp ? 'Sign In' : 'Sign Up'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        )}
      </div>
    </div>
  );
};

export default Auth;