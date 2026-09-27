import React from 'react';
import {
  LayoutDashboard,
  Activity,
  BarChart2,
  TrendingUp,
  Cpu,
  Search,
  Scale,
  Smartphone,
  FileText,
  ShieldCheck,
} from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isBackendHealthy: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, isBackendHealthy }) => {
  const navItems = [
    { id: 'overview', label: 'Overview & Hub', icon: LayoutDashboard },
    { id: 'live', label: 'Live Monitor', icon: Activity },
    { id: 'comparison', label: 'Method Comparison', icon: BarChart2 },
    { id: 'scalability', label: 'Scalability & Saturation', icon: TrendingUp },
    { id: 'bottlenecks', label: 'Bottlenecks', icon: Cpu },
    { id: 'traces', label: 'Trace Explorer', icon: Search },
    { id: 'statistics', label: 'Statistical Inference', icon: Scale },
    { id: 'human-lab', label: 'Human Interaction', icon: Smartphone },
    { id: 'paper-export', label: 'Paper Exporter', icon: FileText },
  ];

  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Platform Info */}
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-tr from-teal-600 to-emerald-400 rounded-lg shadow-lg shadow-teal-500/20">
              <ShieldCheck className="w-6 h-6 text-slate-950 font-bold" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg text-white tracking-tight">QR+OTP Benchmark Lab</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-teal-950 text-teal-300 border border-teal-800 font-mono">
                  v1.0-RESEARCH
                </span>
              </div>
              <p className="text-xs text-slate-400">IEEE Empirical Performance Evaluation Platform</p>
            </div>
          </div>

          {/* System Status Indicator */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-xs font-mono bg-slate-950/80 px-3 py-1.5 rounded-md border border-slate-800">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  isBackendHealthy ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'
                }`}
              />
              <span className="text-slate-300">
                {isBackendHealthy ? 'BACKEND ONLINE :4000' : 'DISCONNECTED'}
              </span>
            </div>
          </div>
        </div>

        {/* Tab Navigation Menu */}
        <nav className="flex space-x-1 overflow-x-auto pb-2 scrollbar-none">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center space-x-2 px-3 py-2 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-teal-500/10 text-teal-400 border border-teal-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-teal-400' : 'text-slate-500'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
