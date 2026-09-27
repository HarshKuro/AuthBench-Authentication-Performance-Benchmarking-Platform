import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { OverviewTab } from './components/OverviewTab';
import { LiveBenchmarkTab } from './components/LiveBenchmarkTab';
import { ComparisonTab } from './components/ComparisonTab';
import { ScalabilityTab } from './components/ScalabilityTab';
import { BottlenecksTab } from './components/BottlenecksTab';
import { TraceExplorerTab } from './components/TraceExplorerTab';
import { StatisticalTab } from './components/StatisticalTab';
import { HumanLabTab } from './components/HumanLabTab';
import { PaperExportTab } from './components/PaperExportTab';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [isBackendHealthy, setIsBackendHealthy] = useState<boolean>(true);

  // Health check loop
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch('/health');
        setIsBackendHealthy(res.ok);
      } catch {
        setIsBackendHealthy(false);
      }
    };
    checkHealth();
    const interval = setInterval(checkHealth, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleStartExperiment = (id: string) => {
    setActiveTab('live');
  };

  const handleRunSuite = () => {
    setActiveTab('live');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-teal-500 selection:text-slate-950">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isBackendHealthy={isBackendHealthy}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'overview' && (
          <OverviewTab
            onStartExperiment={handleStartExperiment}
            onRunSuite={handleRunSuite}
          />
        )}
        {activeTab === 'live' && <LiveBenchmarkTab />}
        {activeTab === 'comparison' && <ComparisonTab />}
        {activeTab === 'scalability' && <ScalabilityTab />}
        {activeTab === 'bottlenecks' && <BottlenecksTab />}
        {activeTab === 'traces' && <TraceExplorerTab />}
        {activeTab === 'statistics' && <StatisticalTab />}
        {activeTab === 'human-lab' && <HumanLabTab />}
        {activeTab === 'paper-export' && <PaperExportTab />}
      </main>

      <footer className="border-t border-slate-900 bg-slate-950 py-4 text-center text-xs text-slate-500 font-mono">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>QR + OTP E-Authentication Performance Evaluation Laboratory</span>
          <span>Standards: IEEE / ACM Empirical Systems Research</span>
        </div>
      </footer>
    </div>
  );
};
