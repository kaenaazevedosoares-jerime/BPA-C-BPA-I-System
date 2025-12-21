
import React from 'react';
import { ProductionItem, UserProfile } from '../types';
import { usePermissions } from '../hooks/usePermissions';

interface DashboardProps {
  onNewBpai: () => void;
  onNewBpac: () => void;
  userProfile: UserProfile | null;
}

const Dashboard: React.FC<DashboardProps> = ({ onNewBpai, onNewBpac, userProfile }) => {
  const { hasPermission } = usePermissions(userProfile);

  const recentProduction: ProductionItem[] = [
    {
      id: '1',
      patientName: 'Maria Oliveira',
      procedure: 'Prótese Total Mandibular',
      status: 'Em Análise',
      timeLabel: 'Solicitado há 2h',
      icon: 'face_3',
      colorClass: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-900/50'
    },
    {
      id: '2',
      patientName: 'João Santos',
      procedure: 'Ponte Móvel Superior',
      status: 'Concluído',
      timeLabel: 'Finalizado hoje, 14:30',
      icon: 'check_circle',
      colorClass: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 border border-green-200 dark:border-green-900/50'
    },
    {
      id: '3',
      patientName: 'Ana Paula Lima',
      procedure: 'Prótese Parcial Removível',
      status: 'Em Produção',
      timeLabel: 'Iniciado ontem',
      icon: 'precision_manufacturing',
      colorClass: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50'
    }
  ];

  return (
    <div className="p-4 space-y-8 animate-fade-in max-w-7xl mx-auto w-full">
      {/* Metrics */}
      <section>
        <div className="flex justify-between items-end mb-4 px-1">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white tracking-tight">Métricas Mensais</h2>
          <button className="text-sm font-semibold text-primary hover:underline">Ver relatório</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MetricCard 
            label="Próteses Totais" 
            value="154" 
            trend="+12%" 
            icon="dentistry" 
            progress={75} 
            color="primary" 
          />
          <MetricCard 
            label="BPA-I Pendentes" 
            value="32" 
            trend="Atenção" 
            icon="pending_actions" 
            progress={45} 
            color="accent-purple" 
            statusType="warning"
          />
          <MetricCard 
            label="BPA-C Enviados" 
            value="12" 
            trend="90%" 
            icon="send" 
            progress={90} 
            color="accent-teal" 
          />
        </div>
      </section>

      {/* Quick Access */}
      <section>
        <h2 className="text-xl font-bold text-slate-800 dark:text-white tracking-tight mb-4 px-1">Acesso Rápido</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {(userProfile?.role === 'admin' || hasPermission('create_bpai')) && (
            <QuickCard 
              title="Novo BPA-I" 
              subtitle="Individualizado" 
              icon="person_add" 
              image="https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&q=80&w=800"
              onClick={onNewBpai}
            />
          )}
          {(userProfile?.role === 'admin' || hasPermission('create_bpac')) && (
            <QuickCard 
              title="Novo BPA-C" 
              subtitle="Consolidado" 
              icon="bar_chart" 
              image="https://images.unsplash.com/photo-1551288049-bbbda536ad0a?auto=format&fit=crop&q=80&w=800"
              onClick={onNewBpac}
            />
          )}
        </div>
      </section>

      {/* Production List */}
      <section>
        <div className="flex justify-between items-center mb-4 px-1">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white tracking-tight">Produção Recente</h2>
          <button className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
            <span className="material-symbols-outlined text-[20px]">filter_list</span>
          </button>
        </div>
        <div className="bg-surface-light dark:bg-surface-dark rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
          {recentProduction.map(item => (
            <div 
              key={item.id} 
              className="p-5 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
            >
              <div className="w-12 h-12 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-primary shrink-0 border border-slate-100 dark:border-slate-700 shadow-sm">
                <span className={`material-symbols-outlined ${item.status === 'Concluído' ? 'text-green-500' : item.status === 'Em Produção' ? 'text-primary' : 'text-slate-400'}`}>
                  {item.icon === 'check_circle' ? 'check_circle' : item.icon === 'face_3' ? 'face' : 'precision_manufacturing'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                  <h4 className="font-bold text-slate-900 dark:text-white truncate text-base">{item.patientName}</h4>
                  <span className={`text-[9px] font-extrabold uppercase tracking-widest px-2 py-1 rounded-md ${item.colorClass}`}>
                    {item.status}
                  </span>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 truncate mt-0.5">{item.procedure}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 font-medium">{item.timeLabel}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Floating Action Button */}
      {(userProfile?.role === 'admin' || hasPermission('create_bpai')) && (
        <button 
          onClick={onNewBpai}
          className="fixed bottom-8 right-8 z-40 flex items-center justify-center w-14 h-14 bg-primary text-white rounded-full shadow-lg shadow-primary/40 hover:bg-primary-dark transition-all duration-300 hover:scale-110 active:scale-95 group"
        >
          <span className="material-symbols-outlined text-[28px] group-hover:rotate-90 transition-transform">add</span>
        </button>
      )}
    </div>
  );
};

// Sub-components for Dashboard
const MetricCard = ({ label, value, trend, icon, progress, color, statusType }: any) => {
  const colorMap: any = {
    primary: 'bg-primary',
    'accent-purple': 'bg-accent-purple',
    'accent-teal': 'bg-accent-teal',
  };

  const trendColor = statusType === 'warning' ? 'text-orange-600 bg-orange-100 dark:bg-orange-900/30' : 'text-green-600 bg-green-100 dark:bg-green-900/30';
  const trendIcon = statusType === 'warning' ? 'warning' : 'trending_up';

  return (
    <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 relative overflow-hidden group transition-all hover:shadow-md">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-2.5 rounded-xl ${colorMap[color]}/10 ${color === 'primary' ? 'text-primary' : color === 'accent-purple' ? 'text-accent-purple' : 'text-accent-teal'} border border-slate-100 dark:border-slate-800`}>
          <span className="material-symbols-outlined text-[24px]">{icon}</span>
        </div>
        <span className={`flex items-center text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider ${trendColor}`}>
          {statusType === 'warning' && <span className="material-symbols-outlined text-[14px] mr-1">warning</span>}
          {statusType !== 'warning' && <span className="material-symbols-outlined text-[14px] mr-1">trending_up</span>}
          {trend}
        </span>
      </div>
      <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-widest">{label}</p>
      <h3 className="text-3xl font-bold text-slate-900 dark:text-white mt-1.5">{value}</h3>
      <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-5 overflow-hidden">
        <div className={`${colorMap[color]} h-full rounded-full transition-all duration-1000 shadow-[0_0_8px_rgba(19,127,236,0.4)]`} style={{ width: `${progress}%` }}></div>
      </div>
    </div>
  );
};

const QuickCard = ({ title, subtitle, icon, image, gradient, onClick }: any) => (
  <div 
    onClick={onClick}
    className="relative overflow-hidden rounded-2xl h-48 group cursor-pointer shadow-sm hover:shadow-xl transition-all border border-transparent dark:border-slate-800"
  >
    {image ? (
      <div 
        className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 group-hover:scale-105" 
        style={{ backgroundImage: `url("${image}")` }}
      />
    ) : (
      <div 
        className={`absolute inset-0 bg-gradient-to-br ${gradient || 'from-slate-700 to-slate-900'} transition-transform duration-1000 group-hover:scale-105`} 
      />
    )}
    <div className={`absolute inset-0 ${image ? 'bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent' : 'bg-black/10'}`}></div>
    <div className="absolute inset-0 p-6 flex flex-col justify-end">
      <div className="bg-white/10 backdrop-blur-md w-12 h-12 rounded-xl flex items-center justify-center mb-3 text-white border border-white/20 group-hover:bg-white/20 group-hover:border-white/40 transition-all shadow-lg">
        <span className="material-symbols-outlined text-[28px]">{icon}</span>
      </div>
      <h3 className="text-white font-bold text-2xl leading-tight tracking-tight">{title}</h3>
      <p className="text-white/70 text-[10px] mt-1 font-extrabold tracking-widest uppercase">{subtitle}</p>
    </div>
  </div>
);

export default Dashboard;
