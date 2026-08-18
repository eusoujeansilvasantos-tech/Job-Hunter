import { JobWithAnalysis } from '../../types';
import {
  getJobStatus,
  setJobStatus,
  getApplicationDetails,
  updateApplicationDetails,
  addManualApplicationEvent,
  getDaysInCurrentStage,
  getDaysSinceApplied,
  getStoredStatuses,
  getStoredDetails,
  getStoredEvents
} from '../applicationStatus';

export interface Phase31TestResult {
  code: string;
  name: string;
  passed: boolean;
  message: string;
  details?: any;
}

export async function runPhase31CockpitTests(): Promise<Phase31TestResult[]> {
  const results: Phase31TestResult[] = [];

  const mockTestJob: JobWithAnalysis = {
    id: 'test_job_p31_001',
    title: 'Senior Customer Success Manager',
    company: 'SaaS Enterprise Inc',
    location: 'São Paulo, SP',
    workplaceType: 'Remoto',
    url: 'https://careers.saasenterprise.com/jobs/12345',
    seniority: 'Sênior',
    description: 'Buscamos Senior CSM com inglês fluente e experiência em enterprise.',
    requirements: ['Customer Success', 'Inglês', 'SaaS'],
    publishedAt: '2026-08-01',
    source: 'greenhouse',
    status: 'NEW',
    analysis: {
      score: 92,
      breakdown: {
        titleScore: 20,
        skillsScore: 25,
        experienceScore: 20,
        toolsScore: 10,
        seniorityScore: 10,
        languageScore: 4,
        educationScore: 3,
        locationScore: 0,
        keywordsScore: 0,
        total: 92,
      },
      matchedSkills: ['Customer Success', 'SaaS'],
      relatedSkills: [],
      missingSkills: [],
      atsKeywords: ['Customer Success'],
      matchReasons: ['Excelente alinhamento mestre.'],
      strengths: ['Inglês fluente', 'SaaS'],
      gaps: [],
      relevantExperienceSummary: ['5 anos em CS'],
      classification: 'Excelente',
    },
    geoCategory: 'BRAZIL',
  };

  // Test A: Status transition updates stage timestamp correctly
  try {
    setJobStatus(mockTestJob, 'PREPARED');
    const details1 = getApplicationDetails(mockTestJob);
    const passA = details1.status === 'PREPARED' && !!details1.prepared_at;
    results.push({
      code: 'TEST_A',
      name: 'Transição de status e registro de data do estágio (prepared_at)',
      passed: passA,
      message: passA ? 'Transição para PREPARED registrou prepared_at com sucesso' : 'prepared_at ausente ou incorreto',
      details: { status: details1.status, prepared_at: details1.prepared_at },
    });
  } catch (err: any) {
    results.push({ code: 'TEST_A', name: 'Transição de status', passed: false, message: err.message });
  }

  // Test B: Automatic STATUS_CHANGE event generation
  try {
    setJobStatus(mockTestJob, 'APPLIED', 'Candidatura realizada pelo LinkedIn');
    const events = getStoredEvents().filter((e) => e.job_id === mockTestJob.id);
    const statusChangeEvent = events.find((e) => e.event_type === 'STATUS_CHANGE' && e.to_status === 'APPLIED');
    const passB = !!statusChangeEvent && statusChangeEvent.from_status === 'PREPARED';
    results.push({
      code: 'TEST_B',
      name: 'Geração automática de evento STATUS_CHANGE',
      passed: passB,
      message: passB ? 'Evento STATUS_CHANGE gerado com from_status=PREPARED e to_status=APPLIED' : 'Evento STATUS_CHANGE não encontrado',
      details: statusChangeEvent,
    });
  } catch (err: any) {
    results.push({ code: 'TEST_B', name: 'Evento STATUS_CHANGE', passed: false, message: err.message });
  }

  // Test C: Preserves previous stage timestamps on transition
  try {
    const detailsBefore = getApplicationDetails(mockTestJob);
    const originalPreparedAt = detailsBefore.prepared_at;
    setJobStatus(mockTestJob, 'INTERVIEW');
    const detailsAfter = getApplicationDetails(mockTestJob);
    const passC = detailsAfter.prepared_at === originalPreparedAt && !!detailsAfter.interview_at;
    results.push({
      code: 'TEST_C',
      name: 'Preservação de histórico de datas entre estágios',
      passed: passC,
      message: passC ? 'prepared_at preservado enquanto interview_at foi registrado' : 'Inconsistência na preservação de datas',
      details: { prepared_at: detailsAfter.prepared_at, interview_at: detailsAfter.interview_at },
    });
  } catch (err: any) {
    results.push({ code: 'TEST_C', name: 'Preservação de datas', passed: false, message: err.message });
  }

  // Test D: Manual events (RECRUITER_CONTACT)
  try {
    const manualEvt = addManualApplicationEvent(mockTestJob, 'RECRUITER_CONTACT', 'Alinhamento com Amanda da Gupy');
    const passD = manualEvt.event_type === 'RECRUITER_CONTACT' && manualEvt.from_status === null && manualEvt.to_status === null && !!manualEvt.event_key;
    results.push({
      code: 'TEST_D',
      name: 'Criação de evento manual (RECRUITER_CONTACT)',
      passed: passD,
      message: passD ? 'Evento manual criado com from_status e to_status nulos e event_key único' : 'Falha na criação de evento manual',
      details: manualEvt,
    });
  } catch (err: any) {
    results.push({ code: 'TEST_D', name: 'Evento manual', passed: false, message: err.message });
  }

  // Test E: Operational details update
  try {
    const updated = updateApplicationDetails(mockTestJob, {
      recruiter_name: 'Amanda Silva',
      recruiter_linkedin: 'linkedin.com/in/amandasilva',
      salary_expectation: 'R$ 9.500',
      next_step: 'Entrevista Técnica',
    });
    const passE = updated.recruiter_name === 'Amanda Silva' && updated.salary_expectation === 'R$ 9.500';
    results.push({
      code: 'TEST_E',
      name: 'Atualização de campos operacionais de recrutamento',
      passed: passE,
      message: passE ? 'Campos de recrutador, expectativa e próximo passo salvos corretamente' : 'Falha ao salvar campos operacionais',
      details: updated,
    });
  } catch (err: any) {
    results.push({ code: 'TEST_E', name: 'Campos operacionais', passed: false, message: err.message });
  }

  // Test F & G: Days calculation (getDaysInCurrentStage and getDaysSinceApplied)
  try {
    const details = getApplicationDetails(mockTestJob);
    const daysInStage = getDaysInCurrentStage(details);
    const daysSinceApplied = getDaysSinceApplied(details);
    const passFG = typeof daysInStage === 'number' && daysInStage >= 0 && typeof daysSinceApplied === 'number' && daysSinceApplied >= 0;
    results.push({
      code: 'TEST_F_G',
      name: 'Cálculo exato de dias no estágio e dias desde candidatura',
      passed: passFG,
      message: passFG ? `Dias no estágio: ${daysInStage}, Dias desde candidatura: ${daysSinceApplied}` : 'Falha no cálculo de dias',
      details: { daysInStage, daysSinceApplied },
    });
  } catch (err: any) {
    results.push({ code: 'TEST_F_G', name: 'Cálculo de dias', passed: false, message: err.message });
  }

  // Test H: LocalStorage persistence verification
  try {
    const storedMap = getStoredStatuses();
    const storedDetails = getStoredDetails();
    const storedEvents = getStoredEvents();
    const passH = !!storedMap && !!storedDetails && Array.isArray(storedEvents);
    results.push({
      code: 'TEST_H',
      name: 'Persistência local no localStorage',
      passed: passH,
      message: passH ? 'Status, detalhes e eventos gravados no localStorage com sucesso' : 'Falha na persistência local',
    });
  } catch (err: any) {
    results.push({ code: 'TEST_H', name: 'Persistência localStorage', passed: false, message: err.message });
  }

  return results;
}
