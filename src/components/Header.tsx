
import React from 'react';
import { Theme } from '../types';

interface HeaderProps {
  theme: Theme;
  onToggleTheme: () => void;
  onOpenSidebar: () => void;
  currentViewTitle: string;
}

const Header: React.FC<HeaderProps> = ({ theme, onToggleTheme, onOpenSidebar, currentViewTitle }) => {
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
          <h1 className="text-lg font-bold leading-tight tracking-tight text-slate-900 dark:text-white">Dashboard LRPD</h1>
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
            {theme === 'light' ? 'dark_mode' : 'light_mode'}
          </span>
        </button>
        
        <button className="relative p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-200 transition-all border border-slate-200 dark:border-slate-700">
          <span className="material-symbols-outlined text-[20px]">notifications</span>
          <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-slate-100 dark:border-slate-800"></span>
        </button>

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
