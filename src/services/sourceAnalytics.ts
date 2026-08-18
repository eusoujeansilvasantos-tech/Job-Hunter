import { JobBoardSource, BoardMetrics, BoardStatus } from '../data/jobBoards';
import { Job } from '../types';

export type ConfidenceLevel = 'LOW' | 'MEDIUM' | 'HIGH';
export type SuggestedPriority = 1 | 2 | 3 | 'WATCH';
export type ProviderCategory = 'DIRECT_EMPLOYER' | 'AGGREGATOR';

export interface SourceAnalyticsResult {
  sourceKey: string;
  company: string;
  provider: 'greenhouse' | 'adzuna' | string;
  providerCategory: ProviderCategory;
  currentPriority: number;
  suggestedPriority: SuggestedPriority;
  status: BoardStatus;
  yieldScore: number | null; // null for EMPTY, INVALID, ERROR
  confidence: ConfidenceLevel;
  timeframeLabel: string; // e.g. "Última busca (Amostra atual)"
  metrics: BoardMetrics;
  relevanceRatePct: number; // 0-100%
  rate85PlusPct: number; // 0-100%
  rate90PlusPct: number; // 0-100%
  explanations: string[];
  previousMetrics?: BoardMetrics;
  previousYield?: number;
}

/**
 * Calculates Source Yield Score (0-100) based purely on source sample quality & efficiency.
 *
 * FORMULA SPECIFICATION:
 * Total Yield Score = Relevance Rate Score (30) + High Match Score (30) + Excellent Match Score (30) + Useful Volume Score (10)
 *
 * 1. Relevance Rate Score (0 - 30 pts):
 *    (relevantJobs / brazilJobs) * 30
 *
 * 2. High Match Rate Score (0 - 30 pts):
 *    (score85Plus / relevantJobs) * 30
 *
 * 3. Excellent Match Rate Score (0 - 30 pts):
 *    (score90Plus / relevantJobs) * 30
 *
 * 4. Useful Volume Score (0 - 10 pts):
 *    Math.min(10, (Math.log(1 + relevantJobs) / Math.log(11)) * 10)
 *    Logarithmic saturation curve ensures high quality sources with moderate volume (e.g., 10-15 relevant jobs)
 *    are not dominated by massive low-relevance boards.
 *
 * NOTE: Source Yield is 100% decoupled from individual job scoring in scoring.ts.
 * It NEVER modifies a job's match score.
 */
export function calculateSourceAnalytics(
  sourceKey: string,
  company: string,
  provider: string,
  currentPriority: number,
  status: BoardStatus,
  metrics: BoardMetrics,
  timeframeLabel: string = 'Última busca (Amostra atual)',
  previousMetrics?: BoardMetrics,
  previousYield?: number
): SourceAnalyticsResult {
  const providerCategory: ProviderCategory = provider === 'adzuna' ? 'AGGREGATOR' : 'DIRECT_EMPLOYER';

  // Handle EMPTY, INVALID, or ERROR states
  if (status === 'INVALID' || status === 'ERROR') {
    return {
      sourceKey,
      company,
      provider,
      providerCategory,
      currentPriority,
      suggestedPriority: 'WATCH',
      status,
      yieldScore: null,
      confidence: 'LOW',
      timeframeLabel,
      metrics,
      relevanceRatePct: 0,
      rate85PlusPct: 0,
      rate90PlusPct: 0,
      explanations: ['Fonte indisponível ou com erro de conexão.'],
      previousMetrics,
      previousYield,
    };
  }

  if (status === 'EMPTY' || metrics.brazilJobs === 0) {
    return {
      sourceKey,
      company,
      provider,
      providerCategory,
      currentPriority,
      suggestedPriority: 'WATCH',
      status: 'EMPTY',
      yieldScore: null,
      confidence: 'LOW',
      timeframeLabel,
      metrics,
      relevanceRatePct: 0,
      rate85PlusPct: 0,
      rate90PlusPct: 0,
      explanations: ['Sem vagas ativas no momento.'],
      previousMetrics,
      previousYield,
    };
  }

  // Calculate Rates
  const brJobs = metrics.brazilJobs;
  const relJobs = metrics.relevantJobs;
  const s85Jobs = metrics.score85Plus;
  const s90Jobs = metrics.score90Plus;

  const relevanceRate = Math.min(1.0, relJobs / brJobs);
  const rate85Plus = relJobs > 0 ? Math.min(1.0, s85Jobs / relJobs) : 0;
  const rate90Plus = relJobs > 0 ? Math.min(1.0, s90Jobs / relJobs) : 0;

  // Component Scores
  const relevanceScore = relevanceRate * 30;
  const highMatchScore = rate85Plus * 30;
  const excellentMatchScore = rate90Plus * 30;

  // Saturated Useful Volume Score (0 - 10 pts)
  // Maps 0 -> 0, 1 -> 2.89, 3 -> 5.78, 6 -> 8.11, >= 10 -> 10.0
  const usefulVolumeScore = relJobs === 0 ? 0 : Math.min(10, (Math.log(1 + relJobs) / Math.log(11)) * 10);

  const rawYield = relevanceScore + highMatchScore + excellentMatchScore + usefulVolumeScore;
  const yieldScore = Math.min(100, Math.round(rawYield));

  // Determine Confidence Level based on Brazil/LATAM sample size
  let confidence: ConfidenceLevel = 'LOW';
  if (brJobs >= 20) {
    confidence = 'HIGH';
  } else if (brJobs >= 5) {
    confidence = 'MEDIUM';
  }

  // Determine Suggested Priority based on Yield + Confidence
  let suggestedPriority: SuggestedPriority = 'WATCH';
  if (yieldScore >= 80 && (confidence === 'HIGH' || confidence === 'MEDIUM')) {
    suggestedPriority = 1; // P1 Estratégica
  } else if (yieldScore >= 60) {
    suggestedPriority = 2; // P2 Alta
  } else if (yieldScore >= 35) {
    suggestedPriority = 3; // P3 Complementar
  } else {
    suggestedPriority = 'WATCH';
  }

  // Generate deterministic explanation statements (NO LLM)
  const relPctStr = (relevanceRate * 100).toFixed(1);
  const s85PctStr = (rate85Plus * 100).toFixed(1);
  const s90PctStr = (rate90Plus * 100).toFixed(1);

  const explanations: string[] = [];

  if (s90Jobs > 0) {
    explanations.push(`${s90PctStr}% das vagas relevantes desta fonte tiveram compatibilidade excelente (90+).`);
  }

  if (s85Jobs > 0) {
    explanations.push(`${s85PctStr}% das vagas relevantes ficaram acima de 85 pontos.`);
  }

  explanations.push(`${relJobs} de ${brJobs} vagas (${relPctStr}%) foram consideradas relevantes para o seu perfil.`);

  if (confidence === 'HIGH') {
    explanations.push(`Alta confiança estatística baseada em ${brJobs} vagas Brasil/LATAM analisadas.`);
  } else if (confidence === 'MEDIUM') {
    explanations.push(`Confiança média baseada em amostra de ${brJobs} vagas Brasil/LATAM.`);
  } else {
    explanations.push(`Amostra reduzida (${brJobs} vagas Brasil/LATAM). Avaliação em observação.`);
  }

  return {
    sourceKey,
    company,
    provider,
    providerCategory,
    currentPriority,
    suggestedPriority,
    status: 'ACTIVE',
    yieldScore,
    confidence,
    timeframeLabel,
    metrics,
    relevanceRatePct: Math.round(relevanceRate * 100),
    rate85PlusPct: Math.round(rate85Plus * 100),
    rate90PlusPct: Math.round(rate90Plus * 100),
    explanations,
    previousMetrics,
    previousYield,
  };
}
