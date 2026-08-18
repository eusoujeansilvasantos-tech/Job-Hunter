import React from 'react';
import { X, Building2, MapPin, DollarSign, Calendar, ExternalLink, Briefcase, Zap, AlertTriangle, AlertOctagon, CheckCircle2 } from 'lucide-react';
import { JobWithAnalysis } from '../types';
import { calculateApplyPriority } from '../services/applyPriority';

interface JobDescriptionModalProps {
  job: JobWithAnalysis | null;
  onClose: () => void;
  onOpenAnalysis: (job: JobWithAnalysis) => void;
}

export const JobDescriptionModal: React.FC<JobDescriptionModalProps> = ({
  job,
  onClose,
  onOpenAnalysis,
}) => {
  if (!job) return null;

  const applyPriority = calculateApplyPriority(job);
  const { score, classification, breakdown, reasons, warnings, blockers } = applyPriority;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div
        id="job-description-modal"
        className="bg-white border border-slate-200 rounded-lg w-full max-w-3xl max-h-[92vh] overflow-y-auto shadow-xl text-slate-800 my-4 flex flex-col"
      >
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-200 sticky top-0 bg-white/95 z-10 flex items-start justify-between gap-3 backdrop-blur">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                {job.workplaceType}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                {job.seniority}
              </span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 leading-tight">{job.title}</h2>
            <div className="flex items-center flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-600 mt-1">
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
                  <DollarSign className="w-3.5 h-3.5" />
                  {job.salaryRange}
                </span>
              )}
            </div>
          </div>

          <button
            id="close-description-modal-btn"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 space-y-4">

          {/* APPLY PRIORITY ENGINE SECTION */}
          <div className="bg-purple-50/70 border border-purple-200 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-purple-200 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-purple-600 text-white rounded-md">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-purple-900">
                    Apply Priority Engine
                  </h3>
                  <p className="text-[11px] text-purple-700 font-medium">
                    Prioridade de candidatura calculada agora (decoupled do Match Score)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-2xl font-black text-purple-900">{score}/100</span>
                <span className="text-xs font-black uppercase tracking-wider px-2.5 py-1 rounded-md bg-purple-600 text-white shadow-2xs">
                  {classification}
                </span>
              </div>
            </div>

            {/* Breakdown Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="bg-white/80 p-2 rounded border border-purple-100 flex flex-col">
                <span className="text-[10px] text-slate-500 font-semibold">Match Quality</span>
                <span className="font-bold text-slate-800">{breakdown.matchComponent} / 30</span>
              </div>
              <div className="bg-white/80 p-2 rounded border border-purple-100 flex flex-col">
                <span className="text-[10px] text-slate-500 font-semibold">ATS Coverage</span>
                <span className="font-bold text-slate-800">{breakdown.atsComponent} / 15</span>
              </div>
              <div className="bg-white/80 p-2 rounded border border-purple-100 flex flex-col">
                <span className="text-[10px] text-slate-500 font-semibold">Recency</span>
                <span className="font-bold text-slate-800">{breakdown.recencyComponent} / 15</span>
              </div>
              <div className="bg-white/80 p-2 rounded border border-purple-100 flex flex-col">
                <span className="text-[10px] text-slate-500 font-semibold">Geography</span>
                <span className="font-bold text-slate-800">{breakdown.geographyComponent} / 10</span>
              </div>
              <div className="bg-white/80 p-2 rounded border border-purple-100 flex flex-col">
                <span className="text-[10px] text-slate-500 font-semibold">Role Fit</span>
                <span className="font-bold text-slate-800">{breakdown.roleFitComponent} / 10</span>
              </div>
              <div className="bg-white/80 p-2 rounded border border-purple-100 flex flex-col">
                <span className="text-[10px] text-slate-500 font-semibold">Critical Gaps</span>
                <span className="font-bold text-slate-800">{breakdown.criticalGapsComponent} / 10</span>
              </div>
              <div className="bg-white/80 p-2 rounded border border-purple-100 flex flex-col">
                <span className="text-[10px] text-slate-500 font-semibold">Source Quality</span>
                <span className="font-bold text-slate-800">{breakdown.sourceComponent} / 5</span>
              </div>
              <div className="bg-white/80 p-2 rounded border border-purple-100 flex flex-col">
                <span className="text-[10px] text-slate-500 font-semibold">Urgency</span>
                <span className="font-bold text-slate-800">{breakdown.urgencyComponent} / 5</span>
              </div>
            </div>

            {/* Blockers */}
            {blockers.length > 0 && (
              <div className="bg-rose-50 border border-rose-200 rounded p-2.5 space-y-1 text-xs text-rose-900 font-medium">
                <div className="font-bold text-rose-800 flex items-center gap-1">
                  <AlertOctagon className="w-3.5 h-3.5 text-rose-600" />
                  BLOCKER DETECTED
                </div>
                {blockers.map((b, i) => (
                  <p key={i}>{b}</p>
                ))}
              </div>
            )}

            {/* Reasons */}
            {reasons.length > 0 && (
              <div className="space-y-1 text-xs text-purple-950">
                <span className="font-bold uppercase tracking-wider text-[10px] text-purple-800">Por que aplicar agora?</span>
                <ul className="space-y-0.5">
                  {reasons.map((r, i) => (
                    <li key={i} className="flex items-center gap-1.5 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Warnings */}
            {warnings.length > 0 && (
              <div className="space-y-1 text-xs text-amber-900">
                <span className="font-bold uppercase tracking-wider text-[10px] text-amber-800">Alertas de Atenção:</span>
                <ul className="space-y-0.5">
                  {warnings.map((w, i) => (
                    <li key={i} className="flex items-center gap-1.5 font-medium">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      {w}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Requirements Section */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 flex items-center gap-1.5">
              <Briefcase className="w-4 h-4 text-blue-600" />
              Requisitos / Competências Solicitadas
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {job.requirements.map((req, idx) => (
                <span
                  key={idx}
                  className="text-xs bg-white text-slate-800 border border-slate-200 px-2.5 py-1 rounded font-medium shadow-2xs"
                >
                  {req}
                </span>
              ))}
            </div>
          </div>

          {/* Full Description */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Descrição Completa da Vaga
            </h3>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 text-xs text-slate-800 leading-relaxed whitespace-pre-line font-sans">
              {job.description}
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-200 font-medium">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              Publicada: {job.publishedAt}
            </span>
            <span>ID Interno: {job.id}</span>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3 border-t border-slate-200 bg-slate-50 sticky bottom-0 flex items-center justify-between gap-2">
          <a
            href={job.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white px-3 py-1.5 rounded-md transition border border-slate-200 shadow-2xs"
          >
            <span>Link Externo</span>
            <ExternalLink className="w-3 h-3" />
          </a>

          <div className="flex items-center gap-2">
            <button
              id="close-description-modal-bottom-btn"
              onClick={onClose}
              className="px-3.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-md font-bold text-xs transition cursor-pointer"
            >
              Fechar
            </button>
            <button
              id="open-analysis-from-desc-btn"
              onClick={() => {
                onClose();
                onOpenAnalysis(job);
              }}
              className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-md text-xs transition shadow-2xs cursor-pointer flex items-center gap-1.5"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>PREPARAR CANDIDATURA</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
