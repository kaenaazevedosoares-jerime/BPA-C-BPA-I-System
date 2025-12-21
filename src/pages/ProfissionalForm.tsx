import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface ProfissionalFormProps {
  onCancel: () => void;
  onSave: () => void;
  initialId?: string | null;
}

const ProfissionalForm: React.FC<ProfissionalFormProps> = ({ onCancel, onSave, initialId }) => {
  const [formData, setFormData] = useState({
    sus: '',
    nome: '',
    profissao: '',
    cbo: '',
    endereco: '',
    telefone: '',
    email: ''
  });
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [loading, setLoading] = useState(false);
  const [isEdit, setIsEdit] = useState(false);

  useEffect(() => {
    if (initialId) {
      loadProfissional(initialId);
      setIsEdit(true);
    }
  }, [initialId]);

  const loadProfissional = async (id: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profissionais')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (data) {
        setFormData(data);
      }
    } catch (error) {
      console.error('Erro ao carregar profissional:', error);
      alert('Erro ao carregar dados do profissional');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: {[key: string]: string} = {};

    if (!formData.sus.trim()) {
      newErrors.sus = 'Número SUS é obrigatório';
    } else if (formData.sus.length > 15) {
      newErrors.sus = 'Número SUS deve ter no máximo 15 caracteres';
    }

    if (!formData.nome.trim()) {
      newErrors.nome = 'Nome é obrigatório';
    } else if (formData.nome.length > 255) {
      newErrors.nome = 'Nome deve ter no máximo 255 caracteres';
    }

    if (!formData.profissao.trim()) {
      newErrors.profissao = 'Profissão é obrigatória';
    } else if (formData.profissao.length > 100) {
      newErrors.profissao = 'Profissão deve ter no máximo 100 caracteres';
    }

    if (formData.cbo && formData.cbo.length > 10) {
      newErrors.cbo = 'CBO deve ter no máximo 10 caracteres';
    }

    if (formData.telefone && formData.telefone.length > 20) {
      newErrors.telefone = 'Telefone deve ter no máximo 20 caracteres';
    }

    if (formData.email && formData.email.length > 255) {
      newErrors.email = 'Email deve ter no máximo 255 caracteres';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email inválido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);

      if (isEdit && initialId) {
        const { error } = await supabase
          .from('profissionais')
          .update(formData)
          .eq('id', initialId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('profissionais')
          .insert([formData]);

        if (error) throw error;
      }

      onSave();
    } catch (error: any) {
      console.error('Erro ao salvar profissional:', error);
      if (error.code === '23505') {
        setErrors({ sus: 'Número SUS já cadastrado' });
      } else {
        alert('Erro ao salvar profissional: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneInput = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    let formatted = cleaned;
    
    if (cleaned.length <= 10) {
      formatted = cleaned.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
    } else if (cleaned.length <= 11) {
      formatted = cleaned.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
    } else {
      formatted = cleaned.slice(0, 11).replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
    }
    
    return formatted;
  };

  if (loading && isEdit) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded-lg w-48"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-12 bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-6">
          {isEdit ? 'Editar Profissional' : 'Cadastrar Novo Profissional'}
        </h2>

        <form onSubmit={handleSubmit} className="bg-white dark:bg-surface-dark rounded-xl shadow-md p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Número SUS <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.sus}
                onChange={(e) => handleInputChange('sus', e.target.value)}
                placeholder="Digite o número SUS"
                className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent ${
                  errors.sus ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'
                }`}
                maxLength={15}
              />
              {errors.sus && <p className="text-red-500 text-sm mt-1">{errors.sus}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Nome Completo <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.nome}
                onChange={(e) => handleInputChange('nome', e.target.value)}
                placeholder="Digite o nome completo"
                className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent ${
                  errors.nome ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'
                }`}
                maxLength={255}
              />
              {errors.nome && <p className="text-red-500 text-sm mt-1">{errors.nome}</p>}
            </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Profissão <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.profissao}
              onChange={(e) => handleInputChange('profissao', e.target.value)}
              placeholder="Ex: Médico, Enfermeiro, Dentista..."
              className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent ${
                errors.profissao ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'
              }`}
              maxLength={100}
            />
            {errors.profissao && <p className="text-red-500 text-sm mt-1">{errors.profissao}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              CBO
            </label>
            <input
              type="text"
              value={formData.cbo}
              onChange={(e) => handleInputChange('cbo', e.target.value)}
              placeholder="Ex: 2231-10"
              className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent ${
                errors.cbo ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'
              }`}
              maxLength={10}
            />
            {errors.cbo && <p className="text-red-500 text-sm mt-1">{errors.cbo}</p>}
          </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Telefone
              </label>
              <input
                type="tel"
                value={formData.telefone}
                onChange={(e) => handleInputChange('telefone', handlePhoneInput(e.target.value))}
                placeholder="(00) 00000-0000"
                className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent ${
                  errors.telefone ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'
                }`}
                maxLength={20}
              />
              {errors.telefone && <p className="text-red-500 text-sm mt-1">{errors.telefone}</p>}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="email@exemplo.com"
                className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent ${
                  errors.email ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'
                }`}
                maxLength={255}
              />
              {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Endereço Completo
              </label>
              <textarea
                value={formData.endereco}
                onChange={(e) => handleInputChange('endereco', e.target.value)}
                placeholder="Rua, número, bairro, cidade, estado"
                rows={3}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="bg-primary hover:bg-primary-dark text-white px-6 py-2 rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
                  Salvando...
                </span>
              ) : (
                isEdit ? 'Atualizar' : 'Cadastrar'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfissionalForm;
