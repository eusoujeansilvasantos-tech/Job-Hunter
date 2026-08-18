import { Job } from '../types';

export const mockJobs: Job[] = [
  {
    id: 'job-1',
    title: 'Customer Onboarding & Success Specialist',
    company: 'SaaSFlow Brasil',
    location: 'São Paulo, SP (100% Remoto)',
    workplaceType: 'Remoto',
    seniority: 'Pleno',
    description: `Buscamos um especialista em Customer Onboarding e Success com foco em clientes B2B SaaS.
Você será responsável por guiar os novos clientes durante as etapas críticas de implementação, garantindo adoção acelerada do produto, monitorando customer health e atuando proativamente na redução de churn e identificação de expansão.

Principais responsabilidades:
- Realizar diagnósticos consultivos na fase de onboarding para alinhar valor esperado.
- Conduzir reuniões de alinhamento e treinamento com múltiplos stakeholders.
- Acompanhar indicadores de retenção, NPS, CSAT e engajamento da carteira.
- Utilizar ferramentas de CRM e dados para priorizar contas em risco.
- Trabalhar em conjunto com equipes de Produto para sinalizar melhorias na jornada do cliente.`,
    requirements: [
      'Customer Success',
      'Customer Onboarding',
      'SaaS B2B',
      'Redução de Churn',
      'Customer Health',
      'HubSpot',
      'Zendesk',
      'Excel / Google Sheets',
      'Inglês intermediário/avançado',
    ],
    url: 'https://example.com/vagas/saasflow-cs-specialist',
    publishedAt: 'Há 2 dias',
    salaryRange: 'R$ 6.500 - R$ 8.500',
  },
  {
    id: 'job-2',
    title: 'Customer Success Operations Analyst',
    company: 'MetricsPay FinTech',
    location: 'Florianópolis, SC (Híbrido)',
    workplaceType: 'Híbrido',
    seniority: 'Pleno',
    description: `Procuramos um Analista de Operações de Customer Success (CS Ops) orientado a dados para estruturar nossos relatórios, segmentação de carteiras e dashboards operacionais.

O profissional será ponte entre as equipes de CS, Vendas e Product Analytics.
Atividades:
- Construção de dashboards em Power BI e consultas SQL para medir engajamento e churn.
- Criação e manutenção de automações no HubSpot e Zendesk.
- Mapeamento de pontos de fricção na jornada e otimização dos fluxos de atendimento.
- Monitoramento dos KPIs de CS (Health Score, NRR, GRR, Time to Value).`,
    requirements: [
      'Customer Success Operations',
      'SQL',
      'Power BI',
      'HubSpot',
      'Zendesk',
      'Process Improvement',
      'Análise de Dados',
      'Gestão de Carteira',
    ],
    url: 'https://example.com/vagas/metricspay-cs-ops',
    publishedAt: 'Há 1 dia',
    salaryRange: 'R$ 7.000 - R$ 9.000',
  },
  {
    id: 'job-3',
    title: 'Customer Experience & Journey Analyst',
    company: 'LogiTech B2B',
    location: 'Remoto - Brasil',
    workplaceType: 'Remoto',
    seniority: 'Pleno',
    description: `A LogiTech busca um Analista de CX focado em desenhar e otimizar a jornada do cliente B2B.

Você atuará identificando gargalos operacionais, analisando pesquisas de satisfação e estruturando relatórios estratégicos para o time executivo.

Responsabilidades:
- Mapear touchpoints da jornada e formular planos de ação para pontos de dor.
- Analisar volume de tickets (Intercom e Zendesk) para mapear demandas recorrentes.
- Integrar bases no Excel / Google Sheets com dashboards no Power BI.
- Conduzir reuniões com os times de produto e operações para melhoria contínua.`,
    requirements: [
      'Customer Experience',
      'Customer Journey',
      'Mapeamento de Jornada',
      'Zendesk',
      'Intercom',
      'Power BI',
      'Excel',
      'Análise de Feedback',
    ],
    url: 'https://example.com/vagas/logitech-cx-analyst',
    publishedAt: 'Publicada hoje',
    salaryRange: 'R$ 6.000 - R$ 7.500',
  },
  {
    id: 'job-4',
    title: 'Revenue Operations Analyst (RevOps)',
    company: 'CloudScale Global',
    location: 'São Paulo, SP (Remoto)',
    workplaceType: 'Remoto',
    seniority: 'Pleno',
    description: `Buscamos um Analista de RevOps com forte perfil analítico para unificar os fluxos de dados entre Marketing, Sales e Customer Success em ambiente SaaS multinacional.

Atribuições:
- Manter o CRM (HubSpot e Pipedrive) higienizado e integrado com bases de dados.
- Realizar consultas SQL e montar relatórios operacionais no Power BI.
- Acompanhar KPIs de retenção, expansão, velocidade do pipeline e conversão.
- Comunicação diária em Inglês com stakeholders globais.`,
    requirements: [
      'Revenue Operations',
      'SQL',
      'Power BI',
      'HubSpot',
      'Pipedrive',
      'Inglês Avançado/Fluente (C1/C2)',
      'SaaS',
      'Data Analysis',
    ],
    url: 'https://example.com/vagas/cloudscale-revops',
    publishedAt: 'Há 3 dias',
    salaryRange: 'R$ 8.000 - R$ 10.500',
  },
  {
    id: 'job-5',
    title: 'Business Analyst (Operações e Processos)',
    company: 'Grupo Vetta',
    location: 'Campinas, SP (Presencial)',
    workplaceType: 'Presencial',
    seniority: 'Pleno',
    description: `Atuação em projetos de transformação digital e padronização de processos corporativos.

O profissional atuará colhendo requisitos, analisando gargalos em processos administrativos e montando dashboards executivos para diretoria.`,
    requirements: [
      'Business Analyst',
      'Padronização de Processos',
      'Excel Avançado',
      'Power BI',
      'SQL Básico',
      'Gestão de Stakeholders',
    ],
    url: 'https://example.com/vagas/vetta-business-analyst',
    publishedAt: 'Há 5 dias',
    salaryRange: 'R$ 6.000 - R$ 7.800',
  },
  {
    id: 'job-6',
    title: 'Account Manager B2B - Enterprise',
    company: 'Nexus Software',
    location: 'Remoto - Brasil',
    workplaceType: 'Remoto',
    seniority: 'Especialista',
    description: `Gestão estratégica de contas Enterprise no segmento de tecnologia.

Responsável pela saúde da carteira, negociações de renovação contratual, mapeamento de oportunidades de expansão (upsell/cross-sell) e mitigação de churn.`,
    requirements: [
      'Account Management',
      'B2B Enterprise',
      'Gestão de Carteira',
      'Upsell & Expansão',
      'Customer Retention',
      'CRM',
      'Pipedrive',
    ],
    url: 'https://example.com/vagas/nexus-account-manager',
    publishedAt: 'Há 4 dias',
    salaryRange: 'R$ 9.000 - R$ 12.000 + Comissões',
  },
  {
    id: 'job-7',
    title: 'Customer Onboarding Specialist (Bilíngue)',
    company: 'GlobalCare SaaS',
    location: 'Remoto - Internacional',
    workplaceType: 'Remoto',
    seniority: 'Especialista',
    description: `Specialist responsible for onboarding tier-1 US & Latam enterprise clients. High interaction in English and Portuguese. Focus on reducing time-to-value, establishing health benchmarks, and driving initial product adoption.`,
    requirements: [
      'Customer Onboarding',
      'Inglês C2 / Fluente',
      'Product Adoption',
      'Customer Health',
      'Zendesk',
      'HubSpot',
      'SaaS B2B',
    ],
    url: 'https://example.com/vagas/globalcare-onboarding',
    publishedAt: 'Publicada hoje',
    salaryRange: 'R$ 8.500 - R$ 11.000',
  },
  {
    id: 'job-8',
    title: 'Senior Software Engineer (Full Stack Node/React)',
    company: 'TechCore Labs',
    location: 'São Paulo, SP (Remoto)',
    workplaceType: 'Remoto',
    seniority: 'Sênior',
    description: `Desenvolvimento de microsserviços distribuídos em Node.js, TypeScript e arquitetura AWS Serverless.

Vaga técnica para engenharia de software pura. Exige experiência sólida em Docker, Kubernetes, CI/CD, banco de dados relacionais e não-relacionais.`,
    requirements: [
      'Node.js',
      'TypeScript',
      'React',
      'AWS',
      'Docker',
      'Kubernetes',
      'Microservices',
      'CI/CD',
    ],
    url: 'https://example.com/vagas/techcore-fullstack',
    publishedAt: 'Há 6 dias',
    salaryRange: 'R$ 14.000 - R$ 18.000',
  },
];
