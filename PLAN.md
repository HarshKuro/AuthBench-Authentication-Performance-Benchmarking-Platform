# Master Implementation Plan: QR + OTP E-Authentication Research Benchmarking Platform

banana

---

## 1. System Overview & Architecture

The objective is to construct an end-to-end, reproducible scientific experimental platform to evaluate the performance trade-offs of four authentication architectures:
1. **Method A: Password (Baseline / Control)**
2. **Method B: One-Time Password (OTP)**
3. **Method C: Quick Response Challenge-Response (QR)**
4. **Method D: Hybrid Quick Response + One-Time Password (QR + OTP)**

```
+-------------------------------------------------------------------------------------------------+
|                                PLATFORM COMPONENT TOPOLOGY                                       |
+-------------------------------------------------------------------------------------------------+
|                                                                                                 |
|   +-----------------------------------------------------------------------------------------+   |
|   |                    FRONTEND DASHBOARD (Next.js 15, Tailwind, Recharts)                  |   |
|   |  - Page 1: Laboratory Hub & Experiment Wizard (Full configuration & reproducibility)     |   |
|   |  - Page 2: Live Benchmark Real-Time Telemetry (SSE stream, VU gauges, latency charts)   |   |
|   |  - Page 3: Multi-Method Comparison Matrix (Boxplots, histograms, violin distributions)  |   |
|   |  - Page 4: Concurrency Scalability & Saturation Analysis (Hockey-stick curve detector)  |   |
|   |  - Page 5: Sub-Stage Bottleneck Decomposition (Flame-chart waterfall, marginal tax)     |   |
|   |  - Page 6: Trace Deep-Dive Explorer (Millisecond stage breakdown per transaction)       |   |
|   |  - Page 7: Statistical Inference & Hypothesis Testing (Mann-Whitney U, Cliff's delta)   |   |
|   |  - Page 8: Human Interaction Lab (Real QR camera scanning & mobile OTP entry trial)     |   |
|   |  - Page 9: Academic Paper Exporter (LaTeX tables, IEEE SVG figures, Markdown reports)   |   |
|   +-----------------------------------------------------------------------------------------+   |
|                                             |                                                   |
|                                       REST / SSE APIs                                           |
|                                             |                                                   |
|   +-----------------------------------------------------------------------------------------+   |
|   |                   BACKEND ENGINE (Node.js 24 + Fastify + TypeScript)                    |   |
|   |                                                                                         |   |
|   |  +------------------------+  +------------------------+  +---------------------------+  |   |
|   |  | Authentication Core    |  | Benchmark Engine       |  | System Resource Monitor   |  |   |
|   |  | - Password (bcrypt)    |  | - Closed Concurrency   |  | - Process CPU & RSS       |  |   |
|   |  | - OTP (HMAC-SHA256)    |  | - Open Arrival Rate    |  | - Event Loop Lag          |  |   |
|   |  | - QR Challenge-Response|  | - Synthetic Latency/RTT|  | - DB Pool Contention      |  |   |
|   |  | - Combined QR + OTP    |  | - Trial Coordinator    |  | - Garbage Collection      |  |   |
|   |  +------------------------+  +------------------------+  +---------------------------+  |   |
|   |               |                           |                           |                 |   |
|   |  +-----------------------------------------------------------------------------------+  |   |
|   |  | High-Resolution Monotonic Instrumentation Interceptor                             |  |   |
|   |  | - Nanosecond process.hrtime.bigint() timers                                       |  |   |
|   |  | - Distributed trace context propagation (traceId, experimentId, trialNumber)     |  |   |
|   |  | - Zero sensitive credential leakage                                               |  |   |
|   |  +-----------------------------------------------------------------------------------+  |   |
|   +-----------------------------------------------------------------------------------------+   |
|                         |                                                |                      |
|   +---------------------------------------+   +----------------------------------------------+  |
|   | PERSISTENCE (Prisma ORM / SQLite / DB) |   | STATISTICAL ENGINE (Python 3.14 + SciPy)     |  |
|   | - Experiments & Configuration Specs   |   | - Shapiro-Wilk & Anderson-Darling Normality  |  |
|   | - Benchmark Runs & Trial Aggregates   |   | - Mann-Whitney U & Kruskal-Wallis Non-param  |  |
|   | - Fine-Grained Authentication Traces  |   | - Dunn Post-Hoc with Bonferroni Correction   |  |
|   | - Sub-Stage Nanosecond Spans          |   | - Cliff's Delta & Cohen's d Effect Sizes     |  |
|   | - High-Frequency Resource Samples     |   | - Bias-Corrected Bootstrap 95% CIs (B=2,000) |  |
|   +---------------------------------------+   +----------------------------------------------+  |
+-------------------------------------------------------------------------------------------------+
```

---

## 2. Phased Implementation Roadmap

### Phase 1: Environment Setup & Foundation
- Setup monorepo/workspace package structure.
- Initialize `backend` with TypeScript, Fastify, and Prisma.
- Configure database schema supporting experiments, runs, traces, stages, and metrics.
- Execute database migrations and verify connectivity.
- *Commit: "feat(backend): initialize fastify typescript server and prisma schema"*

### Phase 2: Authentication Core & Cryptographic Modules
- **Method A (Password):** Secure password hashing (bcrypt/argon2), user lookup, session generation.
- **Method B (OTP):** HMAC-SHA256 6-digit cryptographic token generation, expiration tracking, rate-limiting, and constant-time verification.
- **Method C (QR Challenge-Response):** 256-bit cryptographically secure nonce generation, SVG matrix rendering, status polling, and mobile device signature verification.
- **Method D (Combined QR+OTP):** Multi-factor pipeline coordinating QR challenge validation followed by OTP token issuance and verification within an atomic workflow.
- *Commit: "feat(auth): implement 4 authentication methods (Password, OTP, QR, QR+OTP)"*

### Phase 3: High-Resolution Instrumentation & Telemetry
- Implement monotonic stage timer utilizing `process.hrtime.bigint()` for nanosecond precision.
- Build trace lifecycle manager: `traceId`, `experimentId`, `trialNumber`, sanitized stage recording (`QR_GEN`, `QR_VAL`, `OTP_GEN`, `OTP_VAL`, `DB_QUERY`, `SESSION_CREATE`).
- Implement async batch buffer to eliminate database I/O observer-effect during high-concurrency benchmarks.
- *Commit: "feat(instrumentation): add monotonic nanosecond stage tracer and telemetry buffer"*

### Phase 4: Benchmark Runner & Load Generation Harness
- Implement virtual user engine supporting:
  - **Closed-Model Concurrency:** 1 to 500 fixed concurrent virtual users with stochastic think-times.
  - **Open-Model Arrival Rate:** Constant arrival rates (10 to 500 req/s) for queueing saturation evaluation.
  - **Network Latency Simulator:** Configurable artificial RTT (0ms, 50ms, 100ms, 200ms, 400ms) and simulated packet loss.
  - **Cold vs. Warm Run Partitioning:** Automated warm-up requests prior to recorded trials.
- *Commit: "feat(benchmark): build closed and open model load generation runner with network simulation"*

### Phase 5: System Resource Monitoring
- Background process polling Node.js CPU %, Resident Set Size (RSS), heap used, event-loop lag (`perf_hooks.monitorEventLoopDelay`), and active database connections at 500ms intervals.
- Live Server-Sent Events (SSE) telemetry broadcast to connected dashboard clients.
- *Commit: "feat(monitor): add system resource sampler for CPU, memory, and event-loop lag"*

### Phase 6: Python Scientific Analytics Engine
- Implement statistical analysis module in Python using `scipy.stats`, `numpy`, and `pandas`:
  - Normality tests: Shapiro-Wilk and Anderson-Darling.
  - Central tendency & dispersion: Mean, Median, $P_{25}, P_{75}, P_{90}, P_{95}, P_{99}$, IQR, Variance.
  - Non-parametric tests: Kruskal-Wallis, Mann-Whitney U, Wilcoxon signed-rank.
  - Multiple testing correction: Bonferroni-Holm.
  - Effect sizes: Cliff's delta ($\delta$) and Cohen's $d$.
  - Bootstrap resampling: 95% Confidence Intervals via BCa ($B=2,000$).
  - Saturation inflection detector: Second-derivative knee-point analysis.
- *Commit: "feat(analytics): implement rigorous Python statistical engine with scipy and pandas"*

### Phase 7: Academic Dashboard & Presentation Layer
- Modern, responsive web interface built with Next.js/React and Tailwind CSS:
  1. **Laboratory Hub:** Benchmark runner configuration wizard and reproducibility manifest.
  2. **Live Telemetry:** Dynamic VU gauges, real-time requests/sec, and live latency streams.
  3. **Performance Matrix:** Interactive boxplots, tail percentiles, and violin distribution plots.
  4. **Scalability & Saturation:** Throughput vs. Concurrency and $P_{95}$ latency escalation curves.
  5. **Bottleneck Flamegraph:** Sub-stage latency decomposition waterfall.
  6. **Trace Explorer:** Inspection of individual distributed transaction traces.
  7. **Statistical Inference:** Complete $p$-value, test statistic, and effect size reporting.
  8. **Human Interaction Lab:** Interactive QR scanner and manual OTP entry tester.
  9. **Academic Exporter:** 1-click export of LaTeX tables (Tables 1-8), IEEE SVG figures, and Markdown reports.
- *Commit: "feat(frontend): create full research dashboard with publication visualizations"*

### Phase 8: Comprehensive End-to-End Validation & Benchmark Execution
- Execute baseline and stress benchmarks across all 4 authentication methods.
- Verify timing monotonicity, additivity, and reproducible metric capture.
- Generate sample publication dataset and verify all export formats.
- *Commit: "test: validate benchmark harness and generate initial empirical dataset"*
