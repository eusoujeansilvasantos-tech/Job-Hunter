import { generateCoverLetter, generateLinkedInOutreach } from '../outreachGenerator';
import { userProfilePt } from '../../data/profile';
import { JobWithAnalysis } from '../../types';

export function runOutreachTests(): boolean {
  let passed = true;

  const assert = (condition: boolean, testName: string, detail?: string) => {
    if (condition) {
      console.log(`PASS [${testName}]`);
    } else {
      console.error(`FAIL [${testName}]: ${detail || 'Assertion failed'}`);
      passed = false;
    }
  };

  const sampleJobPt: JobWithAnalysis = {
    id: 'test-job-pt',
    title: 'Analista de Customer Success Pleno',
    company: 'Fintech Brasil',
    location: 'São Paulo, SP',
    workplaceType: 'Remoto',
    seniority: 'Pleno',
    description: 'Buscamos Analista de Customer Success para gerenciar carteira B2B, onboarding e métricas de retenção.',
    requirements: ['Customer Success', 'Onboarding', 'Retenção', 'SQL', 'Power BI'],
    url: 'https://fintechbrasil.com.br/vagas/123',
    publishedAt: new Date().toISOString(),
    analysis: {
      score: 92,
      classification: 'Excelente',
      breakdown: {
        titleScore: 20,
        skillsScore: 25,
        experienceScore: 20,
        toolsScore: 10,
        seniorityScore: 10,
        languageScore: 5,
        educationScore: 2,
        locationScore: 0,
      },
      matchedSkills: ['Customer Success', 'Onboarding', 'Retenção'],
      relatedSkills: [],
      missingSkills: [],
      matchReasons: ['Forte compatibilidade'],
      atsKeywords: ['Customer Success', 'Onboarding', 'SQL'],
    },
  };

  const sampleJobEn: JobWithAnalysis = {
    id: 'test-job-en',
    title: 'Senior Customer Success Manager',
    company: 'Global Cloud Scale',
    location: 'Remote - Brazil',
    workplaceType: 'Remoto',
    seniority: 'Sênior',
    description: 'Looking for a Senior Customer Success Manager with SaaS experience, retention focus and client onboarding.',
    requirements: ['Customer Success', 'SaaS', 'B2B', 'Retention', 'Churn Reduction'],
    url: 'https://globalcloud.com/careers/456',
    publishedAt: new Date().toISOString(),
    analysis: {
      score: 95,
      classification: 'Excelente',
      breakdown: {
        titleScore: 20,
        skillsScore: 25,
        experienceScore: 20,
        toolsScore: 10,
        seniorityScore: 10,
        languageScore: 5,
        educationScore: 3,
        locationScore: 2,
      },
      matchedSkills: ['Customer Success', 'SaaS', 'Retention'],
      relatedSkills: [],
      missingSkills: [],
      matchReasons: ['High compatibility'],
      atsKeywords: ['Customer Success', 'SaaS', 'Churn'],
    },
  };

  console.log('\n--- INICIANDO TESTES DO GERADOR DE ABORDAGENS (OUTREACH & COVER LETTER) ---');

  // Test 1: Cover Letter in Portuguese
  const coverLetterPt = generateCoverLetter(sampleJobPt, userProfilePt, {
    language: 'pt-BR',
    recruiterName: 'Mariana Silva',
    tone: 'direct',
  });
  assert(coverLetterPt.language === 'pt-BR', 'Cover Letter PT: Language Detection', `Got ${coverLetterPt.language}`);
  assert(coverLetterPt.greeting.includes('Mariana'), 'Cover Letter PT: Greeting contains first name', coverLetterPt.greeting);
  assert(coverLetterPt.openingParagraph.includes('Fintech Brasil'), 'Cover Letter PT: Contains company name');
  assert(coverLetterPt.achievementsParagraph.length > 50, 'Cover Letter PT: Achievements paragraph is substantive');
  assert(coverLetterPt.fullText.includes(userProfilePt.name), 'Cover Letter PT: Signed with candidate name');

  // Test 2: Cover Letter in English
  const coverLetterEn = generateCoverLetter(sampleJobEn, userProfilePt, {
    language: 'en',
    recruiterName: 'John Doe',
    tone: 'executive',
  });
  assert(coverLetterEn.language === 'en', 'Cover Letter EN: Language Detection', `Got ${coverLetterEn.language}`);
  assert(coverLetterEn.greeting.includes('John'), 'Cover Letter EN: Greeting contains first name', coverLetterEn.greeting);
  assert(coverLetterEn.openingParagraph.includes('Global Cloud Scale'), 'Cover Letter EN: Contains company name');
  assert(coverLetterEn.achievementsParagraph.includes('15% reduction in customer churn') || coverLetterEn.achievementsParagraph.includes('churn'), 'Cover Letter EN: Includes churn metric');

  // Test 3: Cover Letter without Recruiter Name fallback
  const coverLetterNoName = generateCoverLetter(sampleJobPt, userProfilePt, {
    language: 'pt-BR',
    recruiterName: '',
  });
  assert(coverLetterNoName.greeting.includes('Prezada equipe de Atração e Seleção'), 'Cover Letter Fallback: General hiring team greeting', coverLetterNoName.greeting);

  // Test 4: LinkedIn Connection Note Strict Character Limit (<= 300 chars)
  const linkedInPt = generateLinkedInOutreach(sampleJobPt, userProfilePt, {
    language: 'pt-BR',
    recruiterName: 'Mariana Silva',
    tone: 'direct',
  });
  assert(
    linkedInPt.connectionNote.charCount <= 300,
    'LinkedIn Connection Note PT: Strict Limit <= 300 chars',
    `Char count: ${linkedInPt.connectionNote.charCount}`
  );
  assert(linkedInPt.connectionNote.content.includes('Mariana'), 'LinkedIn Connection Note PT: Mentions recruiter');

  // Test 5: LinkedIn Connection Note EN Strict Character Limit (<= 300 chars)
  const linkedInEn = generateLinkedInOutreach(sampleJobEn, userProfilePt, {
    language: 'en',
    recruiterName: 'Alexander Hamilton',
    tone: 'enthusiastic',
  });
  assert(
    linkedInEn.connectionNote.charCount <= 300,
    'LinkedIn Connection Note EN: Strict Limit <= 300 chars',
    `Char count: ${linkedInEn.connectionNote.charCount}`
  );

  // Test 6: All 4 LinkedIn message types populated
  assert(Boolean(linkedInPt.inMailMessage.content), 'LinkedIn Bundle: InMail content exists');
  assert(Boolean(linkedInPt.networkingMessage.content), 'LinkedIn Bundle: Networking content exists');
  assert(Boolean(linkedInPt.followUpMessage.content), 'LinkedIn Bundle: FollowUp content exists');
  assert(linkedInPt.inMailMessage.charCount > 100, 'LinkedIn Bundle: InMail is detailed');

  // Test 7: Tone variations test
  const tones = ['direct', 'executive', 'enthusiastic'] as const;
  tones.forEach((t) => {
    const cl = generateCoverLetter(sampleJobPt, userProfilePt, { tone: t });
    assert(Boolean(cl.openingParagraph), `Cover Letter Tone [${t}]: Generates valid opening`);
  });

  console.log(`--- FIM DOS TESTES: ${passed ? 'TODOS PASSARAM COM SUCESSO! ✅' : 'HOUVE FALHAS! ❌'} ---\n`);
  return passed;
}

// Auto-run if executed directly
if (typeof require !== 'undefined' && require.main === module) {
  runOutreachTests();
}
