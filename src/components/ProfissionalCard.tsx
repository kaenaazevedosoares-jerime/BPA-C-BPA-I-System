import React, { useState } from 'react';

export interface Profissional {
  id: string;
  sus: string;
  nome: string;
  profissao: string;
  cbo?: string;
  endereco?: string;
  telefone?: string;
  email?: string;
  created_at: string;
}

interface Props {
  profissional: Profissional;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

const ProfissionalCard: React.FC<Props> = ({ profissional, onEdit, onDelete }) => {
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
      profissional.sus,
      profissional.nome,
      profissional.profissao,
      profissional.cbo,
      profissional.endereco,
      profissional.telefone,
      profissional.email,
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
          <h3 className="font-bold text-slate-800 dark:text-white text-lg mb-1">{profissional.nome}</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
            {profissional.profissao}
            {profissional.cbo ? (
              <span className="ml-2 text-xs text-slate-500 dark:text-slate-500">• CBO: {profissional.cbo}</span>
            ) : null}
            <span className="ml-2 text-xs text-slate-500 dark:text-slate-500">
              • Cadastrado em: {new Date(profissional.created_at).toLocaleDateString('pt-BR')}
            </span>
          </p>
        </div>
        <div className="flex gap-1" onClick={stop}>
          <button
            onClick={() => onEdit(profissional.id)}
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
            onClick={() => onDelete(profissional.id)}
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
            { key: 'SUS', label: 'SUS:', value: profissional.sus },
            { key: 'Nome', label: 'Nome:', value: profissional.nome },
            { key: 'Profissão', label: 'Profissão:', value: profissional.profissao },
            { key: 'CBO', label: 'CBO:', value: profissional.cbo },
            { key: 'Endereço', label: 'Endereço:', value: profissional.endereco },
            { key: 'Telefone', label: 'Telefone:', value: profissional.telefone },
            { key: 'Email', label: 'Email:', value: profissional.email },
          ].map((row) => (
            row.value ? (
              <div key={row.key} className="flex items-center gap-2 text-sm bg-slate-50 dark:bg-slate-900/40 px-3 py-2 rounded">
                <span className="text-slate-600 dark:text-slate-400">{row.label}</span>
                <span className="text-slate-700 dark:text-slate-300 break-all">{row.value}</span>
                <button
                  onClick={(e) => { stop(e); copyText(row.key, row.value); }}
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

export default ProfissionalCard;

