import React, { useState } from 'react';
import {
  X,
  Building2,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Radio,
  Layers,
  HelpCircle,
  AlertTriangle,
  Play,
  ShieldCheck,
  User,
  Star,
  Filter,
  BarChart3,
  TrendingUp,
  Award,
  Sparkles,
  Info,
  Zap,
  ChevronDown,
  ChevronUp,
  Check,
} from 'lucide-react';
import { JobBoardSource, BoardStatus, BoardMetrics, getStoredJobBoards, saveJobBoards } from '../data/jobBoards';
import { testGreenhouseBoard, validateAllBoards } from '../services/greenhouse';
import { calculateSourceAnalytics, SourceAnalyticsResult, ConfidenceLevel, SuggestedPriority } from '../services/sourceAnalytics';

interface JobBoardsModalProps {
  onClose: () => void;
  onBoardsUpdated?: () => void;
  initialTab?: 'analytics' | 'manager';
  adzunaJobsCount?: number;
}

export const JobBoardsModal: React.FC<JobBoardsModalProps> = ({
  onClose,
  onBoardsUpdated,
  initialTab = 'analytics',
  adzunaJobsCount = 0,
}) => {
  const [activeTab, setActiveTab] = useState<'analytics' | 'manager'>(initialTab);
  const [boards, setBoards] = useState<JobBoardSource[]>(() => getStoredJobBoards());
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // Form State
  const [companyInput, setCompanyInput] = useState('');
  const [boardTokenInput, setBoardTokenInput] = useState('');
  const [priorityInput, setPriorityInput] = useState<number>(1);
  const [enabledInput, setEnabledInput] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  // Filter State for Manager Table
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'p1' | 'p1_p2' | 'p3'>('all');

  // Filter State for Source Intelligence / Analytics
  const [sourceQualityFilter, setSourceQualityFilter] = useState<'all' | 'yield80' | 'yield60' | 'yield40' | 'p1_suggested'>('all');

  // Expanded explanations state (map of boardToken -> boolean)
  const [expandedExplanations, setExpandedExplanations] = useState<Record<string, boolean>>({});

  // Validation State
  const [isValidatingAll, setIsValidatingAll] = useState(false);
  const [testingToken, setTestingToken] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{
    boardToken: string;
    company?: string;
    ok: boolean;
    status: BoardStatus;
    jobCount: number;
    httpStatus: number;
    metrics?: BoardMetrics;
    error?: string;
  } | null>(null);

  const toggleExplanation = (key: string) => {
    setExpandedExplanations((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const renderPriorityBadge = (priority?: number) => {
    switch (priority) {
      case 1:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-extrabold text-[10px] bg-indigo-100 text-indigo-900 border border-indigo-200">
            <Star className="w-3 h-3 text-indigo-600 fill-indigo-600" />
            P1 — Estratégica
          </span>
        );
      case 2:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-bold text-[10px] bg-blue-50 text-blue-800 border border-blue-200">
            P2 — Alta
          </span>
        );
      case 3:
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-medium text-[10px] bg-slate-100 text-slate-700 border border-slate-200">
            P3 — Complementar
          </span>
        );
    }
  };

  const renderSuggestedBadge = (sug?: SuggestedPriority) => {
    switch (sug) {
      case 1:
        return <span className="text-[10px] font-black text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">Sugestão: P1</span>;
      case 2:
        return <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">Sugestão: P2</span>;
      case 3:
        return <span className="text-[10px] font-medium text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">Sugestão: P3</span>;
      case 'WATCH':
      default:
        return <span className="text-[10px] font-medium text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">Sugestão: WATCH</span>;
    }
  };

  const renderConfidenceBadge = (confidence?: ConfidenceLevel) => {
    switch (confidence) {
      case 'HIGH':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-extrabold text-[9px] bg-emerald-100 text-emerald-800 border border-emerald-200">
            Confiança ALTA
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-bold text-[9px] bg-blue-100 text-blue-800 border border-blue-200">
            Confiança MÉDIA
          </span>
        );
      case 'LOW':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-medium text-[9px] bg-amber-100 text-amber-800 border border-amber-200">
            Confiança BAIXA
          </span>
        );
    }
  };

  const handleApplySuggestion = (boardToken: string, suggestedP: SuggestedPriority) => {
    if (typeof suggestedP !== 'number') return;

    const updated = boards.map((b) => {
      if (b.boardToken.toLowerCase() === boardToken.toLowerCase()) {
        return {
          ...b,
          priority: suggestedP,
        };
      }
      return b;
    });

    setBoards(updated);
    saveJobBoards(updated);
    if (onBoardsUpdated) onBoardsUpdated();
  };

  const handleSaveBoard = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const company = companyInput.trim();
    const tokenClean = boardTokenInput.trim().toLowerCase();

    if (!company || !tokenClean) {
      setFormError('Por favor, preencha o Nome da Empresa e o Board Token.');
      return;
    }

    const duplicateIndex = boards.findIndex(
      (b) => b.boardToken.toLowerCase() === tokenClean
    );

    if (duplicateIndex !== -1 && duplicateIndex !== editingIndex) {
      setFormError(`Já existe um board cadastrado com o Token '${tokenClean}' (${boards[duplicateIndex].company}).`);
      return;
    }

    const existingBoard = editingIndex !== null ? boards[editingIndex] : null;

    const newBoard: JobBoardSource = {
      company,
      provider: 'greenhouse',
      boardToken: tokenClean,
      enabled: enabledInput,
      priority: Number(priorityInput) || 1,
      origin: existingBoard ? existingBoard.origin : 'user',
      lastCheckedAt: existingBoard?.lastCheckedAt,
      lastJobCount: existingBoard?.lastJobCount,
      lastStatus: existingBoard?.lastStatus || 'UNKNOWN',
      metrics: existingBoard?.metrics,
      yieldScore: existingBoard?.yieldScore,
      confidence: existingBoard?.confidence,
      suggestedPriority: existingBoard?.suggestedPriority,
      explanations: existingBoard?.explanations,
    };

    let updated: JobBoardSource[];
    if (editingIndex !== null) {
      updated = [...boards];
      updated[editingIndex] = newBoard;
      setEditingIndex(null);
    } else {
      updated = [newBoard, ...boards];
    }

    setBoards(updated);
    saveJobBoards(updated);
    resetForm();
    if (onBoardsUpdated) onBoardsUpdated();
  };

  const handleEdit = (index: number) => {
    const b = boards[index];
    setCompanyInput(b.company);
    setBoardTokenInput(b.boardToken);
    setPriorityInput(b.priority || 1);
    setEnabledInput(b.enabled);
    setEditingIndex(index);
    setFormError(null);
    setActiveTab('manager');
  };

  const handleToggle = (index: number) => {
    const updated = [...boards];
    updated[index].enabled = !updated[index].enabled;
    setBoards(updated);
    saveJobBoards(updated);
    if (onBoardsUpdated) onBoardsUpdated();
  };

  const handleRemove = (index: number) => {
    const updated = boards.filter((_, i) => i !== index);
    setBoards(updated);
    saveJobBoards(updated);
    if (onBoardsUpdated) onBoardsUpdated();
  };

  const resetForm = () => {
    setCompanyInput('');
    setBoardTokenInput('');
    setPriorityInput(1);
    setEnabledInput(true);
    setEditingIndex(null);
    setFormError(null);
  };

  const handleTestBoard = async (boardToken: string, companyName?: string) => {
    setTestingToken(boardToken);
    setTestResult(null);

    const res = await testGreenhouseBoard(boardToken, companyName);
    setTestingToken(null);

    const nowStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const updated = boards.map((b) => {
      if (b.boardToken.toLowerCase() === boardToken.toLowerCase()) {
        const defaultM = res.metrics || {
          totalJobs: res.jobCount,
          brazilJobs: 0,
          relevantJobs: 0,
          score85Plus: 0,
          score90Plus: 0,
        };
        const analytics = calculateSourceAnalytics(
          boardToken,
          b.company,
          'greenhouse',
          b.priority,
          res.status,
          defaultM,
          `Check (${nowStr})`
        );

        return {
          ...b,
          lastCheckedAt: nowStr,
          lastJobCount: res.jobCount,
          lastStatus: res.status,
          metrics: defaultM,
          yieldScore: analytics.yieldScore,
          confidence: analytics.confidence,
          suggestedPriority: analytics.suggestedPriority,
          explanations: analytics.explanations,
        };
      }
      return b;
    });

    setBoards(updated);
    saveJobBoards(updated);
    if (onBoardsUpdated) onBoardsUpdated();

    setTestResult({
      boardToken,
      company: companyName,
      ok: res.ok,
      status: res.status,
      jobCount: res.jobCount,
      httpStatus: res.httpStatus,
      metrics: res.metrics,
      error: res.error,
    });
  };

  const handleValidateAll = async () => {
    setIsValidatingAll(true);
    setTestResult(null);

    const checkingState = boards.map((b) => ({
      ...b,
      lastStatus: 'CHECKING' as BoardStatus,
    }));
    setBoards(checkingState);

    const validated = await validateAllBoards(boards, (token, testRes) => {
      setBoards((prev) =>
        prev.map((b) => {
          if (b.boardToken.toLowerCase() === token.toLowerCase()) {
            return {
              ...b,
              lastCheckedAt: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
              lastJobCount: testRes.jobCount,
              lastStatus: testRes.status,
              metrics: testRes.metrics,
            };
          }
          return b;
        })
      );
    });

    setBoards(validated);
    saveJobBoards(validated);
    setIsValidatingAll(false);
    if (onBoardsUpdated) onBoardsUpdated();
  };

  // Compute Source Intelligence analytics list
  const analyticsList: SourceAnalyticsResult[] = boards.map((b) => {
    const defaultM = b.metrics || {
      totalJobs: b.lastJobCount || 0,
      brazilJobs: 0,
      relevantJobs: 0,
      score85Plus: 0,
      score90Plus: 0,
    };

    return calculateSourceAnalytics(
      b.boardToken,
      b.company,
      'greenhouse',
      b.priority,
      b.lastStatus || 'UNKNOWN',
      defaultM,
      b.lastCheckedAt ? `Última verificação (${b.lastCheckedAt})` : 'Amostra atual',
      b.previousMetrics,
      b.previousYield
    );
  });

  // Synthesize Adzuna Aggregator analytics
  const adzunaAnalytics: SourceAnalyticsResult = calculateSourceAnalytics(
    'adzuna',
    'Adzuna Aggregator API',
    'adzuna',
    1,
    adzunaJobsCount > 0 ? 'ACTIVE' : 'EMPTY',
    {
      totalJobs: adzunaJobsCount,
      brazilJobs: adzunaJobsCount,
      relevantJobs: Math.round(adzunaJobsCount * 0.4),
      score85Plus: Math.round(adzunaJobsCount * 0.08),
      score90Plus: Math.round(adzunaJobsCount * 0.03),
    },
    'Última busca API'
  );

  // Filter analytics by quality dropdown
  const filteredAnalytics = analyticsList.filter((item) => {
    if (sourceQualityFilter === 'yield80') return (item.yieldScore || 0) >= 80;
    if (sourceQualityFilter === 'yield60') return (item.yieldScore || 0) >= 60;
    if (sourceQualityFilter === 'yield40') return (item.yieldScore || 0) >= 40;
    if (sourceQualityFilter === 'p1_suggested') return item.suggestedPriority === 1;
    return true;
  });

  // Sort: highest yield first, null yields at end
  const sortedAnalytics = [...filteredAnalytics].sort((a, b) => {
    if (a.yieldScore === null && b.yieldScore === null) return 0;
    if (a.yieldScore === null) return 1;
    if (b.yieldScore === null) return -1;
    return b.yieldScore - a.yieldScore;
  });

  // Sort manager boards: P1 first, then P2, then P3
  const filteredManagerBoards = boards.filter((b) => {
    if (priorityFilter === 'p1') return b.priority === 1;
    if (priorityFilter === 'p1_p2') return b.priority === 1 || b.priority === 2;
    if (priorityFilter === 'p3') return b.priority === 3;
    return true;
  });

  const sortedManagerBoards = [...filteredManagerBoards].sort((a, b) => {
    if ((a.priority || 1) !== (b.priority || 1)) {
      return (a.priority || 1) - (b.priority || 1);
    }
    return a.company.localeCompare(b.company);
  });

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-xl max-w-5xl w-full shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col max-h-[94vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600/30 text-indigo-400 rounded-lg border border-indigo-500/30">
              <TrendingUp className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold tracking-tight">SOURCE INTELLIGENCE</h2>
                <span className="bg-indigo-500/30 text-indigo-300 text-[10px] font-bold px-2 py-0.5 rounded border border-indigo-400/30">
                  FASE 1.5
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Análise de Rendimento (Source Yield) das Fontes do Job Hunter AI
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

        {/* Navigation Tabs */}
        <div className="bg-slate-100 border-b border-slate-200 px-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-4 py-3 font-extrabold text-xs transition border-b-2 flex items-center gap-2 cursor-pointer ${
                activeTab === 'analytics'
                  ? 'border-indigo-600 text-indigo-700 bg-white shadow-2xs'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Award className="w-4 h-4 text-indigo-600" />
              <span>MELHORES FONTES (RANKING YIELD)</span>
            </button>
            <button
              onClick={() => setActiveTab('manager')}
              className={`px-4 py-3 font-extrabold text-xs transition border-b-2 flex items-center gap-2 cursor-pointer ${
                activeTab === 'manager'
                  ? 'border-indigo-600 text-indigo-700 bg-white shadow-2xs'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Layers className="w-4 h-4 text-indigo-600" />
              <span>GERENCIADOR DE BOARDS ({boards.length})</span>
            </button>
          </div>

          {activeTab === 'analytics' && (
            <div className="text-[11px] text-slate-500 font-medium hidden sm:block">
              Métricas calculadas sobre a amostra completa de vagas da fonte.
            </div>
          )}
        </div>

        {/* Body Content */}
        <div className="p-5 overflow-y-auto space-y-5">
          {activeTab === 'analytics' ? (
            /* TAB 1: SOURCE INTELLIGENCE / RANKING */
            <div className="space-y-4">
              {/* Info Header Banner */}
              <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-lg p-4 border border-indigo-900/50 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span className="font-extrabold text-xs text-amber-300 uppercase tracking-wider">
                      O que é o Source Yield Score?
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
                    O <strong>Source Yield (0–100)</strong> mede a produtividade e qualidade real de cada empresa/agregador para o seu perfil. Ele avalia taxa de relevância, densidade de vagas 85+ e 90+, e volume útil saturado.
                  </p>
                </div>
                <div className="bg-indigo-900/60 border border-indigo-700/50 px-3 py-2 rounded text-[11px] text-indigo-200 shrink-0">
                  <span className="font-bold block text-white text-xs">Isolamento Garantido:</span>
                  O Yield NUNCA altera o score técnico de nenhuma vaga.
                </div>
              </div>

              {/* Controls Bar */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div className="flex items-center gap-2 flex-wrap">
                  <Filter className="w-4 h-4 text-slate-500" />
                  <span className="text-xs font-bold text-slate-700">Filtrar por Qualidade da Fonte:</span>
                  <select
                    value={sourceQualityFilter}
                    onChange={(e) => setSourceQualityFilter(e.target.value as any)}
                    className="bg-white border border-slate-300 rounded px-3 py-1 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                  >
                    <option value="all">Todas as Fontes ({analyticsList.length})</option>
                    <option value="yield80">Top Performance (Yield 80+)</option>
                    <option value="yield60">Boa Performance (Yield 60+)</option>
                    <option value="yield40">Média Performance (Yield 40+)</option>
                    <option value="p1_suggested">Recomendadas para P1 Estratégica</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleValidateAll}
                    disabled={isValidatingAll}
                    className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-extrabold px-3 py-1.5 rounded transition text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    {isValidatingAll ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Recalculando...</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Recalcular Fontes</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Direct Employers Ranking List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-indigo-600" />
                    <span>Empresas Diretas (Greenhouse Watchlist)</span>
                  </h3>
                  <span className="text-xs text-slate-500">
                    {sortedAnalytics.length} fontes listadas por Yield
                  </span>
                </div>

                {sortedAnalytics.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 border border-dashed border-slate-200 rounded-lg text-xs">
                    Nenhuma fonte atende aos critérios do filtro selecionado.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {sortedAnalytics.map((item, idx) => {
                      const isExpanded = !!expandedExplanations[item.sourceKey];
                      const canApplySuggestion =
                        typeof item.suggestedPriority === 'number' &&
                        item.suggestedPriority !== item.currentPriority;

                      return (
                        <div
                          key={item.sourceKey}
                          className="border border-slate-200 rounded-lg bg-white overflow-hidden shadow-2xs hover:border-slate-300 transition"
                        >
                          <div className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            {/* Left Rank & Company Info */}
                            <div className="flex items-start sm:items-center gap-3">
                              <div
                                className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs shrink-0 ${
                                  idx === 0 && item.yieldScore !== null
                                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                    : idx === 1 && item.yieldScore !== null
                                    ? 'bg-slate-200 text-slate-800 border border-slate-300'
                                    : idx === 2 && item.yieldScore !== null
                                    ? 'bg-amber-800/10 text-amber-900 border border-amber-200'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                #{idx + 1}
                              </div>

                              <div className="space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-extrabold text-sm text-slate-900">
                                    {item.company}
                                  </span>
                                  <span className="font-mono text-[10px] text-slate-500">
                                    ({item.sourceKey})
                                  </span>
                                  <span className="px-1.5 py-0.5 text-[9px] font-bold bg-slate-100 text-slate-700 border border-slate-200 rounded uppercase">
                                    {item.providerCategory === 'DIRECT_EMPLOYER' ? 'Empresa Direta' : 'Agregador'}
                                  </span>
                                </div>

                                <div className="flex items-center gap-2 flex-wrap">
                                  {renderPriorityBadge(item.currentPriority)}
                                  {renderSuggestedBadge(item.suggestedPriority)}
                                  {item.yieldScore !== null && renderConfidenceBadge(item.confidence)}
                                </div>
                              </div>
                            </div>

                            {/* Center Yield Gauge */}
                            <div className="flex items-center gap-4 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200/80">
                              <div className="text-center">
                                <span className="text-[10px] font-bold text-slate-500 uppercase block">
                                  SOURCE YIELD
                                </span>
                                <span
                                  className={`font-black text-lg ${
                                    item.yieldScore === null
                                      ? 'text-slate-400'
                                      : item.yieldScore >= 80
                                      ? 'text-emerald-700'
                                      : item.yieldScore >= 60
                                      ? 'text-indigo-700'
                                      : item.yieldScore >= 40
                                      ? 'text-amber-700'
                                      : 'text-slate-600'
                                  }`}
                                >
                                  {item.yieldScore !== null ? `${item.yieldScore}/100` : '—'}
                                </span>
                              </div>

                              <div className="h-8 w-px bg-slate-200"></div>

                              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                                <div>
                                  <span className="text-[9px] text-slate-500 block font-bold">BR/LATAM</span>
                                  <span className="font-extrabold text-slate-800">{item.metrics.brazilJobs}</span>
                                </div>
                                <div>
                                  <span className="text-[9px] text-slate-500 block font-bold">RELEVANTE</span>
                                  <span className="font-extrabold text-indigo-700">{item.metrics.relevantJobs}</span>
                                </div>
                                <div>
                                  <span className="text-[9px] text-slate-500 block font-bold">90+</span>
                                  <span className="font-extrabold text-emerald-700">{item.metrics.score90Plus}</span>
                                </div>
                              </div>
                            </div>

                            {/* Right Action Buttons */}
                            <div className="flex items-center justify-end gap-2 shrink-0">
                              {canApplySuggestion && (
                                <button
                                  type="button"
                                  onClick={() => handleApplySuggestion(item.sourceKey, item.suggestedPriority)}
                                  className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded transition flex items-center gap-1 shadow-2xs cursor-pointer"
                                  title="Atualizar prioridade da empresa para a sugestão"
                                >
                                  <Zap className="w-3.5 h-3.5 fill-current" />
                                  <span>APLICAR SUGESTÃO</span>
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => toggleExplanation(item.sourceKey)}
                                className="px-2.5 py-1.5 border border-slate-300 hover:border-slate-400 bg-white text-slate-700 font-bold text-xs rounded transition flex items-center gap-1 cursor-pointer"
                              >
                                <span>{isExpanded ? 'Ocultar Detalhes' : 'Por Que Esta Fonte?'}</span>
                                {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </div>

                          {/* Expanded Analytics Explanation Drawer */}
                          {isExpanded && (
                            <div className="bg-slate-50 border-t border-slate-200 p-4 space-y-3 text-xs">
                              <div className="flex items-center gap-2 text-slate-800 font-bold">
                                <Info className="w-4 h-4 text-indigo-600" />
                                <span>POR QUE ESTA FONTE É BOA? (DIAGNÓSTICO DETERMINÍSTICO)</span>
                              </div>

                              <ul className="space-y-1.5 pl-5 list-disc text-slate-700">
                                {item.explanations.map((exp, expIdx) => (
                                  <li key={expIdx} className="leading-relaxed">
                                    {exp}
                                  </li>
                                ))}
                              </ul>

                              {/* Detailed Rates Bar */}
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-slate-200/80 text-[11px]">
                                <div className="bg-white p-2 rounded border border-slate-200">
                                  <span className="text-slate-500 block">Taxa de Relevância:</span>
                                  <strong className="text-slate-800">{item.relevanceRatePct}%</strong>
                                </div>
                                <div className="bg-white p-2 rounded border border-slate-200">
                                  <span className="text-slate-500 block">Taxa High Match (85+):</span>
                                  <strong className="text-indigo-700">{item.rate85PlusPct}%</strong>
                                </div>
                                <div className="bg-white p-2 rounded border border-slate-200">
                                  <span className="text-slate-500 block">Taxa Excelente (90+):</span>
                                  <strong className="text-emerald-700">{item.rate90PlusPct}%</strong>
                                </div>
                                <div className="bg-white p-2 rounded border border-slate-200">
                                  <span className="text-slate-500 block">Janela da Amostra:</span>
                                  <strong className="text-slate-800">{item.timeframeLabel}</strong>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Aggregators Section (Adzuna) */}
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <h3 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-emerald-600" />
                  <span>Agregadores Nacionais (Adzuna)</span>
                </h3>

                <div className="border border-emerald-200 bg-emerald-50/40 rounded-lg p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm text-slate-900">{adzunaAnalytics.company}</span>
                      <span className="px-1.5 py-0.5 text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 rounded">
                        AGREGADOR MULTINACIONAL
                      </span>
                    </div>
                    <p className="text-slate-600 text-[11px]">
                      Coleta milhares de vagas publicadas em portais diversos. Analytics separado de empresas diretas.
                    </p>
                  </div>

                  <div className="flex items-center gap-4 bg-white px-3 py-2 rounded-lg border border-emerald-200 shrink-0">
                    <div className="text-center">
                      <span className="text-[9px] font-bold text-slate-500 uppercase block">VAGAS CARREGADAS</span>
                      <span className="font-black text-base text-emerald-800">{adzunaJobsCount}</span>
                    </div>
                    <div className="h-7 w-px bg-slate-200"></div>
                    <div className="text-center">
                      <span className="text-[9px] font-bold text-slate-500 uppercase block">CATEGORIA</span>
                      <span className="font-bold text-xs text-slate-700">Agregador</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* TAB 2: GERENCIADOR DE SEEDS (Greenhouse + Agregadores) */
            <div className="space-y-5">
              {/* Form Add/Edit */}
              <form onSubmit={handleSaveBoard} className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-xs text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-indigo-600" />
                    <span>{editingIndex !== null ? 'Editar Empresa Greenhouse' : 'Adicionar Empresa Greenhouse'}</span>
                  </h3>
                  {editingIndex !== null && (
                    <button
                      type="button"
                      onClick={resetForm}
                      className="text-xs text-slate-500 hover:text-slate-700 underline cursor-pointer"
                    >
                      Cancelar edição
                    </button>
                  )}
                </div>

                {formError && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded text-xs font-semibold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Nome da Empresa</label>
                    <input
                      type="text"
                      placeholder="Ex: Hotmart, Nubank..."
                      value={companyInput}
                      onChange={(e) => setCompanyInput(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Board Token (Greenhouse)</label>
                    <input
                      type="text"
                      placeholder="Ex: hotmartcareersbr, gympass"
                      value={boardTokenInput}
                      onChange={(e) => setBoardTokenInput(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white font-mono"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Prioridade da Empresa</label>
                    <select
                      value={priorityInput}
                      onChange={(e) => setPriorityInput(Number(e.target.value))}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white font-bold cursor-pointer"
                    >
                      <option value={1}>P1 — Estratégica (Altíssima)</option>
                      <option value={2}>P2 — Alta relevância</option>
                      <option value={3}>P3 — Complementar</option>
                    </select>
                  </div>

                  <div className="flex items-end">
                    <button
                      type="submit"
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-1.5 px-3 rounded transition flex items-center justify-center gap-1.5 cursor-pointer text-xs"
                    >
                      {editingIndex !== null ? <Edit2 className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                      <span>{editingIndex !== null ? 'Atualizar' : 'Adicionar'}</span>
                    </button>
                  </div>
                </div>

                <div className="bg-indigo-50/60 border border-indigo-100 rounded p-2.5 text-[11px] text-indigo-900 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-indigo-950">
                    <HelpCircle className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span>Como encontrar o Board Token?</span>
                  </div>
                  <p>
                    O <strong>Board Token</strong> é a parte da URL pública do Greenhouse após <code>job-boards.greenhouse.io/</code>.
                  </p>
                  <div className="font-mono text-[10px] bg-white px-2 py-1 rounded border border-indigo-200 text-slate-700">
                    URL: https://job-boards.greenhouse.io/<strong>hotmartcareersbr</strong> ➔ Board Token: <strong>hotmartcareersbr</strong>
                  </div>
                </div>
              </form>

              {/* Table Toolbar */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-indigo-600" />
                      <span>Watchlist de Empresas ({sortedManagerBoards.length} exibidas de {boards.length})</span>
                    </h3>

                    <div className="flex items-center gap-1.5 text-xs bg-slate-100 p-1 rounded-lg border border-slate-200">
                      <Filter className="w-3.5 h-3.5 text-slate-500 ml-1" />
                      <span className="text-[11px] text-slate-500 font-semibold">Prioridade:</span>
                      <select
                        value={priorityFilter}
                        onChange={(e) => setPriorityFilter(e.target.value as any)}
                        className="bg-white border border-slate-200 rounded px-2 py-0.5 text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
                      >
                        <option value="all">Todas as Prioridades</option>
                        <option value="p1">Somente P1 (Estratégicas)</option>
                        <option value="p1_p2">P1 + P2 (Estratégicas e Altas)</option>
                        <option value="p3">Somente P3 (Complementares)</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleValidateAll}
                    disabled={isValidatingAll || boards.length === 0}
                    className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-extrabold px-3 py-1.5 rounded transition text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs shrink-0"
                  >
                    {isValidatingAll ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Validando All Boards...</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>VALIDAR TODAS</span>
                      </>
                    )}
                  </button>
                </div>

                {sortedManagerBoards.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 border border-dashed border-slate-200 rounded-lg text-xs">
                    Nenhuma empresa encontrada com os filtros selecionados.
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-lg overflow-hidden text-xs">
                    <div className="bg-slate-900 text-slate-200 font-bold grid grid-cols-12 gap-2 px-3 py-2.5 text-[11px] uppercase tracking-wider">
                      <div className="col-span-3">Empresa & Token</div>
                      <div className="col-span-2">Prioridade & Yield</div>
                      <div className="col-span-2">Status</div>
                      <div className="col-span-3 grid grid-cols-5 text-center text-[10px]">
                        <span>TOTAL</span>
                        <span>BR/LATAM</span>
                        <span>RELEV.</span>
                        <span>85+</span>
                        <span>90+</span>
                      </div>
                      <div className="col-span-2 text-right">Ações</div>
                    </div>

                    <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                      {sortedManagerBoards.map((b) => {
                        const originalIndex = boards.findIndex(
                          (orig) => orig.boardToken.toLowerCase() === b.boardToken.toLowerCase()
                        );

                        return (
                          <div
                            key={b.boardToken}
                            className={`grid grid-cols-12 gap-2 px-3 py-2.5 items-center hover:bg-slate-50 transition ${
                              !b.enabled ? 'opacity-50 bg-slate-50/50' : ''
                            }`}
                          >
                            <div className="col-span-3 space-y-0.5">
                              <div className="font-extrabold text-slate-800 text-xs truncate">
                                {b.company}
                              </div>
                              <div className="font-mono text-[10px] text-slate-500 truncate">
                                {b.boardToken}
                              </div>
                            </div>

                            <div className="col-span-2 space-y-1">
                              <div>{renderPriorityBadge(b.priority)}</div>
                              {b.yieldScore !== undefined && b.yieldScore !== null ? (
                                <div className="text-[10px] font-extrabold text-indigo-700">
                                  Yield: {b.yieldScore}/100
                                </div>
                              ) : null}
                            </div>

                            <div className="col-span-2 space-y-0.5">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-black text-[10px] bg-slate-100 text-slate-800 border border-slate-200">
                                {b.lastStatus || 'NÃO TESTADO'}
                              </span>
                              {b.lastCheckedAt && (
                                <div className="text-[9px] text-slate-400 font-mono">
                                  {b.lastCheckedAt}
                                </div>
                              )}
                            </div>

                            <div className="col-span-3 grid grid-cols-5 text-center font-bold text-xs items-center">
                              <span className="text-slate-700">{b.metrics?.totalJobs ?? b.lastJobCount ?? '-'}</span>
                              <span className="text-emerald-700">{b.metrics?.brazilJobs ?? '-'}</span>
                              <span className="text-indigo-700">{b.metrics?.relevantJobs ?? '-'}</span>
                              <span className="text-amber-700">{b.metrics?.score85Plus ?? '-'}</span>
                              <span className="text-emerald-800 font-extrabold bg-emerald-50 px-1 py-0.5 rounded">
                                {b.metrics?.score90Plus ?? '-'}
                              </span>
                            </div>

                            <div className="col-span-2 flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => handleToggle(originalIndex)}
                                className={`px-1.5 py-0.5 rounded font-extrabold text-[10px] cursor-pointer transition ${
                                  b.enabled
                                    ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                    : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                                }`}
                              >
                                {b.enabled ? 'ON' : 'OFF'}
                              </button>

                              <button
                                type="button"
                                onClick={() => handleTestBoard(b.boardToken, b.company)}
                                disabled={testingToken === b.boardToken || isValidatingAll}
                                className="p-1 text-slate-500 hover:text-indigo-600 rounded hover:bg-indigo-50 cursor-pointer"
                              >
                                {testingToken === b.boardToken ? (
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                                ) : (
                                  <Radio className="w-3.5 h-3.5 text-indigo-500" />
                                )}
                              </button>

                              <button
                                type="button"
                                onClick={() => handleEdit(originalIndex)}
                                className="p-1 text-slate-500 hover:text-indigo-600 rounded hover:bg-slate-100 cursor-pointer"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleRemove(originalIndex)}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-slate-100 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded transition cursor-pointer"
          >
            Concluído
          </button>
        </div>
      </div>
    </div>
  );
};
