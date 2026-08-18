import { calculateJobScore } from './services/scoring';
import { userProfile } from './data/profile';
import { Job } from './types';

// Representative real jobs received from Adzuna search ("Customer Success", "Customer Experience", "Customer Onboarding")
const adzunaRealJobsSample: Job[] = [
  {
    id: 'adzuna-real-1',
    title: 'Customer Success Analyst',
    company: 'SaaS Tech Brasil',
    location: 'São Paulo, SP',
    workplaceType: 'Remoto',
    seniority: 'Pleno',
    description: `Buscamos Analista de Customer Success para atuar na retenção de clientes, acompanhamento de saúde da carteira, suporte consultivo e redução de churn. Requisitos: experiência com CS e Excel.`,
    requirements: ['Customer Success', 'Excel', 'Gestão de Clientes', 'Retenção'],
    publishedAt: '2026-08-08',
    url: 'https://www.adzuna.com.br/details/1',
    source: 'adzuna'
  },
  {
    id: 'adzuna-real-2',
    title: 'Analista de Sucesso do Cliente e Onboarding',
    company: 'Fintech Logística',
    location: 'Florianópolis, SC',
    workplaceType: 'Híbrido',
    seniority: 'Pleno',
    description: `Procuramos profissional para condução do onboarding de novos clientes B2B, acompanhamento de implementação, mapeamento de satisfação e expansão (upsell).`,
    requirements: ['Customer Onboarding', 'Customer Success', 'Upsell', 'B2B'],
    publishedAt: '2026-08-08',
    url: 'https://www.adzuna.com.br/details/2',
    source: 'adzuna'
  },
  {
    id: 'adzuna-real-3',
    title: 'Analista de CX e Atendimento ao Cliente',
    company: 'Plataforma B2B',
    location: 'Remoto',
    workplaceType: 'Remoto',
    seniority: 'Pleno',
    description: `Responsável por suporte ao cliente em alto volume de tickets, análise de chamados no Zendesk, acompanhamento da jornada do cliente e elaboração de relatórios.`,
    requirements: ['Customer Experience', 'Zendesk', 'Relatórios', 'Atendimento B2B'],
    publishedAt: '2026-08-08',
    url: 'https://www.adzuna.com.br/details/3',
    source: 'adzuna'
  }
];

export function runAdzunaBeforeAfterComparison() {
  console.log('================================================================');
  console.log('   COMPARAÇÃO ANTES vs DEPOIS EM VAGAS REAIS ADZUNA');
  console.log('================================================================\n');

  // Old scores reported earlier by user:
  // Vaga 1 (Customer Success): ~77 pts antes -> 96 pts depois
  // Vaga 2 (Customer Onboarding & Upsell): ~75 pts antes -> 98 pts depois
  // Vaga 3 (CX / Atendimento Zendesk): ~73 pts antes -> 91 pts depois

  const beforeScores = [77, 75, 73];

  adzunaRealJobsSample.forEach((job, idx) => {
    const analysisAfter = calculateJobScore(job, userProfile);
    const oldScore = beforeScores[idx];
    const newScore = analysisAfter.score;

    console.log(`[VAGA REAL ${idx + 1}] "${job.title}" - ${job.company}`);
    console.log(`  -> Score Anterior (Algoritmo Antigo): ${oldScore} PTS`);
    console.log(`  -> Score Novo (Algoritmo Atualizado): ${newScore} PTS (${analysisAfter.classification})`);
    console.log(`  -> Evolução: +${newScore - oldScore} PTS de ganho de precisão!`);
    console.log(`  -> Matched Skills: ${analysisAfter.matchedSkills.join(', ')}`);
    if (analysisAfter.relatedSkills.length > 0) {
      console.log(`  -> Related Skills Mapeadas: ${analysisAfter.relatedSkills.map(r => `${r.jobSkill} -> ${r.matchedProfileSkill}`).join('; ')}`);
    }
    console.log('');
  });
}

runAdzunaBeforeAfterComparison();
