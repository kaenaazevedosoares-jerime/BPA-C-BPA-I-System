# 🦷 Sistema BPA-C/BPA-I - Gestão Odontológica

<div align="center">

![Status](https://img.shields.io/badge/Status-Em%20Produção-success)
![Version](https://img.shields.io/badge/Version-0.0.0-blue)
![License](https://img.shields.io/badge/License-Proprietário-red)

**Sistema completo para gestão de procedimentos odontológicos do SUS**

[Documentação](#-documentação) • [Instalação](#-instalação) • [Uso](#-uso) • [Contribuir](#-contribuir)

</div>

---

## 📋 Sobre o Projeto

Sistema web desenvolvido para gerenciar procedimentos odontológicos através dos formulários BPA-I (Individual) e BPA-C (Consolidado) do SUS. Permite cadastro de pacientes, profissionais, agendamento de procedimentos, acompanhamento de fluxo de próteses e geração de relatórios para o SIA/SUS.

### ✨ Principais Funcionalidades

- 📊 **Dashboard Interativo** - Métricas em tempo real com filtros mensais/anuais
- 👥 **Gestão de Pacientes** - Cadastro completo com validação de CNS
- 🦷 **BPA-I Digital** - Registro individual de procedimentos com fluxo de próteses
- 📄 **BPA-C Consolidado** - Consolidação de produção por unidade
- 👨‍⚕️ **Gestão de Profissionais** - Cadastro com senha de acesso individual
- 📈 **Relatórios Visuais** - Gráficos de produção por procedimento e profissional
- 📥 **Importação em Massa** - Upload de pacientes e procedimentos via Excel
- 🌙 **Dark Mode** - Tema claro/escuro
- 🔍 **Busca Inteligente** - Busca sem acentuação

---

## 🏗️ Tecnologias

### Frontend
- **React** 19.2.3 com TypeScript
- **Vite** 6.2.0 (Build Tool)
- **Supabase Client** 2.89.0

### Backend
- **Supabase** (PostgreSQL + Auth + Storage)
- **PostgreSQL** com extensões:
  - `pgcrypto` - UUIDs e criptografia
  - `unaccent` - Busca sem acentuação

### Deploy
- **Vercel** (Frontend)
- **Supabase Cloud** (Backend)

---

## 🚀 Instalação

### Pré-requisitos
- Node.js 18+ 
- npm ou yarn
- Conta no Supabase

### 1. Clone o Repositório
```bash
git clone https://github.com/seu-usuario/BPA-C-BPA-I-System.git
cd BPA-C-BPA-I-System
```

### 2. Instale as Dependências
```bash
npm install
```

### 3. Configure as Variáveis de Ambiente
Crie um arquivo `.env` na raiz do projeto:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anonima
```

### 4. Configure o Banco de Dados
Execute o script SQL no Supabase:

```bash
# No painel do Supabase, vá em SQL Editor e execute:
# 1. database-mestre.sql (schema completo)
# 2. Migrações adicionais (migration_*.sql)
```

### 5. Execute o Projeto
```bash
npm run dev
```

Acesse: `http://localhost:5173`

---

## 📚 Documentação

### Documentos Disponíveis

1. **[ANALISE_SISTEMA.md](ANALISE_SISTEMA.md)** - Análise completa do sistema
   - Arquitetura detalhada
   - Modelo de dados
   - Fluxos principais
   - Pontos fortes e fracos
   - Sugestões de melhorias

2. **[DIAGRAMA_ARQUITETURA.md](DIAGRAMA_ARQUITETURA.md)** - Diagramas visuais
   - Arquitetura geral
   - Fluxo de dados
   - Modelo de relacionamentos
   - Estrutura de componentes

3. **[PROXIMOS_PASSOS.md](PROXIMOS_PASSOS.md)** - Roadmap e prioridades
   - Plano de ação detalhado
   - Priorização de tarefas
   - Estimativas de esforço
   - Métricas de sucesso

4. **[GUIA_IMPLEMENTACAO.md](GUIA_IMPLEMENTACAO.md)** - Guia prático
   - Código para correções urgentes
   - Hash de senhas (bcrypt)
   - Validação de CNS
   - Otimizações de performance

### Estrutura do Projeto

```
src/
├── components/      # Componentes reutilizáveis
├── pages/          # Páginas/Views principais
├── hooks/          # Custom Hooks
├── lib/            # Configurações (Supabase)
├── services/       # Serviços de API
├── types/          # Definições TypeScript
└── utils/          # Utilitários
```

---

## 🎯 Uso

### Login
1. Acesse o sistema
2. Faça login com suas credenciais
3. Será redirecionado para o Dashboard

### Cadastrar Paciente
1. Menu lateral → **Cadastro de Paciente**
2. Preencha os dados (CNS é obrigatório e validado)
3. Salve

### Registrar Procedimento BPA-I
1. Dashboard → Botão **+** (flutuante)
2. Selecione o paciente (autocomplete)
3. Selecione o procedimento
4. Defina datas e status
5. Salve

### Criar BPA-C Consolidado
1. Menu lateral → **BPA-C Consolidado**
2. Selecione CNES e mês de referência
3. Adicione itens (procedimento + CBO + quantidade)
4. Salve

### Visualizar Dashboard
1. Acesse o Dashboard
2. Use filtros (Mensal/Anual)
3. Alterne entre BPA-I e BPA-C
4. Visualize gráficos e métricas

---

## 🔐 Segurança

### Autenticação
- Gerenciada pelo Supabase Auth
- JWT tokens
- Session management

### Autorização
- **Roles:** `admin` | `operator`
- **Permissões granulares** via JSONB
- Row Level Security (RLS) em todas as tabelas

### Dados Sensíveis
⚠️ **ATENÇÃO:** Atualmente as senhas de profissionais estão em texto plano. Veja [GUIA_IMPLEMENTACAO.md](GUIA_IMPLEMENTACAO.md) para corrigir.

---

## ⚠️ Problemas Conhecidos

### Críticos 🔴
1. **Senhas em texto plano** - Precisa implementar bcrypt
2. **Falta validação de CNS** - Aceita valores inválidos

### Médios 🟡
3. **Performance** - Views não otimizadas
4. **Componentes grandes** - `ProcedureList.tsx` com 74KB
5. **Falta de testes** - Sem testes automatizados

Veja [PROXIMOS_PASSOS.md](PROXIMOS_PASSOS.md) para plano de correção.

---

## 🛠️ Scripts Disponíveis

```bash
# Desenvolvimento
npm run dev          # Inicia servidor de desenvolvimento

# Build
npm run build        # Gera build de produção
npm run preview      # Preview do build

# Verificação
npm run check        # TypeScript type checking
```

---

## 📊 Status do Projeto

### Implementado ✅
- [x] Autenticação e autorização
- [x] Dashboard com métricas
- [x] Cadastro de pacientes
- [x] Cadastro de profissionais
- [x] Registro de procedimentos BPA-I
- [x] BPA-C consolidado
- [x] Importação Excel
- [x] Dark mode
- [x] Busca inteligente

### Em Desenvolvimento 🚧
- [ ] Hash de senhas (bcrypt)
- [ ] Validação de CNS
- [ ] Testes automatizados
- [ ] Otimizações de performance

### Planejado 📅
- [ ] Relatórios em PDF
- [ ] Integração WhatsApp
- [ ] Histórico de alterações
- [ ] Backup automático
- [ ] Integração DATASUS

---

## 🤝 Contribuir

### Como Contribuir
1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/nova-feature`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova feature'`)
4. Push para a branch (`git push origin feature/nova-feature`)
5. Abra um Pull Request

### Padrões de Código
- TypeScript strict mode
- ESLint + Prettier
- Conventional Commits
- Componentes funcionais com hooks

---

## 📝 Licença

Este projeto é proprietário. Todos os direitos reservados.

---

## 👥 Equipe

- **Desenvolvimento:** Equipe de TI da Secretaria de Saúde
- **Análise:** Antigravity AI
- **Suporte:** [Contato]

---

## 📞 Suporte

Para dúvidas ou problemas:
- 📧 Email: suporte@exemplo.com
- 📱 WhatsApp: (00) 00000-0000
- 🌐 Site: https://exemplo.com

---

## 🙏 Agradecimentos

- Equipe da Secretaria de Saúde
- Comunidade Supabase
- Contribuidores do projeto

---

<div align="center">

**Desenvolvido com ❤️ para melhorar a saúde pública**

[⬆ Voltar ao topo](#-sistema-bpa-cbpa-i---gestão-odontológica)

</div>
