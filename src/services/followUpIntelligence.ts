import {
  ApplicationDetails,
  ApplicationEvent,
  ApplicationStatus,
  FollowUpResult,
  FollowUpState,
  FollowUpOverride,
  Job,
  JobWithAnalysis,
} from '../types';
import { toSafeISOString } from './cloudSync';

/**
 * Retrieves the latest valid ISO date among all application date fields and events.
 */
export function getLastMeaningfulActivity(
  application?: ApplicationDetails | null,
  events?: ApplicationEvent[]
): string | null {
  const dates: number[] = [];

  const addValidDate = (raw?: string | null) => {
    if (!raw) return;
    const safeIso = toSafeISOString(raw);
    if (safeIso) {
      const time = new Date(safeIso).getTime();
      if (!isNaN(time)) {
        dates.push(time);
      }
    }
  };

  if (application) {
    addValidDate(application.last_activity_at);
    addValidDate(application.applied_at);
    addValidDate(application.prepared_at);
    addValidDate(application.interview_at);
    addValidDate(application.rejected_at);
    addValidDate(application.offer_at);
    addValidDate(application.created_at);
  }

  if (Array.isArray(events)) {
    events.forEach((evt) => {
      addValidDate(evt.created_at);
    });
  }

  if (dates.length === 0) return null;
  const maxTime = Math.max(...dates);
  return new Date(maxTime).toISOString();
}

/**
 * Calculates calendar day difference between a past ISO date string and NOW.
 */
export function getDaysSince(isoDateStr?: string | null): number | undefined {
  if (!isoDateStr) return undefined;
  const safeIso = toSafeISOString(isoDateStr);
  if (!safeIso) return undefined;

  const dateMs = new Date(safeIso).getTime();
  const nowMs = Date.now();
  const diffMs = nowMs - dateMs;
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

/**
 * Calculates days until target date (midnight to midnight comparison).
 * Returns negative if target date is in the past.
 */
export function getDaysUntilNextStep(nextStepDateStr?: string | null): number | undefined {
  if (!nextStepDateStr) return undefined;
  const safeIso = toSafeISOString(nextStepDateStr);
  if (!safeIso) return undefined;

  const target = new Date(safeIso);
  const now = new Date();

  const targetMidnight = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  return Math.round((targetMidnight - todayMidnight) / (1000 * 60 * 60 * 24));
}

/**
 * Core Follow-up Intelligence Engine.
 * Pure deterministic calculation based on timestamps, status, events, next steps, snooze and overrides.
 */
export function calculateFollowUpState(
  application?: ApplicationDetails | null,
  events?: ApplicationEvent[],
  job?: Job | JobWithAnalysis | null
): FollowUpResult {
  const warnings: string[] = [];
  const status: ApplicationStatus = application?.status || (job as any)?.status || 'NEW';

  // Extract snooze & override parameters
  const override: FollowUpOverride = application?.follow_up_override || 'AUTO';
  const snoozedUntil = application?.follow_up_snoozed_until || null;

  let isSnoozed = false;
  if (snoozedUntil) {
    const safeSnooze = toSafeISOString(snoozedUntil);
    if (safeSnooze && new Date(safeSnooze).getTime() > Date.now()) {
      isSnoozed = true;
    }
  }

  // Calculate days metrics
  const lastActivityIso = getLastMeaningfulActivity(application, events);
  const daysSinceLastActivity = getDaysSince(lastActivityIso);
  const daysSinceApplied = getDaysSince(application?.applied_at || (status === 'APPLIED' ? application?.created_at : null));

  // 1. REJECTED
  if (status === 'REJECTED') {
    return {
      state: 'CLOSED',
      urgencyScore: 0,
      recommendedAction: 'Nenhuma ação necessária.',
      reason: 'Candidatura encerrada (processo recusado).',
      daysSinceApplied,
      daysSinceLastActivity,
      warnings,
      isSnoozed,
      snoozedUntil,
      override,
    };
  }

  // 2. OFFER
  if (status === 'OFFER') {
    return {
      state: 'CLOSED',
      urgencyScore: 0,
      recommendedAction: 'Revisar proposta e próximos passos.',
      reason: 'Proposta de trabalho recebida!',
      daysSinceApplied,
      daysSinceLastActivity,
      warnings,
      isSnoozed,
      snoozedUntil,
      override,
    };
  }

  // 3. PREPARED
  if (status === 'PREPARED') {
    const preparedIso = application?.prepared_at || application?.created_at;
    const daysSincePrepared = getDaysSince(preparedIso) ?? 0;

    if (daysSincePrepared <= 1) {
      return {
        state: 'NO_ACTION_NEEDED',
        urgencyScore: 10,
        recommendedAction: 'Candidatura preparada recentemente.',
        reason: 'Fase de preparação inicial.',
        daysSinceLastActivity,
        warnings,
        isSnoozed,
        snoozedUntil,
        override,
      };
    }

    warnings.push('Currículo preparado, mas candidatura ainda não enviada.');
    return {
      state: 'READY_TO_APPLY',
      urgencyScore: 50,
      recommendedAction: 'Enviar candidatura.',
      reason: `Currículo preparado há ${daysSincePrepared} dia(s), aguardando envio.`,
      daysSinceLastActivity,
      warnings,
      isSnoozed,
      snoozedUntil,
      override,
    };
  }

  // 4. MANUAL OVERRIDE (DO_NOT_FOLLOW_UP)
  if (override === 'DO_NOT_FOLLOW_UP') {
    return {
      state: 'NO_ACTION_NEEDED',
      urgencyScore: 0,
      recommendedAction: 'Follow-up desativado manualmente.',
      reason: 'Override manual ativado (Não acompanhar).',
      daysSinceApplied,
      daysSinceLastActivity,
      warnings,
      isSnoozed,
      snoozedUntil,
      override,
    };
  }

  // 5. EXPLICIT NEXT STEP DATE
  if (application?.next_step_date) {
    const daysUntilNext = getDaysUntilNextStep(application.next_step_date);

    if (daysUntilNext !== undefined) {
      if (daysUntilNext < 0) {
        return {
          state: 'NEXT_STEP_OVERDUE',
          urgencyScore: 100,
          recommendedAction: 'Próxima etapa vencida! Entrar em contato ou atualizar status.',
          reason: `Próxima etapa (${application.next_step || 'Ação'}) estava agendada para ${application.next_step_date}.`,
          daysSinceApplied,
          daysSinceLastActivity,
          daysUntilNextStep: daysUntilNext,
          warnings,
          isSnoozed,
          snoozedUntil,
          override,
        };
      }

      if (daysUntilNext === 0) {
        return {
          state: 'NEXT_STEP_TODAY',
          urgencyScore: 85,
          recommendedAction: 'Próxima etapa agendada para hoje.',
          reason: `Próxima etapa: ${application.next_step || 'Acompanhamento do processo'}.`,
          daysSinceApplied,
          daysSinceLastActivity,
          daysUntilNextStep: 0,
          warnings,
          isSnoozed,
          snoozedUntil,
          override,
        };
      }

      if (daysUntilNext >= 1 && daysUntilNext <= 3) {
        const isInt = status === 'INTERVIEW';
        return {
          state: isInt ? 'INTERVIEW_SOON' : 'FOLLOW_UP_SOON',
          urgencyScore: isInt ? 70 : 55,
          recommendedAction: 'Próxima etapa em breve. Preparar material.',
          reason: `Próxima etapa (${application.next_step || 'Ação'}) agendada para daqui a ${daysUntilNext} dia(s).`,
          daysSinceApplied,
          daysSinceLastActivity,
          daysUntilNextStep: daysUntilNext,
          warnings,
          isSnoozed,
          snoozedUntil,
          override,
        };
      }

      if (daysUntilNext > 3) {
        return {
          state: 'PROCESS_ACTIVE',
          urgencyScore: 30,
          recommendedAction: 'Acompanhar processo na data agendada.',
          reason: `Próxima etapa agendada para daqui a ${daysUntilNext} dias.`,
          daysSinceApplied,
          daysSinceLastActivity,
          daysUntilNextStep: daysUntilNext,
          warnings,
          isSnoozed,
          snoozedUntil,
          override,
        };
      }
    } else {
      warnings.push('Data da próxima etapa é inválida ou não pôde ser interpretada.');
    }
  }

  // 6. STATUS = INTERVIEW (without next_step_date)
  if (status === 'INTERVIEW') {
    warnings.push('Entrevista em andamento sem próxima etapa registrada.');
    return {
      state: 'PROCESS_ACTIVE',
      urgencyScore: 30,
      recommendedAction: 'Acompanhar andamento da entrevista.',
      reason: 'Entrevista em andamento.',
      daysSinceApplied,
      daysSinceLastActivity,
      warnings,
      isSnoozed,
      snoozedUntil,
      override,
    };
  }

  // 7. APPLIED OR ACTIVE CANDIDACY
  // Check for recent FOLLOW_UP_SENT event
  const followUpSentEvents = Array.isArray(events)
    ? events
        .filter((e) => e.event_type === 'FOLLOW_UP_SENT')
        .map((e) => new Date(toSafeISOString(e.created_at) || 0).getTime())
        .filter((t) => t > 0)
    : [];

  const lastFollowUpSentMs = followUpSentEvents.length > 0 ? Math.max(...followUpSentEvents) : null;

  if (lastFollowUpSentMs) {
    const daysSinceFollowUp = Math.max(0, Math.floor((Date.now() - lastFollowUpSentMs) / (1000 * 60 * 60 * 24)));

    if (daysSinceFollowUp <= 3) {
      return {
        state: 'WAIT',
        urgencyScore: 20,
        recommendedAction: 'Follow-up recente enviado. Aguardar resposta.',
        reason: `Follow-up enviado há ${daysSinceFollowUp} dia(s).`,
        daysSinceApplied,
        daysSinceLastActivity: daysSinceFollowUp,
        warnings,
        isSnoozed,
        snoozedUntil,
        override,
      };
    }

    if (daysSinceFollowUp >= 4 && daysSinceFollowUp <= 7) {
      return {
        state: 'FOLLOW_UP_SOON',
        urgencyScore: 55,
        recommendedAction: 'Considerar novo acompanhamento em breve se não houver resposta.',
        reason: `Sem resposta há ${daysSinceFollowUp} dias após o último follow-up.`,
        daysSinceApplied,
        daysSinceLastActivity: daysSinceFollowUp,
        warnings,
        isSnoozed,
        snoozedUntil,
        override,
      };
    }

    if (daysSinceFollowUp >= 8) {
      return {
        state: 'FOLLOW_UP_RECOMMENDED',
        urgencyScore: 75,
        recommendedAction: 'Enviar novo follow-up referente à candidatura.',
        reason: `Sem resposta há ${daysSinceFollowUp} dias após o último follow-up.`,
        daysSinceApplied,
        daysSinceLastActivity: daysSinceFollowUp,
        warnings,
        isSnoozed,
        snoozedUntil,
        override,
      };
    }
  }

  // General activity / applied_at fallback
  const activityDays = daysSinceLastActivity ?? daysSinceApplied ?? 0;

  if (activityDays <= 2) {
    return {
      state: 'WAIT',
      urgencyScore: 20,
      recommendedAction: 'Candidatura recente. Aguardar retorno do recrutador.',
      reason: `Candidatado / atividade há ${activityDays} dia(s).`,
      daysSinceApplied,
      daysSinceLastActivity: activityDays,
      warnings,
      isSnoozed,
      snoozedUntil,
      override,
    };
  }

  if (activityDays >= 3 && activityDays <= 5) {
    return {
      state: 'FOLLOW_UP_SOON',
      urgencyScore: 55,
      recommendedAction: 'Preparar mensagem de follow-up.',
      reason: `Sem retorno do recrutador há ${activityDays} dias.`,
      daysSinceApplied,
      daysSinceLastActivity: activityDays,
      warnings,
      isSnoozed,
      snoozedUntil,
      override,
    };
  }

  if (activityDays >= 6 && activityDays <= 10) {
    return {
      state: 'FOLLOW_UP_RECOMMENDED',
      urgencyScore: 75,
      recommendedAction: 'Enviar mensagem de follow-up para o recrutador.',
      reason: `Sem nenhuma atividade há ${activityDays} dias.`,
      daysSinceApplied,
      daysSinceLastActivity: activityDays,
      warnings,
      isSnoozed,
      snoozedUntil,
      override,
    };
  }

  // 11+ days
  return {
    state: 'FOLLOW_UP_OVERDUE',
    urgencyScore: 90,
    recommendedAction: 'Enviar follow-up urgente ou verificar status da candidatura.',
    reason: `Candidatura sem atividade há ${activityDays} dias.`,
    daysSinceApplied,
    daysSinceLastActivity: activityDays,
    warnings,
    isSnoozed,
    snoozedUntil,
    override,
  };
}

/**
 * Localized Follow-Up Message Template Generator.
 * Does NOT auto-send messages.
 */
export function getFollowUpTemplate(
  jobTitle: string,
  companyName: string,
  recruiterName?: string | null,
  language?: string
): { en: string; ptBR: string; selected: string } {
  const cleanRecruiter = recruiterName?.trim() || null;
  const isEnglish = language?.toLowerCase().startsWith('en') || false;

  const enGreeting = cleanRecruiter ? `Hi ${cleanRecruiter},` : 'Hello,';
  const ptGreeting = cleanRecruiter ? `Olá, ${cleanRecruiter}.` : 'Olá,';

  const en = `${enGreeting} I wanted to follow up regarding my application for the ${jobTitle} position at ${companyName}. I'm still very interested in the opportunity and would be happy to provide any additional information. Thank you for your time.`;

  const ptBR = `${ptGreeting} Gostaria de acompanhar o andamento da minha candidatura para a vaga de ${jobTitle} na ${companyName}. Continuo muito interessado na oportunidade e fico à disposição para fornecer qualquer informação adicional. Obrigado pelo seu tempo.`;

  return {
    en,
    ptBR,
    selected: isEnglish ? en : ptBR,
  };
}
