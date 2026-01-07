import React, { useState, useEffect, useCallback } from 'react';
import { Theme, View, UserProfile } from './types';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Register from './pages/Register';
import PatientRegistration from './pages/PatientRegistration';
import ProcedureForm from './pages/ProcedureForm';
import ProcedureList from './pages/ProcedureList';
import BpaConsolidatedForm from './pages/BpaConsolidatedForm';
import BpaProductionForm from './pages/BpaProductionForm';
import EstablishmentRegistration from './pages/EstablishmentRegistration';
import ProcedureCatalog from './pages/ProcedureCatalog';
import CboRegistration from './pages/CboRegistration';
import ProfissionaisList from './pages/ProfissionaisList';
import ProfissionalForm from './pages/ProfissionalForm';
import PublicProfissionalRegistration from './pages/PublicProfissionalRegistration';
import StreetTypeCatalog from './pages/StreetTypeCatalog';
import Settings from './pages/Settings';
import { supabase } from './lib/supabase';

const App: React.FC = () => {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('theme');
    return (saved as Theme) || 'light';
  });
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [patientToFix, setPatientToFix] = useState<{ cns: string, name: string } | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') { // Not found - Auto-create profile
           console.log('Profile not found, auto-creating...');
           const { data: { user } } = await supabase.auth.getUser();
           
           if (user) {
             const newProfile = {
               id: user.id,
               full_name: user.user_metadata?.full_name || user.email || 'Usuário',
               email: user.email,
               role: 'operator',
               permissions: {}
             };
             
             const { error: insertError } = await supabase.from('profiles').insert(newProfile);
             
             if (!insertError) {
                console.log('Profile created successfully');
                setUserProfile(newProfile as UserProfile);
                return;
             } else {
                console.error('Error auto-creating profile:', insertError);
             }
           }
        }
        console.error('Error fetching profile:', error);
        return;
      }
      
      setUserProfile(data);
    } catch (err) {
      console.error('Unexpected error fetching profile:', err);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);

      const params = new URLSearchParams(window.location.search);
      const viewParam = params.get('view');

      if (viewParam === 'public-professional-reg') {
        setCurrentView('public-professional-reg');
      } else if (!session && currentView !== 'register') {
        setCurrentView('login');
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      const params = new URLSearchParams(window.location.search);
      const viewParam = params.get('view');
      if (session) {
        fetchProfile(session.user.id);
        if (currentView === 'login') setCurrentView('dashboard');
      } else {
        setUserProfile(null);
        if (viewParam === 'public-professional-reg') {
          setCurrentView('public-professional-reg');
        } else {
          setCurrentView('login');
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  const navigateTo = (view: View) => {
    setCurrentView(view);
    setEditingId(null); // Clear editing state when navigating
    setPatientToFix(null); // Clear patient fix state
    setIsSidebarOpen(false);
  };

  const handleEditProcedure = (id: string) => {
    setEditingId(id);
    setCurrentView('procedure-form');
  };

  const handleFixPatient = (patient: { cns: string, name: string }) => {
    setPatientToFix(patient);
    setCurrentView('patient-reg');
  };

  const handleEditProfissional = (id: string) => {
    setEditingId(id);
    setCurrentView('profissionais-form');
  };

  const renderView = () => {
    if (!session && currentView !== 'register' && currentView !== 'login' && currentView !== 'public-professional-reg') {
      return <Login onLogin={() => navigateTo('dashboard')} onGoToRegister={() => navigateTo('register')} />;
    }

    switch (currentView) {
      case 'login':
        return <Login onLogin={() => navigateTo('dashboard')} onGoToRegister={() => navigateTo('register')} />;
      case 'register':
        return <Register onRegister={() => navigateTo('login')} onGoToLogin={() => navigateTo('login')} />;
      case 'dashboard':
        return <Dashboard onNewBpai={() => navigateTo('procedure-form')} onNewBpac={() => navigateTo('bpa-c-form')} userProfile={userProfile} />;
      case 'patient-reg':
        return <PatientRegistration 
          onCancel={() => navigateTo('dashboard')} 
          onSave={() => navigateTo('dashboard')} 
          userRole={userProfile?.role}
          initialCns={patientToFix?.cns}
          initialName={patientToFix?.name}
        />;
      case 'procedure-form':
        return <ProcedureForm onCancel={() => navigateTo('procedure-list')} onSave={() => navigateTo('procedure-list')} initialId={editingId} />;
      case 'bpa-c-form':
        if (userProfile?.role !== 'admin' && !userProfile?.permissions?.view_bpac) {
          return <Dashboard onNewBpai={() => navigateTo('procedure-form')} onNewBpac={() => navigateTo('bpa-c-form')} userProfile={userProfile} />;
        }
        return <BpaConsolidatedForm onCancel={() => navigateTo('dashboard')} onSave={() => navigateTo('dashboard')} />;
      case 'bpa-production':
        return <BpaProductionForm onCancel={() => navigateTo('dashboard')} onSave={() => navigateTo('dashboard')} />;
      case 'procedure-list':
        return <ProcedureList onAddNew={() => navigateTo('procedure-form')} onEdit={handleEditProcedure} />;
      case 'establishment-reg':
        return <EstablishmentRegistration onCancel={() => navigateTo('dashboard')} onSave={() => navigateTo('dashboard')} />;
      case 'procedure-catalog':
        return <ProcedureCatalog onCancel={() => navigateTo('dashboard')} onSave={() => navigateTo('dashboard')} />;
      case 'cbo-reg':
        return <CboRegistration onCancel={() => navigateTo('dashboard')} onSave={() => navigateTo('dashboard')} />;
      case 'profissionais':
        return <ProfissionaisList onAddNew={() => navigateTo('profissionais-form')} onEdit={handleEditProfissional} />;
      case 'profissionais-form':
        return <ProfissionalForm onCancel={() => navigateTo('profissionais')} onSave={() => navigateTo('profissionais')} initialId={editingId} />;
      case 'street-type-catalog':
        return <StreetTypeCatalog onCancel={() => navigateTo('dashboard')} />;
      case 'settings':
        if (userProfile?.role !== 'admin') {
          return <Dashboard onNewBpai={() => navigateTo('procedure-form')} onNewBpac={() => navigateTo('bpa-c-form')} userProfile={userProfile} />;
        }
        return <Settings currentUser={userProfile} />;
      case 'public-professional-reg':
        return <PublicProfissionalRegistration />;
      default:
        return <Dashboard onNewBpai={() => navigateTo('procedure-form')} onNewBpac={() => navigateTo('bpa-c-form')} userProfile={userProfile} />;
    }
  };

  if (currentView === 'login' || currentView === 'register' || currentView === 'public-professional-reg') {
    return (
      <div className="min-h-screen">
        <button 
          onClick={toggleTheme}
          className="fixed top-4 right-4 z-50 p-2 rounded-full bg-surface-light dark:bg-surface-dark shadow-md border border-slate-200 dark:border-slate-800"
        >
          <span className="material-symbols-outlined text-slate-600 dark:text-slate-200">
            {theme === 'light' ? 'dark_mode' : 'light_mode'}
          </span>
        </button>
        {renderView()}
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
        currentView={currentView}
        onNavigate={navigateTo}
        userProfile={userProfile}
      />
      
      <div className="flex-1 flex flex-col min-w-0">
        <Header 
          theme={theme} 
          onToggleTheme={toggleTheme} 
          onOpenSidebar={() => setIsSidebarOpen(true)}
          currentViewTitle={
            currentView === 'dashboard' ? 'Visão Geral' : 
            currentView === 'procedure-list' ? 'Lista Procedimento' :
            currentView === 'patient-reg' ? 'REGISTRO PACIENTE' :
            currentView.charAt(0).toUpperCase() + currentView.slice(1).replace('-', ' ')
          }
          onFixPatient={handleFixPatient}
        />
        
        <main className="flex-1 overflow-y-auto">
          {renderView()}
        </main>
      </div>
    </div>
  );
};

export default App;
