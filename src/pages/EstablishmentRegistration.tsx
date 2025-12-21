import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import EstablishmentCard from '../components/EstablishmentCard';

interface EstablishmentRegistrationProps {
  onCancel: () => void;
  onSave: () => void;
}

type Establishment = {
  id: string;
  cnes: string;
  name: string;
  social_reason?: string;
  responsible_tech?: string;
  zip_code?: string;
  phone?: string;
  email?: string;
  street?: string;
  neighborhood?: string;
  state?: string;
  created_at: string;
};

const EstablishmentRegistration: React.FC<EstablishmentRegistrationProps> = ({ onCancel, onSave }) => {
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [establishments, setEstablishments] = useState<Establishment[]>([]);
  const [formData, setFormData] = useState({
    cnes: '',
    name: '',
    social_reason: '',
    responsible_tech: '',
    zip_code: '',
    phone: '',
    email: '',
    street: '',
    neighborhood: '',
    state: ''
  });

  const fetchEstablishments = async () => {
    try {
      setListLoading(true);
      const { data, error } = await supabase
        .from('establishments')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw error;
      setEstablishments(data || []);
    } catch (err) {
      console.error('Erro ao carregar estabelecimentos:', err);
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    fetchEstablishments();
  }, []);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!formData.cnes || !formData.name) return alert('CNES e Nome Fantasia são obrigatórios');
    setLoading(true);

    if (editingId) {
      const { error } = await supabase
        .from('establishments')
        .update(formData)
        .eq('id', editingId);
      setLoading(false);
      if (error) {
        alert('Erro ao atualizar estabelecimento: ' + error.message);
      } else {
        setShowForm(false);
        setEditingId(null);
        setFormData({ cnes: '', name: '', social_reason: '', responsible_tech: '', zip_code: '', phone: '', email: '', street: '', neighborhood: '', state: '' });
        await fetchEstablishments();
        onSave();
      }
      return;
    }

    const { error } = await supabase
      .from('establishments')
      .insert([formData]);

    setLoading(false);
    if (error) {
      alert('Erro ao salvar estabelecimento: ' + error.message);
    } else {
      setShowForm(false);
      setEditingId(null);
      setFormData({ cnes: '', name: '', social_reason: '', responsible_tech: '', zip_code: '', phone: '', email: '', street: '', neighborhood: '', state: '' });
      await fetchEstablishments();
      onSave();
    }
  };

  const handleNew = () => {
    setEditingId(null);
    setFormData({ cnes: '', name: '', social_reason: '', responsible_tech: '', zip_code: '', phone: '', email: '', street: '', neighborhood: '', state: '' });
    setShowForm(true);
  };

  const handleEdit = (id: string) => {
    const found = establishments.find(e => e.id === id);
    if (found) {
      setEditingId(id);
      setFormData({
        cnes: found.cnes || '',
        name: found.name || '',
        social_reason: found.social_reason || '',
        responsible_tech: found.responsible_tech || '',
        zip_code: found.zip_code || '',
        phone: found.phone || '',
        email: found.email || '',
        street: found.street || '',
        neighborhood: found.neighborhood || '',
        state: found.state || ''
      });
      setShowForm(true);
    }
  };

  const handleDelete = async (id: string | null) => {
    if (!id) return;
    try {
      const { error } = await supabase
        .from('establishments')
        .delete()
        .eq('id', id);
      if (error) throw error;
      await fetchEstablishments();
      setDeleteConfirm(null);
    } catch (err: any) {
      alert('Erro ao excluir estabelecimento: ' + err.message);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-4 pb-24 space-y-8 animate-fade-in">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
            <span className="material-symbols-outlined">account_balance</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Registro de Estabelecimento</h1>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-0.5">Configuração do LRPD</p>
          </div>
        </div>
        <p className="text-slate-500 dark:text-slate-400 text-sm">Cadastre os dados da unidade de saúde ou laboratório regional.</p>
        <div className="flex gap-3 mt-4">
          <button
            onClick={handleNew}
            className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg shadow-md hover:shadow-lg transition-all flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-sm">add_business</span>
            Cadastrar Novo
          </button>
          {showForm && (
            <button
              onClick={() => setShowForm(false)}
              className="bg-slate-600 hover:bg-slate-700 text-white px-4 py-2 rounded-lg shadow-md hover:shadow-lg transition-all"
            >
              Fechar Formulário
            </button>
          )}
        </div>
      </div>

      {showForm && (
      <div className="bg-white dark:bg-surface-dark rounded-3xl p-8 shadow-sm border border-slate-200 dark:border-slate-800 space-y-8">
        <section className="space-y-6">
          <h3 className="text-sm font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-2">Identificação do Serviço</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InputGroup label="CNES" placeholder="Ex: 1234567" icon="fingerprint" value={formData.cnes} onChange={(v: string) => handleChange('cnes', v)} />
            <InputGroup label="Nome do Estabelecimento (Fantasia)" placeholder="Ex: LRPD Sede Regional" value={formData.name} onChange={(v: string) => handleChange('name', v)} />
            <InputGroup label="Razão Social" placeholder="Ex: Secretaria Municipal de Saúde" value={formData.social_reason} onChange={(v: string) => handleChange('social_reason', v)} />
            <InputGroup label="Responsável Técnico" placeholder="Nome do profissional" icon="badge" value={formData.responsible_tech} onChange={(v: string) => handleChange('responsible_tech', v)} />
          </div>
        </section>

        <section className="space-y-6 pt-4">
          <h3 className="text-sm font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-2">Localização e Contato</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <InputGroup label="CEP" placeholder="00000-000" icon="map" value={formData.zip_code} onChange={(v: string) => handleChange('zip_code', v)} />
            <InputGroup label="Telefone de Contato" placeholder="(00) 0000-0000" icon="call" value={formData.phone} onChange={(v: string) => handleChange('phone', v)} />
            <InputGroup label="E-mail Administrativo" placeholder="contato@exemplo.com" icon="mail" value={formData.email} onChange={(v: string) => handleChange('email', v)} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <InputGroup label="Logradouro" placeholder="Rua, Avenida, Praça..." value={formData.street} onChange={(v: string) => handleChange('street', v)} />
             <div className="grid grid-cols-2 gap-4">
               <InputGroup label="Bairro" placeholder="Nome do bairro" value={formData.neighborhood} onChange={(v: string) => handleChange('neighborhood', v)} />
               <InputGroup label="UF" placeholder="Sigla do Estado" value={formData.state} onChange={(v: string) => handleChange('state', v)} />
             </div>
          </div>
        </section>
      </div>
      )}

      <div className="space-y-3">
        <h3 className="text-sm font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Estabelecimentos Cadastrados</h3>
        {listLoading ? (
          <div className="grid grid-cols-1 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-28 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : establishments.length === 0 ? (
          <div className="text-slate-500 dark:text-slate-400 text-sm">Nenhum estabelecimento cadastrado.</div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {establishments.map((e) => (
              <EstablishmentCard
                key={e.id}
                establishment={e}
                onEdit={handleEdit}
                onDelete={(id) => setDeleteConfirm(id)}
              />
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 z-40">
          <div className="max-w-5xl mx-auto flex gap-4">
            <button onClick={() => setShowForm(false)} disabled={loading} className="flex-1 h-14 rounded-xl border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold bg-white dark:bg-surface-dark disabled:opacity-50">Cancelar</button>
            <button onClick={handleSave} disabled={loading} className="flex-[2] h-14 rounded-xl bg-primary text-white font-bold shadow-lg shadow-primary/30 hover:bg-primary-dark transition-all flex items-center justify-center gap-2 disabled:opacity-70">
              {loading ? <span className="material-symbols-outlined animate-spin">progress_activity</span> : <><span className="material-symbols-outlined">save</span>{editingId ? 'Atualizar Estabelecimento' : 'Salvar Estabelecimento'}</>}
            </button>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-surface-dark rounded-xl shadow-2xl p-6 max-w-md w-full">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Confirmar Exclusão</h3>
            <p className="text-slate-600 dark:text-slate-400 mb-6">Tem certeza que deseja excluir este estabelecimento? Esta ação não pode ser desfeita.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">Cancelar</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg shadow-md hover:shadow-lg transition-all">Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const InputGroup = ({ label, placeholder, icon, type = "text", value, onChange }: any) => (
  <div className="flex flex-col gap-2 group">
    <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{label}</label>
    <div className="relative">
      <input 
        type={type} 
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-12 bg-slate-50 dark:bg-background-dark/30 border-0 border-b-2 border-slate-200 dark:border-slate-700 focus:border-primary focus:ring-0 rounded-t-lg px-4 pr-12 text-slate-900 dark:text-white transition-all text-sm font-medium"
      />
      {icon && <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-primary/70 text-[20px]">{icon}</span>}
    </div>
  </div>
);

export default EstablishmentRegistration;

