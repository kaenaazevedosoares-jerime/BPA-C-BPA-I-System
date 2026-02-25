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
  const [copiedKeys, setCopiedKeys] = useState<Set<string>>(new Set());
  const copyText = async (key: string, value?: string) => {
    const text = `${value || ''}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKeys(prev => new Set(prev).add(key));
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopiedKeys(prev => new Set(prev).add(key));
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
            <div
              key={row.key}
              onClick={(e) => { e.stopPropagation(); copyText(row.key, row.value); }}
              className={`flex items-center gap-2 text-sm px-3 py-2 rounded transition-all cursor-pointer group/row ${copiedKeys.has(row.key) ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' : 'bg-slate-50 dark:bg-slate-900/40 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
            >
              <span className="text-slate-600 dark:text-slate-400">{row.label}</span>
              <span className={`font-medium ${copiedKeys.has(row.key) ? 'text-green-700 dark:text-green-400' : 'text-slate-700 dark:text-slate-300'} break-all`}>{row.value}</span>
              <div
                className={`ml-auto p-1.5 rounded transition-colors ${copiedKeys.has(row.key) ? 'text-green-600 dark:text-green-400' : 'text-slate-400 group-hover/row:text-primary'}`}
                title={copiedKeys.has(row.key) ? 'Copiado' : 'Clique para copiar'}
              >
                <span className="material-symbols-outlined text-sm">{copiedKeys.has(row.key) ? 'check' : 'content_copy'}</span>
              </div>
            </div>
          ))}
          <div className="mt-3">
            <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Itens</p>
            <div className="space-y-2">
              {items.map((i) => (
                <div key={i.id} className="flex flex-wrap items-center gap-2 text-sm bg-slate-50 dark:bg-slate-900/40 px-3 py-2 rounded w-full">
                  <div
                    onClick={(e) => { e.stopPropagation(); copyText(`${i.id}-proc`, i.procedure_info); }}
                    className={`flex items-center gap-2 px-2 py-1 rounded transition-all cursor-pointer group/item ${copiedKeys.has(`${i.id}-proc`) ? 'bg-green-100/50 dark:bg-green-900/30' : 'hover:bg-slate-200 dark:hover:bg-slate-800'}`}
                  >
                    <span className="text-slate-600 dark:text-slate-400">Procedimento:</span>
                    <span className={`font-medium ${copiedKeys.has(`${i.id}-proc`) ? 'text-green-700 dark:text-green-400' : 'text-slate-700 dark:text-slate-300'}`}>{i.procedure_info}</span>
                    <div className={`p-1 rounded transition-colors ${copiedKeys.has(`${i.id}-proc`) ? 'text-green-600 dark:text-green-400' : 'text-slate-400 group-hover/item:text-primary'}`}>
                      <span className="material-symbols-outlined text-sm">{copiedKeys.has(`${i.id}-proc`) ? 'check' : 'content_copy'}</span>
                    </div>
                  </div>

                  <div
                    onClick={(e) => { e.stopPropagation(); copyText(`${i.id}-cbo`, i.cbo_info); }}
                    className={`flex items-center gap-2 px-2 py-1 rounded transition-all cursor-pointer group/item ${copiedKeys.has(`${i.id}-cbo`) ? 'bg-green-100/50 dark:bg-green-900/30' : 'hover:bg-slate-200 dark:hover:bg-slate-800'}`}
                  >
                    <span className="text-slate-600 dark:text-slate-400">CBO:</span>
                    <span className={`font-medium ${copiedKeys.has(`${i.id}-cbo`) ? 'text-green-700 dark:text-green-400' : 'text-slate-700 dark:text-slate-300'}`}>{i.cbo_info}</span>
                    <div className={`p-1 rounded transition-colors ${copiedKeys.has(`${i.id}-cbo`) ? 'text-green-600 dark:text-green-400' : 'text-slate-400 group-hover/item:text-primary'}`}>
                      <span className="material-symbols-outlined text-sm">{copiedKeys.has(`${i.id}-cbo`) ? 'check' : 'content_copy'}</span>
                    </div>
                  </div>

                  <div
                    onClick={(e) => { e.stopPropagation(); copyText(`${i.id}-qty`, String(i.quantity)); }}
                    className={`flex items-center gap-2 px-2 py-1 rounded transition-all cursor-pointer group/item ${copiedKeys.has(`${i.id}-qty`) ? 'bg-green-100/50 dark:bg-green-900/30' : 'hover:bg-slate-200 dark:hover:bg-slate-800'}`}
                  >
                    <span className="text-slate-600 dark:text-slate-400">Qtd:</span>
                    <span className={`font-medium ${copiedKeys.has(`${i.id}-qty`) ? 'text-green-700 dark:text-green-400' : 'text-slate-700 dark:text-slate-300'}`}>{i.quantity}</span>
                    <div className={`p-1 rounded transition-colors ${copiedKeys.has(`${i.id}-qty`) ? 'text-green-600 dark:text-green-400' : 'text-slate-400 group-hover/item:text-primary'}`}>
                      <span className="material-symbols-outlined text-sm">{copiedKeys.has(`${i.id}-qty`) ? 'check' : 'content_copy'}</span>
                    </div>
                  </div>
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

