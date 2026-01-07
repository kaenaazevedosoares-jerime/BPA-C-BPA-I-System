import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { formatTitleCase } from '../utils/textUtils';

const PublicProfissionalRegistration: React.FC = () => {
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
  const [establishments, setEstablishments] = useState<any[]>([]);
  const [success, setSuccess] = useState(false);

  // Autocomplete states
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

      setSuccess(true);
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

  if (success) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-surface-dark rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="material-symbols-outlined text-4xl text-green-600 dark:text-green-400">check_circle</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-4">Cadastro Realizado!</h2>
          <p className="text-slate-600 dark:text-slate-300 mb-8">
            Seus dados foram enviados com sucesso para o sistema. O administrador irá revisar seu cadastro.
          </p>
          <button
            onClick={() => {
              setSuccess(false);
              setFormData({
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
            }}
            className="w-full bg-primary hover:bg-primary-dark text-white py-3 px-6 rounded-xl font-bold transition-all"
          >
            Realizar Novo Cadastro
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/30">
            <span className="material-symbols-outlined text-3xl text-white">medical_services</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Auto-Cadastro Profissional</h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400">Preencha seus dados para registro no sistema</p>
        </div>

        <div className="bg-white dark:bg-surface-dark rounded-2xl shadow-xl overflow-hidden border border-slate-200 dark:border-slate-800">
          <div className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
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
                    className={`w-full px-4 py-3 border rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent ${
                      errors.sus ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'
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
                    placeholder="Digite seu nome completo"
                    className={`w-full px-4 py-3 border rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent ${
                      errors.nome ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'
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
                    className={`w-full px-4 py-3 border rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent ${
                      errors.establishment_id ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <option value="">Selecione o estabelecimento onde atua...</option>
                    {establishments.map(est => (
                      <option key={est.id} value={est.id}>
                        {est.cnes} - {est.name}
                      </option>
                    ))}
                  </select>
                  {errors.establishment_id && <p className="text-red-500 text-sm mt-1">{errors.establishment_id}</p>}
                </div>

                <div className="relative">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Profissão <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.profissao}
                    onChange={(e) => handleSearchProfession(e.target.value)}
                    onFocus={() => {
                      if (professionSuggestions.length > 0) setShowSuggestions(true);
                    }}
                    onBlur={() => {
                      setTimeout(() => setShowSuggestions(false), 200);
                    }}
                    placeholder="Busque sua profissão..."
                    className={`w-full px-4 py-3 border rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent ${
                      errors.profissao ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'
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
                          className="w-full text-left px-4 py-3 hover:bg-slate-100 dark:hover:bg-slate-700 text-sm text-slate-700 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 last:border-0"
                        >
                          <span className="font-bold text-primary">{item.code}</span> - {item.occupation}
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
                    readOnly
                    placeholder="Código CBO"
                    className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-100 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 cursor-not-allowed"
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
                    className={`w-full px-4 py-3 border rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent ${
                      errors.telefone ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'
                    }`}
                    maxLength={20}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="seu@email.com"
                    className={`w-full px-4 py-3 border rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent ${
                      errors.email ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'
                    }`}
                    maxLength={255}
                  />
                  {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
                </div>

                <div className="md:col-span-2 bg-primary/5 p-6 rounded-xl border border-primary/10">
                  <label className="block text-sm font-bold text-slate-800 dark:text-white mb-2">
                    Senha de Acesso (Produção Individual) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.access_password || ''}
                    onChange={(e) => handleInputChange('access_password', e.target.value)}
                    placeholder="Crie uma senha para acessar sua produção"
                    className={`w-full px-4 py-3 border rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent ${
                      errors.access_password ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'
                    }`}
                  />
                  <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">info</span>
                    Essa senha será usada exclusivamente para lançar sua produção no sistema.
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
                    className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                  />
                </div>
              </div>

              <div className="pt-6">
                <button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary-dark text-white py-4 rounded-xl font-bold shadow-lg shadow-primary/30 transition-all hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></span>
                      Enviando Cadastro...
                    </span>
                  ) : (
                    'Confirmar Cadastro'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
        
        <p className="text-center text-slate-400 text-sm mt-8">
          &copy; {new Date().getFullYear()} BPA-C & BPA-I System
        </p>
      </div>
    </div>
  );
};

export default PublicProfissionalRegistration;
