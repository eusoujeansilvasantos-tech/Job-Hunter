import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Copy,
  Check,
  FileCheck2,
  ExternalLink,
  Award,
  ListOrdered,
  Layers,
  HelpCircle,
  Building2,
  MapPin,
  Download,
  FileText,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Mail,
  MessageSquare,
  Send,
  UserCheck,
  Clock,
  Briefcase,
  Share2,
} from 'lucide-react';
import { JobWithAnalysis, UserProfile, ApplicationStatus, OutreachTone, ResumeLanguage } from '../types';
import { generateTailoredResume, TailoredResume, saveTailoredResumeForJob } from '../services/resume';
import { syncTailoredResume, TailoredResumeSyncDiagnostic } from '../services/cloudSync';
import { buildFullResumeData, formatFullResumeAsText } from '../services/fullResume';
import { exportResumeToDocx } from '../services/exportDocx';
import { exportResumeToPdf } from '../services/exportPdf';
import { getJobStatus, setJobStatus, STATUS_LABELS } from '../services/applicationStatus';
import { generateCoverLetter, generateLinkedInOutreach } from '../services/outreachGenerator';

interface ApplicationPackageModalProps {
  job: JobWithAnalysis | null;
  profile: UserProfile;
  onClose: () => void;
  onStatusChange?: (jobId: string, newStatus: ApplicationStatus) => void;
}

type PackageTab = 'resume' | 'cover_letter' | 'linkedin';

export const ApplicationPackageModal: React.FC<ApplicationPackageModalProps> = ({
  job,
  profile,
  onClose,
  onStatusChange,
}) => {
  const [activeTab, setActiveTab] = useState<PackageTab>('resume');
  const [status, setStatus] = useState<ApplicationStatus>('PREPARED');
  const [langOverride, setLangOverride] = useState<'auto' | 'pt-BR' | 'en'>('auto');
  const [recruiterName, setRecruiterName] = useState<string>('');
  const [outreachTone, setOutreachTone] = useState<OutreachTone>('direct');

  // Copy feedback states
  const [copiedResume, setCopiedResume] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [copiedKeywords, setCopiedKeywords] = useState(false);
  const [copiedCoverLetter, setCopiedCoverLetter] = useState(false);
  const [copiedConnectionNote, setCopiedConnectionNote] = useState(false);
  const [copiedInMail, setCopiedInMail] = useState(false);
  const [copiedNetworking, setCopiedNetworking] = useState(false);
  const [copiedFollowUp, setCopiedFollowUp] = useState(false);

  const [isExportingDocx, setIsExportingDocx] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [syncDiag, setSyncDiag] = useState<{
    loading: boolean;
    diag: TailoredResumeSyncDiagnostic | null;
  }>({ loading: true, diag: null });

  useEffect(() => {
    if (job) {
      const current = getJobStatus(job);
      if (current === 'NEW') {
        setJobStatus(job, 'PREPARED');
        setStatus('PREPARED');
        if (onStatusChange) onStatusChange(job.id, 'PREPARED');
      } else {
        setStatus(current);
      }
    }
  }, [job]);

  if (!job) return null;

  const overrideLangParam = langOverride === 'auto' ? undefined : (langOverride as ResumeLanguage);

  // Generate Tailored Resume
  const tailoredResume: TailoredResume = useMemo(() => {
    return generateTailoredResume(job, profile, overrideLangParam);
  }, [job, profile, overrideLangParam]);

  const fullResumeData = useMemo(() => buildFullResumeData(tailoredResume), [tailoredResume]);
  const fullResumeText = useMemo(() => formatFullResumeAsText(fullResumeData), [fullResumeData]);

  // Generate Cover Letter
  const coverLetter = useMemo(() => {
    return generateCoverLetter(job, profile, {
      language: overrideLangParam,
      recruiterName,
      tone: outreachTone,
    });
  }, [job, profile, overrideLangParam, recruiterName, outreachTone]);

  // Generate LinkedIn Outreach Messages
  const linkedInMessages = useMemo(() => {
    return generateLinkedInOutreach(job, profile, {
      language: overrideLangParam,
      recruiterName,
      tone: outreachTone,
    });
  }, [job, profile, overrideLangParam, recruiterName, outreachTone]);

  // Auto-save locally and sync to Supabase with step diagnostics
  useEffect(() => {
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

  const handleStatusSelect = (newStatus: ApplicationStatus) => {
    setStatus(newStatus);
    setJobStatus(job, newStatus);
    if (onStatusChange) onStatusChange(job.id, newStatus);
  };

  const handleCopyResume = () => {
    navigator.clipboard.writeText(fullResumeText);
    setCopiedResume(true);
    setTimeout(() => setCopiedResume(false), 2500);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(job.url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleCopySummary = () => {
    navigator.clipboard.writeText(tailoredResume.professionalSummary);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2500);
  };

  const handleCopyKeywords = () => {
    const text = [
      `MATCHED KEYWORDS: ${tailoredResume.atsKeywords.matched.join(', ')}`,
      `RELATED KEYWORDS: ${tailoredResume.atsKeywords.related.map((r) => `${r.jobKeyword} -> ${r.candidateEquivalent}`).join(', ')}`,
      `MISSING KEYWORDS (LACUNAS): ${tailoredResume.atsKeywords.missing.join(', ')}`,
    ].join('\n');
    navigator.clipboard.writeText(text);
    setCopiedKeywords(true);
    setTimeout(() => setCopiedKeywords(false), 2500);
  };

  const handleCopyCoverLetter = () => {
    navigator.clipboard.writeText(coverLetter.fullText);
    setCopiedCoverLetter(true);
    setTimeout(() => setCopiedCoverLetter(false), 2500);
  };

  const handleDownloadCoverLetterTxt = () => {
    const element = document.createElement('a');
    const file = new Blob([coverLetter.fullText], { type: 'text/plain;charset=utf-8' });
    element.href = URL.createObjectURL(file);
    const cleanCompany = (job.company || 'Empresa').replace(/[^a-zA-Z0-9_-]/g, '_');
    element.download = `Cover_Letter_${cleanCompany}_Jean_Silva.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleCopyMessage = (text: string, setter: React.Dispatch<React.SetStateAction<boolean>>) => {
    navigator.clipboard.writeText(text);
    setter(true);
    setTimeout(() => setter(false), 2500);
  };

  const handleExportDocx = async () => {
    setIsExportingDocx(true);
    try {
      await exportResumeToDocx(fullResumeData, job.company, job.title);
    } catch (err) {
      console.error('Error exporting DOCX:', err);
    } finally {
      setIsExportingDocx(false);
    }
  };

  const handleExportPdf = async () => {
    setIsExportingPdf(true);
    try {
      await exportResumeToPdf(fullResumeData, job.company, job.title);
    } catch (err) {
      console.error('Error exporting PDF:', err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div
        className="bg-white border border-slate-200 rounded-xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 shrink-0">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-indigo-600/30 border border-indigo-400/40 text-indigo-300 rounded-lg shrink-0">
              <FileCheck2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                  PACOTE DE CANDIDATURA PRONTO
                </span>
                <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  {job.company}
                </span>
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  {job.location}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-white tracking-tight mt-0.5">
                {job.title}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            {/* Status Selector */}
            <div className="flex items-center gap-1.5 bg-slate-800 p-1.5 rounded-lg border border-slate-700">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">
                Status:
              </span>
              <select
                id="select-job-status-modal"
                value={status}
                onChange={(e) => handleStatusSelect(e.target.value as ApplicationStatus)}
                className="bg-slate-900 text-white text-xs font-bold px-2 py-1 rounded border border-slate-600 cursor-pointer focus:outline-none focus:border-indigo-400"
              >
                {(Object.keys(STATUS_LABELS) as ApplicationStatus[]).map((stKey) => (
                  <option key={stKey} value={stKey}>
                    {STATUS_LABELS[stKey]}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
              title="Fechar Modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Sync Diagnostics Status Bar */}
        <div className="bg-slate-900 text-slate-200 border-b border-slate-800 px-4 py-2 text-xs font-mono flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-1 font-semibold text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" /> Tailored Resume: OK
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
                <CheckCircle2 className="w-3.5 h-3.5" /> Resume synced: OK
              </span>
            ) : (
              <span className="text-red-400 flex items-center gap-1 font-semibold">
                <AlertCircle className="w-3.5 h-3.5" /> Resume synced: ERROR
              </span>
            )}
          </div>
        </div>

        {/* PACKAGE NAVIGATION TABS */}
        <div className="bg-slate-100 border-b border-slate-200 px-4 pt-2.5 flex items-center gap-2 overflow-x-auto shrink-0">
          <button
            onClick={() => setActiveTab('resume')}
            className={`px-4 py-2 rounded-t-lg font-bold text-xs flex items-center gap-2 transition cursor-pointer border-t border-x ${
              activeTab === 'resume'
                ? 'bg-white text-indigo-700 border-slate-200 -mb-px shadow-xs'
                : 'text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-200/60'
            }`}
          >
            <FileText className="w-4 h-4 text-indigo-600" />
            <span>1. Currículo Sob Medida (ATS)</span>
            <span className="text-[10px] px-1.5 py-0.2 bg-indigo-100 text-indigo-800 rounded-full font-extrabold">
              {tailoredResume.atsCoverageScore}%
            </span>
          </button>

          <button
            onClick={() => setActiveTab('cover_letter')}
            className={`px-4 py-2 rounded-t-lg font-bold text-xs flex items-center gap-2 transition cursor-pointer border-t border-x ${
              activeTab === 'cover_letter'
                ? 'bg-white text-emerald-700 border-slate-200 -mb-px shadow-xs'
                : 'text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-200/60'
            }`}
          >
            <Mail className="w-4 h-4 text-emerald-600" />
            <span>2. Carta de Apresentação (Cover Letter)</span>
            <span className="text-[10px] px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded-full font-extrabold">
              Pronta
            </span>
          </button>

          <button
            onClick={() => setActiveTab('linkedin')}
            className={`px-4 py-2 rounded-t-lg font-bold text-xs flex items-center gap-2 transition cursor-pointer border-t border-x ${
              activeTab === 'linkedin'
                ? 'bg-white text-blue-700 border-slate-200 -mb-px shadow-xs'
                : 'text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-200/60'
            }`}
          >
            <MessageSquare className="w-4 h-4 text-blue-600" />
            <span>3. Mensagens LinkedIn & InMail</span>
            <span className="text-[10px] px-1.5 py-0.2 bg-blue-100 text-blue-800 rounded-full font-extrabold">
              4 Modelos
            </span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs text-slate-800 bg-slate-50/50">
          
          {/* ========================================================================= */}
          {/* TAB 1: CURRÍCULO SOB MEDIDA (ATS) */}
          {/* ========================================================================= */}
          {activeTab === 'resume' && (
            <div className="space-y-4">
              {/* LANGUAGE SELECTOR & BADGE BAR */}
              <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-2xs flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-700">Idioma do Currículo:</span>
                  <div className="inline-flex p-1 bg-slate-100 rounded-lg text-xs font-medium">
                    <button
                      onClick={() => setLangOverride('auto')}
                      className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                        langOverride === 'auto'
                          ? 'bg-white shadow-xs text-slate-900 font-bold'
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
                      Português 🇧🇷
                    </button>
                    <button
                      onClick={() => setLangOverride('en')}
                      className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                        langOverride === 'en'
                          ? 'bg-indigo-600 text-white font-bold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      English 🇺🇸
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

              {/* TOP METRICS & SUMMARY CARDS */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* General Match Score */}
                <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-2xs flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Score de Aderência
                    </span>
                    <div className="text-lg font-black text-slate-900 mt-0.5">
                      {job.analysis.score}%
                      <span className="text-xs font-semibold text-slate-500 ml-1.5">
                        ({job.analysis.classification})
                      </span>
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 font-extrabold text-xs flex items-center justify-center">
                    {job.analysis.score}%
                  </div>
                </div>

                {/* ATS Coverage Score */}
                <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-2xs flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      ATS Coverage (Keywords)
                    </span>
                    <div className="text-lg font-black text-slate-900 mt-0.5">
                      {tailoredResume.atsCoverageScore}%
                      <span className="text-xs font-medium text-slate-500 ml-1.5">
                        ({tailoredResume.coveredJobKeywordsCount}/{tailoredResume.totalRelevantJobKeywords})
                      </span>
                    </div>
                  </div>
                  <div
                    className={`w-10 h-10 rounded-lg font-extrabold text-xs flex items-center justify-center border ${
                      tailoredResume.atsCoverageScore >= 80
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-indigo-50 text-indigo-800 border-indigo-200'
                    }`}
                  >
                    {tailoredResume.atsCoverageScore}%
                  </div>
                </div>

                {/* Job Link Quick Action */}
                <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-2xs flex items-center justify-between">
                  <div className="min-w-0 pr-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Link Oficial da Vaga
                    </span>
                    <p className="text-xs font-semibold text-slate-800 truncate mt-0.5">
                      {job.company}
                    </p>
                  </div>
                  <a
                    href={job.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-bold text-xs transition shadow-2xs shrink-0 flex items-center gap-1 cursor-pointer"
                  >
                    <span>Acessar</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              {/* HEADLINE */}
              <div className="bg-white border border-slate-200 rounded-lg p-3.5 space-y-1 shadow-2xs">
                <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  Headline Otimizada para a Vaga
                </span>
                <div className="text-xs sm:text-sm font-bold text-slate-900 font-sans tracking-tight bg-slate-50 p-2.5 rounded border border-slate-200">
                  {tailoredResume.headline}
                </div>
              </div>

              {/* RESUMO PROFISSIONAL */}
              <div className="bg-white border border-slate-200 rounded-lg p-3.5 space-y-1.5 shadow-2xs">
                <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <Award className="w-3.5 h-3.5 text-blue-600" />
                  Resumo Profissional Estratégico
                </span>
                <div className="text-xs text-slate-700 leading-relaxed font-medium bg-slate-50/70 p-3 rounded border border-slate-200">
                  {tailoredResume.professionalSummary}
                </div>
              </div>

              {/* SKILLS PRIORITIZADAS */}
              <div className="bg-white border border-slate-200 rounded-lg p-3.5 space-y-2 shadow-2xs">
                <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Competências Prioritárias Reorganizadas
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {tailoredResume.prioritySkills.map((skill) => (
                    <span
                      key={skill}
                      className="bg-slate-100 border border-slate-200 text-slate-800 font-bold text-[11px] px-2.5 py-1 rounded shadow-2xs flex items-center gap-1"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              {/* EXPERIÊNCIA SELECIONADA */}
              <div className="bg-white border border-slate-200 rounded-lg p-3.5 space-y-2.5 shadow-2xs">
                <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <ListOrdered className="w-3.5 h-3.5 text-slate-700" />
                  Histórico Profissional Selecionado e Ranqueado por Relevância
                </span>

                <div className="space-y-2.5">
                  {tailoredResume.selectedExperienceBullets.map((exp, idx) => (
                    <div key={idx} className="bg-slate-50 border border-slate-200 rounded-md p-3 space-y-1.5">
                      <div className="flex justify-between items-center border-b border-slate-200 pb-1.5">
                        <div>
                          <span className="font-bold text-slate-900 text-xs">{exp.role}</span>
                          <span className="text-slate-500 text-[11px] ml-2 font-medium">@ {exp.company}</span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-500 font-bold">{exp.period}</span>
                      </div>
                      <ul className="space-y-1 text-slate-700 text-xs">
                        {exp.highlights.map((h, hIdx) => (
                          <li key={hIdx} className="flex items-start gap-1.5 leading-relaxed">
                            <span className="text-blue-600 font-bold">•</span>
                            <span>{h}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>

              {/* KEYWORDS BREAKDOWN */}
              <div className="bg-white border border-slate-200 rounded-lg p-3.5 space-y-2 shadow-2xs">
                <span className="text-[10px] font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-indigo-600" />
                  Mapeamento de ATS Keywords
                </span>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                  <div className="bg-emerald-50/80 border border-emerald-200 rounded p-2.5 space-y-1">
                    <div className="text-[10px] font-bold text-emerald-800 uppercase flex items-center justify-between">
                      <span>MATCHED ({tailoredResume.atsKeywords.matched.length})</span>
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    </div>
                    <div className="flex flex-wrap gap-1 pt-1">
                      {tailoredResume.atsKeywords.matched.map((m) => (
                        <span key={m} className="bg-white text-emerald-800 border border-emerald-300 font-semibold text-[10px] px-1.5 py-0.5 rounded">
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="bg-blue-50/80 border border-blue-200 rounded p-2.5 space-y-1">
                    <div className="text-[10px] font-bold text-blue-800 uppercase flex items-center justify-between">
                      <span>RELATED ({tailoredResume.atsKeywords.related.length})</span>
                      <ArrowRight className="w-3 h-3 text-blue-600" />
                    </div>
                    <div className="space-y-1 pt-1">
                      {tailoredResume.atsKeywords.related.length > 0 ? (
                        tailoredResume.atsKeywords.related.map((r, rIdx) => (
                          <div key={rIdx} className="text-[10px] bg-white border border-blue-200 text-blue-900 px-1.5 py-0.5 rounded font-medium flex items-center justify-between">
                            <span>{r.jobKeyword}</span>
                            <span className="text-[9px] text-blue-600 font-bold">→ {r.candidateEquivalent}</span>
                          </div>
                        ))
                      ) : (
                        <span className="text-[10px] text-slate-500 italic">Nenhum termo equivalente.</span>
                      )}
                    </div>
                  </div>

                  <div className="bg-amber-50/80 border border-amber-200 rounded p-2.5 space-y-1">
                    <div className="text-[10px] font-bold text-amber-900 uppercase flex items-center justify-between">
                      <span>MISSING (LACUNAS) ({tailoredResume.atsKeywords.missing.length})</span>
                      <AlertCircle className="w-3 h-3 text-amber-600" />
                    </div>
                    <div className="flex flex-wrap gap-1 pt-1">
                      {tailoredResume.atsKeywords.missing.length > 0 ? (
                        tailoredResume.atsKeywords.missing.map((m) => (
                          <span key={m} className="bg-white text-amber-900 border border-amber-300 font-semibold text-[10px] px-1.5 py-0.5 rounded">
                            {m}
                          </span>
                        ))
                      ) : (
                        <span className="text-[10px] text-slate-500 italic">Sem lacunas detectadas.</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* RATIONALE AUDIT */}
              {tailoredResume.notes.length > 0 && (
                <div className="bg-amber-50/80 border border-amber-200 rounded-lg p-3 space-y-1.5">
                  <span className="text-[10px] font-extrabold text-amber-900 uppercase tracking-wider flex items-center gap-1">
                    <HelpCircle className="w-3.5 h-3.5 text-amber-700" />
                    Auditoria do Algoritmo de Personalização
                  </span>
                  <ul className="space-y-1 text-xs text-amber-950 font-medium">
                    {tailoredResume.notes.map((note, nIdx) => (
                      <li key={nIdx} className="flex items-start gap-1.5">
                        <span className="text-amber-600 font-bold">•</span>
                        <span>{note}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: CARTA DE APRESENTAÇÃO (COVER LETTER) */}
          {/* ========================================================================= */}
          {activeTab === 'cover_letter' && (
            <div className="space-y-4">
              {/* Controls Bar: Recruiter Name, Tone, Language */}
              <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-2xs space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Recruiter Name */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider flex items-center gap-1">
                      <UserCheck className="w-3 h-3 text-emerald-600" />
                      Nome do Recrutador / Gestor (Opcional)
                    </label>
                    <input
                      type="text"
                      value={recruiterName}
                      onChange={(e) => setRecruiterName(e.target.value)}
                      placeholder="Ex: Mariana, Carlos... (ou vazio)"
                      className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {/* Tone Selector */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-indigo-600" />
                      Tom de Voz da Abordagem
                    </label>
                    <select
                      value={outreachTone}
                      onChange={(e) => setOutreachTone(e.target.value as OutreachTone)}
                      className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                    >
                      <option value="direct">Direto & Focado em Resultados (Recomendado)</option>
                      <option value="executive">Executivo & Governança Estratégica</option>
                      <option value="enthusiastic">Entusiasta & Alinhado à Cultura</option>
                    </select>
                  </div>

                  {/* Language Selector */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">
                      Idioma da Carta
                    </label>
                    <div className="inline-flex w-full p-0.5 bg-slate-100 rounded text-xs font-medium">
                      <button
                        onClick={() => setLangOverride('auto')}
                        className={`flex-1 py-1 rounded transition cursor-pointer text-center ${
                          langOverride === 'auto' ? 'bg-white font-bold text-slate-900 shadow-2xs' : 'text-slate-600'
                        }`}
                      >
                        Auto
                      </button>
                      <button
                        onClick={() => setLangOverride('pt-BR')}
                        className={`flex-1 py-1 rounded transition cursor-pointer text-center ${
                          langOverride === 'pt-BR' ? 'bg-emerald-600 font-bold text-white shadow-2xs' : 'text-slate-600'
                        }`}
                      >
                        PT 🇧🇷
                      </button>
                      <button
                        onClick={() => setLangOverride('en')}
                        className={`flex-1 py-1 rounded transition cursor-pointer text-center ${
                          langOverride === 'en' ? 'bg-indigo-600 font-bold text-white shadow-2xs' : 'text-slate-600'
                        }`}
                      >
                        EN 🇺🇸
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Cover Letter Document Card */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4 font-sans">
                {/* Letter Header */}
                <div className="border-b border-slate-100 pb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                      Assunto Sugerido:
                    </span>
                    <div className="text-xs font-bold text-slate-900 mt-0.5">
                      {coverLetter.subject}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCopyCoverLetter}
                      className="px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      {copiedCoverLetter ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedCoverLetter ? 'Copiada!' : 'Copiar Carta Completa'}</span>
                    </button>
                    <button
                      onClick={handleDownloadCoverLetterTxt}
                      className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded font-bold text-xs transition flex items-center gap-1.5 cursor-pointer"
                      title="Baixar em formato .txt"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Baixar .txt</span>
                    </button>
                  </div>
                </div>

                {/* Letter Body Preview */}
                <div className="text-xs text-slate-800 leading-relaxed space-y-3 bg-slate-50/50 p-4 rounded-lg border border-slate-100 font-sans">
                  <p className="font-bold text-slate-900">{coverLetter.greeting}</p>
                  <p>{coverLetter.openingParagraph}</p>
                  
                  {/* Highlights paragraph highlighted */}
                  <div className="p-3 bg-emerald-50/60 border-l-4 border-emerald-500 rounded-r text-slate-800">
                    <span className="text-[10px] font-extrabold text-emerald-800 uppercase tracking-wider block mb-1">
                      ★ Evidências de Alto Impacto (Customizadas para a Vaga):
                    </span>
                    {coverLetter.achievementsParagraph}
                  </div>

                  <p>{coverLetter.valuePropositionParagraph}</p>
                  <p>{coverLetter.closingParagraph}</p>
                  <div className="pt-2 border-t border-slate-200 whitespace-pre-line text-slate-700 font-medium">
                    {coverLetter.signOff}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: MENSAGENS PARA LINKEDIN & INMAIL */}
          {/* ========================================================================= */}
          {activeTab === 'linkedin' && (
            <div className="space-y-4">
              {/* Controls Bar */}
              <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-2xs flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
                  <div className="flex-1 min-w-[180px]">
                    <input
                      type="text"
                      value={recruiterName}
                      onChange={(e) => setRecruiterName(e.target.value)}
                      placeholder="Nome do Recrutador (Ex: Camila, João...)"
                      className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <select
                    value={outreachTone}
                    onChange={(e) => setOutreachTone(e.target.value as OutreachTone)}
                    className="bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="direct">Tom Direto & Objetivo</option>
                    <option value="executive">Tom Executivo</option>
                    <option value="enthusiastic">Tom Entusiasta</option>
                  </select>
                </div>

                <div className="inline-flex p-0.5 bg-slate-100 rounded text-xs font-medium">
                  <button
                    onClick={() => setLangOverride('pt-BR')}
                    className={`px-3 py-1 rounded transition cursor-pointer ${
                      langOverride === 'pt-BR' || (langOverride === 'auto' && tailoredResume.resumeLanguage === 'pt-BR')
                        ? 'bg-blue-600 font-bold text-white shadow-2xs'
                        : 'text-slate-600'
                    }`}
                  >
                    Português 🇧🇷
                  </button>
                  <button
                    onClick={() => setLangOverride('en')}
                    className={`px-3 py-1 rounded transition cursor-pointer ${
                      langOverride === 'en' || (langOverride === 'auto' && tailoredResume.resumeLanguage === 'en')
                        ? 'bg-indigo-600 font-bold text-white shadow-2xs'
                        : 'text-slate-600'
                    }`}
                  >
                    English 🇺🇸
                  </button>
                </div>
              </div>

              {/* 4 Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                
                {/* 1. Connection Note */}
                <div className="bg-white border-2 border-blue-200 rounded-xl p-4 shadow-sm flex flex-col justify-between space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-extrabold uppercase">
                            Convite de Conexão
                          </span>
                          <span className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {linkedInMessages.connectionNote.recommendedTiming}
                          </span>
                        </div>
                        <h3 className="text-xs font-bold text-slate-900 mt-1">
                          {linkedInMessages.connectionNote.title}
                        </h3>
                      </div>

                      {/* Character Counter */}
                      <span
                        className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                          linkedInMessages.connectionNote.charCount <= 300
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-red-50 text-red-700 border-red-200 animate-pulse'
                        }`}
                        title="Limite oficial do LinkedIn para notas de convite"
                      >
                        {linkedInMessages.connectionNote.charCount} / 300 caracteres
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-500">
                      {linkedInMessages.connectionNote.description}
                    </p>

                    <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-3 text-xs text-slate-800 leading-relaxed font-sans select-all">
                      {linkedInMessages.connectionNote.content}
                    </div>
                  </div>

                  <button
                    onClick={() => handleCopyMessage(linkedInMessages.connectionNote.content, setCopiedConnectionNote)}
                    className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    {copiedConnectionNote ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedConnectionNote ? 'Nota Copiada!' : 'Copiar Nota de Conexão (300 char)'}</span>
                  </button>
                </div>

                {/* 2. InMail / Direct Message */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col justify-between space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 text-[10px] font-extrabold uppercase">
                            DM / InMail Completo
                          </span>
                          <span className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {linkedInMessages.inMailMessage.recommendedTiming}
                          </span>
                        </div>
                        <h3 className="text-xs font-bold text-slate-900 mt-1">
                          {linkedInMessages.inMailMessage.title}
                        </h3>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500 font-semibold">
                        {linkedInMessages.inMailMessage.charCount} caracteres
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-500">
                      {linkedInMessages.inMailMessage.description}
                    </p>

                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-800 leading-relaxed font-sans max-h-36 overflow-y-auto whitespace-pre-line select-all">
                      {linkedInMessages.inMailMessage.content}
                    </div>
                  </div>

                  <button
                    onClick={() => handleCopyMessage(linkedInMessages.inMailMessage.content, setCopiedInMail)}
                    className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    {copiedInMail ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedInMail ? 'Mensagem Copiada!' : 'Copiar InMail Pós-Candidatura'}</span>
                  </button>
                </div>

                {/* 3. Networking / Peer Outreach */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col justify-between space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-extrabold uppercase">
                            Networking & Referral
                          </span>
                          <span className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {linkedInMessages.networkingMessage.recommendedTiming}
                          </span>
                        </div>
                        <h3 className="text-xs font-bold text-slate-900 mt-1">
                          {linkedInMessages.networkingMessage.title}
                        </h3>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500 font-semibold">
                        {linkedInMessages.networkingMessage.charCount} caracteres
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-500">
                      {linkedInMessages.networkingMessage.description}
                    </p>

                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-800 leading-relaxed font-sans max-h-36 overflow-y-auto whitespace-pre-line select-all">
                      {linkedInMessages.networkingMessage.content}
                    </div>
                  </div>

                  <button
                    onClick={() => handleCopyMessage(linkedInMessages.networkingMessage.content, setCopiedNetworking)}
                    className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-md font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    {copiedNetworking ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedNetworking ? 'Mensagem Copiada!' : 'Copiar Mensagem de Networking'}</span>
                  </button>
                </div>

                {/* 4. Follow-up Message */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col justify-between space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 text-[10px] font-extrabold uppercase">
                            Follow-up de 7 a 14 dias
                          </span>
                          <span className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {linkedInMessages.followUpMessage.recommendedTiming}
                          </span>
                        </div>
                        <h3 className="text-xs font-bold text-slate-900 mt-1">
                          {linkedInMessages.followUpMessage.title}
                        </h3>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500 font-semibold">
                        {linkedInMessages.followUpMessage.charCount} caracteres
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-500">
                      {linkedInMessages.followUpMessage.description}
                    </p>

                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-800 leading-relaxed font-sans max-h-36 overflow-y-auto whitespace-pre-line select-all">
                      {linkedInMessages.followUpMessage.content}
                    </div>
                  </div>

                  <button
                    onClick={() => handleCopyMessage(linkedInMessages.followUpMessage.content, setCopiedFollowUp)}
                    className="w-full py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-md font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    {copiedFollowUp ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedFollowUp ? 'Follow-up Copiado!' : 'Copiar Follow-up de Checagem'}</span>
                  </button>
                </div>

              </div>
            </div>
          )}

        </div>

        {/* Modal Bottom Actions Bar */}
        <div className="bg-slate-900 text-white px-5 py-3.5 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          {/* Quick Copy Buttons Group */}
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {activeTab === 'resume' && (
              <>
                <button
                  id="btn-copy-full-resume"
                  onClick={handleCopyResume}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-md font-bold text-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedResume ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedResume ? 'Copiado!' : 'Copiar Currículo'}</span>
                </button>

                <button
                  id="btn-copy-summary"
                  onClick={handleCopySummary}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-md font-bold text-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedSummary ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSummary ? 'Copiado!' : 'Copiar Resumo'}</span>
                </button>

                <button
                  id="btn-copy-keywords"
                  onClick={handleCopyKeywords}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-md font-bold text-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedKeywords ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKeywords ? 'Copiado!' : 'Copiar Keywords'}</span>
                </button>
              </>
            )}

            {activeTab === 'cover_letter' && (
              <button
                onClick={handleCopyCoverLetter}
                className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white border border-emerald-600 rounded-md font-bold text-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                {copiedCoverLetter ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCoverLetter ? 'Carta Copiada!' : 'Copiar Carta Completa'}</span>
              </button>
            )}

            {activeTab === 'linkedin' && (
              <button
                onClick={() => handleCopyMessage(linkedInMessages.connectionNote.content, setCopiedConnectionNote)}
                className="px-3 py-1.5 bg-blue-700 hover:bg-blue-600 text-white border border-blue-600 rounded-md font-bold text-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                {copiedConnectionNote ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedConnectionNote ? 'Nota Copiada!' : 'Copiar Nota Convite (300 char)'}</span>
              </button>
            )}

            <a
              id="btn-open-job-page"
              href={job.url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white border border-emerald-600 rounded-md font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title="Abrir página original de candidatura da vaga"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>APPLY (Página Oficial)</span>
            </a>

            <button
              id="btn-copy-job-link"
              onClick={handleCopyLink}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-md font-bold text-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'Copiado!' : 'Copiar Link'}</span>
            </button>
          </div>

          {/* Export File Buttons Group */}
          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <button
              id="btn-export-docx"
              onClick={handleExportDocx}
              disabled={isExportingDocx}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-md transition shadow-2xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <FileText className="w-4 h-4" />
              <span>{isExportingDocx ? 'Exportando DOCX...' : 'EXPORTAR DOCX'}</span>
            </button>

            <button
              id="btn-export-pdf"
              onClick={handleExportPdf}
              disabled={isExportingPdf}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-md transition shadow-2xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{isExportingPdf ? 'Exportando PDF...' : 'EXPORTAR PDF'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
