import React, { useState } from 'react';
import { Building2, MapPin, CheckCircle2, AlertCircle, FileText, BarChart2, DollarSign, Calendar, ExternalLink, FileCheck2, Sparkles, Tag, Zap } from 'lucide-react';
import { JobWithAnalysis, ApplicationStatus } from '../types';
import { getFriendlyAgeLabel } from '../services/jobSources';
import { getJobStatus, setJobStatus, STATUS_LABELS, STATUS_COLORS } from '../services/applicationStatus';
import { calculateApplyPriority } from '../services/applyPriority';

interface JobCardProps {
  job: JobWithAnalysis;
  onOpenAnalysis: (job: JobWithAnalysis) => void;
  onOpenDescription: (job: JobWithAnalysis) => void;
  onOpenTailoredResume: (job: JobWithAnalysis) => void;
  onOpenApplicationPackage: (job: JobWithAnalysis) => void;
  onStatusChange?: (jobId: string, newStatus: ApplicationStatus) => void;
}

export const JobCard: React.FC<JobCardProps> = ({
  job,
  onOpenAnalysis,
  onOpenDescription,
  onOpenTailoredResume,
  onOpenApplicationPackage,
  onStatusChange,
}) => {
  const { score, classification, matchedSkills, missingSkills } = job.analysis;
  const [currentStatus, setCurrentStatus] = useState<ApplicationStatus>(() => getJobStatus(job));

  const applyPriority = calculateApplyPriority(job);

  const handleStatusSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value as ApplicationStatus;
    setCurrentStatus(newStatus);
    setJobStatus(job, newStatus);
    if (onStatusChange) {
      onStatusChange(job.id, newStatus);
    }
  };

  // Match score badge styling
  let scoreBg = 'bg-slate-100 text-slate-700 border-slate-300';
  let badgeColor = 'bg-slate-100 text-slate-700 border-slate-200';
  let ringColor = 'border-slate-300';
  let leftAccent = 'border-l-4 border-l-slate-400';

  if (score >= 90) {
    scoreBg = 'bg-emerald-50 text-emerald-800 border-emerald-300';
    badgeColor = 'bg-emerald-50 text-emerald-800 border-emerald-200';
    ringColor = 'border-emerald-300';
    leftAccent = 'border-l-4 border-l-emerald-500';
  } else if (score >= 85) {
    scoreBg = 'bg-blue-50 text-blue-800 border-blue-300';
    badgeColor = 'bg-blue-50 text-blue-800 border-blue-200';
    ringColor = 'border-blue-300';
    leftAccent = 'border-l-4 border-l-blue-500';
  } else if (score >= 75) {
    scoreBg = 'bg-sky-50 text-sky-800 border-sky-300';
    badgeColor = 'bg-sky-50 text-sky-800 border-sky-200';
    ringColor = 'border-sky-300';
    leftAccent = 'border-l-4 border-l-sky-500';
  } else if (score >= 65) {
    scoreBg = 'bg-amber-50 text-amber-800 border-amber-300';
    badgeColor = 'bg-amber-50 text-amber-800 border-amber-200';
    ringColor = 'border-amber-300';
    leftAccent = 'border-l-4 border-l-amber-500';
  } else {
    scoreBg = 'bg-rose-50 text-rose-800 border-rose-300';
    badgeColor = 'bg-rose-50 text-rose-800 border-rose-200';
    ringColor = 'border-rose-300';
    leftAccent = 'border-l-4 border-l-rose-500';
  }

  // Apply priority badge styling
  let priorityBg = 'bg-purple-50';
  let priorityText = 'text-purple-900';
  let priorityBorder = 'border-purple-300';

  if (applyPriority.classification === 'APPLY NOW') {
    priorityBg = 'bg-purple-600';
    priorityText = 'text-white';
    priorityBorder = 'border-purple-700';
  } else if (applyPriority.classification === 'HIGH PRIORITY') {
    priorityBg = 'bg-indigo-100';
    priorityText = 'text-indigo-900';
    priorityBorder = 'border-indigo-300';
  } else if (applyPriority.classification === 'REVIEW') {
    priorityBg = 'bg-amber-100';
    priorityText = 'text-amber-900';
    priorityBorder = 'border-amber-300';
  } else if (applyPriority.classification === 'NOT ELIGIBLE') {
    priorityBg = 'bg-rose-100';
    priorityText = 'text-rose-900';
    priorityBorder = 'border-rose-300';
  } else if (applyPriority.classification === 'ALREADY APPLIED') {
    priorityBg = 'bg-blue-100';
    priorityText = 'text-blue-900';
    priorityBorder = 'border-blue-300';
  }

  const isAdzuna = job.source === 'adzuna';
  const friendlyAge = getFriendlyAgeLabel(job.publishedAt);
  const statusStyle = STATUS_COLORS[currentStatus] || STATUS_COLORS.NEW;

  return (
    <div
      id={`job-card-${job.id}`}
      className={`bg-white border border-slate-200 hover:border-blue-400 rounded-lg p-4 transition-all duration-150 shadow-2xs hover:shadow-xs flex flex-col justify-between group relative ${leftAccent}`}
    >
      <div>
        {/* Header: Title, Company, Scores */}
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 flex-1">
            <div className="flex items-center flex-wrap gap-1.5">
              {/* Source Badge */}
              {job.sources && job.sources.length > 1 ? (
                <span className="text-[10px] font-black px-2 py-0.5 rounded bg-orange-100/80 text-orange-950 border border-orange-300 uppercase tracking-wider flex items-center gap-0.5 shadow-2xs">
                  {job.sources
                    .map((s) =>
                      s.toLowerCase() === 'solides'
                        ? 'SÓLIDES'
                        : s.toLowerCase() === 'pandape'
                        ? 'PANDAPÉ'
                        : s.toUpperCase()
                    )
                    .join(' + ')}
                </span>
              ) : job.source === 'pandape' || (job.sources && job.sources.includes('pandape')) ? (
                <span className="text-[10px] font-black px-2 py-0.5 rounded bg-teal-50 text-teal-900 border border-teal-300 uppercase tracking-wider flex items-center gap-0.5 shadow-2xs">
                  PANDAPÉ
                </span>
              ) : job.source === 'solides' || (job.sources && job.sources.includes('solides')) ? (
                <span className="text-[10px] font-black px-2 py-0.5 rounded bg-orange-50 text-orange-900 border border-orange-300 uppercase tracking-wider flex items-center gap-0.5 shadow-2xs">
                  SÓLIDES
                </span>
              ) : job.source === 'gupy' || (job.sources && job.sources.includes('gupy')) ? (
                <span className="text-[10px] font-black px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-300 uppercase tracking-wider flex items-center gap-0.5">
                  GUPY
                </span>
              ) : job.source === 'greenhouse' || (job.sources && job.sources.includes('greenhouse')) ? (
                <span className="text-[10px] font-black px-2 py-0.5 rounded bg-indigo-100 text-indigo-900 border border-indigo-300 uppercase tracking-wider flex items-center gap-0.5">
                  GREENHOUSE
                </span>
              ) : isAdzuna ? (
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 uppercase tracking-wider flex items-center gap-0.5">
                  ADZUNA
                </span>
              ) : (
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 uppercase tracking-wider">
                  VAGA
                </span>
              )}

              {/* Enriched Badge */}
              {job.isEnriched && (
                <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-teal-100/90 text-teal-900 border border-teal-300 uppercase tracking-wider flex items-center gap-0.5" title="Dados enriquecidos com página oficial de detalhes">
                  <Sparkles className="w-2.5 h-2.5 text-teal-700" />
                  ENRICHED
                </span>
              )}

              {/* Unresolved Badge */}
              {job.isUnresolved && (
                <span className="text-[10px] font-black px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 uppercase tracking-wider flex items-center gap-1">
                  UNRESOLVED APPLICATION
                </span>
              )}

              {/* Status Badge & Dropdown */}
              <div className="flex items-center gap-1">
                <span
                  className={`text-[10px] font-extrabold px-2 py-0.5 rounded border uppercase tracking-wider ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}
                >
                  {STATUS_LABELS[currentStatus]}
                </span>

                <select
                  id={`select-status-job-${job.id}`}
                  value={currentStatus}
                  onChange={handleStatusSelect}
                  className="text-[10px] bg-slate-50 text-slate-700 font-semibold border border-slate-300 rounded px-1 py-0.5 cursor-pointer hover:bg-slate-100 focus:outline-none"
                  title="Alterar status da candidatura"
                >
                  {(Object.keys(STATUS_LABELS) as ApplicationStatus[]).map((st) => (
                    <option key={st} value={st}>
                      {STATUS_LABELS[st]}
                    </option>
                  ))}
                </select>
              </div>

              {/* Apply Priority Classification Tag */}
              <span className={`text-[10px] font-black px-2 py-0.5 rounded border uppercase tracking-wider flex items-center gap-1 ${priorityBg} ${priorityText} ${priorityBorder}`}>
                <Zap className="w-2.5 h-2.5" />
                APPLY: {applyPriority.classification}
              </span>

              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${badgeColor}`}>
                {classification}
              </span>
              <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                {job.workplaceType}
              </span>
              <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                {job.seniority}
              </span>
            </div>

            <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-700 transition-colors line-clamp-2 leading-snug">
              {job.title}
            </h3>

            <div className="flex items-center flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-600">
              <span className="flex items-center gap-1 font-bold text-slate-800">
                <Building2 className="w-3.5 h-3.5 text-slate-500" />
                {job.company}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                {job.location}
              </span>
              {job.salaryRange && (
                <span className="flex items-center gap-0.5 text-emerald-700 font-bold">
                  <DollarSign className="w-3 h-3" />
                  {job.salaryRange}
                </span>
              )}
            </div>
          </div>

          {/* Scores Badges: Match Score & Apply Priority */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Match Score Badge */}
            <div
              className={`w-13 h-13 rounded-lg border-2 flex flex-col items-center justify-center ${scoreBg} ${ringColor} shadow-2xs transition-transform group-hover:scale-105`}
              title={`Match Score — Compatibilidade técnica (${score}/100)`}
            >
              <span className="text-lg font-black tracking-tight leading-none">
                {score}
              </span>
              <span className="text-[8px] uppercase font-black tracking-wider opacity-90 mt-0.5">
                MATCH
              </span>
            </div>

            {/* Apply Priority Badge */}
            <div
              className={`w-13 h-13 rounded-lg border-2 flex flex-col items-center justify-center ${priorityBg} ${priorityText} ${priorityBorder} shadow-2xs transition-transform group-hover:scale-105`}
              title={`Apply Priority — ${applyPriority.classification} (${applyPriority.score}/100)`}
            >
              <span className="text-lg font-black tracking-tight leading-none">
                {applyPriority.score}
              </span>
              <span className="text-[8px] uppercase font-black tracking-wider mt-0.5 opacity-90">
                PRIORITY
              </span>
            </div>
          </div>
        </div>

        {/* Competências Compatíveis */}
        <div className="mt-3 space-y-2.5">
          <div>
            <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider mb-1 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              Competências Compatíveis ({matchedSkills.length})
            </div>
            {matchedSkills.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {matchedSkills.slice(0, 5).map((skill) => (
                  <span
                    key={skill}
                    className="text-[11px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded font-medium"
                  >
                    {skill}
                  </span>
                ))}
                {matchedSkills.length > 5 && (
                  <span className="text-[11px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded font-medium">
                    +{matchedSkills.length - 5}
                  </span>
                )}
              </div>
            ) : (
              <p className="text-[11px] text-slate-500 italic">Nenhuma competência direta mapeada.</p>
            )}
          </div>

          {/* Competências Ausentes */}
          {missingSkills.length > 0 && (
            <div>
              <div className="text-[10px] font-bold text-amber-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3 text-amber-600" />
                Pontos / Requisitos Ausentes ({missingSkills.length})
              </div>
              <div className="flex flex-wrap gap-1">
                {missingSkills.slice(0, 3).map((skill) => (
                  <span
                    key={skill}
                    className="text-[11px] bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded font-medium"
                  >
                    {skill}
                  </span>
                ))}
                {missingSkills.length > 3 && (
                  <span className="text-[11px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded font-medium">
                    +{missingSkills.length - 3}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <span className="text-[11px] text-slate-500 flex items-center gap-1 font-medium" title={job.publishedAt}>
          <Calendar className="w-3 h-3 text-slate-400" />
          {friendlyAge}
        </span>

        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto justify-end">
          <button
            id={`btn-prepare-application-${job.id}`}
            onClick={() => onOpenApplicationPackage(job)}
            className="flex items-center gap-1 text-xs font-black bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-md transition shadow-2xs cursor-pointer"
            title="Preparar candidatura, gerar pacote e exportar documentos"
          >
            <FileCheck2 className="w-3.5 h-3.5" />
            <span>PREPARAR CANDIDATURA</span>
          </button>

          <button
            id={`btn-view-desc-${job.id}`}
            onClick={() => onOpenDescription(job)}
            className="flex items-center gap-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1.5 rounded-md transition border border-slate-200 cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Descrição</span>
          </button>

          <button
            id={`btn-view-analysis-${job.id}`}
            onClick={() => onOpenAnalysis(job)}
            className="flex items-center gap-1 text-xs font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-2.5 py-1.5 rounded-md transition cursor-pointer"
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span>Análise</span>
          </button>
        </div>
      </div>
    </div>
  );
};

