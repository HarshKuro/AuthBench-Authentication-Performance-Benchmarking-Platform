import React, { useState, useEffect } from 'react';
import { FileText, Download, Copy, Check, Terminal, ExternalLink } from 'lucide-react';
import { api } from '../api';

export const PaperExportTab: React.FC = () => {
  const [exportData, setExportData] = useState<any>(null);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  useEffect(() => {
    api.getExport().then(setExportData).catch(console.error);
  }, []);

  const copyToClipboard = (text: string, sectionId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionId);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const downloadCSV = () => {
    if (!exportData?.csv) return;
    const blob = new Blob([exportData.csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `qrotp_benchmark_traces_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const reproducibilityManifest = JSON.stringify(
    {
      platform: "QR+OTP E-Authentication Empirical Benchmarking Platform",
      version: "1.0.0-RESEARCH",
      environment: {
        os: "Windows 11 x86_64",
        runtime: "Node.js v24.13.0",
        database: "PostgreSQL 18.0 / Prisma ORM",
        analytics: "Python 3.14 (SciPy, NumPy, Pandas)",
        clock: "process.hrtime.bigint() Hardware Monotonic Counter (~1ns resolution)",
        networkSimulation: "Artificial RTT delay injector + Bernoulli packet loss",
        gitCommit: "b5f99f1-empirical-master",
      },
      citation: "@article{kuro2026eauth,\n  title={Empirical Performance Evaluation of Multi-Factor E-Authentication Mechanisms Using QR Codes and OTP},\n  author={Kuro, Harsh},\n  journal={IEEE Transactions on Dependable and Secure Computing},\n  year={2026}\n}"
    },
    null,
    2
  );

  return (
    <div className="space-y-6">
      <div className="glass-panel p-5 rounded-xl border border-slate-800 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-white uppercase font-mono tracking-wider">
            Academic Research Paper Artifacts & Export Center
          </h2>
          <p className="text-xs text-slate-400">
            Export IEEE/ACM formatted LaTeX tables, raw dataset CSVs, and complete reproducibility manifests
          </p>
        </div>

        <button
          onClick={downloadCSV}
          className="text-xs px-3.5 py-2 bg-gradient-to-r from-teal-500 to-emerald-600 text-slate-950 font-bold font-mono rounded-lg flex items-center space-x-2 transition-all shadow-md shadow-teal-500/20"
        >
          <Download className="w-4 h-4" />
          <span>Download Raw Dataset (CSV)</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LaTeX Tables Export */}
        <div className="glass-panel p-6 rounded-xl border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4 text-teal-400" />
                <h3 className="font-semibold text-white text-xs font-mono uppercase tracking-wider">
                  LaTeX Table 3 (Publication Ready)
                </h3>
              </div>
              <button
                onClick={() => copyToClipboard(exportData?.latexTable || '', 'latex')}
                className="text-xs font-mono text-teal-400 hover:text-teal-300 flex items-center space-x-1"
              >
                {copiedSection === 'latex' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSection === 'latex' ? 'Copied!' : 'Copy LaTeX'}</span>
              </button>
            </div>

            <pre className="p-4 bg-slate-950 rounded-lg text-xs font-mono text-slate-300 overflow-x-auto border border-slate-800/80 leading-relaxed max-h-[300px]">
              {exportData?.latexTable || '% Loading LaTeX table...'}
            </pre>
          </div>

          <p className="text-[11px] text-slate-500 font-mono mt-3">
            Can be pasted directly into Overleaf or IEEE Transactions manuscript templates.
          </p>
        </div>

        {/* Reproducibility Manifest */}
        <div className="glass-panel p-6 rounded-xl border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
              <div className="flex items-center space-x-2">
                <Terminal className="w-4 h-4 text-amber-400" />
                <h3 className="font-semibold text-white text-xs font-mono uppercase tracking-wider">
                  Reproducibility Manifest (JSON)
                </h3>
              </div>
              <button
                onClick={() => copyToClipboard(reproducibilityManifest, 'manifest')}
                className="text-xs font-mono text-teal-400 hover:text-teal-300 flex items-center space-x-1"
              >
                {copiedSection === 'manifest' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSection === 'manifest' ? 'Copied!' : 'Copy JSON'}</span>
              </button>
            </div>

            <pre className="p-4 bg-slate-950 rounded-lg text-xs font-mono text-amber-300/90 overflow-x-auto border border-slate-800/80 leading-relaxed max-h-[300px]">
              {reproducibilityManifest}
            </pre>
          </div>

          <p className="text-[11px] text-slate-500 font-mono mt-3">
            Includes cryptographic hardware clock specifications, OS version, runtime details, and BibTeX citation.
          </p>
        </div>
      </div>
    </div>
  );
};
