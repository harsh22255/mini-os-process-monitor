import React, { useState, useEffect, useRef } from 'react';
import { useOS } from '../context/OSContext';
import { SceneContainer } from '../components/3d/SceneContainer';
import { ProcessLifecycle3D } from '../components/3d/ProcessLifecycle3D';
import { api } from '../services/api';
import { StateTransition, Process } from '../types';
import { GitBranch, Play, Pause, RotateCcw, Filter, History, ChevronDown, Search, X } from 'lucide-react';

export const LifecyclePage: React.FC = () => {
  const { snapshot, selectedPid, setSelectedPid } = useOS();
  const [history, setHistory] = useState<StateTransition[]>([]);
  const [pidFilter, setPidFilter] = useState<string>('ALL');
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [dropdownOpen, setDropdownOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchHistory = () => {
    api.getLifecycleHistory(100).then((data: StateTransition[]) => {
      if (data) setHistory(data);
    }).catch(() => {});
  };

  useEffect(() => {
    fetchHistory();
    const interval = setInterval(fetchHistory, 1500);
    return () => clearInterval(interval);
  }, []);

  const processes = snapshot?.processes || [];

  const filteredProcesses = processes.filter((p: Process) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.pid.toString().includes(q);
  });

  const selectedProcessObj = processes.find((p) => p.pid.toString() === pidFilter);

  const filteredHistory = history.filter((h) => {
    if (pidFilter !== 'ALL' && h.pid.toString() !== pidFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6 pb-8 animate-fade-in">
      {/* Page Header & Lifecycle Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-display font-bold text-white flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-cyan-400" />
            3D PROCESS LIFECYCLE STATE MACHINE
          </h1>
          <p className="text-xs font-mono text-slate-400 mt-0.5">
            Finite-state automaton validated by C++ StateManager engine
          </p>
        </div>

        {/* Controls Toolbar */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Custom Futuristic Dark Holographic PID Filter Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 bg-bg-secondary/90 hover:bg-bg-secondary border border-slate-700/80 hover:border-cyan-500/50 px-3 py-1.5 rounded-lg text-xs font-mono transition-all focus:outline-none shadow-sm"
            >
              <Filter className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-slate-400">Track PID:</span>
              <span className="text-white font-bold max-w-[140px] sm:max-w-[190px] truncate">
                {pidFilter === 'ALL'
                  ? 'ALL PROCESSES'
                  : selectedProcessObj
                  ? `PID #${selectedProcessObj.pid} - ${selectedProcessObj.name}`
                  : `PID #${pidFilter}`}
              </span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                  dropdownOpen ? 'rotate-180 text-cyan-400' : ''
                }`}
              />
            </button>

            {dropdownOpen && (
              <div className="absolute left-0 sm:left-auto sm:right-0 mt-2 w-72 sm:w-84 max-h-80 bg-[#080F1E] border border-cyan-500/40 rounded-xl shadow-2xl backdrop-blur-xl z-50 flex flex-col overflow-hidden animate-fade-in">
                {/* Search Header for 300+ processes */}
                <div className="p-2.5 border-b border-slate-800/80 bg-slate-900/80 flex items-center gap-2">
                  <Search className="w-3.5 h-3.5 text-cyan-400 shrink-0 ml-1" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search PID or name..."
                    autoFocus
                    className="w-full bg-transparent text-xs font-mono text-white placeholder-slate-500 focus:outline-none"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="text-slate-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Option list */}
                <div className="overflow-y-auto max-h-60 divide-y divide-slate-800/40 text-xs font-mono">
                  {/* ALL PROCESSES option */}
                  <div
                    onClick={() => {
                      setPidFilter('ALL');
                      setSelectedPid(null);
                      setDropdownOpen(false);
                      setSearchQuery('');
                    }}
                    className={`px-3 py-2 flex items-center justify-between cursor-pointer transition-colors ${
                      pidFilter === 'ALL'
                        ? 'bg-cyan-500/20 text-cyan-300 font-bold border-l-2 border-cyan-400'
                        : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                    }`}
                  >
                    <span>ALL PROCESSES</span>
                    <span className="text-[10px] text-slate-500 font-normal">
                      {processes.length} total
                    </span>
                  </div>

                  {/* Filtered process items */}
                  {filteredProcesses.map((p) => {
                    const isSelected = pidFilter === p.pid.toString();
                    const stateDotColor =
                      p.state === 'RUNNING'
                        ? 'bg-emerald-400'
                        : p.state === 'READY'
                        ? 'bg-cyan-400'
                        : p.state === 'WAITING'
                        ? 'bg-yellow-400'
                        : p.state === 'SUSPENDED'
                        ? 'bg-purple-400'
                        : 'bg-red-400';

                    return (
                      <div
                        key={p.pid}
                        onClick={() => {
                          setPidFilter(p.pid.toString());
                          setSelectedPid(p.pid);
                          setDropdownOpen(false);
                          setSearchQuery('');
                        }}
                        className={`px-3 py-2 flex items-center justify-between cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-cyan-500/20 text-cyan-300 font-bold border-l-2 border-cyan-400'
                            : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate pr-2">
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${stateDotColor}`} />
                          <span className="font-semibold text-white">PID #{p.pid}</span>
                          <span className="truncate text-slate-400 text-[11px]">{p.name}</span>
                        </div>
                        <span className="text-[10px] text-slate-500 shrink-0 uppercase">
                          {p.state}
                        </span>
                      </div>
                    );
                  })}

                  {filteredProcesses.length === 0 && (
                    <div className="p-4 text-center text-slate-500 text-xs">
                      No matching processes found
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => setIsPaused(!isPaused)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-mono font-bold flex items-center gap-1.5 transition-all ${
              isPaused
                ? 'bg-yellow-500/20 border-yellow-500/40 text-yellow-300'
                : 'bg-bg-secondary border-slate-700 text-slate-300 hover:text-white'
            }`}
          >
            {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            {isPaused ? 'RESUME ANIMATION' : 'PAUSE'}
          </button>

          <button
            onClick={fetchHistory}
            className="px-3 py-1.5 rounded-lg bg-bg-secondary border border-slate-700 text-xs font-mono text-slate-300 hover:text-white flex items-center gap-1.5 transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
            SYNC HISTORY
          </button>
        </div>
      </div>

      {/* 3D State Machine Viewport */}
      <div className="h-[460px] rounded-2xl bg-bg-card/75 border border-cyan-500/30 p-2 backdrop-blur-md relative overflow-hidden shadow-cyan-glow">
        <div className="absolute top-4 left-5 z-10 pointer-events-none">
          <span className="px-2.5 py-1 rounded-md bg-cyan-950/80 border border-cyan-500/40 text-[10px] font-mono text-cyan-300 font-bold tracking-widest uppercase">
            3D FINITE-STATE AUTOMATON PIPELINE
          </span>
        </div>

        <SceneContainer cameraPosition={[0, 0, 9]} enableControls={true}>
          <ProcessLifecycle3D selectedPidFilter={pidFilter === 'ALL' ? null : parseInt(pidFilter)} />
        </SceneContainer>

        <div className="absolute bottom-4 left-5 right-5 z-10 flex items-center justify-between text-[11px] font-mono text-slate-400 bg-bg-dark/85 backdrop-blur-md px-3.5 py-2 rounded-xl border border-slate-800">
          <span>Active Pipeline: NEW ➔ READY ➔ RUNNING ➔ WAITING ➔ SUSPENDED ➔ TERMINATED</span>
          <span className="text-cyan-400 font-bold">STATE VERIFIED</span>
        </div>
      </div>

      {/* Transition History Table */}
      <div className="bg-bg-card/70 border border-slate-800/80 rounded-xl overflow-hidden backdrop-blur-md p-4">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
              REAL-TIME LIFECYCLE TRANSITION LOG
            </h3>
          </div>
          <span className="text-[10px] font-mono text-slate-400">
            Showing {filteredHistory.length} recorded events
          </span>
        </div>

        <div className="overflow-x-auto max-h-72 overflow-y-auto">
          <table className="w-full text-left border-collapse text-xs font-mono">
            <thead className="bg-bg-dark/80 text-[10px] uppercase text-slate-400 sticky top-0 border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">TRANSITION ID</th>
                <th className="py-2.5 px-3">TIMESTAMP</th>
                <th className="py-2.5 px-3">PID</th>
                <th className="py-2.5 px-3">NAME</th>
                <th className="py-2.5 px-3">TRANSITION</th>
                <th className="py-2.5 px-3">REASON</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredHistory.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-500">
                    No transition events recorded yet for the selected filter.
                  </td>
                </tr>
              ) : (
                filteredHistory.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-2.5 px-3 text-slate-500">#{t.id}</td>
                    <td className="py-2.5 px-3 text-slate-400">{t.timestamp}</td>
                    <td className="py-2.5 px-3 font-bold text-cyan-300">#{t.pid}</td>
                    <td className="py-2.5 px-3 text-white">{t.process_name}</td>
                    <td className="py-2.5 px-3 font-bold text-cyan-400">
                      {t.from_state} <span className="text-slate-500 font-normal">➔</span> {t.to_state}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400">{t.reason}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
