import React, { useState } from 'react';
import { RaasRecord, RaasActionItem } from '../types/raas';
import { toUiDate } from '../services/raasService';

interface RaasCardProps {
  record: RaasRecord;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onDuplicate: (record: RaasRecord) => void;
  onToggleStatus?: (id: string, newStatus: string) => void;
}

const DetailCopyField: React.FC<{
  label: string;
  value?: string | number | boolean;
  displayValue?: string;
  isPrimary?: boolean;
  isWarning?: boolean;
}> = ({ label, value, displayValue, isPrimary, isWarning }) => {
  const [copied, setCopied] = useState(false);

  const rawVal = displayValue !== undefined ? displayValue : String(value ?? '');
  const showText = rawVal || 'N/A';

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!rawVal || rawVal === 'N/A') return;
    
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(rawVal);
    } else {
      const ta = document.createElement('textarea');
      ta.value = rawVal;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
  };

  return (
    <div
      onClick={handleCopy}
      className={`p-3 rounded-xl border cursor-pointer transition-all relative group select-none ${
        copied
          ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-800 ring-2 ring-green-500/40'
          : isWarning
          ? 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800 hover:bg-amber-100/50'
          : 'bg-white dark:bg-surface-dark border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/80 shadow-xs'
      }`}
      title="Clique para copiar"
    >
      <div className="flex justify-between items-start mb-0.5">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          {label}
        </p>
        <span
          className={`material-symbols-outlined text-[15px] transition-opacity ${
            copied
              ? 'text-green-600 dark:text-green-400 opacity-100'
              : 'text-slate-300 dark:text-slate-600 opacity-0 group-hover:opacity-100'
          }`}
        >
          {copied ? 'check' : 'content_copy'}
        </span>
      </div>
      <p
        className={`text-xs sm:text-sm font-semibold truncate ${
          copied
            ? 'text-green-700 dark:text-green-300 font-bold'
            : isPrimary
            ? 'text-primary font-bold'
            : 'text-slate-800 dark:text-slate-200'
        }`}
      >
        {showText}
      </p>
    </div>
  );
};

const RaasCard: React.FC<RaasCardProps> = ({
  record,
  onEdit,
  onDelete,
  onDuplicate,
  onToggleStatus
}) => {
  const [expanded, setExpanded] = useState(false);
  const [copiedActionId, setCopiedActionId] = useState<string | null>(null);

  // Check if any action in this record has critical errors (like missing 'C' or 'T')
  const hasErrors = record.actions.some(
    a => !a.local || (a.local !== 'C' && a.local !== 'T') || a.status === 'ERRO'
  );

  const totalQuantity = record.actions.reduce((acc, curr) => acc + (curr.quantity || 1), 0);
  const formattedBirthDate = toUiDate(record.birth_date);
  const formattedGender = record.gender ? record.gender.charAt(0).toUpperCase() : 'M';
  const formattedAdmissionDate = toUiDate(record.admission_date);

  const copyActionLine = (action: RaasActionItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const lineText = `PROC: ${action.procedure_code} | DATA: ${action.action_date} | QTD: ${action.quantity} | CNS: ${action.professional_cns} | CBO: ${action.professional_cbo} | LOCAL: ${action.local || '[FALTOU C/T]'}`;
    navigator.clipboard?.writeText(lineText);
    setCopiedActionId(action.id);
    setTimeout(() => setCopiedActionId(null), 2500);
  };

  const copyCell = (val: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!val) return;
    navigator.clipboard?.writeText(val);
  };

  return (
    <div className={`rounded-2xl border transition-all overflow-hidden ${
      hasErrors
        ? 'border-red-200 dark:border-red-900/60 bg-white dark:bg-surface-dark shadow-sm hover:shadow-md'
        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-surface-dark shadow-sm hover:shadow-md'
    }`}>
      {/* CARD HEADER (Clickable to expand/collapse) */}
      <div 
        onClick={() => setExpanded(!expanded)}
        className="p-4 sm:p-5 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 select-none hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
      >
        <div className="flex items-start sm:items-center gap-3.5 min-w-0">
          {/* Avatar Icon */}
          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
            hasErrors 
              ? 'bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-400' 
              : 'bg-indigo-100 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400'
          }`}>
            <span className="material-symbols-outlined text-[24px]">
              {hasErrors ? 'error' : 'psychology'}
            </span>
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-white truncate">
                {record.patient_name}
              </h3>
              
              {/* Badge Competência */}
              <span className="text-[10px] bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 font-mono font-bold px-2.5 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
                {record.competence}
              </span>

              {/* Status Badge */}
              {hasErrors ? (
                <span className="text-[10px] bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 font-bold px-2 py-0.5 rounded-full border border-red-200 dark:border-red-800 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                  PENDÊNCIA C/T
                </span>
              ) : (
                <span className="text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  VALIDADO
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1 font-mono">
                <span className="material-symbols-outlined text-[14px]">id_card</span>
                CNS: {record.patient_cns}
              </span>
              <span>•</span>
              <span className="font-mono">Pront: {record.record_number || 'S/N'}</span>
              <span>•</span>
              <span className="truncate">CNES: {record.establishment_cnes} ({record.establishment_name || 'CAPS'})</span>
              <span>•</span>
              <span className="font-semibold text-primary">
                {record.actions.length} {record.actions.length === 1 ? 'Ação' : 'Ações'} ({totalQuantity} qtd)
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5 self-end md:self-center shrink-0" onClick={e => e.stopPropagation()}>
          <button
            onClick={() => onEdit(record.id)}
            className="p-2 text-slate-500 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            title="Editar Formulário RAAS"
          >
            <span className="material-symbols-outlined text-[18px]">edit</span>
          </button>

          <button
            onClick={() => onDuplicate(record)}
            className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            title="Duplicar para Nova Competência"
          >
            <span className="material-symbols-outlined text-[18px]">file_copy</span>
          </button>

          <button
            onClick={() => onDelete(record.id)}
            className="p-2 text-slate-500 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            title="Excluir Registro"
          >
            <span className="material-symbols-outlined text-[18px]">delete</span>
          </button>

          <button
            onClick={() => setExpanded(!expanded)}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl transition-transform"
            title={expanded ? 'Recolher' : 'Expandir'}
          >
            <span className={`material-symbols-outlined text-[20px] transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}>
              expand_more
            </span>
          </button>
        </div>
      </div>

      {/* EXPANDED CONTENT (Official SIA/SUS Psychosocial Structure) */}
      {expanded && (
        <div className="border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-background-dark/40 p-4 sm:p-6 space-y-6 animate-fade-in">
          
          {/* BLOCO 1: IDENTIFICAÇÃO DO USUÁRIO & ADMISSÃO */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center">1</span>
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                Identificação do Usuário & Admissão
              </h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5">
              <DetailCopyField label="1. CNES Estabelecimento" value={record.establishment_cnes} isPrimary={true} />
              <DetailCopyField label="2. CPF / CNS do Paciente" value={record.patient_cns} displayValue={record.patient_cns} isPrimary={true} />
              <DetailCopyField label="3. Data de Admissão" value={formattedAdmissionDate} displayValue={formattedAdmissionDate || 'N/A'} />
              <DetailCopyField label="4. Nº do Prontuário" value={record.record_number || 'N/A'} displayValue={record.record_number || 'N/A'} />
              <DetailCopyField label="5. Data de Nascimento" value={formattedBirthDate} displayValue={formattedBirthDate || 'N/A'} />
              <DetailCopyField label="Sexo" value={formattedGender} displayValue={formattedGender} />
              <DetailCopyField label="6. Nome do Paciente" value={record.patient_name} />
              <DetailCopyField label="7. Nacionalidade" value={record.nationality || 'Brasileira'} />
              <DetailCopyField label="8. Situação de Rua?" value={record.street_situation ? 'SIM' : 'NÃO'} isWarning={record.street_situation} />
            </div>
          </div>

          {/* BLOCO 2: INFORMAÇÕES CLÍNICAS, ORIGEM E COBERTURA DA REDE */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center">2</span>
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                Informações Clínicas, Origem e Cobertura da Rede
              </h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
              <DetailCopyField 
                label="9. Usuário de Álcool/Drogas?" 
                value={record.substance_user ? 'SIM' : 'NÃO'} 
                isWarning={record.substance_user} 
              />
              <DetailCopyField 
                label="10. Origem do Usuário" 
                value={record.origin_code || '02 - Atenção Básica / ESF'} 
              />
              <DetailCopyField 
                label="11. CID-10 Principal" 
                value={`${record.cid_primary} - ${record.cid_primary_desc || ''}`} 
                displayValue={record.cid_primary}
                isPrimary={true} 
              />
              <DetailCopyField 
                label="CID-10 Secundário (Causas Ass.)" 
                value={record.cid_secondary ? `${record.cid_secondary} - ${record.cid_secondary_desc || ''}` : 'Não informado'} 
                displayValue={record.cid_secondary || 'N/A'}
                isPrimary={!!record.cid_secondary} 
              />
              <DetailCopyField 
                label="12. Cobertura ESF / Equipe" 
                value={record.esf_coverage ? `S (${record.esf_cnes_team || 'Com Cobertura'})` : 'N (Não possui cobertura ESF)'} 
              />
              <DetailCopyField 
                label="13. Destino do Usuário" 
                value={record.destination_code || '1 - Permanência / Acompanhamento'} 
              />
              <DetailCopyField 
                label="14. Status do Registro" 
                value={record.status} 
              />
            </div>
          </div>

          {/* BLOCO 3: GRADE DE DIGITAÇÃO DE PRODUÇÃO (AÇÕES REALIZADAS) */}
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center">3</span>
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                  Dados das Ações Realizadas (Grade de Digitação de Produção)
                </h4>
              </div>
              <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">
                * Clique em qualquer dado para copiar individualmente
              </span>
            </div>

            {record.actions.length === 0 ? (
              <div className="bg-white dark:bg-surface-dark border border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-6 text-center text-slate-400">
                <span className="material-symbols-outlined text-3xl mb-1">playlist_add</span>
                <p className="text-xs font-semibold">Nenhuma ação ambulatorial inserida nesta competência.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-surface-dark shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700 select-none">
                    <tr>
                      <th className="py-2.5 px-3">Procedimento Executado</th>
                      <th className="py-2.5 px-3">Data</th>
                      <th className="py-2.5 px-2 text-center">Qtd</th>
                      <th className="py-2.5 px-3">CNS Profissional</th>
                      <th className="py-2.5 px-3">CBO</th>
                      <th className="py-2.5 px-2 text-center">Local (C/T)</th>
                      <th className="py-2.5 px-3 text-center">Status no Sistema</th>
                      <th className="py-2.5 px-2 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {record.actions.map((act) => {
                      const isItemError = !act.local || (act.local !== 'C' && act.local !== 'T') || act.status === 'ERRO';
                      const isLineCopied = copiedActionId === act.id;

                      return (
                        <tr
                          key={act.id}
                          className={`transition-colors ${
                            isItemError
                              ? 'bg-red-50/80 dark:bg-red-950/30 text-red-900 dark:text-red-200 font-medium'
                              : isLineCopied
                              ? 'bg-green-50/80 dark:bg-green-950/30'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-800 dark:text-slate-200'
                          }`}
                        >
                          {/* Procedimento */}
                          <td 
                            className="py-2.5 px-3 cursor-pointer group"
                            onClick={(e) => copyCell(act.procedure_code, e)}
                            title="Clique para copiar código do procedimento"
                          >
                            <span className="font-mono font-bold text-primary group-hover:underline">
                              {act.procedure_code}
                            </span>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-xs">
                              {act.procedure_name || 'Atendimento em CAPS'}
                            </div>
                          </td>

                          {/* Data */}
                          <td 
                            className="py-2.5 px-3 font-mono cursor-pointer hover:text-primary"
                            onClick={(e) => copyCell(act.action_date, e)}
                            title="Clique para copiar data"
                          >
                            {act.action_date}
                          </td>

                          {/* Qtd */}
                          <td 
                            className="py-2.5 px-2 text-center font-bold cursor-pointer hover:text-primary"
                            onClick={(e) => copyCell(String(act.quantity), e)}
                          >
                            {act.quantity}
                          </td>

                          {/* CNS Profissional */}
                          <td 
                            className="py-2.5 px-3 cursor-pointer group"
                            onClick={(e) => copyCell(act.professional_cns, e)}
                            title="Clique para copiar CNS do profissional"
                          >
                            <span className="font-mono font-medium group-hover:text-primary">
                              {act.professional_cns}
                            </span>
                            {act.professional_name && (
                              <div className="text-[10px] text-slate-400 truncate max-w-[140px]">
                                {act.professional_name}
                              </div>
                            )}
                          </td>

                          {/* CBO Profissional */}
                          <td 
                            className="py-2.5 px-3 cursor-pointer group"
                            onClick={(e) => copyCell(act.professional_cbo, e)}
                            title="Clique para copiar CBO"
                          >
                            <span className="font-mono font-semibold group-hover:text-primary">
                              {act.professional_cbo}
                            </span>
                            {act.professional_occupation && (
                              <div className="text-[10px] text-slate-400 truncate max-w-[130px]">
                                {act.professional_occupation}
                              </div>
                            )}
                          </td>

                          {/* Local (C ou T) */}
                          <td 
                            className="py-2.5 px-2 text-center font-bold cursor-pointer"
                            onClick={(e) => copyCell(act.local || '', e)}
                            title="Local de Atendimento ('C' para CAPS, 'T' para Território)"
                          >
                            {act.local === 'C' ? (
                              <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">
                                C
                              </span>
                            ) : act.local === 'T' ? (
                              <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300">
                                T
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded bg-red-500 text-white font-mono animate-bounce" title="Campo Obrigatório!">
                                [ ]
                              </span>
                            )}
                          </td>

                          {/* Status no Sistema */}
                          <td className="py-2.5 px-3 text-center">
                            {isItemError ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-red-100 text-red-800 dark:bg-red-900/60 dark:text-red-300 border border-red-300 dark:border-red-800">
                                <span className="material-symbols-outlined text-[13px]">warning</span>
                                ERRO: Faltou 'C' ou 'T'
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                                <span className="material-symbols-outlined text-[13px]">check_circle</span>
                                VALIDADO (Linha Branca)
                              </span>
                            )}
                          </td>

                          {/* Botão Copiar Linha */}
                          <td className="py-2.5 px-2 text-right">
                            <button
                              onClick={(e) => copyActionLine(act, e)}
                              className={`p-1.5 rounded-lg text-xs font-semibold transition-colors ${
                                isLineCopied
                                  ? 'bg-green-600 text-white'
                                  : 'text-slate-400 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800'
                              }`}
                              title="Copiar linha inteira formatada"
                            >
                              <span className="material-symbols-outlined text-[16px]">
                                {isLineCopied ? 'check' : 'content_copy'}
                              </span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Regra Técnica Callout */}
            <div className="mt-3 bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-xs text-amber-700 dark:text-amber-300 flex items-start gap-2.5">
              <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5 text-amber-600">info</span>
              <div>
                <p className="font-bold">Guia de Validação e Regra Técnica do SIA/SUS:</p>
                <p className="mt-0.5 text-[11px] opacity-90 leading-relaxed">
                  <strong>1. Linha Destacada em Vermelho:</strong> Indica pendência crítica (esquecimento de selecionar 'C' para CAPS ou 'T' para Território). Clique em "Editar" para corrigir.
                  <br />
                  <strong>2. Linha Validada (Fundo Limpo):</strong> Produção auditada e validada com sucesso, liberada para geração e digitação no SIA/SUS.
                </p>
              </div>
            </div>
          </div>

          {/* NOTAS / OBSERVAÇÕES */}
          {record.notes && (
            <div className="bg-slate-100/60 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
              <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-0.5">Observações da Admissão</p>
              <p className="text-xs text-slate-700 dark:text-slate-300">{record.notes}</p>
            </div>
          )}

          {/* BOTÕES DE AÇÃO RODAPÉ DO CARD */}
          <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <button
              onClick={() => onDuplicate(record)}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">content_copy</span>
              Duplicar Paciente p/ Próximo Mês
            </button>
            <button
              onClick={() => onEdit(record.id)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-primary hover:bg-primary-hover text-white transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <span className="material-symbols-outlined text-[16px]">edit</span>
              Editar Formulário Completo
            </button>
          </div>

        </div>
      )}
    </div>
  );
};

export default RaasCard;
