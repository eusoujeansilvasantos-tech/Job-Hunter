import React from 'react';
import { X, ShieldCheck, Target, Award, Briefcase, GraduationCap, Languages, Wrench, CheckCircle2 } from 'lucide-react';
import { UserProfile } from '../types';

interface ProfileModalProps {
  profile: UserProfile;
  onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ profile, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div
        id="profile-master-modal"
        className="bg-white border border-slate-200 rounded-lg w-full max-w-4xl max-h-[92vh] overflow-y-auto shadow-xl text-slate-800 my-4 flex flex-col"
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-200 sticky top-0 bg-white/95 z-10 flex items-start justify-between gap-3 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black text-base shadow-2xs">
              JS
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 leading-none">{profile.name}</h2>
                <span className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  Fonte da Verdade
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                Perfil Profissional Mestre • Nenhuma experiência ou métrica é inventada pelo sistema.
              </p>
            </div>
          </div>

          <button
            id="close-profile-modal-btn"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-5">
          
          {/* Fundamental Rule Banner */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 leading-relaxed font-medium">
              <strong className="text-amber-950 font-bold">Regra Fundamental do Sistema:</strong> O Job Hunter AI atua com estrita veracidade. O algoritmo e futuras otimizações apenas selecionam, reorganizam, resumem ou priorizam fatos reais contidos neste perfil. Fatos novos nunca serão criados.
            </div>
          </div>

          {/* Cargos-Alvo */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Target className="w-4 h-4 text-blue-600" />
              Cargos-Alvo Cadastrados ({profile.targetTitles.length})
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {profile.targetTitles.map((title) => (
                <span
                  key={title}
                  className="text-xs bg-blue-50 text-blue-800 border border-blue-200 px-2.5 py-1 rounded font-bold"
                >
                  {title}
                </span>
              ))}
            </div>
          </div>

          {/* Resultados Comprovados */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <Award className="w-4 h-4 text-emerald-600" />
              Resultados Comprovados
            </h3>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {profile.provenResults.map((result, idx) => (
                <li
                  key={idx}
                  className="bg-white p-2.5 rounded-md border border-slate-200 text-xs text-slate-800 flex items-start gap-2 font-medium shadow-2xs"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{result}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Competências */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Wrench className="w-4 h-4 text-indigo-600" />
              Competências Principais ({profile.skills.length})
            </h3>
            <div className="flex flex-wrap gap-1">
              {profile.skills.map((skill) => (
                <span
                  key={skill}
                  className="text-xs bg-slate-100 text-slate-800 border border-slate-200 px-2 py-0.5 rounded font-medium"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>

          {/* Experiência Profissional */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Briefcase className="w-4 h-4 text-blue-600" />
              Experiência Profissional
            </h3>

            <div className="space-y-3">
              {profile.mainExperiences.map((exp, i) => (
                <div key={i} className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 space-y-3">
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-blue-600"></span>
                    {exp.company}
                  </h4>

                  <div className="space-y-3 pl-2.5 border-l-2 border-slate-200">
                    {exp.roles.map((role, j) => (
                      <div key={j} className="space-y-1.5">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                          <span className="text-xs font-bold text-blue-800">{role.title}</span>
                          <span className="text-[10px] text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded font-bold w-fit">
                            {role.period}
                          </span>
                        </div>
                        <ul className="space-y-1 text-xs text-slate-700">
                          {role.highlights.map((h, k) => (
                            <li key={k} className="flex items-start gap-1.5 font-medium">
                              <span className="text-slate-400">•</span>
                              <span>{h}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Formação & Idiomas Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Formação */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <GraduationCap className="w-4 h-4 text-sky-600" />
                Formação Acadêmica
              </h3>
              <div className="space-y-2">
                {profile.education.map((edu, i) => (
                  <div key={i} className="bg-white p-2.5 rounded-md border border-slate-200 shadow-2xs">
                    <div className="text-xs font-bold text-slate-900">{edu.degree}</div>
                    <div className="text-[11px] text-slate-500 font-medium">{edu.institution}</div>
                    <span className="inline-block mt-1 text-[10px] bg-sky-50 text-sky-800 border border-sky-200 px-1.5 py-0.5 rounded font-bold">
                      {edu.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Idiomas & Ferramentas */}
            <div className="space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Languages className="w-4 h-4 text-purple-600" />
                  Idiomas
                </h3>
                <div className="space-y-1.5">
                  {profile.languages.map((lang, i) => (
                    <div key={i} className="flex justify-between items-center text-xs bg-white p-2 rounded-md border border-slate-200 shadow-2xs">
                      <span className="font-bold text-slate-800">{lang.language}</span>
                      <span className="bg-purple-50 text-purple-800 border border-purple-200 px-2 py-0.5 rounded text-[10px] font-bold">
                        {lang.level}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Wrench className="w-4 h-4 text-emerald-600" />
                  Ferramentas Principais
                </h3>
                <div className="flex flex-wrap gap-1">
                  {profile.tools.map((tool) => (
                    <span
                      key={tool}
                      className="text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded font-medium"
                    >
                      {tool}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-200 bg-slate-50 sticky bottom-0 flex justify-end">
          <button
            id="close-profile-modal-bottom-btn"
            onClick={onClose}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-bold text-xs transition cursor-pointer shadow-2xs"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
