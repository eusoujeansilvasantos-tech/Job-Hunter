import { Job, SeniorityLevel, WorkplaceType } from '../types';
import { classifyGeo } from './geoClassifier';
import { JobBoardSource, BoardStatus, BoardMetrics } from '../data/jobBoards';
import { calculateJobScore } from './scoring';
import { userProfile } from '../data/profile';
import { calculateSourceAnalytics } from './sourceAnalytics';
import { syncSourceSnapshot } from './cloudSync';

export interface GreenhouseRawJob {
  id: number | string;
  internal_job_id?: number;
  title: string;
  location?: { name?: string };
  absolute_url: string;
  updated_at?: string;
  created_at?: string;
  content?: string;
  departments?: Array<{ id: number; name: string }>;
  offices?: Array<{ id: number; name: string; location?: string }>;
}

export interface GreenhouseFetchResult {
  boardToken: string;
  company: string;
  ok: boolean;
  httpStatus: number;
  jobs: Job[];
  rawCount: number;
  status: BoardStatus;
  metrics?: BoardMetrics;
  error?: string;
}

export interface BoardTestResult {
  ok: boolean;
  status: BoardStatus;
  httpStatus: number;
  jobCount: number;
  company?: string;
  metrics?: BoardMetrics;
  error?: string;
}

/**
 * Clean HTML tags from a string.
 */
function cleanText(text: string): string {
  if (!text) return '';
  return text
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Infer WorkplaceType from job title and description
 */
function inferWorkplaceType(title: string, description: string, location: string): WorkplaceType {
  const locLower = (location || '').toLowerCase();
  const titleLower = (title || '').toLowerCase();
  const descLower = (description || '').toLowerCase();
  const combined = `${titleLower} ${locLower} ${descLower}`;

  if (
    locLower.includes('híbrido') ||
    locLower.includes('hibrido') ||
    locLower.includes('hybrid') ||
    titleLower.includes('híbrido') ||
    titleLower.includes('hibrido') ||
    titleLower.includes('hybrid') ||
    descLower.includes('modelo híbrido') ||
    descLower.includes('modelo hibrido') ||
    descLower.includes('trabalho híbrido') ||
    descLower.includes('trabalho hibrido') ||
    descLower.includes('regime híbrido') ||
    descLower.includes('regime hibrido')
  ) {
    return 'Híbrido';
  }

  if (
    locLower.includes('remoto') ||
    locLower.includes('remote') ||
    locLower.includes('home office') ||
    locLower.includes('teletrabalho') ||
    titleLower.includes('remoto') ||
    titleLower.includes('remote') ||
    titleLower.includes('home office') ||
    descLower.includes('100% remoto') ||
    descLower.includes('100% remote') ||
    descLower.includes('totalmente remoto') ||
    descLower.includes('vaga remota') ||
    descLower.includes('trabalho remoto') ||
    descLower.includes('regime remoto')
  ) {
    return 'Remoto';
  }

  return 'Presencial';
}

/**
 * Infer SeniorityLevel from job title and description
 */
function inferSeniority(title: string, description: string): SeniorityLevel {
  const combined = `${title} ${description}`.toLowerCase();
  if (combined.includes('estágio') || combined.includes('estagio') || combined.includes('intern')) {
    return 'Estágio';
  }
  if (combined.includes('junior') || combined.includes('júnior') || combined.includes('jr')) {
    return 'Júnior';
  }
  if (
    combined.includes('lead') ||
    combined.includes('lider') ||
    combined.includes('líder') ||
    combined.includes('gerente') ||
    combined.includes('head') ||
    combined.includes('coordenador') ||
    combined.includes('manager')
  ) {
    return 'Liderança';
  }
  if (
    combined.includes('especialista') ||
    combined.includes('specialist') ||
    combined.includes('principal') ||
    combined.includes('architect')
  ) {
    return 'Especialista';
  }
  if (combined.includes('senior') || combined.includes('sênior') || combined.includes('sr')) {
    return 'Sênior';
  }
  return 'Pleno';
}

/**
 * Extract key requirements from title and description
 */
function extractRequirements(title: string, description: string): string[] {
  const commonTech = [
    'Customer Success', 'CSM', 'Onboarding', 'SaaS', 'SQL', 'Power BI', 'Excel',
    'Churn', 'NPS', 'HubSpot', 'Salesforce', 'Zendesk', 'Gainsight', 'CRM',
    'Python', 'React', 'Node.js', 'PostgreSQL', 'API', 'Análise de Dados',
    'Inglês Fluente', 'Espanhol', 'Gestão de Contas', 'Retenção'
  ];

  const reqs = new Set<string>();
  const combined = `${title} ${description}`.toLowerCase();

  for (const tech of commonTech) {
    if (combined.includes(tech.toLowerCase())) {
      reqs.add(tech);
    }
  }

  if (reqs.size === 0) {
    reqs.add('Customer Success / Atendimento B2B');
    reqs.add('Análise de Métricas & Retenção');
  }

  return Array.from(reqs).slice(0, 8);
}

/**
 * Normalizes a Greenhouse job into internal Job model.
 */
export function normalizeGreenhouseJob(ghJob: GreenhouseRawJob, companyName: string, boardToken: string): Job {
  const title = cleanText(ghJob.title || 'Vaga Sem Título');
  const description = cleanText(ghJob.content || 'Descrição não fornecida.');
  const location = cleanText(ghJob.location?.name || 'Remoto / Brasil');

  let pubDateStr = new Date().toISOString().split('T')[0];
  const rawDate = ghJob.updated_at || ghJob.created_at;
  if (rawDate) {
    try {
      const d = new Date(rawDate);
      if (!isNaN(d.getTime())) {
        pubDateStr = d.toISOString().split('T')[0];
      }
    } catch {
      // fallback to today
    }
  }

  const geoCategory = classifyGeo(location, description);

  return {
    id: `greenhouse-${boardToken}-${ghJob.id}`,
    title,
    company: companyName,
    location,
    workplaceType: inferWorkplaceType(title, description, location),
    seniority: inferSeniority(title, description),
    description,
    requirements: extractRequirements(title, description),
    url: ghJob.absolute_url || `https://boards.greenhouse.io/${boardToken}/jobs/${ghJob.id}`,
    publishedAt: pubDateStr,
    source: 'greenhouse',
    sources: ['greenhouse'],
    geoCategory,
  };
}

/**
 * Calculate per-board metrics from normalized jobs array
 */
export function computeBoardMetrics(jobs: Job[]): BoardMetrics {
  const totalJobs = jobs.length;
  let brazilJobs = 0;
  let relevantJobs = 0;
  let score85Plus = 0;
  let score90Plus = 0;

  for (const j of jobs) {
    const isBr = (j.geoCategory === 'BRAZIL' || j.geoCategory === 'REMOTE_BRAZIL' || j.geoCategory === 'LATAM_COMPATIBLE');
    if (isBr) brazilJobs++;

    const analysis = calculateJobScore(j, userProfile);
    if (isBr && analysis.score >= 60) relevantJobs++;
    if (isBr && analysis.score >= 85) score85Plus++;
    if (isBr && analysis.score >= 90) score90Plus++;
  }

  return {
    totalJobs,
    brazilJobs,
    relevantJobs,
    score85Plus,
    score90Plus,
  };
}

/**
 * Fetches jobs for a single Greenhouse board with content=true for full metrics computation.
 */
export async function fetchGreenhouseBoardJobs(board: JobBoardSource): Promise<GreenhouseFetchResult> {
  const token = board.boardToken.trim().toLowerCase();
  const url = `https://boards-api.greenhouse.io/v1/boards/${token}/jobs?content=true`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const is404 = response.status === 404;
      return {
        boardToken: token,
        company: board.company,
        ok: false,
        httpStatus: response.status,
        jobs: [],
        rawCount: 0,
        status: is404 ? 'INVALID' : 'ERROR',
        error: is404 ? 'Job board não encontrado (404).' : `HTTP ${response.status}`,
      };
    }

    const data = await response.json();
    const rawJobs: GreenhouseRawJob[] = data.jobs || [];
    const jobCount = rawJobs.length;
    const status: BoardStatus = jobCount > 0 ? 'ACTIVE' : 'EMPTY';

    const normalized = rawJobs.map((raw) => normalizeGreenhouseJob(raw, board.company, token));
    const metrics = computeBoardMetrics(normalized);

    return {
      boardToken: token,
      company: board.company,
      ok: true,
      httpStatus: response.status,
      jobs: normalized,
      rawCount: jobCount,
      status,
      metrics,
    };
  } catch (err: any) {
    return {
      boardToken: token,
      company: board.company,
      ok: false,
      httpStatus: 0,
      jobs: [],
      rawCount: 0,
      status: 'ERROR',
      error: err.name === 'AbortError' ? 'Timeout' : err.message || 'Erro de conexão',
    };
  }
}

/**
 * Tests a Greenhouse board token by performing a GET request to the public board API with content=true.
 */
export async function testGreenhouseBoard(boardToken: string, companyName?: string): Promise<BoardTestResult> {
  if (!boardToken || !boardToken.trim()) {
    return { ok: false, status: 'INVALID', httpStatus: 400, jobCount: 0, error: 'Token do Board vazio.' };
  }

  const dummyBoard: JobBoardSource = {
    company: companyName || boardToken,
    provider: 'greenhouse',
    boardToken: boardToken.trim(),
    enabled: true,
    priority: 1,
    origin: 'user',
  };

  const fetchRes = await fetchGreenhouseBoardJobs(dummyBoard);

  return {
    ok: fetchRes.ok,
    status: fetchRes.status,
    httpStatus: fetchRes.httpStatus,
    jobCount: fetchRes.rawCount,
    company: fetchRes.company,
    metrics: fetchRes.metrics,
    error: fetchRes.error,
  };
}

/**
 * Validates multiple Greenhouse boards in real time with concurrency limit (5 at a time).
 * Returns updated board sources with lastCheckedAt, lastJobCount, lastStatus, and metrics.
 */
export async function validateAllBoards(
  boards: JobBoardSource[],
  onProgress?: (token: string, result: BoardTestResult) => void
): Promise<JobBoardSource[]> {
  const updatedBoards = [...boards];
  const concurrencyLimit = 5;
  const nowStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  for (let i = 0; i < updatedBoards.length; i += concurrencyLimit) {
    const chunk = updatedBoards.slice(i, i + concurrencyLimit);
    const results = await Promise.all(
      chunk.map(async (board) => {
        const testRes = await testGreenhouseBoard(board.boardToken, board.company);
        if (onProgress) onProgress(board.boardToken, testRes);
        return { boardToken: board.boardToken, testRes };
      })
    );

    for (const item of results) {
      const index = updatedBoards.findIndex(
        (b) => b.boardToken.toLowerCase() === item.boardToken.toLowerCase()
      );
      if (index !== -1) {
        const boardObj = updatedBoards[index];
        const defaultM = item.testRes.metrics || {
          totalJobs: item.testRes.jobCount,
          brazilJobs: 0,
          relevantJobs: 0,
          score85Plus: 0,
          score90Plus: 0,
        };

        const analytics = calculateSourceAnalytics(
          item.boardToken,
          boardObj.company,
          'greenhouse',
          boardObj.priority,
          item.testRes.status,
          defaultM,
          `Validação (${nowStr})`,
          boardObj.metrics,
          boardObj.yieldScore ?? undefined
        );

        updatedBoards[index] = {
          ...boardObj,
          lastCheckedAt: nowStr,
          lastJobCount: item.testRes.jobCount,
          lastStatus: item.testRes.status,
          metrics: defaultM,
          yieldScore: analytics.yieldScore,
          confidence: analytics.confidence,
          suggestedPriority: analytics.suggestedPriority,
          explanations: analytics.explanations,
        };

        // Sync Source Yield Snapshot to Supabase in background (Rule 21)
        syncSourceSnapshot({
          sourceName: boardObj.company,
          provider: 'greenhouse',
          boardToken: boardObj.boardToken,
          totalJobs: defaultM.totalJobs,
          brazilLatamJobs: defaultM.brazilJobs,
          relevantJobs: defaultM.relevantJobs,
          jobs85Plus: defaultM.score85Plus,
          jobs90Plus: defaultM.score90Plus,
          yieldScore: analytics.yieldScore,
          confidence: analytics.confidence,
          currentPriority: boardObj.priority,
          suggestedPriority: analytics.suggestedPriority,
        }).catch((err) => {
          console.warn('[CloudSync] Snapshot background sync notice:', err);
        });
      }
    }
  }


  return updatedBoards;
}

/**
 * Fetches jobs from multiple Greenhouse boards with concurrency limit (e.g. 5 at a time).
 */
export async function fetchAllGreenhouseJobs(boards: JobBoardSource[]): Promise<{
  jobs: Job[];
  boardsChecked: number;
  boardsSuccessful: number;
  boardsFailed: number;
  rawJobsCount: number;
}> {
  const enabledBoards = boards.filter((b) => b.enabled);
  if (enabledBoards.length === 0) {
    return {
      jobs: [],
      boardsChecked: 0,
      boardsSuccessful: 0,
      boardsFailed: 0,
      rawJobsCount: 0,
    };
  }

  const concurrencyLimit = 5;
  const results: GreenhouseFetchResult[] = [];

  for (let i = 0; i < enabledBoards.length; i += concurrencyLimit) {
    const chunk = enabledBoards.slice(i, i + concurrencyLimit);
    const chunkResults = await Promise.all(chunk.map((b) => fetchGreenhouseBoardJobs(b)));
    results.push(...chunkResults);
  }

  let boardsSuccessful = 0;
  let boardsFailed = 0;
  let rawJobsCount = 0;
  const allNormalizedJobs: Job[] = [];

  for (const res of results) {
    if (res.ok) {
      boardsSuccessful++;
      rawJobsCount += res.rawCount;
      allNormalizedJobs.push(...res.jobs);
    } else {
      boardsFailed++;
    }
  }

  return {
    jobs: allNormalizedJobs,
    boardsChecked: enabledBoards.length,
    boardsSuccessful,
    boardsFailed,
    rawJobsCount,
  };
}
