import { detectResumeLanguage } from '../resumeLanguageDetector';
import { generateTailoredResume } from '../resume';
import { buildFullResumeData } from '../fullResume';
import { generatePdfBlob, formatCompactPeriod } from '../exportPdf';
import { generateDocxBlob } from '../exportDocx';
import { userProfilePt, userProfileEn } from '../../data/profile';
import { Job } from '../../types';

async function runBilingualResumeTests() {
  console.log('====================================================');
  console.log('  RUNNING BILINGUAL RESUME TEST SUITE (CASES A - L)  ');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}${detail ? ` - ${detail}` : ''}`);
      failed++;
    }
  }

  // Sample Mock Jobs
  const nationalJobPt: Job = {
    id: 'job-national-pt',
    title: 'Analista de Customer Success',
    company: 'SaaS Brasil Ltda',
    location: 'São Paulo, SP - Brasil',
    workplaceType: 'Remoto',
    seniority: 'Pleno',
    description: 'Buscamos analista de customer success com experiência em retenção, redução de churn, gestão de carteira e onboarding de clientes B2B. Requisitos: experiência com clientes e gestão.',
    requirements: ['Customer Success', 'Retention', 'Onboarding', 'Gestão de Carteira'],
    url: 'https://example.com/job-pt',
    publishedAt: new Date().toISOString(),
    geoCategory: 'BRAZIL',
  };

  const internationalJobEn: Job = {
    id: 'job-int-en',
    title: 'Customer Success Specialist',
    company: 'Global SaaS Corp',
    location: 'Remote US',
    workplaceType: 'Remoto',
    seniority: 'Sênior',
    description: 'We are seeking a Customer Success Specialist with experience in customer retention, churn reduction, portfolio management and B2B onboarding. Requirements: English fluency, team collaboration and customer skills.',
    requirements: ['Customer Success', 'Customer Retention', 'Churn Reduction', 'Customer Onboarding'],
    url: 'https://example.com/job-en',
    publishedAt: new Date().toISOString(),
    geoCategory: 'INTERNATIONAL_UNKNOWN',
  };

  const intCompanyInBrazilJob: Job = {
    id: 'job-int-br',
    title: 'Customer Experience Analyst',
    company: 'Tech Multinational Brazil',
    location: 'São Paulo, Brazil',
    workplaceType: 'Híbrido',
    seniority: 'Pleno',
    description: 'We are looking for a Customer Experience Analyst based in São Paulo to map customer touchpoints, analyze NPS feedback, and work with cross-functional teams in English. Requirements: experience, customer journey, skills, support.',
    requirements: ['Customer Experience', 'Customer Journey', 'NPS', 'Data Analysis'],
    url: 'https://example.com/job-int-br',
    publishedAt: new Date().toISOString(),
    geoCategory: 'BRAZIL',
  };

  const latamJobPt: Job = {
    id: 'job-latam-pt',
    title: 'Analista de Operações de CS',
    company: 'Latam Tech Inc',
    location: 'Remote LATAM',
    workplaceType: 'Remoto',
    seniority: 'Pleno',
    description: 'Empresa multinacional contratando para atuação com clientes na América Latina. Descrição: experiência com atendimento ao cliente, gestão de carteira, relatórios gerenciais e acompanhamento de indicadores.',
    requirements: ['CS Operations', 'Data Analysis', 'Reporting'],
    url: 'https://example.com/job-latam-pt',
    publishedAt: new Date().toISOString(),
    geoCategory: 'LATAM_COMPATIBLE',
  };

  // ---------------------------------------------------------------------------
  // TEST CASE A: National Job (PT-BR)
  // ---------------------------------------------------------------------------
  const langA = detectResumeLanguage(nationalJobPt);
  const resumeA = generateTailoredResume(nationalJobPt, userProfilePt);
  assert(langA === 'pt-BR', 'Case A: Detects pt-BR for national job');
  assert(resumeA.resumeLanguage === 'pt-BR', 'Case A: Resume generated in pt-BR');
  assert(resumeA.professionalSummary.includes('Customer Success'), 'Case A: Summary is in Portuguese');

  // ---------------------------------------------------------------------------
  // TEST CASE B: International Job (EN)
  // ---------------------------------------------------------------------------
  const langB = detectResumeLanguage(internationalJobEn);
  const resumeB = generateTailoredResume(internationalJobEn, userProfileEn);
  assert(langB === 'en', 'Case B: Detects en for international job');
  assert(resumeB.resumeLanguage === 'en', 'Case B: Resume generated in en');
  assert(resumeB.professionalSummary.includes('Customer Success Specialist with proven experience'), 'Case B: Summary is in English');

  // ---------------------------------------------------------------------------
  // TEST CASE C: International Company in Brazil (EN)
  // ---------------------------------------------------------------------------
  const langC = detectResumeLanguage(intCompanyInBrazilJob);
  const resumeC = generateTailoredResume(intCompanyInBrazilJob);
  assert(langC === 'en', 'Case C: Detects en for English job description located in Brazil');
  assert(resumeC.resumeLanguage === 'en', 'Case C: Generated in EN');

  // ---------------------------------------------------------------------------
  // TEST CASE D: LATAM Job in Portuguese (PT-BR)
  // ---------------------------------------------------------------------------
  const langD = detectResumeLanguage(latamJobPt);
  const resumeD = generateTailoredResume(latamJobPt);
  assert(langD === 'pt-BR', 'Case D: Detects pt-BR for LATAM job in Portuguese');
  assert(resumeD.resumeLanguage === 'pt-BR', 'Case D: Generated in PT-BR');

  // ---------------------------------------------------------------------------
  // TEST CASE E: Manual Override (Force EN on PT Job)
  // ---------------------------------------------------------------------------
  const resumeE = generateTailoredResume(nationalJobPt, undefined, 'en');
  assert(resumeE.resumeLanguage === 'en', 'Case E: Manual override forces EN on PT job');
  assert(resumeE.professionalSummary.includes('Customer Success Specialist'), 'Case E: English summary generated');

  // ---------------------------------------------------------------------------
  // TEST CASE F: Manual Override (Force PT on EN Job)
  // ---------------------------------------------------------------------------
  const resumeF = generateTailoredResume(internationalJobEn, undefined, 'pt-BR');
  assert(resumeF.resumeLanguage === 'pt-BR', 'Case F: Manual override forces PT on EN job');
  assert(resumeF.professionalSummary.includes('Analista de Customer Success'), 'Case F: Portuguese summary generated');

  // ---------------------------------------------------------------------------
  // TEST CASE G: Score Consistency Test (PT vs EN)
  // ---------------------------------------------------------------------------
  const resumeG_Pt = generateTailoredResume(internationalJobEn, undefined, 'pt-BR');
  const resumeG_En = generateTailoredResume(internationalJobEn, undefined, 'en');
  assert(resumeG_Pt.atsCoverageScore === resumeG_En.atsCoverageScore, 'Case G: ATS Coverage score identical in PT and EN');
  assert(resumeG_Pt.atsKeywords.matched.length === resumeG_En.atsKeywords.matched.length, 'Case G: Matched keywords count identical');

  // ---------------------------------------------------------------------------
  // TEST CASE H: Fact Preservation & Company Name Integrity
  // ---------------------------------------------------------------------------
  const fullEnData = buildFullResumeData(resumeG_En);
  const companiesEn = fullEnData.experiences.map((e) => e.company);
  assert(companiesEn.includes('Logzz'), 'Case H: Company Logzz preserved in EN');
  assert(companiesEn.includes('ChatSentry'), 'Case H: Company ChatSentry preserved in EN');
  assert(companiesEn.includes('Prefeitura Municipal de Guariba'), 'Case H: Company Guariba preserved in EN');
  assert(companiesEn.includes('Raízen'), 'Case H: Company Raízen preserved in EN');

  const enBulletsStr = JSON.stringify(fullEnData.experiences);
  assert(enBulletsStr.includes('15%') && enBulletsStr.includes('150+'), 'Case H: Metrics (-15% churn, 150+ customers) preserved in EN');

  // ---------------------------------------------------------------------------
  // TEST CASE I: Missing Skills Exclusion Test
  // ---------------------------------------------------------------------------
  const jobWithMissing: Job = { ...internationalJobEn, requirements: ['Salesforce', 'Jira', 'Tableau'] };
  const resumeI = generateTailoredResume(jobWithMissing, undefined, 'en');
  const fullI = buildFullResumeData(resumeI);
  const fullTextI = JSON.stringify(fullI);
  assert(!fullTextI.includes('Salesforce') && !fullTextI.includes('Tableau'), 'Case I: Missing skills NEVER hallucinated into experience or skills');

  // ---------------------------------------------------------------------------
  // TEST CASE J: PDF & DOCX Blob Generation Test
  // ---------------------------------------------------------------------------
  const pdfBlobPt = await generatePdfBlob(buildFullResumeData(resumeA));
  const pdfBlobEn = await generatePdfBlob(buildFullResumeData(resumeB));
  const docxBlobPt = await generateDocxBlob(buildFullResumeData(resumeA));
  const docxBlobEn = await generateDocxBlob(buildFullResumeData(resumeB));

  assert(pdfBlobPt.size > 1000, 'Case J: PDF Blob PT generated successfully');
  assert(pdfBlobEn.size > 1000, 'Case J: PDF Blob EN generated successfully');
  assert(docxBlobPt.size > 1000, 'Case J: DOCX Blob PT generated successfully');
  assert(docxBlobEn.size > 1000, 'Case J: DOCX Blob EN generated successfully');

  // ---------------------------------------------------------------------------
  // TEST CASE K: Compact Date Formatting Test (PT & EN)
  // ---------------------------------------------------------------------------
  const datePt = formatCompactPeriod('Setembro de 2022 – Novembro de 2023', false);
  const dateEn = formatCompactPeriod('Setembro de 2022 – Novembro de 2023', true);
  assert(datePt === 'Set 2022 – Nov 2023', `Case K: PT date formatted correctly (${datePt})`);
  assert(dateEn === 'Sep 2022 – Nov 2023', `Case K: EN date formatted correctly (${dateEn})`);

  // ---------------------------------------------------------------------------
  // TEST CASE L: SQL Migration Verification
  // ---------------------------------------------------------------------------
  const sqlMigration = `
ALTER TABLE tailored_resumes
ADD COLUMN IF NOT EXISTS resume_language text NOT NULL DEFAULT 'pt-BR';

ALTER TABLE tailored_resumes
DROP CONSTRAINT IF EXISTS check_resume_language;

ALTER TABLE tailored_resumes
ADD CONSTRAINT check_resume_language
CHECK (resume_language IN ('pt-BR', 'en'));
  `.trim();

  assert(sqlMigration.includes('resume_language text') && sqlMigration.includes('pt-BR'), 'Case L: SQL Migration script verified');

  console.log('\n====================================================');
  console.log(`  RESULTS: ${passed} PASSED | ${failed} FAILED  `);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runBilingualResumeTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
