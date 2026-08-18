import { Job, JobWithAnalysis, UserProfile, ResumeLanguage, CoverLetter, LinkedInMessageItem, LinkedInOutreachBundle, OutreachOptions, OutreachTone } from '../types';
import { detectResumeLanguage } from './resumeLanguageDetector';
import { detectRoleFamily, RoleFamily } from './resume';
import { getUserProfileByLanguage } from '../data/profile';

/**
 * Truncates text safely at word boundaries if it exceeds maxLength.
 */
function truncateToLimit(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  const truncated = text.slice(0, maxLen - 3);
  const lastSpace = truncated.lastIndexOf(' ');
  if (lastSpace > maxLen * 0.7) {
    return truncated.slice(0, lastSpace) + '...';
  }
  return truncated + '...';
}

/**
 * Helper to get clean first name if recruiterName is provided
 */
function getGreetingName(recruiterName?: string): string {
  if (!recruiterName || !recruiterName.trim()) return '';
  const first = recruiterName.trim().split(' ')[0];
  return first.charAt(0).toUpperCase() + first.slice(1);
}

/**
 * Generates a high-converting, tailored Cover Letter in PT-BR or EN.
 */
export function generateCoverLetter(
  job: Job | JobWithAnalysis,
  profile: UserProfile,
  options?: OutreachOptions
): CoverLetter {
  const language: ResumeLanguage = options?.language || detectResumeLanguage(job);
  const tone: OutreachTone = options?.tone || 'direct';
  const recName = options?.recruiterName?.trim() || '';
  const firstName = getGreetingName(recName);
  
  const activeProfile = getUserProfileByLanguage(language);
  const roleFamily: RoleFamily = detectRoleFamily(job.title, job.description || '');

  const company = job.company?.trim() || (language === 'en' ? 'your company' : 'sua empresa');
  const title = job.title?.trim() || (language === 'en' ? 'Position' : 'Vaga');

  let subject = '';
  let greeting = '';
  let openingParagraph = '';
  let achievementsParagraph = '';
  let valuePropositionParagraph = '';
  let closingParagraph = '';
  let signOff = '';

  if (language === 'en') {
    subject = `Application for ${title} — ${activeProfile.name}`;
    greeting = firstName ? `Dear ${firstName},` : `Dear Hiring Team at ${company},`;

    // 1. OPENING
    if (tone === 'executive') {
      openingParagraph = `I am writing to submit my application for the ${title} role at ${company}. With a proven background in Customer Success strategy, B2B SaaS client retention, and operational scalability, I have closely followed ${company}'s trajectory and believe my experience aligns directly with your current strategic objectives.`;
    } else if (tone === 'enthusiastic') {
      openingParagraph = `I am thrilled to apply for the ${title} position at ${company}! As a dedicated Customer Success professional passionate about exceptional client journeys and high-growth B2B SaaS environments, joining ${company} represents an exciting opportunity to deliver immediate impact and champion customer value.`;
    } else {
      // direct
      openingParagraph = `I am writing to express my strong interest in the ${title} position at ${company}. With a solid track record in Customer Success, onboarding optimization, and B2B SaaS account management, I have developed the operational rigor required to accelerate time-to-value and safeguard client retention.`;
    }

    // 2. ACHIEVEMENTS & EVIDENCE
    if (roleFamily === 'ONBOARDING') {
      achievementsParagraph = `In my previous roles, I structured end-to-end B2B onboarding programs managing 5 to 15 new client implementations per month, significantly shortening time-to-value and driving rapid product adoption. Furthermore, by identifying friction points and executing proactive health check routines, I contributed directly to a 15% reduction in customer churn.`;
    } else if (roleFamily === 'CUSTOMER_EXPERIENCE' || roleFamily === 'CS_OPERATIONS') {
      achievementsParagraph = `Throughout my career, I have specialized in mapping customer journeys, diagnosing critical touchpoints, and leveraging data analytics (SQL, Power BI, and CRM workflows) to eliminate friction. My operational interventions generated measurable results, including a 15% reduction in churn and efficient portfolio governance across 150+ active client accounts.`;
    } else if (roleFamily === 'ACCOUNT_MANAGEMENT') {
      achievementsParagraph = `Managing active portfolios of over 150 corporate accounts, I have consistently aligned executive stakeholder expectations with product value, mitigating cancellation risks and unlocking expansion opportunities. My data-driven health score tracking contributed to an overall 15% reduction in client attrition.`;
    } else {
      achievementsParagraph = `Throughout my career, I have driven customer retention and operational excellence, resulting in a 15% reduction in customer churn through structured onboarding and early risk intervention. I have successfully managed over 150 corporate accounts, conducting 5–15 B2B implementations monthly while maintaining top-tier customer satisfaction ratings.`;
    }

    // 3. VALUE PROPOSITION & TECH FIT
    valuePropositionParagraph = `My approach combines consultative relationship management with analytical execution. I bring hands-on proficiency in modern CRM and productivity ecosystems (HubSpot, Pipedrive, Zendesk, Intercom, Power BI, SQL, and Excel), enabling me to translate complex operational metrics into actionable retention strategies.`;

    // 4. CLOSING & CTA
    if (tone === 'executive') {
      closingParagraph = `I welcome the opportunity to discuss how my background in customer lifecycle management and retention analytics can support ${company}'s expansion goals. Thank you for your time and consideration.`;
    } else {
      closingParagraph = `I look forward to discussing how my experience and passion for customer success can generate immediate results for ${company}. Thank you very much for your time and review.`;
    }

    signOff = `Sincerely,\n${activeProfile.name}\n${activeProfile.phone || ''} • ${activeProfile.email || ''}\nLinkedIn: ${activeProfile.linkedin || ''}`;
  } else {
    // PT-BR
    subject = `Candidatura: ${title} — ${activeProfile.name}`;
    greeting = firstName ? `Olá, ${firstName},` : `Prezada equipe de Atração e Seleção da ${company},`;

    // 1. OPENING
    if (tone === 'executive') {
      openingParagraph = `Apresento minha candidatura para a posição de ${title} na ${company}. Com trajetória consolidada em estratégias de Customer Success, retenção de carteira B2B SaaS e governança operacional, acompanho com entusiasmo a evolução da ${company} e vejo total sinergia entre os desafios da função e minhas competências.`;
    } else if (tone === 'enthusiastic') {
      openingParagraph = `É com grande entusiasmo que manifesto meu interesse na vaga de ${title} na ${company}! Como profissional apaixonado por Customer Success e por proporcionar jornadas memoráveis aos clientes em empresas B2B e SaaS, vejo na ${company} o ambiente ideal para gerar impacto positivo e impulsionar resultados sustentáveis.`;
    } else {
      // direct
      openingParagraph = `Escrevo para manifestar meu forte interesse na posição de ${title} na ${company}. Com sólida experiência em Customer Success, estruturação de onboarding e gestão de relacionamento no mercado B2B SaaS, desenvolvi uma atuação orientada a dados focada em acelerar o time-to-value e maximizar a retenção de clientes.`;
    }

    // 2. ACHIEVEMENTS & EVIDENCE
    if (roleFamily === 'ONBOARDING') {
      achievementsParagraph = `Em minha trajetória, estruturei e liderei processos consultivos de onboarding B2B conduzindo de 5 a 15 implantações por mês, acelerando a curva de adoção do produto. Além disso, por meio do diagnóstico precoce de contas em risco e padronização de touchpoints, atuei diretamente na redução de 15% no churn da base.`;
    } else if (roleFamily === 'CUSTOMER_EXPERIENCE' || roleFamily === 'CS_OPERATIONS') {
      achievementsParagraph = `Ao longo da minha carreira, atuei fortemente no mapeamento da jornada do cliente, identificação de gargalos operacionais e análise de métricas (SQL, Power BI e relatórios de Health Score). Essas iniciativas permitiram mitigar riscos com antecedência, gerenciar carteiras com mais de 150 clientes ativos e reduzir a taxa de cancelamento em 15%.`;
    } else if (roleFamily === 'ACCOUNT_MANAGEMENT') {
      achievementsParagraph = `Gerenciando carteiras ativas com mais de 150 contas corporativas, atuei no alinhamento contínuo de expectativas com stakeholders estratégicos, garantindo a entrega do valor contratado e desbloqueando oportunidades de expansão. Minha atuação analítica na gestão de risco contribuiu diretamente para uma redução de 15% no churn.`;
    } else {
      achievementsParagraph = `Em minhas experiências anteriores, liderei iniciativas que resultaram na redução de churn em 15% por meio de atuação preventiva e otimização de processos de onboarding (5 a 15 novos clientes B2B/mês). Tenho experiência na gestão de carteiras ativas com mais de 150 clientes e atendimento consultivo de alta performance.`;
    }

    // 3. VALUE PROPOSITION & TECH FIT
    valuePropositionParagraph = `Minha metodologia une relacionamento consultivo e rigor analítico. Tenho domínio prático das principais ferramentas do ecossistema de CS e dados (HubSpot, Pipedrive, Zendesk, Intercom, Power BI, SQL e Excel), o que me permite traduzir indicadores de saúde e engajamento em planos de ação efetivos.`;

    // 4. CLOSING & CTA
    if (tone === 'executive') {
      closingParagraph = `Estou à disposição para uma conversa onde poderei apresentar em detalhes como minha experiência em governança de CS e retenção pode agregar valor aos objetivos da ${company}. Agradeço pela atenção e consideração.`;
    } else {
      closingParagraph = `Estou à disposição para uma entrevista onde poderei detalhar como minhas competências podem gerar resultados imediatos para o time da ${company}. Agradeço desde já pela atenção.`;
    }

    signOff = `Atenciosamente,\n${activeProfile.name}\n${activeProfile.phone || ''} • ${activeProfile.email || ''}\nLinkedIn: ${activeProfile.linkedin || ''}`;
  }

  const fullText = [
    greeting,
    '',
    openingParagraph,
    '',
    achievementsParagraph,
    '',
    valuePropositionParagraph,
    '',
    closingParagraph,
    '',
    signOff,
  ].join('\n');

  return {
    language,
    recruiterName: recName || undefined,
    tone,
    subject,
    greeting,
    openingParagraph,
    achievementsParagraph,
    valuePropositionParagraph,
    closingParagraph,
    signOff,
    fullText,
  };
}

/**
 * Generates tailored LinkedIn Outreach Messages (Connection Note <= 300 chars, InMail, Networking, Follow-up).
 */
export function generateLinkedInOutreach(
  job: Job | JobWithAnalysis,
  profile: UserProfile,
  options?: OutreachOptions
): LinkedInOutreachBundle {
  const language: ResumeLanguage = options?.language || detectResumeLanguage(job);
  const tone: OutreachTone = options?.tone || 'direct';
  const recName = options?.recruiterName?.trim() || '';
  const firstName = getGreetingName(recName);

  const activeProfile = getUserProfileByLanguage(language);
  const company = job.company?.trim() || (language === 'en' ? 'your company' : 'a empresa');
  const title = job.title?.trim() || (language === 'en' ? 'the open role' : 'a vaga');

  // Short company name for character saving
  const shortCompany = company.length > 22 ? company.slice(0, 20) + '..' : company;
  const shortTitle = title.length > 26 ? title.slice(0, 24) + '..' : title;

  // 1. CONNECTION NOTE (Hard Limit: 300 characters)
  let connectionRaw = '';
  if (language === 'en') {
    const greeting = firstName ? `Hi ${firstName},` : 'Hello!';
    if (tone === 'executive') {
      connectionRaw = `${greeting} I applied for ${shortTitle} at ${shortCompany}. With strong background in B2B CS, 15% churn reduction & scalable client governance, I'd love to connect and follow your team's growth. Best regards!`;
    } else if (tone === 'enthusiastic') {
      connectionRaw = `${greeting} Thrilled to apply for ${shortTitle} at ${shortCompany}! Passionate about high-impact CS, 15% churn reduction & smooth B2B onboarding. Would love to connect and follow your journey!`;
    } else {
      connectionRaw = `${greeting} I just applied for ${shortTitle} at ${shortCompany}! Bringing solid B2B CS experience (15% churn reduction, 150+ portfolio). Would love to connect and follow ${shortCompany}. Best!`;
    }
  } else {
    // PT-BR
    const greeting = firstName ? `Olá, ${firstName}!` : 'Olá!';
    if (tone === 'executive') {
      connectionRaw = `${greeting} Me candidatei para ${shortTitle} na ${shortCompany}. Tenho sólida atuação em CS B2B, redução de 15% no churn e gestão de carteiras. Gostaria de me conectar e acompanhar a ${shortCompany}. Abraço!`;
    } else if (tone === 'enthusiastic') {
      connectionRaw = `${greeting} Muito animado com a vaga de ${shortTitle} na ${shortCompany}! Tenho foco em CS, redução de 15% de churn e onboarding ágil. Seria um prazer me conectar e acompanhar a equipe!`;
    } else {
      connectionRaw = `${greeting} Me candidatei à vaga de ${shortTitle} na ${shortCompany}! Tenho experiência em CS B2B, redução de 15% no churn e gestão de mais de 150 contas. Gostaria de me conectar. Um abraço!`;
    }
  }

  // Ensure strict <= 300 char limit
  const connectionContent = truncateToLimit(connectionRaw, 300);

  // 2. INMAIL / POST-APPLICATION MESSAGE (400 - 700 chars)
  let inMailContent = '';
  if (language === 'en') {
    const greeting = firstName ? `Hi ${firstName}, hope you are well!` : `Dear Hiring Team,`;
    inMailContent = `${greeting}\n\nI recently submitted my application for the ${title} position at ${company}. Having managed portfolios of 150+ B2B clients with proven results in reducing churn by 15% and structuring rapid onboarding, I am very enthusiastic about how my background aligns with your team's goals.\n\nI've attached my tailored resume and would welcome the chance to share how I can add value to ${company}.\n\nBest regards,\n${activeProfile.name}`;
  } else {
    const greeting = firstName ? `Olá, ${firstName}, tudo bem?` : `Olá, equipe de Atração e Seleção da ${company},`;
    inMailContent = `${greeting}\n\nAcabei de me candidatar para a vaga de ${title} na ${company} e gostaria de reforçar meu grande interesse. Tenho experiência com gestão de carteiras de mais de 150 clientes B2B, histórico de redução de 15% no churn e estruturação de onboarding consultivo.\n\nEstou à disposição para uma conversa e para compartilhar mais sobre como posso contribuir com os objetivos da ${company}.\n\nUm abraço,\n${activeProfile.name}`;
  }

  // 3. NETWORKING / PEER OUTREACH (300 - 500 chars)
  let networkingContent = '';
  if (language === 'en') {
    const greeting = firstName ? `Hi ${firstName},` : 'Hi there!';
    networkingContent = `${greeting} I hope you're having a great week. I saw that you work at ${company} and wanted to reach out. I'm currently applying for the ${title} role and admire the company's trajectory.\n\nIf you have a quick moment sometime, I'd love to hear a bit about your experience with the team culture. Wishing you great success!`;
  } else {
    const greeting = firstName ? `Olá, ${firstName}, tudo bem?` : 'Olá, tudo bem?';
    networkingContent = `${greeting} Vi que você faz parte do time da ${company} e resolvi dar um alô. Estou participando do processo para a vaga de ${title} e admiro bastante o trabalho de vocês.\n\nSe tiver um tempinho, adoraria saber um pouco sobre o dia a dia e a cultura da área. Um abraço e muito sucesso!`;
  }

  // 4. FOLLOW-UP MESSAGE (Post 7-14 days)
  let followUpContent = '';
  if (language === 'en') {
    const greeting = firstName ? `Hi ${firstName}, hope your week is going well!` : `Hi team,`;
    followUpContent = `${greeting}\n\nI'm following up on my application for the ${title} role submitted recently. I remain very enthusiastic about the opportunity to contribute to ${company} with my experience in CS and client retention.\n\nPlease let me know if there is any additional information or portfolio detail I can provide. Thank you for your time!`;
  } else {
    const greeting = firstName ? `Olá, ${firstName}, espero que esteja tendo uma ótima semana!` : `Olá, tudo bem?`;
    followUpContent = `${greeting}\n\nEstou passando para fazer um breve acompanhamento sobre minha candidatura para a vaga de ${title} enviada recentemente. Continuo muito motivado com a oportunidade de somar ao time da ${company}.\n\nCaso precisem de alguma informação adicional ou portfólio, estou à total disposição. Agradeço pela atenção!`;
  }

  return {
    language,
    recruiterName: recName || undefined,
    tone,
    connectionNote: {
      id: 'linkedin-connection-note',
      title: language === 'en' ? '1. LinkedIn Connection Note (Invite)' : '1. Nota de Conexão (Convite LinkedIn)',
      description: language === 'en' ? 'Limit: 300 chars. Ideal for sending with the connection request.' : 'Limite: 300 caracteres. Ideal para enviar junto com o pedido de conexão.',
      content: connectionContent,
      charCount: connectionContent.length,
      charLimit: 300,
      recommendedTiming: language === 'en' ? 'Immediately after applying' : 'Imediatamente após a candidatura',
    },
    inMailMessage: {
      id: 'linkedin-inmail-direct',
      title: language === 'en' ? '2. Direct InMail / Recruiter DM' : '2. Mensagem Direta / InMail pós-candidatura',
      description: language === 'en' ? 'Direct message for recruiters or hiring managers after connecting.' : 'Mensagem completa para recrutador ou gestor após aceitarem a conexão.',
      content: inMailContent,
      charCount: inMailContent.length,
      recommendedTiming: language === 'en' ? '1-2 days after applying or once connected' : '1 a 2 dias após aplicar ou ao conectar',
    },
    networkingMessage: {
      id: 'linkedin-peer-networking',
      title: language === 'en' ? '3. Peer / Team Networking Outreach' : '3. Abordagem de Networking (Futuros Pares)',
      description: language === 'en' ? 'Polite message for employees on the same team to understand culture.' : 'Abordagem amigável para colaboradores da área para entender a cultura.',
      content: networkingContent,
      charCount: networkingContent.length,
      recommendedTiming: language === 'en' ? 'During application preparation' : 'Durante a preparação da candidatura',
    },
    followUpMessage: {
      id: 'linkedin-follow-up-checkin',
      title: language === 'en' ? '4. Follow-up Check-in Message' : '4. Mensagem de Follow-up (7 a 14 dias)',
      description: language === 'en' ? 'Polite status inquiry when there has been no feedback.' : 'Mensagem elegante para checar o andamento após dias sem retorno.',
      content: followUpContent,
      charCount: followUpContent.length,
      recommendedTiming: language === 'en' ? '7–10 days after applying' : '7 a 10 dias após a candidatura',
    },
  };
}
