import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabase';

interface ProcedureImportModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

interface ImportPreview {
  cns: string;
  name: string;
  procedure_code: string;
  date_service: string;
  status: string;
  date_delivery?: string | null;
  date_cancellation?: string | null;
  date_scheduling?: string | null;
  sia_processed?: boolean;
  valid: boolean;
  error?: string;
  patient_id?: string;
}

const ProcedureImportModal: React.FC<ProcedureImportModalProps> = ({ onClose, onSuccess }) => {
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<ImportPreview[]>([]);
  const [importing, setImporting] = useState(false);
  const [step, setStep] = useState<'upload' | 'preview'>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper to normalize date string to YYYY-MM-DD for comparison
  const normalizeDate = (isoStr: string) => {
    return isoStr.split('T')[0];
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      processFile(selectedFile);
    }
  };

  const parseExcelDate = (val: any): string | null => {
    if (!val) return null;
    try {
      if (typeof val === 'number') {
        const date = new Date((val - (25567 + 2)) * 86400 * 1000);
        return date.toISOString();
      }
      // String format
      const parts = String(val).split('/');
      if (parts.length === 3) {
         // DD/MM/YYYY
         return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`).toISOString();
      }
      // ISO or other
      const d = new Date(val);
      if (!isNaN(d.getTime())) return d.toISOString();
      return null;
    } catch {
      return null;
    }
  };

  const processFile = async (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

        const processed: ImportPreview[] = [];

        // Fetch all patients and procedures for validation
        const { data: patients } = await supabase.from('patients').select('id, cns, name');
        const { data: procedures } = await supabase.from('procedures_catalog').select('code');
        
        // Fetch existing production records to check for duplicates
        // We fetch fields needed to identify uniqueness: patient_id (via CNS map), procedure_code, date_service
        // Since dataset might be large, we might want to filter, but for now fetching all for client-side check is safest if not huge.
        // Optimization: Filter by CNSs present in the file if possible, but let's do a broad check first or just check during loop if array is small.
        // Better: Fetch all production for the CNSs in the file.
        const uniqueCnsInFile = [...new Set(jsonData.map(row => String(row['CNS_PACIENTE'] || '').trim()).filter(Boolean))];
        
        let existingRecords: any[] = [];
        if (uniqueCnsInFile.length > 0) {
           // Batch fetch? Supabase 'in' limit is usually high enough for typical imports
           const { data: production } = await supabase
             .from('procedure_production')
             .select('patient_id, procedure_code, date_service, status')
             .in('patient_id', patients?.filter(p => uniqueCnsInFile.includes(p.cns)).map(p => p.id) || []);
           existingRecords = production || [];
        }

        const patientMap = new Map(patients?.map(p => [p.cns, p.id]));
        const procedureSet = new Set(procedures?.map(p => p.code));
        
        // Build a set of existing keys: patientId-procCode-dateService(YYYY-MM-DD)
        const existingSet = new Set(existingRecords.map(r => {
           return `${r.patient_id}-${r.procedure_code}-${normalizeDate(r.date_service)}`;
        }));

        const currentBatchKeys = new Set<string>(); // To track duplicates within the file itself

        for (const row of jsonData) {
          const cns = String(row['CNS_PACIENTE'] || '').trim();
          const name = String(row['NOME_PACIENTE'] || '').trim();
          const procCode = String(row['CODIGO_PROCEDIMENTO'] || '').trim();
          const status = String(row['STATUS'] || 'Agendado').trim();
          
          let dateService = parseExcelDate(row['DATA_ATENDIMENTO']);
          // If DATA_CONSULTA_MOLDE exists, use it as dateService (since they map to the same field based on context)
          const dateConsultaMolde = parseExcelDate(row['DATA_CONSULTA_MOLDE']);
          if (!dateService && dateConsultaMolde) dateService = dateConsultaMolde;

          const dateDelivery = parseExcelDate(row['DATA_ENTREGA']);
          const dateCancellation = parseExcelDate(row['DATA_CANCELAMENTO']);
          const dateScheduling = parseExcelDate(row['DATA_AGENDAMENTO']);
          
          const siaProcessedRaw = String(row['PROCESSADO_SIA'] || '').toUpperCase();
          const siaProcessed = siaProcessedRaw === 'SIM' || siaProcessedRaw === 'YES' || siaProcessedRaw === 'TRUE';

          let valid = true;
          let error = '';
          let patientId = undefined;

          // Validation Logic
          if (!cns) {
            valid = false;
            error = 'CNS obrigatório';
          } else {
            patientId = patientMap.get(cns);
            if (!patientId) {
               valid = false;
               error = 'Paciente não encontrado';
            }
          }

          if (!procCode) {
             valid = false;
             error = error ? error + ', Código Proc. obrigatório' : 'Código Proc. obrigatório';
          } else if (!procedureSet.has(procCode)) {
             valid = false;
             error = error ? error + ', Procedimento não cadastrado' : 'Procedimento não cadastrado';
          }

          if (!dateService) {
             // Maybe optional depending on status? Assuming required for now as "Data Atendimento"
             // But if status is "Agendado", maybe not?
             // Let's keep it loose, but warn if missing
          }

          // New Validations based on Status
          if (status === 'Finalizado' && !dateDelivery) {
             // Optional warning or error? Let's make it a soft error (warning) or just allow it but it might be inconsistent.
             // Better to be strict for data integrity.
             // valid = false; 
             // error = error ? error + ', Data Entrega necessária para Finalizado' : 'Data Entrega necessária para Finalizado';
             // Reverting to loose to avoid blocking legacy imports, but let's add logic to fill date_delivery with date_service if missing for Finalized? No, that's dangerous.
          }

          if (status === 'Cancelado' && !dateCancellation) {
             valid = false;
             error = error ? error + ', Data Cancelamento obrigatória' : 'Data Cancelamento obrigatória';
          }

          // Duplicate Check
          if (valid && patientId && procCode && dateService) {
             const key = `${patientId}-${procCode}-${normalizeDate(dateService)}`;
             
             if (existingSet.has(key)) {
                valid = false;
                error = 'Procedimento já cadastrado no sistema';
             } else if (currentBatchKeys.has(key)) {
                valid = false;
                error = 'Duplicado na planilha';
             } else {
                currentBatchKeys.add(key);
             }
          }

          processed.push({
            cns,
            name,
            procedure_code: procCode,
            date_service: dateService || new Date().toISOString(), // Fallback or handle error
            status,
            date_delivery: dateDelivery,
            date_cancellation: dateCancellation,
            date_scheduling: dateScheduling,
            sia_processed: siaProcessed,
            valid,
            error,
            patient_id: patientId
          });
        }

        setPreviewData(processed);
        setStep('preview');

      } catch (error) {
        console.error('Error processing file:', error);
        alert('Erro ao processar arquivo. Verifique o formato.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleImport = async () => {
    const validItems = previewData.filter(i => i.valid);
    if (validItems.length === 0) return;

    setImporting(true);
    try {
      const payload = validItems.map(item => ({
        patient_id: item.patient_id,
        procedure_code: item.procedure_code,
        status: item.status,
        date_service: item.date_service,
        date_delivery: item.date_delivery,
        date_cancellation: item.date_cancellation,
        date_scheduling: item.date_scheduling,
        sia_processed: item.sia_processed,
        created_at: new Date().toISOString()
      }));

      const { error } = await supabase.from('procedure_production').insert(payload);

      if (error) throw error;

      alert(`${validItems.length} procedimentos importados com sucesso!`);
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Import error:', error);
      alert('Erro ao salvar no banco de dados: ' + error.message);
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    // Headers with new fields
    const headers = [['CNS_PACIENTE', 'NOME_PACIENTE', 'CODIGO_PROCEDIMENTO', 'DATA_ATENDIMENTO', 'DATA_CONSULTA_MOLDE', 'STATUS', 'DATA_ENTREGA', 'DATA_CANCELAMENTO', 'DATA_AGENDAMENTO', 'PROCESSADO_SIA']];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(headers);

    // Data Validation for STATUS column (Column E, index 4)
    // The range E2:E1000 will have the dropdown.
    const validStatuses = ["Agendado", "Em Produção", "Consulta/Molde", "Agendado Entrega", "Finalizado", "Cancelado", "Em Atendimento"];
    
    // @ts-ignore
    if (!ws['!dataValidation']) ws['!dataValidation'] = [];
    
    // @ts-ignore
    ws['!dataValidation'].push({
      sqref: "E2:E1000",
      type: "list",
      operator: "equal",
      formula1: `"${validStatuses.join(',')}"`,
      showErrorMessage: true,
      errorTitle: "Status Inválido",
      error: "Por favor selecione um status da lista."
    });

    // Add instructions or sample row
    XLSX.utils.sheet_add_aoa(ws, [[
      '700000000000000', 'João Silva', '0301010072', '01/01/2024 10:00', 'Agendado', '', '', '', 'NÃO'
    ]], { origin: "A2" });

    XLSX.utils.book_append_sheet(wb, ws, 'Modelo Importação');
    XLSX.writeFile(wb, 'modelo_importacao_bpai_v3.xlsx');
  };

  const downloadErrors = () => {
    const invalidItems = previewData.filter(i => !i.valid);
    if (invalidItems.length === 0) return;

    // Map back to original structure + Error column
    const errorData = invalidItems.map(item => ({
       'CNS_PACIENTE': item.cns,
       'NOME_PACIENTE': item.name,
       'CODIGO_PROCEDIMENTO': item.procedure_code,
       'DATA_ATENDIMENTO': item.date_service ? new Date(item.date_service).toLocaleDateString('pt-BR') : '',
       'STATUS': item.status,
       'DATA_ENTREGA': item.date_delivery ? new Date(item.date_delivery).toLocaleDateString('pt-BR') : '',
       'DATA_CANCELAMENTO': item.date_cancellation ? new Date(item.date_cancellation).toLocaleDateString('pt-BR') : '',
       'DATA_AGENDAMENTO': item.date_scheduling ? new Date(item.date_scheduling).toLocaleDateString('pt-BR') : '',
       'PROCESSADO_SIA': item.sia_processed ? 'SIM' : 'NÃO',
       'ERRO': item.error
    }));

    const ws = XLSX.utils.json_to_sheet(errorData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Erros Importação');
    XLSX.writeFile(wb, 'relatorio_erros_importacao.xlsx');
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white dark:bg-surface-dark w-full max-w-4xl rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col max-h-[90vh] animate-fade-in" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="flex justify-between items-center mb-6 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <span className="material-symbols-outlined">upload_file</span>
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight text-slate-900 dark:text-white">Importar Procedimentos</h3>
              <p className="text-xs text-slate-500">Via Planilha Excel (.xlsx)</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {step === 'upload' ? (
            <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-8 bg-slate-50 dark:bg-slate-900/50">
               <span className="material-symbols-outlined text-6xl text-slate-300 mb-4">description</span>
               <p className="text-slate-600 dark:text-slate-400 font-medium mb-6">Arraste sua planilha aqui ou clique para selecionar</p>
               
               <input 
                 type="file" 
                 ref={fileInputRef}
                 onChange={handleFileChange}
                 accept=".xlsx, .xls, .csv"
                 className="hidden"
               />
               
               <div className="flex gap-4">
                 <button 
                   onClick={() => fileInputRef.current?.click()}
                   className="bg-primary hover:bg-primary-dark text-white font-bold py-2.5 px-6 rounded-xl transition-colors shadow-lg shadow-primary/30"
                 >
                   Selecionar Arquivo
                 </button>
                 <button 
                   onClick={downloadTemplate}
                   className="bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold py-2.5 px-6 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-2"
                 >
                   <span className="material-symbols-outlined text-sm">download</span>
                   Baixar Modelo
                 </button>
               </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden">
               <div className="flex justify-between items-center mb-2 px-1">
                 <p className="text-sm font-bold text-slate-500">
                   Pré-visualização ({previewData.filter(i => i.valid).length} válidos de {previewData.length})
                 </p>
                 <button onClick={() => { setStep('upload'); setFile(null); }} className="text-xs text-primary font-bold hover:underline">
                   Trocar Arquivo
                 </button>
               </div>
               
               <div className="flex-1 overflow-auto border border-slate-200 dark:border-slate-700 rounded-xl">
                 <table className="w-full text-left border-collapse">
                   <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0 z-10">
                     <tr>
                       <th className="p-3 text-xs font-bold text-slate-500 uppercase">Status</th>
                       <th className="p-3 text-xs font-bold text-slate-500 uppercase">CNS</th>
                       <th className="p-3 text-xs font-bold text-slate-500 uppercase">Nome (Planilha)</th>
                       <th className="p-3 text-xs font-bold text-slate-500 uppercase">Proc.</th>
                       <th className="p-3 text-xs font-bold text-slate-500 uppercase">Data</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                     {previewData.map((row, idx) => (
                       <tr key={idx} className={row.valid ? 'bg-white dark:bg-surface-dark' : 'bg-red-50 dark:bg-red-900/10'}>
                         <td className="p-3">
                           {row.valid ? (
                             <span className="material-symbols-outlined text-green-500 text-sm">check_circle</span>
                           ) : (
                             <div className="flex items-center gap-1 text-red-500" title={row.error}>
                               <span className="material-symbols-outlined text-sm">error</span>
                               <span className="text-[10px] font-bold max-w-[100px] truncate">{row.error}</span>
                             </div>
                           )}
                         </td>
                         <td className="p-3 text-xs font-mono">{row.cns}</td>
                         <td className="p-3 text-xs truncate max-w-[150px]">{row.name}</td>
                         <td className="p-3 text-xs font-mono">{row.procedure_code}</td>
                         <td className="p-3 text-xs">{new Date(row.date_service).toLocaleDateString()}</td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {step === 'preview' && (
          <div className="mt-6 flex justify-between gap-3 shrink-0">
             {previewData.some(i => !i.valid) && (
               <button 
                 onClick={downloadErrors}
                 className="px-4 py-3 rounded-xl font-bold text-red-500 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors flex items-center gap-2"
               >
                 <span className="material-symbols-outlined">download</span>
                 Baixar Erros
               </button>
             )}
             <div className="flex gap-3 ml-auto">
            <button 
              onClick={onClose}
              className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancelar
            </button>
            <button 
              onClick={handleImport}
              disabled={importing || previewData.filter(i => i.valid).length === 0}
              className="bg-primary hover:bg-primary-dark text-white font-bold py-3 px-8 rounded-xl shadow-lg shadow-primary/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {importing ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
                  Importando...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined">save</span>
                  Confirmar Importação
                </>
              )}
            </button>
            </div>
          </div>
        )}

      </div>
    </div>,
    document.body
  );
};

export default ProcedureImportModal;