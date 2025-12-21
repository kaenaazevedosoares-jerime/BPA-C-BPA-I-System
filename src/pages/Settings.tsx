import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { UserProfile } from '../types';
import { ALL_PERMISSIONS, PermissionKey, UserPermissions } from '../types/permissions';

interface SettingsProps {
  currentUser: UserProfile | null;
}

const Settings: React.FC<SettingsProps> = ({ currentUser }) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name');

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePermission = async (permissionKey: PermissionKey) => {
    if (!selectedUser) return;

    const currentPermissions = selectedUser.permissions || {};
    const newPermissions: UserPermissions = {
      ...currentPermissions,
      [permissionKey]: !currentPermissions[permissionKey]
    };

    // Optimistic update
    setSelectedUser({
      ...selectedUser,
      permissions: newPermissions
    });

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ permissions: newPermissions })
        .eq('id', selectedUser.id);

      if (error) throw error;

      // Update in list as well
      setUsers(users.map(u => u.id === selectedUser.id ? { ...u, permissions: newPermissions } : u));
    } catch (error) {
      console.error('Error updating permissions:', error);
      // Revert on error
      setSelectedUser(selectedUser);
    } finally {
      setSaving(false);
    }
  };

  const groupedPermissions = ALL_PERMISSIONS.reduce((acc, curr) => {
    if (!acc[curr.group]) acc[curr.group] = [];
    acc[curr.group].push(curr);
    return acc;
  }, {} as Record<string, typeof ALL_PERMISSIONS>);

  if (currentUser?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-full text-slate-500">
        <div className="text-center">
          <span className="material-symbols-outlined text-4xl mb-2">lock</span>
          <p>Acesso restrito a administradores.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 pb-24 space-y-8 animate-fade-in">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
            <span className="material-symbols-outlined">settings_accessibility</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Gerenciamento de Acessos</h1>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-0.5">Configuração de Permissões de Usuários</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* User List */}
        <div className="lg:col-span-1 bg-white dark:bg-surface-dark rounded-3xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 h-[calc(100vh-200px)] overflow-y-auto">
          <h3 className="text-sm font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">Usuários</h3>
          
          {loading ? (
             <div className="flex justify-center p-4">
               <span className="material-symbols-outlined animate-spin text-primary">progress_activity</span>
             </div>
          ) : (
            <div className="space-y-2">
              {users.map(user => (
                <button
                  key={user.id}
                  onClick={() => setSelectedUser(user)}
                  className={`w-full text-left p-3 rounded-xl transition-all flex items-center gap-3
                    ${selectedUser?.id === user.id 
                      ? 'bg-primary text-white shadow-md' 
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'}
                  `}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs
                    ${selectedUser?.id === user.id ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}
                  `}>
                    {user.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold truncate text-sm">{user.full_name || 'Sem nome'}</p>
                    {user.email && (
                      <p className="text-[10px] text-slate-500 truncate">{user.email}</p>
                    )}
                    <p className={`text-[10px] uppercase font-black tracking-wider ${selectedUser?.id === user.id ? 'text-white/70' : 'text-slate-400'}`}>
                      {user.role === 'admin' ? 'Administrador' : 'Operador'}
                    </p>
                  </div>
                  <span className="material-symbols-outlined text-sm">chevron_right</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Permissions Editor */}
        <div className="lg:col-span-2 bg-white dark:bg-surface-dark rounded-3xl p-8 shadow-sm border border-slate-200 dark:border-slate-800">
          {!selectedUser ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <span className="material-symbols-outlined text-5xl mb-4 text-slate-200 dark:text-slate-700">touch_app</span>
              <p>Selecione um usuário para editar as permissões</p>
            </div>
          ) : selectedUser.role === 'admin' ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <span className="material-symbols-outlined text-5xl mb-4 text-primary/50">verified_user</span>
              <p className="text-lg font-bold text-slate-700 dark:text-slate-200">Acesso Irrestrito</p>
              <p className="max-w-xs text-center mt-2 text-sm">Administradores possuem acesso total ao sistema por padrão.</p>
            </div>
          ) : (
            <div className="space-y-8 animate-fade-in">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Permissões de Acesso</h2>
                  <p className="text-sm text-slate-500">Editando: <span className="font-bold text-primary">{selectedUser.full_name}</span></p>
                </div>
                {saving && (
                  <span className="text-xs font-bold text-primary animate-pulse flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">sync</span>
                    Salvando...
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {Object.entries(groupedPermissions).map(([group, permissions]) => (
                  <div key={group} className="space-y-4">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      {group === 'Menu Lateral' ? <span className="material-symbols-outlined text-sm">menu</span> : <span className="material-symbols-outlined text-sm">ads_click</span>}
                      {group}
                    </h4>
                    <div className="space-y-3">
                      {permissions.map(perm => (
                        <label key={perm.key} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer border border-transparent hover:border-slate-100 dark:hover:border-slate-700 transition-all group">
                          <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors
                            ${selectedUser.permissions?.[perm.key] 
                              ? 'bg-primary border-primary text-white' 
                              : 'border-slate-300 dark:border-slate-600 group-hover:border-primary'}
                          `}>
                            {selectedUser.permissions?.[perm.key] && (
                              <span className="material-symbols-outlined text-sm font-bold">check</span>
                            )}
                          </div>
                          <input 
                            type="checkbox" 
                            className="hidden"
                            checked={selectedUser.permissions?.[perm.key] || false}
                            onChange={() => handleTogglePermission(perm.key)}
                          />
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{perm.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
