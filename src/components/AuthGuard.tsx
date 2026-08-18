import React, { useState, useEffect } from 'react';
import { Loader2, ShieldCheck } from 'lucide-react';
import { supabaseClient, isSupabaseConfigured, initSupabase, clearSupabaseLocalStorage, signOutUser } from '../services/supabase';
import { LoginScreen } from './LoginScreen';
import { ResetPasswordScreen } from './ResetPasswordScreen';

type AuthState = 'CHECKING_SESSION' | 'AUTHENTICATED' | 'UNAUTHENTICATED';

interface AuthGuardProps {
  children: React.ReactNode;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>('CHECKING_SESSION');

  const isResetPasswordRoute =
    typeof window !== 'undefined' &&
    (window.location.pathname === '/reset-password' ||
      window.location.pathname.startsWith('/reset-password'));

  useEffect(() => {
    let mounted = true;
    let subscription: { unsubscribe: () => void } | null = null;

    initSupabase().then(() => {
      if (!mounted) return;

      if (isResetPasswordRoute) {
        setAuthState('AUTHENTICATED');
        return;
      }

      if (!isSupabaseConfigured || !supabaseClient) {
        setAuthState('UNAUTHENTICATED');
        return;
      }

      const client = supabaseClient;

      // Validate session against Supabase Auth backend
      const validateSessionAndUser = async () => {
        try {
          const { data: { session } } = await client.auth.getSession();
          if (!mounted) return;

          if (!session) {
            setAuthState('UNAUTHENTICATED');
            return;
          }

          // Strict validation: verify user still exists in Supabase
          const { data: { user }, error } = await client.auth.getUser();
          if (!mounted) return;

          if (error || !user) {
            console.warn('[AuthGuard] Sessão inválida ou usuário excluído no Supabase. Limpando credenciais locais...');
            clearSupabaseLocalStorage();
            try {
              await client.auth.signOut({ scope: 'local' });
            } catch {
              // ignore
            }
            if (mounted) setAuthState('UNAUTHENTICATED');
            return;
          }

          if (mounted) setAuthState('AUTHENTICATED');
        } catch (err) {
          console.warn('[AuthGuard] Erro ao validar sessão:', err);
          clearSupabaseLocalStorage();
          if (mounted) setAuthState('UNAUTHENTICATED');
        }
      };

      // Initial check
      validateSessionAndUser();

      // Listen for auth state changes
      const res = client.auth.onAuthStateChange(async (event, session) => {
        if (!mounted) return;

        if (event === 'SIGNED_OUT' || !session) {
          setAuthState('UNAUTHENTICATED');
        } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
          // Re-validate user when signed in or token refreshed
          try {
            const { data: { user }, error } = await client.auth.getUser();
            if (!mounted) return;

            if (error || !user) {
              clearSupabaseLocalStorage();
              try {
                await client.auth.signOut({ scope: 'local' });
              } catch {
                // ignore
              }
              if (mounted) setAuthState('UNAUTHENTICATED');
            } else {
              if (mounted) setAuthState('AUTHENTICATED');
            }
          } catch {
            if (mounted) setAuthState('UNAUTHENTICATED');
          }
        }
      });

      subscription = res.data.subscription;
    });

    return () => {
      mounted = false;
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [isResetPasswordRoute]);

  if (isResetPasswordRoute) {
    return <ResetPasswordScreen />;
  }

  if (authState === 'CHECKING_SESSION') {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-white">
        <div className="flex flex-col items-center gap-3 bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-2xl">
          <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
          <div className="text-center space-y-1">
            <h3 className="font-extrabold text-sm uppercase tracking-wider">JOB HUNTER AI</h3>
            <p className="text-xs text-slate-400 flex items-center gap-1.5 justify-center">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
              Verificando autenticação...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (authState === 'UNAUTHENTICATED') {
    return <LoginScreen onLoginSuccess={() => setAuthState('AUTHENTICATED')} />;
  }

  return <>{children}</>;
};

