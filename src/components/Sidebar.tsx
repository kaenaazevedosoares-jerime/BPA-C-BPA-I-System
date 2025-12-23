
import React from 'react';
import { View, UserProfile } from '../types';
import { supabase } from '../lib/supabase';
import { PermissionKey } from '../types/permissions';
import { usePermissions } from '../hooks/usePermissions';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  currentView: View;
  onNavigate: (view: View) => void;
  userProfile: UserProfile | null;
}

interface MenuItem {
  id: View;
  label: string;
  icon: string;
  adminOnly?: boolean;
  permission?: PermissionKey;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, currentView, onNavigate, userProfile }) => {
  const { hasPermission } = usePermissions(userProfile);

  const menuItems: MenuItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    { id: 'procedure-list', label: 'BPA-I Digital', icon: 'assignment_ind', permission: 'view_bpai' },
    { id: 'bpa-c-form', label: 'BPA-C Consolidado', icon: 'assignment', permission: 'view_bpac' },
    { id: 'patient-reg', label: 'Pacientes', icon: 'person_add', permission: 'view_patients' },
    { id: 'profissionais', label: 'Profissional', icon: 'stethoscope', permission: 'view_profissionais' },
    { id: 'procedure-catalog', label: 'Catálogo Proced.', icon: 'list_alt', permission: 'view_procedure_catalog' },
    { id: 'cbo-reg', label: 'Catálogo CBO', icon: 'clinical_notes', permission: 'view_cbo_catalog' },
    { id: 'street-type-catalog', label: 'Tipos de Lograd.', icon: 'signpost', permission: 'view_street_types' },
    { id: 'establishment-reg', label: 'Estabelecimento', icon: 'account_balance', permission: 'view_establishment' },
    // { id: 'stock', label: 'Estoque', icon: 'inventory_2', permission: 'view_stock' }, // Placeholder for future
    { id: 'settings', label: 'Configurações', icon: 'settings', adminOnly: true },
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const filteredItems = menuItems.filter(item => {
    if (item.adminOnly) return userProfile?.role === 'admin';
    if (item.permission) return hasPermission(item.permission);
    return true; // Default accessible (e.g., Dashboard)
  });

  const userName = userProfile?.full_name || 'Usuário';
  const userRole = userProfile?.role || 'operator';

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden" 
          onClick={onClose}
        />
      )}
      
      <div className={`
        fixed inset-y-0 left-0 w-64 bg-surface-light dark:bg-surface-dark shadow-2xl z-50 
        transform transition-transform duration-300 flex flex-col border-r border-slate-200 dark:border-slate-800
        lg:static lg:translate-x-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent-teal">BPA-C & BPA-I System</h1>
          <button className="lg:hidden text-slate-500 hover:text-primary" onClick={onClose}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {filteredItems.map((item) => (
            <button
              key={item.label}
              onClick={() => onNavigate(item.id)}
              className={`
                w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all
                ${currentView === item.id 
                  ? 'bg-primary text-white shadow-glow' 
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}
              `}
            >
              <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
              <span className="text-sm">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3 px-4 py-2">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-primary to-accent-purple flex items-center justify-center text-white font-bold text-xs shadow-md">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{userName}</p>
              <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">{userRole === 'admin' ? 'Administrador' : 'Operador'}</p>
            </div>
            <button 
              onClick={handleLogout}
              className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
              title="Sair"
            >
              <span className="material-symbols-outlined text-lg">logout</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
