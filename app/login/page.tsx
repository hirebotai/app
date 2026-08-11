'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock, KeyRound, ShieldCheck, ArrowRight, ArrowLeft, User, Loader2 } from 'lucide-react';
import { Button, Card } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

type AuthStep = 'login' | 'signup' | 'otp_verify' | 'forgot_password' | 'reset_verify' | 'reset_new';

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<AuthStep>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [otpToken, setOtpToken] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('mode') === 'signup') {
      setStep('signup');
    }
  }, []);

  useEffect(() => {
    let active = true;
    createClient()
      .auth.getUser()
      .then(({ data }) => {
        if (!active) return;
        if (data.user) {
          router.replace('/dashboard');
        } else {
          setChecking(false);
        }
      })
      .catch(() => {
        if (active) setChecking(false);
      });
    return () => {
      active = false;
    };
  }, [router]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter email and password');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      toast.success('Logged in successfully!');
      router.push(data.isAdmin ? '/admin' : '/dashboard');
    } catch (err: any) {
      toast.error(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtpSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Please enter your name');
      return;
    }
    if (!email || !password) {
      toast.error('Please enter email and password');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send verification code');
      }

      toast.success('6-Digit Verification Code sent to your email!');
      setStep('otp_verify');
    } catch (err: any) {
      toast.error(err.message || 'Failed to send verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpToken || otpToken.length < 6) {
      toast.error('Please enter the 6-digit verification code sent to your email');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: otpToken.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Invalid or expired verification code');
      }

      const supabase = createClient();
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name: name.trim() },
        },
      });
      if (signUpError) throw signUpError;

      toast.success('Email verified & account created!');
      router.push(signUpData.session ? '/dashboard' : '/');
    } catch (err: any) {
      toast.error(err.message || 'Invalid or expired verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('Please enter your registered email address');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send password reset email');
      }

      toast.success('Password reset code sent to your email!');
      setStep('reset_verify');
    } catch (err: any) {
      toast.error(err.message || 'Failed to send password reset email');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetCode || resetCode.length < 6) {
      toast.error('Please enter the 6-digit reset code sent to your email');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/verify-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: resetCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Invalid or expired reset code');
      }

      toast.success('Code verified! Set your new password.');
      setStep('reset_new');
    } catch (err: any) {
      toast.error(err.message || 'Invalid or expired reset code');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to reset password');
      }

      toast.success('Password reset successfully! Please log in.');
      setNewPassword('');
      setConfirmPassword('');
      setResetCode('');
      setStep('login');
    } catch (err: any) {
      toast.error(err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-surface-950 text-surface-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-brand-400 animate-spin" />
          <p className="font-mono text-sm text-surface-400">Checking your session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-950 text-surface-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md -mt-20 space-y-6 flex flex-col items-center justify-center text-center">
        
        {/* Header Title */}
        <div className="flex flex-col items-center justify-center space-y-1 w-full pt-4">
          <h1 className="text-2xl font-bold font-mono text-white text-center">
            {step === 'login' && 'Customer Account Login'}
            {step === 'signup' && 'Create Hirebotai Account'}
            {step === 'otp_verify' && 'Verify Email Verification Code'}
            {step === 'forgot_password' && 'Reset Password'}
            {step === 'reset_verify' && 'Verify Reset Code'}
            {step === 'reset_new' && 'Set New Password'}
          </h1>
          <p className="text-surface-400 text-sm text-center">
            {step === 'login' && 'Log in to view your license key, active devices & subscription'}
            {step === 'signup' && 'Sign up to get instant trial and manage licenses'}
            {step === 'otp_verify' && `We sent a 6-digit verification code to ${email}`}
            {step === 'forgot_password' && 'Enter your email to receive a password reset code'}
            {step === 'reset_verify' && `We sent a 6-digit reset code to ${email}`}
            {step === 'reset_new' && 'Enter a new password for your account'}
          </p>
        </div>

        <Card className="w-full p-6 sm:p-8 border-brand-500/20 bg-surface-900/80 shadow-2xl space-y-6 text-left">
          
          {/* STEP 1: LOGIN FORM */}
          {step === 'login' && (
            <form onSubmit={handleSignIn} className="space-y-5">
              <div>
                <label className="block text-xs font-mono font-bold uppercase text-surface-400 mb-2">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-surface-500 absolute left-3 top-3.5" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="w-full bg-surface-950 border border-surface-700 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:border-brand-400 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-mono font-bold uppercase text-surface-400">Password</label>
                  <button
                    type="button"
                    onClick={() => setStep('forgot_password')}
                    className="text-xs text-brand-400 hover:underline font-mono"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-surface-500 absolute left-3 top-3.5" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-surface-950 border border-surface-700 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:border-brand-400 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <Button type="submit" className="w-full py-3 font-mono" disabled={loading}>
                {loading ? 'Logging in...' : 'Log In to Account'}
              </Button>
            </form>
          )}

          {/* STEP 2: SIGNUP FORM (Triggers OTP Email) */}
          {step === 'signup' && (
            <form onSubmit={handleSendOtpSignUp} className="space-y-5">
              <div>
                <label className="block text-xs font-mono font-bold uppercase text-surface-400 mb-2">Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-surface-500 absolute left-3 top-3.5" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your full name"
                    className="w-full bg-surface-950 border border-surface-700 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:border-brand-400 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono font-bold uppercase text-surface-400 mb-2">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-surface-500 absolute left-3 top-3.5" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="w-full bg-surface-950 border border-surface-700 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:border-brand-400 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono font-bold uppercase text-surface-400 mb-2">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-surface-500 absolute left-3 top-3.5" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create password"
                    className="w-full bg-surface-950 border border-surface-700 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:border-brand-400 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <Button type="submit" className="w-full py-3 font-mono" disabled={loading}>
                {loading ? 'Sending Code...' : 'Send Verification Code (OTP)'}
              </Button>
            </form>
          )}

          {/* STEP 3: OTP CODE VERIFICATION FORM */}
          {step === 'otp_verify' && (
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <div>
                <label className="block text-xs font-mono font-bold uppercase text-surface-400 mb-2">6-Digit Verification Code</label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-surface-500 absolute left-3 top-3.5" />
                  <input
                    type="text"
                    maxLength={6}
                    value={otpToken}
                    onChange={(e) => setOtpToken(e.target.value)}
                    placeholder="123456"
                    className="w-full bg-surface-950 border border-surface-700 rounded-xl py-2.5 pl-10 pr-4 text-lg font-mono text-center letter-spacing-2 text-white focus:border-brand-400 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <Button type="submit" className="w-full py-3 font-mono" disabled={loading}>
                {loading ? 'Verifying Code...' : 'Verify Code & Enter'}
              </Button>
            </form>
          )}

          {/* STEP 4: FORGOT PASSWORD FORM */}
          {step === 'forgot_password' && (
            <form onSubmit={handleForgotPassword} className="space-y-5">
              <div>
                <label className="block text-xs font-mono font-bold uppercase text-surface-400 mb-2">Registered Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-surface-500 absolute left-3 top-3.5" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="w-full bg-surface-950 border border-surface-700 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:border-brand-400 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <Button type="submit" className="w-full py-3 font-mono" disabled={loading}>
                {loading ? 'Sending Code...' : 'Send Password Reset Code'}
              </Button>
            </form>
          )}

          {/* STEP 4b: RESET CODE VERIFICATION FORM */}
          {step === 'reset_verify' && (
            <form onSubmit={handleVerifyReset} className="space-y-5">
              <div>
                <label className="block text-xs font-mono font-bold uppercase text-surface-400 mb-2">6-Digit Reset Code</label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-surface-500 absolute left-3 top-3.5" />
                  <input
                    type="text"
                    maxLength={6}
                    value={resetCode}
                    onChange={(e) => setResetCode(e.target.value)}
                    placeholder="123456"
                    className="w-full bg-surface-950 border border-surface-700 rounded-xl py-2.5 pl-10 pr-4 text-lg font-mono text-center letter-spacing-2 text-white focus:border-brand-400 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <Button type="submit" className="w-full py-3 font-mono" disabled={loading}>
                {loading ? 'Verifying Code...' : 'Verify Code & Continue'}
              </Button>
            </form>
          )}

          {/* STEP 4c: SET NEW PASSWORD FORM */}
          {step === 'reset_new' && (
            <form onSubmit={handleResetPassword} className="space-y-5">
              <div>
                <label className="block text-xs font-mono font-bold uppercase text-surface-400 mb-2">New Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-surface-500 absolute left-3 top-3.5" />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className="w-full bg-surface-950 border border-surface-700 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:border-brand-400 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono font-bold uppercase text-surface-400 mb-2">Confirm New Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-surface-500 absolute left-3 top-3.5" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="w-full bg-surface-950 border border-surface-700 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:border-brand-400 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <Button type="submit" className="w-full py-3 font-mono" disabled={loading}>
                {loading ? 'Resetting...' : 'Reset Password & Log In'}
              </Button>
            </form>
          )}

          {/* Navigation Controls */}
          <div className="pt-4 border-t border-surface-800 text-center flex items-center justify-between text-xs font-mono">
            {step !== 'login' && (
              <button
                type="button"
                onClick={() => setStep('login')}
                className="text-surface-400 hover:text-white flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Log In
              </button>
            )}

            {step === 'login' && (
              <button
                type="button"
                onClick={() => setStep('signup')}
                className="text-brand-400 hover:underline ml-auto"
              >
                Don&apos;t have an account? Sign Up
              </button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
