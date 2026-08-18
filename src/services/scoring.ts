import { Job, JobAnalysis, ScoreBreakdown, UserProfile, MatchClassification, RelatedSkillMatch } from '../types';

// ============================================================================
// 1. FAMÍLIAS DE CARGOS (ROLE FAMILIES)
// ============================================================================

export type RoleFamilyType =
  | 'CUSTOMER_SUCCESS'
  | 'ONBOARDING_IMPLEMENTATION'
  | 'CUSTOMER_EXPERIENCE'
  | 'CUSTOMER_OPERATIONS'
  | 'CUSTOMER_ANALYTICS'
  | 'ACCOUNT_MANAGEMENT'
  | 'CRM_REVENUE_OPERATIONS'
  | 'BUSINESS_ANALYSIS_OPERATIONS'
  | 'OTHER_UNRELATED';

const ROLE_FAMILIES_PATTERNS: Record<RoleFamilyType, string[]> = {
  CUSTOMER_SUCCESS: [
    'customer success', 'cs analyst', 'cs specialist', 'cs associate', 'cs manager',
    'client success', 'analista de customer success', 'especialista de customer success',
    'sucesso do cliente', 'retention analyst', 'customer retention'
  ],
  ONBOARDING_IMPLEMENTATION: [
    'customer onboarding', 'onboarding specialist', 'onboarding analyst',
    'implementation specialist', 'implementation analyst', 'implementation consultant',
    'analista de implantação', 'especialista de implantação', 'implantação de clientes',
    'onboarding'
  ],
  CUSTOMER_EXPERIENCE: [
    'customer experience', 'cx analyst', 'customer journey', 'customer experience analyst',
    'customer journey analyst', 'analista de cx', 'analista de experiência do cliente',
    'jornada do cliente', 'cx'
  ],
  CUSTOMER_OPERATIONS: [
    'customer success operations', 'cs operations', 'cs ops', 'customer operations',
    'customer operations analyst', 'analista de operações de cs'
  ],
  CUSTOMER_ANALYTICS: [
    'customer insights', 'customer insights analyst', 'customer analytics',
    'customer analytics analyst', 'analista de dados do cliente'
  ],
  ACCOUNT_MANAGEMENT: [
    'account manager', 'key account', 'key account manager', 'client relationship manager',
    'gerente de contas', 'gestor de contas', 'gestão de contas'
  ],
  CRM_REVENUE_OPERATIONS: [
    'crm analyst', 'revenue operations', 'revops', 'sales operations', 'sales ops',
    'analista de crm', 'operadores de receita'
  ],
  BUSINESS_ANALYSIS_OPERATIONS: [
    'business analyst', 'business operations analyst', 'operations analyst',
    'analista de negócios', 'analista de processos', 'analista de operações'
  ],
  OTHER_UNRELATED: []
};

/**
 * Identify role family from title string
 */
export function identifyRoleFamily(title: string): RoleFamilyType {
  const lowerTitle = title.toLowerCase();

  for (const [family, patterns] of Object.entries(ROLE_FAMILIES_PATTERNS)) {
    if (family === 'OTHER_UNRELATED') continue;
    for (const pattern of patterns) {
      if (lowerTitle.includes(pattern)) {
        return family as RoleFamilyType;
      }
    }
  }

  // Generic fallback checks
  if (lowerTitle.includes('customer') || lowerTitle.includes('cliente')) {
    return 'CUSTOMER_SUCCESS';
  }
  if (lowerTitle.includes('onboarding') || lowerTitle.includes('implantação')) {
    return 'ONBOARDING_IMPLEMENTATION';
  }
  if (lowerTitle.includes('cx') || lowerTitle.includes('jornada')) {
    return 'CUSTOMER_EXPERIENCE';
  }
  if (lowerTitle.includes('analyst') || lowerTitle.includes('analista')) {
    return 'BUSINESS_ANALYSIS_OPERATIONS';
  }

  return 'OTHER_UNRELATED';
}


// ============================================================================
// 2. ALIASES & DICIONÁRIO DE EQUIVALÊNCIAS DE SKILLS
// ============================================================================

export interface SkillConcept {
  canonicalName: string;
  category: 'CORE' | 'IMPORTANT' | 'BONUS';
  aliases: string[];
  profileEquivalent?: string;
}

export const fontConcepts: SkillConcept[] = [
  {
    canonicalName: 'Customer Success',
    category: 'CORE',
    aliases: ['customer success', 'cs', 'client success', 'customer relationship', 'customer lifecycle', 'sucesso do cliente'],
    profileEquivalent: 'Customer Success',
  },
  {
    canonicalName: 'Customer Onboarding',
    category: 'CORE',
    aliases: ['onboarding', 'customer onboarding', 'client onboarding', 'implementation', 'implementation journey', 'implantação', 'boas-vindas', 'adoção'],
    profileEquivalent: 'Customer Onboarding',
  },
  {
    canonicalName: 'Customer Retention',
    category: 'CORE',
    aliases: ['retention', 'customer retention', 'client retention', 'renewal', 'renewals', 'retenção', 'renovação', 'manutenção de contas'],
    profileEquivalent: 'Customer Retention',
  },
  {
    canonicalName: 'Churn Reduction',
    category: 'CORE',
    aliases: ['churn', 'churn reduction', 'churn prevention', 'attrition', 'customer risk', 'redução de churn', 'prevenção de churn'],
    profileEquivalent: 'Churn Reduction',
  },
  {
    canonicalName: 'Account Management',
    category: 'CORE',
    aliases: ['account management', 'carteira de clientes', 'gestão de carteira', 'client management', 'account handling', 'gestão de contas'],
    profileEquivalent: 'Gestão de Carteira',
  },
  {
    canonicalName: 'Customer Experience',
    category: 'CORE',
    aliases: ['customer experience', 'cx', 'customer journey', 'journey mapping', 'touchpoints', 'jornada do cliente', 'experiência do cliente', 'pesquisas de satisfação'],
    profileEquivalent: 'Customer Experience',
  },
  {
    canonicalName: 'Customer Health',
    category: 'IMPORTANT',
    aliases: ['customer health', 'health score', 'customer health score', 'account health', 'risk score', 'saúde do cliente'],
    profileEquivalent: 'Customer Health',
  },
  {
    canonicalName: 'NPS & CSAT',
    category: 'IMPORTANT',
    aliases: ['nps', 'csat', 'net promoter score', 'satisfação do cliente', 'satisfação'],
    profileEquivalent: 'NPS / CSAT',
  },
  {
    canonicalName: 'Upsell & Expansion',
    category: 'IMPORTANT',
    aliases: ['upsell', 'up-selling', 'expansion', 'account expansion', 'growth opportunity', 'expansão', 'venda cruzada'],
    profileEquivalent: 'Upsell',
  },
  {
    canonicalName: 'Customer Insights',
    category: 'IMPORTANT',
    aliases: ['customer insights', 'customer analytics', 'customer behavior', 'usage analysis', 'customer data', 'comportamento do cliente'],
    profileEquivalent: 'Customer Insights',
  },
  {
    canonicalName: 'Data Analysis',
    category: 'IMPORTANT',
    aliases: ['data analysis', 'analytics', 'data-driven', 'reporting', 'business intelligence', 'análise de dados', 'relatórios'],
    profileEquivalent: 'Data Analysis',
  },
  {
    canonicalName: 'Power BI',
    category: 'IMPORTANT',
    aliases: ['power bi', 'bi dashboards', 'business intelligence dashboards', 'pbi'],
    profileEquivalent: 'Power BI',
  },
  {
    canonicalName: 'CRM',
    category: 'IMPORTANT',
    aliases: ['crm', 'customer relationship management', 'hubspot', 'salesforce', 'pipedrive', 'gestão de crm'],
    profileEquivalent: 'HubSpot',
  },
  {
    canonicalName: 'Stakeholder Management',
    category: 'IMPORTANT',
    aliases: ['stakeholder management', 'cross-functional collaboration', 'cross-functional', 'product and operations collaboration', 'gestão de stakeholders'],
    profileEquivalent: 'Stakeholder Management',
  },
  {
    canonicalName: 'B2B',
    category: 'IMPORTANT',
    aliases: ['b2b', 'business-to-business', 'enterprise clients', 'corporate clients', 'clientes corporativos'],
    profileEquivalent: 'B2B',
  },
  {
    canonicalName: 'SaaS',
    category: 'IMPORTANT',
    aliases: ['saas', 'software as a service', 'software platform', 'cloud platform', 'plataforma saas'],
    profileEquivalent: 'SaaS',
  },
];


// ============================================================================
// 3. ANÁLISE CONTEXTUAL (REQUIRED VS PREFERRED)
// ============================================================================

const PREFERRED_KEYWORDS = [
  'preferred', 'nice to have', 'desirable', 'desejável', 'diferencial',
  'opcional', 'plus', 'será um diferencial', 'desejável ter', 'diferenciais'
];

const REQUIRED_KEYWORDS = [
  'required', 'must have', 'mandatory', 'requisito', 'obrigatório', 'exigido',
  'imprescindível', 'indispensável', 'mínimo de', 'mínimo', 'necessário'
];

/**
 * Checks if a requirement in text is preferred/optional or strictly required.
 */
function isRequirementPreferred(text: string, skillOrTool: string): boolean {
  const textLower = text.toLowerCase();
  const skillLower = skillOrTool.toLowerCase();

  const lines = textLower.split(/[\n.;]/);
  for (const line of lines) {
    if (line.includes(skillLower)) {
      for (const pref of PREFERRED_KEYWORDS) {
        if (line.includes(pref)) {
          return true;
        }
      }
    }
  }
  return false;
}

function isRequirementRequired(text: string, skillOrTool: string): boolean {
  const textLower = text.toLowerCase();
  const skillLower = skillOrTool.toLowerCase();

  const lines = textLower.split(/[\n.;]/);
  for (const line of lines) {
    if (line.includes(skillLower)) {
      for (const req of REQUIRED_KEYWORDS) {
        if (line.includes(req)) {
          return true;
        }
      }
    }
  }
  return false;
}


// ============================================================================
// 4. MOTOR PRINCIPAL DE SCORING DETERMINÍSTICO
// ============================================================================

export function calculateJobScore(job: Job, profile: UserProfile): JobAnalysis {
  const matchReasons: string[] = [];
  const strengths: string[] = [];
  const gaps: string[] = [];
  const matchedSkillsSet = new Set<string>();
  const relatedSkillsList: RelatedSkillMatch[] = [];
  const missingSkillsSet = new Set<string>();
  const atsKeywordsSet = new Set<string>();
  const relevantExperiences: string[] = [];

  const jobTextLower = [
    job.title,
    job.description,
    ...(job.requirements || []),
    ...(job.skills || []),
    ...(job.responsibilities || []),
    ...(job.benefits || [])
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  let scoreCapApplied: string | null = null;

  // --------------------------------------------------------------------------
  // 1. CARGO / FAMÍLIA DE CARGO (Max 20 pts)
  // --------------------------------------------------------------------------
  let titleScore = 0;
  const jobRoleFamily = identifyRoleFamily(job.title);

  // Check if job matches Jean's core target families
  const targetFamilies: RoleFamilyType[] = [
    'CUSTOMER_SUCCESS',
    'ONBOARDING_IMPLEMENTATION',
    'CUSTOMER_EXPERIENCE',
    'CUSTOMER_OPERATIONS',
    'CUSTOMER_ANALYTICS',
    'ACCOUNT_MANAGEMENT',
    'CRM_REVENUE_OPERATIONS',
    'BUSINESS_ANALYSIS_OPERATIONS'
  ];

  if (targetFamilies.includes(jobRoleFamily)) {
    if (
      jobRoleFamily === 'CUSTOMER_SUCCESS' ||
      jobRoleFamily === 'ONBOARDING_IMPLEMENTATION' ||
      jobRoleFamily === 'CUSTOMER_EXPERIENCE'
    ) {
      titleScore = 20;
      matchReasons.push(`Cargo ("${job.title}") pertence à família de ${jobRoleFamily.replace(/_/g, ' ')} (foco principal do candidato).`);
    } else if (
      jobRoleFamily === 'CUSTOMER_OPERATIONS' ||
      jobRoleFamily === 'CUSTOMER_ANALYTICS' ||
      jobRoleFamily === 'ACCOUNT_MANAGEMENT'
    ) {
      titleScore = 18;
      matchReasons.push(`Cargo ("${job.title}") pertence à família de ${jobRoleFamily.replace(/_/g, ' ')} (alta aderência ao perfil).`);
    } else {
      titleScore = 16;
      matchReasons.push(`Cargo ("${job.title}") é correlato da área de operações e análise (${jobRoleFamily.replace(/_/g, ' ')}).`);
    }
  } else {
    // Check partial string matches against profile targetTitles
    const matchedTarget = profile.targetTitles.find(t =>
      job.title.toLowerCase().includes(t.toLowerCase()) || t.toLowerCase().includes(job.title.toLowerCase())
    );

    if (matchedTarget) {
      titleScore = 18;
      matchReasons.push(`Título diretamente alinhado com o cargo-alvo "${matchedTarget}".`);
    } else {
      // Unrelated role (e.g. Software Engineer, Doctor, Cook)
      titleScore = 2;
      gaps.push(`O cargo "${job.title}" pertence a uma área distinta do seu foco profissional.`);
      scoreCapApplied = 'REQUIRED_CRITICAL_GAP';
    }
  }

  // --------------------------------------------------------------------------
  // 2. COMPETÊNCIAS CORE & RELACIONADAS (Max 25 pts)
  // --------------------------------------------------------------------------
  let skillsScore = 0;
  let coreMatches = 0;
  let importantMatches = 0;

  // Evaluate skill concepts
  for (const concept of fontConcepts) {
    let conceptMatched = false;
    let matchedAlias = '';

    for (const alias of concept.aliases) {
      if (jobTextLower.includes(alias)) {
        conceptMatched = true;
        matchedAlias = alias;
        break;
      }
    }

    if (conceptMatched) {
      const profileEquivalent = concept.profileEquivalent || concept.canonicalName;
      matchedSkillsSet.add(profileEquivalent);
      atsKeywordsSet.add(concept.canonicalName);

      if (matchedAlias.toLowerCase() !== profileEquivalent.toLowerCase()) {
        relatedSkillsList.push({
          jobSkill: matchedAlias,
          matchedProfileSkill: profileEquivalent,
        });
      }

      if (concept.category === 'CORE') coreMatches++;
      if (concept.category === 'IMPORTANT') importantMatches++;
    }
  }

  // Also check explicit job requirements for missing gaps
  (job.requirements || []).forEach((req) => {
    const reqLower = req.toLowerCase();
    let isMatched = false;

    for (const skill of profile.skills) {
      if (reqLower.includes(skill.toLowerCase()) || skill.toLowerCase().includes(reqLower)) {
        isMatched = true;
        break;
      }
    }

    if (!isMatched) {
      const isPref = isRequirementPreferred(jobTextLower, req);
      if (isPref) {
        missingSkillsSet.add(`${req} (Diferencial desejável)`);
      } else {
        if (req.length < 50) {
          missingSkillsSet.add(req);
        }
      }
    }
  });

  // Balanced skills scoring (CORE = 6 pts, IMPORTANT = 3.5 pts)
  skillsScore = Math.min(25, Math.round(coreMatches * 6 + importantMatches * 3.5));

  if (coreMatches >= 3) {
    matchReasons.push(`Excelente alinhamento funcional com ${coreMatches} pilares core identificados (${Array.from(matchedSkillsSet).slice(0, 4).join(', ')}).`);
  } else if (coreMatches >= 1) {
    matchReasons.push(`Boa compatibilidade de competências essenciais (${coreMatches} competências centrais).`);
  } else {
    gaps.push('Poucas competências core do seu perfil foram explicitadas na descrição.');
  }

  // --------------------------------------------------------------------------
  // 3. EXPERIÊNCIA RELEVANTE & EVIDÊNCIAS DE MÉTRICAS (Max 20 pts)
  // --------------------------------------------------------------------------
  let experienceScore = 0;
  let evidenceBoosts = 0;

  // 1. Portfolio Management (150+ clients)
  if (
    jobTextLower.includes('carteira') || jobTextLower.includes('portfolio') ||
    jobTextLower.includes('accounts') || jobTextLower.includes('gestão de contas') ||
    jobTextLower.includes('clientes corporativos') || jobTextLower.includes('clientes')
  ) {
    evidenceBoosts++;
    strengths.push('Gestão comprovada de carteira ativa com 150+ clientes corporativos B2B na Logzz.');
    relevantExperiences.push('Logzz: Gestão de carteira com mais de 150 clientes corporativos, acompanhamento de engajamento e retenção.');
  }

  // 2. High-Volume Support (~60 tickets/day)
  if (
    jobTextLower.includes('ticket') || jobTextLower.includes('volume') ||
    jobTextLower.includes('suporte') || jobTextLower.includes('atendimento') ||
    jobTextLower.includes('zendesk') || jobTextLower.includes('intercom')
  ) {
    evidenceBoosts++;
    strengths.push('Produtividade comprovada em atendimento de alto volume (~60 tickets/dia bilíngue na ChatSentry).');
    relevantExperiences.push('ChatSentry: Atendimento bilíngue de alta produtividade (aprox. 60 tickets/dia) e otimização de fluxos.');
  }

  // 3. Onboarding Experience (5-15/month)
  if (
    jobTextLower.includes('onboarding') || jobTextLower.includes('implantação') ||
    jobTextLower.includes('implementation') || jobTextLower.includes('time to value') ||
    jobTextLower.includes('boas-vindas') || jobTextLower.includes('adoção')
  ) {
    evidenceBoosts++;
    strengths.push('Domínio de processos de onboarding B2B (condução contínua de 5 a 15 novos clientes/mês na Logzz).');
    relevantExperiences.push('Logzz: Condução de 5 a 15 onboardings B2B por mês, otimizando o time-to-value inicial.');
  }

  // 4. Churn Reduction / Retention (15% reduction)
  if (
    jobTextLower.includes('churn') || jobTextLower.includes('retention') ||
    jobTextLower.includes('retenção') || jobTextLower.includes('renovação') ||
    jobTextLower.includes('health score')
  ) {
    evidenceBoosts++;
    strengths.push('Redução comprovada de 15% no churn através de onboarding estruturado e gestão de risco na Logzz.');
    relevantExperiences.push('Logzz: Redução de 15% de churn por meio de intervenção proativa em contas de risco.');
  }

  // Scoring mapping based on evidence boosts
  if (evidenceBoosts >= 3) {
    experienceScore = 20;
    matchReasons.push('Sua bagagem com métricas comprovadas (150+ clientes, 15% redução de churn, ~60 tickets/dia) encaixa perfeitamente nesta função.');
  } else if (evidenceBoosts >= 2) {
    experienceScore = 18;
    matchReasons.push('Experiência prévia com forte alinhamento operacional aos desafios descritos.');
  } else if (evidenceBoosts === 1) {
    experienceScore = 15;
    matchReasons.push('Trajetória profissional relacionada a atendimento e relacionamento B2B.');
  } else {
    experienceScore = 8;
    relevantExperiences.push('Logzz & ChatSentry: Experiência sólida na área de sucesso do cliente e atendimento B2B SaaS.');
  }

  // --------------------------------------------------------------------------
  // 4. FERRAMENTAS & STACK TECNOLÓGICA (Max 10 pts)
  // --------------------------------------------------------------------------
  let toolsScore = 0;
  const matchedTools: string[] = [];

  profile.tools.forEach(tool => {
    const toolLower = tool.toLowerCase();
    if (jobTextLower.includes(toolLower)) {
      matchedTools.push(tool);
      atsKeywordsSet.add(tool);
    }
  });

  if (matchedTools.length >= 2) {
    toolsScore = 10;
    matchReasons.push(`Domínio de ferramentas-chave solicitadas (${matchedTools.join(', ')}).`);
  } else if (matchedTools.length === 1) {
    toolsScore = 8;
    matchReasons.push(`Apresenta conhecimento em ferramenta citada (${matchedTools[0]}).`);
  } else {
    // Check if unhandled tools like Salesforce were requested
    if (jobTextLower.includes('salesforce')) {
      const isPref = isRequirementPreferred(jobTextLower, 'salesforce');
      const isReq3Yrs = isRequirementRequired(jobTextLower, 'salesforce') && (jobTextLower.includes('3 anos') || jobTextLower.includes('3+ anos') || jobTextLower.includes('3 years'));

      if (isPref) {
        toolsScore = 8; // Preferred tool missing = no heavy penalty!
        gaps.push('Diferencial desejável "Salesforce" não consta na stack principal (sem prejuízo no core).');
      } else if (isReq3Yrs) {
        toolsScore = 5;
        gaps.push('Requisito obrigatório de 3+ anos de experiência em Salesforce ausente no perfil.');
        scoreCapApplied = 'REQUIRED_CRITICAL_GAP';
      } else {
        toolsScore = 6;
        gaps.push('A vaga cita ferramenta de CRM (Salesforce) que não consta na stack principal do perfil.');
      }
    } else {
      toolsScore = 8; // General/Neutral
    }
  }

  // --------------------------------------------------------------------------
  // 5. ALINHAMENTO DE SENIORIDADE (Max 10 pts)
  // --------------------------------------------------------------------------
  let seniorityScore = 0;
  const seniorityLower = (job.seniority || '').toLowerCase();

  if (
    seniorityLower.includes('júnior') || seniorityLower.includes('junior') ||
    seniorityLower.includes('analista') || seniorityLower.includes('analyst') ||
    seniorityLower.includes('associate') || seniorityLower.includes('pleno') ||
    seniorityLower.includes('mid') || seniorityLower.includes('estágio')
  ) {
    seniorityScore = 10;
    matchReasons.push(`Nível de senioridade (${job.seniority}) é 100% compatível com seus ~3 anos de experiência.`);
  } else if (seniorityLower.includes('sênior') || seniorityLower.includes('senior') || seniorityLower.includes('lead')) {
    seniorityScore = 6;
    gaps.push(`Vaga exige senioridade ${job.seniority}, o que requer demonstração consistente de autonomia na entrevista.`);
  } else if (
    seniorityLower.includes('head') || seniorityLower.includes('director') ||
    seniorityLower.includes('vp') || seniorityLower.includes('c-level') ||
    jobTextLower.includes('10+ anos') || jobTextLower.includes('10 anos')
  ) {
    seniorityScore = 2;
    gaps.push('Vaga para nível executivo / liderança sênior (exige 10+ anos de carreira).');
    scoreCapApplied = 'REQUIRED_CRITICAL_GAP';
  } else {
    seniorityScore = 9;
  }

  // --------------------------------------------------------------------------
  // 6. IDIOMAS EXIGIDOS (Max 5 pts)
  // --------------------------------------------------------------------------
  let languageScore = 0;
  const isBilingualJob = jobTextLower.includes('inglês') || jobTextLower.includes('english') || jobTextLower.includes('bilingual') || jobTextLower.includes('bilíngue');

  if (isBilingualJob) {
    languageScore = 5;
    matchReasons.push('Inglês C2 (Fluente) atende integralmente ao requisito de comunicação bilíngue.');
  } else {
    languageScore = 5; // Português Nativo
  }

  // Check for foreign language mandatory gaps
  if (jobTextLower.includes('japonês') || jobTextLower.includes('alemão') || jobTextLower.includes('mandarim')) {
    if (isRequirementRequired(jobTextLower, 'japonês') || isRequirementRequired(jobTextLower, 'alemão')) {
      languageScore = 1;
      gaps.push('Idioma obrigatório específico (Alemão/Japonês) não possuído.');
      scoreCapApplied = 'REQUIRED_CRITICAL_GAP';
    }
  }

  // --------------------------------------------------------------------------
  // 7. FORMAÇÃO ACADÊMICA (Max 3 pts)
  // --------------------------------------------------------------------------
  let educationScore = 3;
  if (
    jobTextLower.includes('administração') || jobTextLower.includes('relações internacionais') ||
    jobTextLower.includes('superior') || jobTextLower.includes('graduação') ||
    jobTextLower.includes('bachelor')
  ) {
    matchReasons.push('Graduação em Administração de Empresas atende plenamente ao requisito acadêmico.');
  }

  // --------------------------------------------------------------------------
  // 8. LOCALIZAÇÃO E MODELO DE TRABALHO (Max 3 pts)
  // --------------------------------------------------------------------------
  let locationScore = 0;
  if (job.workplaceType === 'Remoto') {
    locationScore = 3;
    matchReasons.push('Modelo 100% Remoto: conveniência total.');
  } else if (job.workplaceType === 'Híbrido') {
    locationScore = 3;
    matchReasons.push('Modelo Híbrido: flexível.');
  } else {
    locationScore = 2;
  }

  // --------------------------------------------------------------------------
  // 9. ATS KEYWORDS & CONTEXTO (Max 4 pts)
  // --------------------------------------------------------------------------
  let keywordsScore = 0;
  const atsList = [
    'customer success', 'churn', 'nps', 'csat', 'health score', 'onboarding',
    'b2b', 'saas', 'upsell', 'retention', 'sql', 'power bi', 'hubspot', 'crm',
    'gestão de carteira', 'journey', 'jornada', 'carteira'
  ];

  let detectedCount = 0;
  atsList.forEach(kw => {
    if (jobTextLower.includes(kw)) {
      detectedCount++;
    }
  });

  if (detectedCount >= 4) {
    keywordsScore = 4;
  } else if (detectedCount >= 2) {
    keywordsScore = 3;
  } else {
    keywordsScore = 1;
  }

  // --------------------------------------------------------------------------
  // CÁLCULO FINAL E SCORE CAP
  // --------------------------------------------------------------------------
  let rawTotal =
    titleScore +
    skillsScore +
    experienceScore +
    toolsScore +
    seniorityScore +
    languageScore +
    educationScore +
    locationScore +
    keywordsScore;

  let total = Math.min(100, Math.round(rawTotal));

  // Apply Score Cap if critical required gap is detected
  if (scoreCapApplied === 'REQUIRED_CRITICAL_GAP' && total > 74) {
    total = 74;
  }

  let classification: MatchClassification;
  if (total >= 90) {
    classification = 'Excelente';
  } else if (total >= 85) {
    classification = 'Muito alta';
  } else if (total >= 75) {
    classification = 'Boa';
  } else if (total >= 65) {
    classification = 'Média';
  } else {
    classification = 'Baixa prioridade';
  }

  const breakdown: ScoreBreakdown = {
    titleScore,
    skillsScore,
    experienceScore,
    toolsScore,
    seniorityScore,
    languageScore,
    educationScore,
    locationScore,
    keywordsScore,
    total,
  };

  return {
    score: total,
    classification,
    breakdown,
    matchedSkills: Array.from(matchedSkillsSet),
    relatedSkills: relatedSkillsList,
    missingSkills: Array.from(missingSkillsSet),
    atsKeywords: Array.from(atsKeywordsSet),
    matchReasons,
    strengths,
    gaps,
    relevantExperienceSummary: relevantExperiences,
    scoreCapApplied,
  };
}
