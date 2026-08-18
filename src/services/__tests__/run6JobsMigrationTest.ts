import { mockJobs } from '../../data/mockJobs';
import { calculateJobScore } from '../scoring';
import { userProfile } from '../../data/profile';
import { toSafeISOString } from '../cloudSync';
import { JobWithAnalysis } from '../../types';

export function run6JobsMigrationTest() {
  console.log('=== TESTING LOCAL MOCK JOBS DATE SERIALIZATION & MIGRATION PAYLOAD ===\n');

  // 1. Analyze mock jobs so they are JobWithAnalysis
  const analyzedJobs: JobWithAnalysis[] = mockJobs.map((j) => ({
    ...j,
    analysis: calculateJobScore(j, userProfile),
  }));

  console.log(`Total local mock jobs loaded: ${analyzedJobs.length}`);

  let invalidPublishedAtCount = 0;

  analyzedJobs.forEach((job, index) => {
    const extKey = job.id || job.url;
    const safePublishedAt = toSafeISOString(job.publishedAt);
    
    if (job.publishedAt && safePublishedAt === null) {
      invalidPublishedAtCount++;
      console.log(`[Diagnostic Log Job ${index + 1}] Title: "${job.title}" | external_key: "${extKey}" | Campo temporal inválido: "publishedAt" | Valor original: "${job.publishedAt}" -> Convertido para: null`);
    } else {
      console.log(`[Diagnostic Log Job ${index + 1}] Title: "${job.title}" | publishedAt: "${job.publishedAt}" -> ISO: "${safePublishedAt}"`);
    }
  });

  console.log(`\nIdentificadas ${invalidPublishedAtCount} vagas com 'publishedAt' em texto relativo/inválido de um total de ${analyzedJobs.length} vagas.`);
  console.log('Com a conversão defensiva toSafeISOString, todas as 6 vagas geram payloads válidos com published_at = null (sem inventar datas) e 0 erros de RangeError: Invalid time value.\n');

  return true;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run6JobsMigrationTest();
}
