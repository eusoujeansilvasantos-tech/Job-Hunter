import { Job } from '../types';

export type ResumeLanguage = 'pt-BR' | 'en';

export const PORTUGUESE_DETECTION_KEYWORDS = [
  'de',
  'para',
  'com',
  'experiência',
  'experiencia',
  'cliente',
  'clientes',
  'vaga',
  'requisitos',
  'responsabilidades',
  'conhecimento',
  'gestão',
  'gestao',
  'atendimento',
  'equipe',
  'empresa',
  'atuação',
  'atuacao',
];

export const ENGLISH_DETECTION_KEYWORDS = [
  'the',
  'and',
  'with',
  'experience',
  'customer',
  'customers',
  'requirements',
  'responsibilities',
  'skills',
  'management',
  'support',
  'role',
  'company',
  'team',
  'opportunity',
  'working',
];

/**
 * Calculates deterministic language score (PT vs EN) based on title and description keywords.
 */
export function calculateTextLanguageScores(text: string): { scorePt: number; scoreEn: number } {
  const normalized = text.toLowerCase();
  
  let scorePt = 0;
  let scoreEn = 0;

  PORTUGUESE_DETECTION_KEYWORDS.forEach((kw) => {
    const regex = new RegExp(`\\b${kw}\\b`, 'gi');
    const matches = normalized.match(regex);
    if (matches) {
      scorePt += matches.length;
    }
  });

  ENGLISH_DETECTION_KEYWORDS.forEach((kw) => {
    const regex = new RegExp(`\\b${kw}\\b`, 'gi');
    const matches = normalized.match(regex);
    if (matches) {
      scoreEn += matches.length;
    }
  });

  return { scorePt, scoreEn };
}

/**
 * Detects whether a job's tailored resume should be generated in Portuguese ('pt-BR') or English ('en').
 * Deterministic priorities:
 * 1. Manual override (if set)
 * 2. Text language detection (Rule 3: English job description in Brazil => EN)
 * 3. Geo classification rules
 */
export function detectResumeLanguage(
  job: Partial<Job> & { resumeLanguageOverride?: ResumeLanguage | 'auto' }
): ResumeLanguage {
  // Manual override check
  if (job.resumeLanguageOverride === 'pt-BR') return 'pt-BR';
  if (job.resumeLanguageOverride === 'en') return 'en';

  const textToScan = `${job.title || ''} ${job.description || ''}`;
  const { scorePt, scoreEn } = calculateTextLanguageScores(textToScan);

  const geo = job.geoCategory;

  // Rule 3: International company in Brazil with description predominantly in English
  // Job language has higher weight than location.
  if (scoreEn > scorePt) {
    return 'en';
  }

  // Rule 4: LATAM or International, but description clearly in Portuguese
  if (scorePt > scoreEn) {
    return 'pt-BR';
  }

  // Fallbacks if scores are tied
  if (geo === 'LATAM_COMPATIBLE' || geo === 'INTERNATIONAL_UNKNOWN') {
    return 'en';
  }

  return 'pt-BR';
}
