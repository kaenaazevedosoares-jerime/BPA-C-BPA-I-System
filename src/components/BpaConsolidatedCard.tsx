import React, { useState } from 'react';

export interface BpaItem {
  id: string;
  procedure_info: string;
  cbo_info: string;
  quantity: number;
}

export interface BpaHeader {
  id: string;
  cnes: string;
  reference_month: string;
  total_quantity: number;
  created_at: string;
}

interface Props {
  header: BpaHeader;
  items: BpaItem[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onReplicate: (id: string) => void;
  establishmentName?: string;
}

const BpaConsolidatedCard: React.FC<Props> = ({ header, items, onEdit, onDelete, onReplicate, establishmentName }) => {
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


  const stop = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <div className="bg-white dark:bg-surface-dark rounded-xl shadow-md hover:shadow-lg transition-all p-6 cursor-pointer" onClick={() => setExpanded(v => !v)}>
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="font-bold text-slate-800 dark:text-white text-lg mb-1">CNES {header.cnes}</h3>
          {establishmentName ? (
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{establishmentName}</p>
          ) : null}
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Mês: {header.reference_month}
            <span className="ml-2 text-xs text-slate-500 dark:text-slate-500">• Total: {header.total_quantity}</span>
          </p>
        </div>
        <div className="flex gap-1" onClick={stop}>
          <button onClick={() => onEdit(header.id)} className="p-2 text-slate-500 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors" title="Editar">
            <span className="material-symbols-outlined text-sm">edit</span>
          </button>
          <button onClick={() => onReplicate(header.id)} className="p-2 text-slate-500 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors" title="Replicar competência">
            <span className="material-symbols-outlined text-sm">file_copy</span>
          </button>
          <button onClick={() => onDelete(header.id)} className="p-2 text-slate-500 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors" title="Excluir">
            <span className="material-symbols-outlined text-sm">delete</span>
          </button>
        </div>
      </div>

      {expanded && (
        <div className="space-y-2">
          {[
            { key: 'CNES', label: 'CNES:', value: header.cnes },
            { key: 'Mês', label: 'Mês de Referência:', value: header.reference_month },
            { key: 'Total', label: 'Total:', value: String(header.total_quantity) },
          ].map(row => (
            <div key={row.key} className="flex items-center gap-2 text-sm bg-slate-50 dark:bg-slate-900/40 px-3 py-2 rounded">
              <span className="text-slate-600 dark:text-slate-400">{row.label}</span>
              <span className="text-slate-700 dark:text-slate-300 break-all">{row.value}</span>
              <button onClick={(e) => { e.stopPropagation(); copyText(row.key, row.value); }} className="ml-auto p-1.5 text-slate-500 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 rounded" title={copiedKey === row.key ? 'Copiado' : 'Copiar'}>
                <span className="material-symbols-outlined text-sm">{copiedKey === row.key ? 'check' : 'content_copy'}</span>
              </button>
            </div>
          ))}
          <div className="mt-3">
            <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Itens</p>
            <div className="space-y-2">
              {items.map((i) => (
                <div key={i.id} className="flex flex-wrap items-center gap-2 text-sm bg-slate-50 dark:bg-slate-900/40 px-3 py-2 rounded w-full">
                  <span className="text-slate-600 dark:text-slate-400">Procedimento:</span>
                  <span className="text-slate-700 dark:text-slate-300">{i.procedure_info}</span>
                  <button onClick={(e) => { e.stopPropagation(); copyText('Procedimento', i.procedure_info); }} className="p-1 text-slate-500 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 rounded" title={copiedKey === 'Procedimento' ? 'Copiado' : 'Copiar procedimento'}>
                    <span className="material-symbols-outlined text-sm">{copiedKey === 'Procedimento' ? 'check' : 'content_copy'}</span>
                  </button>

                  <span className="text-slate-600 dark:text-slate-400 ml-4">CBO:</span>
                  <span className="text-slate-700 dark:text-slate-300">{i.cbo_info}</span>
                  <button onClick={(e) => { e.stopPropagation(); copyText('CBO', i.cbo_info); }} className="p-1 text-slate-500 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 rounded" title={copiedKey === 'CBO' ? 'Copiado' : 'Copiar CBO'}>
                    <span className="material-symbols-outlined text-sm">{copiedKey === 'CBO' ? 'check' : 'content_copy'}</span>
                  </button>

                  <span className="text-slate-600 dark:text-slate-400 ml-4">Qtd:</span>
                  <span className="text-slate-700 dark:text-slate-300">{i.quantity}</span>
                  <button onClick={(e) => { e.stopPropagation(); copyText('Qtd', String(i.quantity)); }} className="p-1 text-slate-500 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 rounded" title={copiedKey === 'Qtd' ? 'Copiado' : 'Copiar quantidade'}>
                    <span className="material-symbols-outlined text-sm">{copiedKey === 'Qtd' ? 'check' : 'content_copy'}</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BpaConsolidatedCard;

