import React, { useState } from 'react';
import { Lock, Mail, ArrowRight, ShieldCheck, Cloud, AlertCircle, Loader2, KeyRound, CheckCircle2 } from 'lucide-react';
import { supabaseClient, initSupabase } from '../services/supabase';

interface LoginScreenProps {
  onLoginSuccess: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [mode, setMode] = useState<'LOGIN' | 'FORGOT_PASSWORD'>('LOGIN');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'FORGOT_PASSWORD') {
      await handleForgotPassword();
      return;
    }

    if (!email || !password) {
      setErrorMessage('Por favor, informe e-mail e senha.');
      return;
    }

    await initSupabase();

    if (!supabaseClient) {
      setErrorMessage('Cliente Supabase não inicializado.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          setErrorMessage('Credenciais inválidas. Verifique seu e-mail e senha.');
        } else {
          setErrorMessage(`Erro ao realizar login: ${error.message}`);
        }
        setLoading(false);
        return;
      }

      if (data.session) {
        onLoginSuccess();
      }
    } catch (err: any) {
      setErrorMessage(`Erro inesperado: ${err.message || String(err)}`);
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setErrorMessage('Por favor, informe seu e-mail.');
      return;
    }

    await initSupabase();

    if (!supabaseClient) {
      setErrorMessage('Cliente Supabase não inicializado.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const redirectTo = `${window.location.origin}/reset-password`;
      const { error } = await supabaseClient.auth.resetPasswordForEmail(email.trim(), {
        redirectTo,
      });

      if (error) {
        setErrorMessage(`Erro ao solicitar recuperação: ${error.message}`);
        setLoading(false);
        return;
      }

      setSuccessMessage(`E-mail de recuperação enviado para ${email.trim()}! Verifique sua caixa de entrada e clique no link recebido.`);
      setLoading(false);
    } catch (err: any) {
      setErrorMessage(`Erro inesperado: ${err.message || String(err)}`);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-8 space-y-6">
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 mb-2">
            {mode === 'LOGIN' ? <Cloud className="w-6 h-6" /> : <KeyRound className="w-6 h-6" />}
          </div>
          <h1 className="text-xl font-black tracking-tight text-white uppercase">
            {mode === 'LOGIN' ? 'JOB HUNTER AI' : 'RECUPERAR SENHA'}
          </h1>
          <div className="flex items-center justify-center gap-1.5 text-xs text-indigo-400 font-bold uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Cloud Access • Single User</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {mode === 'LOGIN'
              ? 'Painel privado de inteligência de vagas com sincronização segura via Supabase Auth'
              : 'Informe seu e-mail cadastrado para receber o link de redefinição de senha'}
          </p>
        </div>

        {/* Success Alert */}
        {successMessage && (
          <div className="p-3.5 bg-emerald-950/80 border border-emerald-700/80 rounded-xl text-emerald-200 text-xs flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3 bg-rose-950/60 border border-rose-800/80 rounded-xl text-rose-300 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
              E-mail
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                required
                placeholder="seu.email@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
              />
            </div>
          </div>

          {mode === 'LOGIN' && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                  Senha
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setMode('FORGOT_PASSWORD');
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium cursor-pointer transition"
                >
                  Esqueceu a senha?
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/20"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{mode === 'LOGIN' ? 'Autenticando...' : 'Enviando...'}</span>
              </>
            ) : (
              <>
                <span>{mode === 'LOGIN' ? 'ENTRAR' : 'ENVIAR E-MAIL DE RECUPERAÇÃO'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Toggle back to login when in forgot password mode */}
        {mode === 'FORGOT_PASSWORD' && (
          <div className="pt-2 text-center text-xs border-t border-slate-800/60">
            <button
              type="button"
              onClick={() => {
                setMode('LOGIN');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className="text-slate-400 hover:text-white transition font-medium cursor-pointer"
            >
              ← Voltar para a tela de login
            </button>
          </div>
        )}

        {/* Footer info */}
        {mode === 'LOGIN' && (
          <div className="pt-2 text-center text-[11px] text-slate-500 leading-relaxed border-t border-slate-800/60">
            Uso pessoal exclusivo. Contas são gerenciadas diretamente pelo proprietário no Supabase Dashboard.
          </div>
        )}
      </div>
    </div>
  );
};

