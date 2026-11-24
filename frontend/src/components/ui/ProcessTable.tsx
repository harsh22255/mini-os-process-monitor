import React, { useState, useMemo } from 'react';
import { Process, ProcessState } from '../../types';
import { useOS } from '../../context/OSContext';
import { getStateColor } from '../3d/ProcessParticleCloud3D';
import { Search, ArrowUpDown, Play, Pause, XCircle, Info, AlertTriangle } from 'lucide-react';

export const ProcessTable: React.FC<{
  processes?: Process[];
  onInspect?: (proc: Process) => void;
}> = ({ processes: propProcesses, onInspect }) => {
  const { snapshot, selectedPid, setSelectedPid, terminateProcess, suspendProcess, resumeProcess } = useOS();

  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'pid' | 'cpu' | 'mem' | 'priority'>('cpu');
  const [sortDesc, setSortDesc] = useState(true);

  const rawProcesses = propProcesses || snapshot?.processes || [];

  const filtered = useMemo(() => {
    return rawProcesses
      .filter((p) => {
        if (stateFilter !== 'ALL' && p.state !== stateFilter) return false;
        if (!search) return true;
        const s = search.toLowerCase();
        return p.name.toLowerCase().includes(s) || p.pid.toString().includes(s);
      })
      .sort((a, b) => {
        let diff = 0;
        if (sortBy === 'pid') diff = a.pid - b.pid;
        else if (sortBy === 'cpu') diff = a.cpu_usage - b.cpu_usage;
        else if (sortBy === 'mem') diff = a.memory_usage - b.memory_usage;
        else if (sortBy === 'priority') diff = a.priority - b.priority;
        return sortDesc ? -diff : diff;
      });
  }, [rawProcesses, search, stateFilter, sortBy, sortDesc]);

  const handleSort = (field: 'pid' | 'cpu' | 'mem' | 'priority') => {
    if (sortBy === field) {
      setSortDesc(!sortDesc);
    } else {
      setSortBy(field);
      setSortDesc(true);
    }
  };

  return (
    <div className="bg-bg-card/70 border border-slate-800/80 rounded-xl overflow-hidden backdrop-blur-md flex flex-col h-full">
      {/* Table Header Filter & Search Toolbar */}
      <div className="p-4 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 bg-bg-navy/50">
        <div className="flex items-center gap-2 flex-1 min-w-[220px]">
          <div className="relative w-full max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by PID or process name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-bg-secondary/80 border border-slate-700/60 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:shadow-cyan-glow transition-all"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 bg-bg-secondary/70 border border-slate-700/60 rounded-lg p-0.5 text-xs font-mono">
            {['ALL', 'RUNNING', 'READY', 'WAITING', 'SUSPENDED', 'TERMINATED'].map((st) => (
              <button
                key={st}
                onClick={() => setStateFilter(st)}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all ${
                  stateFilter === st
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto overflow-y-auto flex-1">
        <table className="w-full text-left border-collapse">
          <thead className="bg-bg-dark/80 text-[10px] font-mono uppercase tracking-wider text-slate-400 sticky top-0 z-10 border-b border-slate-800">
            <tr>
              <th className="py-3 px-4 cursor-pointer hover:text-cyan-300" onClick={() => handleSort('pid')}>
                <div className="flex items-center gap-1">PID <ArrowUpDown className="w-3 h-3" /></div>
              </th>
              <th className="py-3 px-4">NAME</th>
              <th className="py-3 px-4 cursor-pointer hover:text-cyan-300" onClick={() => handleSort('priority')}>
                <div className="flex items-center gap-1">PRIORITY <ArrowUpDown className="w-3 h-3" /></div>
              </th>
              <th className="py-3 px-4">STATE</th>
              <th className="py-3 px-4 cursor-pointer hover:text-cyan-300" onClick={() => handleSort('cpu')}>
                <div className="flex items-center gap-1">CPU <ArrowUpDown className="w-3 h-3" /></div>
              </th>
              <th className="py-3 px-4 cursor-pointer hover:text-cyan-300" onClick={() => handleSort('mem')}>
                <div className="flex items-center gap-1">MEMORY <ArrowUpDown className="w-3 h-3" /></div>
              </th>
              <th className="py-3 px-4">ALERT</th>
              <th className="py-3 px-4 text-right">ACTIONS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-xs font-mono">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-500">
                  No processes match the active filters.
                </td>
              </tr>
            ) : (
              filtered.map((proc) => {
                const isSelected = selectedPid === proc.pid;
                const stateColor = getStateColor(proc.state);

                return (
                  <tr
                    key={proc.pid}
                    onClick={() => {
                      setSelectedPid(proc.pid);
                      if (onInspect) onInspect(proc);
                    }}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-cyan-500/15 border-l-2 border-l-cyan-400'
                        : 'hover:bg-slate-800/30'
                    }`}
                  >
                    <td className="py-3 px-4 font-bold text-cyan-300">#{proc.pid}</td>
                    <td className="py-3 px-4 text-white font-medium flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: stateColor }} />
                      <span>{proc.name}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        proc.priority >= 9
                          ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                          : proc.priority >= 7
                          ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                          : 'bg-slate-800 text-slate-300'
                      }`}>
                        P{proc.priority}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className="px-2 py-0.5 rounded text-[10px] font-bold border tracking-wider"
                        style={{
                          color: stateColor,
                          borderColor: `${stateColor}40`,
                          backgroundColor: `${stateColor}15`,
                        }}
                      >
                        {proc.state}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold ${proc.cpu_usage > 50 ? 'text-red-400' : 'text-slate-300'}`}>
                          {proc.cpu_usage.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-slate-300">{proc.memory_usage.toFixed(0)} MB</span>
                      <span className="text-slate-500 text-[10px] ml-1">({proc.memory_percentage.toFixed(1)}%)</span>
                    </td>
                    <td className="py-3 px-4">
                      {proc.has_alert ? (
                        <span className="flex items-center gap-1 text-[10px] text-red-400 font-bold bg-red-500/10 px-2 py-0.5 rounded border border-red-500/30">
                          <AlertTriangle className="w-3 h-3" />
                          <span>{proc.alert_msg || 'Alert'}</span>
                        </span>
                      ) : (
                        <span className="text-slate-600 text-[10px]">Normal</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                        {proc.state === 'SUSPENDED' ? (
                          <button
                            onClick={() => resumeProcess(proc.pid)}
                            title="Resume Process"
                            className="p-1 rounded bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 transition-all"
                          >
                            <Play className="w-3.5 h-3.5" />
                          </button>
                        ) : proc.state !== 'TERMINATED' ? (
                          <button
                            onClick={() => suspendProcess(proc.pid)}
                            title="Suspend Process"
                            className="p-1 rounded bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30 transition-all"
                          >
                            <Pause className="w-3.5 h-3.5" />
                          </button>
                        ) : null}

                        {proc.state !== 'TERMINATED' && (
                          <button
                            onClick={() => terminateProcess(proc.pid)}
                            title="Terminate Process"
                            className="p-1 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <button
                          onClick={() => {
                            setSelectedPid(proc.pid);
                            if (onInspect) onInspect(proc);
                          }}
                          title="Inspect Details"
                          className="p-1 rounded bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 transition-all"
                        >
                          <Info className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
