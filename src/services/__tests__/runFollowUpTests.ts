import {
  calculateFollowUpState,
  getLastMeaningfulActivity,
  getFollowUpTemplate,
} from '../followUpIntelligence';
import { ApplicationDetails, ApplicationEvent, Job } from '../../types';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`FAIL: ${msg}`);
    throw new Error(`Assertion failed: ${msg}`);
  } else {
    console.log(`PASS [${msg}]`);
  }
}

function daysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

function daysFuture(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

console.log('=== RUNNING FOLLOW-UP INTELLIGENCE TESTS (A-Q) ===\n');

// Test A: APPLIED há 1 dia -> WAIT
const appA: ApplicationDetails = {
  jobId: 'job-1',
  jobKey: 'comp_role_1',
  status: 'APPLIED',
  applied_at: daysAgo(1),
  last_activity_at: daysAgo(1),
};
const resA = calculateFollowUpState(appA, []);
assert(resA.state === 'WAIT', 'A: APPLIED há 1 dia -> WAIT');
assert(resA.urgencyScore === 20, 'A: Urgency Score = 20');

// Test B: APPLIED há 4 dias -> FOLLOW_UP_SOON
const appB: ApplicationDetails = {
  jobId: 'job-2',
  jobKey: 'comp_role_2',
  status: 'APPLIED',
  applied_at: daysAgo(4),
  last_activity_at: daysAgo(4),
};
const resB = calculateFollowUpState(appB, []);
assert(resB.state === 'FOLLOW_UP_SOON', 'B: APPLIED há 4 dias -> FOLLOW_UP_SOON');
assert(resB.urgencyScore === 55, 'B: Urgency Score = 55');

// Test C: APPLIED há 7 dias sem atividade -> FOLLOW_UP_RECOMMENDED
const appC: ApplicationDetails = {
  jobId: 'job-3',
  jobKey: 'comp_role_3',
  status: 'APPLIED',
  applied_at: daysAgo(7),
  last_activity_at: daysAgo(7),
};
const resC = calculateFollowUpState(appC, []);
assert(resC.state === 'FOLLOW_UP_RECOMMENDED', 'C: APPLIED há 7 dias -> FOLLOW_UP_RECOMMENDED');
assert(resC.urgencyScore === 75, 'C: Urgency Score = 75');

// Test D: APPLIED há 15 dias sem atividade -> FOLLOW_UP_OVERDUE
const appD: ApplicationDetails = {
  jobId: 'job-4',
  jobKey: 'comp_role_4',
  status: 'APPLIED',
  applied_at: daysAgo(15),
  last_activity_at: daysAgo(15),
};
const resD = calculateFollowUpState(appD, []);
assert(resD.state === 'FOLLOW_UP_OVERDUE', 'D: APPLIED há 15 dias -> FOLLOW_UP_OVERDUE');
assert(resD.urgencyScore === 90, 'D: Urgency Score = 90');

// Test E: FOLLOW_UP_SENT ontem -> WAIT
const appE: ApplicationDetails = {
  jobId: 'job-5',
  jobKey: 'comp_role_5',
  status: 'APPLIED',
  applied_at: daysAgo(10),
  last_activity_at: daysAgo(1),
};
const eventE: ApplicationEvent = {
  id: 'evt-1',
  application_id: 'app-5',
  job_id: 'job-5',
  event_type: 'FOLLOW_UP_SENT',
  created_at: daysAgo(1),
};
const resE = calculateFollowUpState(appE, [eventE]);
assert(resE.state === 'WAIT', 'E: FOLLOW_UP_SENT ontem -> WAIT');
assert(resE.urgencyScore === 20, 'E: Urgency Score = 20');

// Test F: FOLLOW_UP_SENT há 9 dias sem resposta -> FOLLOW_UP_RECOMMENDED
const appF: ApplicationDetails = {
  jobId: 'job-6',
  jobKey: 'comp_role_6',
  status: 'APPLIED',
  applied_at: daysAgo(20),
  last_activity_at: daysAgo(9),
};
const eventF: ApplicationEvent = {
  id: 'evt-2',
  application_id: 'app-6',
  job_id: 'job-6',
  event_type: 'FOLLOW_UP_SENT',
  created_at: daysAgo(9),
};
const resF = calculateFollowUpState(appF, [eventF]);
assert(resF.state === 'FOLLOW_UP_RECOMMENDED', 'F: FOLLOW_UP_SENT há 9 dias -> FOLLOW_UP_RECOMMENDED');

// Test G: INTERVIEW com próximo passo em 2 dias -> INTERVIEW_SOON
const appG: ApplicationDetails = {
  jobId: 'job-7',
  jobKey: 'comp_role_7',
  status: 'INTERVIEW',
  interview_at: daysAgo(5),
  next_step: 'Entrevista com Hiring Manager',
  next_step_date: daysFuture(2),
};
const resG = calculateFollowUpState(appG, []);
assert(resG.state === 'INTERVIEW_SOON', 'G: INTERVIEW em 2 dias -> INTERVIEW_SOON');
assert(resG.urgencyScore === 70, 'G: Urgency Score = 70');

// Test H: Next Step hoje -> NEXT_STEP_TODAY
const todayStr = new Date().toISOString().split('T')[0];
const appH: ApplicationDetails = {
  jobId: 'job-8',
  jobKey: 'comp_role_8',
  status: 'INTERVIEW',
  next_step: 'Teste Técnico',
  next_step_date: todayStr,
};
const resH = calculateFollowUpState(appH, []);
assert(resH.state === 'NEXT_STEP_TODAY', 'H: Next Step hoje -> NEXT_STEP_TODAY');
assert(resH.urgencyScore === 85, 'H: Urgency Score = 85');

// Test I: Next Step vencida -> NEXT_STEP_OVERDUE
const appI: ApplicationDetails = {
  jobId: 'job-9',
  jobKey: 'comp_role_9',
  status: 'APPLIED',
  next_step: 'Enviar portfólio',
  next_step_date: daysAgo(2),
};
const resI = calculateFollowUpState(appI, []);
assert(resI.state === 'NEXT_STEP_OVERDUE', 'I: Next Step vencida -> NEXT_STEP_OVERDUE');
assert(resI.urgencyScore === 100, 'I: Urgency Score = 100');

// Test J: PREPARED há 5 dias -> READY_TO_APPLY
const appJ: ApplicationDetails = {
  jobId: 'job-10',
  jobKey: 'comp_role_10',
  status: 'PREPARED',
  prepared_at: daysAgo(5),
};
const resJ = calculateFollowUpState(appJ, []);
assert(resJ.state === 'READY_TO_APPLY', 'J: PREPARED há 5 dias -> READY_TO_APPLY');
assert(resJ.warnings.length > 0, 'J: Possui aviso de candidatura não enviada');

// Test K: REJECTED -> CLOSED
const appK: ApplicationDetails = {
  jobId: 'job-11',
  jobKey: 'comp_role_11',
  status: 'REJECTED',
  rejected_at: daysAgo(3),
};
const resK = calculateFollowUpState(appK, []);
assert(resK.state === 'CLOSED', 'K: REJECTED -> CLOSED');
assert(resK.urgencyScore === 0, 'K: Urgency Score = 0');

// Test L: OFFER -> CLOSED
const appL: ApplicationDetails = {
  jobId: 'job-12',
  jobKey: 'comp_role_12',
  status: 'OFFER',
  offer_at: daysAgo(1),
};
const resL = calculateFollowUpState(appL, []);
assert(resL.state === 'CLOSED', 'L: OFFER -> CLOSED');

// Test M: Snoozed por 3 dias -> isSnoozed = true
const appM: ApplicationDetails = {
  jobId: 'job-13',
  jobKey: 'comp_role_13',
  status: 'APPLIED',
  applied_at: daysAgo(10),
  follow_up_snoozed_until: daysFuture(3),
};
const resM = calculateFollowUpState(appM, []);
assert(resM.isSnoozed === true, 'M: Snoozed ativo -> isSnoozed = true');

// Test N: DO_NOT_FOLLOW_UP -> override = DO_NOT_FOLLOW_UP
const appN: ApplicationDetails = {
  jobId: 'job-14',
  jobKey: 'comp_role_14',
  status: 'APPLIED',
  applied_at: daysAgo(10),
  follow_up_override: 'DO_NOT_FOLLOW_UP',
};
const resN = calculateFollowUpState(appN, []);
assert(resN.state === 'NO_ACTION_NEEDED', 'N: DO_NOT_FOLLOW_UP -> NO_ACTION_NEEDED');
assert(resN.urgencyScore === 0, 'N: Urgency Score = 0');

// Test O: MARK FOLLOW-UP SENT (Simulação)
const appO: ApplicationDetails = {
  jobId: 'job-15',
  jobKey: 'comp_role_15',
  status: 'APPLIED',
  applied_at: daysAgo(8),
  last_activity_at: daysAgo(8),
};
const beforeO = calculateFollowUpState(appO, []);
assert(beforeO.state === 'FOLLOW_UP_RECOMMENDED', 'O: Antes do evento -> FOLLOW_UP_RECOMMENDED');

const followUpEvtO: ApplicationEvent = {
  id: 'evt-new',
  application_id: 'app-15',
  job_id: 'job-15',
  event_type: 'FOLLOW_UP_SENT',
  created_at: new Date().toISOString(),
};
appO.last_activity_at = followUpEvtO.created_at;
const afterO = calculateFollowUpState(appO, [followUpEvtO]);
assert(afterO.state === 'WAIT', 'O: Após MARK FOLLOW-UP SENT -> WAIT');

// Test P: Data inválida -> não quebra engine
const appP: ApplicationDetails = {
  jobId: 'job-16',
  jobKey: 'comp_role_16',
  status: 'APPLIED',
  applied_at: 'Há 2 dias' as any,
  next_step_date: 'Invalid Date String',
};
const resP = calculateFollowUpState(appP, []);
assert(resP !== undefined, 'P: Data inválida é tratada com segurança sem crash');

// Test Q: Templating de Follow-up (Inglês e Português)
const tpl1 = getFollowUpTemplate('Customer Support Specialist', 'Acme Inc', 'Sarah', 'en-US');
assert(tpl1.selected.includes('Hi Sarah,'), 'Q: Template inglês com recrutador');
assert(tpl1.selected.includes('Customer Support Specialist'), 'Q: Template contém cargo');

const tpl2 = getFollowUpTemplate('Analista de Suporte', 'Empresa X', '', 'pt-BR');
assert(tpl2.selected.startsWith('Olá,'), 'Q: Template português sem recrutador usa Olá, sem inventar nome');

console.log('\n=== ALL FOLLOW-UP INTELLIGENCE TESTS PASSED 100% ===');
