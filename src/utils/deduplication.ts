import { Job } from '../types';

/**
 * Normalizes a string by converting to lowercase, removing HTML tags, extra spaces, and special accents if needed.
 */
export function normalizeString(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/<[^>]*>/g, '') // strip HTML
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritical marks
    .replace(/[^a-z0-9]/g, ' ') // replace non-alphanumeric with spaces
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normalizes a URL for comparison (removes query parameters, trailing slashes, protocol)
 */
export function normalizeUrl(urlStr: string): string {
  if (!urlStr) return '';
  try {
    const parsed = new URL(urlStr);
    return (parsed.hostname + parsed.pathname).toLowerCase().replace(/\/+$/, '');
  } catch {
    return urlStr.toLowerCase().trim().replace(/\/+$/, '');
  }
}

export interface DeduplicationResult<T extends Job> {
  uniqueJobs: T[];
  duplicatesRemoved: number;
}

/**
 * Deduplicates an array of Jobs using URL as primary key and (company + title + location) as fallback.
 * When duplicates are found between sources (e.g. Adzuna + Greenhouse):
 * - Merges sources into job.sources (e.g. ['adzuna', 'greenhouse'])
 * - Prefers official Greenhouse URL
 * - Keeps the richest description
 */
export function deduplicateJobs<T extends Job>(jobs: T[]): DeduplicationResult<T> {
  const urlToJobMap = new Map<string, T>();
  const fallbackKeyToJobMap = new Map<string, T>();
  const uniqueJobs: T[] = [];
  let duplicatesRemoved = 0;

  for (const rawJob of jobs) {
    // Clone job to avoid mutating original objects unexpectedly
    const job: T = { ...rawJob };
    if (!job.sources) {
      job.sources = job.source ? [job.source] : ['unknown'];
    }

    const normUrl = normalizeUrl(job.url);
    const normCompany = normalizeString(job.company);
    const normTitle = normalizeString(job.title);
    const fallbackKey = `${normCompany}|${normTitle}`;

    let existingJob: T | undefined = undefined;

    if (normUrl && normUrl.length > 5 && urlToJobMap.has(normUrl)) {
      existingJob = urlToJobMap.get(normUrl);
    } else if (fallbackKey && fallbackKey.length > 3 && fallbackKeyToJobMap.has(fallbackKey)) {
      existingJob = fallbackKeyToJobMap.get(fallbackKey);
    }

    if (existingJob) {
      duplicatesRemoved++;

      // Merge sources
      const combinedSources = new Set<string>([
        ...(existingJob.sources || [existingJob.source || 'unknown']),
        ...(job.sources || [job.source || 'unknown']),
      ]);
      existingJob.sources = Array.from(combinedSources);

      // Prefer canonical ATS/Platform URLs (Pandapé, Sólides, Gupy, Greenhouse) over aggregators (Adzuna)
      const isPandape = job.source === 'pandape' || job.url.includes('pandape.infojobs.com.br');
      const isSolides = job.source === 'solides' || job.url.includes('solides.com.br') || job.url.includes('solides.jobs');
      const isGupy = job.source === 'gupy' || job.url.includes('gupy.io');
      const isGreenhouse = job.source === 'greenhouse' || job.url.includes('greenhouse.io');
      const existingIsAggregator =
        existingJob.source === 'adzuna' ||
        (!existingJob.url.includes('pandape.infojobs.com.br') &&
          !existingJob.url.includes('gupy.io') &&
          !existingJob.url.includes('greenhouse.io') &&
          !existingJob.url.includes('solides.com.br') &&
          !existingJob.url.includes('solides.jobs'));

      if (isPandape && existingIsAggregator) {
        existingJob.url = job.url;
        existingJob.source = 'pandape';
        existingJob.discovery_source = existingJob.discovery_source || 'pandape';
        if (job.salaryRange && !existingJob.salaryRange) {
          existingJob.salaryRange = job.salaryRange;
        }
      } else if (isSolides && existingIsAggregator) {
        existingJob.url = job.url;
        existingJob.source = 'solides';
        existingJob.discovery_source = existingJob.discovery_source || 'solides';
        if (job.companyLogo && !existingJob.companyLogo) {
          existingJob.companyLogo = job.companyLogo;
        }
        if (job.salaryRange && !existingJob.salaryRange) {
          existingJob.salaryRange = job.salaryRange;
        }
      } else if (isGupy && existingIsAggregator) {
        existingJob.url = job.url;
        existingJob.source = 'gupy';
        existingJob.discovery_source = existingJob.discovery_source || 'gupy';
        if (job.companyLogo && !existingJob.companyLogo) {
          existingJob.companyLogo = job.companyLogo;
        }
      } else if (isGreenhouse && existingIsAggregator) {
        existingJob.url = job.url;
        existingJob.source = 'greenhouse';
        existingJob.discovery_source = existingJob.discovery_source || 'greenhouse';
      }

      // Preserve longer/more complete description
      if (job.description && job.description.length > existingJob.description.length) {
        existingJob.description = job.description;
      }

      // Preserve geoCategory if existing lacks it
      if (!existingJob.geoCategory && job.geoCategory) {
        existingJob.geoCategory = job.geoCategory;
      }
    } else {
      urlToJobMap.set(normUrl, job);
      if (fallbackKey && fallbackKey.length > 3) {
        fallbackKeyToJobMap.set(fallbackKey, job);
      }
      uniqueJobs.push(job);
    }
  }

  return {
    uniqueJobs,
    duplicatesRemoved,
  };
}
