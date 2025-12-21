import React, { useState } from 'react';

export interface Establishment {
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
}

interface Props {
  establishment: Establishment;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

const EstablishmentCard: React.FC<Props> = ({ establishment, onEdit, onDelete }) => {
  const [expanded, setExpanded] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyText = async (key: string, value?: string) => {
    const text = `${value || ''}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1500);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1500);
    }
  };

  const copyAll = () => {
    const lines = [
      establishment.cnes,
      establishment.name,
      establishment.social_reason,
      establishment.responsible_tech,
      establishment.zip_code,
      establishment.phone,
      establishment.email,
      establishment.street,
      establishment.neighborhood,
      establishment.state,
    ].filter(Boolean).join('\n');
    copyText('Tudo', lines);
  };

  const stop = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <div
      className="bg-white dark:bg-surface-dark rounded-xl shadow-md hover:shadow-lg transition-all p-6 cursor-pointer"
      onClick={() => setExpanded(v => !v)}
      aria-expanded={expanded}
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="font-bold text-slate-800 dark:text-white text-lg mb-1">{establishment.name}</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
            CNES: {establishment.cnes}
            <span className="ml-2 text-xs text-slate-500 dark:text-slate-500">
              • Cadastrado em: {new Date(establishment.created_at).toLocaleDateString('pt-BR')}
            </span>
          </p>
        </div>
        <div className="flex gap-1" onClick={stop}>
          <button
            onClick={() => onEdit(establishment.id)}
            className="p-2 text-slate-500 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            title="Editar"
          >
            <span className="material-symbols-outlined text-sm">edit</span>
          </button>
          <button
            onClick={copyAll}
            className="p-2 text-slate-500 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            title={copiedKey === 'Tudo' ? 'Copiado' : 'Copiar tudo'}
          >
            <span className="material-symbols-outlined text-sm">{copiedKey === 'Tudo' ? 'check' : 'content_copy'}</span>
          </button>
          <button
            onClick={() => onDelete(establishment.id)}
            className="p-2 text-slate-500 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            title="Excluir"
          >
            <span className="material-symbols-outlined text-sm">delete</span>
          </button>
        </div>
      </div>

      {expanded && (
        <div className="space-y-2">
          {[
            { key: 'CNES', label: 'CNES:', value: establishment.cnes },
            { key: 'Nome', label: 'Nome Fantasia:', value: establishment.name },
            { key: 'Razão Social', label: 'Razão Social:', value: establishment.social_reason },
            { key: 'Responsável Técnico', label: 'Responsável Técnico:', value: establishment.responsible_tech },
            { key: 'CEP', label: 'CEP:', value: establishment.zip_code },
            { key: 'Telefone', label: 'Telefone:', value: establishment.phone },
            { key: 'Email', label: 'Email:', value: establishment.email },
            { key: 'Logradouro', label: 'Logradouro:', value: establishment.street },
            { key: 'Bairro', label: 'Bairro:', value: establishment.neighborhood },
            { key: 'UF', label: 'UF:', value: establishment.state },
          ].map((row) => (
            row.value ? (
              <div key={row.key} className="flex items-center gap-2 text-sm bg-slate-50 dark:bg-slate-900/40 px-3 py-2 rounded">
                <span className="text-slate-600 dark:text-slate-400">{row.label}</span>
                <span className="text-slate-700 dark:text-slate-300 break-all">{row.value}</span>
                <button
                  onClick={(e) => { stop(e); copyText(row.key, row.value as string); }}
                  className="ml-auto p-1.5 text-slate-500 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
                  title={copiedKey === row.key ? 'Copiado' : 'Copiar'}
                >
                  <span className="material-symbols-outlined text-sm">{copiedKey === row.key ? 'check' : 'content_copy'}</span>
                </button>
              </div>
            ) : null
          ))}
        </div>
      )}
    </div>
  );
};

export default EstablishmentCard;

