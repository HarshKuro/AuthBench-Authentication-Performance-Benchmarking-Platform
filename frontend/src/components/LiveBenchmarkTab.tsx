import React, { useState, useEffect } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Activity, Cpu, HardDrive, Clock, Users, ArrowUpRight } from 'lucide-react';
import { LiveProgress, ResourceSnapshot } from '../types';

export const LiveBenchmarkTab: React.FC = () => {
  const [liveProgress, setLiveProgress] = useState<LiveProgress | null>(null);
  const [resource, setResource] = useState<ResourceSnapshot>({
    timestamp: new Date().toISOString(),
    cpuPercent: 0,
    memoryRssMb: 0,
    memoryHeapMb: 0,
    eventLoopLagMs: 0,
    activeDbConns: 1,
  });

  const [latencyHistory, setLatencyHistory] = useState<Array<{ time: string; p50: number; p95: number }>>([]);
  const [resourceHistory, setResourceHistory] = useState<Array<{ time: string; cpu: number; mem: number }>>([]);

  useEffect(() => {
    const sse = new EventSource('/api/v1/sse/live');

    sse.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'RESOURCE_METRIC') {
          const snap: ResourceSnapshot = payload.data;
          setResource(snap);
          const t = new Date(snap.timestamp).toLocaleTimeString([], { hour12: false, minute: '2-digit', second: '2-digit' });
          setResourceHistory((prev) => [...prev.slice(-25), { time: t, cpu: snap.cpuPercent, mem: snap.memoryHeapMb }]);
        } else if (payload.type === 'BENCHMARK_PROGRESS') {
          const prog: LiveProgress = payload.data;
          setLiveProgress(prog);
          const t = new Date().toLocaleTimeString([], { hour12: false, minute: '2-digit', second: '2-digit' });
          setLatencyHistory((prev) => [
            ...prev.slice(-25),
            { time: t, p50: prog.currentMedianLatencyMs, p95: prog.currentP95LatencyMs },
          ]);
        }
      } catch (err) {
        // Heartbeat or parse error
      }
    };

    return () => {
      sse.close();
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* Live Status Header */}
      <div className="glass-panel p-4 rounded-xl border border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <span className="flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-teal-500"></span>
            </span>
          </div>
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
              Live Real-Time Telemetry Monitor
            </h2>
            <p className="text-xs text-slate-400">Streaming at 500ms intervals via Server-Sent Events (SSE)</p>
          </div>
        </div>

        {liveProgress && (
          <div className="flex items-center space-x-3">
            <span
              className={`text-xs px-2.5 py-1 rounded font-mono font-bold ${
                liveProgress.status === 'RUNNING'
                  ? 'bg-amber-950 text-amber-300 border border-amber-800 animate-pulse'
                  : 'bg-slate-800 text-slate-300'
              }`}
            >
              {liveProgress.status}: Trial {liveProgress.trialNumber} ({liveProgress.elapsedSec}s /{' '}
              {liveProgress.durationSec}s)
            </span>
          </div>
        )}
      </div>

      {/* Real-time Metric Gauges */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Active Virtual Users */}
        <div className="glass-panel p-4 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
            <span>Virtual Users</span>
            <Users className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-white">
            {liveProgress ? liveProgress.activeVUs : 0}
          </div>
          <div className="text-[10px] text-slate-500 font-mono">Concurrent clients</div>
        </div>

        {/* Requests / Sec */}
        <div className="glass-panel p-4 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
            <span>Throughput</span>
            <ArrowUpRight className="w-4 h-4 text-teal-400" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-teal-400">
            {liveProgress ? liveProgress.currentRps : 0} <span className="text-xs text-slate-400">req/s</span>
          </div>
          <div className="text-[10px] text-slate-500 font-mono">Completions / sec</div>
        </div>

        {/* P50 Median Latency */}
        <div className="glass-panel p-4 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
            <span>P50 Median</span>
            <Clock className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-white">
            {liveProgress ? liveProgress.currentMedianLatencyMs : 0}{' '}
            <span className="text-xs text-slate-400">ms</span>
          </div>
          <div className="text-[10px] text-slate-500 font-mono">Typical completion</div>
        </div>

        {/* P95 Tail Latency */}
        <div className="glass-panel p-4 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
            <span>P95 Tail</span>
            <Activity className="w-4 h-4 text-purple-400" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-purple-300">
            {liveProgress ? liveProgress.currentP95LatencyMs : 0}{' '}
            <span className="text-xs text-slate-400">ms</span>
          </div>
          <div className="text-[10px] text-slate-500 font-mono">95th percentile</div>
        </div>

        {/* System CPU % */}
        <div className="glass-panel p-4 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
            <span>Server CPU</span>
            <Cpu className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-amber-300">
            {resource.cpuPercent}%
          </div>
          <div className="text-[10px] text-slate-500 font-mono">Process load</div>
        </div>

        {/* Heap Memory */}
        <div className="glass-panel p-4 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
            <span>Heap Memory</span>
            <HardDrive className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-indigo-300">
            {resource.memoryHeapMb} <span className="text-xs text-slate-400">MB</span>
          </div>
          <div className="text-[10px] text-slate-500 font-mono">RSS: {resource.memoryRssMb} MB</div>
        </div>
      </div>

      {/* Real-time Streaming Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Latency Streaming Chart */}
        <div className="glass-panel p-5 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-slate-300 uppercase font-mono tracking-wider">
              Latency Stream (P50 vs P95 Tail)
            </h3>
            <span className="text-[10px] font-mono text-slate-500">Milliseconds (ms)</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={latencyHistory.length ? latencyHistory : [{ time: '00:00', p50: 0, p95: 0 }]}>
                <defs>
                  <linearGradient id="p50Grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="p95Grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="time" stroke="#64748b" fontSize={10} font-mono />
                <YAxis stroke="#64748b" fontSize={10} font-mono />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                />
                <Area type="monotone" dataKey="p50" stroke="#14b8a6" fill="url(#p50Grad)" name="P50 Median" />
                <Area type="monotone" dataKey="p95" stroke="#a855f7" fill="url(#p95Grad)" name="P95 Tail" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CPU & Memory Streaming Chart */}
        <div className="glass-panel p-5 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-slate-300 uppercase font-mono tracking-wider">
              Resource Utilization Stream (CPU % & Heap MB)
            </h3>
            <span className="text-[10px] font-mono text-slate-500">Live Process Metrics</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={resourceHistory.length ? resourceHistory : [{ time: '00:00', cpu: 0, mem: 0 }]}>
                <defs>
                  <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="time" stroke="#64748b" fontSize={10} />
                <YAxis stroke="#64748b" fontSize={10} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                />
                <Area type="monotone" dataKey="cpu" stroke="#f59e0b" fill="url(#cpuGrad)" name="CPU %" />
                <Area type="monotone" dataKey="mem" stroke="#6366f1" fill="none" strokeWidth={2} name="Heap MB" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
