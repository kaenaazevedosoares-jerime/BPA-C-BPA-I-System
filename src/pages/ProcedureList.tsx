import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { supabase } from '../lib/supabase';
import { WhatsAppTemplate, UserProfile } from '../types';
import ProcedureImportModal from '../components/ProcedureImportModal';
import { generateBpaITxt } from '../services/exportBpaService';
import { normalizeText } from '../utils/textUtils';

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
  rawBirthDate: string; // Added for Export
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
  cod_municipio?: string;
  // New fields
  sia_processed?: boolean;
  dateSia?: string; // New field for SIA processing date
  rawDateSia?: string | null;
  rawDate?: string | null;
  rawDateDelivery?: string | null;
  rawDateCancellation?: string | null;
  rawDateScheduling?: string | null;
  dateDelivery?: string;
  dateCancellation?: string;
  notes?: string;
}

const SiaDateModal = ({ onClose, onConfirm }: { onClose: () => void, onConfirm: (date: string) => void }) => {
  const [date, setDate] = useState('');

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white dark:bg-surface-dark w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-700 animate-fade-in" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400">
              <span className="material-symbols-outlined">event_available</span>
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight text-slate-900 dark:text-white">Data de Processamento</h3>
              <p className="text-xs text-slate-500">Informe a data do SIA</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-green-500/50 mb-4 text-slate-900 dark:text-white"
        />

        <button
          onClick={() => {
            if (!date) return alert('Selecione uma data');
            onConfirm(date);
          }}
          className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-green-500/30 transition-all flex items-center justify-center gap-2"
        >
          Confirmar
        </button>
      </div>
    </div>,
    document.body
  );
};

const ConfirmationModal = ({ title, message, onConfirm, onClose }: { title: string, message: string, onConfirm: () => void, onClose: () => void }) => {
  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white dark:bg-surface-dark w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-700 animate-fade-in" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400">
              <span className="material-symbols-outlined">warning</span>
            </div>
            <h3 className="font-bold text-lg leading-tight text-slate-900 dark:text-white">{title}</h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <p className="text-slate-600 dark:text-slate-300 mb-6">{message}</p>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => { onConfirm(); onClose(); }}
            className="flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold shadow-lg shadow-red-500/30 transition-colors"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

const StatusChangeDateModal = ({ status, onClose, onConfirm }: { status: string, onClose: () => void, onConfirm: (date: string, time: string) => void }) => {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');

  const getTitle = () => {
    switch (status) {
      case 'Consulta/Molde': return 'Data da Consulta/Molde';
      case 'Agendado Entrega': return 'Data do Agendamento';
      case 'Finalizado': return 'Data da Entrega/Finalização';
      case 'Cancelado': return 'Data do Cancelamento';
      default: return 'Confirmar Data';
    }
  };

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white dark:bg-surface-dark w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-700 animate-fade-in" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <span className="material-symbols-outlined">event</span>
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight text-slate-900 dark:text-white">{getTitle()}</h3>
              <p className="text-xs text-slate-500">Informe a data para alterar o status</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Data (Obrigatório)</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/50 text-slate-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Hora (Opcional)</label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/50 text-slate-900 dark:text-white"
            />
          </div>
        </div>

        <button
          onClick={() => {
            if (!date) return alert('A data é obrigatória');
            onConfirm(date, time);
          }}
          className="w-full mt-6 bg-blue-500 hover:bg-blue-600 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-500/30 transition-all flex items-center justify-center gap-2"
        >
          Confirmar Alteração
        </button>
      </div>
    </div>,
    document.body
  );
};

const ProcedureList: React.FC<ProcedureListProps> = ({ onAddNew, onEdit }) => {
  const [items, setItems] = useState<ProcedureItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string[]>(() => {
    const saved = localStorage.getItem('procedure_filter_settings');
    return saved ? JSON.parse(saved) : ['Todos'];
  });

  useEffect(() => {
    localStorage.setItem('procedure_filter_settings', JSON.stringify(filter));
  }, [filter]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSia, setFilterSia] = useState<'all' | 'processed' | 'pending'>('all');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // WhatsApp Modal State
  const [showWhatsApp, setShowWhatsApp] = useState(false);
  const [whatsAppItem, setWhatsAppItem] = useState<ProcedureItem | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [debugLogs, setDebugLogs] = useState<string[]>([]); // Debug state

  const [showSiaModal, setShowSiaModal] = useState(false);
  const [siaTargetId, setSiaTargetId] = useState<string | null>(null);

  // Status Change Date Modal State
  const [showStatusDateModal, setShowStatusDateModal] = useState(false);
  const [statusChangeTarget, setStatusChangeTarget] = useState<{ id: string, newStatus: string } | null>(null);

  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => { },
  });

  // Professional Search State (Desktop Only)
  const [profSearchTerm, setProfSearchTerm] = useState('');
  const [profSearchResults, setProfSearchResults] = useState<any[]>([]);
  const [showProfResults, setShowProfResults] = useState(false);
  const [selectedProfessional, setSelectedProfessional] = useState<any | null>(null);

  useEffect(() => {
    const searchProfs = async () => {
      if (profSearchTerm.length < 2) {
        setProfSearchResults([]);
        return;
      }

      const { data } = await supabase
        .from('profissionais')
        .select('*, establishments(name, cnes)')
        .or(`nome.ilike.%${profSearchTerm}%,sus.ilike.%${profSearchTerm}%`)
        .limit(5);

      if (data) setProfSearchResults(data);
    };

    const timeoutId = setTimeout(searchProfs, 300);
    return () => clearTimeout(timeoutId);
  }, [profSearchTerm]);

  const fetchProcedures = async () => {
    try {
      setLoading(true);
      const { data: productionData, error: productionError } = await supabase
        .from('procedure_production')
        .select(`
          id, status, date_service, date_scheduling, date_delivery, date_cancellation, notes, procedure_code, sia_processed, date_sia,
          patients (
            name, cns, birth_date, gender, nationality, race, ethnicity,
            zip_code, city, neighborhood, street, number, phone,
            street_code, street_type, cod_municipio
          )
        `)
        .order('date_sia', { ascending: false, nullsFirst: false }) // Prioritize SIA date sorting
        .order('date_service', { ascending: false }) // Fallback to service date
        .limit(2000); // Increased limit to ensure we get more records

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
        const status = (item.status || 'Agendado').trim(); // Ensure trim here

        let statusColor = 'text-slate-500';
        if (status === 'Em Produção' || status === 'Em Atendimento' || status === 'Consulta/Molde') statusColor = 'text-primary';
        else if (status === 'Finalizado' || status === 'Concluído') statusColor = 'text-emerald-500';
        else if (status === 'Agendado' || status === 'Agendado Entrega') statusColor = 'text-yellow-500';
        else if (status === 'Cancelado') statusColor = 'text-red-500';
        else if (status === 'Agendado Entrega') statusColor = 'text-purple-500';
        else if (status === 'CNS Inválido') statusColor = 'text-orange-600';

        // Helper to format date strictly from YYYY-MM-DD to DD/MM/YYYY without timezone issues
        const formatDate = (dateStr: string | null) => {
          if (!dateStr) return 'N/A';
          try {
            // Handle YYYY-MM-DD, ISO timestamp (T), and space separator
            const cleanDate = dateStr.split(/[T ]/)[0];
            return cleanDate.split('-').reverse().join('/');
          } catch (e) {
            return 'N/A';
          }
        };

        const getRawDate = (dateStr: string | null) => {
          if (!dateStr) return null;
          try {
            return dateStr.split(/[T ]/)[0]; // Returns YYYY-MM-DD
          } catch (e) {
            return null;
          }
        };

        const dateStr = formatDate(item.date_service);
        const dateSchedulingStr = formatDate(item.date_scheduling);
        const dateDeliveryStr = formatDate(item.date_delivery);
        const dateCancellationStr = formatDate(item.date_cancellation);
        const birthDateStr = formatDate(p.birth_date);

        return {
          id: item.id,
          name: patientName,
          status: status,
          statusColor: statusColor,
          proc: procName,
          procCode: item.procedure_code,
          date: dateStr,
          dateScheduling: dateSchedulingStr,
          dateDelivery: dateDeliveryStr,
          dateCancellation: dateCancellationStr,
          // Populating raw dates
          rawDate: getRawDate(item.date_service),
          rawDateDelivery: getRawDate(item.date_delivery),
          rawDateCancellation: getRawDate(item.date_cancellation),
          rawDateScheduling: getRawDate(item.date_scheduling), // Added for filtering logic
          notes: item.notes || '',
          avatar: '',
          cns: p.cns || 'N/A',
          birthDate: birthDateStr,
          rawBirthDate: p.birth_date,
          gender: p.gender || 'N/A',
          nationality: p.nationality || 'N/A',
          race: p.race || 'N/A',
          ethnicity: p.ethnicity || 'N/A',
          zipCode: p.zip_code || 'N/A',
          city: p.city || 'N/A',
          cod_municipio: p.cod_municipio,
          street_code: p.street_code || 'N/A',
          street_type: p.street_type || 'N/A',
          street: p.street || 'N/A',
          number: p.number || 'S/N',
          neighborhood: p.neighborhood || 'N/A',
          phone: p.phone || '',
          sia_processed: item.sia_processed || false,
          dateSia: item.date_sia ? formatDate(item.date_sia) : undefined, // Formatted for display
          rawDateSia: getRawDate(item.date_sia) // Raw for logic
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
    // Check if the status requires a date input
    if (['Consulta/Molde', 'Agendado Entrega', 'Finalizado', 'Cancelado'].includes(newStatus)) {
      setStatusChangeTarget({ id, newStatus });
      setShowStatusDateModal(true);
      return;
    }

    // Standard update for other statuses
    try {
      const { error } = await supabase.from('procedure_production').update({ status: newStatus }).eq('id', id);
      if (error) throw error;
      setItems(prev => prev.map(item => {
        if (item.id === id) {
          let statusColor = 'text-slate-500';
          if (newStatus === 'Em Produção' || newStatus === 'Em Atendimento' || newStatus === 'Consulta/Molde') statusColor = 'text-primary';
          else if (newStatus === 'Finalizado' || newStatus === 'Concluído') statusColor = 'text-emerald-500';
          else if (newStatus === 'Agendado' || newStatus === 'Agendado Entrega') statusColor = 'text-yellow-500';
          else if (newStatus === 'Cancelado') statusColor = 'text-red-500';
          else if (newStatus === 'CNS Inválido') statusColor = 'text-orange-600';
          return { ...item, status: newStatus, statusColor };
        }
        return item;
      }));
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      alert('Erro ao atualizar status.');
    }
  };

  const handleStatusDateConfirm = async (date: string, time: string) => {
    if (!statusChangeTarget) return;
    const { id, newStatus } = statusChangeTarget;

    // Construct timestamp or date string
    // If time is provided, append it. Otherwise, default to 00:00:00 or just date if needed.
    // Given the previous code uses formatDate with T split, let's use ISO format with time if possible, or just date.
    // Supabase date/timestamp columns usually accept YYYY-MM-DD HH:MM:SS
    const dateTime = time ? `${date} ${time}:00` : `${date} 00:00:00`;

    const updates: any = { status: newStatus };

    // Map status to date column
    if (newStatus === 'Consulta/Molde') updates.date_service = dateTime;
    else if (newStatus === 'Agendado Entrega') updates.date_scheduling = dateTime;
    else if (newStatus === 'Finalizado') updates.date_delivery = dateTime;
    else if (newStatus === 'Cancelado') updates.date_cancellation = dateTime;

    try {
      const { error } = await supabase.from('procedure_production').update(updates).eq('id', id);
      if (error) throw error;

      // Helper to format date for display (DD/MM/YYYY)
      const formatDate = (dateStr: string) => {
        try {
          const cleanDate = dateStr.split(/[T ]/)[0];
          return cleanDate.split('-').reverse().join('/');
        } catch (e) {
          return 'N/A';
        }
      };

      const displayDate = formatDate(date);
      const rawDate = date; // YYYY-MM-DD

      setItems(prev => prev.map(item => {
        if (item.id === id) {
          let statusColor = 'text-slate-500';
          if (newStatus === 'Em Produção' || newStatus === 'Em Atendimento' || newStatus === 'Consulta/Molde') statusColor = 'text-primary';
          else if (newStatus === 'Finalizado' || newStatus === 'Concluído') statusColor = 'text-emerald-500';
          else if (newStatus === 'Agendado' || newStatus === 'Agendado Entrega') statusColor = 'text-yellow-500';
          else if (newStatus === 'Cancelado') statusColor = 'text-red-500';
          else if (newStatus === 'CNS Inválido') statusColor = 'text-orange-600';

          const updatedItem = { ...item, status: newStatus, statusColor };

          // Update local item date fields for immediate feedback
          if (newStatus === 'Consulta/Molde') { updatedItem.date = displayDate; updatedItem.rawDate = rawDate; }
          else if (newStatus === 'Agendado Entrega') { updatedItem.dateScheduling = displayDate; updatedItem.rawDateScheduling = rawDate; }
          else if (newStatus === 'Finalizado') { updatedItem.dateDelivery = displayDate; updatedItem.rawDateDelivery = rawDate; }
          else if (newStatus === 'Cancelado') { updatedItem.dateCancellation = displayDate; updatedItem.rawDateCancellation = rawDate; }

          return updatedItem;
        }
        return item;
      }));

      setShowStatusDateModal(false);
      setStatusChangeTarget(null);
    } catch (error) {
      console.error('Erro ao atualizar status e data:', error);
      alert('Erro ao atualizar status.');
    }
  };

  const handleDelete = async (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Excluir Procedimento',
      message: 'Tem certeza que deseja excluir este procedimento? Esta ação não pode ser desfeita.',
      onConfirm: async () => {
        try {
          const { error } = await supabase.from('procedure_production').delete().eq('id', id);
          if (error) throw error;
          setItems(prev => prev.filter(item => item.id !== id));
        } catch (error) {
          console.error('Erro ao excluir:', error);
          alert('Erro ao excluir procedimento.');
        }
      }
    });
  };

  useEffect(() => {
    fetchProcedures();

    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (data) setUserProfile(data);
      }
    };
    fetchProfile();
  }, []);

  const handleToggleSia = async (id: string, currentVal: boolean, hasDate: boolean) => {
    if (userProfile?.role !== 'admin') {
      alert('Apenas administradores podem alterar o status SIA.');
      return;
    }

    // Case 1: Not processed -> Open Modal to set date (and mark as processed)
    if (!currentVal) {
      setSiaTargetId(id);
      setShowSiaModal(true);
      return;
    }

    // Case 2: Processed but missing date -> Open Modal to set date
    if (currentVal && !hasDate) {
      setSiaTargetId(id);
      setShowSiaModal(true);
      return;
    }

    // Case 3: Processed and has date -> Confirm to Remove
    setConfirmModal({
      isOpen: true,
      title: 'Remover Status SIA',
      message: 'Deseja remover o processamento SIA deste procedimento? A data registrada será apagada.',
      onConfirm: async () => {
        try {
          const { error } = await supabase.from('procedure_production')
            .update({ sia_processed: false, date_sia: null })
            .eq('id', id);

          if (error) throw error;
          setItems(prev => prev.map(item => item.id === id ? { ...item, sia_processed: false, dateSia: undefined, rawDateSia: null } : item));
        } catch (error) {
          console.error('Erro ao atualizar SIA:', error);
          alert('Erro ao remover status SIA.');
        }
      }
    });
  };

  const handleSiaConfirm = async (date: string) => {
    // Se siaTargetId existir, é modo individual. Se for null, é modo lote usando selectedItems.
    const idsToUpdate = siaTargetId ? [siaTargetId] : Array.from(selectedItems);

    if (idsToUpdate.length === 0) return;

    try {
      const { error } = await supabase.from('procedure_production')
        .update({ sia_processed: true, date_sia: date })
        .in('id', idsToUpdate);

      if (error) throw error;

      // Helper to format date strictly from YYYY-MM-DD to DD/MM/YYYY
      const formatDate = (dateStr: string) => {
        try {
          const cleanDate = dateStr.split(/[T ]/)[0];
          return cleanDate.split('-').reverse().join('/');
        } catch (e) {
          return 'N/A';
        }
      };

      const formattedDate = formatDate(date);

      setItems(prev => prev.map(item =>
        idsToUpdate.includes(item.id)
          ? { ...item, sia_processed: true, dateSia: formattedDate, rawDateSia: date }
          : item
      ));

      if (!siaTargetId) {
        setSelectedItems(new Set()); // Limpa a seleção após atualização em lote
      }

      setShowSiaModal(false);
      setSiaTargetId(null);
      if (!siaTargetId) {
        alert(`${idsToUpdate.length} procedimentos atualizados com sucesso!`);
      }
    } catch (error) {
      console.error('Erro ao confirmar SIA:', error);
      alert('Erro ao salvar data do SIA.');
    }
  };

  const checkDateInRange = (item: ProcedureItem, logRejection = false) => {
    // If no date range is set, everything passes
    if (!dateStart && !dateEnd) return true;

    // --- SIA Date Priority Logic ---
    // If SIA is processed and we are filtering for processed items (or implicitly viewing them),
    // we should prioritize the SIA Date for filtering if available.
    // However, the requirement says: "ao usuar o filtro do intervalo de datas, filtre com base no data do do processa,ento sia se o mesmo estiver acionado."
    // This implies that IF SIA filter is ON ('processed'), we use SIA Date.

    let dateToCompare = item.rawDate; // Default fallback: Service Date
    let dateSource = 'Service';

    if (filterSia === 'processed' && item.rawDateSia) {
      dateToCompare = item.rawDateSia;
      dateSource = 'SIA Processing';
    } else {
      // Standard Logic (Status Based)
      const currentStatus = item.status.trim();

      if (currentStatus === 'Finalizado' || currentStatus === 'Concluído') {
        if (item.rawDateDelivery) {
          dateToCompare = item.rawDateDelivery;
          dateSource = 'Delivery';
        } else {
          // Fallback explicitly to Service Date if Delivery is missing
          dateToCompare = item.rawDate;
          dateSource = 'Fallback Service';
        }
      } else if (currentStatus === 'Agendado Entrega') {
        if (item.dateScheduling) {
          // Need to convert dd/mm/yyyy back to yyyy-mm-dd for comparison if raw is not available
          // But we have dateScheduling string. Let's try to use a raw prop if added, or parse.
          // Adding rawDateScheduling to items would be cleaner, but let's parse for now if needed.
          // Wait, items map has `dateScheduling` formatted.
          // Let's assume we add `rawDateScheduling` to item interface for consistency.
          // UPDATE: Added rawDateScheduling logic below in mapping.
          // For now, let's use the dateScheduling string parsing if raw missing.

          // Actually, let's look at the mapping logic. We can add rawDateScheduling there.
          // Assuming rawDateScheduling is available on item (we will add it).
          if ((item as any).rawDateScheduling) {
            dateToCompare = (item as any).rawDateScheduling;
            dateSource = 'Scheduling';
          }
        }
      } else if (currentStatus === 'Cancelado') {
        if (item.rawDateCancellation) {
          dateToCompare = item.rawDateCancellation;
          dateSource = 'Cancellation';
        } else {
          dateToCompare = item.rawDate;
          dateSource = 'Fallback Service';
        }
      } else if (currentStatus === 'CNS Inválido' || currentStatus === 'SUS Inválido') {
        dateToCompare = item.rawDate;
        dateSource = 'Service (Invalid CNS)';
      }
    }

    // 2. If absolutely no date found, it fails the range filter
    if (!dateToCompare) {
      if (logRejection) console.log(`Rejected ${item.name} (${item.status}): No Date`);
      return false;
    }

    // 3. Compare dates (YYYY-MM-DD string comparison)
    if (dateStart && dateToCompare < dateStart) {
      if (logRejection) console.log(`Rejected ${item.name}: ${dateToCompare} < ${dateStart} (${dateSource})`);
      return false;
    }
    if (dateEnd && dateToCompare > dateEnd) {
      if (logRejection) console.log(`Rejected ${item.name}: ${dateToCompare} > ${dateEnd} (${dateSource})`);
      return false;
    }

    return true;
  };

  // Re-run filter and capture debug logs when dependencies change
  useEffect(() => {
    if (items.length === 0) return;
    const logs: string[] = [];

    items.forEach(item => {
      // Only log "Finalizado" items that are rejected to avoid noise
      if (item.status === 'Finalizado' || item.status === 'Concluído') {
        const passed = checkDateInRange(item, false);
        if (!passed) {
          // Re-run logic to get details
          const currentStatus = item.status.trim();
          let dateToCompare = item.rawDate;
          let dateSource = 'Service';
          if (item.rawDateDelivery) { dateToCompare = item.rawDateDelivery; dateSource = 'Delivery'; }

          if ((dateStart || dateEnd) && !item.rawDateDelivery) {
            logs.push(`[REJEITADO] ${item.name} | Status: ${currentStatus} | Data Usada: ${dateToCompare || 'N/A'} (${dateSource}) | Range: ${dateStart} a ${dateEnd} | Motivo: Entrega vazia`);
          }
        }
      }
    });

    if (logs.length > 0) {
      setDebugLogs(logs.slice(0, 5)); // Keep top 5
    } else {
      setDebugLogs([]);
    }
  }, [items, dateStart, dateEnd, filter, filterSia, searchTerm]);

  const checkStatusFilter = (item: ProcedureItem) => {
    // 1. "Todos" (Default) - Show everything
    if (filter.includes('Todos')) return true;

    // 2. Multi-select check
    // O filtro "Em Produção" age como macro para: Em Produção, Em Atendimento, Consulta/Molde, Agendado Entrega
    if (filter.includes('Em Produção') && ['Em Produção', 'Em Atendimento', 'Consulta/Molde', 'Agendado Entrega'].includes(item.status)) return true;

    return filter.includes(item.status);
  };

  const checkSiaFilter = (item: ProcedureItem) => {
    if (filterSia === 'all') return true;
    if (filterSia === 'processed') return item.sia_processed === true;
    if (filterSia === 'pending') return !item.sia_processed;
    return true;
  };

  const checkSearchFilter = (item: ProcedureItem) => {
    if (!searchTerm) return true;
    const term = normalizeText(searchTerm);
    return (
      normalizeText(item.name).includes(term) ||
      item.cns.includes(term) ||
      normalizeText(item.proc).includes(term) ||
      normalizeText(item.procCode).includes(term)
    );
  };

  const getEffectiveDate = (item: ProcedureItem) => {
    const s = item.status.trim();
    if (s === 'Finalizado' || s === 'Concluído') return item.rawDateDelivery || item.rawDate;
    if (s === 'Cancelado') return item.rawDateCancellation || item.rawDate;
    if (s === 'Agendado Entrega') return item.rawDateScheduling || item.rawDate;
    return item.rawDate; // Default for Consulta/Molde etc
  };

  const filteredItems = items.filter(item => {
    return checkStatusFilter(item) &&
      checkSiaFilter(item) &&
      checkDateInRange(item) &&
      checkSearchFilter(item);
  }).sort((a, b) => {
    // Sorting Logic
    // 1. If SIA Filter is Processed -> Sort by SIA Date DESC (or Effective Date DESC)
    if (filterSia === 'processed') {
      const dateA = a.rawDateSia || getEffectiveDate(a) || '';
      const dateB = b.rawDateSia || getEffectiveDate(b) || '';
      return dateB.localeCompare(dateA);
    }

    // 2. If Status Filter is ONLY Finalizado or Cancelado -> Sort DESC (Recent -> Old)
    const isHistorical = filter.some(f => ['Finalizado', 'Concluído', 'Cancelado'].includes(f)) && !filter.includes('Todos');
    if (isHistorical) {
      const dateA = getEffectiveDate(a) || '';
      const dateB = getEffectiveDate(b) || '';
      return dateB.localeCompare(dateA);
    }

    // 3. All other cases (Pending statuses, or 'Todos' default view for pending workflow) -> Sort ASC (Old -> Recent)
    // "Já os outros status será do mais antigo para o mais recente."
    const dateA = getEffectiveDate(a) || '';
    const dateB = getEffectiveDate(b) || '';
    return dateA.localeCompare(dateB);
  });

  const handleExportTxt = () => {
    // Se houver itens selecionados, exporta apenas eles. Caso contrário, exporta a lista filtrada atual.
    const itemsToExport = selectedItems.size > 0
      ? items.filter(item => selectedItems.has(item.id))
      : filteredItems;

    if (itemsToExport.length === 0) return alert('Nenhum registro para exportar.');

    const seenCns = new Set();
    const uniquePatients = [];

    for (const item of itemsToExport) {
      const cns = item.cns.replace(/\D/g, '');
      if (cns && !seenCns.has(cns)) {
        seenCns.add(cns);
        uniquePatients.push({
          cns: item.cns,
          name: item.name,
          birth_date: item.rawBirthDate,
          gender: item.gender,
          nationality: item.nationality,
          race: item.race,
          zip_code: item.zipCode,
          street_code: item.street_code,
          street: item.street,
          number: item.number,
          neighborhood: item.neighborhood,
          phone: item.phone,
          cod_municipio: item.cod_municipio || (item.city.toLowerCase().includes('anajas') ? '150070' : undefined)
        });
      }
    }

    generateBpaITxt(uniquePatients);
  };

  const handleSelectItem = (id: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedItems.size === filteredItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredItems.map(i => i.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedItems.size === 0) return;

    setConfirmModal({
      isOpen: true,
      title: 'Excluir Procedimentos',
      message: `Tem certeza que deseja excluir ${selectedItems.size} procedimentos? Esta ação não pode ser desfeita.`,
      onConfirm: async () => {
        try {
          const { error } = await supabase
            .from('procedure_production')
            .delete()
            .in('id', Array.from(selectedItems));

          if (error) throw error;

          setItems(prev => prev.filter(item => !selectedItems.has(item.id)));
          setSelectedItems(new Set());
          alert('Procedimentos excluídos com sucesso!');
        } catch (error) {
          console.error('Erro ao excluir procedimentos:', error);
          alert('Erro ao excluir procedimentos.');
        }
      }
    });
  };

  const getCount = (status: string) => {
    if (status === 'Em Produção') {
      return items.filter(i => i.status === 'Consulta/Molde' || i.status === 'Agendado Entrega' || i.status === 'Em Atendimento' || i.status === 'Em Produção').length;
    }
    return items.filter(i => i.status === status).length;
  };

  const getSiaCount = (type: 'processed' | 'pending') => {
    if (type === 'processed') return items.filter(i => i.sia_processed).length;
    return items.filter(i => !i.sia_processed).length;
  };

  const getStatusLabel = (filterName: string) => {
    if (filterName === 'Todos') return 'Status';
    if (filterName === 'Em Produção') return 'Em Produção';
    return filterName;
  }

  return (
    <div className="p-4 space-y-6 animate-fade-in max-w-4xl mx-auto w-full">
      {/* WhatsApp Modal */}
      {showWhatsApp && whatsAppItem && (
        <WhatsAppModal
          item={whatsAppItem}
          onClose={() => { setShowWhatsApp(false); setWhatsAppItem(null); }}
        />
      )}

      {/* Professional Details Modal */}
      {selectedProfessional && (
        <ProfessionalDetailsModal
          professional={selectedProfessional}
          onClose={() => setSelectedProfessional(null)}
        />
      )}

      {/* Status Change Date Modal */}
      {showStatusDateModal && statusChangeTarget && (
        <StatusChangeDateModal
          status={statusChangeTarget.newStatus}
          onClose={() => { setShowStatusDateModal(false); setStatusChangeTarget(null); }}
          onConfirm={handleStatusDateConfirm}
        />
      )}

      {/* SIA Date Modal */}
      {showSiaModal && (
        <SiaDateModal
          onClose={() => { setShowSiaModal(false); setSiaTargetId(null); }}
          onConfirm={handleSiaConfirm}
        />
      )}

      {/* Generic Confirmation Modal */}
      {confirmModal.isOpen && (
        <ConfirmationModal
          title={confirmModal.title}
          message={confirmModal.message}
          onConfirm={confirmModal.onConfirm}
          onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        />
      )}

      {/* Import Modal */}
      {showImportModal && (
        <ProcedureImportModal
          onClose={() => setShowImportModal(false)}
          onSuccess={() => {
            setShowImportModal(false);
            fetchProcedures();
          }}
        />
      )}

      <div className="flex flex-col gap-4">
        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row justify-end gap-3">
          {userProfile?.role === 'admin' && (
            <>
              <button
                onClick={handleExportTxt}
                className="flex items-center justify-center gap-2 bg-slate-800 text-white font-bold px-4 py-2.5 rounded-xl shadow-lg hover:bg-slate-700 transition-all duration-300 active:scale-95 text-sm w-full sm:w-auto"
              >
                <span className="material-symbols-outlined text-[20px]">text_snippet</span>
                <span>Exportar TXT</span>
              </button>

              <button
                onClick={() => setShowImportModal(true)}
                className="flex items-center justify-center gap-2 bg-emerald-900/80 text-emerald-400 font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-emerald-900/20 hover:bg-emerald-900 transition-all duration-300 active:scale-95 border border-emerald-800 backdrop-blur-sm text-sm w-full sm:w-auto"
              >
                <span className="material-symbols-outlined text-[20px]">upload_file</span>
                <span>Importar Excel</span>
              </button>
            </>
          )}

          <button
            onClick={onAddNew}
            className="flex items-center justify-center gap-2 bg-primary text-white font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-primary/40 hover:bg-primary-dark transition-all duration-300 active:scale-95 text-sm w-full sm:w-auto"
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
            <span>Novo Procedimento</span>
          </button>
        </div>

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

        {/* Date Filter Inputs */}
        <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center sm:flex sm:w-auto">
          <input
            type="date"
            value={dateStart}
            onChange={(e) => setDateStart(e.target.value)}
            className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-surface-dark px-3 py-3 sm:py-2 text-sm text-slate-600 dark:text-slate-300 outline-none focus:border-primary"
          />
          <span className="text-slate-400 font-bold">-</span>
          <input
            type="date"
            value={dateEnd}
            onChange={(e) => setDateEnd(e.target.value)}
            className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-surface-dark px-3 py-3 sm:py-2 text-sm text-slate-600 dark:text-slate-300 outline-none focus:border-primary"
          />
        </div>

        {/* Professional Quick Search (Desktop Only) */}
        <div className="hidden md:block relative w-64" onBlur={() => setTimeout(() => setShowProfResults(false), 200)}>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 text-[18px]">person_search</span>
            <input
              value={profSearchTerm}
              onChange={(e) => {
                setProfSearchTerm(e.target.value);
                setShowProfResults(true);
              }}
              onFocus={() => setShowProfResults(true)}
              className="w-full bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-800 rounded-xl py-2 pl-9 pr-4 text-sm focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-slate-400"
              placeholder="Buscar Profissional..."
            />
          </div>

          {/* Results Dropdown */}
          {showProfResults && profSearchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-surface-dark rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 overflow-hidden z-50">
              {profSearchResults.map(prof => (
                <button
                  key={prof.id}
                  onClick={() => {
                    setSelectedProfessional(prof);
                    setShowProfResults(false);
                    setProfSearchTerm('');
                  }}
                  className="w-full text-left p-3 hover:bg-slate-50 dark:hover:bg-slate-800 border-b border-slate-50 dark:border-slate-800 last:border-0 transition-colors"
                >
                  <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{prof.nome}</p>
                  <p className="text-xs text-slate-500 font-mono">SUS: {prof.sus}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          {/* Multi-Select Status Dropdown */}
          <div className="relative grow sm:grow-0">
            <MultiSelectFilterDropdown
              selected={filter}
              onChange={setFilter}
              options={['Todos', 'Em Produção', 'Consulta/Molde', 'Agendado Entrega', 'Finalizado', 'Cancelado', 'CNS Inválido']}
              getCount={(status: string) => {
                if (status === 'Todos') return items.length;
                // Contagem agrupada para o filtro "Em Produção"
                if (status === 'Em Produção') return items.filter(i => ['Em Produção', 'Em Atendimento', 'Consulta/Molde', 'Agendado Entrega'].includes(i.status)).length;
                return items.filter(i => i.status === status).length;
              }}
            />
          </div>

          <div className="hidden sm:block w-px bg-slate-200 dark:bg-slate-700 mx-2 h-6"></div>

          <button
            onClick={() => setFilterSia(filterSia === 'all' ? 'processed' : filterSia === 'processed' ? 'pending' : 'all')}
            className={`flex grow sm:grow-0 shrink-0 items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all active:scale-95 border ${filterSia !== 'all' ? (filterSia === 'processed' ? 'bg-green-500 text-white border-green-500' : 'bg-red-500 text-white border-red-500') : 'bg-white dark:bg-surface-dark border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'}`}
          >
            <span className="material-symbols-outlined text-[18px]">
              {filterSia === 'all' ? 'filter_alt' : filterSia === 'processed' ? 'check_circle' : 'pending'}
            </span>
            {filterSia === 'all' ? 'Filtro SIA' : filterSia === 'processed' ? 'SIA Processado' : 'SIA Pendente'}
            {filterSia !== 'all' && (
              <span className={`flex size-5 items-center justify-center rounded-full text-[10px] font-bold ${filterSia === 'all' ? 'bg-slate-100 dark:bg-slate-800 text-slate-500' : 'bg-white/20 text-white'}`}>
                {getSiaCount(filterSia === 'processed' ? 'processed' : 'pending')}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {(selectedItems.size > 0) && (
        <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-800 p-4 rounded-xl shadow-inner animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center">
              <input
                type="checkbox"
                checked={filteredItems.length > 0 && selectedItems.size === filteredItems.length}
                onChange={handleSelectAll}
                className="peer w-5 h-5 cursor-pointer appearance-none rounded-md border-2 border-slate-300 dark:border-slate-600 checked:bg-primary checked:border-primary transition-all"
              />
              <span className="absolute inset-0 flex items-center justify-center pointer-events-none text-white opacity-0 peer-checked:opacity-100 transition-opacity material-symbols-outlined text-[16px] font-bold">check</span>
            </div>
            <span className="text-sm font-bold text-slate-700 dark:text-slate-300 select-none cursor-pointer" onClick={handleSelectAll}>
              Selecionar Todos ({selectedItems.size} de {filteredItems.length})
            </span>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleExportTxt}
              className="flex items-center gap-2 bg-slate-700 hover:bg-slate-800 text-white font-bold px-4 py-2 rounded-lg transition-colors text-sm shadow-sm"
            >
              <span className="material-symbols-outlined text-[18px]">text_snippet</span>
              Exportar ({selectedItems.size})
            </button>

            {userProfile?.role === 'admin' && (
              <>
                <button
                  onClick={() => {
                    setSiaTargetId(null); // Null indica modo lote
                    setShowSiaModal(true);
                  }}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-lg transition-colors text-sm shadow-sm"
                >
                  <span className="material-symbols-outlined text-[18px]">event_available</span>
                  Datar SIA ({selectedItems.size})
                </button>

                <button
                  onClick={handleBulkDelete}
                  className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white font-bold px-4 py-2 rounded-lg transition-colors text-sm shadow-sm"
                >
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                  Excluir ({selectedItems.size})
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Debug Logs Area - Only visible if there are logs */}
      {debugLogs.length > 0 && (
        <div className="bg-slate-900 text-slate-300 p-4 rounded-xl text-xs font-mono mb-4 border border-slate-700 shadow-lg">
          <h4 className="text-yellow-400 font-bold mb-2 uppercase flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">bug_report</span>
            Diagnóstico de Filtro (Itens Finalizados Ocultos)
          </h4>
          <ul className="space-y-1">
            {debugLogs.map((log, i) => (
              <li key={i} className="break-all border-b border-slate-800 pb-1 last:border-0">{log}</li>
            ))}
          </ul>
          <p className="mt-2 text-[10px] text-slate-500">* Mostrando apenas os 5 primeiros itens ocultos pelo filtro de data.</p>
        </div>
      )}

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
              className="group relative rounded-2xl bg-surface-light dark:bg-surface-dark border border-slate-200 dark:border-slate-800 shadow-sm transition-all open:ring-2 open:ring-primary/20 open:z-30"
            >
              <summary className="flex flex-col sm:flex-row cursor-pointer sm:items-center p-4 list-none relative gap-3 sm:gap-0">
                {/* Admin Checkbox */}
                {userProfile?.role === 'admin' && (
                  <div className="absolute top-4 left-4 sm:static sm:mr-4 z-10" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedItems.has(item.id)}
                      onChange={() => handleSelectItem(item.id)}
                      className="peer w-5 h-5 cursor-pointer appearance-none rounded-md border-2 border-slate-300 dark:border-slate-600 checked:bg-primary checked:border-primary transition-all"
                    />
                    <span className="absolute inset-0 flex items-center justify-center pointer-events-none text-white opacity-0 peer-checked:opacity-100 transition-opacity material-symbols-outlined text-[16px] font-bold">check</span>
                  </div>
                )}

                <div className={`flex items-center gap-4 flex-1 min-w-0 ${userProfile?.role === 'admin' ? 'pl-8 sm:pl-0' : ''}`}>
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
                  <div className="flex flex-col min-w-0">
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-tight flex flex-wrap items-center gap-2">
                      <span className="truncate">{item.name}</span>
                      {/* Em Produção Badge - Highlighted */}
                      {(item.status === 'Consulta/Molde' || item.status === 'Agendado Entrega') && (
                        <span className="text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 px-2 py-0.5 rounded-full font-bold border border-amber-200 dark:border-amber-800 flex items-center gap-1 shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                          Em Produção
                        </span>
                      )}
                    </h3>
                    <div className="flex flex-wrap items-center gap-1 mt-0.5 text-slate-500 dark:text-slate-400">
                      <span className="material-symbols-outlined text-[14px]">id_card</span>
                      <span className="text-[11px] font-mono font-medium">{item.cns}</span>
                      <span className="mx-1">•</span>
                      <span className="material-symbols-outlined text-[14px]">event</span>
                      <span className="text-[11px] font-mono font-medium">
                        {(item.status === 'Finalizado' || item.status === 'Concluído') && item.dateDelivery && item.dateDelivery !== 'N/A'
                          ? item.dateDelivery
                          : (item.status === 'Agendado Entrega' && item.dateScheduling && item.dateScheduling !== 'N/A')
                            ? item.dateScheduling
                            : (item.status === 'Cancelado' && item.dateCancellation && item.dateCancellation !== 'N/A')
                              ? item.dateCancellation
                              : item.date
                        }
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Actions: SIA, WhatsApp (W) & Status (A) */}
                <div className="flex items-center justify-end gap-2 sm:gap-4 mt-2 sm:mt-0 sm:ml-4" onClick={(e) => e.preventDefault()}>
                  <div className="flex items-center gap-2">
                    {/* SIA Toggle Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleSia(item.id, item.sia_processed || false, !!item.dateSia);
                      }}
                      className={`group flex items-center justify-center h-9 px-3 rounded-full transition-all border shadow-sm ${item.sia_processed
                        ? (item.dateSia ? 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200' : 'bg-gradient-to-r from-green-100 to-yellow-100 text-green-800 border-green-200 hover:from-green-200 hover:to-yellow-200')
                        : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                        } ${userProfile?.role === 'admin' ? 'cursor-pointer active:scale-95' : 'cursor-default opacity-80'}`}
                      title={userProfile?.role === 'admin' ? 'Alternar Status SIA' : 'Status SIA (Somente Admin)'}
                    >
                      <span className="text-[10px] font-bold uppercase mr-1">SIA</span>
                      {item.sia_processed && item.dateSia ? (
                        <span className="text-[10px] font-bold font-mono">{item.dateSia.substring(3)}</span>
                      ) : (
                        <div className={`w-2 h-2 rounded-full ${item.sia_processed ? 'bg-green-500' : 'bg-slate-400'}`}></div>
                      )}
                    </button>

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
                  </div>

                  {/* A: Status Dropdown */}
                  <StatusDropdown
                    currentStatus={item.status}
                    statusColor={item.statusColor}
                    onChange={(newStatus) => handleStatusChange(item.id, newStatus)}
                  />
                </div>
                <span className="absolute right-4 top-4 sm:top-1/2 sm:-translate-y-1/2 material-symbols-outlined text-slate-400 group-open:rotate-180 transition-transform">expand_more</span>
              </summary>

              <div className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-background-dark/30 p-4 space-y-4 rounded-b-2xl">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  <DetailField label="Sus" value={item.cns} />
                  {item.dateDelivery && item.dateDelivery !== 'N/A' && (
                    <DetailField label="Data Entrega" value={item.dateDelivery} isAnimated={true} />
                  )}
                  <DetailField label="Procedimento (Código)" value={item.procCode} isAnimated={true} />
                  <DetailField label="Paciente" value={item.name} />
                  <DetailField label="Sexo" value={item.gender} />
                  <DetailField label="Nascimento" value={item.birthDate} />
                  <DetailField label="Nacionalidade" value={item.nationality} />
                  <DetailField label="Raça/Cor" value={item.race} />
                  <DetailField label="Etnia" value={item.ethnicity} />
                  <DetailField label="Cep" value={item.zipCode} />
                  <DetailField label="Municipio" value={item.city} />

                  {/* Logradouro Split Logic */}
                  <DetailField label="Cod. Lograd." value={item.street_code} />
                  <DetailField label="Tipo Lograd." value={item.street_type} />
                  <DetailField label="Logradouro" value={item.street} />
                  <DetailField label="Nº" value={item.number} />

                  <DetailField label="Bairro" value={item.neighborhood} />

                  {/* Phone Split Logic */}
                  <DetailField label="DDD" value={item.phone.replace(/\D/g, '').substring(0, 2)} />
                  <DetailField label="Telefone/Celular" value={item.phone.replace(/\D/g, '').substring(2)} />

                  {/* Date Fields - Conditional Display */}
                  {item.date && item.date !== 'N/A' && (
                    <DetailField
                      label={(item.proc.toLowerCase().includes('prótese') || item.proc.toLowerCase().includes('protese')) ? "Data Consulta/Molde" : "Data Atendimento"}
                      value={item.date}
                    />
                  )}
                  {item.dateScheduling && item.dateScheduling !== 'N/A' && (
                    <DetailField label="Data Agendamento" value={item.dateScheduling} />
                  )}
                  {item.dateCancellation && item.dateCancellation !== 'N/A' && (
                    <DetailField label="Data Cancelamento" value={item.dateCancellation} />
                  )}
                </div>
                <div className="col-span-full">
                  <DetailField label="Descrição do Procedimento" value={item.proc} />
                </div>
                <div className="flex gap-2 pt-2 mt-4 border-t border-slate-200 dark:border-slate-700">
                  <button onClick={() => onEdit(item.id)} className="flex-1 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-sm font-bold hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-2 mt-2">
                    <span className="material-symbols-outlined text-[18px]">edit</span> Editar
                  </button>
                  {userProfile?.role === 'admin' && (
                    <button onClick={() => handleDelete(item.id)} className="flex-1 py-2.5 rounded-xl bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm font-bold hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors flex items-center justify-center gap-2 mt-2">
                      <span className="material-symbols-outlined text-[18px]">delete</span> Excluir
                    </button>
                  )}
                </div>
              </div>
            </details>
          ))}
        </div>
      )}

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
      msg = msg.replace(/{cns}/g, item.cns);
      msg = msg.replace(/{nascimento}/g, item.birthDate);
      msg = msg.replace(/{genero}/g, item.gender);
      msg = msg.replace(/{bairro}/g, item.neighborhood);
      msg = msg.replace(/{procedimento}/g, item.proc);
      msg = msg.replace(/{codigo_procedimento}/g, item.procCode);
      msg = msg.replace(/{data_atendimento}/g, item.date);
      msg = msg.replace(/{data_consulta_molde}/g, item.date);
      msg = msg.replace(/{data_agendamento}/g, item.dateScheduling);
      msg = msg.replace(/{data_entrega}/g, item.dateDelivery || 'N/A');
      msg = msg.replace(/{data_cancelamento}/g, item.dateCancellation || 'N/A');
      msg = msg.replace(/{status}/g, item.status);
      msg = msg.replace(/{observacoes}/g, item.notes || '');
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

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white dark:bg-surface-dark w-full max-w-md rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-700 animate-fade-in" onClick={e => e.stopPropagation()}>
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
    </div>,
    document.body
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

const DetailField = ({ label, value, isPrimary, isAnimated }: any) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    if (!value || value === 'N/A') return;
    navigator.clipboard.writeText(value);
    setCopied(true);
    // Timeout removed to persist state until refresh/unmount
  };
  return (
    <div
      onClick={handleCopy}
      className={`p-3 rounded-lg border cursor-pointer transition-all relative group select-none ${copied
        ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 ring-1 ring-green-500'
        : isAnimated
          ? 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800 ring-1 ring-blue-400 dark:ring-blue-500 animate-pulse'
          : 'bg-white dark:bg-surface-dark border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
        }`}
      title="Clique para copiar"
    >
      <div className="flex justify-between items-start">
        <p className={`text-[9px] font-bold uppercase tracking-widest mb-0.5 ${isAnimated ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`}>{label}</p>
        <span className={`material-symbols-outlined text-[14px] transition-opacity ${copied ? 'text-green-500 opacity-100' : 'text-slate-300 opacity-0 group-hover:opacity-100'}`}>{copied ? 'check' : 'content_copy'}</span>
      </div>
      <p className={`text-sm font-medium truncate ${isPrimary || isAnimated ? 'text-primary font-bold' : 'text-slate-700 dark:text-slate-200'}`}>{value}</p>
    </div>
  );
};

const StatusDropdown = ({ currentStatus, statusColor, onChange }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const statusOptions = ['Agendado', 'Em Atendimento', 'Consulta/Molde', 'Agendado Entrega', 'Finalizado', 'Cancelado', 'CNS Inválido'];
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

const MultiSelectFilterDropdown = ({ selected, onChange, options, getCount }: any) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleOption = (option: string) => {
    let newSelected = [...selected];
    if (option === 'Todos') {
      newSelected = ['Todos'];
    } else {
      if (newSelected.includes('Todos')) {
        newSelected = [];
      }

      if (newSelected.includes(option)) {
        newSelected = newSelected.filter((s: string) => s !== option);
      } else {
        newSelected.push(option);
      }

      if (newSelected.length === 0) {
        newSelected = ['Todos'];
      }
    }
    onChange(newSelected);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(['Todos']);
    setIsOpen(false);
  }

  const getLabel = () => {
    if (selected.includes('Todos')) return 'Todos os Status';
    if (selected.length === 1) return selected[0];
    return `${selected.length} Selecionados`;
  };

  return (
    <div className="relative w-full min-w-[200px]">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full bg-white dark:bg-surface-dark border ${selected.includes('Todos') ? 'border-slate-200 dark:border-slate-800' : 'border-primary text-primary'} text-slate-600 dark:text-slate-400 rounded-full pl-4 pr-10 py-2 text-sm font-semibold transition-all hover:border-slate-300 dark:hover:border-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 text-left truncate flex items-center justify-between`}
      >
        <span className="truncate">{getLabel()}</span>
        <span className="material-symbols-outlined text-[20px] absolute right-3 text-slate-400">filter_list</span>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-30 overflow-hidden animate-fade-in flex flex-col">
            <div className="p-2 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
              <span className="text-xs font-bold text-slate-500 uppercase px-2">Filtrar por Status</span>
              {!selected.includes('Todos') && (
                <button onClick={handleClear} className="text-xs font-bold text-primary hover:text-primary-dark px-2">
                  Limpar
                </button>
              )}
            </div>
            <div className="max-h-[300px] overflow-y-auto p-2 space-y-1">
              {options.map((option: string) => (
                <button
                  key={option}
                  onClick={() => toggleOption(option)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${selected.includes(option)
                    ? 'bg-primary/10 text-primary font-bold'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                >
                  <span>{option}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded-full">
                      {getCount(option === 'Todos' ? 'Todos' : option)}
                    </span>
                    {selected.includes(option) && <span className="material-symbols-outlined text-[18px]">check</span>}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const ProfessionalDetailsModal = ({ professional, onClose }: any) => {
  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white dark:bg-surface-dark w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-700 animate-fade-in" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <span className="material-symbols-outlined">badge</span>
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight text-slate-900 dark:text-white">Dados Profissional</h3>
              <p className="text-xs text-slate-500">Clique para copiar</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="space-y-3">
          <DetailField label="Nome Completo" value={professional.nome} isPrimary />
          <DetailField label="Número SUS" value={professional.sus} />
          <DetailField label="CBO" value={professional.cbo || 'N/A'} />

          {professional.establishments && (
            <>
              <div className="h-px bg-slate-100 dark:bg-slate-800 my-2"></div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Vínculo</p>
              <DetailField label="Estabelecimento (Nome)" value={professional.establishments.name} />
              <DetailField label="CNES" value={professional.establishments.cnes} />
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ProcedureList;