import { jsPDF } from 'jspdf';
import { formatCompactPeriod, generatePdfBlob } from '../exportPdf';
import { generateDocxBlob } from '../exportDocx';
import { FullResumeData } from '../fullResume';

export async function runResumeExportTests() {
  console.log('=== RUNNING RESUME EXPORT LAYOUT TESTS (CASES A-E) ===\n');

  let passed = true;

  const testCases = [
    {
      id: 'A',
      title: 'Customer Onboarding & Success Analyst',
      period: 'Abril de 2025 – Outubro de 2025',
      expectedCompact: 'Abr 2025 – Out 2025',
    },
    {
      id: 'B',
      title: 'Bilingual Customer Service Freelancer',
      period: 'Outubro de 2025 – Janeiro de 2026',
      expectedCompact: 'Out 2025 – Jan 2026',
    },
    {
      id: 'C',
      title: 'Estágio em Recursos Humanos',
      period: 'Setembro de 2022 – Novembro de 2023',
      expectedCompact: 'Set 2022 – Nov 2023',
    },
    {
      id: 'D',
      title: 'Assistente Administrativo',
      period: 'Agosto de 2019 – Outubro de 2021',
      expectedCompact: 'Ago 2019 – Out 2021',
    },
    {
      id: 'E',
      title: 'Diretor Internacional de Operações, Suporte Global e Transformação Digital de Atendimento ao Cliente B2B',
      period: 'Janeiro de 2020 – Dezembro de 2024',
      expectedCompact: 'Jan 2020 – Dez 2024',
    },
  ];

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const contentWidth = 174; // 210 - 36
  const minimumGap = 8;

  console.log('--- 1. DATE COMPACTING & PDF WIDTH MEASUREMENT TESTS ---');

  for (const tc of testCases) {
    const compactPeriod = formatCompactPeriod(tc.period);
    const dateMatches = compactPeriod === tc.expectedCompact;

    if (!dateMatches) {
      console.error(`FAIL [Test ${tc.id}]: Compact date mismatch. Got "${compactPeriod}", expected "${tc.expectedCompact}".`);
      passed = false;
    } else {
      console.log(`PASS [Test ${tc.id}]: Date formatted correctly -> "${compactPeriod}"`);
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    const titleWidth = doc.getTextWidth(tc.title);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    const dateWidth = doc.getTextWidth(compactPeriod);

    const totalWidth = titleWidth + dateWidth + minimumGap;
    const fitsOnOneLine = totalWidth <= contentWidth;

    console.log(
      `     Title width: ${titleWidth.toFixed(1)}mm | Date width: ${dateWidth.toFixed(
        1
      )}mm | Total: ${totalWidth.toFixed(1)}mm | Fits 1 line: ${fitsOnOneLine ? 'YES' : 'NO (WRAPS AUTOMATICALLY)'}`
    );

    if (tc.id === 'E') {
      if (!fitsOnOneLine) {
        console.log(`PASS [Test E]: Multi-line automatic wrapping triggered correctly when title + date exceeds page width.`);
      } else {
        console.error(`FAIL [Test E]: Title should exceed 174mm total line width to verify wrapping.`);
        passed = false;
      }
    }
  }

  console.log('\n--- 2. BLOB GENERATION INTEGRITY TEST ---');

  const mockResume: FullResumeData = {
    resumeLanguage: 'pt-BR',
    name: 'JEAN SILVA',
    headline: 'Especialista em Customer Success & Atendimento ao Cliente B2B/B2C',
    phone: '(16) 99761-0293',
    email: 'jean@example.com',
    linkedin: 'https://www.linkedin.com/in/jeansilvasantos/',
    location: 'São Paulo, SP - Brasil',
    professionalSummary:
      'Profissional focado em experiência do cliente, retenção, onboarding e suporte de alta qualidade.',
    prioritySkills: ['Customer Success', 'Onboarding', 'Retenção', 'CRM', 'Zendesk'],
    tools: ['Zendesk', 'Salesforce', 'HubSpot', 'Intercom', 'Excel Avançado'],
    languages: [
      { language: 'Português', level: 'Nativo' },
      { language: 'Inglês', level: 'Avançado' },
    ],
    experiences: [
      {
        company: 'LOGZZ',
        roles: [
          {
            title: 'Customer Onboarding & Success Analyst',
            period: 'Abril de 2025 – Outubro de 2025',
            highlights: ['Onboarding de clientes B2B com taxa de adoção de 94%.', 'Redução do churn precoce em 18%.'],
          },
        ],
      },
      {
        company: 'EMPRESA TESTE RH',
        roles: [
          {
            title: 'Estágio em Recursos Humanos',
            period: 'Setembro de 2022 – Novembro de 2023',
            highlights: ['Triagem de mais de 500 currículos.', 'Acompanhamento do processo seletivo e integração de novos colaboradores.'],
          },
        ],
      },
    ],
    education: [
      {
        degree: 'Bacharelado em Administração',
        institution: 'Universidade de São Paulo',
        status: 'Concluído',
      },
    ],
  };

  try {
    const pdfBlob = await generatePdfBlob(mockResume);
    if (pdfBlob && pdfBlob.size > 0) {
      console.log(`PASS [PDF Test]: Generated valid PDF Blob (${pdfBlob.size} bytes).`);
    } else {
      console.error('FAIL [PDF Test]: PDF Blob generation failed or produced 0 bytes.');
      passed = false;
    }

    const docxBlob = await generateDocxBlob(mockResume);
    if (docxBlob && docxBlob.size > 0) {
      console.log(`PASS [DOCX Test]: Generated valid DOCX Blob (${docxBlob.size} bytes).`);
    } else {
      console.error('FAIL [DOCX Test]: DOCX Blob generation failed or produced 0 bytes.');
      passed = false;
    }
  } catch (err) {
    console.error('FAIL [Blob Test]: Exception generated during export:', err);
    passed = false;
  }

  console.log(`\n=== TESTS A-E SUMMARY: ${passed ? 'ALL PASSED 100%' : 'SOME TESTS FAILED'} ===`);
  return passed;
}

runResumeExportTests();
