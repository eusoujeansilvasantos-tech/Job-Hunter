import React, { useState } from 'react';
import { X, PlusCircle, Sparkles } from 'lucide-react';
import { Job, WorkplaceType, SeniorityLevel } from '../types';

interface AddJobModalProps {
  onAddJob: (job: Job) => void;
  onClose: () => void;
}

export const AddJobModal: React.FC<AddJobModalProps> = ({ onAddJob, onClose }) => {
  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [location, setLocation] = useState('São Paulo, SP');
  const [workplaceType, setWorkplaceType] = useState<WorkplaceType>('Remoto');
  const [seniority, setSeniority] = useState<SeniorityLevel>('Pleno');
  const [salaryRange, setSalaryRange] = useState('');
  const [requirementsText, setRequirementsText] = useState('');
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !company.trim() || !description.trim()) {
      return;
    }

    const requirements = requirementsText
      .split('\n')
      .map((r) => r.trim())
      .filter((r) => r.length > 0);

    const newJob: Job = {
      id: `custom-job-${Date.now()}`,
      title: title.trim(),
      company: company.trim(),
      location: location.trim(),
      workplaceType,
      seniority,
      salaryRange: salaryRange.trim() || undefined,
      description: description.trim(),
      requirements: requirements.length > 0 ? requirements : ['Customer Success', 'SaaS B2B'],
      url: url.trim() || 'https://example.com/custom-job',
      publishedAt: 'Recém adicionada',
    };

    onAddJob(newJob);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div
        id="add-job-modal"
        className="bg-white border border-slate-200 rounded-lg w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-xl text-slate-800 my-4 flex flex-col"
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-200 sticky top-0 bg-white/95 z-10 flex items-center justify-between backdrop-blur">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <h2 className="text-base font-bold text-slate-900">Simular Vaga de Teste</h2>
          </div>
          <button
            id="close-add-job-modal-btn"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3.5">
          <p className="text-xs text-slate-500 font-medium">
            Cole as informações de uma vaga real ou crie uma vaga fictícia para testar a pontuação do algoritmo.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Cargo / Título da Vaga *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Customer Success Specialist"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-md px-3 py-1.5 text-xs text-slate-800 focus:outline-none transition shadow-2xs font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Empresa *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Logzz Tech"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-md px-3 py-1.5 text-xs text-slate-800 focus:outline-none transition shadow-2xs font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Modelo
              </label>
              <select
                value={workplaceType}
                onChange={(e) => setWorkplaceType(e.target.value as WorkplaceType)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-md px-3 py-1.5 text-xs text-slate-800 focus:outline-none transition shadow-2xs font-medium"
              >
                <option value="Remoto">Remoto</option>
                <option value="Híbrido">Híbrido</option>
                <option value="Presencial">Presencial</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Senioridade
              </label>
              <select
                value={seniority}
                onChange={(e) => setSeniority(e.target.value as SeniorityLevel)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-md px-3 py-1.5 text-xs text-slate-800 focus:outline-none transition shadow-2xs font-medium"
              >
                <option value="Júnior">Júnior</option>
                <option value="Pleno">Pleno</option>
                <option value="Sênior">Sênior</option>
                <option value="Especialista">Especialista</option>
                <option value="Liderança">Liderança</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Faixa Salarial (Opcional)
              </label>
              <input
                type="text"
                placeholder="Ex: R$ 7.000 - R$ 9.000"
                value={salaryRange}
                onChange={(e) => setSalaryRange(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-md px-3 py-1.5 text-xs text-slate-800 focus:outline-none transition shadow-2xs font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Localização
              </label>
              <input
                type="text"
                placeholder="Ex: São Paulo, SP (Remoto)"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-md px-3 py-1.5 text-xs text-slate-800 focus:outline-none transition shadow-2xs font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                URL da Vaga (Opcional)
              </label>
              <input
                type="url"
                placeholder="https://..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-md px-3 py-1.5 text-xs text-slate-800 focus:outline-none transition shadow-2xs font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Requisitos (1 por linha)
            </label>
            <textarea
              rows={3}
              placeholder="Customer Success&#10;SQL&#10;Power BI&#10;Inglês Fluente"
              value={requirementsText}
              onChange={(e) => setRequirementsText(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-md px-3 py-1.5 text-xs text-slate-800 focus:outline-none font-mono transition shadow-2xs"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Descrição da Vaga *
            </label>
            <textarea
              rows={4}
              required
              placeholder="Descreva as responsabilidades da vaga..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-md px-3 py-1.5 text-xs text-slate-800 focus:outline-none transition shadow-2xs font-sans"
            />
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-md text-xs font-bold transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Calcular Score e Adicionar</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
