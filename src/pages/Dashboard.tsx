
import React, { useState } from 'react';
import type { UserProfile } from '../types';
import { usePermissions } from '../hooks/usePermissions';
import { useDashboardStats } from '../hooks/useDashboardStats';
import ErrorBoundary from '../components/ErrorBoundary';
import { SimpleBarChart } from '../components/SimpleCharts';

interface DashboardProps {
  onNewBpai: () => void;
  onNewBpac: () => void;
  userProfile: UserProfile | null;
}

const DashboardContent: React.FC<DashboardProps> = ({ onNewBpai, onNewBpac, userProfile }) => {
  const { hasPermission } = usePermissions(userProfile);
  
  // State for filters
  const currentYear = new Date().getFullYear().toString();
  const currentMonth = (new Date().getMonth() + 1).toString();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [filterType, setFilterType] = useState<'month' | 'year'>('month');
  const [activeTab, setActiveTab] = useState<'BPA-I' | 'BPA-C'>('BPA-I');

  // Fetch real data
  const stats = useDashboardStats(selectedMonth, selectedYear, filterType);

  // Years option (current year + previous 4)
  const years = Array.from({ length: 5 }, (_, i) => (parseInt(currentYear) - i).toString());
  
  const months = [
    { value: '1', label: 'Janeiro' },
    { value: '2', label: 'Fevereiro' },
    { value: '3', label: 'Março' },
    { value: '4', label: 'Abril' },
    { value: '5', label: 'Maio' },
    { value: '6', label: 'Junho' },
    { value: '7', label: 'Julho' },
    { value: '8', label: 'Agosto' },
    { value: '9', label: 'Setembro' },
    { value: '10', label: 'Outubro' },
    { value: '11', label: 'Novembro' },
    { value: '12', label: 'Dezembro' },
  ];

  if (stats.error) {
    return (
        <div className="p-8 text-center">
            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-xl inline-block">
                <span className="material-symbols-outlined text-3xl mb-2">error</span>
                <p className="font-bold">Erro ao carregar dados</p>
                <p className="text-sm opacity-80">{stats.error}</p>
                <p className="text-xs mt-2 opacity-60">Verifique se as views SQL foram criadas no banco de dados.</p>
            </div>
        </div>
    );
  }

  // Verificar se há dados antes de renderizar gráficos
  const hasBpaiData = stats.bpaiProcedures.length > 0 || stats.bpaiProfessionals.length > 0;
  const hasBpacData = stats.bpacUnits.length > 0 || stats.bpacProcedures.length > 0;

  if (stats.loading && !stats.bpaiStatus) {
      return (
        <div className="flex items-center justify-center h-full min-h-[400px]">
           <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      );
  }

  // Colors for charts
  const COLORS = ['#137FEC', '#7C3AED', '#10B981', '#F59E0B', '#EF4444', '#6366F1'];

  return (
    <div className="p-4 space-y-8 animate-fade-in max-w-7xl mx-auto w-full">
      
      {/* Header & Filters */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Dashboard Geral</h1>
           <p className="text-sm text-slate-500 dark:text-slate-400">Visão geral da produção e desempenho</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
            {/* Context Switcher */}
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                <button 
                    onClick={() => setActiveTab('BPA-I')}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${activeTab === 'BPA-I' ? 'bg-white dark:bg-slate-700 shadow-sm text-primary' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
                >
                    BPA-I Digital
                </button>
                <button 
                    onClick={() => setActiveTab('BPA-C')}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${activeTab === 'BPA-C' ? 'bg-white dark:bg-slate-700 shadow-sm text-accent-purple' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
                >
                    BPA-C Consolidado
                </button>
            </div>

            {/* Date Filters */}
            <div className="flex gap-2 bg-white dark:bg-slate-800 p-1 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
            <select 
                value={filterType} 
                onChange={(e) => setFilterType(e.target.value as 'month' | 'year')}
                className="bg-transparent text-sm font-medium text-slate-700 dark:text-slate-300 border-none focus:ring-0 cursor-pointer py-1 pl-2 pr-2 outline-none"
            >
                <option value="month">Mensal</option>
                <option value="year">Anual</option>
            </select>
            
            {filterType === 'month' && (
                <>
                <div className="w-px bg-slate-200 dark:bg-slate-700 my-1"></div>
                <select 
                    value={selectedMonth} 
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="bg-transparent text-sm font-medium text-slate-700 dark:text-slate-300 border-none focus:ring-0 cursor-pointer py-1 pl-2 pr-2 outline-none"
                >
                    {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
                </>
            )}
            
            <div className="w-px bg-slate-200 dark:bg-slate-700 my-1"></div>
            <select 
                value={selectedYear} 
                onChange={(e) => setSelectedYear(e.target.value)}
                className="bg-transparent text-sm font-medium text-slate-700 dark:text-slate-300 border-none focus:ring-0 cursor-pointer py-1 pl-2 pr-8 outline-none"
            >
                {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            </div>
        </div>
      </div>

      {activeTab === 'BPA-I' && (
        <div className="space-y-6 animate-fade-in">
            {/* Status Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                <StatusCard 
                    label="Finalizados"  
                    value={stats.bpaiStatus?.finalizados || 0} 
                    icon="check_circle" 
                    color="text-green-600" 
                    bg="bg-green-50 dark:bg-green-900/20"
                    borderColor="border-green-200 dark:border-green-800"
                />
                <StatusCard 
                    label="Pendentes" 
                    value={stats.bpaiStatus?.pendentes || 0} 
                    icon="pending" 
                    color="text-yellow-600" 
                    bg="bg-yellow-50 dark:bg-yellow-900/20"
                    borderColor="border-yellow-200 dark:border-yellow-800"
                />
                <StatusCard 
                    label="Consulta/Molde" 
                    value={stats.bpaiStatus?.consulta_molde || 0} 
                    icon="dentistry" 
                    color="text-blue-600" 
                    bg="bg-blue-50 dark:bg-blue-900/20"
                    borderColor="border-blue-200 dark:border-blue-800"
                />
                <StatusCard 
                    label="Agendado Entrega" 
                    value={stats.bpaiStatus?.agendado_entrega || 0} 
                    icon="event_available" 
                    color="text-purple-600" 
                    bg="bg-purple-50 dark:bg-purple-900/20"
                    borderColor="border-purple-200 dark:border-purple-800"
                />
                <StatusCard 
                    label="Cancelados" 
                    value={stats.bpaiStatus?.cancelados || 0} 
                    icon="cancel" 
                    color="text-red-600" 
                    bg="bg-red-50 dark:bg-red-900/20"
                    borderColor="border-red-200 dark:border-red-800"
                />
                <StatusCard 
                    label="Processado SIA" 
                    value={stats.bpaiStatus?.processado_sia || 0} 
                    icon="verified" 
                    color="text-teal-600" 
                    bg="bg-teal-50 dark:bg-teal-900/20"
                    borderColor="border-teal-200 dark:border-teal-800"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Procedures Chart (Vertical Bars - Hexagonal Style) */}
                <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 min-h-[400px] overflow-x-auto">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6">Procedimentos Realizados</h3>
                    {stats.bpaiProcedures.length > 0 ? (
                        <div style={{ minWidth: '500px' }}>
                            <SimpleBarChart 
                                data={stats.bpaiProcedures} 
                                dataKey="total" 
                                labelKey="procedure_name" 
                                color="#137FEC" 
                            />
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-[300px] text-slate-400">
                            <span className="material-symbols-outlined text-4xl mb-2">bar_chart</span>
                            <p>Nenhum procedimento registrado.</p>
                        </div>
                    )}
                </div>

                {/* Professionals Chart (Comparison) */}
                <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 min-h-[400px] overflow-x-auto">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6">Produção por Profissional</h3>
                    {stats.bpaiProfessionals.length > 0 ? (
                        <div style={{ minWidth: '500px' }}>
                             <SimpleBarChart 
                                data={stats.bpaiProfessionals} 
                                dataKey="total" 
                                labelKey="professional_name" 
                                color="#7C3AED" 
                                layout="vertical"
                            />
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-[300px] text-slate-400">
                            <span className="material-symbols-outlined text-4xl mb-2">person_off</span>
                            <p>Nenhum dado de profissional.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}

      {activeTab === 'BPA-C' && (
        <div className="space-y-6 animate-fade-in">
            {/* BPA-C Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* By Unit */}
                <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-x-auto">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6">Enviados por Unidade</h3>
                    <div style={{ minWidth: '500px' }}>
                        <SimpleBarChart 
                            data={stats.bpacUnits} 
                            dataKey="total" 
                            labelKey="unit_name" 
                            color="#137FEC" 
                        />
                    </div>
                </div>

                {/* By Professional (Horizontal) */}
                <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-x-auto">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6">Produção por Profissional (BPA-C)</h3>
                    {stats.bpacProfessionals.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-[300px] text-slate-400">
                            <span className="material-symbols-outlined text-4xl mb-2">person_off</span>
                            <p>Nenhum dado vinculado a profissionais neste período.</p>
                        </div>
                    ) : (
                        <div style={{ minWidth: '500px' }}>
                            <SimpleBarChart 
                                data={stats.bpacProfessionals} 
                                dataKey="total" 
                                labelKey="professional_name" 
                                color="#7C3AED" 
                                layout="vertical"
                            />
                        </div>
                    )}
                </div>

                {/* By Procedure (Horizontal) */}
                <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 lg:col-span-2 overflow-x-auto">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6">Quantitativo por Procedimento (BPA-C)</h3>
                    <div style={{ minWidth: '600px' }}>
                        <SimpleBarChart 
                            data={stats.bpacProcedures} 
                            dataKey="total" 
                            labelKey="procedure_name" 
                            color="#10B981" 
                            layout="vertical"
                        />
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* Floating Action Button (Only for BPA-I tab to keep context clean, or both if preferred) */}
      {(userProfile?.role === 'admin' || hasPermission('create_bpai')) && activeTab === 'BPA-I' && (
        <button 
          onClick={onNewBpai}
          className="fixed bottom-8 right-8 z-40 flex items-center justify-center w-14 h-14 bg-primary text-white rounded-full shadow-lg shadow-primary/40 hover:bg-primary-dark transition-all duration-300 hover:scale-110 active:scale-95 group"
          title="Novo BPA-I"
        >
          <span className="material-symbols-outlined text-[28px] group-hover:rotate-90 transition-transform">add</span>
        </button>
      )}
      
      {(userProfile?.role === 'admin' || hasPermission('create_bpac')) && activeTab === 'BPA-C' && (
        <button 
          onClick={onNewBpac}
          className="fixed bottom-8 right-8 z-40 flex items-center justify-center w-14 h-14 bg-accent-purple text-white rounded-full shadow-lg shadow-purple-500/40 hover:bg-purple-700 transition-all duration-300 hover:scale-110 active:scale-95 group"
          title="Novo BPA-C"
        >
          <span className="material-symbols-outlined text-[28px]">post_add</span>
        </button>
      )}

    </div>
  );
};

// Error Boundary Wrapper
const Dashboard: React.FC<DashboardProps> = (props) => {
  return (
    <ErrorBoundary>
      <DashboardContent {...props} />
    </ErrorBoundary>
  );
};

// Sub-components
const StatusCard = ({ label, value, icon, color, bg, borderColor }: any) => (
    <div className={`p-4 rounded-2xl border ${borderColor} ${bg} flex flex-col items-center justify-center text-center transition-transform hover:scale-105`}>
        <span className={`material-symbols-outlined text-[28px] mb-2 ${color}`}>{icon}</span>
        <h3 className={`text-2xl font-black ${color}`}>{value}</h3>
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mt-1">{label}</p>
    </div>
);

export default Dashboard;
