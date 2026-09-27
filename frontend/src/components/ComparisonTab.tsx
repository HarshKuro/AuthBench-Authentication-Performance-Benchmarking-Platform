import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { BarChart3, RefreshCw, AlertCircle } from 'lucide-react';
import { api } from '../api';

export const ComparisonTab: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.getComparison();
      setData(res);
    } catch (e) {
      console.error('Failed to fetch comparison:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center p-12">
        <RefreshCw className="w-6 h-6 animate-spin text-teal-400" />
      </div>
    );
  }

  const methods = ['PASSWORD', 'OTP', 'QR', 'QR_OTP'];
  const chartData = methods.map((m) => {
    const item = data?.[m] || {
      medianLatencyMs: 0,
      p95LatencyMs: 0,
      p99LatencyMs: 0,
      latencyOverheadPct: 0,
      count: 0,
    };
    return {
      name: m === 'PASSWORD' ? 'Password' : m === 'OTP' ? 'OTP' : m === 'QR' ? 'QR Code' : 'QR + OTP',
      method: m,
      median: item.medianLatencyMs,
      p95: item.p95LatencyMs,
      p99: item.p99LatencyMs,
      overhead: item.latencyOverheadPct,
      samples: item.count,
    };
  });

  return (
    <div className="space-y-6">
      {/* Header and Refresh */}
      <div className="glass-panel p-5 rounded-xl border border-slate-800 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-white uppercase font-mono tracking-wider">
            Empirical Comparison Matrix: All 4 Authentication Methods
          </h2>
          <p className="text-xs text-slate-400">
            Evaluating Latency Distribution, Tail Percentiles, and Marginal Overhead Relative to Password Baseline
          </p>
        </div>
        <button
          onClick={fetchData}
          className="text-xs px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-teal-400 font-mono rounded flex items-center space-x-1.5 transition-colors border border-slate-700"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Comparison Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Median & P95 Latency Grouped Bar Chart */}
        <div className="glass-panel p-5 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-slate-300 uppercase font-mono tracking-wider">
              Latency Comparison: Median (P50) vs Tail (P95)
            </h3>
            <span className="text-[10px] font-mono text-slate-500">Lower is better</span>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} unit=" ms" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                />
                <Legend />
                <Bar dataKey="median" fill="#14b8a6" name="P50 Median (ms)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="p95" fill="#a855f7" name="P95 Tail (ms)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Marginal Factor Overhead Relative to Password Baseline (%) */}
        <div className="glass-panel p-5 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-slate-300 uppercase font-mono tracking-wider">
              Marginal Overhead Relative to Baseline Password (%)
            </h3>
            <span className="text-[10px] font-mono text-slate-500">% increase in median latency</span>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData.filter((d) => d.method !== 'PASSWORD')}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} unit="%" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                />
                <Bar dataKey="overhead" fill="#f59e0b" name="Overhead vs Password (%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Structured Research Table: Table 3 in Academic Paper */}
      <div className="glass-panel p-6 rounded-xl border border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider">
              Table 3: Latency & Reliability Summary Statistics
            </h3>
            <p className="text-[11px] text-slate-400 font-mono">
              Exact quantitative measurements across all warm steady-state authentication trials
            </p>
          </div>
          <span className="text-xs px-2.5 py-1 rounded bg-teal-950 text-teal-300 border border-teal-800 font-mono">
            IEEE Table Format Ready
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="border-b border-slate-800 text-slate-400">
              <tr>
                <th className="py-3 px-3">Method</th>
                <th className="py-3 px-3 text-right">Sample N</th>
                <th className="py-3 px-3 text-right">Mean Latency</th>
                <th className="py-3 px-3 text-right">P50 (Median)</th>
                <th className="py-3 px-3 text-right">P90 Tail</th>
                <th className="py-3 px-3 text-right">P95 Tail</th>
                <th className="py-3 px-3 text-right">P99 Tail</th>
                <th className="py-3 px-3 text-right">Overhead (%)</th>
                <th className="py-3 px-3 text-right">Success Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {methods.map((m) => {
                const item = data?.[m] || {};
                const isBaseline = m === 'PASSWORD';
                const isProposed = m === 'QR_OTP';

                return (
                  <tr
                    key={m}
                    className={`hover:bg-slate-900/60 ${
                      isProposed ? 'bg-purple-950/20' : isBaseline ? 'bg-slate-900/40' : ''
                    }`}
                  >
                    <td className="py-3 px-3 font-bold text-white flex items-center space-x-2">
                      <span>{m === 'PASSWORD' ? 'Password (Control)' : m === 'OTP' ? 'OTP' : m === 'QR' ? 'QR Code' : 'QR + OTP (Proposed)'}</span>
                      {isProposed && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-900 text-purple-200">
                          PROPOSED
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-300">{item.count || 0}</td>
                    <td className="py-3 px-3 text-right text-slate-200">{item.meanLatencyMs || 0} ms</td>
                    <td className="py-3 px-3 text-right text-teal-400 font-bold">{item.medianLatencyMs || 0} ms</td>
                    <td className="py-3 px-3 text-right text-slate-300">{item.p90LatencyMs || 0} ms</td>
                    <td className="py-3 px-3 text-right text-purple-300">{item.p95LatencyMs || 0} ms</td>
                    <td className="py-3 px-3 text-right text-red-300">{item.p99LatencyMs || 0} ms</td>
                    <td className="py-3 px-3 text-right font-semibold text-amber-400">
                      {isBaseline ? '0.0% (Ref)' : `+${item.latencyOverheadPct || 0}%`}
                    </td>
                    <td className="py-3 px-3 text-right text-emerald-400">{item.successRatePct || 100}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Academic Interpretation Callout */}
        <div className="mt-4 p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs text-slate-400 flex items-start space-x-2.5">
          <AlertCircle className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
          <p>
            <strong className="text-slate-200">Research Note:</strong> While QR+OTP incorporates both physical screen scanning and out-of-band one-time password verification, its overhead must be evaluated in terms of both absolute millisecond delay and cryptographic resistance against credential stuffing.
          </p>
        </div>
      </div>
    </div>
  );
};
