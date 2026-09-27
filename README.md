# Empirical Performance Evaluation of Multi-Factor E-Authentication Mechanisms (QR Code, OTP, and Hybrid QR+OTP)

An academic research-grade experimental benchmarking platform designed to empirically quantify latency overhead, throughput scalability, tail distribution inflation, and resource consumption trade-offs across four authentication architectures:
1. **Method A: Password (Baseline / Control)**
2. **Method B: One-Time Password (OTP)**
3. **Method C: Quick Response Challenge-Response (QR)**
4. **Method D: Hybrid Quick Response + One-Time Password (QR + OTP)**

Built in accordance with IEEE/ACM Empirical Systems Research Standards.

---

## 1. Primary Research Questions

- **RQ1 (Latency Breakdown):** How does authentication completion latency differ among Password, OTP, QR, and QR+OTP authentication under baseline (unloaded) conditions?
- **RQ2 (Throughput & Scalability):** How does authentication throughput scale as concurrent synthetic users scale from 1 to 500?
- **RQ3 (Tail Latency & Dispersion):** How do tail latency percentiles ($P_{90}, P_{95}, P_{99}$) degrade under increasing concurrency?
- **RQ4 (Factor Overhead Tax):** What is the exact marginal latency and CPU overhead introduced by each incremental authentication factor relative to the password baseline?
- **RQ5 (Network Latency Sensitivity):** How does artificial wide-area network latency (0ms, 50ms, 100ms, 200ms, 400ms) impact end-to-end completion time?
- **RQ6 (Saturation Point):** At what concurrency threshold does each authentication architecture reach saturation (hockey-stick knee point)?
- **RQ7 (Bottleneck Dominance):** Which architectural stage (cryptographic hashing, QR matrix generation, DB pool contention) represents the primary bottleneck under load?
- **RQ8 (Statistical Significance):** Is the observed difference in completion time statistically significant, and what is the standardized effect size (Cliff's Delta, Cohen's d)?
- **RQ9 (High-Concurrency Reliability):** What are the empirical failure, timeout, and retry rates under extreme stress conditions?

---

## 2. Platform Architecture

```
+-------------------------------------------------------------------------------------------------+
|                                PLATFORM COMPONENT TOPOLOGY                                       |
+-------------------------------------------------------------------------------------------------+
|                                                                                                 |
|   +-----------------------------------------------------------------------------------------+   |
|   |                    FRONTEND DASHBOARD (Vite + React 18 + Tailwind + Recharts)           |   |
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

## 3. Quick Start Guide

### Prerequisites
- Node.js v20+ or v24+
- Python 3.10+ (with `scipy`, `numpy`, `pandas`)
- Git

### Installation & Database Initialization
```bash
# 1. Install backend dependencies and push database schema
cd backend
npm install
npx prisma db push
npm run prisma:seed

# 2. Install frontend dependencies
cd ../frontend
npm install
cd ..
```

### Running the Services

**Terminal 1: Start Backend Engine**
```bash
cd backend
npm run dev
# Running on http://localhost:4000
```

**Terminal 2: Start Research Dashboard**
```bash
cd frontend
npm run dev
# Running on http://localhost:3000 (proxies /api to :4000)
```

**Terminal 3: Run Scientific Test Battery**
```bash
# Verify authentication state machines
npm run test:auth

# Verify Python statistical inference battery
npm run test:analytics
```

---

## 4. Key Research Features

1. **Sub-Stage Nanosecond Telemetry:**
   Instruments requests via `process.hrtime.bigint()` into distinct micro-stages:
   - `QR_GEN`: 256-bit cryptographically secure challenge generation.
   - `QR_RENDER`: SVG matrix rendering latency.
   - `QR_VAL`: Nonce signature verification and expiration check.
   - `OTP_GEN`: 6-digit cryptographic token generation + HMAC computation.
   - `OTP_DELIVERY_MOCK`: Controlled mock telecom transit latency ($\mu=25\text{ms}, \sigma=2\text{ms}$).
   - `OTP_VAL`: Constant-time hash verification.
   - `PASSWORD_HASH_VERIFY`: bcrypt salt and key derivation processing.
   - `DB_QUERY`: Database query and transaction commit durations.
   - `SESSION_CREATE`: Cryptographic session token generation.

2. **Open-Loop & Closed-Loop Load Generation:**
   Supports both fixed virtual user concurrency (1 to 500 VUs) with stochastic think-times and constant arrival rates (10 to 500 req/s) to evaluate queueing theory behavior.

3. **Rigorous Statistical Inference Engine:**
   - Evaluates distribution normality via Shapiro-Wilk and Anderson-Darling tests.
   - Computes non-parametric Mann-Whitney U and Kruskal-Wallis omnibus tests.
   - Computes Cliff's Delta ($\delta$) and Cohen's $d$ standardized effect sizes.
   - Derives 95% Confidence Intervals using Bias-Corrected and Accelerated (BCa) bootstrap resampling ($B=2,000$).

4. **Academic Paper Export Ready:**
   - 1-click generation of formatted LaTeX tables (Tables 1 through 8).
   - CSV export of raw experimental trial traces.
   - Reproducibility manifests capturing exact hardware clocks, OS, runtime, and git commit versions.

---

## 5. License & Attribution
Licensed under the Apache 2.0 License. Developed for academic performance evaluation in electronic authentication systems.
