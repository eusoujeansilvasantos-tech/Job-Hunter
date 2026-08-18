import React, { useState, useEffect } from 'react';
import { Target, PlusCircle, TrendingUp, Cloud, LogOut } from 'lucide-react';
import { UserProfile } from '../types';
import { isSupabaseConfigured, initSupabase, signOutUser } from '../services/supabase';

interface HeaderProps {
  profile: UserProfile;
  onOpenProfile: () => void;
  onOpenAddJob: () => void;
  onOpenJobBoards?: () => void;
  onOpenCloudSync?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  profile,
  onOpenProfile,
  onOpenAddJob,
  onOpenJobBoards,
  onOpenCloudSync,
}) => {
  const [configured, setConfigured] = useState(isSupabaseConfigured);

  useEffect(() => {
    initSupabase().then(() => {
      setConfigured(isSupabaseConfigured);
    });
  }, []);

  const handleSignOut = async () => {
    await signOutUser();
  };

  return (
    <header className="bg-white border-b border-slate-200 text-slate-900 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          
          {/* Logo & Subtitle */}
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-black text-sm shadow-xs">
              JH
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 id="app-title" className="text-base font-bold tracking-tight text-slate-900 flex items-center gap-2">
                  JOB HUNTER AI
                </h1>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded flex items-center gap-1">
                  <Cloud className="w-3 h-3 text-emerald-600" />
                  Fase 2 • Supabase Cloud
                </span>
              </div>
              <p id="app-subtitle" className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">
                Encontre e priorize as melhores oportunidades no Brasil e Remoto.
              </p>
            </div>
          </div>

          {/* User Profile Badge & Quick Actions */}
          <div className="flex items-center flex-wrap gap-2">
            {onOpenCloudSync && (
              <button
                id="btn-open-cloud-sync"
                onClick={onOpenCloudSync}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-extrabold transition cursor-pointer shadow-2xs ${
                  configured
                    ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
                }`}
                title="Sincronização & Status do Supabase Cloud"
              >
                <Cloud className={`w-3.5 h-3.5 ${configured ? 'text-emerald-600' : 'text-slate-500'}`} />
                <span>Cloud Sync</span>
              </button>
            )}

            {onOpenJobBoards && (
              <button
                id="btn-open-job-boards"
                onClick={onOpenJobBoards}
                className="flex items-center gap-1.5 bg-gradient-to-r from-indigo-50 to-blue-50 hover:from-indigo-100 hover:to-blue-100 text-indigo-900 border border-indigo-200 px-2.5 py-1.5 rounded-md text-xs font-extrabold transition cursor-pointer shadow-2xs"
                title="Melhores Fontes & Gerenciador de Job Boards"
              >
                <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
                <span>Melhores Fontes (Yield)</span>
              </button>
            )}

            <button
              id="view-profile-btn"
              onClick={onOpenProfile}
              className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer"
              title="Visualizar Perfil Mestre de Jean Silva"
            >
              <div className="h-5 w-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[10px]">
                JS
              </div>
              <span className="hidden sm:inline font-bold text-slate-800">{profile.name}</span>
              <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-mono flex items-center gap-1">
                <Target className="w-3 h-3 text-blue-600" />
                {profile.targetTitles.length} Cargos
              </span>
            </button>

            <button
              id="add-custom-job-btn"
              onClick={onOpenAddJob}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-3 py-1.5 rounded-md text-xs transition shadow-2xs cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Simular Vaga</span>
            </button>

            <button
              id="btn-sign-out-header"
              onClick={handleSignOut}
              className="flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 font-bold px-2.5 py-1.5 rounded-md text-xs transition cursor-pointer shadow-2xs"
              title="Sair da conta e encerrar sessão"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-600" />
              <span>Sair</span>
            </button>
          </div>

        </div>
      </div>
    </header>
  );
};



