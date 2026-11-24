import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { FileText, Download, CheckCircle2, AlertTriangle, Cpu, HardDrive, Clock, Layers } from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchReport = () => {
    setLoading(true);
    api.getSummaryReport()
      .then((data: any) => {
        setReport(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchReport();
  }, []);

  const handleDownloadCsv = () => {
    window.open(api.getExportUrl('csv'), '_blank');
  };

  const handleDownloadJson = () => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mini_os_report_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 pb-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-display font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-cyan-400" />
            SYSTEM AUDIT & PERFORMANCE REPORTS
          </h1>
          <p className="text-xs font-mono text-slate-400 mt-0.5">
            Statistical aggregation compiled by C++ ReportManager engine
          </p>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleDownloadCsv}
            className="px-4 py-2 rounded-lg bg-bg-secondary/80 border border-slate-700 hover:border-cyan-400 text-xs font-mono text-cyan-300 flex items-center gap-1.5 transition-all"
          >
            <Download className="w-4 h-4" />
            EXPORT AS CSV
          </button>
          <button
            onClick={handleDownloadJson}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-black text-xs font-mono font-bold shadow-cyan-glow hover:brightness-110 flex items-center gap-1.5 transition-all"
          >
            <Download className="w-4 h-4" />
            EXPORT AS JSON
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center font-mono text-slate-400 text-sm">
          Compiling kernel report metrics from backend...
        </div>
      ) : report ? (
        <div className="space-y-5">
          {/* Top Status Card */}
          <div className="p-5 rounded-2xl bg-bg-card/80 border border-cyan-500/30 backdrop-blur-md flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-[10px] font-mono text-slate-400 uppercase">SYSTEM HEALTH INDEX</div>
              <div className="text-2xl font-display font-bold text-white flex items-center gap-2 mt-0.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span>{report.system_status}</span>
              </div>
            </div>

            <div>
              <div className="text-[10px] font-mono text-slate-400 uppercase">SYSTEM UPTIME</div>
              <div className="text-lg font-mono font-bold text-cyan-300 mt-0.5">
                {report.uptime_formatted}
              </div>
            </div>

            <div>
              <div className="text-[10px] font-mono text-slate-400 uppercase">REPORT IDENTIFIER</div>
              <div className="text-xs font-mono text-slate-300 mt-0.5">
                {report.report_id}
              </div>
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Process Metrics */}
            <div className="p-4 rounded-xl bg-bg-card/75 border border-slate-800 backdrop-blur-md space-y-3">
              <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 font-bold uppercase pb-2 border-b border-slate-800">
                <Layers className="w-4 h-4" />
                <span>PROCESS METRICS</span>
              </div>
              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Tracked:</span>
                  <span className="text-white font-bold">{report.process_metrics?.total_processes_tracked}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Active Processes:</span>
                  <span className="text-emerald-400 font-bold">{report.process_metrics?.active_processes}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Terminated:</span>
                  <span className="text-slate-500">{report.process_metrics?.terminated_processes}</span>
                </div>
              </div>
            </div>

            {/* Hardware Utilization */}
            <div className="p-4 rounded-xl bg-bg-card/75 border border-slate-800 backdrop-blur-md space-y-3">
              <div className="flex items-center gap-2 text-xs font-mono text-blue-400 font-bold uppercase pb-2 border-b border-slate-800">
                <Cpu className="w-4 h-4" />
                <span>HARDWARE METRICS</span>
              </div>
              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-400">Current CPU:</span>
                  <span className="text-cyan-300 font-bold">{report.resource_metrics?.current_cpu_usage}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Allocated RAM:</span>
                  <span className="text-blue-300 font-bold">{report.resource_metrics?.current_memory_usage_mb} MB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">RAM Pressure:</span>
                  <span className="text-white">{report.resource_metrics?.memory_percentage}%</span>
                </div>
              </div>
            </div>

            {/* Alert & Incident Stats */}
            <div className="p-4 rounded-xl bg-bg-card/75 border border-slate-800 backdrop-blur-md space-y-3">
              <div className="flex items-center gap-2 text-xs font-mono text-red-400 font-bold uppercase pb-2 border-b border-slate-800">
                <AlertTriangle className="w-4 h-4" />
                <span>INCIDENT AUDIT</span>
              </div>
              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Alerts:</span>
                  <span className="text-white font-bold">{report.alert_metrics?.total_alerts_generated}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Unacknowledged:</span>
                  <span className="text-red-400 font-bold">{report.alert_metrics?.active_unacknowledged_alerts}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Critical Count:</span>
                  <span className="text-yellow-400">{report.alert_metrics?.critical_alerts_count}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
