import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

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
}

const ProcedureList: React.FC<ProcedureListProps> = ({ onAddNew, onEdit }) => {
  const [items, setItems] = useState<ProcedureItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('Todos');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchProcedures = async () => {
    try {
      setLoading(true);
      // 1. Buscar produção com dados COMPLETOS do paciente
      const { data: productionData, error: productionError } = await supabase
        .from('procedure_production')
        .select(`
          id,
          status,
          date_service,
          date_scheduling,
          procedure_code,
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

      // 2. Buscar nomes dos procedimentos
      const procedureCodes = [...new Set(productionData.map(item => item.procedure_code))];
      const { data: procedureCatalog, error: catalogError } = await supabase
        .from('procedures_catalog')
        .select('code, name')
        .in('code', procedureCodes);

      if (catalogError) throw catalogError;

      const procedureMap = new Map(procedureCatalog?.map(p => [p.code, p.name]));

      // 3. Mapear dados para a UI
      const formattedItems: ProcedureItem[] = productionData.map((item: any) => {
        const p = item.patients || {};
        const patientName = p.name || 'Desconhecido';
        const procName = procedureMap.get(item.procedure_code) || item.procedure_code;
        const status = item.status || 'Agendado';
        
        let statusColor = 'text-slate-500';
        if (status === 'Em Produção') statusColor = 'text-primary';
        else if (status === 'Concluído') statusColor = 'text-emerald-500';
        else if (status === 'Agendado') statusColor = 'text-yellow-500';
        
        // Formatar datas
        const dateObj = new Date(item.date_service || item.created_at);
        const dateStr = dateObj.toLocaleDateString('pt-BR');
        
        let dateSchedulingStr = 'N/A';
        if (item.date_scheduling) {
          dateSchedulingStr = new Date(item.date_scheduling).toLocaleDateString('pt-BR');
        }

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
          // Mapeando campos do paciente
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
          phone: p.phone || 'N/A'
        };
      });

      setItems(formattedItems);
    } catch (error) {
      console.error('Erro ao buscar procedimentos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este procedimento? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('procedure_production')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Atualizar lista localmente
      setItems(prev => prev.filter(item => item.id !== id));
    } catch (error) {
      console.error('Erro ao excluir:', error);
      alert('Erro ao excluir procedimento.');
    }
  };

  useEffect(() => {
    fetchProcedures();
  }, []);

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
          <FilterButton 
            label="Todos" 
            active={filter === 'Todos'} 
            onClick={() => setFilter('Todos')} 
          />
          <FilterButton 
            label="Agendados" 
            count={getCount('Agendado')} 
            active={filter === 'Agendado'} 
            onClick={() => setFilter('Agendado')}
          />
          <FilterButton 
            label="Em Produção" 
            count={getCount('Em Produção')} 
            active={filter === 'Em Produção'} 
            onClick={() => setFilter('Em Produção')}
          />
          <FilterButton 
            label="Concluídos" 
            count={getCount('Concluído')} 
            active={filter === 'Concluído'} 
            onClick={() => setFilter('Concluído')}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-8">
          <span className="material-symbols-outlined animate-spin text-primary text-4xl">progress_activity</span>
        </div>
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
              <summary className="flex cursor-pointer items-center justify-between p-4 list-none">
                <div className="flex items-center gap-4">
                  <div className="relative shrink-0">
                    <div className="size-12 overflow-hidden rounded-full border border-slate-100 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                      {item.avatar ? (
                        <img className="h-full w-full object-cover" src={item.avatar} alt="" />
                      ) : (
                        <span className="font-bold text-slate-400">{item.name.charAt(0)}</span>
                      )}
                    </div>
                    <div className="absolute -bottom-1 -right-1 flex size-5 items-center justify-center rounded-full bg-surface-light dark:bg-surface-dark border-2 border-surface-light dark:border-surface-dark">
                      <div className={`size-2.5 rounded-full ${item.status === 'Em Produção' ? 'bg-primary animate-pulse' : item.status === 'Concluído' ? 'bg-emerald-500' : 'bg-yellow-500'}`}></div>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">{item.name}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-[10px] font-bold uppercase ${item.statusColor}`}>{item.status}</span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500">•</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">{item.proc}</span>
                    </div>
                  </div>
                </div>
                <span className="material-symbols-outlined text-slate-400 group-open:rotate-180 transition-transform">expand_more</span>
              </summary>
              
              <div className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-background-dark/30 p-4 space-y-4">
                 {/* GRID DE DETALHES COMPLETA */}
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
                    <DetailField label="Cod Logradouro" value={item.street_code} />
                    <DetailField label="Tipo Logradouro" value={item.street_type} />
                    <DetailField label="Logradouro e nº" value={`${item.street}, ${item.number}`} />
                    <DetailField label="Bairro" value={item.neighborhood} />
                    <DetailField label="Telefone" value={item.phone} />
                    <DetailField label="Data Agendamento" value={item.dateScheduling} />
                    <DetailField label="Procedimento (Código)" value={item.procCode} isPrimary />
                 </div>
                 
                 {/* Descrição em largura total */}
                 <div className="col-span-full">
                   <DetailField label="Descrição do Procedimento" value={item.proc} />
                 </div>

                 <div className="flex gap-2 pt-2 mt-4 border-t border-slate-200 dark:border-slate-700">
                   <button 
                     onClick={() => onEdit(item.id)}
                     className="flex-1 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-sm font-bold hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-2 mt-2"
                   >
                     <span className="material-symbols-outlined text-[18px]">edit</span>
                     Editar
                   </button>
                   <button 
                     onClick={() => handleDelete(item.id)}
                     className="flex-1 py-2.5 rounded-xl bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm font-bold hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors flex items-center justify-center gap-2 mt-2"
                   >
                     <span className="material-symbols-outlined text-[18px]">delete</span>
                     Excluir
                   </button>
                 </div>
              </div>
            </details>
          ))}
        </div>
      )}

      <button 
        onClick={onAddNew}
        className="fixed bottom-8 right-8 z-40 flex items-center justify-center w-14 h-14 bg-primary text-white rounded-full shadow-lg shadow-primary/40 hover:bg-primary-dark transition-all duration-300 hover:scale-110 active:scale-95 group"
      >
        <span className="material-symbols-outlined text-[28px] group-hover:rotate-90 transition-transform">add</span>
      </button>
    </div>
  );
};

const FilterButton = ({ label, count, active, onClick }: any) => (
  <button 
    onClick={onClick}
    className={`
      flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all active:scale-95
      ${active 
        ? 'bg-primary text-white shadow-neon' 
        : 'bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'}
    `}
  >
    {label}
    {count !== undefined && (
      <span className={`flex size-5 items-center justify-center rounded-full text-[10px] font-bold ${active ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
        {count}
      </span>
    )}
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
    <div 
      onClick={handleCopy}
      className={`
        p-3 rounded-lg bg-white dark:bg-surface-dark border border-slate-100 dark:border-slate-800 
        cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-all relative group select-none
        ${copied ? 'ring-2 ring-green-500 border-transparent' : ''}
      `}
      title="Clique para copiar"
    >
      <div className="flex justify-between items-start">
        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{label}</p>
        <span className={`material-symbols-outlined text-[14px] text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity ${copied ? 'text-green-500 opacity-100' : ''}`}>
          {copied ? 'check' : 'content_copy'}
        </span>
      </div>
      <p className={`text-sm font-medium truncate ${isPrimary ? 'text-primary' : 'text-slate-700 dark:text-slate-200'}`}>
        {value}
      </p>
    </div>
  );
};

export default ProcedureList;
