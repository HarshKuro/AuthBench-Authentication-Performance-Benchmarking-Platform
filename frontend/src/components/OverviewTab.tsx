import React, { useState, useEffect } from 'react';
import { Play, PlusCircle, CheckCircle2, FlaskConical, Layers, Zap, StopCircle, RefreshCw } from 'lucide-react';
import { api } from '../api';

interface OverviewTabProps {
  onStartExperiment: (id: string) => void;
  onRunSuite: () => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({ onStartExperiment, onRunSuite }) => {
  const [overview, setOverview] = useState<any>(null);
  const [experiments, setExperiments] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [suiteLoading, setSuiteLoading] = useState<boolean>(false);

  // Form State
  const [title, setTitle] = useState('');
  const [authMethod, setAuthMethod] = useState<'PASSWORD' | 'OTP' | 'QR' | 'QR_OTP'>('QR_OTP');
  const [loadModel, setLoadModel] = useState<'CLOSED_CONCURRENCY' | 'OPEN_ARRIVAL_RATE'>('CLOSED_CONCURRENCY');
  const [targetVUs, setTargetVUs] = useState(25);
  const [durationSec, setDurationSec] = useState(10);
  const [repetitions, setRepetitions] = useState(1);
  const [networkProfile, setNetworkProfile] = useState('LAN_0MS');

  const fetchData = async () => {
    try {
      const [ov, exps] = await Promise.all([api.getOverview(), api.getExperiments()]);
      setOverview(ov);
      setExperiments(exps);
    } catch (e) {
      console.error('Failed to fetch overview data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleCreateAndRun = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const addedLatencyMs =
        networkProfile === 'BROADBAND_50MS' ? 50 : networkProfile === '4G_100MS' ? 100 : networkProfile === '3G_200MS' ? 200 : 0;

      const exp = await api.createExperiment({
        title: title || `Evaluation of ${authMethod}`,
        authMethod,
        loadModel,
        targetVUs: Number(targetVUs),
        durationSec: Number(durationSec),
        repetitions: Number(repetitions),
        networkProfile,
        addedLatencyMs,
        hypothesis: `H1: Empirical latency of ${authMethod} under ${targetVUs} VUs`,
      });

      await api.runExperiment(exp.id);
      onStartExperiment(exp.id);
      fetchData();
    } catch (err) {
      console.error('Failed to create experiment:', err);
    }
  };

  const handleRunQuickSuite = async () => {
    setSuiteLoading(true);
    try {
      await api.runQuickSuite(20, 5);
      onRunSuite();
      fetchData();
    } catch (err) {
      console.error('Quick suite failed:', err);
    } finally {
      setSuiteLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Platform Summary KPI Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-panel p-5 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-mono tracking-wider text-slate-400">Total Experiments</span>
            <FlaskConical className="w-5 h-5 text-teal-400" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-bold font-mono text-white">
              {overview ? overview.totalExperiments : '...'}
            </span>
            <span className="text-xs text-emerald-400 font-medium">
              {overview?.completedExperiments || 0} Completed
            </span>
          </div>
        </div>

        <div className="glass-panel p-5 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-mono tracking-wider text-slate-400">Recorded Traces</span>
            <Layers className="w-5 h-5 text-cyan-400" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-bold font-mono text-white">
              {overview ? overview.totalTraces.toLocaleString() : '...'}
            </span>
            <span className="text-xs text-slate-400 font-mono">Monotonic hrtime</span>
          </div>
        </div>

        <div className="glass-panel p-5 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-mono tracking-wider text-slate-400">Methods Under Test</span>
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-bold font-mono text-white">4</span>
            <span className="text-xs text-slate-300 font-mono">PWD / OTP / QR / QR+OTP</span>
          </div>
        </div>

        <div className="glass-panel p-5 rounded-xl border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-mono tracking-wider text-slate-400">Automated Suite</span>
            <Zap className="w-5 h-5 text-amber-400" />
          </div>
          <button
            onClick={handleRunQuickSuite}
            disabled={suiteLoading}
            className="mt-3 w-full py-2 px-3 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-slate-950 font-semibold rounded-lg text-xs flex items-center justify-center space-x-2 transition-all shadow-md shadow-teal-500/20 disabled:opacity-50"
          >
            {suiteLoading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4 fill-slate-950" />
            )}
            <span>{suiteLoading ? 'Executing Suite...' : 'Run 4-Method Benchmark'}</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Experiment Creation Wizard + Experiment History */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Creation Wizard */}
        <div className="glass-panel p-6 rounded-xl border border-slate-800 lg:col-span-1">
          <div className="flex items-center space-x-2 pb-4 border-b border-slate-800 mb-4">
            <PlusCircle className="w-5 h-5 text-teal-400" />
            <h2 className="font-semibold text-white">Create Benchmark Trial</h2>
          </div>

          <form onSubmit={handleCreateAndRun} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-400 font-mono mb-1">Experiment Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Stress Test QR+OTP at 50 VUs"
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white focus:outline-none focus:border-teal-500 font-sans"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-mono mb-1">Authentication Method</label>
              <div className="grid grid-cols-2 gap-2">
                {(['PASSWORD', 'OTP', 'QR', 'QR_OTP'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setAuthMethod(m)}
                    className={`py-2 px-2 text-center rounded border font-mono transition-colors ${
                      authMethod === m
                        ? 'bg-teal-500/20 border-teal-500 text-teal-300 font-bold'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    {m === 'PASSWORD' ? 'Password' : m === 'OTP' ? 'OTP Only' : m === 'QR' ? 'QR Only' : 'QR + OTP'}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 font-mono mb-1">Target VUs (Users)</label>
                <select
                  value={targetVUs}
                  onChange={(e) => setTargetVUs(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-2 text-white font-mono focus:outline-none focus:border-teal-500"
                >
                  <option value={1}>1 VU (Baseline)</option>
                  <option value={10}>10 VUs (Small)</option>
                  <option value={25}>25 VUs (Medium)</option>
                  <option value={50}>50 VUs (High)</option>
                  <option value={100}>100 VUs (Stress)</option>
                  <option value={250}>250 VUs (Extreme)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-mono mb-1">Duration (Sec)</label>
                <select
                  value={durationSec}
                  onChange={(e) => setDurationSec(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-2 text-white font-mono focus:outline-none focus:border-teal-500"
                >
                  <option value={5}>5 seconds</option>
                  <option value={10}>10 seconds</option>
                  <option value={20}>20 seconds</option>
                  <option value={30}>30 seconds</option>
                  <option value={60}>60 seconds</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 font-mono mb-1">Load Model</label>
                <select
                  value={loadModel}
                  onChange={(e) => setLoadModel(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-2 text-white font-mono focus:outline-none focus:border-teal-500"
                >
                  <option value="CLOSED_CONCURRENCY">Closed (Fixed VUs)</option>
                  <option value="OPEN_ARRIVAL_RATE">Open (Arrival Rate)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-mono mb-1">Repetitions (Trials)</label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={repetitions}
                  onChange={(e) => setRepetitions(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-2 text-white font-mono focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 font-mono mb-1">Network Profile</label>
              <select
                value={networkProfile}
                onChange={(e) => setNetworkProfile(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-2 text-white font-mono focus:outline-none focus:border-teal-500"
              >
                <option value="LAN_0MS">LAN (0ms Added RTT)</option>
                <option value="BROADBAND_50MS">Broadband (50ms RTT)</option>
                <option value="4G_100MS">4G LTE (100ms RTT)</option>
                <option value="3G_200MS">3G Mobile (200ms RTT)</option>
              </select>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 mt-2 bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold rounded-lg text-xs flex items-center justify-center space-x-2 transition-colors"
            >
              <Play className="w-4 h-4 fill-slate-950" />
              <span>Launch Experiment</span>
            </button>
          </form>
        </div>

        {/* Experiment History & Execution Queue */}
        <div className="glass-panel p-6 rounded-xl border border-slate-800 lg:col-span-2 flex flex-col">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
            <h2 className="font-semibold text-white">Configured & Historical Experiments</h2>
            <button
              onClick={fetchData}
              className="text-xs text-slate-400 hover:text-teal-400 flex items-center space-x-1"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 text-slate-400 font-mono">
                <tr>
                  <th className="py-2.5 px-3">Code / Title</th>
                  <th className="py-2.5 px-3">Method</th>
                  <th className="py-2.5 px-3">VUs</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Throughput</th>
                  <th className="py-2.5 px-3 text-right">Median Latency</th>
                  <th className="py-2.5 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {experiments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-slate-500">
                      No experiments recorded yet. Click "Run 4-Method Benchmark" to start baseline trials.
                    </td>
                  </tr>
                ) : (
                  experiments.slice(0, 8).map((exp) => {
                    const latestRun = exp.benchmarkRuns?.[exp.benchmarkRuns.length - 1];
                    const isRunning = exp.status === 'RUNNING';

                    return (
                      <tr key={exp.id} className="hover:bg-slate-900/50">
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-white">{exp.code}</div>
                          <div className="text-[10px] text-slate-400 truncate max-w-[180px]">
                            {exp.title}
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] ${
                              exp.authMethod === 'QR_OTP'
                                ? 'bg-purple-950 text-purple-300 border border-purple-800'
                                : exp.authMethod === 'QR'
                                ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                                : exp.authMethod === 'OTP'
                                ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {exp.authMethod}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-300">{exp.targetVUs} VUs</td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`inline-flex items-center space-x-1.5 text-[10px] px-2 py-0.5 rounded-full ${
                              isRunning
                                ? 'bg-amber-950/80 text-amber-300 border border-amber-800 animate-pulse'
                                : exp.status === 'COMPLETED'
                                ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            <span>{exp.status}</span>
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-200">
                          {latestRun?.throughputRps ? `${latestRun.throughputRps} rps` : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-right text-teal-400 font-semibold">
                          {latestRun?.medianLatencyMs ? `${latestRun.medianLatencyMs} ms` : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {isRunning ? (
                            <button
                              onClick={() => api.abortExperiment(exp.id)}
                              className="p-1 bg-red-950 hover:bg-red-900 text-red-300 rounded border border-red-800"
                              title="Abort Run"
                            >
                              <StopCircle className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                api.runExperiment(exp.id);
                                onStartExperiment(exp.id);
                              }}
                              className="p-1 bg-slate-800 hover:bg-teal-900/60 text-slate-200 hover:text-teal-300 rounded border border-slate-700"
                              title="Re-run Experiment"
                            >
                              <Play className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
