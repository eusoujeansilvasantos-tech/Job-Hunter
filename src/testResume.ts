import { generateTailoredResume } from './services/resume';
import { userProfile } from './data/profile';
import { Job } from './types';

// Define test jobs representing scenarios A-F
const testScenariosJobs: { code: string; title: string; job: Job; expectedChecks: (resume: any) => boolean }[] = [
  {
    code: 'CENÁRIO A',
    title: 'Customer Success Analyst',
    job: {
      id: 'test-resume-a',
      title: 'Customer Success Analyst',
      company: 'SaaS Expansion B2B',
      location: 'São Paulo, SP',
      workplaceType: 'Remoto',
      seniority: 'Pleno',
      description: 'Buscamos Analista de Customer Success para atuar no acompanhamento de retenção, redução de churn e métricas de customer health.',
      requirements: ['Customer Success', 'Customer Retention', 'Churn Reduction', 'Customer Health', 'B2B'],
      publishedAt: '2026-08-08',
      url: '#',
      source: 'mock',
    },
    expectedChecks: (resume) => {
      const summaryHasChurn = resume.professionalSummary.includes('churn') || resume.professionalSummary.includes('15%');
      const headlineHasCS = resume.headline.includes('Customer Success');
      const hasRetentionSkill = resume.prioritySkills.some((s: string) => s.includes('Retention') || s.includes('Churn') || s.includes('Health'));
      return summaryHasChurn && headlineHasCS && hasRetentionSkill;
    },
  },
  {
    code: 'CENÁRIO B',
    title: 'Customer Onboarding Specialist',
    job: {
      id: 'test-resume-b',
      title: 'Customer Onboarding Specialist',
      company: 'Logística Tech',
      location: 'Florianópolis, SC',
      workplaceType: 'Híbrido',
      seniority: 'Pleno',
      description: 'Especialista em onboarding B2B de novos clientes, aceleração de adoção de produto e alinhamento de expectativas de implementação.',
      requirements: ['Customer Onboarding', 'B2B', 'Product Adoption', 'Implementation', 'Churn Reduction'],
      publishedAt: '2026-08-08',
      url: '#',
      source: 'mock',
    },
    expectedChecks: (resume) => {
      const summaryHasOnboardingVol = resume.professionalSummary.includes('5 a 15 onboardings') || resume.professionalSummary.includes('onboarding B2B');
      const logzzExperience = resume.selectedExperienceBullets.find((e: any) => e.company === 'Logzz');
      const highlightsStr = logzzExperience ? logzzExperience.highlights.join(' ') : '';
      const hasOnboardingBullet = highlightsStr.includes('5 a 15 onboardings') || highlightsStr.includes('onboarding');
      return summaryHasOnboardingVol && hasOnboardingBullet;
    },
  },
  {
    code: 'CENÁRIO C',
    title: 'CS Operations Analyst',
    job: {
      id: 'test-resume-c',
      title: 'Customer Success Operations Analyst',
      company: 'Scale-up FinTech',
      location: 'São Paulo, SP',
      workplaceType: 'Remoto',
      seniority: 'Pleno',
      description: 'Atuação em inteligência de dados de CS, relatórios em Power BI, consultas SQL, segmentação de carteira e gestão de CRM no HubSpot.',
      requirements: ['SQL', 'Power BI', 'HubSpot', 'Data Analysis', 'Customer Segmentation', 'CS Operations'],
      publishedAt: '2026-08-08',
      url: '#',
      source: 'mock',
    },
    expectedChecks: (resume) => {
      const headlineHasSQLorPowerBI = resume.headline.includes('SQL') || resume.headline.includes('Power BI') || resume.headline.includes('Operations');
      const priorityHasSQL = resume.prioritySkills.includes('SQL') || resume.prioritySkills.includes('Power BI') || resume.prioritySkills.includes('Data Analysis');
      const summaryHasOperations = resume.professionalSummary.includes('SQL') || resume.professionalSummary.includes('Operações') || resume.professionalSummary.includes('Power BI');
      return headlineHasSQLorPowerBI && priorityHasSQL && summaryHasOperations;
    },
  },
  {
    code: 'CENÁRIO D',
    title: 'Customer Support Specialist',
    job: {
      id: 'test-resume-d',
      title: 'Customer Support Specialist (Bilingual)',
      company: 'Global Helpdesk',
      location: 'Remoto',
      workplaceType: 'Remoto',
      seniority: 'Pleno',
      description: 'Atendimento e suporte ao cliente bilíngue em português e inglês com foco em alta produtividade de chamados no Zendesk.',
      requirements: ['Zendesk', 'Customer Support', 'Português e Inglês', 'Atendimento Bilíngue', 'Tickets'],
      publishedAt: '2026-08-08',
      url: '#',
      source: 'mock',
    },
    expectedChecks: (resume) => {
      const summaryHasTickets = resume.professionalSummary.includes('60 tickets') || resume.professionalSummary.includes('bilíngue') || resume.professionalSummary.includes('Zendesk');
      const chatSentryExperience = resume.selectedExperienceBullets.find((e: any) => e.company === 'ChatSentry');
      const chatSentryPresent = !!chatSentryExperience;
      return summaryHasTickets && chatSentryPresent;
    },
  },
  {
    code: 'CENÁRIO E',
    title: 'Business Analyst',
    job: {
      id: 'test-resume-e',
      title: 'Business Analyst / Analista de Processos',
      company: 'Consultoria Corporativa',
      location: 'Curitiba, PR',
      workplaceType: 'Híbrido',
      seniority: 'Pleno',
      description: 'Análise de dados operacionais, criação de dashboards em Power BI, consultas SQL, planilhas gerenciais em Excel e otimização de processos.',
      requirements: ['Data Analysis', 'SQL', 'Power BI', 'Excel', 'Process Improvement', 'Dashboards'],
      publishedAt: '2026-08-08',
      url: '#',
      source: 'mock',
    },
    expectedChecks: (resume) => {
      const hasDataToolsInPriority = resume.prioritySkills.includes('Data Analysis') || resume.prioritySkills.includes('Power BI') || resume.prioritySkills.includes('SQL');
      const summaryHasBusiness = resume.professionalSummary.includes('Análise de dados') || resume.professionalSummary.includes('Power BI') || resume.professionalSummary.includes('Excel');
      return hasDataToolsInPriority && summaryHasBusiness;
    },
  },
  {
    code: 'CENÁRIO F',
    title: 'Job exigindo Salesforce obrigatório',
    job: {
      id: 'test-resume-f',
      title: 'Customer Success Manager com Salesforce',
      company: 'Enterprise Software US',
      location: 'Remoto',
      workplaceType: 'Remoto',
      seniority: 'Sênior',
      description: 'Exigência mandatória e obrigatória: experiência comprovada na administração e uso diário da plataforma Salesforce CRM por pelo menos 3 anos.',
      requirements: ['Salesforce', 'Customer Success', 'B2B', 'Customer Retention'],
      publishedAt: '2026-08-08',
      url: '#',
      source: 'mock',
    },
    expectedChecks: (resume) => {
      // CRITICAL CHECK: Salesforce MUST appear in missing, and NEVER in candidate priority skills or experience highlights
      const isSalesforceInMissing = resume.atsKeywords.missing.some((m: string) => m.toLowerCase().includes('salesforce'));
      const isSalesforceInSkills = resume.prioritySkills.some((s: string) => s.toLowerCase().includes('salesforce'));
      
      const allBulletsStr = resume.selectedExperienceBullets
        .flatMap((e: any) => e.highlights)
        .join(' ')
        .toLowerCase();
      
      const isSalesforceInBullets = allBulletsStr.includes('salesforce');

      return isSalesforceInMissing && !isSalesforceInSkills && !isSalesforceInBullets;
    },
  },
];

export function runResumeTestSuite() {
  console.log('================================================================');
  console.log('   CURRÍCULO PERSONALIZADO - EXECUÇÃO DE BATERIA DE TESTES (A-F)');
  console.log('================================================================\n');

  let passedCount = 0;

  testScenariosJobs.forEach((scenario) => {
    const resume = generateTailoredResume(scenario.job, userProfile);
    const passed = scenario.expectedChecks(resume);

    if (passed) passedCount++;

    console.log(`[${scenario.code}] ${scenario.title}`);
    console.log(`  -> Headline Gerada: "${resume.headline}"`);
    console.log(`  -> Resumo Profissional: "${resume.professionalSummary.slice(0, 120)}..."`);
    console.log(`  -> Cobertura ATS (ATS Coverage Score): ${resume.atsCoverageScore}% (${resume.coveredJobKeywordsCount}/${resume.totalRelevantJobKeywords} keywords)`);
    console.log(`  -> Matched Keywords: ${resume.atsKeywords.matched.join(', ')}`);
    if (resume.atsKeywords.related.length > 0) {
      console.log(`  -> Related Keywords: ${resume.atsKeywords.related.map((r: any) => `${r.jobKeyword} -> ${r.candidateEquivalent}`).join('; ')}`);
    }
    if (resume.atsKeywords.missing.length > 0) {
      console.log(`  -> Missing Keywords (Lacunas Reais): ${resume.atsKeywords.missing.join(', ')}`);
    }
    console.log(`  -> Notas de Raciocínio:`);
    resume.notes.forEach((n: string) => console.log(`      * ${n}`));
    console.log(`  -> Status: ${passed ? '✅ PASSED' : '❌ FAILED'}\n`);
  });

  console.log('----------------------------------------------------------------');
  console.log(`RESULTADO FINAL: ${passedCount}/${testScenariosJobs.length} testes de currículo personalizado aprovados.`);
  console.log('----------------------------------------------------------------');
}

runResumeTestSuite();
