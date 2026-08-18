export type BoardStatus = 'UNKNOWN' | 'CHECKING' | 'ACTIVE' | 'EMPTY' | 'INVALID' | 'ERROR';

export interface BoardMetrics {
  totalJobs: number;
  brazilJobs: number;
  relevantJobs: number;
  score85Plus: number;
  score90Plus: number;
}

export interface JobBoardSource {
  company: string;
  provider: 'greenhouse';
  boardToken: string;
  enabled: boolean;
  priority: number; // 1 = P1 (Estratégica), 2 = P2 (Alta), 3 = P3 (Complementar)
  origin: 'verified_seed' | 'user';
  lastCheckedAt?: string;
  lastJobCount?: number;
  lastStatus?: BoardStatus;
  metrics?: BoardMetrics;
  yieldScore?: number | null;
  confidence?: 'LOW' | 'MEDIUM' | 'HIGH';
  suggestedPriority?: 1 | 2 | 3 | 'WATCH';
  explanations?: string[];
  previousMetrics?: BoardMetrics;
  previousYield?: number;
}

export const LOCAL_STORAGE_BOARDS_KEY = 'job_hunter_greenhouse_boards_v2';

/**
 * Verified seed list of Greenhouse job boards strictly validated for Brazil / LATAM / Remote.
 */
export const DEFAULT_GREENHOUSE_BOARDS: JobBoardSource[] = [
  // Priority 1 - Estratégica
  { company: 'Nubank', provider: 'greenhouse', boardToken: 'nubank', enabled: true, priority: 1, origin: 'verified_seed' },
  { company: 'QuintoAndar', provider: 'greenhouse', boardToken: 'quintoandar', enabled: true, priority: 1, origin: 'verified_seed' },
  { company: 'Stone', provider: 'greenhouse', boardToken: 'stone', enabled: true, priority: 1, origin: 'verified_seed' },
  { company: 'RD Station', provider: 'greenhouse', boardToken: 'rdstation', enabled: true, priority: 1, origin: 'verified_seed' },
  { company: 'SumUp', provider: 'greenhouse', boardToken: 'sumup', enabled: true, priority: 1, origin: 'verified_seed' },
  { company: 'Hotmart', provider: 'greenhouse', boardToken: 'hotmartcareersbr', enabled: true, priority: 1, origin: 'verified_seed' },
  { company: 'Wellhub', provider: 'greenhouse', boardToken: 'gympass', enabled: true, priority: 1, origin: 'verified_seed' },
  { company: 'Signifyd', provider: 'greenhouse', boardToken: 'signifyd95', enabled: true, priority: 1, origin: 'verified_seed' },
  { company: 'Cobre', provider: 'greenhouse', boardToken: 'cobre', enabled: true, priority: 1, origin: 'verified_seed' },

  // Priority 2 - Alta
  { company: 'Wildlife Studios', provider: 'greenhouse', boardToken: 'wildlifestudios', enabled: true, priority: 2, origin: 'verified_seed' },
  { company: 'GitLab', provider: 'greenhouse', boardToken: 'gitlab', enabled: true, priority: 2, origin: 'verified_seed' },
  { company: 'Geotab', provider: 'greenhouse', boardToken: 'geotab', enabled: true, priority: 2, origin: 'verified_seed' },
  { company: 'Nortal', provider: 'greenhouse', boardToken: 'nortal', enabled: true, priority: 2, origin: 'verified_seed' },
  { company: 'Blip', provider: 'greenhouse', boardToken: 'blip-global', enabled: true, priority: 2, origin: 'verified_seed' },

  // Priority 3 - Relevância complementar
  { company: 'AB InBev Growth Group', provider: 'greenhouse', boardToken: 'abinbev', enabled: true, priority: 3, origin: 'verified_seed' },
  { company: 'Monster Energy LATAM', provider: 'greenhouse', boardToken: 'monsterenergylatam', enabled: true, priority: 3, origin: 'verified_seed' },
];

const UNVERIFIED_LEGACY_TOKENS = new Set([
  'loggi',
  'vtex',
  'remotecom',
  'abridge',
  'pismo',
]);

/**
 * Retrieves configured job boards from localStorage, purging unverified legacy seeds
 * and ensuring all verified seeds and user-created boards are correctly loaded.
 */
export function getStoredJobBoards(): JobBoardSource[] {
  if (typeof window === 'undefined' || !window.localStorage) {
    return DEFAULT_GREENHOUSE_BOARDS;
  }

  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_BOARDS_KEY);
    if (!raw) {
      // Check if v1 key exists for backward compatibility
      const oldRaw = localStorage.getItem('job_hunter_greenhouse_boards_v1');
      if (!oldRaw) return DEFAULT_GREENHOUSE_BOARDS;
    }

    const jsonStr = raw || localStorage.getItem('job_hunter_greenhouse_boards_v1');
    if (!jsonStr) return DEFAULT_GREENHOUSE_BOARDS;

    const parsed: JobBoardSource[] = JSON.parse(jsonStr);
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_GREENHOUSE_BOARDS;

    const cleanedBoards: JobBoardSource[] = [];

    for (const board of parsed) {
      const lowerToken = (board.boardToken || '').toLowerCase().trim();

      // If it's an old unverified seed without 'user' origin, remove it
      if (UNVERIFIED_LEGACY_TOKENS.has(lowerToken) && board.origin !== 'user') {
        continue;
      }

      const seedMatch = DEFAULT_GREENHOUSE_BOARDS.find(
        (seed) => seed.boardToken.toLowerCase() === lowerToken
      );

      cleanedBoards.push({
        ...board,
        company: board.company || seedMatch?.company || lowerToken,
        boardToken: lowerToken,
        priority: board.priority || seedMatch?.priority || 1,
        origin: board.origin || (seedMatch ? 'verified_seed' : 'user'),
      });
    }

    // Ensure all verified default seeds exist in the list
    for (const seed of DEFAULT_GREENHOUSE_BOARDS) {
      const exists = cleanedBoards.some(
        (b) => b.boardToken.toLowerCase() === seed.boardToken.toLowerCase()
      );
      if (!exists) {
        cleanedBoards.push(seed);
      }
    }

    return cleanedBoards;
  } catch (err) {
    console.error('Error loading job boards from localStorage:', err);
    return DEFAULT_GREENHOUSE_BOARDS;
  }
}

/**
 * Saves job boards list to localStorage.
 */
export function saveJobBoards(boards: JobBoardSource[]): void {
  if (typeof window === 'undefined' || !window.localStorage) return;

  try {
    localStorage.setItem(LOCAL_STORAGE_BOARDS_KEY, JSON.stringify(boards));
  } catch (err) {
    console.error('Error saving job boards to localStorage:', err);
  }
}
