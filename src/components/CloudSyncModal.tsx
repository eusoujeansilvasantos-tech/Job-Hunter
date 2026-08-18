import React, { useState, useEffect } from 'react';
import {
  X,
  Cloud,
  CloudOff,
  RefreshCw,
  Download,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Database,
  Shield,
  FileText,
  Activity,
  Copy,
  Check,
  Server,
  LogOut,
  UserCheck,
  Lock,
} from 'lucide-react';
import { isSupabaseConfigured, hasSupabaseUrl, hasPublishableKey, supabaseClient, signOutUser } from '../services/supabase';
import {
  getCloudSyncDiagnostics,
  CloudSyncDiagnostics,
  restoreCloudData,
  migrateLocalDataToSupabase,
  testSupabaseConnection,
  DetailedMigrationResult,
} from '../services/cloudSync';
import { JobWithAnalysis, ApplicationStatus } from '../types';
import { TailoredResume } from '../services/resume';

interface CloudSyncModalProps {
  onClose: () => void;
  appliedMap: Record<string, ApplicationStatus>;
  tailoredResumesMap: Record<string, TailoredResume>;
  jobs: JobWithAnalysis[];
  onDataRestored?: (restoredData: {
    appliedMap: Record<string, ApplicationStatus>;
    tailoredResumesMap: Record<string, TailoredResume>;
  }) => void;
}

export const CloudSyncModal: React.FC<CloudSyncModalProps> = ({
  onClose,
  appliedMap,
  tailoredResumesMap,
  jobs,
  onDataRestored,
}) => {
  const [diag, setDiag] = useState<CloudSyncDiagnostics>({
    apiConfigStatus: 'Pendente',
    configJsonValid: false,
    urlReceivedFromBackend: false,
    publishableKeyReceivedFromBackend: false,
    createClientExecuted: false,
    supabaseSessionActive: false,
    hasUrl: hasSupabaseUrl,
    hasPublishableKey: hasPublishableKey,
    clientInitialized: Boolean(supabaseClient !== null),
    configured: isSupabaseConfigured,
    authenticated: false,
    userEmail: null,
    connected: false,
    lastSync: null,
    jobsSynced: 0,
    applicationsSynced: 0,
    resumesSynced: 0,
    snapshotsSynced: 0,
    errors: [],
  });

  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);
  const [syncResult, setSyncResult] = useState<DetailedMigrationResult | null>(null);

  const fetchDiagnostics = async () => {
    setLoading(true);
    try {
      const d = await getCloudSyncDiagnostics();
      setDiag(d);
    } catch (err) {
      console.warn('[CloudSyncModal] Error fetching diagnostics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiagnostics();
  }, []);

  const handleTestConnection = async () => {
    setLoading(true);
    setActionMessage(null);
    try {
      const ok = await testSupabaseConnection();
      await fetchDiagnostics();
      if (ok) {
        setActionMessage({ type: 'success', text: 'Conexão segura com Supabase RLS verificada com sucesso!' });
      } else {
        setActionMessage({
          type: 'error',
          text: 'Não foi possível conectar ao Supabase com sessão ativa. Verifique se está autenticado e com as variáveis ativas.',
        });
      }
    } catch (err: any) {
      setActionMessage({ type: 'error', text: `Erro ao testar conexão: ${err.message || String(err)}` });
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await signOutUser();
    } finally {
      setLoading(false);
    }
  };

  const handleMigrateLocal = async () => {
    setLoading(true);
    setActionMessage({ type: 'info', text: 'Iniciando sincronização e auditoria por etapa com Supabase...' });
    setSyncResult(null);

    try {
      const result = await migrateLocalDataToSupabase(
        appliedMap,
        tailoredResumesMap,
        jobs,
        (progress) => {
          setSyncResult(progress);
        }
      );

      setSyncResult(result);
      await fetchDiagnostics();

      if (result.status === 'SUCCESS') {
        setActionMessage({
          type: 'success',
          text: `Sincronização concluída com sucesso! ${result.summary.jobsSynced} vagas, ${result.summary.appsSynced} candidaturas, ${result.summary.resumesSynced} currículos e ${result.summary.snapshotsSynced} snapshots vinculados à sua conta no Supabase.`,
        });
      } else if (result.status === 'TIMEOUT') {
        setActionMessage({
          type: 'error',
          text: `TIMEOUT NA ETAPA: ${result.failedStepName || 'Operação'}. A requisição excedeu o tempo limite.`,
        });
      } else {
        setActionMessage({
          type: 'error',
          text: `ERRO NA ETAPA: ${result.failedStepName || 'Sincronização'}. ${result.error?.message || 'Falha na operação.'}`,
        });
      }
    } catch (err: any) {
      console.error('[CloudSyncModal] Error migrating local data:', err);
      setActionMessage({
        type: 'error',
        text: `ERRO INESPERADO: ${err.message || String(err)}`,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreFromCloud = async () => {
    setLoading(true);
    setActionMessage({ type: 'info', text: 'Buscando registros privados da nuvem (RLS filtered)...' });

    try {
      const cloudData = await restoreCloudData();
      await fetchDiagnostics();

      if (cloudData) {
        if (onDataRestored) {
          onDataRestored({
            appliedMap: cloudData.appliedMap,
            tailoredResumesMap: cloudData.tailoredResumesMap,
          });
        }
        setActionMessage({
          type: 'success',
          text: `Restauração concluída! Recuperados ${cloudData.restoredJobs} vagas, ${cloudData.restoredApplications} status e ${cloudData.restoredResumes} currículos customizados do seu usuário.`,
        });
      } else {
        setActionMessage({
          type: 'error',
          text: 'Falha ao restaurar dados da nuvem. Verifique a conexão com o Supabase.',
        });
      }
    } catch (err: any) {
      setActionMessage({ type: 'error', text: `Erro na restauração: ${err.message || String(err)}` });
    } finally {
      setLoading(false);
    }
  };

  const handleCopySqlNotice = () => {
    navigator.clipboard.writeText('file: supabase/schema.sql');
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600/30 text-indigo-400 rounded-lg border border-indigo-500/30">
              <Cloud className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold tracking-tight">CLOUD SYNC — SUPABASE AUTH & RLS</h2>
                <span className="bg-emerald-500/30 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-400/30">
                  FASE 2 SECURED
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Persistência em nuvem protegida por chave de usuário único
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-5">
          {/* User & Auth Info Bar */}
          {diag.authenticated && (
            <div className="p-3 bg-slate-900 text-slate-100 rounded-xl border border-slate-800 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-emerald-400" />
                <span className="text-slate-400 font-medium">Sessão Ativa:</span>
                <span className="font-extrabold text-white">{diag.userEmail}</span>
                <span className="bg-indigo-500/30 text-indigo-300 text-[10px] font-extrabold px-2 py-0.5 rounded border border-indigo-500/40 uppercase">
                  RLS ENFORCED
                </span>
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                className="px-3 py-1 bg-rose-600/30 hover:bg-rose-600/50 text-rose-300 border border-rose-500/30 text-[11px] font-bold rounded transition flex items-center gap-1.5 cursor-pointer"
                title="Encerrar sessão no Supabase (mantém localStorage local)"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>SAIR</span>
              </button>
            </div>
          )}

          {/* Status Banner */}
          <div
            className={`p-4 rounded-lg border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
              diag.connected
                ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                : diag.configured
                ? 'bg-amber-50 border-amber-200 text-amber-950'
                : 'bg-slate-100 border-slate-300 text-slate-800'
            }`}
          >
            <div className="flex items-start gap-3">
              {diag.connected ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
              ) : diag.configured ? (
                <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
              ) : (
                <CloudOff className="w-6 h-6 text-slate-500 shrink-0 mt-0.5" />
              )}
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-sm">
                    {diag.connected
                      ? 'Supabase Conectado & RLS Protegido'
                      : diag.configured
                      ? 'Configurado, aguardando conexão com usuário'
                      : 'Modo Local (Supabase não configurado)'}
                  </h3>
                  <span
                    className={`text-[10px] font-extrabold px-2 py-0.5 rounded uppercase ${
                      diag.connected
                        ? 'bg-emerald-200 text-emerald-900'
                        : diag.configured
                        ? 'bg-amber-200 text-amber-900'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {diag.connected ? 'PROTECTED ONLINE' : diag.configured ? 'PENDING' : 'LOCAL ONLY'}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  {diag.connected
                    ? 'Seus dados estão protegidos por RLS (`auth.uid() = user_id`). Apenas a sua conta de e-mail autenticada possui autorização de leitura e escrita.'
                    : 'Modo local ativo no localStorage. Faça login ou configure VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY no .env para ativar a nuvem RLS.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleTestConnection}
                disabled={loading}
                className="px-3 py-1.5 bg-white border border-slate-300 hover:border-slate-400 text-slate-800 font-bold text-xs rounded transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Testar Conexão</span>
              </button>

              <button
                onClick={handleSignOut}
                disabled={loading}
                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-800 font-bold text-xs rounded transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                title="Encerrar sessão no Supabase"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-600" />
                <span>Sair da conta</span>
              </button>
            </div>
          </div>

          {/* Configuration Diagnostics Panel */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 space-y-2 text-xs">
            <div className="font-extrabold text-slate-800 text-[11px] uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-indigo-600" />
              <span>Diagnóstico de Configuração</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="flex items-center justify-between p-2 bg-white rounded border border-slate-200">
                <span className="text-slate-600 font-medium">/api/config HTTP:</span>
                <span className={`font-black px-2 py-0.5 rounded text-[10px] ${diag.apiConfigStatus === '200' || diag.apiConfigStatus?.includes('200') ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                  {diag.apiConfigStatus || 'Pendente'}
                </span>
              </div>
              <div className="flex items-center justify-between p-2 bg-white rounded border border-slate-200">
                <span className="text-slate-600 font-medium">Config JSON válido:</span>
                <span className={`font-black px-2 py-0.5 rounded text-[10px] ${diag.configJsonValid ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                  {diag.configJsonValid ? 'SIM' : 'NÃO'}
                </span>
              </div>
              <div className="flex items-center justify-between p-2 bg-white rounded border border-slate-200">
                <span className="text-slate-600 font-medium">URL recebida do backend:</span>
                <span className={`font-black px-2 py-0.5 rounded text-[10px] ${diag.urlReceivedFromBackend ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                  {diag.urlReceivedFromBackend ? 'SIM' : 'NÃO'}
                </span>
              </div>
              <div className="flex items-center justify-between p-2 bg-white rounded border border-slate-200">
                <span className="text-slate-600 font-medium">Publishable Key do backend:</span>
                <span className={`font-black px-2 py-0.5 rounded text-[10px] ${diag.publishableKeyReceivedFromBackend ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                  {diag.publishableKeyReceivedFromBackend ? 'SIM' : 'NÃO'}
                </span>
              </div>
              <div className="flex items-center justify-between p-2 bg-white rounded border border-slate-200">
                <span className="text-slate-600 font-medium">Supabase URL detectada:</span>
                <span className={`font-black px-2 py-0.5 rounded text-[10px] ${diag.hasUrl ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                  {diag.hasUrl ? 'SIM' : 'NÃO'}
                </span>
              </div>
              <div className="flex items-center justify-between p-2 bg-white rounded border border-slate-200">
                <span className="text-slate-600 font-medium">Publishable Key detectada:</span>
                <span className={`font-black px-2 py-0.5 rounded text-[10px] ${diag.hasPublishableKey ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                  {diag.hasPublishableKey ? 'SIM' : 'NÃO'}
                </span>
              </div>
              <div className="flex items-center justify-between p-2 bg-white rounded border border-slate-200">
                <span className="text-slate-600 font-medium">createClient() executado:</span>
                <span className={`font-black px-2 py-0.5 rounded text-[10px] ${diag.createClientExecuted ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                  {diag.createClientExecuted ? 'SIM' : 'NÃO'}
                </span>
              </div>
              <div className="flex items-center justify-between p-2 bg-white rounded border border-slate-200">
                <span className="text-slate-600 font-medium">Cliente Supabase inicializado:</span>
                <span className={`font-black px-2 py-0.5 rounded text-[10px] ${diag.clientInitialized ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                  {diag.clientInitialized ? 'SIM' : 'NÃO'}
                </span>
              </div>
              <div className="flex items-center justify-between p-2 bg-white rounded border border-slate-200 sm:col-span-2">
                <span className="text-slate-600 font-medium">Sessão Supabase / Autenticada:</span>
                <span className={`font-black px-2 py-0.5 rounded text-[10px] ${diag.authenticated ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-800'}`}>
                  {diag.authenticated ? 'AUTENTICADO (SIM)' : 'SESSÃO ANÔNIMA / PENDENTE (NÃO)'}
                </span>
              </div>
            </div>
          </div>

          {actionMessage && (
            <div
              className={`p-3 rounded-lg border text-xs font-semibold flex items-center gap-2 ${
                actionMessage.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : actionMessage.type === 'error'
                  ? 'bg-rose-50 border-rose-200 text-rose-900'
                  : 'bg-blue-50 border-blue-200 text-blue-900'
              }`}
            >
              <Activity className="w-4 h-4 shrink-0" />
              <span>{actionMessage.text}</span>
            </div>
          )}

          {/* Real-time Step-by-Step Diagnostic & Progress Dashboard */}
          {syncResult && (
            <div className="bg-slate-900 text-slate-100 rounded-xl p-4 border border-slate-800 space-y-3 text-xs shadow-inner">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-indigo-400 animate-pulse" />
                  <span className="font-extrabold uppercase text-[11px] text-indigo-300 tracking-wider">
                    Diagnóstico por Etapa (Sender Sync Audit)
                  </span>
                </div>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                    syncResult.status === 'SUCCESS'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : syncResult.status === 'TIMEOUT'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  }`}
                >
                  {syncResult.status === 'SUCCESS' ? 'SUCESSO' : syncResult.status === 'TIMEOUT' ? 'TIMEOUT' : 'ERRO'}
                </span>
              </div>

              <div className="space-y-2">
                {syncResult.steps.map((step, idx) => (
                  <div key={step.id} className="bg-slate-950/60 p-2.5 rounded border border-slate-800/80 space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-2 font-bold">
                        <span className="text-slate-500">{idx + 1}.</span>
                        <span className="text-slate-200">{step.name}</span>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                          step.status === 'OK'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : step.status === 'IN_PROGRESS'
                            ? 'bg-indigo-500/20 text-indigo-300 animate-pulse'
                            : step.status === 'ERROR'
                            ? 'bg-rose-500/20 text-rose-400'
                            : step.status === 'TIMEOUT'
                            ? 'bg-amber-500/20 text-amber-400'
                            : 'bg-slate-800 text-slate-500'
                        }`}
                      >
                        {step.status === 'OK'
                          ? 'OK'
                          : step.status === 'IN_PROGRESS'
                          ? 'EM ANDAMENTO'
                          : step.status === 'ERROR'
                          ? 'ERRO NA ETAPA'
                          : step.status === 'TIMEOUT'
                          ? 'TIMEOUT'
                          : 'PENDENTE'}
                      </span>
                    </div>

                    {step.status !== 'PENDING' && (
                      <div className="text-[11px] text-slate-400 pl-4 space-y-0.5">
                        {step.id === 'AUTH' && (
                          <div>
                            Sessão autenticada: <strong className={syncResult.userAuthOk ? 'text-emerald-400' : 'text-rose-400'}>{syncResult.userAuthOk ? 'OK' : 'Falha'}</strong>
                            {syncResult.userId && <span className="block text-[10px] text-slate-500 font-mono">User ID: {syncResult.userId}</span>}
                          </div>
                        )}

                        {step.id === 'JOBS' && (
                          <div>
                            Jobs: <strong className="text-slate-200">{step.foundCount}</strong> encontrados localmente /{' '}
                            <strong className="text-emerald-400">{step.syncedCount}</strong> sincronizados
                          </div>
                        )}

                        {step.id === 'APPLICATIONS' && (
                          <div>
                            Applications: <strong className="text-slate-200">{step.foundCount}</strong> encontradas /{' '}
                            <strong className="text-emerald-400">{step.syncedCount}</strong> sincronizadas
                          </div>
                        )}

                        {step.id === 'RESUMES' && (
                          <div>
                            Tailored Resumes: <strong className="text-slate-200">{step.foundCount}</strong> encontrados /{' '}
                            <strong className="text-emerald-400">{step.syncedCount}</strong> sincronizados
                          </div>
                        )}

                        {step.id === 'SNAPSHOTS' && (
                          <div>
                            Source Snapshots: <strong className="text-slate-200">{step.foundCount}</strong> encontrados /{' '}
                            <strong className="text-emerald-400">{step.syncedCount}</strong> sincronizados
                          </div>
                        )}

                        {step.id === 'COMPLETE' && (
                          <div className="text-emerald-400 font-semibold">
                            Sincronização concluída com sucesso no Supabase!
                          </div>
                        )}

                        {step.error && (
                          <div className="mt-2 p-2 bg-rose-950/50 border border-rose-800/60 rounded text-[10px] font-mono text-rose-300 space-y-0.5">
                            <div className="font-extrabold text-rose-200 uppercase">ERRO NA ETAPA: {step.name}</div>
                            <div><strong>error.message:</strong> {step.error.message || 'Sem mensagem'}</div>
                            {step.error.code && <div><strong>error.code:</strong> {step.error.code}</div>}
                            {step.error.details && <div><strong>error.details:</strong> {step.error.details}</div>}
                            {step.error.hint && <div><strong>error.hint:</strong> {step.error.hint}</div>}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cloud Actions Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleMigrateLocal}
              disabled={loading || !diag.connected}
              className="p-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-lg transition text-left flex items-start gap-3 shadow-xs cursor-pointer"
            >
              <Upload className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <span className="font-extrabold text-xs uppercase block">SINCRONIZAR AGORA (SENDER)</span>
                <span className="text-[11px] opacity-90 block mt-0.5">
                  Envia candidaturas, vagas relevantes e currículos locais vinculados ao seu user_id.
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={handleRestoreFromCloud}
              disabled={loading || !diag.connected}
              className="p-4 bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 text-white rounded-lg transition text-left flex items-start gap-3 shadow-xs cursor-pointer"
            >
              <Download className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <span className="font-extrabold text-xs uppercase block">RESTAURAR DA NUVEM (RESTORE)</span>
                <span className="text-[11px] opacity-90 block mt-0.5">
                  Recupera somente os registros pertencentes ao seu usuário autenticado no Supabase.
                </span>
              </div>
            </button>
          </div>

          {/* Sync Stats Dashboard */}
          <div className="space-y-2">
            <h3 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Database className="w-4 h-4 text-indigo-600" />
              <span>Registros do Seu Usuário no Banco</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg text-center">
                <span className="text-[10px] font-bold text-slate-500 block uppercase">Vagas Pessoais</span>
                <span className="font-black text-lg text-slate-900">{diag.jobsSynced}</span>
              </div>
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg text-center">
                <span className="text-[10px] font-bold text-slate-500 block uppercase">Candidaturas</span>
                <span className="font-black text-lg text-indigo-700">{diag.applicationsSynced}</span>
              </div>
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg text-center">
                <span className="text-[10px] font-bold text-slate-500 block uppercase">Currículos Tailored</span>
                <span className="font-black text-lg text-emerald-700">{diag.resumesSynced}</span>
              </div>
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg text-center">
                <span className="text-[10px] font-bold text-slate-500 block uppercase">Source Snapshots</span>
                <span className="font-black text-lg text-amber-700">{diag.snapshotsSynced}</span>
              </div>
            </div>
          </div>

          {/* Setup & Schema Guidance */}
          <div className="bg-slate-900 text-slate-200 rounded-lg p-4 space-y-3 text-xs border border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-indigo-400" />
                <span className="font-extrabold uppercase text-[11px] text-white">Esquema RLS Seguro (FASE 2)</span>
              </div>
              <button
                type="button"
                onClick={handleCopySqlNotice}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold rounded flex items-center gap-1.5 transition cursor-pointer"
              >
                {copiedSql ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedSql ? 'Copiado!' : 'Copiar caminho SQL'}</span>
              </button>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Todas as tabelas usam chave primária UUID e chave estrangeira composta <code>(job_id, user_id) REFERENCES public.jobs(id, user_id) ON DELETE CASCADE</code>. O acesso a dados de outros usuários é bloqueado no nível de banco de dados pelo PostgreSQL RLS.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
