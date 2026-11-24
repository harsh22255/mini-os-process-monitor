import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { LogEntry } from '../types';
import { Terminal, Search, Download, Trash2, Filter } from 'lucide-react';

export const LogsPage: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [category, setCategory] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');
  const [autoScroll, setAutoScroll] = useState<boolean>(true);

  const fetchLogs = () => {
    api.getLogs(category, search).then((data: LogEntry[]) => {
      if (data) setLogs(data);
    }).catch(() => {});
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 1500);
    return () => clearInterval(interval);
  }, [category, search]);

  const handleExportCsv = () => {
    window.open(api.getExportUrl('csv'), '_blank');
  };

  return (
    <div className="space-y-6 pb-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-display font-bold text-white flex items-center gap-2">
            <Terminal className="w-5 h-5 text-cyan-400" />
            OPERATING SYSTEM ACTIVITY LOGS
          </h1>
          <p className="text-xs font-mono text-slate-400 mt-0.5">
            Audit trail emitted by C++ ActivityLogger ring buffer
          </p>
        </div>

        {/* Action Toolbar */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportCsv}
            className="px-3.5 py-2 rounded-lg bg-bg-secondary/80 border border-slate-700 hover:border-cyan-400 text-xs font-mono text-cyan-300 flex items-center gap-1.5 transition-all"
          >
            <Download className="w-4 h-4" />
            EXPORT LOGS (CSV)
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 rounded-xl bg-bg-card/75 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search log messages or categories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-bg-secondary/80 border border-slate-700 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-bg-secondary/80 border border-slate-700 p-1 rounded-lg text-xs font-mono">
          <Filter className="w-3.5 h-3.5 text-cyan-400 ml-1.5 mr-1" />
          {['ALL', 'PROCESS', 'LIFECYCLE', 'RESOURCE', 'ALERT', 'SYSTEM'].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all ${
                category === cat
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-cyan-glow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Terminal Display */}
      <div className="rounded-xl bg-[#03060C] border border-cyan-500/30 p-4 shadow-cyan-glow font-mono text-xs overflow-hidden flex flex-col h-[520px]">
        {/* Terminal Header */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800 text-[11px] text-slate-500">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="ml-2 text-cyan-400 font-bold">TTY /dev/pts/kernel_logger</span>
          </div>
          <div>Buffer: {logs.length} entries</div>
        </div>

        {/* Terminal Stream */}
        <div className="flex-1 overflow-y-auto space-y-1.5 pr-2 select-text">
          {logs.length === 0 ? (
            <div className="text-slate-500 italic py-6">No matching logs in buffer.</div>
          ) : (
            logs.map((log) => {
              const isErr = log.severity === 'ERROR' || log.severity === 'CRITICAL';
              const isWarn = log.severity === 'WARNING';
              const color = isErr ? 'text-red-400' : isWarn ? 'text-yellow-400' : 'text-emerald-400';

              return (
                <div key={log.id} className="flex items-start gap-2 text-[11px] hover:bg-slate-900/60 p-0.5 rounded">
                  <span className="text-slate-600 shrink-0">[{log.timestamp}]</span>
                  <span className={`font-bold shrink-0 ${color}`}>[{log.category}]</span>
                  <span className="text-slate-500 shrink-0">[{log.severity}]</span>
                  <span className="text-slate-200">{log.message}</span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
