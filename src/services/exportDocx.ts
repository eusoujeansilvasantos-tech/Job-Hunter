import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
} from 'docx';
import saveAs from 'file-saver';
import { FullResumeData } from './fullResume';
import { formatCompactPeriod } from './exportPdf';

/**
 * Sanitizes string for safe filename usage.
 */
export function sanitizeFilename(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_\-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

/**
 * Generates an ATS-friendly .docx document for candidate resume.
 */
export async function generateDocxBlob(resume: FullResumeData): Promise<Blob> {
  const isEn = resume.resumeLanguage === 'en';
  const children: Paragraph[] = [];

  // Helper for section headings
  const createSectionHeading = (text: string) => {
    return new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 240, after: 120 },
      children: [
        new TextRun({
          text: text.toUpperCase(),
          bold: true,
          size: 24, // 12pt
          font: 'Arial',
          color: '1E293B',
        }),
      ],
    });
  };

  // NAME
  children.push(
    new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: { after: 60 },
      children: [
        new TextRun({
          text: resume.name,
          bold: true,
          size: 32, // 16pt
          font: 'Arial',
          color: '0F172A',
        }),
      ],
    })
  );

  // HEADLINE
  children.push(
    new Paragraph({
      spacing: { after: 80 },
      children: [
        new TextRun({
          text: resume.headline,
          bold: true,
          size: 21, // 10.5pt
          font: 'Arial',
          color: '2563EB',
        }),
      ],
    })
  );

  // CONTACT INFO
  children.push(
    new Paragraph({
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: `${isEn ? 'Contact' : 'Contato'}: ${resume.phone} | ${resume.email} | ${resume.linkedin} | ${resume.location}`,
          size: 19, // 9.5pt
          font: 'Arial',
          color: '475569',
        }),
      ],
    })
  );

  // RESUMO PROFISSIONAL / PROFESSIONAL SUMMARY
  children.push(createSectionHeading(isEn ? 'Professional Summary' : 'Resumo Profissional'));
  children.push(
    new Paragraph({
      spacing: { after: 180 },
      children: [
        new TextRun({
          text: resume.professionalSummary,
          size: 20, // 10pt
          font: 'Arial',
          color: '334155',
        }),
      ],
    })
  );

  // COMPETÊNCIAS / SKILLS & TOOLS
  children.push(createSectionHeading(isEn ? 'Skills & Tools' : 'Competências & Ferramentas'));
  children.push(
    new Paragraph({
      spacing: { after: 60 },
      children: [
        new TextRun({ text: isEn ? 'Priority Skills: ' : 'Competências Prioritárias: ', bold: true, size: 20, font: 'Arial' }),
        new TextRun({ text: resume.prioritySkills.join(' • '), size: 20, font: 'Arial' }),
      ],
    })
  );
  children.push(
    new Paragraph({
      spacing: { after: 60 },
      children: [
        new TextRun({ text: isEn ? 'Tools & Systems: ' : 'Ferramentas & Sistemas: ', bold: true, size: 20, font: 'Arial' }),
        new TextRun({ text: resume.tools.join(', '), size: 20, font: 'Arial' }),
      ],
    })
  );
  children.push(
    new Paragraph({
      spacing: { after: 180 },
      children: [
        new TextRun({ text: isEn ? 'Languages: ' : 'Idiomas: ', bold: true, size: 20, font: 'Arial' }),
        new TextRun({ text: resume.languages.map((l) => `${l.language} (${l.level})`).join(', '), size: 20, font: 'Arial' }),
      ],
    })
  );

  // EXPERIÊNCIA PROFISSIONAL / PROFESSIONAL EXPERIENCE
  children.push(createSectionHeading(isEn ? 'Professional Experience' : 'Experiência Profissional'));

  resume.experiences.forEach((exp) => {
    children.push(
      new Paragraph({
        spacing: { before: 140, after: 60 },
        children: [
          new TextRun({
            text: exp.company.toUpperCase(),
            bold: true,
            size: 22, // 11pt
            font: 'Arial',
            color: '0F172A',
          }),
        ],
      })
    );

    exp.roles.forEach((role) => {
      const formattedPeriod = formatCompactPeriod(role.period, isEn);
      const isLongHeader = role.title.length + formattedPeriod.length > 55;

      if (isLongHeader) {
        // Stacked Title & Date for clean layout in Word / Google Docs
        children.push(
          new Paragraph({
            spacing: { before: 60, after: 20 },
            children: [
              new TextRun({
                text: role.title,
                bold: true,
                size: 20, // 10pt
                font: 'Arial',
                color: '1E293B',
              }),
            ],
          })
        );
        children.push(
          new Paragraph({
            spacing: { after: 60 },
            children: [
              new TextRun({
                text: formattedPeriod,
                size: 19, // 9.5pt
                font: 'Arial',
                color: '64748B',
              }),
            ],
          })
        );
      } else {
        // Single paragraph when title & date fit comfortably
        children.push(
          new Paragraph({
            spacing: { before: 60, after: 60 },
            children: [
              new TextRun({
                text: `${role.title} `,
                bold: true,
                size: 20,
                font: 'Arial',
                color: '1E293B',
              }),
              new TextRun({
                text: ` (${formattedPeriod})`,
                size: 19,
                font: 'Arial',
                color: '64748B',
              }),
            ],
          })
        );
      }

      role.highlights.forEach((highlight) => {
        children.push(
          new Paragraph({
            bullet: { level: 0 },
            spacing: { after: 40 },
            children: [
              new TextRun({
                text: highlight,
                size: 19,
                font: 'Arial',
                color: '334155',
              }),
            ],
          })
        );
      });
    });
  });

  // FORMAÇÃO ACADÊMICA / EDUCATION
  children.push(createSectionHeading(isEn ? 'Education' : 'Formação Acadêmica'));
  resume.education.forEach((edu) => {
    children.push(
      new Paragraph({
        bullet: { level: 0 },
        spacing: { after: 40 },
        children: [
          new TextRun({
            text: `${edu.degree} — `,
            bold: true,
            size: 19,
            font: 'Arial',
          }),
          new TextRun({
            text: `${edu.institution} (${edu.status})`,
            size: 19,
            font: 'Arial',
          }),
        ],
      })
    );
  });

  // IDIOMAS / LANGUAGES
  children.push(createSectionHeading(isEn ? 'Languages' : 'Idiomas'));
  resume.languages.forEach((lang) => {
    children.push(
      new Paragraph({
        bullet: { level: 0 },
        spacing: { after: 40 },
        children: [
          new TextRun({
            text: `${lang.language}: `,
            bold: true,
            size: 19,
            font: 'Arial',
          }),
          new TextRun({
            text: lang.level,
            size: 19,
            font: 'Arial',
          }),
        ],
      })
    );
  });

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440, // 1 inch (72 pt * 20 = 1440 twips)
              right: 1440,
              bottom: 1440,
              left: 1440,
            },
          },
        },
        children,
      },
    ],
  });

  return await Packer.toBlob(doc);
}

/**
 * Triggers browser download of DOCX resume file.
 */
export async function exportResumeToDocx(
  resume: FullResumeData,
  companyName: string,
  jobTitle: string
): Promise<void> {
  const blob = await generateDocxBlob(resume);
  const compSanitized = sanitizeFilename(companyName);
  const titleSanitized = sanitizeFilename(jobTitle);
  const filename = `Jean_Silva_${compSanitized}_${titleSanitized}.docx`;

  saveAs(blob, filename);
}
