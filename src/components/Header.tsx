
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Theme } from '../types';

interface HeaderProps {
  theme: Theme;
  onToggleTheme: () => void;
  onOpenSidebar: () => void;
  currentViewTitle: string;
  onFixPatient?: (patient: { cns: string, name: string }) => void;
}

const Header: React.FC<HeaderProps> = ({ theme, onToggleTheme, onOpenSidebar, currentViewTitle, onFixPatient }) => {
  const [pendingPatients, setPendingPatients] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchPending = async () => {
      const { data } = await supabase
        .from('patients')
        .select('cns, name, id')
        .or('birth_date.is.null,city.is.null')
        .limit(50);
      
      if (data) setPendingPatients(data);
    };
    
    fetchPending();
    const interval = setInterval(fetchPending, 5000); // Poll every 5s
    return () => clearInterval(interval);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-30 bg-surface-light/80 dark:bg-surface-dark/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 py-3 flex items-center justify-between transition-colors duration-300">
      <div className="flex items-center gap-3">
        <button 
          onClick={onOpenSidebar}
          className="p-2 -ml-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-200 transition-colors"
        >
          <span className="material-symbols-outlined">menu</span>
        </button>
        <div className="flex flex-col">
          <span className="text-[10px] text-primary font-black uppercase tracking-widest">{currentViewTitle}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button 
          onClick={onToggleTheme}
          className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-200 transition-all hover:scale-110 active:scale-90 shadow-sm border border-slate-200 dark:border-slate-700"
          title={`Mudar para Modo ${theme === 'light' ? 'Escuro' : 'Claro'}`}
        >
          <span className="material-symbols-outlined text-[20px] flex items-center justify-center">
            {theme === 'light' ? 'light_mode' : 'dark_mode'}
          </span>
        </button>
        
        <div className="relative" ref={dropdownRef}>
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className={`relative p-2.5 rounded-xl transition-all border shadow-sm ${
              pendingPatients.length > 0 
                ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800 animate-pulse' 
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 hover:scale-110 active:scale-90'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">{pendingPatients.length > 0 ? 'notifications_active' : 'notifications'}</span>
            {pendingPatients.length > 0 && (
              <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-slate-100 dark:border-slate-800 animate-pulse"></span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-surface-dark rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden z-50 animate-fade-in">
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">Notificações</h3>
                <span className="text-[10px] font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full">{pendingPatients.length} Pendentes</span>
              </div>
              
              <div className="max-h-80 overflow-y-auto">
                {pendingPatients.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-sm">
                    <span className="material-symbols-outlined text-3xl mb-2 block text-slate-300">notifications_off</span>
                    Nenhuma notificação nova
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {pendingPatients.map(patient => (
                      <button
                        key={patient.id}
                        onClick={() => {
                          if (onFixPatient) onFixPatient(patient);
                          setShowNotifications(false);
                        }}
                        className="w-full text-left p-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex gap-3 items-start"
                      >
                        <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0 mt-1">
                          <span className="material-symbols-outlined text-sm">warning</span>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800 dark:text-white leading-tight mb-1">Cadastro Incompleto</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">O paciente <span className="font-bold">{patient.name}</span> precisa completar o cadastro.</p>
                          <span className="text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">{patient.cns}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="ml-2 w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden border-2 border-primary cursor-pointer hover:opacity-80 transition-opacity shadow-sm">
          <img 
            alt="User Profile" 
            className="w-full h-full object-cover" 
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuDtLEGRidLczs61iPgPXW1jqbrSyk7UvOLXfx9VQOgStCcgK1vOffX9cb1zihV-c_d3URv1g8dTaqzXMRdD9rZ1ITrNpSh4WDESe1a_wwNEfth4RtPW_0AnwsHLSFWWBeCL_it3gjR7uGEbDolzbSkz3IRSgB5RMaePCiuJ05VFBIhx9vUG4hPa497THuFBzllPITRCBT52nlNo1iyJsHpi1LQDbAk03xlfjDi6liCemeFUwfhg8tV3HtCHqOuX4QMDWpTT87B0Un4"
          />
        </div>
      </div>
    </header>
  );
};

export default Header;
