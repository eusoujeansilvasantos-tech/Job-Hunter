import React, { useState } from 'react';
import { X, Calendar, MessageSquare, Tag, FileText, Send, UserCheck, Clock, CheckSquare } from 'lucide-react';
import { JobWithAnalysis, ApplicationEventType } from '../types';
import { addManualApplicationEvent } from '../services/applicationStatus';

interface AddApplicationEventModalProps {
  job: JobWithAnalysis | null;
  isOpen: boolean;
  onClose: () => void;
  onEventAdded: () => void;
}

const EVENT_TYPE_OPTIONS: { type: ApplicationEventType; label: string; icon: React.ReactNode; desc: string }[] = [
  {
    type: 'RECRUITER_CONTACT',
    label: 'Contato de Recrutador',
    icon: <UserCheck className="w-4 h-4 text-blue-500" />,
    desc: 'Mensagem, e-mail ou ligação inicial de um recrutador.',
  },
  {
    type: 'INTERVIEW_SCHEDULED',
    label: 'Entrevista Agendada',
    icon: <Calendar className="w-4 h-4 text-amber-500" />,
    desc: 'Data e hora marcadas para entrevista de alinhamento ou técnica.',
  },
  {
    type: 'INTERVIEW_COMPLETED',
    label: 'Entrevista Realizada',
    icon: <Clock className="w-4 h-4 text-emerald-500" />,
    desc: 'Conclusão de etapa de entrevista.',
  },
  {
    type: 'TECHNICAL_TEST',
    label: 'Teste Técnico',
    icon: <FileText className="w-4 h-4 text-purple-500" />,
    desc: 'Recebimento ou realização de avaliação técnica/código.',
  },
  {
    type: 'CASE_SUBMITTED',
    label: 'Case Entregue',
    icon: <CheckSquare className="w-4 h-4 text-indigo-500" />,
    desc: 'Envio de estudo de caso ou apresentação solicitada.',
  },
  {
    type: 'FOLLOW_UP_SENT',
    label: 'Follow-up Enviado',
    icon: <Send className="w-4 h-4 text-teal-500" />,
    desc: 'E-mail ou mensagem enviada para solicitar status do processo.',
  },
  {
    type: 'OTHER',
    label: 'Outro Evento',
    icon: <Tag className="w-4 h-4 text-slate-500" />,
    desc: 'Qualquer outro acontecimento relevante no processo.',
  },
];

export const AddApplicationEventModal: React.FC<AddApplicationEventModalProps> = ({
  job,
  isOpen,
  onClose,
  onEventAdded,
}) => {
  const [selectedType, setSelectedType] = useState<ApplicationEventType>('RECRUITER_CONTACT');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !job) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      addManualApplicationEvent(job, selectedType, notes);
      onEventAdded();
      setNotes('');
      onClose();
    } catch (err) {
      console.error('Failed to add manual event:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-indigo-400" />
            <h3 className="font-bold text-sm tracking-wide text-slate-100">Adicionar Evento ao Histórico</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          <div>
            <label className="block text-slate-700 font-semibold mb-1.5">
              Tipo de Evento <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-1 gap-2 max-h-56 overflow-y-auto pr-1 border border-slate-200 rounded-lg p-2 bg-slate-50">
              {EVENT_TYPE_OPTIONS.map((opt) => (
                <label
                  key={opt.type}
                  className={`flex items-start gap-3 p-2.5 rounded-lg border cursor-pointer transition-all ${
                    selectedType === opt.type
                      ? 'bg-indigo-50/80 border-indigo-400 ring-1 ring-indigo-300'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="eventType"
                    value={opt.type}
                    checked={selectedType === opt.type}
                    onChange={() => setSelectedType(opt.type)}
                    className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5 font-bold text-slate-800">
                      {opt.icon}
                      <span>{opt.label}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Notas e Detalhes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Conversa com Fernanda (Recruiter HR) sobre faixa salarial e alinhamento de disponibilidade..."
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none"
            />
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:text-slate-800 border border-slate-200 hover:border-slate-300 rounded-lg transition-colors font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Registrar Evento</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
