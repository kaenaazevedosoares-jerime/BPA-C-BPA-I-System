
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  DashboardBpaiStatus, 
  DashboardProcedureStat, 
  DashboardProfessionalStat, 
  DashboardBpacUnitStat 
} from '../types';

interface DashboardStats {
  bpaiStatus: DashboardBpaiStatus | null;
  bpaiProcedures: DashboardProcedureStat[];
  bpaiProfessionals: DashboardProfessionalStat[];
  bpacUnits: DashboardBpacUnitStat[];
  bpacProcedures: DashboardProcedureStat[];
  bpacProfessionals: DashboardProfessionalStat[];
  loading: boolean;
  error: string | null;
}

export function useDashboardStats(month: string, year: string, filterType: 'month' | 'year') {
  const [stats, setStats] = useState<DashboardStats>({
    bpaiStatus: null,
    bpaiProcedures: [],
    bpaiProfessionals: [],
    bpacUnits: [],
    bpacProcedures: [],
    bpacProfessionals: [],
    loading: true,
    error: null
  });

  useEffect(() => {
    async function fetchStats() {
      try {
        setStats(prev => ({ ...prev, loading: true, error: null }));

        // Formatar mês para 2 dígitos se necessário
        const formattedMonth = month.padStart(2, '0');

        // Construir query base
        const applyFilter = (query: any) => {
          if (filterType === 'month') {
            return query.eq('mes', formattedMonth).eq('ano', year);
          } else {
            return query.eq('ano', year);
          }
        };

        const applyBpacFilter = (query: any) => {
          if (filterType === 'month') {
            // CORREÇÃO: Usar % ao redor do ano para ignorar espaços (ex: " / 2026")
            return query
                .ilike('reference_month', `%${year}%`)
                .ilike('reference_month', `${getMonthName(month)}%`);
          } else {
            return query.eq('ano_texto', year);
          }
        };
        
        // Helper para nome do mês
        const getMonthName = (m: string) => {
            const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
            return months[parseInt(m) - 1] || '';
        };

        // 1. BPA-I Status
        let statusQuery = supabase.from('vw_dashboard_bpai_status').select('*');
        statusQuery = applyFilter(statusQuery);
        const { data: statusData } = await statusQuery;

        // Agregar se for anual (somar todos os meses)
        const aggregatedStatus = statusData?.reduce((acc, curr) => ({
            ano: year,
            mes: 'Todos',
            finalizados: (acc.finalizados || 0) + (curr.finalizados || 0),
            pendentes: (acc.pendentes || 0) + (curr.pendentes || 0),
            consulta_molde: (acc.consulta_molde || 0) + (curr.consulta_molde || 0),
            agendado_entrega: (acc.agendado_entrega || 0) + (curr.agendado_entrega || 0),
            cancelados: (acc.cancelados || 0) + (curr.cancelados || 0),
            processado_sia: (acc.processado_sia || 0) + (curr.processado_sia || 0)
        }), {} as DashboardBpaiStatus) || null;

        // 2. BPA-I Procedimentos
        let procQuery = supabase.from('vw_dashboard_bpai_procedures').select('*');
        procQuery = applyFilter(procQuery);
        const { data: procData } = await procQuery;
        
        // Agregar procedimentos iguais
        const aggregatedProcs = Object.values((procData || []).reduce((acc: any, curr: any) => {
            if (!acc[curr.procedure_name]) acc[curr.procedure_name] = { ...curr, total: 0 };
            acc[curr.procedure_name].total += curr.total;
            return acc;
        }, {})) as DashboardProcedureStat[];

        // 3. BPA-I Profissionais
        let profQuery = supabase.from('vw_dashboard_bpai_professionals').select('*');
        profQuery = applyFilter(profQuery);
        const { data: profData } = await profQuery;

        const aggregatedProfs = Object.values((profData || []).reduce((acc: any, curr: any) => {
            if (!acc[curr.professional_name]) acc[curr.professional_name] = { ...curr, total: 0 };
            acc[curr.professional_name].total += curr.total;
            return acc;
        }, {})) as DashboardProfessionalStat[];

        // 4. BPA-C Unidades
        let bpacUnitQuery = supabase.from('vw_dashboard_bpac_units').select('*');
        bpacUnitQuery = applyBpacFilter(bpacUnitQuery);
        const { data: bpacUnitData } = await bpacUnitQuery;

        // 5. BPA-C Profissionais
        let bpacProfQuery = supabase.from('vw_dashboard_bpac_professionals').select('*');
        bpacProfQuery = applyBpacFilter(bpacProfQuery);
        const { data: bpacProfData } = await bpacProfQuery;

        // 6. BPA-C Procedimentos
        let bpacProcQuery = supabase.from('vw_dashboard_bpac_procedures').select('*');
        bpacProcQuery = applyBpacFilter(bpacProcQuery);
        const { data: bpacProcData } = await bpacProcQuery;

        setStats({
            bpaiStatus: aggregatedStatus,
            bpaiProcedures: aggregatedProcs.sort((a, b) => b.total - a.total).slice(0, 10),
            bpaiProfessionals: aggregatedProfs.sort((a, b) => b.total - a.total).slice(0, 10),
            bpacUnits: (bpacUnitData || []).sort((a, b) => b.total - a.total),
            bpacProcedures: (bpacProcData || []).sort((a, b) => b.total - a.total).slice(0, 10),
            bpacProfessionals: (bpacProfData || []).sort((a, b) => b.total - a.total).slice(0, 10),
            loading: false,
            error: null
        });

      } catch (err: any) {
        setStats(prev => ({ ...prev, loading: false, error: err.message }));
      }
    }

    fetchStats();
  }, [month, year, filterType]);

  return stats;
}
