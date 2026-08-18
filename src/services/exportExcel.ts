import * as XLSX from 'xlsx';
import { JobWithAnalysis, UserProfile } from '../types';
import { getJobStatus, STATUS_LABELS } from './applicationStatus';
import { generateTailoredResume } from './resume';

export function exportJobsToExcel(jobs: JobWithAnalysis[], profile: UserProfile): void {
  const dataRows = jobs.map((job) => {
    const status = getJobStatus(job);
    const statusLabel = STATUS_LABELS[status] || 'Nova';

    // Calculate ATS coverage and keywords breakdown
    const tailored = generateTailoredResume(job, profile);

    const matchedStr = tailored.atsKeywords.matched.join('; ');
    const relatedStr = tailored.atsKeywords.related
      .map((r) => `${r.jobKeyword} → ${r.candidateEquivalent}`)
      .join('; ');
    const missingStr = tailored.atsKeywords.missing.join('; ');

    return {
      'Empresa': job.company,
      'Cargo': job.title,
      'Localização': job.location,
      'Sênioridade': job.seniority,
      'Modelo': job.workplaceType,
      'Data de Publicação': job.publishedAt,
      'Fonte': job.source || 'Adzuna',
      'URL Vaga': job.url,
      'Score Geral (%)': job.analysis.score,
      'Classificação': job.analysis.classification,
      'ATS Coverage (%)': tailored.atsCoverageScore,
      'Matched Keywords': matchedStr || 'Nenhum',
      'Related Keywords': relatedStr || 'Nenhum',
      'Missing Keywords (Lacunas)': missingStr || 'Nenhuma',
      'Status Candidatura': statusLabel,
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(dataRows);

  // Set column widths for comfortable reading
  const colWidths = [
    { wch: 22 }, // Empresa
    { wch: 30 }, // Cargo
    { wch: 20 }, // Localização
    { wch: 12 }, // Sênioridade
    { wch: 12 }, // Modelo
    { wch: 15 }, // Data
    { wch: 12 }, // Fonte
    { wch: 45 }, // URL Vaga
    { wch: 14 }, // Score Geral
    { wch: 18 }, // Classificação
    { wch: 16 }, // ATS Coverage
    { wch: 35 }, // Matched
    { wch: 35 }, // Related
    { wch: 35 }, // Missing
    { wch: 16 }, // Status
  ];
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Vagas Job Hunter');

  const nowStr = new Date().toISOString().slice(0, 10);
  const filename = `Job_Hunter_Vagas_${nowStr}.xlsx`;

  XLSX.writeFile(workbook, filename);
}
