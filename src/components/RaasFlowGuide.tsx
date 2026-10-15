import React, { useState } from 'react';

const RaasFlowGuide: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  const steps = [
    {
      num: '1',
      title: 'PASSO 1: VERIFICAÇÃO DA COMPETÊNCIA E CNES',
      desc: 'Confirme se a competência ativa no sistema bate com o mês de produção dos atendimentos. Digite ou confira o código CNES da unidade executante (CAPS).'
    },
    {
      num: '2',
      title: 'PASSO 2: CADASTRO E ADMISSÃO DO PACIENTE',
      desc: 'Informe o CPF/CNS, a Data de Admissão, Nome Completo, Prontuário e a indicação de Situação de Rua (Sim/Não).'
    },
    {
      num: '3',
      title: 'PASSO 3: DADOS CLÍNICOS E VÍNCULO COM A RAPS',
      desc: 'Marque Uso de Álcool/Drogas, selecione Origem do Usuário, Diagnóstico CID-10 Principal, Cobertura ESF (Sim/Não/CNES) e Destino do usuário.'
    },
    {
      num: '4',
      title: 'PASSO 4: DIGITAÇÃO DAS AÇÕES INDIVIDUALIZADAS',
      desc: 'Na grade de produção, clique em "Incluir" e selecione Procedimento (SIGTAP), Data da Ação, Quantidade, CNS e CBO do profissional executante.'
    },
    {
      num: '5',
      title: "PASSO 5: LOCAL DE REALIZAÇÃO (CAMPO OBRIGATÓRIO 'C' OU 'T')",
      desc: "Informe obrigatoriamente a letra 'C' para atendimentos realizados dentro do CAPS ou 'T' para ações realizadas no Território / domicílio."
    },
    {
      num: '6',
      title: 'PASSO 6: VALIDAÇÃO VISUAL (LINHA VERMELHA X LINHA BRANCA/VERDE)',
      desc: 'Se a linha do registro ficar VERMELHA, há pendência crítica (ex: faltou C/T). Apenas registros com status VALIDADO (linha branca/limpa) podem ser exportados ao SIA/SUS.'
    }
  ];

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-900/60 dark:to-slate-800/60 border border-blue-200/80 dark:border-blue-900/50 rounded-2xl p-4 shadow-sm transition-all mb-6">
      <div 
        className="flex items-center justify-between cursor-pointer select-none"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md">
            <span className="material-symbols-outlined text-[22px]">menu_book</span>
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
              Guia Prático Oficial: Fluxo de Digitação do RAAS (SIA/SUS)
              <span className="text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-bold px-2 py-0.5 rounded-full uppercase">
                Manual Técnico
              </span>
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Passo a passo com as 6 regras obrigatórias de conferência e digitação
            </p>
          </div>
        </div>
        <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-transform">
          <span className={`material-symbols-outlined transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
            expand_more
          </span>
        </button>
      </div>

      {isOpen && (
        <div className="mt-4 pt-4 border-t border-blue-200/60 dark:border-slate-700/60 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 animate-fade-in">
          {steps.map(step => (
            <div key={step.num} className="bg-white dark:bg-surface-dark p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-slate-900 text-white dark:bg-primary flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                {step.num}
              </div>
              <div>
                <h5 className="text-xs font-bold text-slate-800 dark:text-white leading-tight mb-1">
                  {step.title}
                </h5>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                  {step.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RaasFlowGuide;
