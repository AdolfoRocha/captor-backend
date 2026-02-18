
import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import MetricCard from './components/MetricCard';
import MissionControl from './components/MissionControl';
import AuditTable from './components/AuditTable';
import Terminal from './components/Terminal';
import MissionsList from './components/MissionsList';
import MissionPage from './components/MissionPage';
import CaptacaoPage from './components/CaptacaoPage';
import WhatsAppPage from './components/WhatsAppPage';
import { INITIAL_METRICS } from './constants';
import { Search, Bell, User, MapPin } from 'lucide-react';

import { Routes, Route } from 'react-router-dom';
import { TargetDataView } from './components/TargetDataView';

const Dashboard: React.FC = () => {
  const [activeView, setActiveView] = useState('dashboard');
  const [selectedMissionId, setSelectedMissionId] = useState<string | null>(null);

  const handleSelectMission = (id: string) => {
    setSelectedMissionId(id);
    setActiveView('mission-detail');
  };

  const handleBackFromMission = () => {
    setSelectedMissionId(null);
    setActiveView('mission');
  };

  const renderContent = () => {
    // Mission detail view
    if (activeView === 'mission-detail' && selectedMissionId) {
      return (
        <MissionPage
          missionId={selectedMissionId}
          onBack={handleBackFromMission}
        />
      );
    }

    // Mission list view
    if (activeView === 'mission') {
      return (
        <div className="space-y-8">
          <MissionControl />
          <MissionsList onSelectMission={handleSelectMission} />
        </div>
      );
    }

    // WhatsApp view
    if (activeView === 'whatsapp') {
      return <WhatsAppPage />;
    }

    // Captacao view
    if (activeView === 'captacao') {
      return <CaptacaoPage />;
    }

    // Default dashboard view
    return (
      <>
        {/* Metrics Grid */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {INITIAL_METRICS.map((metric, idx) => (
            <MetricCard key={idx} {...metric} />
          ))}
        </section>

        {/* Mission & Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-1 gap-8">
          <MissionControl />
          <MissionsList onSelectMission={handleSelectMission} />
          <AuditTable />
        </div>
      </>
    );
  };

  if (activeView === 'whatsapp') {
    return <WhatsAppPage />;
  }

  const getTitle = () => {
    if (activeView === 'mission-detail') return 'Detalhes da Missão';
    if (activeView === 'mission') return 'Nova Missão';
    if (activeView === 'captacao') return 'Captação de Leads';
    if (activeView === 'logs') return 'Logs em Tempo Real';
    if (activeView === 'results') return 'Resultados';
    if (activeView === 'settings') return 'Configurações';
    return 'Dashboard';
  };

  return (
    <div className="flex h-screen bg-[#0f172a] text-slate-200">
      <Sidebar activeView={activeView} setActiveView={(view) => {
        setActiveView(view);
        if (view !== 'mission-detail') setSelectedMissionId(null);
      }} />

      <main className="flex-1 ml-64 h-full overflow-y-auto relative">
        {/* Header Overlay */}
        <header className="sticky top-0 z-40 w-full px-8 py-4 bg-[#0f172a]/80 backdrop-blur-md border-b border-slate-800/50 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-white tracking-tight">{getTitle()}</h2>
            <div className="h-4 w-[1px] bg-slate-800" />
            <p className="text-xs text-slate-400 font-medium italic">Monitorando agentes ativos...</p>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 gap-2 group focus-within:border-purple-500 transition-all">
              <Search className="w-4 h-4 text-slate-500 group-hover:text-slate-300" />
              <input
                type="text"
                placeholder="Pesquisar profissionais..."
                className="bg-transparent border-none text-xs focus:ring-0 w-48 placeholder:text-slate-600"
              />
            </div>
            <button className="relative p-2 rounded-xl hover:bg-slate-800 transition-colors">
              <Bell className="w-5 h-5 text-slate-400" />
              <div className="absolute top-2 right-2 w-2 h-2 bg-purple-500 rounded-full border-2 border-[#0f172a]" />
            </button>
            <button className="flex items-center gap-2 p-1 pr-3 rounded-full bg-slate-800 hover:bg-slate-700 transition-colors border border-slate-700">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <span className="text-xs font-bold text-slate-200">Admin</span>
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="p-8 max-w-7xl mx-auto space-y-8">
          {renderContent()}
          {/* Spacer for scroll */}
          <div className="h-24" />
        </div>

        {/* Floating Logs Terminal */}
        <Terminal />
      </main>

      {/* Cyberpunk Scanline Effect Overlay (Global) */}
      <div className="pointer-events-none fixed inset-0 z-[9999] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-overlay" />
    </div>

  );
};

const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/temp-view/:id" element={<TargetDataView />} />
      <Route path="*" element={<Dashboard />} />
    </Routes>
  );
};

export default App;
