import React, { useState, useEffect, useMemo } from 'react';
import { RaasRecord } from '../types/raas';
import { fetchRaasRecords, saveRaasRecord, deleteRaasRecord } from '../services/raasService';
import RaasCard from '../components/RaasCard';
import RaasFormModal from '../components/RaasFormModal';
import RaasFlowGuide from '../components/RaasFlowGuide';

interface RaasPageProps {
  onCancel?: () => void;
}

const RaasPage: React.FC<RaasPageProps> = () => {
  const [records, setRecords] = useState<RaasRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCompetence, setSelectedCompetence] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'valid' | 'error' | 'finalized'>('all');

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<RaasRecord | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchRaasRecords();
      setRecords(data);
    } catch (err) {
      console.error('Erro ao carregar dados do RAAS:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Lista única de competências presentes nos registros
  const availableCompetences = useMemo(() => {
    const set = new Set(records.map(r => r.competence).filter(Boolean));
    if (set.size === 0) return ['Março / 2026'];
    return Array.from(set);
  }, [records]);

  // Estatísticas / KPIs
  const stats = useMemo(() => {
    const totalPatients = records.length;
    const totalActions = records.reduce((acc, r) => acc + r.actions.reduce((a, act) => a + (act.quantity || 1), 0), 0);
    
    let errorRecordsCount = 0;
    records.forEach(r => {
      const hasErr = r.actions.some(a => !a.local || (a.local !== 'C' && a.local !== 'T') || a.status === 'ERRO');
      if (hasErr) errorRecordsCount++;
    });

    const validRecordsCount = totalPatients - errorRecordsCount;

    return {
      totalPatients,
      totalActions,
      validRecordsCount,
      errorRecordsCount
    };
  }, [records]);

  // Registros filtrados
  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      // Filtro de termo
      const term = searchTerm.toLowerCase();
      const matchesSearch = !term ||
        r.patient_name.toLowerCase().includes(term) ||
        r.patient_cns.includes(term) ||
        (r.record_number && r.record_number.toLowerCase().includes(term)) ||
        (r.cid_primary && r.cid_primary.toLowerCase().includes(term)) ||
        (r.cid_secondary && r.cid_secondary.toLowerCase().includes(term)) ||
        r.establishment_cnes.includes(term);

      // Filtro de competência
      const matchesCompetence = !selectedCompetence || r.competence === selectedCompetence;

      // Filtro de status
      const hasErrors = r.actions.some(a => !a.local || (a.local !== 'C' && a.local !== 'T') || a.status === 'ERRO');
      let matchesStatus = true;
      if (statusFilter === 'valid') matchesStatus = !hasErrors;
      if (statusFilter === 'error') matchesStatus = hasErrors;
      if (statusFilter === 'finalized') matchesStatus = r.status === 'Finalizado';

      return matchesSearch && matchesCompetence && matchesStatus;
    });
  }, [records, searchTerm, selectedCompetence, statusFilter]);

  // Ações de CRUD
  const handleOpenNew = () => {
    setEditingRecord(null);
    setIsModalOpen(true);
  };

  const handleEdit = (id: string) => {
    const found = records.find(r => r.id === id);
    if (found) {
      setEditingRecord(found);
      setIsModalOpen(true);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este registro do RAAS?')) return;
    await deleteRaasRecord(id);
    setRecords(prev => prev.filter(r => r.id !== id));
  };

  const handleDuplicate = async (record: RaasRecord) => {
    // Duplicar registro para outra competência
    const nextCompetence = prompt('Informe a nova competência para duplicação (ex: Abril / 2026):', 'Abril / 2026');
    if (!nextCompetence) return;

    const duplicated = await saveRaasRecord({
      ...record,
      id: undefined,
      competence: nextCompetence,
      actions: record.actions.map(a => ({
        ...a,
        id: undefined as any
      }))
    });

    setRecords(prev => [duplicated, ...prev]);
  };

  const handleSaveModal = async (recordData: Omit<RaasRecord, 'id'> & { id?: string }) => {
    try {
      const saved = await saveRaasRecord(recordData);
      setRecords(prev => {
        const idx = prev.findIndex(r => r.id === saved.id);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = saved;
          return updated;
        }
        return [saved, ...prev];
      });
      setIsModalOpen(false);
      setEditingRecord(null);
    } catch (err: any) {
      console.error('Erro ao salvar registro:', err);
      alert(`Erro ao salvar registro RAAS: ${err?.message || 'Falha na comunicação com o banco de dados.'}`);
    }
  };

  const handleExportTxt = () => {
    if (filteredRecords.length === 0) return alert('Nenhum registro para exportar.');
    
    let content = `REGISTRO DAS AÇÕES AMBULATORIAIS DE SAÚDE (RAAS PSICOSSOCIAL) - SIA/SUS\n`;
    content += `GERADO EM: ${new Date().toLocaleString('pt-BR')}\n`;
    content += `TOTAL DE REGISTROS: ${filteredRecords.length}\n`;
    content += `--------------------------------------------------------------------------------\n\n`;

    filteredRecords.forEach((r, idx) => {
      content += `[REGISTRO #${idx + 1}] COMPETÊNCIA: ${r.competence} | CNES: ${r.establishment_cnes} - ${r.establishment_name}\n`;
      content += `PACIENTE: ${r.patient_name} | CNS: ${r.patient_cns} | PRONTUÁRIO: ${r.record_number || 'S/N'}\n`;
      content += `ADMISSÃO: ${r.admission_date} | NASC: ${r.birth_date} | SEXO: ${r.gender} | SIT. RUA: ${r.street_situation ? 'SIM' : 'NÃO'}\n`;
      content += `ÁLCOOL/DROGAS: ${r.substance_user ? 'SIM' : 'NÃO'} | CID-10: ${r.cid_primary} (${r.cid_primary_desc})\n`;
      content += `ORIGEM: ${r.origin_code} | DESTINO: ${r.destination_code}\n`;
      content += `AÇÕES EXECUTADAS (${r.actions.length}):\n`;
      r.actions.forEach(a => {
        content += `  - DATA: ${a.action_date} | PROC: ${a.procedure_code} | QTD: ${a.quantity} | CNS PROF: ${a.professional_cns} | CBO: ${a.professional_cbo} | LOCAL: ${a.local || '[FALTOU C/T]'}\n`;
      });
      content += `\n--------------------------------------------------------------------------------\n\n`;
    });

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `RAAS_PSICOSSOCIAL_${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      
      {/* CABEÇALHO DA PÁGINA */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-widest text-primary bg-primary/10 px-2.5 py-0.5 rounded-full">
              Módulo Psicoassistencial
            </span>
            <span className="text-xs font-bold text-slate-400">•</span>
            <span className="text-xs text-slate-500 font-mono">SIA/SUS - PSI</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            RAAS Psicossocial
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Registro Oficial das Ações Ambulatoriais de Saúde em Centros de Atenção Psicossocial (CAPS)
          </p>
        </div>

        {/* BOTÕES DE TOPO */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleExportTxt}
            className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold px-4 py-2.5 rounded-xl transition-all text-xs border border-slate-200 dark:border-slate-700 shadow-xs"
            title="Exportar dados formatados"
          >
            <span className="material-symbols-outlined text-[18px]">file_download</span>
            Exportar TXT
          </button>

          <button
            onClick={handleOpenNew}
            className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white font-bold px-5 py-2.5 rounded-xl transition-all text-xs shadow-md shadow-primary/20 hover:shadow-primary/30"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Novo Registro RAAS
          </button>
        </div>
      </div>

      {/* KPI STATS CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase">Pacientes</span>
            <span className="material-symbols-outlined text-primary text-xl">person</span>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            {stats.totalPatients}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Usuários em acolhimento</p>
        </div>

        <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase">Ações no Mês</span>
            <span className="material-symbols-outlined text-indigo-500 text-xl">fact_check</span>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            {stats.totalActions}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Atendimentos na competência</p>
        </div>

        <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase">Validados</span>
            <span className="material-symbols-outlined text-emerald-500 text-xl">check_circle</span>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
            {stats.validRecordsCount}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Prontos p/ exportação (Linha Branca)</p>
        </div>

        <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase">Pendências</span>
            <span className="material-symbols-outlined text-red-500 text-xl">warning</span>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-red-600 dark:text-red-400">
            {stats.errorRecordsCount}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Faltou informar Local 'C'/'T'</p>
        </div>
      </div>

      {/* GUIA DO FLUXO OFICIAL (PASSO A PASSO TÉCNICO) */}
      <RaasFlowGuide />

      {/* BARRA DE FILTROS & BUSCA */}
      <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Campo de Busca */}
        <div className="relative flex-1">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 text-[20px]">
            search
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar por paciente, CNS, prontuário ou CNES..."
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          )}
        </div>

        {/* Filtro Competência */}
        <div className="relative w-full md:w-52">
          <select
            value={selectedCompetence}
            onChange={e => setSelectedCompetence(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 outline-none"
          >
            <option value="">Todas Competências</option>
            {availableCompetences.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Filtro Status Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              statusFilter === 'all'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            Todos ({records.length})
          </button>
          <button
            onClick={() => setStatusFilter('valid')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              statusFilter === 'valid'
                ? 'bg-emerald-500 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            Validados ({stats.validRecordsCount})
          </button>
          <button
            onClick={() => setStatusFilter('error')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              statusFilter === 'error'
                ? 'bg-red-500 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            Pendências ({stats.errorRecordsCount})
          </button>
        </div>
      </div>

      {/* LISTA DE CARDS RETRÁTEIS */}
      {loading ? (
        <div className="p-12 text-center text-slate-400">
          <span className="material-symbols-outlined text-4xl animate-spin text-primary mb-2">
            progress_activity
          </span>
          <p className="text-xs font-medium">Carregando registros do RAAS...</p>
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center shadow-xs">
          <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <span className="material-symbols-outlined text-3xl">folder_off</span>
          </div>
          <h4 className="text-base font-bold text-slate-800 dark:text-white">
            Nenhum registro RAAS encontrado
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            {searchTerm || selectedCompetence || statusFilter !== 'all'
              ? 'Tente ajustar os filtros ou o termo de pesquisa.'
              : 'Comece adicionando o primeiro paciente e suas ações psicoassistenciais.'}
          </p>
          <button
            onClick={handleOpenNew}
            className="mt-4 bg-primary hover:bg-primary-hover text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all inline-flex items-center gap-1.5 shadow-sm"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            Criar Registro RAAS
          </button>
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredRecords.map(record => (
            <RaasCard
              key={record.id}
              record={record}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onDuplicate={handleDuplicate}
            />
          ))}
        </div>
      )}

      {/* MODAL DE CRIAÇÃO / EDIÇÃO */}
      {isModalOpen && (
        <RaasFormModal
          initialData={editingRecord}
          onClose={() => {
            setIsModalOpen(false);
            setEditingRecord(null);
          }}
          onSave={handleSaveModal}
        />
      )}

    </div>
  );
};

export default RaasPage;
