import React from 'react';
import { 
  LayoutDashboard, 
  Cpu, 
  GitBranch, 
  Network, 
  AlertTriangle, 
  Terminal, 
  FileText, 
  Settings, 
  Compass
} from 'lucide-react';
import { useOS } from '../../context/OSContext';

export type PageId = 
  | 'dashboard' 
  | 'explorer' 
  | 'resources' 
  | 'lifecycle' 
  | 'topology' 
  | 'alerts' 
  | 'logs' 
  | 'reports' 
  | 'settings';

interface SidebarProps {
  activePage: PageId;
  onSelectPage: (page: PageId) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activePage, onSelectPage }) => {
  const { snapshot } = useOS();
  const alertCount = snapshot?.active_alert_count || 0;
  const activeProcesses = snapshot?.processes.filter((p) => p.state !== 'TERMINATED').length || 0;

  const navItems: Array<{ id: PageId; label: string; icon: any; badge?: number | string; badgeColor?: string }> = [
    { id: 'dashboard', label: 'Command Center', icon: LayoutDashboard },
    { id: 'explorer', label: 'Process Explorer', icon: Compass, badge: activeProcesses },
    { id: 'resources', label: 'Resource Monitor', icon: Cpu },
    { id: 'lifecycle', label: 'Process Lifecycle', icon: GitBranch },
    { id: 'topology', label: 'System Topology', icon: Network },
    { 
      id: 'alerts', 
      label: 'Alerts Center', 
      icon: AlertTriangle, 
      badge: alertCount > 0 ? alertCount : undefined,
      badgeColor: alertCount > 0 ? 'bg-red-500 text-white animate-pulse' : undefined
    },
    { id: 'logs', label: 'Activity Logs', icon: Terminal },
    { id: 'reports', label: 'Reports & Export', icon: FileText },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 border-r border-cyan-500/20 bg-bg-navy/60 backdrop-blur-md flex flex-col justify-between py-6 px-3 shrink-0">
      <div className="space-y-1.5">
        <div className="px-3 pb-3 text-[10px] font-mono tracking-widest text-slate-500 uppercase font-bold">
          CORE MODULES
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelectPage(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-mono transition-all group ${
                isActive
                  ? 'bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 shadow-cyan-glow font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/40 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                  isActive ? 'text-cyan-400' : 'text-slate-500 group-hover:text-cyan-400'
                }`} />
                <span>{item.label}</span>
              </div>

              {item.badge !== undefined && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  item.badgeColor || 'bg-slate-800 text-slate-300 border border-slate-700'
                }`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Engine Status Bottom Card */}
      <div className="p-3.5 rounded-xl bg-bg-card/70 border border-slate-800/80 text-[11px] font-mono">
        <div className="flex items-center justify-between text-slate-400 mb-1.5">
          <span>SOURCE OF TRUTH</span>
          <span className="text-cyan-400 font-bold">C++17 STL</span>
        </div>
        <div className="text-[10px] text-slate-500 leading-relaxed">
          Preemptive scheduler, mutex locks & atomic synchronization active.
        </div>
      </div>
    </aside>
  );
};
