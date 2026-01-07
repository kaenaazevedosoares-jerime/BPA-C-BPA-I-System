import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { formatTitleCase } from '../utils/textUtils';

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
    email: '',
    establishment_id: '',
    access_password: ''
  });
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [loading, setLoading] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [establishments, setEstablishments] = useState<any[]>([]);
  const [professionSuggestions, setProfessionSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchTimer, setSearchTimer] = useState<number | null>(null);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEstablishments = async () => {
      const { data } = await supabase.from('establishments').select('id, name, cnes').order('name');
      if (data) setEstablishments(data);
    };
    fetchEstablishments();
  }, []);

  const handleSearchProfession = (text: string) => {
    handleInputChange('profissao', text);
    
    if (searchTimer) clearTimeout(searchTimer);

    if (text.length < 1) {
      setProfessionSuggestions([]);
      setShowSuggestions(false);
      setSuggestionError(null);
      return;
    }

    const timer = setTimeout(async () => {
      setSuggestionError(null);
      const { data, error } = await supabase.rpc('search_cbos', { search_term: text });
      if (error) {
        setSuggestionError('Falha ao buscar CBO.');
        setProfessionSuggestions([]);
        setShowSuggestions(false);
        return;
      }
      const list = (data || []).slice(0, 10).map((d: any) => ({ code: d.code, occupation: d.occupation }));
      setProfessionSuggestions(list);
      setShowSuggestions(list.length > 0);
    }, 300);

    setSearchTimer(Number(timer));
  };

  const selectProfession = (item: any) => {
    handleInputChange('profissao', item.occupation);
    handleInputChange('cbo', item.code);
    setProfessionSuggestions([]);
    setShowSuggestions(false);
  };

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
    } else {
      const onlyDigits = formData.sus.replace(/\D/g, '');
      if (!(onlyDigits.length === 11 || onlyDigits.length === 15)) {
        newErrors.sus = 'Número SUS deve ter 11 (CPF) ou 15 (CNS) dígitos';
      }
    }

    if (!formData.nome.trim()) {
      newErrors.nome = 'Nome é obrigatório';
    } else if (formData.nome.length > 255) {
      newErrors.nome = 'Nome deve ter no máximo 255 caracteres';
    }

    if (!formData.establishment_id) {
      newErrors.establishment_id = 'Estabelecimento é obrigatório';
    }

    if (!formData.profissao.trim()) {
      newErrors.profissao = 'Profissão é obrigatória';
    } else if (formData.profissao.length > 100) {
      newErrors.profissao = 'Profissão deve ter no máximo 100 caracteres';
    }

    if (!formData.cbo.trim()) {
      newErrors.cbo = 'CBO é obrigatório';
    } else if (formData.cbo.length > 10) {
      newErrors.cbo = 'CBO deve ter no máximo 10 caracteres';
    }

    if (!formData.telefone.trim()) {
      newErrors.telefone = 'Telefone é obrigatório';
    } else if (formData.telefone.length > 20) {
      newErrors.telefone = 'Telefone deve ter no máximo 20 caracteres';
    }

    if (formData.email && formData.email.length > 255) {
      newErrors.email = 'Email deve ter no máximo 255 caracteres';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email inválido';
    }

    if (!formData.access_password || formData.access_password.length < 4) {
      newErrors.access_password = 'Senha de acesso é obrigatória (mín. 4 caracteres)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: string, value: string) => {
    let v = value;
    if (field === 'nome' || field === 'endereco') {
      v = formatTitleCase(v);
    }
    if (field === 'email') {
      v = v.toLowerCase();
    }
    if (field === 'sus') {
      v = value.replace(/\D/g, '').slice(0, 15);
    }
    setFormData(prev => ({ ...prev, [field]: v }));
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
          .update({
            ...formData,
            nome: formatTitleCase(formData.nome),
            profissao: formatTitleCase(formData.profissao),
            endereco: formatTitleCase(formData.endereco),
            email: formData.email?.toLowerCase(),
            establishment_id: formData.establishment_id || null
          })
          .eq('id', initialId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('profissionais')
          .insert([{
            ...formData,
            nome: formatTitleCase(formData.nome),
            profissao: formatTitleCase(formData.profissao),
            endereco: formatTitleCase(formData.endereco),
            email: formData.email?.toLowerCase(),
            establishment_id: formData.establishment_id || null,
            access_password: formData.access_password || null
          }]);

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
            <div className="relative">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Profissão <span className="text-red-500">*</span>
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
                inputMode="numeric"
                pattern="[0-9]*"
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

            <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Estabelecimento de Vínculo <span className="text-red-500">*</span>
            </label>
              <select
                value={formData.establishment_id}
                onChange={(e) => handleInputChange('establishment_id', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="">Selecione um estabelecimento...</option>
                {establishments.map(est => (
                  <option key={est.id} value={est.id}>
                    {est.cnes} - {est.name}
                  </option>
                ))}
              </select>
            </div>

          <div className="relative">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Profissão <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.profissao}
              onChange={(e) => handleSearchProfession(e.target.value)}
              onFocus={() => { if (professionSuggestions.length > 0) setShowSuggestions(true); }}
              onBlur={() => { setTimeout(() => setShowSuggestions(false), 200); }}
              placeholder="Ex: Médico, Enfermeiro, Dentista..."
              className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent ${
                errors.profissao ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'
              }`}
              maxLength={100}
              autoComplete="off"
            />
            {showSuggestions && professionSuggestions.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {professionSuggestions.map((item, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => selectProfession(item)}
                    className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-sm text-slate-700 dark:text-slate-200"
                  >
                    <span className="font-bold">{item.code}</span> - {item.occupation}
                  </button>
                ))}
              </div>
            )}
            {!showSuggestions && formData.profissao && !suggestionError && (
              <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg p-3 text-sm text-slate-500 dark:text-slate-300">Nenhum resultado</div>
            )}
            {suggestionError && (
              <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-800 border border-red-300 dark:border-red-700 rounded-lg shadow-lg p-3 text-sm text-red-600 dark:text-red-400">{suggestionError}</div>
            )}
            {errors.profissao && <p className="text-red-500 text-sm mt-1">{errors.profissao}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              CBO <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.cbo}
              onChange={(e) => handleInputChange('cbo', e.target.value)}
              placeholder="Ex: 2231-10"
              readOnly
              className={`w-full px-3 py-2 border rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed focus:ring-2 focus:ring-primary focus:border-transparent ${
                errors.cbo ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'
              }`}
              maxLength={10}
            />
            {errors.cbo && <p className="text-red-500 text-sm mt-1">{errors.cbo}</p>}
          </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Telefone <span className="text-red-500">*</span>
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

            <div className="md:col-span-2 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                Senha de Acesso (Produção Individual) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.access_password || ''}
                onChange={(e) => handleInputChange('access_password', e.target.value)}
                placeholder="Defina uma senha para o profissional acessar a tela de produção"
                className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent ${
                  errors.access_password ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'
                }`}
              />
              <p className="text-xs text-slate-500 mt-2">
                <span className="material-symbols-outlined text-[14px] align-middle mr-1">info</span>
                Esta senha será solicitada exclusivamente quando o profissional tentar acessar a tela de "Produção BPA-C".
              </p>
              {errors.access_password && <p className="text-red-500 text-sm mt-1">{errors.access_password}</p>}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Endereço Completo <span className="text-red-500">*</span>
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
