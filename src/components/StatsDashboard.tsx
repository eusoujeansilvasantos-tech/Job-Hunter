import React from 'react';
import { Briefcase, Award, TrendingUp, AlertTriangle } from 'lucide-react';
import { JobWithAnalysis } from '../types';

interface StatsDashboardProps {
  jobs: JobWithAnalysis[];
  activeFilter: string;
  onSelectFilter: (filter: string) => void;
}

export const StatsDashboard: React.FC<StatsDashboardProps> = ({
  jobs,
  activeFilter,
  onSelectFilter,
}) => {
  const totalJobs = jobs.length;
  const excellentJobs = jobs.filter((j) => j.analysis.score >= 90).length;
  const highJobs = jobs.filter(
    (j) => j.analysis.score >= 85 && j.analysis.score <= 89
  ).length;
  const goodJobs = jobs.filter(
    (j) => j.analysis.score >= 75 && j.analysis.score <= 84
  ).length;
  const lowJobs = jobs.filter((j) => j.analysis.score < 75).length;

  const cards = [
    {
      id: 'all',
      title: 'Total de Vagas',
      count: totalJobs,
      subtitle: 'Carregadas no sistema',
      icon: Briefcase,
      color: 'slate',
      bgClass: 'bg-white border-slate-200 text-slate-800 hover:border-slate-300 border-l-4 border-l-slate-600',
      activeClass: 'ring-2 ring-blue-600 border-blue-600 bg-blue-50/50 border-l-4 border-l-blue-600',
      badgeClass: 'bg-slate-100 text-slate-700',
    },
    {
      id: 'excellent',
      title: 'Vagas Excelente (≥ 90%)',
      count: excellentJobs,
      subtitle: 'Prioridade Máxima',
      icon: Award,
      color: 'emerald',
      bgClass: 'bg-white border-slate-200 text-slate-800 hover:border-slate-300 border-l-4 border-l-emerald-500',
      activeClass: 'ring-2 ring-emerald-600 border-emerald-600 bg-emerald-50/50 border-l-4 border-l-emerald-600',
      badgeClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    },
    {
      id: 'high',
      title: 'Vagas Muito Alta (85–89%)',
      count: highJobs,
      subtitle: 'Candidatar Imediatamente',
      icon: TrendingUp,
      color: 'blue',
      bgClass: 'bg-white border-slate-200 text-slate-800 hover:border-slate-300 border-l-4 border-l-blue-500',
      activeClass: 'ring-2 ring-blue-600 border-blue-600 bg-blue-50/50 border-l-4 border-l-blue-600',
      badgeClass: 'bg-blue-50 text-blue-700 border border-blue-200',
    },
    {
      id: 'low',
      title: 'Vagas Abaixo de 75%',
      count: lowJobs,
      subtitle: 'Média ou Baixa Prioridade',
      icon: AlertTriangle,
      color: 'amber',
      bgClass: 'bg-white border-slate-200 text-slate-800 hover:border-slate-300 border-l-4 border-l-amber-500',
      activeClass: 'ring-2 ring-amber-600 border-amber-600 bg-amber-50/50 border-l-4 border-l-amber-600',
      badgeClass: 'bg-amber-50 text-amber-700 border border-amber-200',
    },
  ];

  return (
    <div id="stats-dashboard" className="grid grid-cols-2 lg:grid-cols-4 gap-3 my-3">
      {cards.map((card) => {
        const Icon = card.icon;
        const isActive = activeFilter === card.id;

        return (
          <button
            key={card.id}
            id={`stat-card-${card.id}`}
            onClick={() => onSelectFilter(card.id)}
            className={`p-3 rounded-lg border text-left transition-all duration-150 cursor-pointer shadow-2xs relative overflow-hidden group ${
              isActive ? card.activeClass : card.bgClass
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                {card.title}
              </span>
              <div className={`p-1.5 rounded-md ${card.badgeClass}`}>
                <Icon className="w-3.5 h-3.5" />
              </div>
            </div>

            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-black tracking-tight text-slate-900">
                {card.count}
              </span>
              <span className="text-[10px] font-semibold text-slate-500">
                {card.subtitle}
              </span>
            </div>

            {isActive && (
              <div className="mt-1 text-[10px] font-bold text-blue-700 flex items-center gap-1">
                • Filtro ativo
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
};
