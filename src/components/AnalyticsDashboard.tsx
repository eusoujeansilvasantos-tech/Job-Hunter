import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  Clock,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Award,
  Layers,
  Calendar,
  Building2,
  Target,
  Sparkles,
  ChevronDown,
  ChevronUp,
  X,
  ExternalLink,
  Briefcase,
  Search,
  Zap,
  Globe,
  FileCheck
} from 'lucide-react';
import { JobWithAnalysis, ApplicationDetails, ApplicationEvent } from '../types';
import {
  calculateJobSearchAnalytics,
  DateRangeOption,
  AnalyticsResult,
  SourcePerformanceItem,
  RolePerformanceItem,
  BucketPerformanceItem
} from '../services/jobSearchAnalytics';
import { getStoredStatuses, getStoredDetails, getStoredEvents } from '../services/applicationStatus';
import { getStoredTailoredResumes } from '../services/resume';

interface AnalyticsDashboardProps {
  jobs: JobWithAnalysis[];
  onOpenJobDetails?: (job: JobWithAnalysis) => void;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ jobs, onOpenJobDetails }) => {
  // Filters State
  const [dateRange, setDateRange] = useState<DateRangeOption>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [roleFamilyFilter, setRoleFamilyFilter] = useState<string>('all');
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [languageFilter, setLanguageFilter] = useState<string>('all');
  const [workModelFilter, setWorkModelFilter] = useState<string>('all');

  // Drill-down Modal State
  const [drillDownTitle, setDrillDownTitle] = useState<string | null>(null);
  const [drillDownJobs, setDrillDownJobs] = useState<JobWithAnalysis[]>([]);

  // Load persisted state (localStorage or restored Supabase)
  const applications = useMemo(() => getStoredDetails(), []);
  const events = useMemo(() => getStoredEvents(), []);
  const tailoredResumes = useMemo(() => getStoredTailoredResumes(), []);

  // Compute Analytics Result
  const analytics: AnalyticsResult = useMemo(() => {
    return calculateJobSearchAnalytics({
      jobs,
      applications,
      events,
      tailoredResumes,
      filters: {
        dateRange,
        sourceFilter,
        roleFamilyFilter,
        channelFilter,
        languageFilter,
        workModelFilter,
      },
    });
  }, [jobs, applications, events, tailoredResumes, dateRange, sourceFilter, roleFamilyFilter, channelFilter, languageFilter, workModelFilter]);

  // Extract unique filter dropdown values
  const availableSources = useMemo(() => {
    const set = new Set<string>();
    jobs.forEach((j) => set.add(j.discovery_source || j.source || 'Direct / Board'));
    return Array.from(set);
  }, [jobs]);

  const availableRoleFamilies = useMemo(() => {
    const set = new Set<string>();
    jobs.forEach((j) => {
      if (j.roleFamily) set.add(j.roleFamily);
    });
    return Array.from(set);
  }, [jobs]);

  // Handle Drill Down Open
  const handleOpenDrillDown = (title: string, filterFn: (job: JobWithAnalysis, details: ApplicationDetails | null) => boolean) => {
    const matched: JobWithAnalysis[] = [];
    for (const j of jobs) {
      const details = applications[j.id] || applications[j.url] || null;
      if (filterFn(j, details)) {
        matched.push(j);
      }
    }
    setDrillDownTitle(title);
    setDrillDownJobs(matched);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30">
              FASE 3.4 — ANALYTICS ENGINE
            </span>
            <span className="text-slate-400 text-xs">•</span>
            <span className="text-slate-300 text-xs font-medium">Conversion Intelligence & Strategy</span>
          </div>
          <h1 className="text-xl font-extrabold text-slate-100 tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-emerald-400" />
            Job Search Analytics & Métricas de Conversão
          </h1>
          <p className="text-xs text-slate-400 max-w-2xl">
            Análise determinística e descritiva do histórico de candidaturas. Descubra quais fontes, cargos e perfis de Match Score geram entrevistas e ofertas reais.
          </p>
        </div>

        {/* Date Range Selector */}
        <div className="flex items-center gap-2 bg-slate-800/90 p-1.5 rounded-xl border border-slate-700/80 shrink-0">
          <Calendar className="w-4 h-4 text-slate-400 ml-2" />
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as DateRangeOption)}
            className="bg-transparent text-slate-200 font-bold text-xs focus:outline-none cursor-pointer pr-2"
          >
            <option value="all" className="bg-slate-900">Todo o Período</option>
            <option value="7d" className="bg-slate-900">Últimos 7 dias</option>
            <option value="30d" className="bg-slate-900">Últimos 30 dias</option>
            <option value="90d" className="bg-slate-900">Últimos 90 dias</option>
            <option value="6m" className="bg-slate-900">Últimos 6 meses</option>
            <option value="12m" className="bg-slate-900">Últimos 12 meses</option>
          </select>
        </div>
      </div>

      {/* Warnings & Sample Size Alerts */}
      {analytics.warnings.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 p-3.5 rounded-xl text-amber-200 text-xs space-y-1">
          {analytics.warnings.map((w, i) => (
            <div key={i} className="flex items-center gap-2 font-semibold">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{w}</span>
            </div>
          ))}
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-bold text-slate-700 flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            Filtros Globais:
          </span>

          {/* Source Filter */}
          <div className="flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
            <span className="text-slate-500 font-medium">Fonte:</span>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="bg-transparent text-slate-800 font-bold focus:outline-none cursor-pointer"
            >
              <option value="all">Todas as Fontes</option>
              {availableSources.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Role Family Filter */}
          <div className="flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
            <span className="text-slate-500 font-medium">Família de Cargo:</span>
            <select
              value={roleFamilyFilter}
              onChange={(e) => setRoleFamilyFilter(e.target.value)}
              className="bg-transparent text-slate-800 font-bold focus:outline-none cursor-pointer"
            >
              <option value="all">Todas as Famílias</option>
              {availableRoleFamilies.map((rf) => (
                <option key={rf} value={rf}>{rf}</option>
              ))}
            </select>
          </div>

          {/* Channel Filter */}
          <div className="flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
            <span className="text-slate-500 font-medium">Canal:</span>
            <select
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value)}
              className="bg-transparent text-slate-800 font-bold focus:outline-none cursor-pointer"
            >
              <option value="all">Todos os Canais</option>
              <option value="LinkedIn">LinkedIn</option>
              <option value="Indeed">Indeed</option>
              <option value="Gupy">Gupy</option>
              <option value="Greenhouse">Greenhouse</option>
              <option value="Company Website">Site da Empresa</option>
              <option value="Referral">Indicação</option>
              <option value="Email">E-mail</option>
            </select>
          </div>

          {/* Work Model Filter */}
          <div className="flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
            <span className="text-slate-500 font-medium">Modelo:</span>
            <select
              value={workModelFilter}
              onChange={(e) => setWorkModelFilter(e.target.value)}
              className="bg-transparent text-slate-800 font-bold focus:outline-none cursor-pointer"
            >
              <option value="all">Todos os Modelos</option>
              <option value="remote">Remoto</option>
              <option value="hybrid">Híbrido</option>
              <option value="on-site">Presencial</option>
            </select>
          </div>
        </div>

        {(sourceFilter !== 'all' || roleFamilyFilter !== 'all' || channelFilter !== 'all' || workModelFilter !== 'all') && (
          <button
            onClick={() => {
              setSourceFilter('all');
              setRoleFamilyFilter('all');
              setChannelFilter('all');
              setWorkModelFilter('all');
            }}
            className="text-indigo-600 hover:text-indigo-800 font-bold text-xs flex items-center gap-1 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" /> Limpar Filtros
          </button>
        )}
      </div>

      {/* Top Metric Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <div className="text-[10px] uppercase font-bold text-slate-400">Total Candidaturas</div>
          <div className="text-2xl font-black text-slate-900">{analytics.overview.totalApplied}</div>
          <p className="text-[10px] text-slate-500">Enviadas no período</p>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <div className="text-[10px] uppercase font-bold text-amber-600">Entrevistas</div>
          <div className="text-2xl font-black text-amber-600">{analytics.overview.totalInterviews}</div>
          <p className="text-[10px] text-slate-500">Agendadas ou concluídas</p>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <div className="text-[10px] uppercase font-bold text-emerald-600">Ofertas</div>
          <div className="text-2xl font-black text-emerald-600">{analytics.overview.totalOffers}</div>
          <p className="text-[10px] text-slate-500">Propostas recebidas</p>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <div className="text-[10px] uppercase font-bold text-indigo-600">Taxa Entrevista</div>
          <div className="text-2xl font-black text-indigo-600">{analytics.conversion.appliedToInterviewRate}%</div>
          <p className="text-[10px] text-slate-500">Applied → Interview</p>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <div className="text-[10px] uppercase font-bold text-emerald-600">Taxa Oferta</div>
          <div className="text-2xl font-black text-emerald-600">{analytics.conversion.interviewToOfferRate}%</div>
          <p className="text-[10px] text-slate-500">Interview → Offer</p>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <div className="text-[10px] uppercase font-bold text-slate-500">Processos Ativos</div>
          <div className="text-2xl font-black text-blue-600">{analytics.overview.activeProcesses}</div>
          <p className="text-[10px] text-slate-500">Em andamento</p>
        </div>
      </div>

      {/* Strategy Signals (if any) */}
      {analytics.strategySignals.length > 0 && (
        <div className="bg-gradient-to-r from-indigo-900 to-slate-900 text-white p-4 rounded-xl shadow-md border border-indigo-800 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-300">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>SINAIS DE ESTRATÉGIA (STRATEGY SIGNALS)</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {analytics.strategySignals.map((sig, i) => (
              <div key={i} className="bg-slate-800/80 p-3 rounded-lg border border-slate-700/80 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span className="text-slate-200 leading-relaxed">{sig.signal}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Funnel & Timing Metrics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Funnel Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              Funil de Candidaturas (Job Search Funnel)
            </h3>
            <span className="text-xs text-slate-500 font-bold">Conversão por Etapa</span>
          </div>

          <div className="space-y-3">
            {analytics.funnel.map((stage) => (
              <div key={stage.name} className="space-y-1">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-800">{stage.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-900 font-black">{stage.count}</span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      ({stage.conversionFromPrevious}% conversão)
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden flex">
                  <div
                    style={{
                      width: `${
                        analytics.overview.totalPrepared > 0
                          ? Math.min(100, Math.max(5, (stage.count / analytics.overview.totalPrepared) * 100))
                          : 0
                      }%`,
                    }}
                    className={`h-full transition-all duration-300 ${
                      stage.name === 'Prepared'
                        ? 'bg-indigo-500'
                        : stage.name === 'Applied'
                        ? 'bg-blue-600'
                        : stage.name === 'Interview'
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Timing Metrics Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-600" />
              Métricas de Tempo e Resposta (Timing Metrics)
            </h3>
            <span className="text-xs text-slate-500 font-bold">Em Dias Úteis/Corridos</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            {/* Time to First Contact */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5">
              <div className="text-[10px] uppercase font-bold text-slate-500">Primeiro Contato</div>
              <div className="text-xl font-black text-slate-900">
                {analytics.timeMetrics.timeToFirstContact.sampleSize > 0
                  ? `${analytics.timeMetrics.timeToFirstContact.mean}d`
                  : 'N/A'}
              </div>
              <p className="text-[10px] text-slate-500">
                Mediana: {analytics.timeMetrics.timeToFirstContact.median}d | Mín: {analytics.timeMetrics.timeToFirstContact.min}d | Máx: {analytics.timeMetrics.timeToFirstContact.max}d
              </p>
              <div className="text-[9px] text-slate-400 font-semibold">
                {analytics.timeMetrics.timeToFirstContact.sampleSize} retornos gravados
              </div>
            </div>

            {/* Time to Interview */}
            <div className="bg-amber-50 p-3.5 rounded-xl border border-amber-200 space-y-1.5">
              <div className="text-[10px] uppercase font-bold text-amber-800">Até Entrevista</div>
              <div className="text-xl font-black text-amber-900">
                {analytics.timeMetrics.timeToInterview.sampleSize > 0
                  ? `${analytics.timeMetrics.timeToInterview.mean}d`
                  : 'N/A'}
              </div>
              <p className="text-[10px] text-amber-700">
                Mediana: {analytics.timeMetrics.timeToInterview.median}d | Mín: {analytics.timeMetrics.timeToInterview.min}d | Máx: {analytics.timeMetrics.timeToInterview.max}d
              </p>
              <div className="text-[9px] text-amber-800 font-semibold">
                {analytics.timeMetrics.timeToInterview.sampleSize} entrevistas
              </div>
            </div>

            {/* Time to Offer */}
            <div className="bg-emerald-50 p-3.5 rounded-xl border border-emerald-200 space-y-1.5">
              <div className="text-[10px] uppercase font-bold text-emerald-800">Até Oferta</div>
              <div className="text-xl font-black text-emerald-900">
                {analytics.timeMetrics.timeToOffer.sampleSize > 0
                  ? `${analytics.timeMetrics.timeToOffer.mean}d`
                  : 'N/A'}
              </div>
              <p className="text-[10px] text-emerald-700">
                Mediana: {analytics.timeMetrics.timeToOffer.median}d | Mín: {analytics.timeMetrics.timeToOffer.min}d | Máx: {analytics.timeMetrics.timeToOffer.max}d
              </p>
              <div className="text-[9px] text-emerald-800 font-semibold">
                {analytics.timeMetrics.timeToOffer.sampleSize} ofertas
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Source Performance & Conversion Score */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
              <Globe className="w-4 h-4 text-indigo-600" />
              Performance por Fonte (Source Conversion & Conversion Score)
            </h3>
            <p className="text-xs text-slate-500">
              Mede a conversão real das vagas aplicadas por cada fonte/board (independente do Source Yield de descoberta).
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                <th className="p-2.5">Fonte / Board</th>
                <th className="p-2.5">Categoria</th>
                <th className="p-2.5 text-center">Encontradas</th>
                <th className="p-2.5 text-center">Aplicadas</th>
                <th className="p-2.5 text-center">Entrevistas</th>
                <th className="p-2.5 text-center">Taxa Entrevista</th>
                <th className="p-2.5 text-center">Ofertas</th>
                <th className="p-2.5 text-center">Avg Match</th>
                <th className="p-2.5 text-center">Conversion Score</th>
                <th className="p-2.5 text-center">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
              {analytics.sourcePerformance.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-4 text-center text-slate-400">
                    Nenhuma fonte com dados para o período selecionado.
                  </td>
                </tr>
              ) : (
                analytics.sourcePerformance.map((src) => (
                  <tr key={src.source} className="hover:bg-slate-50 transition">
                    <td className="p-2.5 font-bold text-slate-900">{src.source}</td>
                    <td className="p-2.5">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase border ${
                        src.category === 'DISCOVERY'
                          ? 'bg-blue-50 text-blue-800 border-blue-200'
                          : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      }`}>
                        {src.category}
                      </span>
                    </td>
                    <td className="p-2.5 text-center text-slate-500">{src.jobsFound}</td>
                    <td className="p-2.5 text-center font-bold">{src.applied}</td>
                    <td className="p-2.5 text-center font-bold text-amber-600">{src.interviews}</td>
                    <td className="p-2.5 text-center font-extrabold text-indigo-600">
                      {src.appliedToInterviewRate}%
                    </td>
                    <td className="p-2.5 text-center font-bold text-emerald-600">{src.offers}</td>
                    <td className="p-2.5 text-center font-mono">{src.avgMatchScore}</td>
                    <td className="p-2.5 text-center">
                      <span className="px-2 py-0.5 bg-slate-900 text-amber-300 font-extrabold text-xs rounded">
                        {src.conversionScore}/100
                      </span>
                    </td>
                    <td className="p-2.5 text-center">
                      <button
                        onClick={() =>
                          handleOpenDrillDown(
                            `Vagas da Fonte: ${src.source}`,
                            (j) => (j.discovery_source || j.source || 'Direct / Board') === src.source
                          )
                        }
                        className="text-indigo-600 hover:text-indigo-800 font-bold hover:underline cursor-pointer"
                      >
                        Ver ({src.applied})
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Role Family Performance */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-indigo-600" />
              Conversão por Família de Cargo (Role Family Performance)
            </h3>
            <p className="text-xs text-slate-500">
              Identifique quais perfis de vaga geram mais agendamentos de entrevista para o seu perfil.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                <th className="p-2.5">Família de Cargo</th>
                <th className="p-2.5 text-center">Aplicadas</th>
                <th className="p-2.5 text-center">Entrevistas</th>
                <th className="p-2.5 text-center">Taxa Entrevista</th>
                <th className="p-2.5 text-center">Ofertas</th>
                <th className="p-2.5 text-center">Avg Match</th>
                <th className="p-2.5 text-center">Avg Apply Priority</th>
                <th className="p-2.5 text-center">Avg ATS</th>
                <th className="p-2.5 text-center">Drill-Down</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
              {analytics.rolePerformance.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-4 text-center text-slate-400">
                    Nenhum cargo registrado no período.
                  </td>
                </tr>
              ) : (
                analytics.rolePerformance.map((role) => (
                  <tr key={role.roleFamily} className="hover:bg-slate-50 transition">
                    <td className="p-2.5 font-bold text-slate-900">{role.roleFamily}</td>
                    <td className="p-2.5 text-center font-bold">{role.applied}</td>
                    <td className="p-2.5 text-center font-bold text-amber-600">{role.interviews}</td>
                    <td className="p-2.5 text-center font-extrabold text-indigo-600">
                      {role.appliedToInterviewRate}%
                    </td>
                    <td className="p-2.5 text-center font-bold text-emerald-600">{role.offers}</td>
                    <td className="p-2.5 text-center font-mono">{role.avgMatchScore}</td>
                    <td className="p-2.5 text-center font-mono">{role.avgApplyPriority}</td>
                    <td className="p-2.5 text-center font-mono">{role.avgAtsCoverage}%</td>
                    <td className="p-2.5 text-center">
                      <button
                        onClick={() =>
                          handleOpenDrillDown(
                            `Vagas da Família: ${role.roleFamily}`,
                            (j) => (j.roleFamily || 'Outros / Geral') === role.roleFamily
                          )
                        }
                        className="text-indigo-600 hover:text-indigo-800 font-bold hover:underline cursor-pointer"
                      >
                        Ver Vagas
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Score Performance Buckets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Match Score Buckets */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-2">
            <Target className="w-4 h-4 text-indigo-600" />
            Match Score Buckets
          </h3>
          <div className="space-y-2 text-xs">
            {analytics.scorePerformance.matchScoreBuckets.map((b) => (
              <div
                key={b.bucket}
                onClick={() =>
                  handleOpenDrillDown(
                    `Match Score Faixa: ${b.bucket}`,
                    (j, details) => {
                      const score = details?.match_score_at_application ?? j.analysis?.score ?? 0;
                      if (b.bucket === '90–100') return score >= 90;
                      if (b.bucket === '85–89') return score >= 85 && score < 90;
                      if (b.bucket === '80–84') return score >= 80 && score < 85;
                      if (b.bucket === '75–79') return score >= 75 && score < 80;
                      return score < 75;
                    }
                  )
                }
                className="p-2.5 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded-lg transition cursor-pointer flex items-center justify-between"
              >
                <div>
                  <span className="font-extrabold text-slate-900 block">{b.bucket}</span>
                  <span className="text-[10px] text-slate-500">{b.applied} candidaturas</span>
                </div>
                <div className="text-right">
                  <span className="font-extrabold text-indigo-600 block">{b.interviewRate}% int.</span>
                  <span className="text-[10px] text-emerald-600 font-bold">{b.offers} ofertas</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Apply Priority Buckets */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-2">
            <Zap className="w-4 h-4 text-amber-500" />
            Apply Priority Buckets
          </h3>
          <div className="space-y-2 text-xs">
            {analytics.scorePerformance.applyPriorityBuckets.map((b) => (
              <div
                key={b.bucket}
                onClick={() =>
                  handleOpenDrillDown(
                    `Apply Priority Faixa: ${b.bucket}`,
                    (j, details) => {
                      const score = details?.apply_priority_at_application ?? 70;
                      if (b.bucket === '90–100') return score >= 90;
                      if (b.bucket === '80–89') return score >= 80 && score < 90;
                      if (b.bucket === '65–79') return score >= 65 && score < 80;
                      if (b.bucket === '50–64') return score >= 50 && score < 65;
                      return score < 50;
                    }
                  )
                }
                className="p-2.5 bg-slate-50 hover:bg-amber-50 border border-slate-200 hover:border-amber-300 rounded-lg transition cursor-pointer flex items-center justify-between"
              >
                <div>
                  <span className="font-extrabold text-slate-900 block">{b.bucket}</span>
                  <span className="text-[10px] text-slate-500">{b.applied} candidaturas</span>
                </div>
                <div className="text-right">
                  <span className="font-extrabold text-indigo-600 block">{b.interviewRate}% int.</span>
                  <span className="text-[10px] text-emerald-600 font-bold">{b.offers} ofertas</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ATS Coverage Buckets */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-2">
            <FileCheck className="w-4 h-4 text-emerald-600" />
            ATS Coverage Buckets
          </h3>
          <div className="space-y-2 text-xs">
            {analytics.scorePerformance.atsCoverageBuckets.map((b) => (
              <div
                key={b.bucket}
                onClick={() =>
                  handleOpenDrillDown(
                    `ATS Coverage Faixa: ${b.bucket}`,
                    (j, details) => {
                      const score = details?.ats_coverage_at_application ?? (j.analysis?.breakdown ? Math.round((j.analysis.breakdown.keywordsScore / 4) * 100) : 0);
                      if (b.bucket === '90–100') return score >= 90;
                      if (b.bucket === '80–89') return score >= 80 && score < 90;
                      if (b.bucket === '70–79') return score >= 70 && score < 80;
                      if (b.bucket === '60–69') return score >= 60 && score < 70;
                      return score < 60;
                    }
                  )
                }
                className="p-2.5 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 rounded-lg transition cursor-pointer flex items-center justify-between"
              >
                <div>
                  <span className="font-extrabold text-slate-900 block">{b.bucket}</span>
                  <span className="text-[10px] text-slate-500">{b.applied} candidaturas</span>
                </div>
                <div className="text-right">
                  <span className="font-extrabold text-indigo-600 block">{b.interviewRate}% int.</span>
                  <span className="text-[10px] text-emerald-600 font-bold">{b.offers} ofertas</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Correlations Summary Card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-2">
          <TrendingUp className="w-4 h-4 text-indigo-600" />
          Correlativos Diretos (Todas as Candidaturas vs Convertidas em Entrevista)
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
            <span className="text-[10px] text-slate-500 font-bold uppercase">Média Match Score</span>
            <div className="flex items-center justify-between font-mono font-bold text-slate-800">
              <span>Geral: {analytics.scorePerformance.correlations.avgMatch.allApplied} pts</span>
              <span className="text-amber-600">Entrevistas: {analytics.scorePerformance.correlations.avgMatch.interviewConverted} pts</span>
            </div>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
            <span className="text-[10px] text-slate-500 font-bold uppercase">Média Apply Priority</span>
            <div className="flex items-center justify-between font-mono font-bold text-slate-800">
              <span>Geral: {analytics.scorePerformance.correlations.avgApplyPriority.allApplied} pts</span>
              <span className="text-amber-600">Entrevistas: {analytics.scorePerformance.correlations.avgApplyPriority.interviewConverted} pts</span>
            </div>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
            <span className="text-[10px] text-slate-500 font-bold uppercase">Média ATS Coverage</span>
            <div className="flex items-center justify-between font-mono font-bold text-slate-800">
              <span>Geral: {analytics.scorePerformance.correlations.avgAts.allApplied}%</span>
              <span className="text-amber-600">Entrevistas: {analytics.scorePerformance.correlations.avgAts.interviewConverted}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Weekly Trend Chart Section */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-600" />
            Tendência Semanal (Weekly Applications & Interviews)
          </h3>
          <span className="text-xs text-slate-500">Últimas 8 semanas</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2 text-center text-xs">
          {analytics.trends.weeklySeries.map((w) => (
            <div key={w.startOfWeek} className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
              <span className="text-[10px] font-bold text-slate-500 block truncate">{w.weekLabel}</span>
              <div className="space-y-1 font-extrabold">
                <div className="text-slate-800 text-sm">{w.applications} <span className="text-[9px] text-slate-400 font-normal">cand.</span></div>
                <div className="text-amber-600 text-xs">{w.interviews} <span className="text-[9px] text-slate-400 font-normal">entr.</span></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* DRILL DOWN MODAL */}
      {drillDownTitle && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-4xl max-h-[85vh] rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-amber-400" />
                <h3 className="font-bold text-sm text-slate-100">{drillDownTitle}</h3>
                <span className="px-2 py-0.5 rounded bg-slate-800 text-amber-300 font-extrabold text-xs">
                  {drillDownJobs.length} vagas
                </span>
              </div>
              <button
                onClick={() => setDrillDownTitle(null)}
                className="text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal List */}
            <div className="p-4 overflow-y-auto flex-1 space-y-3">
              {drillDownJobs.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs">
                  Nenhuma vaga corresponde a esta métrica.
                </div>
              ) : (
                drillDownJobs.map((job) => {
                  const details = applications[job.id] || applications[job.url] || null;
                  return (
                    <div
                      key={job.id}
                      onClick={() => {
                        if (onOpenJobDetails) {
                          setDrillDownTitle(null);
                          onOpenJobDetails(job);
                        }
                      }}
                      className="p-3 bg-slate-50 hover:bg-indigo-50/50 border border-slate-200 hover:border-indigo-300 rounded-xl transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                    >
                      <div>
                        <span className="text-[10px] text-slate-500 font-bold uppercase">{job.company}</span>
                        <h4 className="font-extrabold text-slate-900">{job.title}</h4>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                          <span>{job.location}</span>
                          <span>•</span>
                          <span>Fonte: {job.discovery_source || job.source || 'Direct'}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="px-2 py-1 bg-slate-900 text-amber-300 font-extrabold rounded text-[10px]">
                          Match: {details?.match_score_at_application ?? job.analysis?.score ?? 'N/A'}
                        </span>
                        <span className="px-2 py-1 bg-indigo-100 text-indigo-900 font-extrabold rounded text-[10px] uppercase">
                          Status: {details?.status || 'N/A'}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
