import React, { useState } from 'react';
import {
  X,
  Copy,
  Check,
  FileCheck2,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  User,
  Building2,
  Award,
  ListOrdered,
  Layers,
  ArrowRight
} from 'lucide-react';
import { JobWithAnalysis, UserProfile } from '../types';
import { generateTailoredResume, TailoredResume, saveTailoredResumeForJob } from '../services/resume';
import { syncTailoredResume, TailoredResumeSyncDiagnostic } from '../services/cloudSync';

interface TailoredResumeModalProps {
  job: JobWithAnalysis | null;
  profile: UserProfile;
  onClose: () => void;
}

export const TailoredResumeModal: React.FC<TailoredResumeModalProps> = ({
  job,
  profile,
  onClose,
}) => {
  const [viewMode, setViewMode] = useState<'tailored' | 'original'>('tailored');
  const [langOverride, setLangOverride] = useState<'auto' | 'pt-BR' | 'en'>('auto');
  const [copied, setCopied] = useState(false);
  const [syncDiag, setSyncDiag] = useState<{
    loading: boolean;
    diag: TailoredResumeSyncDiagnostic | null;
  }>({ loading: true, diag: null });

  if (!job) return null;

  const overrideLangParam = langOverride === 'auto' ? undefined : langOverride;
  const tailoredResume: TailoredResume = generateTailoredResume(job, profile, overrideLangParam);

  // Auto-save locally and sync to Supabase with step diagnostics (Rule 13 & Tailored Resume Audit)
  React.useEffect(() => {
    if (job && tailoredResume) {
      saveTailoredResumeForJob(job, tailoredResume);

      setSyncDiag({ loading: true, diag: null });
      syncTailoredResume(job, tailoredResume)
        .then((diag) => {
          setSyncDiag({ loading: false, diag });
        })
        .catch((err) => {
          setSyncDiag({
            loading: false,
            diag: {
              success: false,
              resumeGenerated: true,
              jobSynced: false,
              remoteJobId: null,
              resumeSynced: false,
              error: { message: err.message || String(err) },
            },
          });
        });
    }
  }, [job?.id, overrideLangParam]);


  // Format full resume to plain text for clipboard
  const handleCopyResume = () => {
    let text = '';

    if (viewMode === 'tailored') {
      text += `${profile.name.toUpperCase()}\n`;
      text += `${tailoredResume.headline}\n\n`;
      text += `RESUMO PROFISSIONAL\n${tailoredResume.professionalSummary}\n\n`;
      text += `COMPETÊNCIAS PRIORITÁRIAS\n${tailoredResume.prioritySkills.join(' • ')}\n\n`;
      text += `EXPERIÊNCIA PROFISSIONAL SELECIONADA\n\n`;

      tailoredResume.selectedExperienceBullets.forEach((exp) => {
        text += `${exp.company} — ${exp.role} (${exp.period})\n`;
        exp.highlights.forEach((h) => {
          text += `  • ${h}\n`;
        });
        text += `\n`;
      });

      text += `IDIOMAS & FERRAMENTAS\n`;
      text += `Idiomas: ${profile.languages.map((l) => `${l.language} (${l.level})`).join(', ')}\n`;
      text += `Ferramentas: ${profile.tools.join(', ')}\n`;
    } else {
      text += `${profile.name.toUpperCase()}\n`;
      text += `${profile.targetTitles[0]} | ${profile.targetTitles[1]}\n\n`;
      text += `RESUMO MESTRE\nAnalista de Customer Success e Customer Experience com foco em retenção, onboarding, métricas de satisfação e análise de dados.\n\n`;
      text += `TODAS AS COMPETÊNCIAS\n${profile.skills.join(' • ')}\n\n`;
      text += `HISTÓRICO PROFISSIONAL COMPLETO\n\n`;

      profile.mainExperiences.forEach((exp) => {
        text += `${exp.company}\n`;
        exp.roles.forEach((r) => {
          text += `  ${r.title} (${r.period})\n`;
          r.highlights.forEach((h) => {
            text += `    • ${h}\n`;
          });
        });
        text += `\n`;
      });
    }

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div
        className="bg-white border border-slate-200 rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Navigation Header */}
        <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600/30 border border-blue-400/40 text-blue-400 rounded-lg">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  Currículo Personalizado por Vaga
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {job.company}
                </span>
              </div>
              <h2 className="text-sm sm:text-base font-extrabold text-white tracking-tight line-clamp-1">
                {job.title}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Switcher (Original vs Personalizado) */}
            <div className="flex items-center bg-slate-800 p-1 rounded-lg border border-slate-700">
              <button
                id="btn-switch-original"
                onClick={() => setViewMode('original')}
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition cursor-pointer ${
                  viewMode === 'original'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Original (Mestre)
              </button>
              <button
                id="btn-switch-tailored"
                onClick={() => setViewMode('tailored')}
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                  viewMode === 'tailored'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Sparkles className="w-3 h-3" />
                <span>Personalizado</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Sync Diagnostics Status Bar */}
        <div className="bg-slate-900 text-slate-200 border-b border-slate-800 px-4 py-2 text-xs font-mono flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-1 font-semibold text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" /> Tailored Resume generated: OK
            </span>
            <span className="text-slate-600">•</span>
            {syncDiag.loading ? (
              <span className="text-amber-400 flex items-center gap-1 animate-pulse">
                Sincronizando com Supabase...
              </span>
            ) : syncDiag.diag?.jobSynced ? (
              <span className="text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Job synced: OK
              </span>
            ) : (
              <span className="text-red-400 flex items-center gap-1 font-semibold">
                <AlertCircle className="w-3.5 h-3.5" /> Job synced: ERROR
              </span>
            )}
            <span className="text-slate-600">•</span>
            <span className={syncDiag.diag?.remoteJobId ? 'text-blue-300' : 'text-slate-400'}>
              Remote job_id: {syncDiag.diag?.remoteJobId ? `present (${syncDiag.diag.remoteJobId.slice(0, 8)}...)` : 'missing'}
            </span>
            <span className="text-slate-600">•</span>
            {syncDiag.loading ? (
              <span className="text-slate-400">Tailored Resume synced: ...</span>
            ) : syncDiag.diag?.resumeSynced ? (
              <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" /> Tailored Resume synced: OK
              </span>
            ) : (
              <span className="text-red-400 flex items-center gap-1 font-semibold">
                <AlertCircle className="w-3.5 h-3.5" /> Tailored Resume synced: ERROR
              </span>
            )}
          </div>
        </div>
        {syncDiag.diag?.error && (
          <div className="bg-red-950/60 border-b border-red-800/80 text-red-200 px-4 py-2 text-xs font-mono shrink-0 flex flex-col gap-0.5">
            <div className="font-bold flex items-center gap-1.5 text-red-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Erro de sincronização com Supabase:</span>
            </div>
            <div><strong className="text-red-300">Message:</strong> {syncDiag.diag.error.message}</div>
            {syncDiag.diag.error.code && <div><strong className="text-red-300">Code:</strong> {syncDiag.diag.error.code}</div>}
            {syncDiag.diag.error.details && <div><strong className="text-red-300">Details:</strong> {syncDiag.diag.error.details}</div>}
            {syncDiag.diag.error.hint && <div><strong className="text-red-300">Hint:</strong> {syncDiag.diag.error.hint}</div>}
          </div>
        )}

        {/* Modal Scrollable Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs text-slate-800">
          {/* LANGUAGE SELECTOR & BADGE BAR */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 shadow-2xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700">Idioma do Currículo:</span>
              <div className="inline-flex p-1 bg-white border border-slate-200 rounded-lg text-xs font-medium">
                <button
                  onClick={() => setLangOverride('auto')}
                  className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                    langOverride === 'auto'
                      ? 'bg-slate-900 text-white font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Automático
                </button>
                <button
                  onClick={() => setLangOverride('pt-BR')}
                  className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                    langOverride === 'pt-BR'
                      ? 'bg-emerald-600 text-white font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Português
                </button>
                <button
                  onClick={() => setLangOverride('en')}
                  className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                    langOverride === 'en'
                      ? 'bg-indigo-600 text-white font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  English
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-500">Versão gerada:</span>
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-black tracking-wide border ${
                  tailoredResume.resumeLanguage === 'en'
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-300'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-300'
                }`}
              >
                {tailoredResume.resumeLanguage === 'en' ? 'RESUME: EN 🇺🇸' : 'CURRÍCULO: PT-BR 🇧🇷'}
              </span>
            </div>
          </div>

          {/* ATS Coverage Score Indicator */}
          {viewMode === 'tailored' && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Score de Cobertura ATS (Textual)
                  </span>
                  <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-bold">
                    {tailoredResume.coveredJobKeywordsCount} / {tailoredResume.totalRelevantJobKeywords} keywords cobertas
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
                  Calcula a presença textual exata e equivalências das palavras-chave exigidas pela vaga no perfil do candidato.
                </p>
              </div>

              {/* Progress Ring / Gauge Badge */}
              <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
                <div className="text-right">
                  <div className="text-xl font-black text-slate-900 font-mono">
                    {tailoredResume.atsCoverageScore}%
                  </div>
                  <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                    ATS Coverage
                  </div>
                </div>

                <div className="w-12 h-12 rounded-full border-4 border-slate-200 flex items-center justify-center relative bg-white shadow-2xs">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs ${
                      tailoredResume.atsCoverageScore >= 80
                        ? 'bg-emerald-100 text-emerald-800'
                        : tailoredResume.atsCoverageScore >= 65
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {tailoredResume.atsCoverageScore}%
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* HEADLINE SECTION */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-blue-600" />
                Headline do Perfil {viewMode === 'tailored' ? '(Formatada para a vaga)' : '(Original)'}
              </span>
            </div>
            <div className="bg-blue-50/70 border border-blue-200 rounded-lg p-3 text-blue-950 font-bold text-xs sm:text-sm font-sans tracking-tight">
              {viewMode === 'tailored'
                ? tailoredResume.headline
                : `${profile.name} | ${profile.targetTitles.slice(0, 4).join(' | ')}`}
            </div>
          </div>

          {/* RESUMO PROFISSIONAL */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <Award className="w-3.5 h-3.5 text-indigo-600" />
              Resumo Profissional {viewMode === 'tailored' ? '(Com métricas estratégicas selecionadas)' : '(Mestre)'}
            </span>
            <div className="bg-white border border-slate-200 rounded-lg p-3.5 leading-relaxed text-slate-700 font-medium">
              {viewMode === 'tailored' ? (
                tailoredResume.professionalSummary
              ) : (
                <p>
                  Profissional de Customer Success e Customer Experience com sólida atuação em empresas B2B SaaS (Logzz e ChatSentry). Experiência em onboarding de novos clientes, gestão de carteira corporativa (150+ contas), mitigação de churn (-15%), pesquisas de satisfação (NPS/CSAT) e suporte de alto volume (~60 tickets/dia bilíngue).
                </p>
              )}
            </div>
          </div>

          {/* COMPETÊNCIAS PRIORITÁRIAS */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Competências Prioritárias
            </span>
            <div className="flex flex-wrap gap-1.5 bg-slate-50 border border-slate-200 rounded-lg p-3">
              {(viewMode === 'tailored' ? tailoredResume.prioritySkills : profile.skills).map((skill) => (
                <span
                  key={skill}
                  className="bg-white border border-slate-200 text-slate-800 font-semibold text-[11px] px-2.5 py-1 rounded-md shadow-2xs flex items-center gap-1"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                  {skill}
                </span>
              ))}
            </div>
          </div>

          {/* EXPERIÊNCIA PROFISSIONAL SELECIONADA E REORDENADA */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <ListOrdered className="w-3.5 h-3.5 text-slate-600" />
                Experiência Profissional {viewMode === 'tailored' ? '(Bullets Reordenados por Relevância)' : '(Histórico Mestre)'}
              </span>
            </div>

            <div className="space-y-3">
              {viewMode === 'tailored'
                ? tailoredResume.selectedExperienceBullets.map((exp, idx) => (
                    <div
                      key={`${exp.company}-${idx}`}
                      className="bg-white border border-slate-200 rounded-lg p-3.5 space-y-2 shadow-2xs"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-100 pb-2">
                        <div>
                          <h4 className="font-bold text-slate-900 text-xs sm:text-sm">
                            {exp.role}
                          </h4>
                          <span className="text-xs font-semibold text-blue-700 flex items-center gap-1">
                            <Building2 className="w-3 h-3 text-slate-400" />
                            {exp.company}
                          </span>
                        </div>
                        <span className="text-[11px] font-mono text-slate-500 font-medium">
                          {exp.period}
                        </span>
                      </div>

                      <ul className="space-y-1.5 pl-1">
                        {exp.highlights.map((h, hIdx) => (
                          <li key={hIdx} className="text-xs text-slate-700 flex items-start gap-2 leading-relaxed">
                            <span className="text-blue-500 font-black text-sm leading-none mt-0.5">•</span>
                            <span>{h}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))
                : profile.mainExperiences.map((exp, idx) => (
                    <div key={idx} className="bg-white border border-slate-200 rounded-lg p-3.5 space-y-3 shadow-2xs">
                      <div className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                        <Building2 className="w-4 h-4 text-blue-600" />
                        {exp.company}
                      </div>
                      {exp.roles.map((r, rIdx) => (
                        <div key={rIdx} className="space-y-1.5 pl-2 border-l-2 border-slate-200">
                          <div className="flex justify-between text-xs font-bold text-slate-800">
                            <span>{r.title}</span>
                            <span className="text-[11px] font-mono text-slate-500">{r.period}</span>
                          </div>
                          <ul className="space-y-1 text-slate-600 text-[11px]">
                            {r.highlights.map((h, hIdx) => (
                              <li key={hIdx}>• {h}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  ))}
            </div>
          </div>

          {/* ATS KEYWORDS BREAKDOWN */}
          {viewMode === 'tailored' && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 space-y-2.5">
              <span className="text-[10px] font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-indigo-600" />
                Mapeamento de ATS Keywords da Vaga
              </span>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs">
                {/* MATCHED */}
                <div className="bg-emerald-50/80 border border-emerald-200 rounded-md p-2.5 space-y-1.5">
                  <div className="text-[10px] font-bold text-emerald-800 uppercase flex items-center justify-between">
                    <span>MATCHED ({tailoredResume.atsKeywords.matched.length})</span>
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {tailoredResume.atsKeywords.matched.map((m) => (
                      <span key={m} className="bg-white text-emerald-800 border border-emerald-300 font-semibold text-[10px] px-1.5 py-0.5 rounded">
                        {m}
                      </span>
                    ))}
                  </div>
                </div>

                {/* RELATED */}
                <div className="bg-blue-50/80 border border-blue-200 rounded-md p-2.5 space-y-1.5">
                  <div className="text-[10px] font-bold text-blue-800 uppercase flex items-center justify-between">
                    <span>RELATED ({tailoredResume.atsKeywords.related.length})</span>
                    <ArrowRight className="w-3 h-3 text-blue-600" />
                  </div>
                  <div className="space-y-1">
                    {tailoredResume.atsKeywords.related.length > 0 ? (
                      tailoredResume.atsKeywords.related.map((r, rIdx) => (
                        <div key={rIdx} className="text-[10px] bg-white border border-blue-200 text-blue-900 px-1.5 py-0.5 rounded font-medium flex items-center justify-between">
                          <span>{r.jobKeyword}</span>
                          <span className="text-[9px] text-blue-600 font-bold">→ {r.candidateEquivalent}</span>
                        </div>
                      ))
                    ) : (
                      <span className="text-[10px] text-slate-500 italic">Nenhuma equivalência secundária necessária.</span>
                    )}
                  </div>
                </div>

                {/* MISSING */}
                <div className="bg-amber-50/80 border border-amber-200 rounded-md p-2.5 space-y-1.5">
                  <div className="text-[10px] font-bold text-amber-900 uppercase flex items-center justify-between">
                    <span>MISSING (LACUNAS) ({tailoredResume.atsKeywords.missing.length})</span>
                    <AlertCircle className="w-3 h-3 text-amber-600" />
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {tailoredResume.atsKeywords.missing.length > 0 ? (
                      tailoredResume.atsKeywords.missing.map((m) => (
                        <span key={m} className="bg-white text-amber-900 border border-amber-300 font-semibold text-[10px] px-1.5 py-0.5 rounded">
                          {m}
                        </span>
                      ))
                    ) : (
                      <span className="text-[10px] text-slate-500 italic">Sem lacunas relevantes detectadas.</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* RATIONALE SECTION: "Por que esta versão foi personalizada?" */}
          {viewMode === 'tailored' && tailoredResume.notes.length > 0 && (
            <div className="bg-amber-50/60 border border-amber-200 rounded-lg p-3.5 space-y-2">
              <span className="text-[10px] font-extrabold text-amber-900 uppercase tracking-wider flex items-center gap-1">
                <HelpCircle className="w-3.5 h-3.5 text-amber-700" />
                Por que esta versão foi personalizada? (Auditoria do Algoritmo)
              </span>
              <ul className="space-y-1.5 text-xs text-amber-950 font-medium">
                {tailoredResume.notes.map((note, nIdx) => (
                  <li key={nIdx} className="flex items-start gap-2">
                    <span className="text-amber-600 font-bold">•</span>
                    <span>{note}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Modal Bottom Actions */}
        <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-500 font-medium hidden sm:block">
            Todos os dados originam do perfil mestre (100% de precisão dos fatos).
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg font-bold text-xs transition cursor-pointer"
            >
              Fechar
            </button>

            <button
              id="btn-copy-tailored-resume"
              onClick={handleCopyResume}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs transition shadow-2xs flex items-center gap-1.5 cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-300" />
                  <span>CURRÍCULO COPIADO!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>COPIAR CURRÍCULO</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
