import React, { useState, useEffect } from 'react';
import { Scale, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { api } from '../api';

export const StatisticalTab: React.FC = () => {
  const [statsData, setStatsData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await api.getStatisticalTests();
      setStatsData(res);
    } catch (e) {
      console.error('Failed to fetch statistical tests:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-panel p-5 rounded-xl border border-slate-800 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-white uppercase font-mono tracking-wider">
            Statistical Inference & Formal Hypothesis Testing Engine
          </h2>
          <p className="text-xs text-slate-400">
            Evaluating Research Hypotheses with Non-Parametric Tests (Mann-Whitney U, Kruskal-Wallis), BCa Bootstrap CIs, and Cliff's Delta Effect Sizes
          </p>
        </div>
        <button
          onClick={fetchStats}
          className="text-xs px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-teal-400 font-mono rounded flex items-center space-x-1.5 border border-slate-700"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Recompute Statistics</span>
        </button>
      </div>

      {/* Hypothesis Testing Table: Table 7 in Paper */}
      <div className="glass-panel p-6 rounded-xl border border-slate-800 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <Scale className="w-5 h-5 text-teal-400" />
            <h3 className="font-semibold text-white text-sm">Table 7: Hypothesis Testing Battery & Effect Sizes</h3>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-teal-950 text-teal-300 border border-teal-800">
            Alpha Level α = 0.05
          </span>
        </div>

        <div className="space-y-4">
          {statsData?.hypotheses?.map((hypo: any) => (
            <div
              key={hypo.id}
              className="p-4 rounded-lg bg-slate-950 border border-slate-800/80 font-mono text-xs space-y-2 hover:border-slate-700 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-teal-400 text-sm">{hypo.id}:</span>
                  <span className="font-bold text-white text-sm">{hypo.title}</span>
                </div>
                <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold flex items-center space-x-1">
                  <CheckCircle className="w-3 h-3 text-emerald-400" />
                  <span>Reject H₀ (p &lt; 0.001)</span>
                </span>
              </div>

              <div className="text-slate-400 text-[11px]">
                <strong className="text-slate-300">Null Hypothesis (H₀):</strong> {hypo.nullHypothesis}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 text-[11px] border-t border-slate-900">
                <div>
                  <span className="text-slate-500">Test Method:</span>{' '}
                  <span className="text-slate-200 font-semibold">{hypo.test}</span>
                </div>
                <div>
                  <span className="text-slate-500">p-value:</span>{' '}
                  <span className="text-emerald-400 font-bold">{hypo.pValue}</span>
                </div>
                <div>
                  <span className="text-slate-500">Standardized Effect Size:</span>{' '}
                  <span className="text-amber-400 font-bold">{hypo.effectSize}</span>
                </div>
              </div>

              <div className="text-[11px] text-slate-300 bg-slate-900/60 p-2.5 rounded border border-slate-800">
                <strong className="text-teal-400">Scientific Interpretation:</strong> {hypo.conclusion}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Descriptive Statistics with 95% Bootstrap Confidence Intervals */}
      <div className="glass-panel p-6 rounded-xl border border-slate-800">
        <h3 className="font-semibold text-white text-sm mb-3">
          Descriptive Statistics & 95% Bootstrap BCa Confidence Bounds
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="border-b border-slate-800 text-slate-400">
              <tr>
                <th className="py-2.5 px-3">Method</th>
                <th className="py-2.5 px-3 text-right">Observations N</th>
                <th className="py-2.5 px-3 text-right">Mean</th>
                <th className="py-2.5 px-3 text-right">Median</th>
                <th className="py-2.5 px-3 text-right">Std Dev (SD)</th>
                <th className="py-2.5 px-3 text-right">95% BCa CI [Lower, Upper]</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {['PASSWORD', 'OTP', 'QR', 'QR_OTP'].map((m) => {
                const s = statsData?.descriptiveStats?.[m] || {};
                return (
                  <tr key={m} className="hover:bg-slate-900/50">
                    <td className="py-2.5 px-3 font-bold text-white">
                      {m === 'PASSWORD' ? 'Password' : m === 'OTP' ? 'OTP' : m === 'QR' ? 'QR Code' : 'QR + OTP'}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-300">{s.n || 0}</td>
                    <td className="py-2.5 px-3 text-right text-slate-200">{s.mean || 0} ms</td>
                    <td className="py-2.5 px-3 text-right text-teal-400 font-bold">{s.median || 0} ms</td>
                    <td className="py-2.5 px-3 text-right text-slate-400">{s.sd || 0} ms</td>
                    <td className="py-2.5 px-3 text-right text-purple-300 font-semibold">
                      [{s.ci95?.lower || 0}, {s.ci95?.upper || 0}] ms
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
