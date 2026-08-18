import {
  Job,
  JobWithAnalysis,
  ApplyPriorityClassification,
  ApplyPriorityBreakdown,
  ApplyPriorityResult,
  ApplyPriorityContext,
} from '../types';
import { classifyGeo, GeoCategory } from './geoClassifier';
import { toSafeISOString } from './cloudSync';

/**
 * Phase 3.2 — Apply Priority Engine
 *
 * Calculates how urgent/prioritised it is to apply to a job right NOW.
 * Decoupled from Match Score (does NOT recalculate match score, ATS coverage, or source yield).
 * Fast, deterministic, pure local function.
 */
export function calculateApplyPriority(
  job: Job | JobWithAnalysis,
  context?: ApplyPriorityContext
): ApplyPriorityResult {
  const analysis = (job as JobWithAnalysis).analysis;
  const matchScore = analysis?.score ?? 0;
  const status = job.status || 'NEW';

  const reasons: string[] = [];
  const warnings: string[] = [];
  const blockers: string[] = [];

  // 1. MATCH QUALITY — 30 PTS
  const matchComponent = Math.min(30, (matchScore / 100) * 30);
  if (matchScore >= 85) {
    reasons.push(`✓ Match técnico alto (${Math.round(matchScore)}%).`);
  } else if (matchScore < 70) {
    warnings.push(`⚠ Match técnico mediano (${Math.round(matchScore)}%).`);
  }

  // 2. ATS COVERAGE — 15 PTS
  const atsCoverage = context?.atsCoverage ?? matchScore;
  const atsComponent = Math.min(15, (atsCoverage / 100) * 15);
  if (atsCoverage >= 80) {
    reasons.push(`✓ ATS Cobertura excelente (${Math.round(atsCoverage)}%).`);
  } else if (atsCoverage < 65) {
    warnings.push(`⚠ Cobertura de palavras-chave ATS abaixo de 65%.`);
  }

  // 3. RECENCY — 15 PTS
  let recencyComponent = 6; // Default RECENCY_UNKNOWN
  const safePubDateStr = toSafeISOString(job.publishedAt);

  if (!safePubDateStr) {
    recencyComponent = 6; // Data desconhecida
    warnings.push('⚠ Data de publicação desconhecida ou não estruturada.');
  } else {
    const pubTime = new Date(safePubDateStr).getTime();
    const nowTime = Date.now();
    const diffMs = nowTime - pubTime;
    const diffDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

    if (diffDays <= 1) {
      recencyComponent = 15;
      reasons.push('✓ Vaga publicada recentemente (hoje / 24h).');
    } else if (diffDays <= 3) {
      recencyComponent = 13;
      reasons.push(`✓ Publicada há ${diffDays} dias.`);
    } else if (diffDays <= 7) {
      recencyComponent = 10;
      reasons.push(`✓ Publicada há ${diffDays} dias.`);
    } else if (diffDays <= 14) {
      recencyComponent = 7;
      warnings.push(`⚠ Publicada há ${diffDays} dias.`);
    } else if (diffDays <= 30) {
      recencyComponent = 4;
      warnings.push(`⚠ Publicada há ${diffDays} dias (pode ter volume alto de inscritos).`);
    } else {
      recencyComponent = 1;
      warnings.push(`⚠ Vaga antiga (${diffDays} dias desde a publicação).`);
    }
  }

  // 4. GEOGRAPHIC ELIGIBILITY — 10 PTS
  const geoCat: GeoCategory = job.geoCategory || classifyGeo(job.location || '', job.description || '');
  let geographyComponent = 0;

  switch (geoCat) {
    case 'BRAZIL':
    case 'REMOTE_BRAZIL':
      geographyComponent = 10;
      reasons.push('✓ Elegível para candidatos no Brasil.');
      break;
    case 'LATAM_COMPATIBLE':
      geographyComponent = 8;
      reasons.push('✓ Compatível com região LATAM.');
      break;
    case 'INTERNATIONAL_UNKNOWN':
      geographyComponent = 4;
      warnings.push('⚠ Localização internacional não confirmada para contratação remota no BR.');
      break;
    case 'NOT_COMPATIBLE':
      geographyComponent = 0;
      blockers.push('⛔ Vaga restrita para localização/região incompatível (ex: US-Only).');
      break;
  }

  // 5. ROLE / SENIORITY FIT — 10 PTS
  let roleFitComponent = 10;
  const seniorityScore = analysis?.breakdown?.seniorityScore ?? 10;
  const descLower = (job.description || '').toLowerCase();
  const titleLower = (job.title || '').toLowerCase();

  if (seniorityScore >= 8) {
    roleFitComponent = 10;
    reasons.push('✓ Senioridade do cargo totalmente compatível.');
  } else if (
    titleLower.includes('head') ||
    titleLower.includes('director') ||
    titleLower.includes('diretor') ||
    titleLower.includes('vp')
  ) {
    roleFitComponent = 2;
    warnings.push('⚠ Cargo executivo / diretoria com requisitos específicos de perfil.');
  } else if (
    titleLower.includes('lead') ||
    titleLower.includes('manager') ||
    titleLower.includes('gerente') ||
    job.seniority === 'Especialista' ||
    seniorityScore <= 4
  ) {
    roleFitComponent = 6;
    warnings.push('⚠ Exige alta senioridade ou liderança formal.');
  } else if (seniorityScore === 0) {
    roleFitComponent = 0;
    warnings.push('⚠ Descompasso relevante de nível de senioridade.');
  }

  // 6. CRITICAL GAPS — 10 PTS
  let criticalGapsComponent = 10;
  const gaps = analysis?.gaps || [];

  // Check for hard mandatory language/certification gaps
  const requiredCriticalGap = gaps.find((g) => {
    const gLower = g.toLowerCase();
    return (
      (gLower.includes('inglês') && (descLower.includes('fluent english required') || descLower.includes('inglês fluente obrigatório'))) ||
      gLower.includes('certificação obrigatória')
    );
  });

  if (requiredCriticalGap) {
    criticalGapsComponent = 0;
    blockers.push(`⛔ Requisito mandatório ausente: ${requiredCriticalGap}`);
  } else if (gaps.length === 0) {
    criticalGapsComponent = 10;
    reasons.push('✓ Nenhum gap obrigatório crítico identificado.');
  } else if (gaps.length === 1) {
    criticalGapsComponent = 7;
    warnings.push(`⚠ 1 gap importante identificado (${gaps[0]}).`);
  } else {
    criticalGapsComponent = 4;
    warnings.push(`⚠ ${gaps.length} gaps identificados no perfil.`);
  }

  // 7. SOURCE QUALITY — 5 PTS
  let sourceComponent = 3; // Default neutral for unknown yield
  const yieldScore = context?.sourceYield;

  if (yieldScore !== undefined && yieldScore !== null) {
    if (yieldScore >= 80) {
      sourceComponent = 5;
      reasons.push('✓ Fonte de alta conversão (Source Yield 80+).');
    } else if (yieldScore >= 60) {
      sourceComponent = 4;
    } else if (yieldScore >= 40) {
      sourceComponent = 3;
    } else {
      sourceComponent = 2;
      warnings.push('⚠ Fonte com histórico baixo de conversão.');
    }
  }

  // 8. APPLICATION STATE / URGENCY — 5 PTS
  let urgencyComponent = 5;
  if (status === 'NEW' || status === 'PREPARED') {
    urgencyComponent = 5;
    reasons.push('✓ Candidatura ainda não enviada (oportunidade aberta).');
  } else {
    urgencyComponent = 0;
  }

  // Sum Component Scores
  const rawTotal =
    matchComponent +
    atsComponent +
    recencyComponent +
    geographyComponent +
    roleFitComponent +
    criticalGapsComponent +
    sourceComponent +
    urgencyComponent;

  const score = Math.min(100, Math.max(0, Math.round(rawTotal)));

  const breakdown: ApplyPriorityBreakdown = {
    matchComponent: Math.round(matchComponent * 10) / 10,
    atsComponent: Math.round(atsComponent * 10) / 10,
    recencyComponent: Math.round(recencyComponent * 10) / 10,
    geographyComponent: Math.round(geographyComponent * 10) / 10,
    roleFitComponent: Math.round(roleFitComponent * 10) / 10,
    criticalGapsComponent: Math.round(criticalGapsComponent * 10) / 10,
    sourceComponent: Math.round(sourceComponent * 10) / 10,
    urgencyComponent: Math.round(urgencyComponent * 10) / 10,
    total: score,
  };

  // Determine Classification (Special Statuses take visual priority)
  let classification: ApplyPriorityClassification;

  if (status === 'APPLIED') {
    classification = 'ALREADY APPLIED';
  } else if (status === 'INTERVIEW') {
    classification = 'IN INTERVIEW';
  } else if (status === 'OFFER') {
    classification = 'OFFER';
  } else if (status === 'REJECTED') {
    classification = 'REJECTED';
  } else if (blockers.length > 0) {
    classification = 'NOT ELIGIBLE';
  } else if (score >= 90) {
    classification = 'APPLY NOW';
  } else if (score >= 80) {
    classification = 'HIGH PRIORITY';
  } else if (score >= 65) {
    classification = 'REVIEW';
  } else if (score >= 50) {
    classification = 'LOW PRIORITY';
  } else {
    classification = 'SKIP / VERY LOW';
  }

  return {
    score,
    classification,
    breakdown,
    reasons,
    warnings,
    blockers,
  };
}
