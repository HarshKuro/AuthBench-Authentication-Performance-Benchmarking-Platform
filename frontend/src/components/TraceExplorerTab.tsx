import React, { useState, useEffect } from 'react';
import { Search, ChevronRight, CheckCircle2, XCircle, Clock, RefreshCw } from 'lucide-react';
import { api } from '../api';
import { TraceDTO } from '../types';

export const TraceExplorerTab: React.FC = () => {
  const [traces, setTraces] = useState<TraceDTO[]>([]);
  const [selectedTrace, setSelectedTrace] = useState<TraceDTO | null>(null);
  const [filterMethod, setFilterMethod] = useState<string>('ALL');
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchTraces = async () => {
    try {
      setLoading(true);
      const res = await api.getTraces(filterMethod === 'ALL' ? undefined : filterMethod, page, 20);
      setTraces(res.traces || []);
      setTotalPages(res.totalPages || 1);
      setTotalCount(res.total || 0);

      // Select first trace if none selected
      if (!selectedTrace && res.traces?.length > 0) {
        setSelectedTrace(res.traces[0]);
      }
    } catch (e) {
      console.error('Failed to fetch traces:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTraces();
  }, [filterMethod, page]);

  return (
    <div className="space-y-6">
      {/* Header and Filter */}
      <div className="glass-panel p-5 rounded-xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-white uppercase font-mono tracking-wider">
            Distributed Authentication Trace Explorer
          </h2>
          <p className="text-xs text-slate-400">
            Inspect individual monotonic hrtime execution spans, micro-stage waterfalls, and detect anomalies
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <select
            value={filterMethod}
            onChange={(e) => {
              setFilterMethod(e.target.value);
              setPage(1);
            }}
            className="bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-teal-500"
          >
            <option value="ALL">All Methods ({totalCount})</option>
            <option value="PASSWORD">Password</option>
            <option value="OTP">OTP</option>
            <option value="QR">QR Code</option>
            <option value="QR_OTP">QR + OTP</option>
          </select>

          <button
            onClick={fetchTraces}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-teal-400 rounded border border-slate-700"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Two Column Layout: Trace List + Selected Trace Waterfall */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Trace List */}
        <div className="lg:col-span-5 glass-panel p-4 rounded-xl border border-slate-800 flex flex-col h-[580px]">
          <div className="text-xs font-mono text-slate-400 mb-3 flex items-center justify-between pb-2 border-b border-slate-800">
            <span>Traces (Page {page} of {totalPages})</span>
            <span>Total: {totalCount}</span>
          </div>

          <div className="overflow-y-auto flex-1 space-y-2 pr-1">
            {traces.length === 0 ? (
              <div className="text-center py-12 text-xs text-slate-500 font-mono">
                No traces match the selected filter.
              </div>
            ) : (
              traces.map((t) => {
                const isSelected = selectedTrace?.traceId === t.traceId;
                return (
                  <div
                    key={t.traceId}
                    onClick={() => setSelectedTrace(t)}
                    className={`p-3 rounded-lg border font-mono text-xs cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-teal-500/10 border-teal-500/50 shadow-md shadow-teal-500/10'
                        : 'bg-slate-950 border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-200">{t.traceId}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded ${
                          t.authMethod === 'QR_OTP'
                            ? 'bg-purple-950 text-purple-300'
                            : t.authMethod === 'QR'
                            ? 'bg-cyan-950 text-cyan-300'
                            : t.authMethod === 'OTP'
                            ? 'bg-amber-950 text-amber-300'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {t.authMethod}
                      </span>
                    </div>

                    <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                      <div className="flex items-center space-x-1.5">
                        {t.success ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-red-400" />
                        )}
                        <span>{t.stages?.length || 0} stages</span>
                      </div>
                      <span className="font-bold text-teal-400">{t.durationMs.toFixed(2)} ms</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs font-mono">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 rounded disabled:opacity-40"
            >
              Previous
            </button>
            <span className="text-slate-400">
              {page} / {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 rounded disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>

        {/* Selected Trace Waterfall View */}
        <div className="lg:col-span-7 glass-panel p-6 rounded-xl border border-slate-800 flex flex-col h-[580px]">
          {selectedTrace ? (
            <div className="flex flex-col h-full">
              {/* Trace Header */}
              <div className="pb-4 border-b border-slate-800 mb-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-sm font-bold text-white">{selectedTrace.traceId}</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded font-mono font-bold ${
                        selectedTrace.success
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : 'bg-red-950 text-red-300 border border-red-800'
                      }`}
                    >
                      {selectedTrace.success ? 'HTTP 200 SUCCESS' : 'FAILED'}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 font-mono mt-1">
                    Method: {selectedTrace.authMethod} | Participant: {selectedTrace.participantType} | Warm State: {selectedTrace.isWarm ? 'WARM' : 'COLD'}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold font-mono text-teal-400">
                    {selectedTrace.durationMs.toFixed(2)} ms
                  </div>
                  <div className="text-[10px] font-mono text-slate-500">Total Monotonic Duration</div>
                </div>
              </div>

              {/* Waterfall Stage Visualization */}
              <div className="flex-1 overflow-y-auto pr-2 space-y-3 font-mono text-xs">
                <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-2">
                  Transaction Execution Waterfall (Sequential Spans)
                </div>

                {selectedTrace.stages?.map((stage, idx) => {
                  const pct = Math.max(4, Math.min(100, (stage.durationMs / (selectedTrace.durationMs || 1)) * 100));

                  return (
                    <div key={idx} className="p-3 bg-slate-950 rounded-lg border border-slate-800/80 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-200">
                          {stage.sequenceOrder}. {stage.stageName}
                        </span>
                        <span className="text-teal-400 font-bold">
                          {stage.durationMs.toFixed(2)} ms ({pct.toFixed(1)}%)
                        </span>
                      </div>

                      {/* Visual Span Bar */}
                      <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-400"
                          style={{ width: `${pct}%` }}
                        />
                      </div>

                      <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1">
                        <span>Status: {stage.status}</span>
                        <span className="text-slate-500">Hardware Monotonic Clock</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-500 text-xs font-mono">
              Select a trace to inspect waterfall spans
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
