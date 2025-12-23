import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { UserProfile, WhatsAppTemplate } from '../types';
import { ALL_PERMISSIONS, PermissionKey, UserPermissions } from '../types/permissions';

interface SettingsProps {
  currentUser: UserProfile | null;
}

type Tab = 'permissions' | 'templates';

const Settings: React.FC<SettingsProps> = ({ currentUser }) => {
  const [activeTab, setActiveTab] = useState<Tab>('permissions');
  
  // Users / Permissions State
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [savingPermissions, setSavingPermissions] = useState(false);

  // Templates State
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<WhatsAppTemplate | null>(null);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [templateForm, setTemplateForm] = useState({ title: '', message: '' });

  useEffect(() => {
    if (activeTab === 'permissions') fetchUsers();
    if (activeTab === 'templates') fetchTemplates();
  }, [activeTab]);

  // --- Users Logic ---
  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const { data, error } = await supabase.from('profiles').select('*').order('full_name');
      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleTogglePermission = async (permissionKey: PermissionKey) => {
    if (!selectedUser) return;
    const currentPermissions = selectedUser.permissions || {};
    const newPermissions: UserPermissions = {
      ...currentPermissions,
      [permissionKey]: !currentPermissions[permissionKey]
    };

    setSelectedUser({ ...selectedUser, permissions: newPermissions });
    setSavingPermissions(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ permissions: newPermissions })
        .eq('id', selectedUser.id);
      if (error) throw error;
      setUsers(users.map(u => u.id === selectedUser.id ? { ...u, permissions: newPermissions } : u));
    } catch (error) {
      console.error('Error updating permissions:', error);
      // Revert would go here
    } finally {
      setSavingPermissions(false);
    }
  };

  const groupedPermissions = ALL_PERMISSIONS.reduce((acc, curr) => {
    if (!acc[curr.group]) acc[curr.group] = [];
    acc[curr.group].push(curr);
    return acc;
  }, {} as Record<string, typeof ALL_PERMISSIONS>);

  // --- Templates Logic ---
  const fetchTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const { data, error } = await supabase.from('whatsapp_templates').select('*').order('title');
      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const handleNewTemplate = () => {
    setSelectedTemplate(null);
    setTemplateForm({ title: '', message: '' });
  };

  const handleSelectTemplate = (t: WhatsAppTemplate) => {
    setSelectedTemplate(t);
    setTemplateForm({ title: t.title, message: t.message });
  };

  const handleSaveTemplate = async () => {
    if (!templateForm.title || !templateForm.message) return;
    setSavingTemplate(true);
    try {
      if (selectedTemplate) {
        // Update
        const { error } = await supabase
          .from('whatsapp_templates')
          .update({ title: templateForm.title, message: templateForm.message })
          .eq('id', selectedTemplate.id);
        if (error) throw error;
      } else {
        // Create
        const { error } = await supabase
          .from('whatsapp_templates')
          .insert([{ title: templateForm.title, message: templateForm.message }]);
        if (error) throw error;
      }
      await fetchTemplates();
      if (!selectedTemplate) handleNewTemplate(); // Reset if was new
    } catch (error) {
      alert('Erro ao salvar template');
      console.error(error);
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!window.confirm('Excluir este modelo?')) return;
    try {
      const { error } = await supabase.from('whatsapp_templates').delete().eq('id', id);
      if (error) throw error;
      fetchTemplates();
      if (selectedTemplate?.id === id) handleNewTemplate();
    } catch (error) {
      console.error(error);
    }
  };

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
    <div className="max-w-6xl mx-auto p-4 pb-24 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
          <span className="material-symbols-outlined">settings</span>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Configurações</h1>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-0.5">Gerencie o sistema</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800 pb-1">
        <button
          onClick={() => setActiveTab('permissions')}
          className={`px-4 py-2 text-sm font-bold rounded-t-lg transition-colors flex items-center gap-2 ${activeTab === 'permissions' ? 'bg-white dark:bg-surface-dark text-primary border-b-2 border-primary' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
        >
          <span className="material-symbols-outlined text-lg">manage_accounts</span>
          Permissões
        </button>
        <button
          onClick={() => setActiveTab('templates')}
          className={`px-4 py-2 text-sm font-bold rounded-t-lg transition-colors flex items-center gap-2 ${activeTab === 'templates' ? 'bg-white dark:bg-surface-dark text-primary border-b-2 border-primary' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
        >
          <span className="material-symbols-outlined text-lg">chat</span>
          Modelos de Mensagem
        </button>
      </div>

      {/* Content */}
      <div className="bg-white dark:bg-surface-dark rounded-b-3xl rounded-tr-3xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 min-h-[500px]">
        
        {/* TAB: PERMISSIONS */}
        {activeTab === 'permissions' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* User List */}
            <div className="lg:col-span-1 border-r border-slate-100 dark:border-slate-800 pr-6 h-[calc(100vh-300px)] overflow-y-auto">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Usuários</h3>
              {loadingUsers ? (
                <div className="flex justify-center p-4"><span className="material-symbols-outlined animate-spin text-primary">progress_activity</span></div>
              ) : (
                <div className="space-y-2">
                  {users.map(user => (
                    <button
                      key={user.id}
                      onClick={() => setSelectedUser(user)}
                      className={`w-full text-left p-3 rounded-xl transition-all flex items-center gap-3 ${selectedUser?.id === user.id ? 'bg-primary text-white shadow-md' : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'}`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${selectedUser?.id === user.id ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                        {user.full_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold truncate text-sm">{user.full_name || 'Sem nome'}</p>
                        <p className={`text-[10px] uppercase font-black tracking-wider ${selectedUser?.id === user.id ? 'text-white/70' : 'text-slate-400'}`}>{user.role}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Permissions Editor */}
            <div className="lg:col-span-2">
              {!selectedUser ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                  <span className="material-symbols-outlined text-5xl mb-4 text-slate-200 dark:text-slate-700">touch_app</span>
                  <p>Selecione um usuário para editar</p>
                </div>
              ) : (
                <div className="space-y-6 animate-fade-in">
                  <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold">Permissões de {selectedUser.full_name}</h2>
                    {savingPermissions && <span className="text-xs font-bold text-primary animate-pulse">Salvando...</span>}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {Object.entries(groupedPermissions).map(([group, permissions]) => (
                      <div key={group} className="space-y-3">
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">{group}</h4>
                        <div className="space-y-2">
                          {permissions.map(perm => (
                            <label key={perm.key} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer border border-transparent hover:border-slate-100 dark:hover:border-slate-700 transition-all group">
                              <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${selectedUser.permissions?.[perm.key] ? 'bg-primary border-primary text-white' : 'border-slate-300 dark:border-slate-600'}`}>
                                {selectedUser.permissions?.[perm.key] && <span className="material-symbols-outlined text-sm font-bold">check</span>}
                              </div>
                              <input type="checkbox" className="hidden" checked={selectedUser.permissions?.[perm.key] || false} onChange={() => handleTogglePermission(perm.key)} />
                              <span className="text-sm font-medium">{perm.label}</span>
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
        )}

        {/* TAB: TEMPLATES */}
        {activeTab === 'templates' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Template List */}
            <div className="lg:col-span-1 border-r border-slate-100 dark:border-slate-800 pr-6 h-[calc(100vh-300px)] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Seus Modelos</h3>
                <button onClick={handleNewTemplate} className="text-xs font-bold text-primary hover:text-primary-dark flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">add_circle</span> Novo
                </button>
              </div>
              
              {loadingTemplates ? (
                <div className="flex justify-center p-4"><span className="material-symbols-outlined animate-spin text-primary">progress_activity</span></div>
              ) : (
                <div className="space-y-2">
                  {templates.map(t => (
                    <div key={t.id} className="group relative">
                      <button
                        onClick={() => handleSelectTemplate(t)}
                        className={`w-full text-left p-3 rounded-xl transition-all ${selectedTemplate?.id === t.id ? 'bg-primary text-white shadow-md' : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-transparent hover:border-slate-200 dark:hover:border-slate-700'}`}
                      >
                        <p className="font-bold text-sm truncate">{t.title}</p>
                        <p className={`text-xs truncate ${selectedTemplate?.id === t.id ? 'text-white/70' : 'text-slate-500'}`}>{t.message}</p>
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDeleteTemplate(t.id); }}
                        className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-red-100 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity ${selectedTemplate?.id === t.id ? 'text-white hover:bg-white/20' : ''}`}
                      >
                        <span className="material-symbols-outlined text-sm">delete</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Template Editor */}
            <div className="lg:col-span-2">
              <div className="space-y-6 animate-fade-in">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold">{selectedTemplate ? 'Editar Modelo' : 'Novo Modelo'}</h2>
                  {savingTemplate && <span className="text-xs font-bold text-primary animate-pulse">Salvando...</span>}
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Título do Modelo</label>
                    <input 
                      type="text"
                      value={templateForm.title}
                      onChange={e => setTemplateForm({...templateForm, title: e.target.value})}
                      placeholder="Ex: Confirmação de Agendamento"
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mensagem</label>
                    <div className="relative">
                      <textarea 
                        value={templateForm.message}
                        onChange={e => setTemplateForm({...templateForm, message: e.target.value})}
                        placeholder="Olá {paciente}, ..."
                        rows={8}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                      />
                      <div className="absolute top-2 right-2">
                         <div className="group relative inline-block">
                           <span className="material-symbols-outlined text-slate-400 cursor-help text-sm">info</span>
                           <div className="absolute right-0 w-64 p-3 bg-slate-800 text-white text-xs rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                             <p className="font-bold mb-1">Variáveis disponíveis:</p>
                             <ul className="space-y-1 text-slate-300">
                               <li><code>{'{paciente}'}</code> - Nome do Paciente</li>
                               <li><code>{'{procedimento}'}</code> - Nome do Procedimento</li>
                               <li><code>{'{data_atendimento}'}</code> - Data Atend.</li>
                               <li><code>{'{data_agendamento}'}</code> - Data Agend.</li>
                               <li><code>{'{status}'}</code> - Status atual</li>
                             </ul>
                           </div>
                         </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button 
                      onClick={handleSaveTemplate}
                      disabled={savingTemplate || !templateForm.title || !templateForm.message}
                      className="bg-primary hover:bg-primary-dark text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg shadow-primary/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined">save</span>
                      Salvar Modelo
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default Settings;