import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabase';

interface PatientImportData {
  cns: string;
  name: string;
  birth_date?: string;
  gender?: string;
  nationality?: string;
  race?: string;
  ethnicity?: string;
  zip_code?: string;
  city?: string;
  neighborhood?: string;
  street_code?: string;
  street_type?: string;
  street?: string;
  number?: string;
  complement?: string;
  phone?: string;
  email?: string;
}

interface ImportError {
  row: number;
  cns: string;
  name: string;
  errors: string[];
}

interface PatientImportModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const EXPECTED_HEADERS = [
  'Cartão SUS', 'Nome Completo', 'Data de Nascimento', 'Sexo', 
  'Nacionalidade', 'Raça', 'Etnia', 'CEP', 'Município', 
  'Bairro', 'Código Logradouro', 'Tipo Logradouro', 'Logradouro', 
  'Número', 'Complemento', 'Telefone', 'E-mail'
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const PatientImportModal: React.FC<PatientImportModalProps> = ({ onClose, onSuccess }) => {
  const [file, setFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [validRecords, setValidRecords] = useState<PatientImportData[]>([]);
  const [invalidRecords, setInvalidRecords] = useState<ImportError[]>([]);
  const [step, setStep] = useState<'upload' | 'preview' | 'result'>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const analyzeFile = async (f: File) => {
    setAnalyzing(true);
    setValidRecords([]);
    setInvalidRecords([]);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        if (jsonData.length === 0) {
          alert('O arquivo está vazio.');
          setAnalyzing(false);
          return;
        }

        const headers = jsonData[0] as string[];
        
        // Basic header validation (check if at least CNS and Name exist)
        const cnsIndex = headers.findIndex(h => h && h.toLowerCase().includes('cartão sus'));
        const nameIndex = headers.findIndex(h => h && h.toLowerCase().includes('nome'));

        if (cnsIndex === -1 || nameIndex === -1) {
          alert('Colunas obrigatórias não encontradas: "Cartão SUS" e "Nome Completo". Baixe o modelo para referência.');
          setAnalyzing(false);
          setFile(null);
          return;
        }

        const valid: PatientImportData[] = [];
        const invalid: ImportError[] = [];

        // Map headers to fields
        const mapHeader = (h: string) => {
          const l = h.toLowerCase();
          if (l.includes('cartão sus')) return 'cns';
          if (l.includes('nome')) return 'name';
          if (l.includes('nascimento')) return 'birth_date';
          if (l.includes('sexo')) return 'gender';
          if (l.includes('nacionalidade')) return 'nationality';
          if (l.includes('raça')) return 'race';
          if (l.includes('etnia')) return 'ethnicity';
          if (l.includes('cep')) return 'zip_code';
          if (l.includes('município')) return 'city';
          if (l.includes('bairro')) return 'neighborhood';
          if (l.includes('código logradouro')) return 'street_code';
          if (l.includes('tipo logradouro')) return 'street_type';
          if (l.includes('logradouro')) return 'street';
          if (l.includes('número')) return 'number';
          if (l.includes('complemento')) return 'complement';
          if (l.includes('telefone')) return 'phone';
          if (l.includes('e-mail') || l.includes('email')) return 'email';
          return null;
        };

        const columnMap = headers.map(mapHeader);

        // Process rows
        for (let i = 1; i < jsonData.length; i++) {
          const row: any = jsonData[i];
          if (!row || row.length === 0) continue;

          const record: any = {};
          const rowErrors: string[] = [];
          let hasData = false;

          columnMap.forEach((field, idx) => {
            if (field) {
              let value = row[idx];
              
              // Sanitization
              if (value !== undefined && value !== null) {
                if (typeof value === 'string') value = value.trim();
                record[field] = value;
                hasData = true;
              }
            }
          });

          if (!hasData) continue;

          // Validation
          if (!record.cns) rowErrors.push('Cartão SUS é obrigatório');
          if (!record.name) rowErrors.push('Nome Completo é obrigatório');
          
          // Basic CNS validation (just length for now, or regex)
          if (record.cns && String(record.cns).replace(/\D/g, '').length < 15) {
             rowErrors.push('Cartão SUS inválido (mínimo 15 dígitos)');
          }

          // Format Date (Excel date to string if needed, or simple string)
          if (record.birth_date && typeof record.birth_date === 'number') {
             // Excel date serial
             const date = new Date(Math.round((record.birth_date - 25569)*86400*1000));
             record.birth_date = date.toISOString().split('T')[0];
          }

          if (rowErrors.length > 0) {
            invalid.push({
              row: i + 1,
              cns: record.cns || '---',
              name: record.name || '---',
              errors: rowErrors
            });
          } else {
            valid.push(record as PatientImportData);
          }
        }

        setValidRecords(valid);
        setInvalidRecords(invalid);
        setStep('preview');
      } catch (err: any) {
        console.error(err);
        alert('Erro ao processar arquivo: ' + err.message);
      } finally {
        setAnalyzing(false);
      }
    };
    reader.readAsBinaryString(f);
  };

  const validateAndSetFile = (f: File) => {
    if (!f) return;
    
    // Check type
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv' // .csv
    ];
    
    if (!validTypes.includes(f.type) && !f.name.endsWith('.csv') && !f.name.endsWith('.xlsx')) {
      alert('Formato inválido. Por favor envie um arquivo Excel (.xlsx) ou CSV.');
      return;
    }

    // Check size
    if (f.size > MAX_FILE_SIZE) {
      alert('O arquivo excede o limite de 10MB.');
      return;
    }

    setFile(f);
    analyzeFile(f);
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    validateAndSetFile(droppedFile);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleImport = async () => {
    if (validRecords.length === 0) return;
    
    setUploading(true);
    let successCount = 0;
    const finalErrors = [...invalidRecords];

    const chunkSize = 50;
    const totalChunks = Math.ceil(validRecords.length / chunkSize);

    for (let i = 0; i < totalChunks; i++) {
      const chunk = validRecords.slice(i * chunkSize, (i + 1) * chunkSize);
      
      const { data, error } = await supabase
        .from('patients')
        .upsert(chunk, { onConflict: 'cns', ignoreDuplicates: false }) // Upsert based on CNS
        .select();

      if (error) {
        console.error('Batch error', error);
        // Add to invalid records
        chunk.forEach((rec, idx) => {
           finalErrors.push({
             row: 0, // Unknown row in batch context easily
             cns: rec.cns,
             name: rec.name,
             errors: [`Erro de banco de dados: ${error.message}`]
           });
        });
      } else {
        successCount += chunk.length;
      }

      setProgress(Math.round(((i + 1) / totalChunks) * 100));
    }

    setInvalidRecords(finalErrors);
    setStep('result');
    setUploading(false);
    if (successCount > 0) onSuccess();
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([EXPECTED_HEADERS]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Modelo");
    XLSX.writeFile(wb, "modelo_importacao_pacientes.xlsx");
  };

  const downloadErrorReport = () => {
    const errorRows = invalidRecords.map(r => ({
      'Linha': r.row,
      'Cartão SUS': r.cns,
      'Nome': r.name,
      'Erros': r.errors.join('; ')
    }));
    const ws = XLSX.utils.json_to_sheet(errorRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Erros");
    XLSX.writeFile(wb, "relatorio_erros_importacao.xlsx");
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white dark:bg-surface-dark w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-fade-in" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400">
              <span className="material-symbols-outlined">upload_file</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Importar Pacientes</h2>
              <p className="text-xs text-slate-500">Excel (.xlsx) ou CSV</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
            <span className="material-symbols-outlined text-slate-400">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {step === 'upload' && (
            <div className="space-y-6">
              <div 
                className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-8 flex flex-col items-center justify-center text-center hover:border-primary transition-colors cursor-pointer bg-slate-50 dark:bg-slate-800/50"
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                  onChange={handleFileSelect}
                />
                <span className="material-symbols-outlined text-4xl text-slate-400 mb-2">cloud_upload</span>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Arraste e solte seu arquivo aqui ou <span className="text-primary underline">clique para selecionar</span>
                </p>
                <p className="text-xs text-slate-400 mt-2">Máximo 10MB</p>
              </div>

              <div className="flex justify-between items-center bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-blue-600 dark:text-blue-400">download</span>
                  <div className="text-sm">
                    <p className="font-bold text-blue-900 dark:text-blue-100">Precisa do modelo?</p>
                    <p className="text-blue-700 dark:text-blue-300 text-xs">Baixe a planilha padrão para preenchimento.</p>
                  </div>
                </div>
                <button 
                  onClick={downloadTemplate}
                  className="px-4 py-2 bg-white dark:bg-blue-800 text-blue-600 dark:text-blue-200 text-xs font-bold rounded-lg shadow-sm hover:shadow-md transition-all"
                >
                  Baixar Modelo
                </button>
              </div>
            </div>
          )}

          {step === 'preview' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">Resumo da Análise</h3>
                <span className="text-xs font-mono bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-slate-500">
                  {file?.name}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-100 dark:border-green-800">
                  <span className="text-2xl font-black text-green-600 dark:text-green-400">{validRecords.length}</span>
                  <p className="text-xs font-bold text-green-800 dark:text-green-300 uppercase tracking-wider">Registros Válidos</p>
                </div>
                <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-100 dark:border-red-800">
                  <span className="text-2xl font-black text-red-600 dark:text-red-400">{invalidRecords.length}</span>
                  <p className="text-xs font-bold text-red-800 dark:text-red-300 uppercase tracking-wider">Erros Encontrados</p>
                </div>
              </div>

              {invalidRecords.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Alguns problemas detectados:</p>
                  <div className="max-h-40 overflow-y-auto bg-slate-50 dark:bg-slate-900 rounded-lg p-3 text-xs space-y-2 border border-slate-200 dark:border-slate-700">
                    {invalidRecords.slice(0, 10).map((err, idx) => (
                      <div key={idx} className="flex gap-2 text-red-600 dark:text-red-400">
                        <span className="font-mono font-bold">L{err.row}:</span>
                        <span>{err.errors.join(', ')}</span>
                      </div>
                    ))}
                    {invalidRecords.length > 10 && (
                      <p className="text-slate-400 italic text-center py-2">... e mais {invalidRecords.length - 10} erros.</p>
                    )}
                  </div>
                  <button 
                    onClick={downloadErrorReport}
                    className="text-xs text-red-600 dark:text-red-400 font-bold hover:underline flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-sm">download</span>
                    Baixar relatório completo de erros
                  </button>
                </div>
              )}
            </div>
          )}

          {step === 'result' && (
            <div className="text-center space-y-4 py-8">
              <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400 mx-auto">
                <span className="material-symbols-outlined text-4xl">check_circle</span>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Importação Concluída!</h3>
                <p className="text-slate-500 dark:text-slate-400">Os dados foram processados com sucesso.</p>
              </div>
              {invalidRecords.length > 0 && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-xl text-sm text-yellow-800 dark:text-yellow-200">
                  <p className="font-bold">Atenção:</p>
                  <p>{invalidRecords.length} registros falharam e não foram importados.</p>
                  <button onClick={downloadErrorReport} className="underline mt-1">Baixar lista de erros</button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 bg-slate-50 dark:bg-surface-dark">
          {step === 'upload' && (
            <button onClick={onClose} className="px-6 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-200 transition-colors">
              Cancelar
            </button>
          )}
          
          {step === 'preview' && (
            <>
              <button 
                onClick={() => { setFile(null); setStep('upload'); }} 
                className="px-6 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-200 transition-colors"
                disabled={uploading}
              >
                Voltar
              </button>
              <button 
                onClick={handleImport} 
                disabled={validRecords.length === 0 || uploading}
                className="px-6 py-3 rounded-xl bg-primary text-white font-bold shadow-lg shadow-primary/30 hover:bg-primary-dark transition-all flex items-center gap-2 disabled:opacity-70"
              >
                {uploading ? (
                  <>
                    <span className="material-symbols-outlined animate-spin">progress_activity</span>
                    Importando {progress}%
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined">cloud_upload</span>
                    Importar {validRecords.length} Pacientes
                  </>
                )}
              </button>
            </>
          )}

          {step === 'result' && (
            <button 
              onClick={onClose} 
              className="px-6 py-3 rounded-xl bg-primary text-white font-bold shadow-lg shadow-primary/30 hover:bg-primary-dark transition-all"
            >
              Concluir
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
