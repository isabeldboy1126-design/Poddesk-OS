'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { createBrowserClient } from '@/lib/supabase/client';

type AuthState = 'login' | 'register' | 'forgot_password' | 'email_sent' | 'attaching';

function AuthContent() {
  const router = useRouter();
  const supabase = createBrowserClient();

  const [authState, setAuthState] = useState<AuthState>('login');
  
  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check auth on mount
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await handleSuccessfulAuth();
      }
    };
    checkUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSuccessfulAuth = async () => {
    const continuityStr = sessionStorage.getItem('poddesk_auth_continuity');
    if (continuityStr) {
      try {
        setAuthState('attaching');
        const { pendingFlowId } = JSON.parse(continuityStr);
        
        // Attach flow
        await fetch(`/api/flows/${pendingFlowId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'attach' })
        });

        // Continuity MUST take priority. Even if attach fails (e.g. backend hiccup), route them to the Focus Console
        // rather than blindly dropping them in a generic Dashboard.
        sessionStorage.removeItem('poddesk_auth_continuity');
        setTimeout(() => {
          router.push(`/flow/${pendingFlowId}/focus`);
        }, 1200);
        return;
      } catch (err) {
        console.error('Error during flow attachment:', err);
      }
    }
    
    // Default fallback ONLY for direct /login without continuity
    router.push('/dashboard');
  };

  const signInWithProvider = async (provider: 'google' | 'apple') => {
    setIsLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/api/auth/callback`
        }
      });
      if (error) throw error;
      // Page unmounts upon OAuth redirect
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : `Failed to sign in with ${provider}`;
      setError(errorMsg);
      setIsLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (authState === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        await handleSuccessfulAuth();
        
      } else if (authState === 'register') {
        const { data, error } = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
            data: { display_name: name || undefined }
          }
        });
        if (error) throw error;
        
        // If email confirmation is required, session will be null
        if (!data.session) {
          setAuthState('email_sent');
          setIsLoading(false);
          return;
        }
        
        await handleSuccessfulAuth();

      } else if (authState === 'forgot_password') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setAuthState('email_sent');
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Authentication failed';
      setError(errorMsg);
    } finally {
      if (authState !== 'attaching') {
        setIsLoading(false);
      }
    }
  };

  // ─── Attaching State Unmounted UI ───
  if (authState === 'attaching') {
    return (
      <Card className="border-[#1E293B] bg-[#0A0E17]/80 w-full max-w-md mx-auto p-10 flex flex-col items-center justify-center text-center">
        <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-6" />
        <h2 className="text-xl font-bold tracking-tight text-white mb-2">Connecting Workspace</h2>
        <p className="text-sm text-gray-400">Attaching your generated flow and entering Focus Console...</p>
      </Card>
    );
  }

  // ─── Email Sent State ───
  if (authState === 'email_sent') {
    return (
      <Card className="border-[#1E293B] bg-[#0A0E17]/80 w-full max-w-md mx-auto p-8 relative overflow-hidden">
        <h2 className="text-2xl font-bold tracking-tight text-white mb-2 text-center">Check your inbox</h2>
        <p className="text-gray-400 text-sm text-center mb-6">
          We&apos;ve sent a password reset link to <span className="text-gray-200 font-medium">{email}</span>.
        </p>
        <Button 
          variant="secondary" 
          className="w-full text-xs font-bold"
          onClick={() => setAuthState('login')}
        >
          BACK TO LOGIN
        </Button>
      </Card>
    );
  }

  return (
    <Card className="border-[#1E293B] bg-[#0A0E17]/80 w-full max-w-md mx-auto p-8 relative overflow-hidden shadow-2xl">
      {/* ─── Header ─── */}
      <div className="text-center mb-8">
        <div className="flex justify-center mb-6">
          <div className="tracking-[0.2em] font-mono text-[10px]">
            <Badge variant="default">AUTH CHECKPOINT</Badge>
          </div>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white mb-2">
          {authState === 'login' && 'Log in to continue'}
          {authState === 'register' && 'Create your account'}
          {authState === 'forgot_password' && 'Reset parameters'}
        </h1>
        <p className="text-gray-400 text-sm">
          {authState === 'login' && 'Enter your credentials to access your execution flows.'}
          {authState === 'register' && 'Establish your baseline profile to lock your flows.'}
          {authState === 'forgot_password' && 'Enter your email to reclaim access to your workspace.'}
        </p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-md mb-6">
          {error}
        </div>
      )}

      {/* ─── Social Logins (Only on Login/Register) ─── */}
      {(authState === 'login' || authState === 'register') && (
        <>
          <div className="space-y-3 mb-6">
            <Button 
              type="button" 
              variant="secondary" 
              className="w-full relative bg-[#121A2F]" 
              onClick={() => signInWithProvider('google')}
              disabled={isLoading}
            >
              Continue with Google
            </Button>
            <Button 
              type="button" 
              variant="secondary" 
              className="w-full relative bg-[#121A2F]" 
              onClick={() => signInWithProvider('apple')}
              disabled={isLoading}
            >
              Continue with Apple
            </Button>
          </div>

          <div className="flex items-center gap-3 mb-6">
            <div className="h-px bg-[#1E293B] flex-1"></div>
            <span className="text-xs text-gray-500 font-mono uppercase tracking-wider">OR EMAIL</span>
            <div className="h-px bg-[#1E293B] flex-1"></div>
          </div>
        </>
      )}

      {/* ─── Email Form ─── */}
      <form onSubmit={handleEmailAuth} className="space-y-4">
        {authState === 'register' && (
          <Input 
            type="text" 
            placeholder="Jane Doe" 
            label="FULL NAME"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            disabled={isLoading}
          />
        )}
        <Input 
          type="email" 
          placeholder="name@example.com"  
          label="EMAIL ADDRESS"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={isLoading}
        />
        
        {authState !== 'forgot_password' && (
          <Input 
            type="password" 
            placeholder="••••••••" 
            label="PASSWORD"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isLoading}
          />
        )}

        <Button 
          type="submit" 
          className="w-full bg-blue-600 hover:bg-blue-500 font-bold mt-2"
          disabled={isLoading || !email || (authState !== 'forgot_password' && !password) || (authState === 'register' && !name)}
        >
          {isLoading ? 'PROCESSING...' : (
            authState === 'login' ? 'LOG IN' :
            authState === 'register' ? 'CREATE ACCOUNT' :
            'SEND RESET LINK'
          )}
        </Button>
      </form>

      {/* ─── Footers/Toggles ─── */}
      <div className="mt-8 flex flex-col items-center gap-3 text-sm">
        {authState === 'login' && (
          <>
            <button onClick={() => setAuthState('forgot_password')} className="text-gray-400 hover:text-white transition-colors">
              Forgot your password?
            </button>
            <div className="text-gray-500">
              Don&apos;t have an account? <button onClick={() => setAuthState('register')} className="text-blue-400 hover:text-blue-300 font-medium tracking-wide ml-1">Sign up</button>
            </div>
          </>
        )}
        
        {authState === 'register' && (
          <div className="text-gray-500">
            Already have an account? <button onClick={() => setAuthState('login')} className="text-blue-400 hover:text-blue-300 font-medium tracking-wide ml-1">Log in</button>
          </div>
        )}

        {authState === 'forgot_password' && (
          <button onClick={() => setAuthState('login')} className="text-gray-400 hover:text-white transition-colors">
            Return to login
          </button>
        )}
      </div>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#0A0E17] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative">
      {/* Simple Grid Background matching HubLayout */}
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] opacity-[0.03] pointer-events-none" />
      
      {/* Logo positioning */}
      <div className="absolute top-8 left-8 flex items-center gap-3 z-10">
        <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center font-bold text-white shadow-[0_0_20px_rgba(59,130,246,0.5)]">
          P
        </div>
        <span className="text-white font-bold tracking-widest text-sm">PODDESK OS</span>
      </div>

      <div className="relative z-10 w-full max-w-md mx-auto">
        <Suspense fallback={
          <div className="flex justify-center p-8">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        }>
          <AuthContent />
        </Suspense>
      </div>
    </div>
  );
}
