import { UserProfile, Job } from '../types';
import { EVIDENCE_BULLET_BANK, BulletEntry } from '../data/bulletBank';
import { detectResumeLanguage, ResumeLanguage } from './resumeLanguageDetector';
import { getUserProfileByLanguage } from '../data/profile';

export interface TailoredExperience {
  company: string;
  role: string;
  period: string;
  highlights: string[];
}

export interface RelatedKeywordMapping {
  jobKeyword: string;
  candidateEquivalent: string;
}

export interface ATSKeywordsAnalysis {
  matched: string[];
  related: RelatedKeywordMapping[];
  missing: string[];
}

export interface TailoredResume {
  resumeLanguage: ResumeLanguage;
  targetTitle: string;
  headline: string;
  professionalSummary: string;
  prioritySkills: string[];
  selectedExperienceBullets: TailoredExperience[];
  atsKeywords: ATSKeywordsAnalysis;
  atsCoverageScore: number;
  totalRelevantJobKeywords: number;
  coveredJobKeywordsCount: number;
  notes: string[];
}

export type RoleFamily =
  | 'CUSTOMER_SUCCESS'
  | 'ONBOARDING'
  | 'CUSTOMER_EXPERIENCE'
  | 'CS_OPERATIONS'
  | 'ACCOUNT_MANAGEMENT'
  | 'CUSTOMER_SUPPORT'
  | 'BUSINESS_ANALYSIS'
  | 'REVOPS_SALES_OPS';

// Skill synonyms mapping
export const KEYWORD_SYNONYMS: Record<string, string[]> = {
  'Customer Success': ['client success', 'sucesso do cliente', 'customer relationship', 'cs'],
  'Customer Onboarding': ['implementation', 'implantação', 'boas-vindas', 'adoção inicial', 'onboarding'],
  'Customer Retention': ['renewal', 'renewals', 'retenção', 'renovação', 'manutenção de carteira'],
  'Churn Reduction': ['churn', 'attrition', 'prevenção de cancelamento', 'redução de churn'],
  'Customer Health': ['health score', 'saúde do cliente', 'account health', 'risco de churn'],
  'Gestão de Carteira': ['portfolio management', 'account management', 'carteira de clientes', 'gestão de contas'],
  'Customer Experience': ['cx', 'jornada do cliente', 'experiência do cliente', 'touchpoints'],
  'NPS / CSAT': ['nps', 'csat', 'satisfação do cliente', 'net promoter score'],
  'Data Analysis': ['análise de dados', 'analytics', 'relatórios gerenciais', 'reporting'],
  'Process Improvement': ['melhoria de processos', 'otimização', 'process optimization', 'eficiência operacional'],
};

/**
 * Detects the dominant role family based on job title and job description.
 */
export function detectRoleFamily(title: string, description: string): RoleFamily {
  const titleLower = title.toLowerCase();
  const descLower = description.toLowerCase();
  const combined = `${titleLower} ${descLower}`;

  // First check title-based strong signals
  if (
    titleLower.includes('customer success') ||
    titleLower.includes('cs analyst') ||
    titleLower.includes('cs specialist') ||
    titleLower.includes('analista de customer success')
  ) {
    if (titleLower.includes('ops') || titleLower.includes('operation')) return 'CS_OPERATIONS';
    if (titleLower.includes('onboarding') || titleLower.includes('implementation')) return 'ONBOARDING';
    return 'CUSTOMER_SUCCESS';
  }

  if (
    titleLower.includes('customer experience') ||
    titleLower.includes('cx analyst') ||
    titleLower.includes('cx specialist')
  ) {
    return 'CUSTOMER_EXPERIENCE';
  }

  if (
    titleLower.includes('onboarding') ||
    titleLower.includes('implementation') ||
    titleLower.includes('implementação')
  ) {
    return 'ONBOARDING';
  }

  if (titleLower.includes('account manager') || titleLower.includes('gerente de contas')) {
    return 'ACCOUNT_MANAGEMENT';
  }

  if (titleLower.includes('revops') || titleLower.includes('sales ops') || titleLower.includes('revenue ops')) {
    return 'REVOPS_SALES_OPS';
  }

  if (titleLower.includes('business analyst') || titleLower.includes('analista de negócios')) {
    return 'BUSINESS_ANALYSIS';
  }

  // Fallback to description signals
  if (combined.includes('revops') || combined.includes('sales ops') || combined.includes('revenue ops')) {
    return 'REVOPS_SALES_OPS';
  }
  if (combined.includes('cs operations') || combined.includes('cs ops')) {
    return 'CS_OPERATIONS';
  }
  if (combined.includes('onboarding') || combined.includes('implementaç') || combined.includes('implementation')) {
    return 'ONBOARDING';
  }
  if (combined.includes('experience') || combined.includes('cx') || combined.includes('jornada')) {
    return 'CUSTOMER_EXPERIENCE';
  }
  if (combined.includes('support') || combined.includes('atendimento') || combined.includes('ticket') || combined.includes('suporte')) {
    return 'CUSTOMER_SUPPORT';
  }
  if (combined.includes('account manager') || combined.includes('gerente de contas')) {
    return 'ACCOUNT_MANAGEMENT';
  }
  if (combined.includes('business analyst') || combined.includes('analista de negócios')) {
    return 'BUSINESS_ANALYSIS';
  }

  return 'CUSTOMER_SUCCESS';
}

/**
 * Normalizes text for matching keywords.
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Extracts candidate ATS keywords and categorizes into Matched, Related, and Missing.
 */
export function extractATSKeywords(job: Job, profile: UserProfile): ATSKeywordsAnalysis {
  const candidateSkillsNorm = profile.skills.map((s) => ({ original: s, norm: normalizeText(s) }));
  const candidateToolsNorm = profile.tools.map((t) => ({ original: t, norm: normalizeText(t) }));

  // Extract candidate's language capabilities for bilingual matching
  const candidateLangs = profile.languages.map((l) => normalizeText(`${l.language} ${l.level}`));
  const isBilingualCandidate = candidateLangs.some((l) => l.includes('ingles') || l.includes('english'));

  // Raw job tokens
  const rawJobTokens = new Set<string>();
  (job.requirements || []).forEach((req) => rawJobTokens.add(req));

  const textToScan = `${job.title} ${job.description}`.toLowerCase();
  
  const commonKeywordsToScan = [
    'Customer Success', 'Customer Experience', 'Customer Onboarding', 'Customer Retention',
    'Churn Reduction', 'Customer Health', 'NPS', 'CSAT', 'Power BI', 'SQL', 'HubSpot', 'Salesforce',
    'Excel', 'Zendesk', 'Intercom', 'B2B', 'SaaS', 'Upsell', 'Expansion', 'Process Improvement',
    'Data Analysis', 'Reporting', 'Dashboards', 'Atendimento Bilíngue', 'Português e Inglês',
    'Inglês Avançado', 'Inglês Fluente', 'Gestão de Carteira', 'Adoção de Produto', 'Implementation',
    'Renewals', 'CRM', 'Análise de Dados', 'Suporte Técnico', 'Gestão de Riscos', 'Tickets'
  ];

  commonKeywordsToScan.forEach((term) => {
    if (textToScan.includes(term.toLowerCase())) {
      rawJobTokens.add(term);
    }
  });

  const matched: string[] = [];
  const related: RelatedKeywordMapping[] = [];
  const missing: string[] = [];

  const processedMatched = new Set<string>();
  const processedMissing = new Set<string>();

  rawJobTokens.forEach((rawTerm) => {
    const termNorm = normalizeText(rawTerm);
    if (!termNorm || termNorm.length < 2) return;

    // Check direct match in candidate skills or tools
    const directSkillMatch = candidateSkillsNorm.find((s) => s.norm === termNorm || termNorm.includes(s.norm) || s.norm.includes(termNorm));
    const directToolMatch = candidateToolsNorm.find((t) => t.norm === termNorm);

    if (directSkillMatch) {
      if (!processedMatched.has(directSkillMatch.original)) {
        matched.push(directSkillMatch.original);
        processedMatched.add(directSkillMatch.original);
      }
      return;
    }

    if (directToolMatch) {
      if (!processedMatched.has(directToolMatch.original)) {
        matched.push(directToolMatch.original);
        processedMatched.add(directToolMatch.original);
      }
      return;
    }

    // Special check for English / Bilingual
    if ((termNorm.includes('ingles') || termNorm.includes('bilingue') || termNorm.includes('bilingual')) && isBilingualCandidate) {
      const label = 'Inglês Avançado / Bilíngue';
      if (!processedMatched.has(label)) {
        matched.push(label);
        processedMatched.add(label);
      }
      return;
    }

    // Specific tools NOT in candidate tools profile (e.g. Salesforce, Tableau, Jira) MUST be in missing
    if (termNorm === 'salesforce') {
      if (!processedMissing.has('Salesforce')) {
        missing.push('Salesforce');
        processedMissing.add('Salesforce');
      }
      return;
    }

    // Generic CRM mapping if job asks for CRM
    if (termNorm === 'crm') {
      related.push({
        jobKeyword: 'CRM',
        candidateEquivalent: 'HubSpot',
      });
      return;
    }

    // Check skill synonyms (e.g., Renewals -> Retention, Implementation -> Onboarding)
    let mappedEquivalent: string | null = null;
    for (const [canonicalSkill, synonyms] of Object.entries(KEYWORD_SYNONYMS)) {
      if (synonyms.some((syn) => normalizeText(syn) === termNorm || termNorm.includes(normalizeText(syn)))) {
        const profileMatch = profile.skills.find((s) => normalizeText(s) === normalizeText(canonicalSkill));
        if (profileMatch) {
          mappedEquivalent = profileMatch;
          break;
        }
      }
    }

    if (mappedEquivalent) {
      related.push({
        jobKeyword: rawTerm,
        candidateEquivalent: mappedEquivalent,
      });
    } else {
      // If not in matched and not in related, it's missing
      if (!processedMissing.has(rawTerm) && !processedMatched.has(rawTerm)) {
        missing.push(rawTerm);
        processedMissing.add(rawTerm);
      }
    }
  });

  return { matched, related, missing };
}

/**
 * Generates tailored headline for the job in the target language.
 */
export function generateTailoredHeadline(
  job: Job,
  profile: UserProfile,
  roleFamily: RoleFamily,
  lang: ResumeLanguage = 'pt-BR'
): string {
  const familyHeadlinesPt: Record<RoleFamily, { defaultSkills: string[] }> = {
    CUSTOMER_SUCCESS: {
      defaultSkills: ['Customer Retention', 'Churn Reduction', 'Customer Health', 'HubSpot', 'B2B'],
    },
    ONBOARDING: {
      defaultSkills: ['B2B Onboarding', 'Product Adoption', 'Churn Reduction', 'Customer Success'],
    },
    CUSTOMER_EXPERIENCE: {
      defaultSkills: ['Customer Journey', 'NPS / CSAT Insights', 'Process Improvement', 'Data Analysis'],
    },
    CS_OPERATIONS: {
      defaultSkills: ['Customer Health Score', 'Data Analysis', 'SQL', 'Power BI', 'HubSpot'],
    },
    ACCOUNT_MANAGEMENT: {
      defaultSkills: ['Gestão de Carteira', 'Customer Retention', 'Upsell & Expansão', 'B2B'],
    },
    CUSTOMER_SUPPORT: {
      defaultSkills: ['Atendimento Bilíngue (Português/Inglês)', 'Zendesk', 'Resolução de Problemas', 'Process Improvement'],
    },
    BUSINESS_ANALYSIS: {
      defaultSkills: ['Data Analysis', 'SQL', 'Power BI', 'Process Improvement', 'Excel Gerencial'],
    },
    REVOPS_SALES_OPS: {
      defaultSkills: ['CRM Management', 'HubSpot', 'Reporting & KPIs', 'Data Analysis', 'Customer Lifecycle'],
    },
  };

  const familyHeadlinesEn: Record<RoleFamily, { defaultSkills: string[] }> = {
    CUSTOMER_SUCCESS: {
      defaultSkills: ['Customer Retention', 'Churn Reduction', 'Customer Health', 'HubSpot', 'B2B'],
    },
    ONBOARDING: {
      defaultSkills: ['B2B Onboarding', 'Product Adoption', 'Churn Reduction', 'Customer Success'],
    },
    CUSTOMER_EXPERIENCE: {
      defaultSkills: ['Customer Journey', 'NPS / CSAT Insights', 'Process Improvement', 'Data Analysis'],
    },
    CS_OPERATIONS: {
      defaultSkills: ['Customer Health Score', 'Data Analysis', 'SQL', 'Power BI', 'HubSpot'],
    },
    ACCOUNT_MANAGEMENT: {
      defaultSkills: ['Portfolio Management', 'Customer Retention', 'Upsell & Expansion', 'B2B'],
    },
    CUSTOMER_SUPPORT: {
      defaultSkills: ['Bilingual Support (Portuguese/English C2)', 'Zendesk', 'Problem Solving', 'Process Improvement'],
    },
    BUSINESS_ANALYSIS: {
      defaultSkills: ['Data Analysis', 'SQL', 'Power BI', 'Process Improvement', 'Excel'],
    },
    REVOPS_SALES_OPS: {
      defaultSkills: ['CRM Management', 'HubSpot', 'Reporting & KPIs', 'Data Analysis', 'Customer Lifecycle'],
    },
  };

  const config = lang === 'en' ? familyHeadlinesEn[roleFamily] : familyHeadlinesPt[roleFamily];

  const headlineParts = [job.title];

  config.defaultSkills.forEach((skill) => {
    if (headlineParts.length < 6) {
      headlineParts.push(skill);
    }
  });

  return headlineParts.join(' | ');
}

/**
 * Generates 3-5 line professional summary using REAL metrics in the target language.
 */
export function generateTailoredSummary(
  job: Job,
  profile: UserProfile,
  roleFamily: RoleFamily,
  atsAnalysis: ATSKeywordsAnalysis,
  lang: ResumeLanguage = 'pt-BR'
): string {
  if (lang === 'en') {
    switch (roleFamily) {
      case 'ONBOARDING':
        return `Customer Success Specialist with consolidated experience in B2B onboarding, product adoption and customer retention. Proven track record managing 5–15 B2B onboardings per month and reducing customer churn by 15% through onboarding optimization and proactive management of at-risk accounts. Experienced in managing portfolios of 150+ corporate accounts, tracking customer health metrics and data analysis.`;

      case 'CUSTOMER_EXPERIENCE':
        return `Customer Experience & Journey Analyst focused on mapping critical touchpoints, identifying friction and analyzing customer feedback (NPS/CSAT). Experienced in continuous process improvement supported by data tools (Power BI, SQL), bridging customer support, Product and Operations teams. Proven results including 15% churn reduction and portfolio management of 150+ corporate accounts.`;

      case 'CS_OPERATIONS':
        return `Customer Success Operations (CS Ops) Analyst with strong analytical capabilities for reporting, KPI tracking and portfolio segmentation. Hands-on experience leveraging data tools (SQL, Power BI, Excel, HubSpot) to track customer health and proactively reduce churn by 15%. Experienced in operational process structuring, portfolio management (150+ accounts) and onboarding workflows.`;

      case 'CUSTOMER_SUPPORT':
        return `Bilingual Customer Support Specialist (Portuguese and English C2) with a proven track record resolving approximately 60 tickets per day via Zendesk and support platforms. Skilled in critical analysis of request patterns, root-cause diagnosis and knowledge base optimization. Additional background in Customer Success with focus on retention and customer satisfaction.`;

      case 'BUSINESS_ANALYSIS':
        return `Business & Operations Analyst with expertise in data analysis (SQL, Power BI, Excel), process standardization and management reporting. Experience mapping operational workflows for efficiency gains, combined with Customer Success background impacting churn reduction (-15%) and strategic metric tracking.`;

      case 'REVOPS_SALES_OPS':
        return `Revenue & CS Operations Analyst focused on CRM management (HubSpot), customer lifecycle optimization, expansion/upsell opportunity identification and portfolio segmentation. Skilled in data analysis and executive dashboards, combining proactive churn mitigation (-15%) and structured onboarding execution.`;

      case 'ACCOUNT_MANAGEMENT':
        return `Account Management & B2B Relationship Specialist directly managing a portfolio of 150+ active corporate accounts. Experienced in consultative discovery, engagement tracking, churn risk mapping (-15%) and account expansion (upsell) identification.`;

      case 'CUSTOMER_SUCCESS':
      default:
        return `Customer Success Specialist with proven experience across the B2B customer lifecycle, including onboarding, adoption, retention and portfolio expansion. Strong track record reducing customer churn by 15%, managing 5–15 B2B onboardings per month, and overseeing an active portfolio of 150+ corporate accounts. Proficient in data analysis (SQL, Power BI, Excel, HubSpot) and customer health score monitoring.`;
    }
  }

  // Portuguese default
  switch (roleFamily) {
    case 'ONBOARDING':
      return `Profissional de Customer Success com experiência consolidada em onboarding B2B, aceleração de adoção de produto e retenção de clientes. Histórico comprovado na condução de 5 a 15 onboardings por mês e redução de churn em 15% por meio da otimização do processo de entrada e atuação proativa em contas de risco. Domínio em gestão de carteira com mais de 150 clientes corporativos, acompanhamento de métricas de customer health e análise de dados.`;

    case 'CUSTOMER_EXPERIENCE':
      return `Analista de Customer Experience e Jornada do Cliente com foco em mapeamento de touchpoints, identificação de pontos de fricção e análise de feedbacks (NPS/CSAT). Experiência na otimização contínua de processos com apoio de ferramentas de dados como Power BI, aliando suporte ao cliente à atuação interdisciplinar com times de Produto e Operações. Histórico com redução de churn em 15% e gestão de carteira com mais de 150 clientes corporativos.`;

    case 'CS_OPERATIONS':
      return `Analista de Operações de Customer Success (CS Ops) com sólida capacidade analítica para estruturação de relatórios, acompanhamento de KPIs e segmentação de carteira. Experiência prática na aplicação de dados (SQL, Power BI, Excel, HubSpot) para mapeamento de customer health e redução proativa de churn em 15%. Vivência na estruturação de processos operacionais, gestão de carteiras de mais de 150 clientes e fluxos de onboarding.`;

    case 'CUSTOMER_SUPPORT':
      return `Profissional de Suporte e Atendimento ao Cliente bilíngue (Português e Inglês C2) com capacidade comprovada de resolução de aproximadamente 60 tickets diários via Zendesk e plataformas de atendimento. Experiência em análise crítica de padrões de solicitações, diagnóstico de causas-raiz e retroalimentação de bases de conhecimento. Bagagem adicional em Customer Success com foco em retenção e satisfação do cliente.`;

    case 'BUSINESS_ANALYSIS':
      return `Analista de Negócios e Operações com expertise em análise de dados (SQL, Power BI, Excel), padronização de processos e elaboração de relatórios gerenciais. Experiência no mapeamento de fluxos operacionais para ganho de eficiência, aliado à atuação em Customer Success com impacto direto na redução de churn em 15% e controle de métricas estratégicas.`;

    case 'REVOPS_SALES_OPS':
      return `Analista focado em Operações de Receita (RevOps) e CRM (HubSpot), com histórico em otimização do ciclo de vida do cliente, identificação de oportunidades de expansão/upsell e segmentação de carteira. Domínio em análise de dados e dashboards gerenciais, combinando atuação proativa na mitigação de churn (-15%) e condução de onboardings estruturados.`;

    case 'ACCOUNT_MANAGEMENT':
      return `Especialista em Gestão de Carteira e Relacionamento B2B, com responsabilidade direta sobre mais de 150 clientes corporativos ativos. Experiência em diagnóstico consultivo, acompanhamento de engajamento, mapeamento de risco de churn (-15%) e identificação constante de oportunidades de expansão de conta (upsell).`;

    case 'CUSTOMER_SUCCESS':
    default:
      return `Analista de Customer Success com vivência em todo o ciclo de vida do cliente B2B (onboarding, adoção, retenção e expansão). Histórico de impacto com redução de 15% na taxa de churn, condução de 5 a 15 onboardings mensais e gestão de carteira ativa com mais de 150 contas corporativas. Habilidade em análise de dados (Power BI, SQL, Excel) e monitoramento contínuo de customer health score.`;
  }
}

/**
 * Ranks evidence bullets for the tailored resume and retrieves text in target language.
 */
export function rankAndSelectBullets(
  roleFamily: RoleFamily,
  atsAnalysis: ATSKeywordsAnalysis,
  lang: ResumeLanguage = 'pt-BR'
): TailoredExperience[] {
  const matchedTags = new Set<string>();
  atsAnalysis.matched.forEach((m) => matchedTags.add(normalizeText(m)));
  atsAnalysis.related.forEach((r) => matchedTags.add(normalizeText(r.candidateEquivalent)));

  const familyTagWeights: Record<RoleFamily, string[]> = {
    CUSTOMER_SUCCESS: ['churn', 'retention', 'portfolio_management', 'customer_health', 'upsell', 'expansion'],
    ONBOARDING: ['onboarding', 'implementation', 'product_adoption', 'churn', 'time_to_value', 'retention'],
    CUSTOMER_EXPERIENCE: ['customer_experience', 'customer_journey', 'nps', 'csat', 'touchpoints', 'process_improvement'],
    CS_OPERATIONS: ['cs_operations', 'data_analysis', 'sql', 'power_bi', 'customer_segmentation', 'hubspot', 'process_improvement'],
    ACCOUNT_MANAGEMENT: ['portfolio_management', 'account_management', 'upsell', 'expansion', 'relationship', 'retention'],
    CUSTOMER_SUPPORT: ['customer_support', 'bilingual', 'zendesk', 'tickets', 'process_improvement', 'data_analysis'],
    BUSINESS_ANALYSIS: ['data_analysis', 'sql', 'power_bi', 'excel', 'process_improvement', 'business_operations', 'documentation'],
    REVOPS_SALES_OPS: ['hubspot', 'upsell', 'expansion', 'cs_operations', 'data_analysis', 'portfolio_management', 'process_improvement'],
  };

  const priorityTags = familyTagWeights[roleFamily] || familyTagWeights.CUSTOMER_SUCCESS;

  function calculateBulletScore(bullet: BulletEntry): number {
    let score = 0;

    bullet.tags.forEach((tag) => {
      if (priorityTags.includes(tag)) {
        score += 10;
        if (priorityTags.slice(0, 2).includes(tag)) {
          score += 15;
        }
      }
      if (matchedTags.has(tag)) {
        score += 5;
      }
    });

    if (bullet.hasMetric) {
      if (roleFamily === 'ONBOARDING' && bullet.metricType === 'onboarding_volume') score += 25;
      if (roleFamily === 'CUSTOMER_SUPPORT' && bullet.metricType === 'ticket_volume') score += 25;
      if (roleFamily === 'ACCOUNT_MANAGEMENT' && bullet.metricType === 'portfolio_size') score += 20;
      if (bullet.metricType === 'churn') score += 20;
    }

    return score;
  }

  const companyBulletsMap = new Map<string, BulletEntry[]>();
  EVIDENCE_BULLET_BANK.forEach((bullet) => {
    const list = companyBulletsMap.get(bullet.sourceCompany) || [];
    list.push(bullet);
    companyBulletsMap.set(bullet.sourceCompany, list);
  });

  const result: TailoredExperience[] = [];

  function getBulletText(b: BulletEntry): string {
    return lang === 'en' ? b.textEn : b.textPt;
  }

  function getTranslatedRole(company: string, originalRole: string): string {
    if (lang === 'en') {
      if (company === 'Prefeitura Municipal de Guariba') return 'Human Resources Intern';
      if (company === 'Raízen') return 'Administrative Assistant';
    }
    return originalRole;
  }

  // Logzz Roles
  const logzzBullets = companyBulletsMap.get('Logzz') || [];
  const sortedLogzz = [...logzzBullets].sort((a, b) => calculateBulletScore(b) - calculateBulletScore(a));
  const selectedLogzzBullets = sortedLogzz.slice(0, 5);

  const logzzRoleMap = new Map<string, { role: string; period: string; highlights: string[] }>();
  selectedLogzzBullets.forEach((b) => {
    const key = b.sourceRole;
    const existing = logzzRoleMap.get(key) || { role: b.sourceRole, period: b.sourcePeriod, highlights: [] };
    existing.highlights.push(getBulletText(b));
    logzzRoleMap.set(key, existing);
  });

  logzzRoleMap.forEach((val) => {
    result.push({
      company: 'Logzz',
      role: val.role,
      period: val.period,
      highlights: val.highlights,
    });
  });

  // ChatSentry Bullets
  const chatSentryBullets = companyBulletsMap.get('ChatSentry') || [];
  const sortedChatSentry = [...chatSentryBullets].sort((a, b) => calculateBulletScore(b) - calculateBulletScore(a));
  const selectedChatSentry = sortedChatSentry.slice(0, 2);

  if (selectedChatSentry.length > 0) {
    result.push({
      company: 'ChatSentry',
      role: selectedChatSentry[0].sourceRole,
      period: selectedChatSentry[0].sourcePeriod,
      highlights: selectedChatSentry.map((b) => getBulletText(b)),
    });
  }

  // Pre-Logzz roles (Guariba / Raízen) - only include 1 top highlight if relevant to business operations / excel / data
  if (roleFamily === 'BUSINESS_ANALYSIS' || roleFamily === 'CS_OPERATIONS') {
    const guaribaBullets = companyBulletsMap.get('Prefeitura Municipal de Guariba') || [];
    const sortedGuariba = [...guaribaBullets].sort((a, b) => calculateBulletScore(b) - calculateBulletScore(a));
    if (sortedGuariba.length > 0) {
      result.push({
        company: 'Prefeitura Municipal de Guariba',
        role: getTranslatedRole('Prefeitura Municipal de Guariba', sortedGuariba[0].sourceRole),
        period: sortedGuariba[0].sourcePeriod,
        highlights: [getBulletText(sortedGuariba[0])],
      });
    }

    const raizenBullets = companyBulletsMap.get('Raízen') || [];
    const sortedRaizen = [...raizenBullets].sort((a, b) => calculateBulletScore(b) - calculateBulletScore(a));
    if (sortedRaizen.length > 0) {
      result.push({
        company: 'Raízen',
        role: getTranslatedRole('Raízen', sortedRaizen[0].sourceRole),
        period: sortedRaizen[0].sourcePeriod,
        highlights: [getBulletText(sortedRaizen[0])],
      });
    }
  }

  return result;
}

/**
 * Builds rationale notes explaining why the resume was tailored in target language.
 */
export function buildCustomizationNotes(
  job: Job,
  roleFamily: RoleFamily,
  atsAnalysis: ATSKeywordsAnalysis,
  lang: ResumeLanguage = 'pt-BR'
): string[] {
  const notes: string[] = [];

  if (lang === 'en') {
    switch (roleFamily) {
      case 'ONBOARDING':
        notes.push('B2B Onboarding experience and the "5–15 onboardings/month" metric were prioritized at the top as core job requirements.');
        notes.push('The 15% churn reduction metric was highlighted in the summary to demonstrate direct onboarding impact on customer retention.');
        break;

      case 'CS_OPERATIONS':
        notes.push('Analytical skills (SQL, Power BI, Excel, HubSpot) were elevated to headline and priority skills based on job requirements.');
        notes.push('Logzz experience highlights prioritized strategic data usage for portfolio segmentation and customer health.');
        break;

      case 'CUSTOMER_EXPERIENCE':
        notes.push('Customer Experience Analyst experience at Logzz and journey mapping/feedback (NPS/CSAT) highlights were prioritized.');
        break;

      case 'CUSTOMER_SUPPORT':
        notes.push('ChatSentry experience with ~60 tickets/day and bilingual support was prioritized to align with job requirements.');
        break;

      case 'BUSINESS_ANALYSIS':
        notes.push('Highlights in data analysis, Excel reporting, and process standardization were prioritized.');
        break;

      default:
        notes.push('Retention metrics (15% churn reduction) and portfolio size (150+ accounts) were placed at top due to strategic relevance.');
        break;
    }

    if (atsAnalysis.missing.length > 0) {
      const missingStr = atsAnalysis.missing.slice(0, 3).join(', ');
      notes.push(`The requirement "${missingStr}" was identified as missing and kept out of experience highlights to guarantee zero hallucination.`);
    }

    return notes;
  }

  // Portuguese default
  switch (roleFamily) {
    case 'ONBOARDING':
      notes.push('Experiências em Onboarding B2B e a métrica de "5 a 15 onboardings/mês" foram movidas para o topo do currículo por serem requisitos centrais da vaga.');
      notes.push('A métrica de redução de churn em 15% foi mantida em destaque no resumo profissional para demonstrar o impacto direto do onboarding na retenção.');
      break;

    case 'CS_OPERATIONS':
      notes.push('As competências analíticas (SQL, Power BI, Excel e HubSpot) foram elevadas para a headline e competências prioritárias por aparecerem na descrição da vaga.');
      notes.push('O destaque de experiência da Logzz priorizou o uso estratégico de dados para segmentação e priorização da carteira.');
      break;

    case 'CUSTOMER_EXPERIENCE':
      notes.push('A função de Customer Experience Analyst da Logzz e os destaques em mapeamento de jornada, touchpoints e feedbacks (NPS/CSAT) foram priorizados.');
      break;

    case 'CUSTOMER_SUPPORT':
      notes.push('A experiência na ChatSentry com volume de ~60 tickets diários e suporte bilíngue foi posicionada com alta prioridade para alinhar-se à natureza da vaga.');
      break;

    case 'BUSINESS_ANALYSIS':
      notes.push('Destaques em análise de dados, planilhas gerenciais em Excel e padronização de processos foram priorizados no resumo e histórico profissional.');
      break;

    default:
      notes.push('Métricas de retenção (15% de redução de churn) e volume de carteira (150+ clientes) foram posicionadas no topo pelo perfil estratégico da oportunidade.');
      break;
  }

  if (atsAnalysis.missing.length > 0) {
    const missingStr = atsAnalysis.missing.slice(0, 3).join(', ');
    notes.push(`A ferramenta/requisito "${missingStr}" foi identificada como lacuna (Missing) e mantida fora da lista de experiências para garantir total fidelidade aos fatos (zero alucinação).`);
  }

  return notes;
}

export const LOCAL_STORAGE_TAILORED_RESUMES_KEY = 'job_hunter_tailored_resumes_v1';

export function getStoredTailoredResumes(): Record<string, TailoredResume> {
  if (typeof window === 'undefined' || !window.localStorage) return {};
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_TAILORED_RESUMES_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function saveTailoredResumesMap(map: Record<string, TailoredResume>): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    localStorage.setItem(LOCAL_STORAGE_TAILORED_RESUMES_KEY, JSON.stringify(map));
  } catch (err) {
    console.error('Error saving tailored resumes to localStorage:', err);
  }
}

/**
  Persists a tailored resume locally keyed by job.url and external_key.
 */
export function saveTailoredResumeForJob(job: Job, resume: TailoredResume): void {
  const map = getStoredTailoredResumes();
  if (job.url) {
    map[job.url] = resume;
  }
  const companyClean = (job.company || '').trim().toLowerCase();
  const titleClean = (job.title || '').trim().toLowerCase();
  const locClean = (job.location || '').trim().toLowerCase();
  const extKey = `${companyClean}|${titleClean}|${locClean}`;
  map[extKey] = resume;
  saveTailoredResumesMap(map);
}

/**
 * Main function: Receives a job and candidate profile and returns the complete Tailored Resume.
 */
export function generateTailoredResume(
  job: Job,
  profile?: UserProfile,
  overrideLanguage?: ResumeLanguage
): TailoredResume {
  const resumeLanguage: ResumeLanguage = overrideLanguage || detectResumeLanguage(job);
  const selectedProfile = profile || getUserProfileByLanguage(resumeLanguage);

  const roleFamily = detectRoleFamily(job.title, job.description);
  const atsKeywords = extractATSKeywords(job, selectedProfile);

  const headline = generateTailoredHeadline(job, selectedProfile, roleFamily, resumeLanguage);
  const professionalSummary = generateTailoredSummary(job, selectedProfile, roleFamily, atsKeywords, resumeLanguage);
  const selectedExperienceBullets = rankAndSelectBullets(roleFamily, atsKeywords, resumeLanguage);
  const notes = buildCustomizationNotes(job, roleFamily, atsKeywords, resumeLanguage);

  // Compute priority skills from profile matching job keywords
  const prioritySkillsSet = new Set<string>();
  atsKeywords.matched.forEach((skill) => prioritySkillsSet.add(skill));
  atsKeywords.related.forEach((rel) => prioritySkillsSet.add(rel.candidateEquivalent));

  // Fallback to top profile skills if set is small
  selectedProfile.skills.forEach((skill) => {
    if (prioritySkillsSet.size < 8) {
      prioritySkillsSet.add(skill);
    }
  });

  const prioritySkills = Array.from(prioritySkillsSet).slice(0, 10);

  // Calculate ATS Coverage Score
  const totalRelevantJobKeywords = atsKeywords.matched.length + atsKeywords.related.length + atsKeywords.missing.length;
  const coveredJobKeywordsCount = atsKeywords.matched.length + atsKeywords.related.length;

  const atsCoverageScore =
    totalRelevantJobKeywords > 0
      ? Math.round((coveredJobKeywordsCount / totalRelevantJobKeywords) * 100)
      : 100;

  return {
    resumeLanguage,
    targetTitle: job.title,
    headline,
    professionalSummary,
    prioritySkills,
    selectedExperienceBullets,
    atsKeywords,
    atsCoverageScore,
    totalRelevantJobKeywords,
    coveredJobKeywordsCount,
    notes,
  };
}
