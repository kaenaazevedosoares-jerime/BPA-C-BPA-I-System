import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { WhatsAppTemplate } from '../types';

interface ProcedureListProps {
  onAddNew: () => void;
  onEdit: (id: string) => void;
}

interface ProcedureItem {
  id: string;
  name: string;
  status: string;
  statusColor: string;
  proc: string;
  procCode: string;
  date: string;
  dateScheduling: string;
  avatar: string;
  // Patient Details
  cns: string;
  birthDate: string;
  gender: string;
  nationality: string;
  race: string;
  ethnicity: string;
  zipCode: string;
  city: string;
  street: string;
  number: string;
  neighborhood: string;
  phone: string;
  street_code: string;
  street_type: string;
}

const ProcedureList: React.FC<ProcedureListProps> = ({ onAddNew, onEdit }) => {
  const [items, setItems] = useState<ProcedureItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('Todos');
  const [searchTerm, setSearchTerm] = useState('');

  // WhatsApp Modal State
  const [showWhatsApp, setShowWhatsApp] = useState(false);
  const [whatsAppItem, setWhatsAppItem] = useState<ProcedureItem | null>(null);

  const fetchProcedures = async () => {
    try {
      setLoading(true);
      const { data: productionData, error: productionError } = await supabase
        .from('procedure_production')
        .select(`
          id, status, date_service, date_scheduling, procedure_code,
          patients (
            name, cns, birth_date, gender, nationality, race, ethnicity,
            zip_code, city, neighborhood, street, number, phone,
            street_code, street_type
          )
        `)
        .order('date_service', { ascending: false });

      if (productionError) throw productionError;
      if (!productionData || productionData.length === 0) {
        setItems([]);
        return;
      }

      const procedureCodes = [...new Set(productionData.map(item => item.procedure_code))];
      const { data: procedureCatalog, error: catalogError } = await supabase
        .from('procedures_catalog')
        .select('code, name')
        .in('code', procedureCodes);

      if (catalogError) throw catalogError;
      const procedureMap = new Map(procedureCatalog?.map(p => [p.code, p.name]));

      const formattedItems: ProcedureItem[] = productionData.map((item: any) => {
        const p = item.patients || {};
        const patientName = p.name || 'Desconhecido';
        const procName = procedureMap.get(item.procedure_code) || item.procedure_code;
        const status = item.status || 'Agendado';
        
        let statusColor = 'text-slate-500';
        if (status === 'Em Produção') statusColor = 'text-primary';
        else if (status === 'Concluído') statusColor = 'text-emerald-500';
        else if (status === 'Agendado') statusColor = 'text-yellow-500';
        
        const dateObj = new Date(item.date_service || item.created_at);
        const dateStr = dateObj.toLocaleDateString('pt-BR');
        const dateSchedulingStr = item.date_scheduling ? new Date(item.date_scheduling).toLocaleDateString('pt-BR') : 'N/A';
        const birthDateStr = p.birth_date ? new Date(p.birth_date).toLocaleDateString('pt-BR') : 'N/A';

        return {
          id: item.id,
          name: patientName,
          status: status,
          statusColor: statusColor,
          proc: procName,
          procCode: item.procedure_code,
          date: dateStr,
          dateScheduling: dateSchedulingStr,
          avatar: '',
          cns: p.cns || 'N/A',
          birthDate: birthDateStr,
          gender: p.gender || 'N/A',
          nationality: p.nationality || 'N/A',
          race: p.race || 'N/A',
          ethnicity: p.ethnicity || 'N/A',
          zipCode: p.zip_code || 'N/A',
          city: p.city || 'N/A',
          street_code: p.street_code || 'N/A',
          street_type: p.street_type || 'N/A',
          street: p.street || 'N/A',
          number: p.number || 'S/N',
          neighborhood: p.neighborhood || 'N/A',
          phone: p.phone || ''
        };
      });

      setItems(formattedItems);
    } catch (error) {
      console.error('Erro ao buscar procedimentos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase.from('procedure_production').update({ status: newStatus }).eq('id', id);
      if (error) throw error;
      setItems(prev => prev.map(item => {
        if (item.id === id) {
          let statusColor = 'text-slate-500';
          if (newStatus === 'Em Produção') statusColor = 'text-primary';
          else if (newStatus === 'Concluído') statusColor = 'text-emerald-500';
          else if (newStatus === 'Agendado') statusColor = 'text-yellow-500';
          return { ...item, status: newStatus, statusColor };
        }
        return item;
      }));
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      alert('Erro ao atualizar status.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este procedimento? Esta ação não pode ser desfeita.')) return;
    try {
      const { error } = await supabase.from('procedure_production').delete().eq('id', id);
      if (error) throw error;
      setItems(prev => prev.filter(item => item.id !== id));
    } catch (error) {
      console.error('Erro ao excluir:', error);
      alert('Erro ao excluir procedimento.');
    }
  };

  useEffect(() => { fetchProcedures(); }, []);

  const filteredItems = items.filter(item => {
    const matchesFilter = filter === 'Todos' || item.status === filter;
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.cns.includes(searchTerm) || 
                          item.proc.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getCount = (status: string) => items.filter(i => i.status === status).length;

  return (
    <div className="p-4 space-y-6 animate-fade-in max-w-4xl mx-auto w-full">
      {/* WhatsApp Modal */}
      {showWhatsApp && whatsAppItem && (
        <WhatsAppModal 
          item={whatsAppItem} 
          onClose={() => { setShowWhatsApp(false); setWhatsAppItem(null); }} 
        />
      )}

      <div className="flex flex-col gap-4">
        {/* Search & Filter */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-slate-400">
            <span className="material-symbols-outlined">search</span>
          </div>
          <input 
            className="block w-full rounded-2xl border-0 bg-white dark:bg-surface-dark py-4 pl-12 pr-4 text-slate-900 dark:text-white placeholder:text-slate-500 shadow-sm ring-1 ring-inset ring-slate-200 dark:ring-slate-800 focus:ring-2 focus:ring-primary transition-all" 
            placeholder="Buscar por paciente, CNS ou procedimento..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <FilterButton label="Todos" active={filter === 'Todos'} onClick={() => setFilter('Todos')} />
          <FilterButton label="Agendados" count={getCount('Agendado')} active={filter === 'Agendado'} onClick={() => setFilter('Agendado')} />
          <FilterButton label="Em Produção" count={getCount('Em Produção')} active={filter === 'Em Produção'} onClick={() => setFilter('Em Produção')} />
          <FilterButton label="Concluídos" count={getCount('Concluído')} active={filter === 'Concluído'} onClick={() => setFilter('Concluído')} />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-8"><span className="material-symbols-outlined animate-spin text-primary text-4xl">progress_activity</span></div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-10 text-slate-500">
          <span className="material-symbols-outlined text-4xl mb-2">inbox</span>
          <p>Nenhum registro encontrado.</p>
        </div>
      ) : (
        <div className="space-y-4 pb-20">
          {filteredItems.map((item) => (
            <details 
              key={item.id} 
              className="group overflow-hidden rounded-2xl bg-surface-light dark:bg-surface-dark border border-slate-200 dark:border-slate-800 shadow-sm transition-all open:ring-2 open:ring-primary/20"
            >
              <summary className="flex cursor-pointer items-center p-4 list-none relative">
                <div className="flex items-center gap-4 flex-1 min-w-0 mr-10">
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    <div className="size-10 overflow-hidden rounded-full border border-slate-100 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                      <span className="font-bold text-slate-400">{item.name.charAt(0)}</span>
                    </div>
                    <div className="absolute -bottom-1 -right-1 flex size-4 items-center justify-center rounded-full bg-surface-light dark:bg-surface-dark border-2 border-surface-light dark:border-surface-dark">
                      <div className={`size-2 rounded-full ${item.status === 'Em Produção' ? 'bg-primary animate-pulse' : item.status === 'Concluído' ? 'bg-emerald-500' : 'bg-yellow-500'}`}></div>
                    </div>
                  </div>

                  {/* Info Column: Name & SUS */}
                  <div className="flex flex-col">
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-tight">{item.name}</h3>
                    <div className="flex items-center gap-1 mt-0.5 text-slate-500 dark:text-slate-400">
                      <span className="material-symbols-outlined text-[14px]">id_card</span>
                      <span className="text-[11px] font-mono font-medium">{item.cns}</span>
                    </div>
                  </div>

                  {/* Spacer */}
                  <div className="flex-1"></div>

                  {/* Right Actions: WhatsApp (W) & Status (A) */}
                  <div className="flex items-center gap-2 sm:gap-4" onClick={(e) => e.preventDefault()}>
                     {/* W: WhatsApp Button */}
                     <button 
                       onClick={(e) => {
                         e.stopPropagation();
                         setWhatsAppItem(item);
                         setShowWhatsApp(true);
                       }}
                       className="group flex items-center justify-center w-9 h-9 rounded-full bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 hover:bg-green-500 hover:text-white transition-all border border-green-200 dark:border-green-800/50 shadow-sm"
                       title="Enviar WhatsApp"
                     >
                       <span className="material-symbols-outlined text-[18px]">chat</span>
                     </button>

                     {/* A: Status Dropdown */}
                     <StatusDropdown 
                       currentStatus={item.status} 
                       statusColor={item.statusColor} 
                       onChange={(newStatus) => handleStatusChange(item.id, newStatus)} 
                     />
                  </div>
                </div>
                <span className="absolute right-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 group-open:rotate-180 transition-transform">expand_more</span>
              </summary>
              
              <div className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-background-dark/30 p-4 space-y-4">
                 <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    <DetailField label="Sus" value={item.cns} />
                    <DetailField label="Paciente" value={item.name} />
                    <DetailField label="Sexo" value={item.gender} />
                    <DetailField label="Nascimento" value={item.birthDate} />
                    <DetailField label="Nacionalidade" value={item.nationality} />
                    <DetailField label="Raça/Cor" value={item.race} />
                    <DetailField label="Etnia" value={item.ethnicity} />
                    <DetailField label="Cep" value={item.zipCode} />
                    <DetailField label="Municipio" value={item.city} />
                    <DetailField label="Logradouro" value={`${item.street}, ${item.number}`} />
                    <DetailField label="Bairro" value={item.neighborhood} />
                    <DetailField label="Telefone" value={item.phone} />
                    <DetailField label="Data Agendamento" value={item.dateScheduling} />
                    <DetailField label="Procedimento (Código)" value={item.procCode} isPrimary />
                 </div>
                 <div className="col-span-full">
                   <DetailField label="Descrição do Procedimento" value={item.proc} />
                 </div>
                 <div className="flex gap-2 pt-2 mt-4 border-t border-slate-200 dark:border-slate-700">
                   <button onClick={() => onEdit(item.id)} className="flex-1 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-sm font-bold hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-2 mt-2">
                     <span className="material-symbols-outlined text-[18px]">edit</span> Editar
                   </button>
                   <button onClick={() => handleDelete(item.id)} className="flex-1 py-2.5 rounded-xl bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm font-bold hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors flex items-center justify-center gap-2 mt-2">
                     <span className="material-symbols-outlined text-[18px]">delete</span> Excluir
                   </button>
                 </div>
              </div>
            </details>
          ))}
        </div>
      )}

      <button onClick={onAddNew} className="fixed bottom-8 right-8 z-40 flex items-center justify-center w-14 h-14 bg-primary text-white rounded-full shadow-lg shadow-primary/40 hover:bg-primary-dark transition-all duration-300 hover:scale-110 active:scale-95 group">
        <span className="material-symbols-outlined text-[28px] group-hover:rotate-90 transition-transform">add</span>
      </button>
    </div>
  );
};

const WhatsAppModal = ({ item, onClose }: { item: ProcedureItem, onClose: () => void }) => {
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [message, setMessage] = useState('');
  const [phoneNumber, setPhoneNumber] = useState(item.phone || '');

  useEffect(() => {
    const fetchTemplates = async () => {
      const { data } = await supabase.from('whatsapp_templates').select('*').order('title');
      if (data) setTemplates(data);
    };
    fetchTemplates();
  }, []);

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const tmpl = templates.find(t => t.id === templateId);
    if (tmpl) {
      let msg = tmpl.message;
      msg = msg.replace(/{paciente}/g, item.name);
      msg = msg.replace(/{procedimento}/g, item.proc);
      msg = msg.replace(/{status}/g, item.status);
      msg = msg.replace(/{data_atendimento}/g, item.date);
      msg = msg.replace(/{data_agendamento}/g, item.dateScheduling);
      setMessage(msg);
    }
  };

  const handleSend = () => {
    // Remove non-digits
    let cleanNumber = phoneNumber.replace(/\D/g, '');
    if (!cleanNumber) {
      alert('Número de telefone inválido');
      return;
    }
    // Add Brazil country code if missing (naive check)
    if (cleanNumber.length <= 11) cleanNumber = '55' + cleanNumber;

    const url = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="bg-white dark:bg-surface-dark w-full max-w-md rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-700" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400">
              <span className="material-symbols-outlined">chat</span>
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight">Enviar Mensagem</h3>
              <p className="text-xs text-slate-500">WhatsApp Web</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="space-y-4">
          <div>
             <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Telefone (WhatsApp)</label>
             <input 
               value={phoneNumber}
               onChange={e => setPhoneNumber(e.target.value)}
               className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-green-500/50 font-mono"
               placeholder="55999999999"
             />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Modelo de Mensagem</label>
            <select 
              value={selectedTemplateId}
              onChange={e => handleTemplateChange(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-green-500/50"
            >
              <option value="">Selecione um modelo...</option>
              {templates.map(t => (
                <option key={t.id} value={t.id}>{t.title}</option>
              ))}
            </select>
          </div>

          <div>
             <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mensagem</label>
             <textarea 
               value={message}
               onChange={e => setMessage(e.target.value)}
               rows={6}
               className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-green-500/50 resize-none"
             />
          </div>

          <button 
            onClick={handleSend}
            disabled={!phoneNumber || !message}
            className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-green-500/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined">send</span>
            Enviar via WhatsApp
          </button>
        </div>
      </div>
    </div>
  );
};

const FilterButton = ({ label, count, active, onClick }: any) => (
  <button 
    onClick={onClick}
    className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all active:scale-95 ${active ? 'bg-primary text-white shadow-neon' : 'bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'}`}
  >
    {label}
    {count !== undefined && <span className={`flex size-5 items-center justify-center rounded-full text-[10px] font-bold ${active ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>{count}</span>}
  </button>
);

const DetailField = ({ label, value, isPrimary }: any) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    if (!value || value === 'N/A') return;
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div onClick={handleCopy} className={`p-3 rounded-lg bg-white dark:bg-surface-dark border border-slate-100 dark:border-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-all relative group select-none ${copied ? 'ring-2 ring-green-500 border-transparent' : ''}`} title="Clique para copiar">
      <div className="flex justify-between items-start">
        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{label}</p>
        <span className={`material-symbols-outlined text-[14px] text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity ${copied ? 'text-green-500 opacity-100' : ''}`}>{copied ? 'check' : 'content_copy'}</span>
      </div>
      <p className={`text-sm font-medium truncate ${isPrimary ? 'text-primary' : 'text-slate-700 dark:text-slate-200'}`}>{value}</p>
    </div>
  );
};

const StatusDropdown = ({ currentStatus, statusColor, onChange }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const statusOptions = ['Agendado', 'Em Produção', 'Concluído', 'Entregue'];
  return (
    <div className="relative inline-block">
      <button onClick={() => setIsOpen(!isOpen)} className="flex items-center gap-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded px-1.5 py-0.5 transition-colors">
        <span className={`text-[10px] font-bold uppercase ${statusColor}`}>{currentStatus}</span>
        <span className="material-symbols-outlined text-[14px] text-slate-400">arrow_drop_down</span>
      </button>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 mt-1 w-32 bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-20 overflow-hidden">
            {statusOptions.map(status => (
              <button key={status} onClick={() => { onChange(status); setIsOpen(false); }} className={`w-full text-left px-3 py-2 text-xs font-bold uppercase hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${status === currentStatus ? 'text-primary bg-primary/5' : 'text-slate-600 dark:text-slate-400'}`}>
                {status}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default ProcedureList;