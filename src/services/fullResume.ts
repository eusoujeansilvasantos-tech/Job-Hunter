import { UserProfile } from '../types';
import { TailoredResume } from './resume';
import { ResumeLanguage } from './resumeLanguageDetector';
import { getUserProfileByLanguage } from '../data/profile';

export interface FullResumeRole {
  title: string;
  period: string;
  highlights: string[];
}

export interface FullResumeCompany {
  company: string;
  roles: FullResumeRole[];
}

export interface FullResumeData {
  resumeLanguage: ResumeLanguage;
  name: string;
  headline: string;
  phone: string;
  email: string;
  linkedin: string;
  location: string;
  professionalSummary: string;
  prioritySkills: string[];
  experiences: FullResumeCompany[];
  education: Array<{ degree: string; institution: string; status: string }>;
  tools: string[];
  languages: Array<{ language: string; level: string }>;
}

/**
 * Builds the full structured resume from TailoredResume and UserProfile.
 * Preserves exact real companies, roles, dates, education, tools, and contact info.
 * Adapts experience highlights and priority skills based on tailoring.
 */
export function buildFullResumeData(
  tailored: TailoredResume,
  profileOverride?: UserProfile
): FullResumeData {
  const lang = tailored.resumeLanguage || 'pt-BR';
  const profile = profileOverride || getUserProfileByLanguage(lang);

  // Map tailored experience highlights back to structured profile companies/roles
  const tailoredHighlightsByCompanyRole = new Map<string, string[]>();

  tailored.selectedExperienceBullets.forEach((exp) => {
    const key = `${exp.company.toLowerCase()}___${exp.role.toLowerCase()}`;
    tailoredHighlightsByCompanyRole.set(key, exp.highlights);
  });

  const structuredExperiences: FullResumeCompany[] = profile.mainExperiences.map((masterExp) => {
    const mappedRoles: FullResumeRole[] = masterExp.roles.map((masterRole) => {
      const key = `${masterExp.company.toLowerCase()}___${masterRole.title.toLowerCase()}`;
      const tailoredHighlights = tailoredHighlightsByCompanyRole.get(key);

      // Use tailored highlights if available; otherwise use top master role highlights
      const finalHighlights =
        tailoredHighlights && tailoredHighlights.length > 0
          ? tailoredHighlights
          : masterRole.highlights.slice(0, 3);

      let roleTitle = masterRole.title;
      if (lang === 'en') {
        if (masterExp.company === 'Prefeitura Municipal de Guariba') roleTitle = 'Human Resources Intern';
        if (masterExp.company === 'Raízen') roleTitle = 'Administrative Assistant';
      }

      return {
        title: roleTitle,
        period: masterRole.period,
        highlights: finalHighlights,
      };
    });

    return {
      company: masterExp.company,
      roles: mappedRoles,
    };
  });

  return {
    resumeLanguage: lang,
    name: profile.name.toUpperCase(),
    headline: tailored.headline,
    phone: profile.phone || '(16) 99761-0293',
    email: profile.email || 'eusoujeansilvasantos@gmail.com',
    linkedin: profile.linkedin || 'https://www.linkedin.com/in/jeansilvasantos/',
    location: profile.location || (lang === 'en' ? 'São Paulo, SP - Brazil' : 'São Paulo, SP - Brasil'),
    professionalSummary: tailored.professionalSummary,
    prioritySkills: tailored.prioritySkills,
    experiences: structuredExperiences,
    education: profile.education,
    tools: profile.tools,
    languages: profile.languages,
  };
}

/**
 * Formats FullResumeData as clean plain text suitable for clipboard or ATS plain text parsing.
 */
export function formatFullResumeAsText(resume: FullResumeData): string {
  const isEn = resume.resumeLanguage === 'en';
  const lines: string[] = [];

  lines.push(resume.name);
  lines.push(resume.headline);
  lines.push(
    `${isEn ? 'Contact' : 'Contato'}: ${resume.phone} | ${resume.email} | ${resume.linkedin} | ${resume.location}`
  );
  lines.push('');

  lines.push(isEn ? 'PROFESSIONAL SUMMARY' : 'RESUMO PROFISSIONAL');
  lines.push(resume.professionalSummary);
  lines.push('');

  lines.push(isEn ? 'SKILLS & TOOLS' : 'COMPETÊNCIAS');
  lines.push(`${isEn ? 'Priority Skills' : 'Competências Prioritárias'}: ${resume.prioritySkills.join(' • ')}`);
  lines.push(`${isEn ? 'Tools & Systems' : 'Ferramentas & Sistemas'}: ${resume.tools.join(', ')}`);
  lines.push(`${isEn ? 'Languages' : 'Idiomas'}: ${resume.languages.map((l) => `${l.language} (${l.level})`).join(', ')}`);
  lines.push('');

  lines.push(isEn ? 'PROFESSIONAL EXPERIENCE' : 'EXPERIÊNCIA PROFISSIONAL');
  lines.push('');

  resume.experiences.forEach((exp) => {
    lines.push(exp.company.toUpperCase());
    exp.roles.forEach((r) => {
      lines.push(`${r.title} (${r.period})`);
      r.highlights.forEach((h) => {
        lines.push(`  • ${h}`);
      });
      lines.push('');
    });
  });

  lines.push(isEn ? 'EDUCATION' : 'FORMAÇÃO');
  resume.education.forEach((edu) => {
    lines.push(`• ${edu.degree} — ${edu.institution} (${edu.status})`);
  });
  lines.push('');

  lines.push(isEn ? 'LANGUAGES' : 'IDIOMAS');
  resume.languages.forEach((lang) => {
    lines.push(`• ${lang.language}: ${lang.level}`);
  });

  return lines.join('\n');
}
