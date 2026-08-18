import { calculateJobScore } from './services/scoring';
import { userProfile } from './data/profile';
import { Job } from './types';

const testJobs: { code: string; name: string; job: Job; expectedMin?: number; expectedMax?: number }[] = [
  {
    code: 'A',
    name: 'Customer Success Analyst extremamente compatível',
    expectedMin: 90,
    job: {
      id: 'test-a',
      title: 'Customer Success Analyst',
      company: 'TechFlow SaaS',
      location: 'São Paulo, SP (Remoto)',
      workplaceType: 'Remoto',
      seniority: 'Pleno',
      description: `Procuramos um Analista de Customer Success para gerenciar nossa carteira de clientes B2B corporativos.
Você será responsável por acompanhar a jornada, realizar onboardings, monitorar health score, prevenir churn e garantir a retenção da carteira.`,
      requirements: [
        'Customer Success',
        'Gestão de Carteira',
        'Retenção de Clientes',
        'Redução de Churn',
        'Customer Health Score',
        'HubSpot',
        'Excel / Google Sheets',
        'Inglês'
      ],
      publishedAt: 'Hoje',
      url: '#'
    }
  },
  {
    code: 'B',
    name: 'Customer Onboarding Specialist',
    expectedMin: 88,
    job: {
      id: 'test-b',
      title: 'Customer Onboarding Specialist',
      company: 'OnboardPay',
      location: 'Remoto',
      workplaceType: 'Remoto',
      seniority: 'Pleno',
      description: `Especialista em Customer Onboarding responsável por implementar novos clientes B2B SaaS, acelerando o time-to-value e garantindo a adoção inicial do produto.`,
      requirements: [
        'Customer Onboarding',
        'Implantação de Clientes',
        'Customer Success',
        'Zendesk',
        'HubSpot',
        'B2B SaaS'
      ],
      publishedAt: 'Hoje',
      url: '#'
    }
  },
  {
    code: 'C',
    name: 'Customer Experience Analyst',
    expectedMin: 85,
    job: {
      id: 'test-c',
      title: 'Customer Experience Analyst (CX)',
      company: 'LogiCX',
      location: 'Remoto',
      workplaceType: 'Remoto',
      seniority: 'Pleno',
      description: `Mapeamento da jornada do cliente, análise de touchpoints, pesquisas de satisfação (NPS e CSAT) e construção de dashboards no Power BI.`,
      requirements: [
        'Customer Experience',
        'Customer Journey',
        'Power BI',
        'Excel',
        'Zendesk',
        'NPS'
      ],
      publishedAt: 'Hoje',
      url: '#'
    }
  },
  {
    code: 'D',
    name: 'CS Operations com SQL / Power BI / CRM',
    expectedMin: 85,
    job: {
      id: 'test-d',
      title: 'Customer Success Operations Analyst (CS Ops)',
      company: 'MetricsFlow',
      location: 'Híbrido - SP',
      workplaceType: 'Híbrido',
      seniority: 'Pleno',
      description: `Analista de Operações de CS focado em estruturar automações no CRM (HubSpot), consultas SQL para medir engajamento e relatórios de churn em Power BI.`,
      requirements: [
        'Customer Success Operations',
        'SQL',
        'Power BI',
        'HubSpot',
        'Zendesk',
        'Análise de Dados'
      ],
      publishedAt: 'Hoje',
      url: '#'
    }
  },
  {
    code: 'E',
    name: 'Senior Software Engineer',
    expectedMax: 40,
    job: {
      id: 'test-e',
      title: 'Senior Software Engineer (Full Stack C++/Node)',
      company: 'DeepTech',
      location: 'Remoto',
      workplaceType: 'Remoto',
      seniority: 'Sênior',
      description: `Desenvolvimento de software de baixo nível em C++ e Node.js, arquitetura de microsserviços, Kubernetes e AWS Serverless.`,
      requirements: [
        'C++',
        'Node.js',
        'Kubernetes',
        'AWS',
        'Docker'
      ],
      publishedAt: 'Hoje',
      url: '#'
    }
  },
  {
    code: 'F',
    name: 'Head of Customer Success exigindo 10+ anos',
    expectedMax: 70,
    job: {
      id: 'test-f',
      title: 'Head of Customer Success',
      company: 'Enterprise SaaS',
      location: 'São Paulo (Presencial)',
      workplaceType: 'Presencial',
      seniority: 'Especialista',
      description: `Liderança executiva de diretoria. Requisito obrigatório e indispensável: mínimo de 10 anos de experiência comprovada liderando operações globais de CS.`,
      requirements: [
        '10+ anos de experiência em liderança executiva',
        'Gestão de Diretoria de CS',
        'Estratégia de Receita Global'
      ],
      publishedAt: 'Hoje',
      url: '#'
    }
  },
  {
    code: 'G',
    name: 'Customer Success pedindo Salesforce "nice to have"',
    expectedMin: 88,
    job: {
      id: 'test-g',
      title: 'Analista de Customer Success',
      company: 'CloudScale',
      location: 'Remoto',
      workplaceType: 'Remoto',
      seniority: 'Pleno',
      description: `Atuação na gestão de carteira B2B, retenção e saúde do cliente. Conhecimento em Salesforce será considerado um diferencial (nice to have / opcional).`,
      requirements: [
        'Customer Success',
        'Retenção',
        'Gestão de Carteira',
        'Salesforce (Desejável / Diferencial opcional)'
      ],
      publishedAt: 'Hoje',
      url: '#'
    }
  },
  {
    code: 'H',
    name: 'Customer Success exigindo Salesforce obrigatório por 3 anos',
    expectedMax: 74,
    job: {
      id: 'test-h',
      title: 'Analista de Customer Success Senior',
      company: 'Enterprise Corp',
      location: 'Remoto',
      workplaceType: 'Remoto',
      seniority: 'Pleno',
      description: `Atuação em CS. Requisito obrigatório e indispensável: mínimo de 3 anos de experiência comprovada administrando Salesforce CRM de forma obrigatória.`,
      requirements: [
        'Customer Success',
        'Salesforce Obrigatório (mínimo de 3 anos de experiência no CRM)'
      ],
      publishedAt: 'Hoje',
      url: '#'
    }
  }
];

export function runScoringTests() {
  console.log('================================================================');
  console.log('   SISTEMA DE SCORE DETERMINÍSTICO - EXECUÇÃO DE BATERIA DE TESTES (A-H)');
  console.log('================================================================\n');

  let passed = 0;

  testJobs.forEach(({ code, name, job, expectedMin, expectedMax }) => {
    const analysis = calculateJobScore(job, userProfile);
    const score = analysis.score;

    let isOk = true;
    if (expectedMin !== undefined && score < expectedMin) isOk = false;
    if (expectedMax !== undefined && score > expectedMax) isOk = false;

    if (isOk) passed++;

    const statusSymbol = isOk ? '✅ PASSED' : '❌ FAILED';
    console.log(`[CENÁRIO ${code}] ${name}`);
    console.log(`  -> Score Obtido: ${score} PTS (${analysis.classification})`);
    if (analysis.scoreCapApplied) {
      console.log(`  -> Score Cap Aplicado: ${analysis.scoreCapApplied}`);
    }
    console.log(`  -> Detalhamento: Cargo=${analysis.breakdown.titleScore}/20, Skills=${analysis.breakdown.skillsScore}/25, Exp=${analysis.breakdown.experienceScore}/20, Tools=${analysis.breakdown.toolsScore}/10, Seniority=${analysis.breakdown.seniorityScore}/10`);
    console.log(`  -> Matched Skills: ${analysis.matchedSkills.join(', ') || 'Nenhuma'}`);
    if (analysis.relatedSkills.length > 0) {
      console.log(`  -> Related Skills: ${analysis.relatedSkills.map(r => `${r.jobSkill} -> ${r.matchedProfileSkill}`).join('; ')}`);
    }
    console.log(`  -> Status: ${statusSymbol}\n`);
  });

  console.log(`----------------------------------------------------------------`);
  console.log(`RESULTADO FINAL: ${passed}/${testJobs.length} testes aprovados.`);
  console.log(`----------------------------------------------------------------\n`);
}

// Run when executed directly via node/tsx
runScoringTests();
