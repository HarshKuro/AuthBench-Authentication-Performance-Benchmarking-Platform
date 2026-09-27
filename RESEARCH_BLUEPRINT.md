# RESEARCH BLUEPRINT
## Empirical Performance Evaluation of Multi-Factor E-Authentication Mechanisms (QR Code, OTP, and Hybrid QR+OTP) Against Baseline Password Systems

**Document Version:** 1.0.0  
**Status:** Approved for Implementation  
**Standard:** IEEE/ACM Empirical Systems Research Guidelines  

---

## 1. Research Objective

The primary objective of this research is to design, implement, and rigorously benchmark an experimental evaluation platform that measures the empirical performance trade-offs of single-factor and multi-factor electronic authentication (E-Authentication) mechanisms. Specifically, the platform compares:
1. **Method A: Password (Baseline / Control)**
2. **Method B: One-Time Password (OTP)**
3. **Method C: Quick Response Challenge-Response (QR)**
4. **Method D: Hybrid Quick Response + One-Time Password (QR + OTP)**

Rather than treating authentication as an opaque black box, this platform instruments authentication workflows as fine-grained distributed transactions. It quantifies sub-millisecond stage latencies, system throughput limits, tail latency behaviors ($P_{90}, P_{95}, P_{99}$), resource utilization (CPU, memory, database connection pool, event-loop lag), degradation patterns under saturation, and the quantifiable performance tax imposed by security hardening.

The overarching goal is to generate statistically defensible, reproducible, and publication-ready experimental evidence to answer whether the cryptographic and multi-channel security benefits of QR+OTP justify its latency and computational costs under diverse concurrency workloads and network profiles.

---

## 2. Research Questions

- **RQ1 (Latency Breakdown):** How does authentication completion latency differ among Password, OTP, QR, and QR+OTP authentication under baseline (unloaded) conditions, and what is the exact sub-stage decomposition (QR generation, cryptographic signing, OTP generation, OTP verification, DB query, session dispatch)?
- **RQ2 (Throughput & Scalability):** How do authentication throughput (successful completions/sec) and server request processing capacity scale as concurrent synthetic users scale from 1 to 500?
- **RQ3 (Tail Latency & Dispersion):** How do tail latency percentiles ($P_{90}, P_{95}, P_{99}, P_{99.9}$) degrade under increasing concurrency across methods, and does multi-stage authentication exhibit disproportionate tail amplification?
- **RQ4 (Factor Overhead Tax):** What is the exact marginal latency, database, and CPU overhead introduced by each incremental authentication factor relative to the baseline password scheme?
- **RQ5 (Network Latency Sensitivity):** How does artificial wide-area network latency (0ms, 50ms, 100ms, 200ms, 400ms) and simulated packet loss impact end-to-end completion time across single-round-trip versus multi-round-trip authentication schemes?
- **RQ6 (Saturation Point & Queueing Degradation):** At what concurrency and arrival-rate threshold does each authentication architecture reach saturation (hockey-stick knee point), entering the unstable queueing and failure regime?
- **RQ7 (Bottleneck Dominance):** Which architectural component (cryptographic hashing, QR matrix generation, database connection pool contention, external/mock messaging provider, session I/O) represents the primary bottleneck under load for each method?
- **RQ8 (Statistical Significance of Multi-Factor Delay):** Is the observed difference in completion time between single-factor (Password, OTP, QR) and multi-factor (QR+OTP) statistically significant, and what is the standardized effect size across workloads?
- **RQ9 (High-Concurrency Reliability):** What are the empirical failure, timeout, and retry rates under stress and extreme load conditions, and what failure modes dominate (connection timeouts, rate limiting, pool exhaustion)?

---

## 3. Hypotheses

| Hypothesis | Formal Null Hypothesis ($H_0$) | Formal Alternative Hypothesis ($H_1$) | Verification Test |
| :--- | :--- | :--- | :--- |
| **H1 (Latency Difference)** | $H_{0,1}: \mu_{\text{PWD}} = \mu_{\text{OTP}} = \mu_{\text{QR}} = \mu_{\text{QR+OTP}}$ (Median completion latencies are identical across authentication mechanisms). | $H_{1,1}:$ At least one authentication mechanism differs significantly in median completion latency. | Kruskal-Wallis $H$-test followed by post-hoc Dunn test with Bonferroni correction. |
| **H2 (Load Sensitivity)** | $H_{0,2}: \frac{\partial \text{Latency}}{\partial \text{Concurrency}} = 0$ (Increasing concurrent users produces no statistically significant change in authentication latency). | $H_{1,2}: \frac{\partial \text{Latency}}{\partial \text{Concurrency}} > 0$ (Increasing concurrent users monotonically increases mean and tail latencies). | Spearman rank-order correlation and Jonckheere-Terpstra monotonic trend test. |
| **H3 (Throughput Plateau & Tail Amplification)** | $H_{0,3}:$ Concurrency increases lead to linear throughput growth indefinitely without tail dispersion divergence. | $H_{1,3}:$ Throughput reaches an asymptotic ceiling $\lambda_{\max}$ beyond which $P_{99} / P_{50}$ ratio increases super-linearly. | Piecewise linear regression (broken-stick model) for saturation knee; Levene test for variance divergence. |
| **H4 (Computational & DB Overhead)** | $H_{0,4}: \Delta \text{CPU}_{\text{QR+OTP}} = \Delta \text{CPU}_{\text{PWD}}$ and $\Delta \text{DB}_{\text{QR+OTP}} = \Delta \text{DB}_{\text{PWD}}$. | $H_{1,4}:$ QR+OTP incurs strictly greater CPU consumption ($\Delta \text{CPU} > 0$) and DB query latency ($\Delta \text{DB} > 0$) due to multi-stage transaction state persistence. | Mann-Whitney $U$-test with Cliff's delta effect size. |
| **H5 (Sub-Stage Disparity)** | $H_{0,5}: \tau_{\text{QR\_total}} = \tau_{\text{OTP\_total}}$ (QR sub-stage latency does not differ significantly from OTP sub-stage latency). | $H_{1,5}: \tau_{\text{QR\_total}} \neq \tau_{\text{OTP\_total}}$ (QR cryptographic and matrix generation times differ significantly from OTP hashing and verification). | Wilcoxon signed-rank paired test. |
| **H6 (Network Amplification Factor)** | $H_{0,6}: \frac{\Delta \text{Latency}}{\Delta \text{RTT}} = 1$ across all methods. | $H_{1,6}: \frac{\Delta \text{Latency}_{\text{QR+OTP}}}{\Delta \text{RTT}} > \frac{\Delta \text{Latency}_{\text{PWD}}}{\Delta \text{RTT}}$ due to multi-round-trip message exchange sequences. | Ordinary Least Squares (OLS) regression slope comparison across network profiles. |
| **H7 (Measurable Saturation Knee)** | $H_{0,7}:$ System exhibits no identifiable saturation threshold prior to hard process crash. | $H_{1,7}:$ A distinct inflection point exists where throughput plateaus and queue wait time transitions from $O(1)$ to $O(N)$. | Continuous second-derivative inflection analysis on throughput-concurrency curve. |

---

## 4. Threat Model

Following STRIDE and Dolev-Yao attacker models, authentication mechanisms operate in an adversarial environment:
- **T1: Replay Attacks (Spoofing):** An eavesdropper captures transmitted QR challenge strings or OTP tokens and attempts replay.
  - *Countermeasure:* Cryptographic nonces with monotonic expiration windows ($T_{\text{exp}} \le 60\text{s}$) and single-use consumption flags in database transactions.
- **T2: Brute-Force & Guessing Attacks (Tampering/Elevation):** High-frequency guessing of 6-digit OTP codes or challenge tokens.
  - *Countermeasure:* Leaky-bucket rate limiting (max 5 failed attempts per challenge), exponential backoff, and 128-bit entropy for QR nonces.
- **T3: Shoulder Surfing & Physical Interception (Information Disclosure):** Observation of screen display or notification banners.
  - *Countermeasure:* Ephemeral QR code rendering (auto-refreshing challenge tokens), mobile scanning confirmation requirement.
- **T4: Man-in-the-Middle (MITM) & Session Hijacking (Elevation):** Interception of transit tokens.
  - *Countermeasure:* TLS 1.3 encryption, cryptographically bound device identifiers, strict session token binding with `HttpOnly` and `SameSite=Strict`.
- **T5: Denial of Service & Resource Exhaustion (Denial of Service):** Flooding QR generation or OTP verification endpoints to exhaust server entropy or connection pools.
  - *Countermeasure:* Tiered rate limiting, pre-allocated connection pooling, bounded worker queues, and deterministic timeout budgets.

*Performance Tradeoff:* Every countermeasure (nonce validation, rate-limit lookup, atomic state update, cryptographic hashing) adds measurable latency. The platform isolates this security tax.

---

## 5. Experimental Variables

```
+---------------------------------------------------------------------------------------------------+
|                                      EXPERIMENTAL VARIABLES                                        |
+---------------------------------------------------------------------------------------------------+
|  INDEPENDENT VARIABLES                                                                            |
|  - Primary: Authentication Method {Password, OTP, QR, QR+OTP}                                     |
|  - Concurrency Level: {1, 10, 50, 100, 250, 500 virtual users}                                    |
|  - Arrival Rate Model: Closed-loop (fixed VUs) vs. Open-loop {10, 50, 100, 250, 500 req/s}        |
|  - Network Latency Profile: {0ms (LAN), 50ms (Broadband), 100ms (4G), 200ms (3G), 400ms (High)}   |
|  - Packet Loss Simulation: {0.0%, 0.5%, 1.0%, 2.5%}                                               |
|  - Cache Strategy: {Cache Disabled, In-Memory/Redis Cache Enabled}                                |
|  - OTP Code Length & Hashing: {6-digit HMAC-SHA256}                                                |
|  - QR Code Complexity: {Version 3, ECC Level M, 256-bit payload}                                  |
+---------------------------------------------------------------------------------------------------+
|  DEPENDENT VARIABLES                                                                              |
|  - End-to-End Latency ($T_{\text{total}}$): Total elapsed wall-clock duration from start to session |
|  - Sub-Stage Latencies: $T_{\text{qr\_gen}}, T_{\text{qr\_val}}, T_{\text{otp\_gen}},            |
|                         T_{\text{otp\_val}}, T_{\text{db}}, T_{\text{session}}, T_{\text{net}}$   |
|  - Latency Percentiles: $P_{25}, P_{50}, P_{75}, P_{90}, P_{95}, P_{99}, P_{99.9}, \text{Max}$    |
|  - Throughput: Requests/sec ($\mathcal{R}$), Successful Auths/sec ($\mathcal{S}$), Failed/sec     |
|  - Reliability & Quality: Success Rate (%), Error Rate (%), Timeout Rate (%), Retry Rate (%)      |
|  - Resource Utilization: Mean/Peak CPU (%), Heap Memory (MB), RSS (MB), Active DB Connections,     |
|                          Event-Loop Lag (ms), Network In/Out (KB/s)                               |
+---------------------------------------------------------------------------------------------------+
|  CONTROLLED VARIABLES                                                                             |
|  - Host Hardware: Intel/AMD x86_64, 16GB+ RAM, NVMe Storage, Dedicated Cores                      |
|  - Software Stack: Node.js v24.x, PostgreSQL 18.x, Fastify v5.x, Python 3.14.x                     |
|  - Dataset State: Seeded database with identical schema, pre-warmed connection pool (size=20)     |
|  - Cryptographic Algorithms: Argon2id/Bcrypt for passwords, HMAC-SHA256 for OTP, ECC for QR       |
|  - Mock Provider Latency: Deterministic distribution ($\mu=25\text{ms}, \sigma=2\text{ms}$)        |
+---------------------------------------------------------------------------------------------------+
```

---

## 6. Metrics Dictionary

| Metric Name | Formal Definition | Mathematical Formula | Unit | Data Source | Collection Method | Statistical Treatment |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **End-to-End Latency** ($T_{\text{e2e}}$) | Total duration from request dispatch to terminal authentication success response. | $T_{\text{end}} - T_{\text{start}}$ | Milliseconds (ms) | Client / Benchmark Harness | Monotonic timer (`performance.now()`) | Bootstrap 95% CI, $P_{50}, P_{95}, P_{99}$, IQR |
| **Server Processing Time** ($T_{\text{srv}}$) | Server-side execution time excluding network transit. | $\sum_{i=1}^k T_{\text{stage}, i}$ | Milliseconds (ms) | Fastify Request Hooks | High-res `process.hrtime.bigint()` | Median, Trimmed Mean (5%), Skewness |
| **QR Generation Latency** ($T_{\text{qr\_gen}}$) | Time spent generating cryptographically secure nonce and rendering QR matrix. | $T_{\text{qr\_render\_end}} - T_{\text{qr\_gen\_start}}$ | Milliseconds (ms) | QR Engine Hook | Monotonic nanosecond timer | Mean, SD, Non-parametric $U$-test |
| **QR Validation Latency** ($T_{\text{qr\_val}}$) | Time spent looking up challenge, verifying cryptographic signature, and checking expiration. | $T_{\text{qr\_val\_end}} - T_{\text{qr\_val\_start}}$ | Milliseconds (ms) | QR Auth Controller | Monotonic nanosecond timer | Median, $P_{95}$, Mann-Whitney $U$ |
| **OTP Generation Latency** ($T_{\text{otp\_gen}}$) | Time to generate 6-digit cryptographic token, compute HMAC/hash, and persist state. | $T_{\text{otp\_gen\_end}} - T_{\text{otp\_gen\_start}}$ | Milliseconds (ms) | OTP Service Hook | Monotonic nanosecond timer | Mean, Variance, Cohen's $d$ |
| **OTP Verification Latency** ($T_{\text{otp\_val}}$) | Time to retrieve active challenge, evaluate constant-time comparison, and mark consumed. | $T_{\text{otp\_val\_end}} - T_{\text{otp\_val\_start}}$ | Milliseconds (ms) | OTP Auth Controller | Monotonic nanosecond timer | Median, $P_{95}, P_{99}$ |
| **Database Latency** ($T_{\text{db}}$) | Cumulative query execution time across all database statements within the auth transaction. | $\sum_{j=1}^m \tau_{\text{query}, j}$ | Milliseconds (ms) | Prisma / DB Pool Interceptor | High-resolution query timer | Mean, $P_{95}$, Slow Query Count ($>50\text{ms}$) |
| **Session Dispatch Latency** ($T_{\text{sess}}$) | Time required to generate signed session token (JWT/secure cookie) and register active session. | $T_{\text{sess\_end}} - T_{\text{sess\_start}}$ | Milliseconds (ms) | Session Manager | Monotonic nanosecond timer | Mean, Median, SD |
| **Throughput ($\mathcal{R}$)** | Total authentication requests processed per unit time. | $\frac{N_{\text{total\_requests}}}{\Delta t_{\text{duration}}}$ | Requests/sec (req/s) | Benchmark Runner Engine | Time-windowed counter aggregate | Time-series moving average |
| **Successful Throughput ($\mathcal{S}$)** | Authentications successfully completing all factors per unit time. | $\frac{N_{\text{successful\_auth}}}{\Delta t_{\text{duration}}}$ | Auth/sec (auth/s) | Benchmark Runner Engine | Time-windowed counter aggregate | Plateau curve fitting, Peak capacity |
| **Success Rate ($R_{\text{succ}}$)** | Percentage of initiated authentications resulting in valid authenticated session. | $\frac{N_{\text{success}}}{N_{\text{attempts}}} \times 100$ | Percentage (%) | Event Collector Aggregator | Cumulative ratio | Wilson score interval (95% CI) |
| **Error Rate ($R_{\text{err}}$)** | Percentage of attempts resulting in HTTP 4xx/5xx or protocol violation. | $\frac{N_{\text{error}}}{N_{\text{attempts}}} \times 100$ | Percentage (%) | Event Collector Aggregator | Cumulative ratio | Binomial confidence bounds |
| **Timeout Rate ($R_{\text{to}}$)** | Percentage of requests exceeding maximum deadline threshold ($T > 10000\text{ms}$). | $\frac{N_{\text{timeout}}}{N_{\text{attempts}}} \times 100$ | Percentage (%) | Benchmark Harness | Threshold counter | Fisher's Exact Test vs baseline |
| **Latency Overhead ($\Delta L_{\%}$)** | Percentage increase in median latency relative to baseline password method. | $\frac{P_{50, M} - P_{50, \text{PWD}}}{P_{50, \text{PWD}}} \times 100$ | Percentage (%) | Statistical Analytics Engine | Ratio of medians | Standard error propagation |
| **CPU Utilization ($\text{CPU}_{\%}$)** | Average and peak percentage of CPU capacity utilized by node/database processes. | $\frac{\Delta t_{\text{cpu\_active}}}{\Delta t_{\text{wall\_time}}} \times 100$ | Percentage (%) | OS Process Monitor (`pidusage`) | Polled at 500ms intervals | Mean, Peak, $P_{95}$ |
| **Memory RSS ($\text{MEM}_{\text{rss}}$)** | Resident Set Size of application process. | $\text{RSS}_{\text{bytes}} / 1024^2$ | Megabytes (MB) | OS Process Monitor | Polled at 500ms intervals | Peak RSS, Heap delta ($\Delta \text{Heap}$) |
| **Event-Loop Lag ($\delta_{\text{evl}}$)** | Delay experienced by Node.js libuv event loop timer callbacks. | $t_{\text{actual\_callback}} - t_{\text{scheduled}}$ | Milliseconds (ms) | Event Loop Monitor | `perf_hooks.monitorEventLoopDelay` | Mean, $P_{95}$, Max Spike |

---

## 7. Experimental Design

### 7.1 Two-Tiered Benchmark Topology
1. **Synthetic Automated Benchmark (Virtual Users):**
   - High-throughput concurrency stress testing.
   - Deterministic virtual user workflows executing sequential and parallel state machines.
   - Isolated execution with reproducible random seeds.
2. **Human Interaction & Usability Study (Controlled Lab Trials):**
   - Separate measurement of human motor latencies: QR camera viewfinder alignment, screen scan latency, mobile notification acknowledgement, and 6-digit OTP keyboard entry.
   - *Methodological Rule:* Human latencies are stored in a dedicated, isolated dataset (`human_interaction_trials`) and are strictly partitioned from synthetic backend throughput metrics.

### 7.2 Open-Model vs. Closed-Model Load Generation
- **Closed-Model (Fixed Concurrency):** $N$ virtual users make a request, wait for the response, sleep for a think-time $T_{\text{think}} \sim \text{Exp}(\lambda)$, and repeat. Answers: *"How does the system handle $N$ concurrent authenticated active clients?"*
- **Open-Model (Constant Arrival Rate):** Requests arrive according to a Poisson process at fixed rate $\lambda \in \{10, 50, 100, 250, 500\}\text{ req/s}$ regardless of completion time. Answers: *"What is the queueing delay and latency explosion when arrival rate approaches capacity?"*

### 7.3 Cold vs. Warm State Partitioning
- **Cold Run Protocol:** Server process and database pool freshly initialized; first 50 requests recorded and tagged `state = 'COLD'`. Evaluates JIT compilation, connection establishment overhead, and buffer cache misses.
- **Warm Steady-State Protocol:** 100 warmup requests executed prior to data recording; subsequent $M$ requests tagged `state = 'WARM'`. Used for all primary statistical comparisons.

### 7.4 Replication and Trial Protocol
- Each experimental condition (Method $\times$ Concurrency $\times$ Network) is repeated across $K=30$ independent trials to satisfy the Central Limit Theorem for bootstrap resampling and avoid transient noise artifacts.

---

## 8. Benchmark Matrix

| Test ID | Method | Load Model | Concurrency / Rate | Network Profile | Added RTT / Loss | Cache Mode | Repetitions | Planned Requests |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **BM-01** | Password | Closed | 1 VU | LAN | 0ms / 0% | Disabled | 30 trials | $30 \times 100 = 3,000$ |
| **BM-02** | OTP | Closed | 1 VU | LAN | 0ms / 0% | Disabled | 30 trials | $30 \times 100 = 3,000$ |
| **BM-03** | QR | Closed | 1 VU | LAN | 0ms / 0% | Disabled | 30 trials | $30 \times 100 = 3,000$ |
| **BM-04** | QR+OTP | Closed | 1 VU | LAN | 0ms / 0% | Disabled | 30 trials | $30 \times 100 = 3,000$ |
| **BM-05..08** | All 4 Methods | Closed | 10 VUs | LAN | 0ms / 0% | Disabled | 30 trials | $4 \times 3,000 = 12,000$ |
| **BM-09..12** | All 4 Methods | Closed | 50 VUs | LAN | 0ms / 0% | Disabled | 30 trials | $4 \times 3,000 = 12,000$ |
| **BM-13..16** | All 4 Methods | Closed | 100 VUs | LAN | 0ms / 0% | Disabled | 30 trials | $4 \times 3,000 = 12,000$ |
| **BM-17..20** | All 4 Methods | Closed | 250 VUs | LAN | 0ms / 0% | Disabled | 30 trials | $4 \times 3,000 = 12,000$ |
| **BM-21..24** | All 4 Methods | Closed | 500 VUs | LAN | 0ms / 0% | Disabled | 30 trials | $4 \times 3,000 = 12,000$ |
| **BM-25..28** | All 4 Methods | Open | 50 req/s | Broadband | 50ms / 0% | Disabled | 10 trials | $4 \times 1,000 = 4,000$ |
| **BM-29..32** | All 4 Methods | Open | 100 req/s | 4G LTE | 100ms / 0.5% | Disabled | 10 trials | $4 \times 1,000 = 4,000$ |
| **BM-33..36** | All 4 Methods | Open | 250 req/s | 3G / Unstable | 200ms / 1.0% | Disabled | 10 trials | $4 \times 1,000 = 4,000$ |
| **BM-37..40** | All 4 Methods | Closed | 100 VUs | LAN | 0ms / 0% | Enabled (Redis) | 20 trials | $4 \times 2,000 = 8,000$ |
| **BM-SEC-01** | Security Suite | Stress | 50 VUs | Replay, Guessing, Expired Challenges | Disabled | 10 trials | 2,500 attacks |

---

## 9. Statistical Methodology

### 9.1 Normality and Distribution Testing
- Latency distributions routinely exhibit positive skewness and heavy tails.
- Every dataset is tested using the **Shapiro-Wilk test** ($\alpha=0.05$) and **Anderson-Darling test**.
- When normality is rejected ($p < 0.05$), non-parametric statistics (Median, IQR, Mann-Whitney $U$, Kruskal-Wallis) are automatically mandated over Gaussian metrics.

### 9.2 Hypothesis Testing & Post-Hoc Corrections
- **Multi-Group Comparison:** **Kruskal-Wallis test** to assess global differences across the four authentication methods.
- **Pairwise Comparisons:** **Dunn's test** or **Mann-Whitney $U$-test** applied for pairwise contrasts (e.g., QR+OTP vs. Password; QR+OTP vs. OTP).
- **Multiple Testing Correction:** Bonferroni-Holm family-wise error rate control: $\alpha_{\text{adjusted}} = \frac{\alpha}{m - i + 1}$.

### 9.3 Effect Size Estimation
P-values indicate whether an effect exists but not its magnitude. We compute:
- **Cliff's Delta ($d_c$):** Non-parametric effect size for ordinal/skewed distributions:
  $$\delta = \frac{\# |x_1 > x_2| - \# |x_1 < x_2|}{n_1 n_2}$$
  Thresholds: $|\delta| < 0.147$ (negligible), $< 0.33$ (small), $< 0.474$ (medium), $\ge 0.474$ (large).
- **Cohen's $d$ and Hedges' $g$:** Computed where distributional assumptions permit, with unbiased variance weighting.

### 9.4 Bootstrap Confidence Intervals
- For non-Gaussian estimators (Median, $P_{95}, P_{99}$), 95% Confidence Intervals are calculated via **Bias-Corrected and Accelerated (BCa) Bootstrap** with $B=2,000$ resamples.

### 9.5 Outlier Handling Protocol
- Outliers are identified using the interquartile criterion: $T < Q_1 - 1.5 \cdot \text{IQR}$ or $T > Q_3 + 1.5 \cdot \text{IQR}$.
- *Integrity Directive:* Outliers are **never silently deleted**. They are classified as:
  1. *Valid Performance Outlier* (e.g., GC pause, OS scheduling anomaly) - retained in primary analysis.
  2. *Measurement/Network Fault* (e.g., socket reset, benchmark crash) - documented in sensitivity logs with dual reporting (full dataset vs. filtered dataset).

---

## 10. Architecture

```
+----------------------------------------------------------------------------------------------------+
|                                    PLATFORM SYSTEM ARCHITECTURE                                    |
+----------------------------------------------------------------------------------------------------+
|                                                                                                    |
|  +----------------------------------------------------------------------------------------------+  |
|  |                             PRESENTATION LAYER (Next.js 15 + Tailwind CSS)                    |  |
|  |  +--------------------+  +--------------------+  +--------------------+  +----------------+  |  |
|  |  | Research Overview  |  | Live Monitor (SSE) |  | Method Comparison  |  | Scalability &  |  |  |
|  |  | & Benchmark Wizard |  | Real-Time Gauges   |  | Radar & Box Plots  |  | Saturation Curve| |  |
|  |  +--------------------+  +--------------------+  +--------------------+  +----------------+  |  |
|  |  +--------------------+  +--------------------+  +--------------------+  +----------------+  |  |
|  |  | Trace Flamegraph   |  | Statistical Engine |  | Security Tradeoff  |  | Academic Paper |  |  |
|  |  | Sub-stage Timeline |  | p-vals & Effect    |  | Attack Simulation  |  | Exporter & PDF |  |  |
|  |  +--------------------+  +--------------------+  +--------------------+  +----------------+  |  |
|  +----------------------------------------------------------------------------------------------+  |
|                                                | REST / SSE                                        |
|  +----------------------------------------------------------------------------------------------+  |
|  |                                APPLICATION SERVER (Fastify + TypeScript)                      |  |
|  |                                                                                              |  |
|  |  +-------------------------+  +-------------------------+  +------------------------------+  |  |
|  |  | Authentication Core     |  | Benchmark Engine        |  | Resource Monitor             |  |  |
|  |  | - Method A: Password    |  | - Virtual User Harness  |  | - Process CPU / RSS          |  |  |
|  |  | - Method B: OTP         |  | - Open/Closed Loop Gen  |  | - Event Loop Delay Monitor   |  |  |
|  |  | - Method C: QR Code     |  | - Network Delay Injector|  | - DB Pool Utilization        |  |  |
|  |  | - Method D: QR + OTP    |  | - Trial Coordinator     |  | - GC & Heap Sampler          |  |  |
|  |  +-------------------------+  +-------------------------+  +------------------------------+  |  |
|  |               |                                |                                             |  |
|  |  +----------------------------------------------------------------------------------------+  |  |
|  |  | High-Resolution Instrumentation & Trace Interceptor                                    |  |  |
|  |  | (Monotonic hrtime nanosecond timestamps, OpenTelemetry-compatible Distributed Context) |  |  |
|  |  +----------------------------------------------------------------------------------------+  |  |
|  +----------------------------------------------------------------------------------------------+  |
|                           |                                       |                                |
|  +----------------------------------+   +-------------------------------------------------------+  |
|  | PERSISTENCE (PostgreSQL 18 DB)   |   | STATISTICAL & ANALYTICS ENGINE (Python 3.14 + SciPy)  |  |
|  | - Experiments & Benchmark Runs   |   | - Pandas / NumPy / SciPy Stats Data Pipeline          |  |
|  | - Distributed Traces & Stages    |   | - Mann-Whitney, Kruskal-Wallis, Dunn-Bonferroni       |  |
|  | - Time-series System Metrics     |   | - Bootstrap BCa 95% CIs & Cliff's Delta Generator     |  |
|  | - Statistical Results & Findings |   | - Matplotlib / Seaborn Publication Vector Graphics    |  |
|  +----------------------------------+   +-------------------------------------------------------+  |
+----------------------------------------------------------------------------------------------------+
```

---

## 11. Database Schema

The database is built on PostgreSQL with Prisma ORM and strict temporal integrity:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum AuthMethod {
  PASSWORD
  OTP
  QR
  QR_OTP
}

enum LoadModel {
  CLOSED_CONCURRENCY
  OPEN_ARRIVAL_RATE
}

enum ExperimentStatus {
  CONFIGURED
  WARMING
  RUNNING
  COMPLETED
  FAILED
}

enum StageStatus {
  SUCCESS
  FAILED
  TIMEOUT
}

model Experiment {
  id              String            @id @default(uuid())
  code            String            @unique // e.g. "EXP-2026-001"
  title           String
  description     String?
  hypothesis      String
  authMethod      AuthMethod
  loadModel       LoadModel
  targetVUs       Int               // Virtual users
  targetRate      Float?            // req/s (for open model)
  durationSec     Int
  repetitions     Int               @default(1)
  networkProfile  String            @default("LAN_0MS")
  addedLatencyMs  Int               @default(0)
  packetLossPct   Float             @default(0.0)
  cacheEnabled    Boolean           @default(false)
  status          ExperimentStatus  @default(CONFIGURED)
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt
  
  benchmarkRuns   BenchmarkRun[]
  statisticalResults StatisticalResult[]

  @@index([authMethod, status])
}

model BenchmarkRun {
  id              String            @id @default(uuid())
  experimentId    String
  experiment      Experiment        @relation(fields: [experimentId], references: [id], onDelete: Cascade)
  trialNumber     Int               // e.g. Trial 1 to 30
  runStatus       ExperimentStatus  @default(RUNNING)
  startTime       DateTime          @default(now())
  endTime         DateTime?
  totalRequests   Int               @default(0)
  successfulAuths Int               @default(0)
  failedAuths     Int               @default(0)
  timeouts        Int               @default(0)
  
  // Aggregated Summary Statistics for Run
  meanLatencyMs   Float?
  medianLatencyMs Float?
  p90LatencyMs    Float?
  p95LatencyMs    Float?
  p99LatencyMs    Float?
  maxLatencyMs    Float?
  throughputRps   Float?
  
  traces          AuthenticationTrace[]
  resourceMetrics ResourceMetric[]

  @@index([experimentId, trialNumber])
}

model AuthenticationTrace {
  id              String            @id @default(uuid())
  traceId         String            @unique // TRC-xxxxxx
  benchmarkRunId  String
  benchmarkRun    BenchmarkRun      @relation(fields: [benchmarkRunId], references: [id], onDelete: Cascade)
  authMethod      AuthMethod
  participantType String            @default("SYNTHETIC") // SYNTHETIC or HUMAN
  clientStartTime BigInt            // Monotonic nanoseconds
  clientEndTime   BigInt            // Monotonic nanoseconds
  durationMs      Float             // Computed total duration
  statusCode      Int               // 200, 401, 500, etc.
  success         Boolean
  errorMessage    String?
  isWarm          Boolean           @default(true)
  outlierClass    String            @default("VALID") // VALID, SYSTEM_SPIKE, INVALID

  stages          AuthenticationStage[]

  @@index([benchmarkRunId, authMethod, success])
  @@index([durationMs])
}

model AuthenticationStage {
  id              String              @id @default(uuid())
  traceId         String
  trace           AuthenticationTrace @relation(fields: [traceId], references: [id], onDelete: Cascade)
  stageName       String              // QR_GEN, QR_VAL, OTP_GEN, OTP_VAL, DB_QUERY, SESSION_CREATE
  sequenceOrder   Int
  startNano       BigInt
  endNano         BigInt
  durationMs      Float
  status          StageStatus         @default(SUCCESS)
  metadataJson    String?             // Sanitized debug metadata (no secrets)

  @@index([traceId, stageName])
}

model ResourceMetric {
  id              String        @id @default(uuid())
  benchmarkRunId  String
  benchmarkRun    BenchmarkRun  @relation(fields: [benchmarkRunId], references: [id], onDelete: Cascade)
  timestamp       DateTime      @default(now())
  cpuPercent      Float
  memoryRssMb     Float
  memoryHeapMb    Float
  eventLoopLagMs  Float
  activeDbConns   Int
  dbQueriesPerSec Float?

  @@index([benchmarkRunId, timestamp])
}

model StatisticalResult {
  id              String        @id @default(uuid())
  experimentId    String
  experiment      Experiment    @relation(fields: [experimentId], references: [id], onDelete: Cascade)
  metricName      String        // e.g. "TOTAL_LATENCY", "P95_LATENCY", "THROUGHPUT"
  sampleSizeN     Int
  mean            Float
  median          Float
  stdDev          Float
  ci95Lower       Float         // BCa Bootstrap
  ci95Upper       Float
  testName        String?       // "Mann-Whitney U", "Kruskal-Wallis"
  testStatistic   Float?
  pValue          Float?
  effectSizeName  String?       // "Cliff's Delta", "Cohen's d"
  effectSizeValue Float?
  interpretation  String?
  generatedAt     DateTime      @default(now())

  @@index([experimentId, metricName])
}
```

---

## 12. API Design

### Authentication System Under Test (SUT)
- `POST /api/v1/auth/password`
  - Body: `{ username, password }`
  - Returns: `{ success, token, traceId, durationMs, stages: [...] }`
- `POST /api/v1/auth/otp/request`
  - Body: `{ username, phoneChannel? }`
  - Returns: `{ challengeId, traceId, durationMs, expiresAt }`
- `POST /api/v1/auth/otp/verify`
  - Body: `{ challengeId, code }`
  - Returns: `{ success, token, traceId, durationMs, stages: [...] }`
- `POST /api/v1/auth/qr/generate`
  - Body: `{ clientId }`
  - Returns: `{ qrChallengeId, qrPayloadSvg, qrPayloadRaw, traceId, expiresAt }`
- `POST /api/v1/auth/qr/scan-verify`
  - Body: `{ qrChallengeId, deviceSignature }`
  - Returns: `{ verified, traceId, stages: [...] }`
- `GET /api/v1/auth/qr/poll-status/:qrChallengeId`
  - Returns: `{ status: "PENDING" | "VERIFIED" | "EXPIRED", sessionToken? }`
- `POST /api/v1/auth/qr-otp/combined-init`
  - Body: `{ username }`
  - Returns: `{ qrChallengeId, qrPayloadSvg, otpChallengeId, traceId }`
- `POST /api/v1/auth/qr-otp/combined-verify`
  - Body: `{ qrChallengeId, otpChallengeId, code, deviceSignature }`
  - Returns: `{ success, token, traceId, durationMs, stages: [...] }`

### Benchmark Runner & Experiment Management
- `POST /api/v1/benchmark/experiment` - Create and configure an experimental specification.
- `POST /api/v1/benchmark/run/:experimentId` - Execute automated load generation runner.
- `GET /api/v1/benchmark/live-metrics` - Server-Sent Events (SSE) stream of real-time VU throughput, latency, CPU, and memory.
- `POST /api/v1/benchmark/abort/:experimentId` - Safely terminate active load generation.

### Analytics, Traces & Reports
- `GET /api/v1/analytics/experiment/:experimentId/summary` - Statistical aggregations and percentiles.
- `GET /api/v1/analytics/comparison` - Multi-method comparative data matrix.
- `GET /api/v1/analytics/traces/:traceId` - Fine-grained stage decomposition for flame-chart rendering.
- `POST /api/v1/analytics/export` - Export formatted datasets (`experiments.csv`, `trials.csv`, `stages.csv`, `latex_tables.tex`).

---

## 13. Instrumentation Architecture

1. **Nanosecond-Precision Timers:**
   - Instead of wall-clock time (`Date.now()` which is vulnerable to NTP skew and has $\sim 1\text{ms}$ resolution), every stage transition is measured using `process.hrtime.bigint()` (monotonic hardware counter with $\approx 1\text{ns}$ precision).
2. **Distributed Transaction Trace Context:**
   - Every request is tagged with an immutable `traceId` (UUIDv7 or nanoid) propagated across database calls, mock external services, and session generation.
3. **Stage Wrapper Pattern:**
   ```typescript
   async function measureStage<T>(
     tracer: TraceCollector,
     stageName: string,
     operation: () => Promise<T>
   ): Promise<T> {
     const startNano = process.hrtime.bigint();
     try {
       const result = await operation();
       const endNano = process.hrtime.bigint();
       tracer.recordStage(stageName, startNano, endNano, 'SUCCESS');
       return result;
     } catch (err) {
       const endNano = process.hrtime.bigint();
       tracer.recordStage(stageName, startNano, endNano, 'FAILED');
       throw err;
     }
   }
   ```
4. **Zero-Knowledge Telemetry:**
   - Hashes, salt values, plain passwords, and OTP digits are filtered at the logger layer. Only operational metadata (string lengths, algorithm identifiers, duration, status) are recorded.
5. **Asynchronous Non-Blocking Persistence:**
   - During high-concurrency benchmarks, traces are buffered in an in-memory ring buffer and flushed in batches to PostgreSQL to prevent the instrumentation itself from introducing Heisenberg observer-effect overhead.

---

## 14. Dashboard Architecture

The dashboard is structured into 8 cohesive research pages:

1. **Page 1: Research Overview & Laboratory Hub**
   - Summary statistics (total trials, methods evaluated, data points collected).
   - Interactive Experiment Creation Wizard with parameter validation.
2. **Page 2: Live Benchmark Real-Time Monitor**
   - Active virtual user gauge, real-time requests/sec counter, moving-window latency histogram, live CPU/Memory/Event Loop gauges updated via Server-Sent Events (SSE).
3. **Page 3: Performance Comparison Matrix**
   - Multi-method comparative visualizer: Latency distribution boxplots, throughput comparisons, and violin density estimators across methods.
4. **Page 4: Scalability & Saturation Analysis**
   - Concurrency vs. Throughput curve, Concurrency vs. $P_{95}/P_{99}$ Latency curve, and automatic saturation point inflection detection.
5. **Page 5: Bottleneck & Stage Decomposition**
   - Stacked bar charts and flame-style breakdown showing proportional contribution of QR generation, OTP verification, DB lookups, and session dispatch.
6. **Page 6: Authentication Trace Explorer**
   - Deep-dive inspect tool: Search by `traceId`, inspect millisecond stage waterfall, examine SQL query execution spans, and detect anomalies.
7. **Page 7: Statistical Inference & Hypothesis Testing**
   - Interactive statistical workbench: Null hypothesis statements, Kruskal-Wallis / Mann-Whitney $U$ test statistics, exact $p$-values, BCa bootstrap 95% confidence bounds, and Cliff's delta effect sizes.
8. **Page 8: Academic Paper Exporter & Report Generator**
   - 1-click generation of LaTeX tables, IEEE publication-ready SVG plots, and complete structured Markdown/PDF research reports.

---

## 15. Graph Specification

All graphs adhere to academic publication standards (monochrome-friendly color palettes, accessible contrasts, standard error bars, and dual-axis clarity):

- **Fig 1: Latency Distribution by Method (Box & Whisker + Scatter Overlay)**
  - X: Authentication Method; Y: Latency (ms, log scale). Outliers plotted with open circles.
- **Fig 2: Tail Latency Decomposition ($P_{50}, P_{90}, P_{95}, P_{99}$)**
  - Grouped bar chart comparing the 4 methods with 95% bootstrap error bars.
- **Fig 3: Concurrency vs. Throughput Saturation Curve**
  - X: Concurrent Users (1 to 500); Y: Successful Authentications / sec. Annotates linear regime, knee point, and degradation region.
- **Fig 4: Concurrency vs. $P_{95}$ Latency Escalation**
  - X: Concurrent Users; Y: $P_{95}$ Latency (ms). Demonstrates queue wait time buildup.
- **Fig 5: Multi-Stage Latency Decomposition (Stacked Bar)**
  - Proportional breakdown of QR generation, QR validation, OTP generation, OTP verification, DB query, and session issuance.
- **Fig 6: Marginal Factor Overhead Relative to Baseline Password**
  - Bar chart showing absolute (+ms) and percentage (+%) overhead incurred by OTP, QR, and QR+OTP.
- **Fig 7: Network Latency Impact Curve**
  - X: Simulated Network RTT (0ms, 50ms, 100ms, 200ms, 400ms); Y: Total Authentication Time. Illustrates round-trip amplification factor.
- **Fig 8: CPU & Memory Consumption Across Concurrency Tiers**
  - Dual-axis time-series / point plot showing mean CPU% and Heap usage per virtual user tier.
- **Fig 9: Error & Timeout Rates under Stress Concurrency**
  - X: Concurrency (100 to 500 VUs); Y: Error/Timeout Rate (%) with Wilson score intervals.
- **Fig 10: Security vs. Performance Tradeoff Frontier**
  - 2D scatter plot: Measured Latency Overhead vs. Theoretical Attack Resistance Level.

---

## 16. Research-Paper Mapping

| Paper Section | Platform Output & Data Artifact |
| :--- | :--- |
| **Section 5: Proposed Architecture** | System component diagram, sequence diagrams for QR challenge-response and OTP flow. |
| **Section 7: Experimental Environment** | Auto-generated reproducibility manifest (Host CPU, RAM, OS, Node/Postgres versions, Git commit hash). |
| **Section 8: Performance Metrics** | Formal Metrics Dictionary (Table 1), unit definitions, mathematical formulations. |
| **Section 10: Results - Latency** | Table 3: Summary latency statistics (Mean, Median, $P_{90}, P_{95}, P_{99}$, SD, IQR) + Fig 1 & Fig 2. |
| **Section 10: Results - Throughput** | Table 4: Peak throughput, saturation points, requests/sec vs. concurrency + Fig 3. |
| **Section 11: Statistical Analysis** | Table 7: Hypothesis testing results ($H$-statistic, $U$-statistic, $p$-values, Cliff's delta, 95% BCa CIs). |
| **Section 12: Stage Bottlenecks** | Fig 5: Stage decomposition waterfall, database query latency percentiles. |
| **Section 13: Security-Performance Tradeoff** | Table 8: Measured overhead of nonces, constant-time validation, and replay protection. |
| **Section 14: Scalability & Degradation** | Fig 4: Tail latency escalation curve, saturation threshold identification. |
| **Section 16: Limitations** | Auto-generated caveats on single-node benchmarking, mock SMS gateway variance, and OS thread scheduling. |

---

## 17. Implementation Roadmap

- **Phase 1: Environment & Foundational Configuration**
  - Initialize workspace, TypeScript configuration, Fastify server skeleton, Prisma ORM schema, and PostgreSQL database migrations.
- **Phase 2: Authentication Core Implementation**
  - Implement Method A (Password with bcrypt/argon2), Method B (OTP with HMAC-SHA256), Method C (QR challenge-response with matrix generation), and Method D (Combined QR+OTP atomic pipeline).
- **Phase 3: High-Resolution Monotonic Instrumentation**
  - Build trace wrapper, nanosecond stage timing, non-blocking telemetry buffer, and trace persistence layer.
- **Phase 4: Synthetic Benchmark & Load Generation Engine**
  - Implement concurrent Virtual User (VU) load runner, open-loop arrival generator, network latency simulator, and warm-up controller.
- **Phase 5: Resource & System Monitoring**
  - Build background polling agent for CPU, RSS memory, event-loop lag, and database connection pool statistics.
- **Phase 6: Python Statistical & Analytics Engine**
  - Create Python data processing bridge with SciPy, Pandas, Statsmodels for non-parametric tests, BCa bootstrap CIs, and Cliff's delta calculation.
- **Phase 7: Modern Research Dashboard (Next.js + Tailwind + Charts)**
  - Build the 8-page responsive web dashboard with live SSE telemetry, interactive charts, and publication exports.
- **Phase 8: Validation & Publication Artifact Generation**
  - Run comprehensive benchmark suite across all 4 methods, verify reproducible results, and generate LaTeX tables and academic markdown reports.

---

## 18. Validation Strategy

1. **Timing Accuracy & Monotonicity Calibration:**
   - Unit tests verify `process.hrtime.bigint()` consistency and confirm no clock-backward anomalies occur.
2. **Stage Timing Additivity Check:**
   - Statistical assertion: $\left| T_{\text{total}} - \sum T_{\text{stages}} - T_{\text{framework}} \right| < \epsilon$ where framework overhead is verified $< 1\text{ms}$.
3. **Data Integrity & Traceability Verification:**
   - Every summary metric in the dashboard links directly to its underlying `traceId` and raw timestamp records.
4. **Reproducibility Manifest Validation:**
   - Verification that experiment exports contain full hardware, OS, commit hash, and configuration parameters to allow exact replication on external clusters.
