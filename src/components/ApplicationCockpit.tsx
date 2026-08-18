import React, { useState, useMemo } from 'react';
import {
  Briefcase,
  Search,
  Filter,
  ArrowUpDown,
  Building2,
  MapPin,
  Calendar,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Award,
  ChevronRight,
  TrendingUp,
  FileText,
  Tag,
  ArrowRight,
  Bell,
  Send,
  Moon,
  Zap,
  Check,
  User,
  X
} from 'lucide-react';
import { JobWithAnalysis, UserProfile, ApplicationStatus, WorkplaceType } from '../types';
import {
  STATUS_LABELS,
  STATUS_COLORS,
  getApplicationDetails,
  getDaysInCurrentStage,
  getDaysSinceApplied,
  getStoredDetails,
  getStoredStatuses,
  getStoredEvents,
  getStoredRestoredJobs,
  getJobStableId,
  getCandidateJobKeys,
  markFollowUpSent
} from '../services/applicationStatus';
import { calculateFollowUpState } from '../services/followUpIntelligence';
import { getStoredTailoredResumes } from '../services/resume';
import { ApplicationDetailsModal } from './ApplicationDetailsModal';

interface ApplicationCockpitProps {
  jobs: JobWithAnalysis[];
  profile: UserProfile;
  onViewResume: (job: JobWithAnalysis) => void;
  onReturnToSearch?: () => void;
}

type SortOption =
  | 'recent'
  | 'oldest'
  | 'score_desc'
  | 'ats_desc'
  | 'inactivity_desc'
  | 'days_in_stage_desc';

const KANBAN_COLUMNS: { status: ApplicationStatus; title: string; colorClass: string }[] = [
  { status: 'PREPARED', title: 'Preparadas', colorClass: 'border-t-indigo-500 bg-indigo-50/20' },
  { status: 'APPLIED', title: 'Candidatadas', colorClass: 'border-t-blue-500 bg-blue-50/20' },
  { status: 'INTERVIEW', title: 'Entrevistas', colorClass: 'border-t-amber-500 bg-amber-50/20' },
  { status: 'REJECTED', title: 'Rejeitadas', colorClass: 'border-t-rose-500 bg-rose-50/20' },
  { status: 'OFFER', title: 'Ofertas', colorClass: 'border-t-emerald-500 bg-emerald-50/20' },
];

export const ApplicationCockpit: React.FC<ApplicationCockpitProps> = ({
  jobs,
  profile,
  onViewResume,
  onReturnToSearch,
}) => {
  const [selectedJob, setSelectedJob] = useState<JobWithAnalysis | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Filters & View Mode State
  const [viewMode, setViewMode] = useState<'KANBAN' | 'ACTION_CENTER'>('KANBAN');
  const [actionFilter, setActionFilter] = useState<'ALL' | 'OVERDUE' | 'TODAY' | 'FOLLOW_UP' | 'INTERVIEW' | 'SNOOZED'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchScope, setSearchScope] = useState<'ALL' | 'RECRUITER' | 'NOTES' | 'JOB'>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedSource, setSelectedSource] = useState<string>('ALL');
  const [minScore, setMinScore] = useState<number>(0);
  const [minAtsCoverage, setMinAtsCoverage] = useState<number>(0);
  const [selectedLang, setSelectedLang] = useState<string>('ALL');
  const [selectedWorkModel, setSelectedWorkModel] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<SortOption>('recent');

  // Trigger re-render when details update
  const forceRefresh = () => setRefreshTrigger((prev) => prev + 1);

  // Load all jobs that have an application status !== 'NEW'
  const appliedJobs = useMemo(() => {
    const statusMap = getStoredStatuses();
    const detailsMap = getStoredDetails();
    const restoredJobs = getStoredRestoredJobs();

    const candidateJobsMap = new Map<string, JobWithAnalysis>();

    // 1. Add props.jobs
    jobs.forEach((j) => {
      const stableKey = getJobStableId(j);
      candidateJobsMap.set(stableKey, j);
    });

    // 2. Add restored jobs from localStorage
    restoredJobs.forEach((j) => {
      const stableKey = getJobStableId(j);
      if (!candidateJobsMap.has(stableKey)) {
        candidateJobsMap.set(stableKey, j);
      }
    });

    // 3. Inspect stored details & statuses to find any application with status !== 'NEW' not yet in candidateJobsMap
    Object.keys(statusMap).forEach((key) => {
      const status = statusMap[key];
      if (status && status !== 'NEW') {
        const details = detailsMap[key];
        let matched = false;

        for (const existingJob of candidateJobsMap.values()) {
          const keys = getCandidateJobKeys(existingJob);
          if (keys.includes(key)) {
            matched = true;
            break;
          }
        }

        if (!matched) {
          const fallbackJob: JobWithAnalysis = {
            id: details?.jobId || key,
            title: details?.notes?.split('\n')[0] || details?.next_step || 'Candidatura Unresolved',
            company: details?.company_contact_name || 'Empresa Registrada',
            location: 'Não informada',
            workplaceType: (details?.work_model as WorkplaceType) || 'Remoto',
            seniority: 'Pleno',
            description: details?.notes || '',
            requirements: [],
            url: details?.application_url || key,
            publishedAt: details?.created_at || new Date().toISOString(),
            source: details?.application_channel || 'restored',
            isUnresolved: true,
            unresolvedReason: 'Candidatura preservada no Cockpit sem vaga base associada.',
            analysis: {
              score: details?.match_score_at_application || details?.ats_coverage_at_application || 0,
              classification: 'Média',
              breakdown: { total: 0, titleScore: 0, skillsScore: 0, experienceScore: 0, toolsScore: 0, seniorityScore: 0, languageScore: 0, educationScore: 0, locationScore: 0, keywordsScore: 0 },
              matchedSkills: [],
              relatedSkills: [],
              missingSkills: [],
              atsKeywords: [],
              matchReasons: ['Candidatura preservada no Cockpit'],
              strengths: [],
              gaps: [],
              relevantExperienceSummary: [],
            },
          };
          candidateJobsMap.set(key, fallbackJob);
        }
      }
    });

    const allCandidateJobs = Array.from(candidateJobsMap.values());

    return allCandidateJobs.filter((job) => {
      const details = getApplicationDetails(job);
      return details.status !== 'NEW';
    });
  }, [jobs, refreshTrigger]);

  // Compute Follow-Up Results for all applied jobs
  const followUpItems = useMemo(() => {
    const allEvents = getStoredEvents();
    return appliedJobs.map((job) => {
      const details = getApplicationDetails(job);
      const jobEvents = allEvents.filter((e) => e.job_id === job.id || e.application_id === job.id);
      const fuResult = calculateFollowUpState(details, jobEvents, job);
      return { job, details, fuResult };
    });
  }, [appliedJobs, refreshTrigger]);

  // Summary Metrics for Follow-Up Intelligence
  const followUpMetrics = useMemo(() => {
    let needsAction = 0;
    let overdue = 0;
    let today = 0;
    let interviewSoon = 0;
    let readyToApply = 0;
    let snoozed = 0;

    followUpItems.forEach(({ fuResult }) => {
      if (fuResult.isSnoozed) {
        snoozed++;
      }
      if (fuResult.state === 'NEXT_STEP_TODAY') today++;
      if (fuResult.state === 'NEXT_STEP_OVERDUE' || fuResult.state === 'FOLLOW_UP_OVERDUE') overdue++;
      if (fuResult.state === 'INTERVIEW_SOON') interviewSoon++;
      if (fuResult.state === 'READY_TO_APPLY') readyToApply++;

      if (
        !fuResult.isSnoozed &&
        fuResult.state !== 'WAIT' &&
        fuResult.state !== 'NO_ACTION_NEEDED' &&
        fuResult.state !== 'CLOSED' &&
        fuResult.state !== 'PROCESS_ACTIVE'
      ) {
        needsAction++;
      }
    });

    return { needsAction, overdue, today, interviewSoon, readyToApply, snoozed };
  }, [followUpItems]);

  // Unique sources
  const sources = useMemo(() => {
    const set = new Set<string>();
    appliedJobs.forEach((j) => {
      if (j.source) set.add(j.source);
    });
    return Array.from(set);
  }, [appliedJobs]);

  // Filtered & Sorted Jobs
  const filteredJobs = useMemo(() => {
    const storedResumes = getStoredTailoredResumes();

    return appliedJobs
      .filter((job) => {
        const details = getApplicationDetails(job);
        const status = details.status;

        if (selectedStatus !== 'ALL' && status !== selectedStatus) return false;
        if (selectedSource !== 'ALL' && job.source !== selectedSource) return false;
        if (minScore > 0 && (job.analysis?.score ?? 0) < minScore) return false;

        const tailoredResume = storedResumes[job.url];
        const atsScore = tailoredResume?.atsCoverageScore ?? job.analysis?.score ?? 0;
        if (minAtsCoverage > 0 && atsScore < minAtsCoverage) return false;

        if (selectedLang !== 'ALL') {
          const lang = tailoredResume?.resumeLanguage || 'pt-BR';
          if (lang.toLowerCase() !== selectedLang.toLowerCase()) return false;
        }

        if (selectedWorkModel !== 'ALL' && job.workplaceType !== selectedWorkModel) return false;

        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase().trim();
          const matchesTitle = (job.title || '').toLowerCase().includes(q);
          const matchesCompany = (job.company || '').toLowerCase().includes(q);
          const matchesLocation = (job.location || '').toLowerCase().includes(q);
          const matchesRecruiter =
            (details.recruiter_name || '').toLowerCase().includes(q) ||
            (details.recruiter_linkedin || '').toLowerCase().includes(q) ||
            (details.company_contact_name || '').toLowerCase().includes(q) ||
            (details.company_contact_email || '').toLowerCase().includes(q);
          const matchesNotes =
            (details.notes || '').toLowerCase().includes(q) ||
            (details.next_step || '').toLowerCase().includes(q) ||
            (details.application_channel || '').toLowerCase().includes(q) ||
            (details.salary_expectation || '').toLowerCase().includes(q) ||
            (details.salary_offered || '').toLowerCase().includes(q);

          if (searchScope === 'RECRUITER') {
            if (!matchesRecruiter) return false;
          } else if (searchScope === 'NOTES') {
            if (!matchesNotes) return false;
          } else if (searchScope === 'JOB') {
            if (!matchesTitle && !matchesCompany && !matchesLocation) return false;
          } else {
            // 'ALL' - Matches ANY of title, company, location, recruiter, contact, notes
            if (!matchesTitle && !matchesCompany && !matchesLocation && !matchesRecruiter && !matchesNotes) {
              return false;
            }
          }
        }

        return true;
      })
      .sort((a, b) => {
        const detA = getApplicationDetails(a);
        const detB = getApplicationDetails(b);

        if (sortBy === 'score_desc') {
          return (b.analysis?.score ?? 0) - (a.analysis?.score ?? 0);
        }
        if (sortBy === 'ats_desc') {
          const storedResumes = getStoredTailoredResumes();
          const atsA = storedResumes[a.url]?.atsCoverageScore ?? a.analysis?.score ?? 0;
          const atsB = storedResumes[b.url]?.atsCoverageScore ?? b.analysis?.score ?? 0;
          return atsB - atsA;
        }
        if (sortBy === 'inactivity_desc') {
          const timeA = new Date(detA.last_activity_at || detA.created_at || 0).getTime();
          const timeB = new Date(detB.last_activity_at || detB.created_at || 0).getTime();
          return timeA - timeB; // Oldest activity first (most inactive)
        }
        if (sortBy === 'days_in_stage_desc') {
          return getDaysInCurrentStage(detB) - getDaysInCurrentStage(detA);
        }
        if (sortBy === 'oldest') {
          const timeA = new Date(detA.created_at || 0).getTime();
          const timeB = new Date(detB.created_at || 0).getTime();
          return timeA - timeB;
        }
        // Default: recent
        const timeA = new Date(detA.last_activity_at || detA.created_at || 0).getTime();
        const timeB = new Date(detB.last_activity_at || detB.created_at || 0).getTime();
        return timeB - timeA;
      });
  }, [appliedJobs, selectedStatus, selectedSource, minScore, minAtsCoverage, selectedLang, selectedWorkModel, searchTerm, searchScope, sortBy, refreshTrigger]);

  // Metrics Calculation
  const metrics = useMemo(() => {
    let prepared = 0;
    let applied = 0;
    let interview = 0;
    let offer = 0;
    let rejected = 0;

    appliedJobs.forEach((job) => {
      const details = getApplicationDetails(job);
      switch (details.status) {
        case 'PREPARED':
          prepared++;
          break;
        case 'APPLIED':
          applied++;
          break;
        case 'INTERVIEW':
          interview++;
          break;
        case 'OFFER':
          offer++;
          break;
        case 'REJECTED':
          rejected++;
          break;
      }
    });

    const activeTotal = prepared + applied + interview;
    const appToInterviewRate = applied > 0 ? Math.round((interview / applied) * 100) : 0;
    const interviewToOfferRate = interview > 0 ? Math.round((offer / interview) * 100) : 0;

    return {
      prepared,
      applied,
      interview,
      offer,
      rejected,
      activeTotal,
      appToInterviewRate,
      interviewToOfferRate,
    };
  }, [appliedJobs, refreshTrigger]);

  // Action Center Filtered List
  const actionCenterList = useMemo(() => {
    return followUpItems
      .filter(({ job, details, fuResult }) => {
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase().trim();
          const matchesTitle = (job.title || '').toLowerCase().includes(q);
          const matchesCompany = (job.company || '').toLowerCase().includes(q);
          const matchesLocation = (job.location || '').toLowerCase().includes(q);
          const matchesRecruiter =
            (details.recruiter_name || '').toLowerCase().includes(q) ||
            (details.recruiter_linkedin || '').toLowerCase().includes(q) ||
            (details.company_contact_name || '').toLowerCase().includes(q) ||
            (details.company_contact_email || '').toLowerCase().includes(q);
          const matchesNotes =
            (details.notes || '').toLowerCase().includes(q) ||
            (details.next_step || '').toLowerCase().includes(q) ||
            (details.application_channel || '').toLowerCase().includes(q) ||
            (details.salary_expectation || '').toLowerCase().includes(q) ||
            (details.salary_offered || '').toLowerCase().includes(q);

          if (searchScope === 'RECRUITER') {
            if (!matchesRecruiter) return false;
          } else if (searchScope === 'NOTES') {
            if (!matchesNotes) return false;
          } else if (searchScope === 'JOB') {
            if (!matchesTitle && !matchesCompany && !matchesLocation) return false;
          } else {
            if (!matchesTitle && !matchesCompany && !matchesLocation && !matchesRecruiter && !matchesNotes) {
              return false;
            }
          }
        }

        if (actionFilter === 'SNOOZED') return fuResult.isSnoozed;
        if (fuResult.isSnoozed) return false;

        if (actionFilter === 'OVERDUE') {
          return fuResult.state === 'NEXT_STEP_OVERDUE' || fuResult.state === 'FOLLOW_UP_OVERDUE';
        }
        if (actionFilter === 'TODAY') {
          return fuResult.state === 'NEXT_STEP_TODAY';
        }
        if (actionFilter === 'FOLLOW_UP') {
          return fuResult.state === 'FOLLOW_UP_RECOMMENDED' || fuResult.state === 'FOLLOW_UP_SOON';
        }
        if (actionFilter === 'INTERVIEW') {
          return fuResult.state === 'INTERVIEW_SOON';
        }

        // Default 'ALL': Needs action
        return (
          fuResult.state !== 'WAIT' &&
          fuResult.state !== 'NO_ACTION_NEEDED' &&
          fuResult.state !== 'CLOSED' &&
          fuResult.state !== 'PROCESS_ACTIVE'
        );
      })
      .sort((a, b) => b.fuResult.urgencyScore - a.fuResult.urgencyScore);
  }, [followUpItems, actionFilter, searchTerm, searchScope]);

  const openJobDetails = (job: JobWithAnalysis) => {
    setSelectedJob(job);
    setIsDetailsOpen(true);
  };

  const handleMarkSentFromCard = (e: React.MouseEvent, job: JobWithAnalysis) => {
    e.stopPropagation();
    markFollowUpSent(job, 'Follow-up marcado via Action Center');
    forceRefresh();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header & Title Banner */}
      <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold border border-indigo-500/30">
              FASE 3.3 — FOLLOW-UP INTELLIGENCE
            </span>
            <span className="text-slate-400 text-xs">•</span>
            <span className="text-slate-300 text-xs font-medium">Gestão Operacional de Vagas</span>
          </div>
          <h1 className="text-xl font-extrabold text-slate-100 tracking-tight">
            Painel de Candidaturas e Follow-up Intelligence
          </h1>
          <p className="text-xs text-slate-400 max-w-xl">
            Acompanhe o ciclo de vida completo das candidaturas, acompanhamentos prioritários e recomendações determinísticas de ação diária.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {onReturnToSearch && (
            <button
              onClick={onReturnToSearch}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Voltar para Vagas</span>
            </button>
          )}

          <div className="flex items-center gap-3 bg-slate-800/80 px-4 py-2.5 rounded-xl border border-slate-700/80">
            <div className="text-right">
              <div className="text-[10px] uppercase font-bold text-slate-400">Ações Pendentes</div>
              <div className="text-xl font-black text-amber-400">{followUpMetrics.needsAction}</div>
            </div>
            <Bell className="w-8 h-8 text-amber-400/80 p-1 bg-amber-500/10 rounded-lg border border-amber-500/20" />
          </div>
        </div>
      </div>

      {/* DAILY SUMMARY / TODAY BANNER (Phase 3.3) */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-4 rounded-xl border border-indigo-900/60 shadow-lg grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div
          onClick={() => { setViewMode('ACTION_CENTER'); setActionFilter('ALL'); }}
          className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/60 hover:border-amber-500/50 transition cursor-pointer space-y-1"
        >
          <div className="flex items-center justify-between text-xs text-amber-300 font-bold">
            <span className="flex items-center gap-1"><Zap className="w-3.5 h-3.5" /> Exige Atenção Hoje</span>
            <span className="px-2 py-0.5 rounded bg-amber-500/20 font-extrabold text-amber-300 text-xs">
              {followUpMetrics.needsAction}
            </span>
          </div>
          <p className="text-[11px] text-slate-300">Candidaturas precisando de acompanhamento ou ação</p>
        </div>

        <div
          onClick={() => { setViewMode('ACTION_CENTER'); setActionFilter('TODAY'); }}
          className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/60 hover:border-emerald-500/50 transition cursor-pointer space-y-1"
        >
          <div className="flex items-center justify-between text-xs text-emerald-300 font-bold">
            <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Próximo Passo Hoje</span>
            <span className="px-2 py-0.5 rounded bg-emerald-500/20 font-extrabold text-emerald-300 text-xs">
              {followUpMetrics.today}
            </span>
          </div>
          <p className="text-[11px] text-slate-300">Entrevistas e testes agendados para hoje</p>
        </div>

        <div
          onClick={() => { setViewMode('ACTION_CENTER'); setActionFilter('OVERDUE'); }}
          className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/60 hover:border-rose-500/50 transition cursor-pointer space-y-1"
        >
          <div className="flex items-center justify-between text-xs text-rose-300 font-bold">
            <span className="flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> Vencidos</span>
            <span className="px-2 py-0.5 rounded bg-rose-500/20 font-extrabold text-rose-300 text-xs">
              {followUpMetrics.overdue}
            </span>
          </div>
          <p className="text-[11px] text-slate-300">Follow-ups ou prazos atrasados sem resposta</p>
        </div>

        <div
          onClick={() => { setViewMode('ACTION_CENTER'); setActionFilter('SNOOZED'); }}
          className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/60 hover:border-purple-500/50 transition cursor-pointer space-y-1"
        >
          <div className="flex items-center justify-between text-xs text-purple-300 font-bold">
            <span className="flex items-center gap-1"><Moon className="w-3.5 h-3.5" /> Adiados (Snoozed)</span>
            <span className="px-2 py-0.5 rounded bg-purple-500/20 font-extrabold text-purple-300 text-xs">
              {followUpMetrics.snoozed}
            </span>
          </div>
          <p className="text-[11px] text-slate-300">Candidaturas em pausa de acompanhamento</p>
        </div>
      </div>

      {/* VIEW MODE SWITCHER TABS */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setViewMode('KANBAN')}
          className={`px-4 py-2 font-bold text-xs rounded-xl transition flex items-center gap-2 cursor-pointer ${
            viewMode === 'KANBAN'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Briefcase className="w-3.5 h-3.5" />
          <span>PIPELINE KANBAN</span>
          <span className="px-1.5 py-0.5 rounded bg-slate-700 text-slate-200 text-[10px]">
            {appliedJobs.length}
          </span>
        </button>

        <button
          onClick={() => setViewMode('ACTION_CENTER')}
          className={`px-4 py-2 font-bold text-xs rounded-xl transition flex items-center gap-2 cursor-pointer ${
            viewMode === 'ACTION_CENTER'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Zap className="w-3.5 h-3.5 text-amber-300" />
          <span>CENTRAL DE AÇÕES (ACTION CENTER)</span>
          {followUpMetrics.needsAction > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-[10px]">
              {followUpMetrics.needsAction}
            </span>
          )}
        </button>
      </div>

      {/* RENDER ACTION CENTER VIEW */}
      {viewMode === 'ACTION_CENTER' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {/* Action Center Sub-filters */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-2 text-xs">
            <span className="font-bold text-slate-600 flex items-center gap-1 mr-2">
              <Filter className="w-3.5 h-3.5" /> Filtrar por:
            </span>

            {[
              { id: 'ALL', label: 'Todas as Ações', count: followUpMetrics.needsAction },
              { id: 'OVERDUE', label: 'Vencidos', count: followUpMetrics.overdue },
              { id: 'TODAY', label: 'Hoje', count: followUpMetrics.today },
              { id: 'FOLLOW_UP', label: 'Follow-ups Recomendados', count: followUpMetrics.needsAction },
              { id: 'INTERVIEW', label: 'Entrevistas Próximas', count: followUpMetrics.interviewSoon },
              { id: 'SNOOZED', label: 'Snoozed', count: followUpMetrics.snoozed },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActionFilter(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  actionFilter === tab.id
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>{tab.label}</span>
                <span className="text-[10px] opacity-80">({tab.count})</span>
              </button>
            ))}
          </div>

          {/* Action Cards List */}
          {actionCenterList.length === 0 ? (
            <div className="bg-white p-8 rounded-xl border border-slate-200 text-center space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
              <h3 className="font-bold text-slate-800 text-sm">Nenhuma ação pendente neste filtro</h3>
              <p className="text-xs text-slate-500">Todas as suas candidaturas estão em dia no momento!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {actionCenterList.map(({ job, details, fuResult }) => (
                <div
                  key={job.id}
                  onClick={() => openJobDetails(job)}
                  className="bg-white p-4 rounded-xl border border-slate-200 hover:border-indigo-400 shadow-sm hover:shadow-md transition cursor-pointer space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold uppercase">{job.company}</span>
                      <h3 className="font-extrabold text-slate-900 text-sm line-clamp-1">{job.title}</h3>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                        fuResult.state.includes('OVERDUE')
                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                          : fuResult.state.includes('TODAY')
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}>
                        {fuResult.state.replace(/_/g, ' ')}
                      </span>
                      <span className="px-2 py-0.5 bg-slate-900 text-amber-300 font-extrabold text-[10px] rounded">
                        Urgency: {fuResult.urgencyScore}
                      </span>
                    </div>
                  </div>

                  {/* Recommendation Box */}
                  <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-100 text-xs space-y-1">
                    <span className="font-bold text-indigo-900 block">{fuResult.recommendedAction}</span>
                    <p className="text-indigo-700 text-[11px]">{fuResult.reason}</p>
                  </div>

                  {/* Action Footer */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">
                      Última atividade: {fuResult.daysSinceLastActivity !== undefined ? `há ${fuResult.daysSinceLastActivity}d` : 'sem dados'}
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => handleMarkSentFromCard(e, job)}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded-md transition flex items-center gap-1 shadow-sm cursor-pointer"
                      >
                        <Send className="w-3 h-3" />
                        <span>MARCAR ENVIADO</span>
                      </button>

                      <span className="text-indigo-600 font-bold text-[11px] hover:underline">
                        Detalhes &rarr;
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">PREPARADAS</div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-indigo-600">{metrics.prepared}</span>
            <span className="text-[10px] text-slate-400 font-medium">Prontas p/ envio</span>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">CANDIDATADAS</div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-blue-600">{metrics.applied}</span>
            <span className="text-[10px] text-slate-400 font-medium">Enviadas</span>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">ENTREVISTAS</div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-amber-600">{metrics.interview}</span>
            <span className="text-[10px] text-amber-600/80 font-bold">Em andamento</span>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">OFERTAS</div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-emerald-600">{metrics.offer}</span>
            <span className="text-[10px] text-emerald-600/80 font-bold">Aprovado</span>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">REJEITADAS</div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-rose-600">{metrics.rejected}</span>
            <span className="text-[10px] text-slate-400 font-medium">Encerradas</span>
          </div>
        </div>

        {/* Funnel Metrics Summary */}
        <div className="bg-slate-900 text-white p-3.5 rounded-xl border border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider">CONVERSÃO DO FUNIL</div>
          <div className="space-y-0.5 mt-1 text-[11px]">
            <div className="flex justify-between items-center text-slate-300">
              <span>App → Interview:</span>
              <strong className="text-emerald-400">{metrics.appToInterviewRate}%</strong>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span>Interview → Offer:</span>
              <strong className="text-indigo-400">{metrics.interviewToOfferRate}%</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Search Input with Scope & Clear */}
          <div className="flex-1 min-w-[280px] space-y-1.5">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={
                  searchScope === 'RECRUITER'
                    ? 'Buscar por nome do recrutador, email ou contato...'
                    : searchScope === 'NOTES'
                    ? 'Buscar nas notas, anotações e próximos passos...'
                    : searchScope === 'JOB'
                    ? 'Buscar por cargo, empresa ou cidade...'
                    : 'Buscar por cargo, empresa, recrutador, contato ou notas...'
                }
                className="w-full pl-9 pr-8 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
                  title="Limpar busca"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Search Scope Buttons */}
            <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-600 flex-wrap">
              <span className="text-slate-400">Buscar em:</span>
              {[
                { id: 'ALL', label: 'Todos os Campos' },
                { id: 'RECRUITER', label: '👤 Recrutador / Contato' },
                { id: 'NOTES', label: '📝 Anotações & Notas' },
                { id: 'JOB', label: '💼 Cargo & Empresa' },
              ].map((scope) => (
                <button
                  key={scope.id}
                  onClick={() => setSearchScope(scope.id as any)}
                  className={`px-2 py-0.5 rounded-md transition cursor-pointer ${
                    searchScope === scope.id
                      ? 'bg-indigo-600 text-white shadow-2xs font-bold'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {scope.label}
                </button>
              ))}
              {searchTerm && (
                <span className="ml-auto text-indigo-600 font-bold">
                  {filteredJobs.length} {filteredJobs.length === 1 ? 'resultado' : 'resultados'}
                </span>
              )}
            </div>
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-2 self-start pt-0.5">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-xs font-semibold text-slate-600">Ordenar por:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-medium text-slate-800 bg-white focus:ring-1 focus:ring-indigo-500 outline-none"
            >
              <option value="recent">Mais recente</option>
              <option value="oldest">Mais antiga</option>
              <option value="score_desc">Maior Score</option>
              <option value="ats_desc">Maior ATS Coverage</option>
              <option value="inactivity_desc">Mais dias sem atividade</option>
              <option value="days_in_stage_desc">Mais dias no estágio</option>
            </select>
          </div>
        </div>

        {/* Detailed Filters Bar */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-1 font-semibold text-slate-500 mr-1">
            <Filter className="w-3.5 h-3.5" />
            <span>Filtros:</span>
          </div>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-2 py-1 border border-slate-200 rounded-md text-xs bg-slate-50 text-slate-700 outline-none"
          >
            <option value="ALL">Todos os Status</option>
            <option value="PREPARED">Preparada</option>
            <option value="APPLIED">Candidatado</option>
            <option value="INTERVIEW">Entrevista</option>
            <option value="REJECTED">Rejeitada</option>
            <option value="OFFER">Oferta</option>
          </select>

          {/* Source Filter */}
          {sources.length > 0 && (
            <select
              value={selectedSource}
              onChange={(e) => setSelectedSource(e.target.value)}
              className="px-2 py-1 border border-slate-200 rounded-md text-xs bg-slate-50 text-slate-700 outline-none"
            >
              <option value="ALL">Todas as Fontes</option>
              {sources.map((s) => (
                <option key={s} value={s}>{s.toUpperCase()}</option>
              ))}
            </select>
          )}

          {/* Work Model */}
          <select
            value={selectedWorkModel}
            onChange={(e) => setSelectedWorkModel(e.target.value)}
            className="px-2 py-1 border border-slate-200 rounded-md text-xs bg-slate-50 text-slate-700 outline-none"
          >
            <option value="ALL">Todos os Modelos</option>
            <option value="Remoto">Remoto</option>
            <option value="Híbrido">Híbrido</option>
            <option value="Presencial">Presencial</option>
          </select>

          {/* Language Filter */}
          <select
            value={selectedLang}
            onChange={(e) => setSelectedLang(e.target.value)}
            className="px-2 py-1 border border-slate-200 rounded-md text-xs bg-slate-50 text-slate-700 outline-none"
          >
            <option value="ALL">Todos os Idiomas</option>
            <option value="PT-BR">Português (PT-BR)</option>
            <option value="EN">Inglês (EN)</option>
          </select>

          {/* Clear Filters Button */}
          {(selectedStatus !== 'ALL' || selectedSource !== 'ALL' || selectedWorkModel !== 'ALL' || selectedLang !== 'ALL' || searchTerm.trim() || searchScope !== 'ALL') && (
            <button
              onClick={() => {
                setSelectedStatus('ALL');
                setSelectedSource('ALL');
                setSelectedWorkModel('ALL');
                setSelectedLang('ALL');
                setSearchTerm('');
                setSearchScope('ALL');
              }}
              className="text-indigo-600 hover:text-indigo-800 font-medium text-[11px] ml-auto underline cursor-pointer"
            >
              Limpar Filtros
            </button>
          )}
        </div>
      </div>

      {/* Kanban Pipeline Board */}
      <div className="overflow-x-auto pb-4">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 min-w-[1000px]">
          {KANBAN_COLUMNS.map((col) => {
            const columnJobs = filteredJobs.filter((job) => {
              const details = getApplicationDetails(job);
              return details.status === col.status;
            });

            return (
              <div
                key={col.status}
                className={`bg-slate-100/70 p-3 rounded-xl border-t-4 ${col.colorClass} border-x border-b border-slate-200/80 flex flex-col max-h-[75vh]`}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-200/80 shrink-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-800 text-xs tracking-tight">{col.title}</h3>
                    <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-bold text-[10px]">
                      {columnJobs.length}
                    </span>
                  </div>
                </div>

                {/* Column Cards Container */}
                <div className="space-y-3 overflow-y-auto pr-1 flex-1">
                  {columnJobs.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-xs border border-dashed border-slate-200 rounded-lg">
                      Nenhuma vaga
                    </div>
                  ) : (
                    columnJobs.map((job) => {
                      const details = getApplicationDetails(job);
                      const daysInStage = getDaysInCurrentStage(details);
                      const daysSinceApplied = getDaysSinceApplied(details);

                      const storedResumes = getStoredTailoredResumes();
                      const tailoredResume = storedResumes[job.url] || null;
                      const resumeLang = tailoredResume?.resumeLanguage?.toUpperCase() || 'PT-BR';

                      const item = followUpItems.find((fi) => fi.job.id === job.id);
                      const fuState = item?.fuResult.state || 'WAIT';
                      const isSnoozed = item?.fuResult.isSnoozed;

                      return (
                        <div
                          key={job.id}
                          onClick={() => openJobDetails(job)}
                          className="bg-white p-3 rounded-xl border border-slate-200 hover:border-indigo-400 shadow-sm hover:shadow-md transition-all cursor-pointer space-y-2 group"
                        >
                          {/* Card Top: Title, Company & Follow-up Badge */}
                          <div>
                            <div className="flex items-center justify-between text-[10px] text-slate-500 font-semibold mb-0.5">
                              <span className="truncate max-w-[120px]">{job.company}</span>
                              <span className={`px-1.5 py-0.5 rounded font-extrabold text-[9px] uppercase border ${
                                isSnoozed
                                  ? 'bg-purple-100 text-purple-800 border-purple-200'
                                  : fuState.includes('OVERDUE')
                                  ? 'bg-rose-100 text-rose-800 border-rose-200'
                                  : fuState.includes('TODAY')
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                  : fuState.includes('FOLLOW_UP')
                                  ? 'bg-amber-100 text-amber-800 border-amber-200'
                                  : fuState.includes('INTERVIEW')
                                  ? 'bg-purple-100 text-purple-800 border-purple-200'
                                  : 'bg-slate-100 text-slate-700 border-slate-200'
                              }`}>
                                {isSnoozed ? 'SNOOZED' : fuState.replace(/_/g, ' ')}
                              </span>
                            </div>
                            <h4 className="font-bold text-slate-900 text-xs leading-snug group-hover:text-indigo-600 transition-colors line-clamp-2">
                              {job.title}
                            </h4>
                          </div>

                          {/* Metrics Badges */}
                          <div className="flex items-center gap-2 text-[10px] font-bold">
                            <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Score: {job.analysis?.score ?? 0}%
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                              ATS: {tailoredResume?.atsCoverageScore ?? job.analysis?.score ?? 0}%
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                              {resumeLang}
                            </span>
                          </div>

                          {/* Next Step Badge if available */}
                          {details.next_step && (
                            <div className="bg-amber-50 border border-amber-200 text-amber-900 p-1.5 rounded-lg text-[10px]">
                              <span className="font-bold block truncate">Próximo passo: {details.next_step}</span>
                              {details.next_step_date && (
                                <span className="text-amber-700 text-[9px] block">
                                  Data: {new Date(details.next_step_date).toLocaleDateString('pt-BR')}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Recruiter / Contact Badge if available */}
                          {(details.recruiter_name || details.company_contact_name) && (
                            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-indigo-50/70 border border-indigo-100 text-[10px] text-indigo-900 truncate">
                              <User className="w-3 h-3 text-indigo-600 shrink-0" />
                              <span className="truncate">
                                <strong>Contato:</strong> {details.recruiter_name || details.company_contact_name}
                              </span>
                            </div>
                          )}

                          {/* Notes Preview if available */}
                          {details.notes && (
                            <div className="flex items-start gap-1.5 px-2 py-1 rounded-md bg-slate-50 border border-slate-200 text-[10px] text-slate-700">
                              <FileText className="w-3 h-3 text-slate-500 shrink-0 mt-0.5" />
                              <p className="line-clamp-2 italic text-[9.5px] leading-tight text-slate-600">
                                {details.notes}
                              </p>
                            </div>
                          )}

                          {/* Card Bottom Metadata */}
                          <div className="pt-1 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                            <span className="flex items-center gap-1 font-medium">
                              <Clock className="w-3 h-3 text-slate-400" />
                              <span>{daysInStage}d neste estágio</span>
                            </span>
                            <div className="flex items-center gap-1.5">
                              {details.application_channel && (
                                <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-semibold text-[9px] truncate max-w-[80px]">
                                  {details.application_channel}
                                </span>
                              )}
                              {job.source && (
                                <span className="uppercase text-[9px] font-bold text-slate-400">
                                  {job.source}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Application Details Modal */}
      {selectedJob && (
        <ApplicationDetailsModal
          job={selectedJob}
          profile={profile}
          isOpen={isDetailsOpen}
          onClose={() => {
            setIsDetailsOpen(false);
            setSelectedJob(null);
          }}
          onViewResume={(j) => {
            setIsDetailsOpen(false);
            onViewResume(j);
          }}
          onStatusChange={forceRefresh}
        />
      )}
    </div>
  );
};
