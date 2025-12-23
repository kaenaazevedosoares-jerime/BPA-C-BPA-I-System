export type PermissionKey = 
  // Sidebar Views
  | 'view_bpai'
  | 'view_bpac'
  | 'view_patients'
  | 'view_profissionais'
  | 'view_establishment'
  | 'view_stock'
  | 'view_procedure_catalog'
  | 'view_cbo_catalog'
  | 'view_street_types'
  
  // Actions / Buttons
  | 'create_patient'
  | 'edit_patient'
  | 'delete_patient'
  | 'create_bpai'
  | 'create_bpac'
  | 'create_professional'
  | 'manage_stock';

export const ALL_PERMISSIONS: { key: PermissionKey; label: string; group: string }[] = [
  { key: 'view_bpai', label: 'Ver BPA-I Digital', group: 'Menu Lateral' },
  { key: 'view_bpac', label: 'Ver BPA-C Consolidado', group: 'Menu Lateral' },
  { key: 'view_patients', label: 'Ver Pacientes', group: 'Menu Lateral' },
  { key: 'view_profissionais', label: 'Ver Profissionais', group: 'Menu Lateral' },
  { key: 'view_establishment', label: 'Ver Estabelecimento', group: 'Menu Lateral' },
  { key: 'view_stock', label: 'Ver Estoque', group: 'Menu Lateral' },
  { key: 'view_procedure_catalog', label: 'Ver Catálogo de Procedimentos', group: 'Menu Lateral' },
  { key: 'view_cbo_catalog', label: 'Ver Catálogo CBO', group: 'Menu Lateral' },
  { key: 'view_street_types', label: 'Ver Tipos de Logradouro', group: 'Menu Lateral' },
  
  { key: 'create_patient', label: 'Cadastrar Paciente', group: 'Ações' },
  { key: 'edit_patient', label: 'Editar Paciente', group: 'Ações' },
  { key: 'create_bpai', label: 'Criar BPA-I', group: 'Ações' },
  { key: 'create_bpac', label: 'Criar BPA-C', group: 'Ações' },
  { key: 'create_professional', label: 'Cadastrar Profissional', group: 'Ações' },
];

export type UserPermissions = {
  [key in PermissionKey]?: boolean;
};
