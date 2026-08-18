import { UserProfile } from '../types';

export const userProfilePt: UserProfile = {
  name: 'Jean Silva',
  phone: '(16) 99761-0293',
  email: 'eusoujeansilvasantos@gmail.com',
  linkedin: 'https://www.linkedin.com/in/jeansilvasantos/',
  location: 'São Paulo, SP - Brasil',
  targetTitles: [
    'Customer Success Analyst',
    'Customer Success Specialist',
    'Customer Success Operations',
    'Customer Experience Analyst',
    'Customer Onboarding Specialist',
    'Customer Journey Analyst',
    'Customer Insights Analyst',
    'CRM Analyst',
    'Customer Retention Analyst',
    'Account Manager',
    'Implementation Specialist',
    'Business Operations Analyst',
    'Business Analyst',
    'Sales Operations Analyst',
    'Revenue Operations Analyst',
  ],
  skills: [
    'Customer Success',
    'Customer Experience',
    'B2B',
    'SaaS',
    'Customer Onboarding',
    'Product Adoption',
    'Customer Adoption',
    'Customer Lifecycle',
    'Account Management',
    'Gestão de Carteira',
    'Customer Retention',
    'Retention',
    'Churn Reduction',
    'Customer Health',
    'Risk Management',
    'Customer Journey',
    'Journey Mapping',
    'Customer Insights',
    'Customer Segmentation',
    'Upsell',
    'Expansion',
    'Process Improvement',
    'Stakeholder Management',
    'SQL',
    'Power BI',
    'HubSpot',
    'Excel',
    'Google Sheets',
    'Zendesk',
    'Intercom',
    'Pipedrive',
    'Reporting',
    'Dashboards',
    'KPI Monitoring',
    'Data Analysis',
  ],
  provenResults: [
    'Redução de churn em 15% por meio da otimização de onboarding e atuação proativa em contas de risco.',
    'Condução de 5 a 15 onboardings B2B por mês.',
    'Gerenciamento de carteira ativa com mais de 150 clientes.',
    'Atendimento ágil em inglês e português com aproximadamente 60 tickets resolvidos por dia.',
  ],
  mainExperiences: [
    {
      company: 'Logzz',
      roles: [
        {
          title: 'Customer Onboarding & Success Analyst',
          period: 'Abril de 2025 – Outubro de 2025',
          highlights: [
            'Redução de churn em 15% por meio da otimização do onboarding e atuação proativa em contas de risco.',
            'Condução de 5 a 15 onboardings B2B por mês.',
            'Diagnóstico consultivo de clientes e alinhamento de expectativas de sucesso.',
            'Acompanhamento de engajamento, adoção de produto e métricas de customer health.',
            'Gestão contínua do relacionamento durante as etapas de onboarding, adoção, retenção e expansão.',
            'Uso estratégico de dados para segmentação e priorização de atendimento da carteira.',
          ],
        },
        {
          title: 'Customer Experience Analyst',
          period: 'Maio de 2024 – Abril de 2025',
          highlights: [
            'Mapeamento detalhado da jornada do cliente para identificar touchpoints críticos e pontos de fricção.',
            'Análise quantitativa e qualitativa de feedbacks (NPS, CSAT), dados de uso e padrões comportamentais.',
            'Atuação interdisciplinar em conjunto com as equipes de Produto e Operações.',
            'Proposição e implementação de melhorias contínuas em processos para otimizar a experiência do cliente.',
          ],
        },
        {
          title: 'Customer Success Associate',
          period: 'Outubro de 2023 – Maio de 2024',
          highlights: [
            'Gestão de carteira com mais de 150 clientes corporativos.',
            'Monitoramento constante de engajamento, satisfação, taxa de adoção e risco de churn.',
            'Mapeamento proativo e identificação de oportunidades de upsell e expansão de conta.',
            'Desenvolvimento de relacionamento estratégico e consultivo com clientes da carteira.',
          ],
        },
      ],
    },
    {
      company: 'ChatSentry',
      roles: [
        {
          title: 'Bilingual Customer Service Freelancer',
          period: 'Outubro de 2025 – Janeiro de 2026',
          highlights: [
            'Atendimento bilíngue especializado em português e inglês.',
            'Resolução de aproximadamente 60 tickets complexos por dia.',
            'Mapeamento e identificação de problemas recorrentes relatados pelos clientes.',
            'Análise crítica de padrões de solicitações para retroalimentar a base de conhecimento.',
            'Proposta e execução de melhorias diretas nos fluxos de atendimento.',
          ],
        },
      ],
    },
    {
      company: 'Prefeitura Municipal de Guariba',
      roles: [
        {
          title: 'Estágio em Recursos Humanos',
          period: 'Setembro de 2022 – Novembro de 2023',
          highlights: [
            'Elaboração e organização de documentação administrativa corporativa.',
            'Desenvolvimento e manutenção de planilhas de controle gerencial.',
            'Atualização e gerenciamento de bases de dados internas do departamento.',
          ],
        },
      ],
    },
    {
      company: 'Raízen',
      roles: [
        {
          title: 'Assistente Administrativo',
          period: 'Agosto de 2019 – Outubro de 2021',
          highlights: [
            'Gestão e controle operacional de insumos tecnológicos da unidade.',
            'Padronização e documentação de processos operacionais internos.',
            'Execução e acompanhamento de rotinas de controle interno e auditoria.',
            'Organização e suporte administrativo de alta eficiência.',
          ],
        },
      ],
    },
  ],
  education: [
    {
      degree: 'Bacharelado em Administração de Empresas',
      institution: 'Universidade Paulista (UNIP)',
      status: 'Concluído',
    },
    {
      degree: 'Bacharelado em Relações Internacionais',
      institution: 'Universidade Anhembi Morumbi',
      status: 'Em andamento',
    },
  ],
  languages: [
    { language: 'Português', level: 'Nativo' },
    { language: 'Inglês', level: 'C2 (Avançado / Fluente)' },
  ],
  tools: [
    'SQL',
    'Power BI',
    'HubSpot',
    'Excel',
    'Google Sheets',
    'Zendesk',
    'Intercom',
    'Pipedrive',
  ],
};

export const userProfileEn: UserProfile = {
  ...userProfilePt,
  location: 'São Paulo, SP - Brazil',
  provenResults: [
    'Reduced customer churn by 15% through onboarding optimization and proactive management of at-risk accounts.',
    'Managed 5–15 B2B onboardings per month.',
    'Managed active portfolio of 150+ corporate accounts.',
    'Handled ~60 support tickets per day in English and Portuguese with C2 fluency.',
  ],
  mainExperiences: [
    {
      company: 'Logzz',
      roles: [
        {
          title: 'Customer Onboarding & Success Analyst',
          period: 'Abril de 2025 – Outubro de 2025',
          highlights: [
            'Reduced customer churn by 15% by optimizing onboarding processes and proactively engaging accounts showing adoption and engagement risk.',
            'Managed 5–15 B2B onboardings per month through consultative discovery, customer-goal alignment and structured adoption strategies.',
            'Monitored engagement, adoption and customer health indicators to identify risk and prioritize intervention.',
            'Managed customer relationships across onboarding, adoption, retention and expansion.',
            'Used customer and operational data to support segmentation, portfolio prioritization and Customer Success decisions.',
          ],
        },
        {
          title: 'Customer Experience Analyst',
          period: 'Maio de 2024 – Abril de 2025',
          highlights: [
            'Mapped the customer journey and identified friction across critical touchpoints.',
            'Analyzed customer feedback, usage data and behavioral patterns to support Product and Operations decisions.',
            'Collaborated cross-functionally to improve customer-centered processes and reduce friction.',
            'Proposed and implemented continuous process improvements to optimize customer journey and experience.',
          ],
        },
        {
          title: 'Customer Success Associate',
          period: 'Outubro de 2023 – Maio de 2024',
          highlights: [
            'Managed a portfolio of 150+ customers across the customer lifecycle.',
            'Monitored engagement, satisfaction, adoption and churn risk.',
            'Identified upsell, expansion and product-adoption opportunities.',
            'Acted as a strategic point of contact and supported resolution of complex customer issues.',
          ],
        },
      ],
    },
    {
      company: 'ChatSentry',
      roles: [
        {
          title: 'Bilingual Customer Service Freelancer',
          period: 'Outubro de 2025 – Janeiro de 2026',
          highlights: [
            'Handled customer interactions in Portuguese and English with C2 native-level fluency.',
            'Handled approximately 60 customer support tickets per day in Portuguese and English.',
            'Identified recurring customer issues by analyzing high-volume support interactions.',
            'Supported service-process improvements by translating recurring requests into operational insights.',
            'Proposed and executed direct improvements in customer service operational workflows.',
          ],
        },
      ],
    },
    {
      company: 'Prefeitura Municipal de Guariba',
      roles: [
        {
          title: 'Human Resources Intern',
          period: 'Setembro de 2022 – Novembro de 2023',
          highlights: [
            'Managed administrative documentation, spreadsheets and internal databases.',
            'Supported organization and maintenance of HR records and administrative information.',
            'Maintained internal management spreadsheets and Excel operational dashboards with guaranteed data integrity.',
          ],
        },
      ],
    },
    {
      company: 'Raízen',
      roles: [
        {
          title: 'Administrative Assistant',
          period: 'Agosto de 2019 – Outubro de 2021',
          highlights: [
            'Improved controls for technology supplies and supported operational continuity.',
            'Standardized administrative processes and recurring internal workflows.',
            'Supported internal controls, documentation and operational organization.',
          ],
        },
      ],
    },
  ],
  education: [
    {
      degree: "Bachelor's Degree in Business Administration",
      institution: 'Universidade Paulista (UNIP)',
      status: 'Completed',
    },
    {
      degree: "Bachelor's Degree in International Relations",
      institution: 'Universidade Anhembi Morumbi',
      status: 'In Progress',
    },
  ],
  languages: [
    { language: 'Portuguese', level: 'Native' },
    { language: 'English', level: 'C2 Proficient' },
  ],
};

// Default export for backwards compatibility
export const userProfile = userProfilePt;

export function getUserProfileByLanguage(language: 'pt-BR' | 'en'): UserProfile {
  return language === 'en' ? userProfileEn : userProfilePt;
}
