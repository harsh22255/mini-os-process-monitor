import React, { useState, useEffect } from 'react';
import { OSProvider, useOS } from './context/OSContext';
import { Navbar } from './components/ui/Navbar';
import { Sidebar, PageId } from './components/ui/Sidebar';
import { CinematicIntro } from './components/3d/CinematicIntro';
import { CreateProcessModal } from './components/ui/CreateProcessModal';
import { NotificationToast } from './components/ui/NotificationToast';

import { DashboardPage } from './pages/DashboardPage';
import { ExplorerPage } from './pages/ExplorerPage';
import { ResourcePage } from './pages/ResourcePage';
import { LifecyclePage } from './pages/LifecyclePage';
import { TopologyPage } from './pages/TopologyPage';
import { AlertsPage } from './pages/AlertsPage';
import { LogsPage } from './pages/LogsPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';

const AppContent: React.FC = () => {
  const [activePage, setActivePage] = useState<PageId>('dashboard');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [showIntro, setShowIntro] = useState(() => {
    return !sessionStorage.getItem('mini_os_intro_seen');
  });

  const handleFinishIntro = () => {
    sessionStorage.setItem('mini_os_intro_seen', 'true');
    setShowIntro(false);
  };

  return (
    <div className="min-h-screen bg-[#05070D] text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-300">
      {/* 3D Cinematic Introduction Overlay */}
      {showIntro && <CinematicIntro onComplete={handleFinishIntro} />}

      {/* Futuristic Navbar */}
      <Navbar onOpenCreateModal={() => setIsCreateModalOpen(true)} />

      {/* Main Workspace with Sidebar & Dynamic Viewport */}
      <div className="flex-1 flex overflow-hidden">
        <Sidebar activePage={activePage} onSelectPage={setActivePage} />

        <main className="flex-1 overflow-y-auto p-6 bg-gradient-to-br from-[#05070D] via-[#080F1E] to-[#0A1325]">
          {activePage === 'dashboard' && (
            <DashboardPage
              onNavigate={(page) => setActivePage(page)}
              onOpenCreate={() => setIsCreateModalOpen(true)}
            />
          )}
          {activePage === 'explorer' && (
            <ExplorerPage onOpenCreate={() => setIsCreateModalOpen(true)} />
          )}
          {activePage === 'resources' && <ResourcePage />}
          {activePage === 'lifecycle' && <LifecyclePage />}
          {activePage === 'topology' && <TopologyPage />}
          {activePage === 'alerts' && <AlertsPage />}
          {activePage === 'logs' && <LogsPage />}
          {activePage === 'reports' && <ReportsPage />}
          {activePage === 'settings' && <SettingsPage />}
        </main>
      </div>

      {/* Create Process Modal */}
      <CreateProcessModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />

      {/* Floating Holographic Toasts */}
      <NotificationToast />
    </div>
  );
};

export default function App() {
  return (
    <OSProvider>
      <AppContent />
    </OSProvider>
  );
}
