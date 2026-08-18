import React from 'react';
import {
  X,
  Award,
  CheckCircle2,
  AlertTriangle,
  Zap,
  TrendingUp,
  Tag,
  Building2,
  MapPin,
  ExternalLink,
  ShieldCheck,
  ChevronRight,
  FileCheck2,
} from 'lucide-react';
import { JobWithAnalysis, UserProfile } from '../types';

interface JobAnalysisModalProps {
  job: JobWithAnalysis | null;
  profile: UserProfile;
  onClose: () => void;
  onOpenTailoredResume?: (job: JobWithAnalysis) => void;
  onOpenApplicationPackage?: (job: JobWithAnalysis) => void;
}

export const JobAnalysisModal: React.FC<JobAnalysisModalProps> = ({
  job,
  profile,
  onClose,
  onOpenTailoredResume,
  onOpenApplicationPackage,
}) => {
  if (!job) return null;

  const { analysis } = job;
  const { breakdown } = analysis;

  const breakdownItems = [
    { label: 'Role Match (Família de Cargo)', score: breakdown.titleScore, max: 20 },
    { label: 'Core Skills & Competências', score: breakdown.skillsScore, max: 25 },
    { label: 'Experience & Evidências', score: breakdown.experienceScore, max: 20 },
    { label: 'Tools & Stack Tecnológica', score: breakdown.toolsScore, max: 10 },
    { label: 'Seniority (Alinhamento)', score: breakdown.seniorityScore, max: 10 },
    { label: 'Language (Idiomas)', score: breakdown.languageScore, max: 5 },
    { label: 'Education (Formação)', score: breakdown.educationScore, max: 3 },
    { label: 'Location (Modelo de Trabalho)', score: breakdown.locationScore, max: 3 },
    { label: 'ATS Context & Palavras-Chave', score: breakdown.keywordsScore, max: 4 },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div
        id="job-analysis-modal"
        className="bg-white border border-slate-200 rounded-lg w-full max-w-4xl max-h-[92vh] overflow-y-auto shadow-xl text-slate-800 my-4 flex flex-col"
      >
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-200 sticky top-0 bg-white/95 z-10 flex items-start justify-between gap-3 backdrop-blur">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                {analysis.classification}
              </span>
              <span className="text-xs font-semibold text-slate-500">{job.company}</span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 leading-tight">{job.title}</h2>
            <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
              <span className="flex items-center gap-1 font-semibold text-slate-700">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                {job.company}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                {job.location} ({job.workplaceType})
              </span>
            </div>
          </div>

          <button
            id="close-analysis-modal-btn"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 space-y-5">
          
          {/* Top Score Banner */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative flex items-center justify-center shrink-0">
                <div className="w-20 h-20 rounded-lg bg-blue-600 text-white border-2 border-blue-500 flex flex-col items-center justify-center shadow-2xs">
                  <span className="text-3xl font-black tracking-tight">
                    {analysis.score}
                  </span>
                  <span className="text-[9px] uppercase font-bold tracking-wider opacity-90">/ 100 PTS</span>
                </div>
              </div>

              <div>
                <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  Score de Compatibilidade
                </div>
                <h3 className="text-base font-bold text-slate-900 mt-0.5">
                  Classificação: <span className="text-blue-700">{analysis.classification}</span>
                </h3>
                <p className="text-xs text-slate-600 mt-0.5 max-w-md">
                  Calculado de forma determinística comparando a vaga diretamente com o Perfil Mestre de <strong className="text-slate-900">{profile.name}</strong>.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {onOpenApplicationPackage && (
                <button
                  id="btn-prepare-from-analysis"
                  onClick={() => {
                    onClose();
                    onOpenApplicationPackage(job);
                  }}
                  className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-3.5 py-2 rounded-md text-xs transition shadow-2xs cursor-pointer"
                >
                  <FileCheck2 className="w-3.5 h-3.5" />
                  <span>PREPARAR CANDIDATURA</span>
                </button>
              )}

              {onOpenTailoredResume && (
                <button
                  id="btn-tailor-resume-from-analysis"
                  onClick={() => {
                    onClose();
                    onOpenTailoredResume(job);
                  }}
                  className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold px-3 py-2 rounded-md text-xs transition shadow-2xs cursor-pointer"
                >
                  <FileCheck2 className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Ver Currículo</span>
                </button>
              )}

              <a
                href={job.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-md text-xs transition shadow-2xs cursor-pointer"
              >
                <span>Acessar Link da Vaga</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Detailed Score Breakdown */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-1.5">
              <Award className="w-4 h-4 text-blue-600" />
              Detalhamento de Pontuação (Max 100 PTS)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {breakdownItems.map((item) => {
                const percentage = Math.round((item.score / item.max) * 100);

                return (
                  <div key={item.label} className="bg-white p-2.5 rounded-md border border-slate-200 shadow-2xs">
                    <div className="flex justify-between items-center text-[11px] font-semibold mb-1">
                      <span className="text-slate-700">{item.label}</span>
                      <span className="font-bold text-slate-900">
                        {item.score} <span className="text-slate-400 font-normal">/ {item.max} pts</span>
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-blue-600 h-full rounded-full transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Por que combina comigo (Match Reasons) */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-500" />
              Por que combina comigo (Razões do Score)
            </h3>
            <ul className="space-y-1.5">
              {analysis.matchReasons.map((reason, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-2 text-xs text-slate-800 bg-slate-50 border border-slate-200 p-2.5 rounded-md font-medium"
                >
                  <ChevronRight className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Matched & Missing Skills Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Matched Skills */}
            <div className="bg-emerald-50/50 border border-emerald-200 rounded-lg p-3.5 space-y-2">
              <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Matched Skills ({analysis.matchedSkills.length})
              </h4>
              {analysis.matchedSkills.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {analysis.matchedSkills.map((skill) => (
                    <span
                      key={skill}
                      className="text-[11px] bg-white text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded font-semibold shadow-2xs"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">Nenhuma técnica direta encontrada.</p>
              )}

              {/* Related / Equivalent Skills */}
              {analysis.relatedSkills && analysis.relatedSkills.length > 0 && (
                <div className="pt-2 border-t border-emerald-200/60">
                  <span className="text-[10px] font-bold text-emerald-900 uppercase tracking-wider block mb-1">
                    Equivalências / Related Skills Reconhecidas:
                  </span>
                  <div className="space-y-1">
                    {analysis.relatedSkills.map((rel, idx) => (
                      <div key={idx} className="text-[11px] bg-white/80 text-emerald-900 border border-emerald-200 px-2 py-0.5 rounded font-medium flex items-center justify-between">
                        <span className="font-bold">{rel.jobSkill}</span>
                        <span className="text-[10px] text-emerald-700 font-semibold">→ related to {rel.matchedProfileSkill}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Missing Skills */}
            <div className="bg-amber-50/50 border border-amber-200 rounded-lg p-3.5 space-y-2">
              <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Missing Skills / Gaps Mapeados ({analysis.missingSkills.length})
              </h4>
              {analysis.missingSkills.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {analysis.missingSkills.map((skill) => (
                    <span
                      key={skill}
                      className="text-[11px] bg-white text-amber-800 border border-amber-200 px-2 py-0.5 rounded font-semibold shadow-2xs"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-emerald-700 font-bold">
                  Nenhum gap crítico de habilidades identificado!
                </p>
              )}

              {analysis.scoreCapApplied && (
                <div className="bg-rose-100 border border-rose-300 text-rose-900 p-2 rounded text-[11px] font-semibold mt-2">
                  ⚠️ Score Cap Aplicado (Teto Máximo 74 pts) devido a requisito obrigatório não atendido.
                </div>
              )}
            </div>
          </div>

          {/* ATS Keywords */}
          {analysis.atsKeywords.length > 0 && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-indigo-600" />
                Palavras-Chave Relevantes Mapeadas na Vaga (ATS)
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {analysis.atsKeywords.map((kw) => (
                  <span
                    key={kw}
                    className="text-[11px] bg-white text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded font-mono font-bold shadow-2xs"
                  >
                    #{kw}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Pontos Fortes da Candidatura */}
          {analysis.strengths.length > 0 && (
            <div className="bg-blue-50/50 border border-blue-200 rounded-lg p-3.5 space-y-1.5">
              <h4 className="text-xs font-bold text-blue-800 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                Pontos Fortes da Sua Candidatura
              </h4>
              <ul className="space-y-1 text-xs text-slate-800">
                {analysis.strengths.map((str, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-blue-600 font-bold">•</span>
                    <span>{str}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Resumo de Experiência Relevante */}
          {analysis.relevantExperienceSummary.length > 0 && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 space-y-2">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                Resumo de Experiências Pessoais Mais Relevantes para Esta Vaga
              </h4>
              <p className="text-[11px] text-slate-500 font-medium">
                Extratos reais da trajetória de Jean Silva que atendem aos requisitos desta vaga:
              </p>
              <div className="space-y-1.5">
                {analysis.relevantExperienceSummary.map((expSummary, idx) => (
                  <div
                    key={idx}
                    className="text-xs text-slate-800 bg-white p-2.5 rounded-md border border-slate-200 leading-relaxed font-medium"
                  >
                    {expSummary}
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-3 border-t border-slate-200 bg-slate-50 sticky bottom-0 flex justify-end gap-2">
          <button
            id="close-analysis-modal-bottom-btn"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-md font-bold text-xs transition cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
