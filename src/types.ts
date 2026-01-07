
import { UserPermissions } from './types/permissions';

export type Theme = 'light' | 'dark';

export type View = 
  | 'dashboard' 
  | 'login' 
  | 'register' 
  | 'patient-reg' 
  | 'procedure-form' 
  | 'procedure-list' 
  | 'bpa-c-form' 
  | 'establishment-reg' 
  | 'procedure-catalog' 
  | 'cbo-reg' 
  | 'profissionais' 
  | 'profissionais-form'
  | 'street-type-catalog'
  | 'bpa-production'
  | 'settings'
  | 'public-professional-reg';

export interface UserProfile {
  id: string;
  full_name: string;
  email?: string;
  role: 'admin' | 'operator';
  permissions?: UserPermissions;
}

export interface ProductionItem {
  id: string;
  patientName: string;
  procedure: string;
  status: 'Em Análise' | 'Concluído' | 'Em Produção' | 'Agendado';
  timeLabel: string;
  icon: string;
  colorClass: string;
}

export interface WhatsAppTemplate {
  id: string;
  title: string;
  message: string;
  created_at?: string;
}
