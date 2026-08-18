import React, { useState, useEffect } from 'react';
import {
  X,
  Building2,
  MapPin,
  Briefcase,
  ExternalLink,
  Calendar,
  Clock,
  DollarSign,
  User,
  Linkedin,
  Mail,
  FileText,
  Plus,
  MessageSquare,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Tag,
  ArrowRight,
  Globe,
  Award,
  Bell,
  Copy,
  Check,
  Moon,
  Settings,
  Send
} from 'lucide-react';
import {
  JobWithAnalysis,
  UserProfile,
  ApplicationStatus,
  ApplicationDetails,
  ApplicationEvent,
  ApplicationChannel,
  FollowUpOverride
} from '../types';
import {
  STATUS_LABELS,
  STATUS_COLORS,
  getApplicationDetails,
  setJobStatus,
  updateApplicationDetails,
  getDaysInCurrentStage,
  getDaysSinceApplied,
  getStoredEvents,
  markFollowUpSent,
  setFollowUpSnooze,
  setFollowUpOverride
} from '../services/applicationStatus';
import {
  calculateFollowUpState,
  getFollowUpTemplate
} from '../services/followUpIntelligence';
import { getStoredTailoredResumes } from '../services/resume';
import { AddApplicationEventModal } from './AddApplicationEventModal';

interface ApplicationDetailsModalProps {
  job: JobWithAnalysis | null;
  profile: UserProfile;
  isOpen: boolean;
  onClose: () => void;
  onViewResume: (job: JobWithAnalysis) => void;
  onStatusChange: () => void;
}

const APPLICATION_CHANNELS: ApplicationChannel[] = [
  'LinkedIn',
  'Indeed',
  'Gupy',
  'Greenhouse',
  'Company Website',
  'Referral',
  'Email',
  'Other',
];

export const ApplicationDetailsModal: React.FC<ApplicationDetailsModalProps> = ({
  job,
  profile,
  isOpen,
  onClose,
  onViewResume,
  onStatusChange,
}) => {
  const [details, setDetails] = useState<ApplicationDetails | null>(null);
  const [events, setEvents] = useState<ApplicationEvent[]>([]);
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [copiedText, setCopiedText] = useState(false);

  useEffect(() => {
    if (job) {
      const currentDetails = getApplicationDetails(job);
      setDetails(currentDetails);
      loadEventsForJob(job);
    }
  }, [job, isOpen]);

  const loadEventsForJob = (j: JobWithAnalysis) => {
    const allEvents = getStoredEvents();
    const filtered = allEvents
      .filter((e) => e.job_id === j.id || e.application_id === j.id)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    setEvents(filtered);
  };

  if (!isOpen || !job || !details) return null;

  const currentStatus = details.status;
  const daysInStage = getDaysInCurrentStage(details);
  const daysSinceApplied = getDaysSinceApplied(details);

  const storedResumes = getStoredTailoredResumes();
  const tailoredResume = storedResumes[job.url] || null;

  // Calculate Follow-Up Intelligence Result
  const followUpResult = calculateFollowUpState(details, events, job);

  const handleStatusSelect = (newStatus: ApplicationStatus) => {
    setJobStatus(job, newStatus);
    const updated = getApplicationDetails(job);
    setDetails(updated);
    loadEventsForJob(job);
    onStatusChange();
  };

  const handleMarkSent = () => {
    markFollowUpSent(job, 'Follow-up registrado via botão de ação rápida');
    const updated = getApplicationDetails(job);
    setDetails(updated);
    loadEventsForJob(job);
    onStatusChange();
  };

  const handleSnooze = (days: number) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    setFollowUpSnooze(job, date.toISOString());
    const updated = getApplicationDetails(job);
    setDetails(updated);
    onStatusChange();
  };

  const handleOverride = (override: FollowUpOverride) => {
    setFollowUpOverride(job, override);
    const updated = getApplicationDetails(job);
    setDetails(updated);
    onStatusChange();
  };

  const handleCopyTemplate = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  const templateObj = getFollowUpTemplate(
    job.title,
    job.company,
    details.recruiter_name,
    tailoredResume?.resumeLanguage || job.language
  );

  const handleFieldChange = (field: keyof ApplicationDetails, value: any) => {
    const updated = updateApplicationDetails(job, { [field]: value });
    setDetails(updated);
  };

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setDetails((prev) => (prev ? { ...prev, notes: val } : null));
    setIsSavingNotes(true);

    // Auto save debounced
    const timeout = setTimeout(() => {
      updateApplicationDetails(job, { notes: val });
      setIsSavingNotes(false);
    }, 600);

    return () => clearTimeout(timeout);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-150">
        <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col my-auto">
          {/* Header */}
          <div className="bg-slate-900 text-white p-5 border-b border-slate-800 flex flex-wrap items-start justify-between gap-4 shrink-0">
            <div className="space-y-1.5 max-w-2xl">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-semibold border border-indigo-500/30">
                  Application Cockpit
                </span>
                <span className="text-slate-400">•</span>
                <span className="text-slate-300 font-medium">{job.company}</span>
              </div>
              <h2 className="text-lg font-bold text-slate-100 tracking-tight leading-snug">
                {job.title}
              </h2>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300 pt-0.5">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" /> {job.location}
                </span>
                <span className="flex items-center gap-1">
                  <Briefcase className="w-3.5 h-3.5 text-slate-400" /> {job.workplaceType}
                </span>
                {job.url && (
                  <a
                    href={job.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-medium hover:underline"
                  >
                    <span>Vaga oficial</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>

            <div className="flex flex-col items-end gap-2">
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-white p-1 rounded-md transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 mt-1">
                <div className="text-right text-xs">
                  <div className="font-bold text-emerald-400">{job.analysis?.score ?? 0}% Match</div>
                  <div className="text-[10px] text-slate-400">ATS Coverage: {job.analysis?.score ?? 0}%</div>
                </div>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-800 bg-slate-50/50 flex-1">
            {/* Status & Timing Bar */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Estágio Atual da Candidatura
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {(['PREPARED', 'APPLIED', 'INTERVIEW', 'REJECTED', 'OFFER'] as ApplicationStatus[]).map((st) => (
                    <button
                      key={st}
                      onClick={() => handleStatusSelect(st)}
                      className={`px-3 py-1.5 rounded-lg font-bold border transition-all text-xs flex items-center gap-1.5 ${
                        currentStatus === st
                          ? `${STATUS_COLORS[st].bg} ${STATUS_COLORS[st].text} ${STATUS_COLORS[st].border} ring-2 ring-offset-1 ring-indigo-400/50 shadow-sm`
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <span>{STATUS_LABELS[st]}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs font-medium border-l border-slate-200 pl-4">
                <div className="bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                  <span className="text-slate-500 block text-[10px]">Dias no Estágio</span>
                  <span className="font-bold text-slate-900 text-sm">{daysInStage} dias</span>
                </div>
                {daysSinceApplied !== null && (
                  <div className="bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 text-indigo-900">
                    <span className="text-indigo-600 block text-[10px]">Candidatado Há</span>
                    <span className="font-bold text-sm">{daysSinceApplied} dias</span>
                  </div>
                )}
              </div>
            </div>

            {/* FOLLOW-UP INTELLIGENCE SECTION (Phase 3.3) */}
            <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-4 rounded-xl shadow-md border border-slate-800 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-amber-400" />
                  <h3 className="font-bold text-sm tracking-wide text-slate-100">
                    FOLLOW-UP INTELLIGENCE
                  </h3>
                  {followUpResult.isSnoozed && (
                    <span className="px-2 py-0.5 bg-purple-500/30 text-purple-200 border border-purple-500/40 rounded-full text-[10px] font-bold flex items-center gap-1">
                      <Moon className="w-3 h-3" /> Snoozed
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-extrabold uppercase border shadow-sm ${
                    followUpResult.state === 'NEXT_STEP_OVERDUE' || followUpResult.state === 'FOLLOW_UP_OVERDUE'
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                      : followUpResult.state === 'NEXT_STEP_TODAY'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : followUpResult.state === 'FOLLOW_UP_RECOMMENDED'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : followUpResult.state === 'INTERVIEW_SOON' || followUpResult.state === 'FOLLOW_UP_SOON'
                      ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                      : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}>
                    {followUpResult.state.replace(/_/g, ' ')}
                  </span>
                  <span className="px-2.5 py-1 bg-slate-800 border border-slate-700 text-amber-300 font-extrabold text-xs rounded-lg">
                    Urgency: {followUpResult.urgencyScore}/100
                  </span>
                </div>
              </div>

              {/* Status Details & Recommended Action */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="bg-slate-800/60 p-2.5 rounded-lg border border-slate-700/60 space-y-1">
                  <span className="text-slate-400 text-[10px] uppercase font-bold">Última Atividade</span>
                  <p className="font-semibold text-slate-200">
                    {followUpResult.daysSinceLastActivity !== undefined
                      ? `Há ${followUpResult.daysSinceLastActivity} dia(s)`
                      : 'Sem registro'}
                  </p>
                </div>

                <div className="bg-slate-800/60 p-2.5 rounded-lg border border-slate-700/60 space-y-1">
                  <span className="text-slate-400 text-[10px] uppercase font-bold">Dias desde Candidatura</span>
                  <p className="font-semibold text-slate-200">
                    {followUpResult.daysSinceApplied !== undefined
                      ? `${followUpResult.daysSinceApplied} dia(s)`
                      : 'Não candidatado'}
                  </p>
                </div>

                <div className="bg-slate-800/60 p-2.5 rounded-lg border border-slate-700/60 space-y-1">
                  <span className="text-slate-400 text-[10px] uppercase font-bold">Próxima Etapa</span>
                  <p className="font-semibold text-slate-200">
                    {followUpResult.daysUntilNextStep !== undefined
                      ? followUpResult.daysUntilNextStep === 0
                        ? 'Hoje!'
                        : followUpResult.daysUntilNextStep < 0
                        ? `Vencida há ${Math.abs(followUpResult.daysUntilNextStep)} dia(s)`
                        : `Em ${followUpResult.daysUntilNextStep} dia(s)`
                      : 'Sem data'}
                  </p>
                </div>
              </div>

              {/* Recommendation Box */}
              <div className="bg-indigo-950/80 p-3 rounded-lg border border-indigo-800/70 space-y-1">
                <div className="text-[10px] font-extrabold text-indigo-300 uppercase tracking-wide">
                  Ação Recomendada
                </div>
                <p className="font-bold text-sm text-indigo-100">{followUpResult.recommendedAction}</p>
                <p className="text-xs text-indigo-200/80">{followUpResult.reason}</p>
              </div>

              {/* Warnings if any */}
              {followUpResult.warnings.length > 0 && (
                <div className="bg-amber-500/10 border border-amber-500/30 p-2.5 rounded-lg text-amber-200 text-xs space-y-1">
                  {followUpResult.warnings.map((w, i) => (
                    <div key={i} className="flex items-center gap-1.5 font-medium">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>{w}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Quick Action Controls */}
              <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={handleMarkSent}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>MARK FOLLOW-UP SENT</span>
                  </button>

                  <button
                    onClick={() => setShowTemplateModal(!showTemplateModal)}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-xs transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>COPIAR MENSAGEM</span>
                  </button>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  {/* Snooze Dropdown */}
                  <div className="flex items-center gap-1 bg-slate-800 border border-slate-700 px-2 py-1 rounded-lg">
                    <Moon className="w-3 h-3 text-purple-400" />
                    <select
                      value=""
                      onChange={(e) => {
                        if (e.target.value) handleSnooze(Number(e.target.value));
                      }}
                      className="bg-transparent text-slate-200 font-semibold focus:outline-none cursor-pointer text-xs"
                    >
                      <option value="" className="bg-slate-900">Adiar (Snooze)</option>
                      <option value="1" className="bg-slate-900">1 dia</option>
                      <option value="3" className="bg-slate-900">3 dias</option>
                      <option value="7" className="bg-slate-900">7 dias</option>
                    </select>
                  </div>

                  {/* Override Dropdown */}
                  <div className="flex items-center gap-1 bg-slate-800 border border-slate-700 px-2 py-1 rounded-lg">
                    <Settings className="w-3 h-3 text-slate-400" />
                    <select
                      value={details.follow_up_override || 'AUTO'}
                      onChange={(e) => handleOverride(e.target.value as FollowUpOverride)}
                      className="bg-transparent text-slate-200 font-semibold focus:outline-none cursor-pointer text-xs"
                    >
                      <option value="AUTO" className="bg-slate-900">Modo Auto</option>
                      <option value="DO_NOT_FOLLOW_UP" className="bg-slate-900">Não Acompanhar</option>
                      <option value="FOLLOW_UP_LATER" className="bg-slate-900">Acompanhar Depois</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Template Drawer / Modal inside details */}
              {showTemplateModal && (
                <div className="bg-slate-800 p-3 rounded-lg border border-slate-700 space-y-3 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-200">
                    <span>Modelo de Mensagem de Follow-up (Local)</span>
                    <button
                      onClick={() => setShowTemplateModal(false)}
                      className="text-slate-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-2">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase">
                        <span>Português (pt-BR)</span>
                        <button
                          onClick={() => handleCopyTemplate(templateObj.ptBR)}
                          className="text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1 cursor-pointer"
                        >
                          {copiedText ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedText ? 'Copiado!' : 'Copiar'}</span>
                        </button>
                      </div>
                      <p className="bg-slate-900 p-2.5 rounded border border-slate-700 text-slate-200 text-xs italic">
                        {templateObj.ptBR}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase">
                        <span>English (en-US)</span>
                        <button
                          onClick={() => handleCopyTemplate(templateObj.en)}
                          className="text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1 cursor-pointer"
                        >
                          {copiedText ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedText ? 'Copiado!' : 'Copiar'}</span>
                        </button>
                      </div>
                      <p className="bg-slate-900 p-2.5 rounded border border-slate-700 text-slate-200 text-xs italic">
                        {templateObj.en}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Operational Details Grid */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-2">
                <Briefcase className="w-4 h-4 text-indigo-600" />
                <span>Dados Operacionais & Recrutamento</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {/* Canal de Candidatura */}
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Canal de Candidatura</label>
                  <select
                    value={details.application_channel || ''}
                    onChange={(e) => handleFieldChange('application_channel', e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-slate-800 bg-white focus:ring-1 focus:ring-indigo-500 outline-none"
                  >
                    <option value="">Selecione o canal...</option>
                    {APPLICATION_CHANNELS.map((ch) => (
                      <option key={ch} value={ch}>{ch}</option>
                    ))}
                  </select>
                </div>

                {/* Recrutador */}
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Nome do Recrutador</label>
                  <input
                    type="text"
                    value={details.recruiter_name || ''}
                    onChange={(e) => handleFieldChange('recruiter_name', e.target.value)}
                    placeholder="Ex: Amanda Silva"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-slate-800 bg-white focus:ring-1 focus:ring-indigo-500 outline-none"
                  />
                </div>

                {/* LinkedIn Recrutador */}
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">LinkedIn do Recrutador</label>
                  <input
                    type="text"
                    value={details.recruiter_linkedin || ''}
                    onChange={(e) => handleFieldChange('recruiter_linkedin', e.target.value)}
                    placeholder="linkedin.com/in/recruiter"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-slate-800 bg-white focus:ring-1 focus:ring-indigo-500 outline-none"
                  />
                </div>

                {/* Contato Empresa */}
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Contato na Empresa</label>
                  <input
                    type="text"
                    value={details.company_contact_name || ''}
                    onChange={(e) => handleFieldChange('company_contact_name', e.target.value)}
                    placeholder="Ex: Carlos (Hiring Manager)"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-slate-800 bg-white focus:ring-1 focus:ring-indigo-500 outline-none"
                  />
                </div>

                {/* Email Contato */}
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">E-mail de Contato</label>
                  <input
                    type="email"
                    value={details.company_contact_email || ''}
                    onChange={(e) => handleFieldChange('company_contact_email', e.target.value)}
                    placeholder="carlos@company.com"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-slate-800 bg-white focus:ring-1 focus:ring-indigo-500 outline-none"
                  />
                </div>

                {/* Expectativa Salarial */}
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Expectativa Salarial</label>
                  <input
                    type="text"
                    value={details.salary_expectation || ''}
                    onChange={(e) => handleFieldChange('salary_expectation', e.target.value)}
                    placeholder="Ex: R$ 8.500 / Negociável"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-slate-800 bg-white focus:ring-1 focus:ring-indigo-500 outline-none"
                  />
                </div>

                {/* Salário Oferecido */}
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Salário Oferecido</label>
                  <input
                    type="text"
                    value={details.salary_offered || ''}
                    onChange={(e) => handleFieldChange('salary_offered', e.target.value)}
                    placeholder="Ex: R$ 9.000 + Benefícios"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-slate-800 bg-white focus:ring-1 focus:ring-indigo-500 outline-none"
                  />
                </div>

                {/* Próximo Passo */}
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Próximo Passo</label>
                  <input
                    type="text"
                    value={details.next_step || ''}
                    onChange={(e) => handleFieldChange('next_step', e.target.value)}
                    placeholder="Ex: Entrevista Técnica com Tech Lead"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-slate-800 bg-white focus:ring-1 focus:ring-indigo-500 outline-none"
                  />
                </div>

                {/* Data Próximo Passo */}
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Data do Próximo Passo</label>
                  <input
                    type="datetime-local"
                    value={details.next_step_date ? details.next_step_date.slice(0, 16) : ''}
                    onChange={(e) => handleFieldChange('next_step_date', e.target.value ? new Date(e.target.value).toISOString() : null)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-slate-800 bg-white focus:ring-1 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Currículo Associado */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  <span>Currículo Personalizado Associado</span>
                </div>
                <div className="text-[11px] text-slate-500">
                  {tailoredResume
                    ? `Idioma: ${tailoredResume.resumeLanguage.toUpperCase()} • ATS Score: ${tailoredResume.atsCoverageScore}%`
                    : 'Ainda não foi gerado currículo sob medida para esta vaga.'}
                </div>
              </div>

              <button
                onClick={() => onViewResume(job)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{tailoredResume ? 'VER CURRÍCULO' : 'GERAR CURRÍCULO'}</span>
              </button>
            </div>

            {/* Notas do Processo */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-amber-500" />
                  <span>Notas do Processo Seletivo</span>
                </label>
                {isSavingNotes && (
                  <span className="text-[10px] text-slate-400 animate-pulse">Salvando notas...</span>
                )}
              </div>
              <textarea
                value={details.notes || ''}
                onChange={handleNotesChange}
                placeholder="Anotações gerais sobre conversas, feedbacks, detalhes de benefícios ou pré-requisitos observados..."
                rows={3}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none"
              />
            </div>

            {/* Timeline do Processo */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-indigo-600" />
                  <span>Histórico da Candidatura (Timeline)</span>
                </h3>
                <button
                  onClick={() => setIsAddEventOpen(true)}
                  className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg text-[11px] transition-colors flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>ADICIONAR EVENTO</span>
                </button>
              </div>

              {events.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs">
                  Nenhum evento gravado no histórico ainda.
                </div>
              ) : (
                <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                  {events.map((evt) => (
                    <div key={evt.id} className="relative group text-xs">
                      <div className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full bg-white border-2 border-indigo-600 group-hover:scale-110 transition-transform" />
                      <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-slate-800 uppercase tracking-wide">
                            {evt.event_type.replace('_', ' ')}
                          </span>
                          <span className="text-slate-400 text-[10px]">
                            {new Date(evt.created_at).toLocaleString('pt-BR')}
                          </span>
                        </div>
                        {evt.from_status && evt.to_status && (
                          <div className="text-slate-600 font-medium text-[11px] flex items-center gap-1">
                            <span>Status:</span>
                            <span className="font-bold text-slate-700">{evt.from_status}</span>
                            <ArrowRight className="w-3 h-3 text-slate-400" />
                            <span className="font-bold text-indigo-600">{evt.to_status}</span>
                          </div>
                        )}
                        {evt.notes && <p className="text-slate-600 italic mt-0.5">{evt.notes}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <AddApplicationEventModal
        job={job}
        isOpen={isAddEventOpen}
        onClose={() => setIsAddEventOpen(false)}
        onEventAdded={() => {
          loadEventsForJob(job);
          const updated = getApplicationDetails(job);
          setDetails(updated);
        }}
      />
    </>
  );
};
