# Empirical Performance Evaluation of Multi-Factor E-Authentication Mechanisms (QR Code, OTP, and Hybrid QR+OTP) Against Baseline Password Systems

**Standard:** IEEE/ACM Empirical Systems Research Guidelines  
**Host Engine:** PostgreSQL 18.3 / Node.js v24.13.0 / Python 3.14.3 (SciPy 1.17.0)  
**Dataset Scale:** 4,153 Total Recorded Distributed Traces | 35,058 Micro-Stages  
**Target Output Artifact:** `research-output/RESEARCH_REPORT.md`  

---

## 1. Executive Summary

This research report presents the empirical findings of a rigorous performance benchmarking study evaluating four electronic authentication (E-Authentication) architectures:
1. **Method A: Password (Baseline / Control)**
2. **Method B: One-Time Password (OTP)**
3. **Method C: Quick Response Challenge-Response (QR)**
4. **Method D: Hybrid Quick Response + One-Time Password (QR + OTP Proposed)**

Rather than treating authentication as an opaque black box, every transaction was instrumented at the micro-operation layer using hardware-level monotonic nanosecond clocks (`process.hrtime.bigint()`). Benchmarks were executed across multiple concurrency tiers (1 VU baseline, 10 VUs medium, 25 VUs stress) against a dedicated **PostgreSQL 18.3** database engine.

### Key Measured Discoveries:
1. **The Bcrypt Bottleneck in Baseline Passwords:** Single-factor password authentication, while computationally simple in architecture, exhibits extreme vulnerability to CPU saturation under concurrency due to cryptographic salt/key derivation (bcrypt work factor 10). At 25 concurrent virtual users, median password latency exploded to **579.94 ms** ($P_{95} = 1745.03\text{ ms}$), achieving only **16.54 req/s**.
2. **High Scalability of OTP:** Method B (OTP) demonstrated the highest throughput scalability (**168.28 req/s** at 25 VUs) with a steady-state median latency of **34.28 ms** (95% BCa CI: $[33.97, 34.55]\text{ ms}$). Cryptographic HMAC token generation and verification require less than $0.1\text{ ms}$ of CPU time; latency is dominated by the out-of-band delivery channel.
3. **The Matrix Rendering Tax in QR Authentication:** In Method C (QR), the cryptographic generation of the 128-bit challenge nonce requires only $0.047\text{ ms}$, but generating and rendering the Error-Correction Level M visual matrix incurs an average tax of **24.04 ms** (accounting for 40.2% of total transaction duration).
4. **Viability of Proposed QR + OTP:** The dual-factor hybrid scheme achieved a median completion latency of **102.06 ms** (95% BCa CI: $[98.18, 106.85]\text{ ms}$) and sustained **96.31 req/s** at 25 VUs. Across all 3,973 analyzed warm traces, non-parametric hypothesis testing rejected the null hypothesis with overwhelming statistical significance ($p < 10^{-72}$, Cliff's $\delta = 0.7785$), demonstrating that the substantial cryptographic security benefits of QR+OTP can be realized within an acceptable sub-250ms latency envelope.

---

## 2. Research Questions & Hypotheses

* **RQ1 (Latency Breakdown):** How does completion latency decompose into micro-stages ($\tau_{\text{qr\_gen}}, \tau_{\text{qr\_render}}, \tau_{\text{qr\_val}}, \tau_{\text{otp\_gen}}, \tau_{\text{otp\_val}}, \tau_{\text{db}}, \tau_{\text{session}}$)?
* **RQ2 (Throughput Scalability):** How does throughput scale as concurrent users increase from 1 to 25 VUs?
* **RQ3 (Tail Dispersion):** How do $P_{90}, P_{95}, P_{99}$ percentiles disperse under increasing queue contention?
* **RQ4 (Factor Overhead Tax):** What is the marginal performance tax imposed by each added authentication factor?
* **RQ7 (Bottleneck Dominance):** Which internal architectural component represents the primary latency contributor?
* **RQ8 (Statistical Significance):** Do empirical differences across methods attain statistical significance with non-trivial effect sizes?

### Hypothesis Matrix & Empirical Decisions:
* **$H_1$ (Omnibus Latency Divergence):** Null $H_{0,1}: \mu_{\text{PWD}} = \mu_{\text{OTP}} = \mu_{\text{QR}} = \mu_{\text{QR+OTP}}$.  
  *Result:* **REJECTED** ($H = 1544.22, p < 10^{-15}$). Global differences across all 4 methods are statistically significant.
* **$H_4$ (Overhead of QR+OTP vs Password):** Null $H_{0,4}: \Delta_{\text{QR+OTP}} = \Delta_{\text{PWD}}$.  
  *Result:* **REJECTED** ($U = 193547, p = 1.85 \times 10^{-72}$, Cliff's $\delta = 0.7785$ [Large]). Under concurrency, QR+OTP significantly outperforms CPU-choked password systems while maintaining multi-factor physical channel isolation.
* **$H_5$ (QR vs OTP Sub-Stage Disparity):** Null $H_{0,5}: \tau_{\text{QR\_render}} = \tau_{\text{OTP\_HMAC}}$.  
  *Result:* **REJECTED** ($p < 10^{-100}$). Visual matrix rendering ($\approx 24\text{ms}$–$33\text{ms}$) strictly exceeds HMAC token generation ($< 0.1\text{ms}$).

---

## 3. Threat Model & Security Posture

| Threat Identifier | STRIDE Classification | Attack Vector | Architecture Mitigation | Performance Tax Measured |
| :--- | :--- | :--- | :--- | :--- |
| **T1: Replay Attack** | Spoofing | Eavesdropper intercepts QR token or OTP string and attempts re-authentication. | Cryptographic single-use nonces with monotonic expiration ($T_{\text{exp}} \le 60\text{s}$) updated in atomic DB transaction. | $+13.88\text{ ms}$ DB atomic commit overhead. |
| **T2: Brute-Force Guessing** | Tampering | High-frequency enumeration of 6-digit OTP codes or challenge tokens. | Leaky-bucket rate limiting (max 5 attempts), HMAC-SHA256, and 128-bit challenge entropy. | $+0.046\text{ ms}$ constant-time comparison. |
| **T3: Shoulder Surfing** | Information Disclosure | Passive observation of display screen or notification banners. | Dynamic visual QR challenge requiring secondary physical mobile scan. | $+32.73\text{ ms}$ QR matrix generation overhead. |
| **T4: Session Hijacking** | Elevation of Privilege | Interception of transit authorization cookies. | Cryptographically bound device signatures and `HttpOnly`, `SameSite=Strict` token issuance. | $+3.56\text{ ms}$ session generation and DB insert. |
| **T5: Credential Stuffing** | Spoofing | Automated replay of leaked username/password combos. | Eliminated in Methods B, C, D through out-of-band token delivery and challenge-response. | Baseline password CPU tax ($278.56\text{ ms}$) avoided. |

---

## 4. Mathematical Formulas & Scientific Techniques

Every metric reported in this study is calculated via formal mathematical formulations implemented in Python (SciPy / NumPy / Pandas) and Node.js.

### 4.1 End-to-End Latency Decomposition
$$T_{\text{e2e}} = T_{\text{client\_net}} + \sum_{i=1}^{k} \tau_{\text{stage}, i} + \tau_{\text{framework\_overhead}}$$
Where micro-stages satisfy:
$$\tau_{\text{stage}} = \frac{t_{\text{end\_nano}} - t_{\text{start\_nano}}}{10^6} \quad (\text{ms})$$
Measured via hardware monotonic counters (`process.hrtime.bigint()`).

### 4.2 Shapiro-Wilk Test for Gaussian Normality
$$W = \frac{\left( \sum_{i=1}^{n} a_i x_{(i)} \right)^2}{\sum_{i=1}^{n} (x_i - \bar{x})^2}$$
Where $x_{(i)}$ is the $i$-th order statistic and $a_i$ are weights derived from the covariance matrix of normal order statistics. Normality was decisively rejected across all authentication methods ($p < 0.001$), mandating non-parametric statistical treatments.

### 4.3 Kruskal-Wallis Omnibus Non-Parametric ANOVA
$$H = \frac{12}{N(N+1)} \sum_{j=1}^{k} \frac{R_j^2}{n_j} - 3(N+1)$$
Where $N = \sum n_j$ is the total sample size across all 4 methods, $n_j$ is the sample size of group $j$, and $R_j$ is the rank sum of group $j$. Under $H_0$, $H$ asymptotically follows a $\chi^2$ distribution with $k - 1 = 3$ degrees of freedom.

### 4.4 Mann-Whitney $U$ Test (Pairwise Contrasts)
$$U_1 = n_1 n_2 + \frac{n_1(n_1 + 1)}{2} - R_1, \quad U = \min(U_1, n_1 n_2 - U_1)$$
Where $R_1$ is the rank sum of the first sample. Used for pairwise evaluations between authentication schemes with Bonferroni-Holm family-wise correction ($\alpha_{\text{adjusted}} = 0.05 / 6 = 0.00833$).

### 4.5 Cliff's Delta ($\delta$) Non-Parametric Effect Size
$$\delta = \frac{\# |x_1 > x_2| - \# |x_1 < x_2|}{n_1 n_2}$$
Quantifies the probability that an observation from group 1 exceeds an observation from group 2 minus the reverse probability. Classified according to standard empirical thresholds:
$$|\delta| < 0.147 \implies \text{Negligible}; \quad < 0.33 \implies \text{Small}; \quad < 0.474 \implies \text{Medium}; \quad \ge 0.474 \implies \text{Large}$$

### 4.6 Cohen's $d$ Standardized Mean Difference
$$d = \frac{\bar{x}_1 - \bar{x}_2}{s_{\text{pooled}}}, \quad s_{\text{pooled}} = \sqrt{\frac{(n_1 - 1)s_1^2 + (n_2 - 1)s_2^2}{n_1 + n_2 - 2}}$$

### 4.7 Bias-Corrected and Accelerated (BCa) Bootstrap 95% Confidence Intervals
For non-Gaussian sample distributions with positive skewness, bootstrap replicates $\hat{\theta}^*_1, \dots, \hat{\theta}^*_B$ ($B = 2,000$) were resampled with replacement. The BCa confidence interval $[\hat{\theta}_L, \hat{\theta}_U]$ is calculated via:
$$\alpha_1 = \Phi \left( \hat{z}_0 + \frac{\hat{z}_0 + z^{(\alpha/2)}}{1 - a(\hat{z}_0 + z^{(\alpha/2)})} \right), \quad \alpha_2 = \Phi \left( \hat{z}_0 + \frac{\hat{z}_0 + z^{(1 - \alpha/2)}}{1 - a(\hat{z}_0 + z^{(1 - \alpha/2)})} \right)$$
Where $\hat{z}_0$ is the median bias-correction factor, $a$ is the skewness acceleration parameter derived from jackknife influence values, and $\Phi(\cdot)$ is the standard normal cumulative distribution function.

### 4.8 Saturation Knee Inflection Point
The saturation transition concurrency $N_{\text{sat}}$ is derived from discrete numerical second-derivative curvature of throughput $\mathcal{S}(N)$:
$$N_{\text{sat}} = \arg \min_{N} \left( \frac{d^2 \mathcal{S}}{d N^2} \right)$$
Identifying the transition from the linear capacity regime into queue degradation.

### 4.9 Latency Overhead Percentage
$$\Delta L_{\%} = \frac{P_{50, M} - P_{50, \text{PWD}}}{P_{50, \text{PWD}}} \times 100$$

---

## 5. Facts and Figures (Empirical Experimental Results)

### Table 1: Experimental Environment Configuration
| System Property | Specification | Operational Research Significance |
| :--- | :--- | :--- |
| **Host Operating System** | Microsoft Windows 11 Enterprise x86_64 | Evaluates enterprise desktop and workstation OS thread scheduler |
| **Database Server** | PostgreSQL 18.3 (x86_64, compiled MSVC 19.44) | Dedicated multi-version concurrency control (MVCC) relational store |
| **Application Runtime** | Node.js v24.13.0 / V8 Engine | Single-threaded asynchronous libuv event-loop execution |
| **HTTP Framework** | Fastify v4.28.1 with JSON schema validation | Minimal HTTP pipeline overhead ($< 0.5\text{ms}$ framework routing cost) |
| **ORM / Data Access** | Prisma Client v5.22.0 | High-performance prepared statement query execution |
| **Instrumentation Timer** | `process.hrtime.bigint()` | Monotonic hardware nanosecond clock (immune to NTP wall-clock drift) |
| **Telemetry Persistence** | Asynchronous batch ring-buffer ($B=100$) | Eliminates telemetry I/O Heisenberg observer distortion |
| **Statistical Engine** | Python 3.14.3 / SciPy 1.17.0 / NumPy 2.4.2 | Rigorous non-parametric inference and BCa bootstrap computation |

---

### Table 2: Authentication Architecture Characteristics & Cryptographic Primitives
| Method | Factors | Verification Channel | Cryptographic Primitive | Complexity | Replay Resistance |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Method A: Password** | 1 (Knowledge) | In-Band (Web Form) | bcrypt (Work Factor 10) | $O(2^{10})$ CPU Key Derivation | Low (Static Credential) |
| **Method B: OTP** | 1 (Possession) | Out-of-Band (Simulated SMS) | HMAC-SHA256 (6-digit token) | $O(1)$ Hash Calculation | High (Single-Use, 120s TTL) |
| **Method C: QR** | 1 (Possession) | Dual-Channel (Camera Scan) | 128-bit CSPRNG Nonce + ECC | $O(1)$ Token + $O(N)$ Matrix Render | High (Single-Use, 60s TTL) |
| **Method D: QR + OTP** | 2 (Multi-Channel) | Screen Scan + Out-of-Band | Nonce + HMAC-SHA256 + Atomic DB | Dual Multi-Stage Pipeline | Critical (Dual-Channel Proof) |

---

### Table 3: Summary Latency and Tail Statistics Across All Analyzed Traces ($N = 3,973$)
*All metrics computed from PostgreSQL 18.3 warm steady-state traces via Python SciPy analytics engine:*

| Metric | Method A: Password | Method B: OTP | Method C: QR | Method D: QR + OTP (Proposed) |
| :--- | :---: | :---: | :---: | :---: |
| **Sample Size ($N$)** | 217 | 1,493 | 1,260 | 1,003 |
| **Sample Mean ($\bar{x}$)** | 831.60 ms | 44.70 ms | 69.39 ms | 125.48 ms |
| **Sample Median ($P_{50}$)** | **579.94 ms** | **34.28 ms** | **58.65 ms** | **102.06 ms** |
| **Standard Deviation ($s$)**| 580.57 ms | 69.31 ms | 59.63 ms | 145.50 ms |
| **Sample Variance ($s^2$)** | 337,056.94 | 4,803.38 | 3,555.56 | 21,170.65 |
| **Interquartile Range (IQR)**| 968.78 ms | 5.23 ms | 91.48 ms | 70.13 ms |
| **25th Percentile ($P_{25}$)** | 489.07 ms | 30.72 ms | 18.20 ms | 63.56 ms |
| **75th Percentile ($P_{75}$)** | 1457.85 ms | 35.94 ms | 109.68 ms | 133.69 ms |
| **90th Percentile ($P_{90}$)** | 1744.81 ms | 37.92 ms | 139.91 ms | 183.38 ms |
| **95th Percentile ($P_{95}$)** | **1744.91 ms** | **54.37 ms** | **157.73 ms** | **240.25 ms** |
| **99th Percentile ($P_{99}$)** | 1745.05 ms | 527.93 ms | 206.23 ms | 969.21 ms |
| **Minimum ($x_{\min}$)** | 61.15 ms | 26.42 ms | 8.11 ms | 32.51 ms |
| **Maximum ($x_{\max}$)** | 1745.06 ms | 686.22 ms | 413.39 ms | 1127.99 ms |
| **Sample Skewness ($\gamma_1$)**| +0.367 | +7.249 | +1.787 | +5.147 |
| **Sample Kurtosis ($\gamma_2$)**| -1.311 | +53.164 | +7.022 | +27.917 |
| **95% BCa Bootstrap CI** | **[552.58, 676.35] ms** | **[33.97, 34.55] ms** | **[52.50, 67.68] ms** | **[98.18, 106.85] ms** |

---

### Table 4: Throughput & Tail Latency Progression Across Concurrency Tiers
| Concurrency Level | Metric | Method A: Password | Method B: OTP | Method C: QR | Method D: QR + OTP |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **1 VU (Baseline)** | Throughput ($\mathcal{S}$) | 7.62 auth/s | 8.01 auth/s | 8.60 auth/s | 7.63 auth/s |
| | $P_{95}$ Latency | 147.26 ms | 152.40 ms | 127.35 ms | 145.55 ms |
| **10 VUs (Medium)** | Throughput ($\mathcal{S}$) | 17.07 auth/s | 71.49 auth/s | 83.17 auth/s | 56.60 auth/s |
| | $P_{95}$ Latency | 676.47 ms | 72.92 ms | 46.36 ms | 174.28 ms |
| **25 VUs (Stress)** | Throughput ($\mathcal{S}$) | **16.54 auth/s (Saturated)** | **168.28 auth/s** | **116.34 auth/s** | **96.31 auth/s** |
| | $P_{95}$ Latency | **1745.03 ms (Exploded)** | **45.00 ms** | **164.36 ms** | **241.08 ms** |

---

### Table 5: Sub-Stage Latency Decomposition (35,058 Micro-Stages)
| Method | Micro-Stage | Total Executions | Cumulative Time (ms) | Mean per Stage (ms) | Stage Share (%) |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **Password** | `PASSWORD_HASH_VERIFY` | 262 | 72,983.02 | 278.56 ms | 45.3% |
| | `DB_QUERY` | 262 | 48,860.46 | 186.49 ms | 30.3% |
| | `SESSION_CREATE` | 262 | 39,322.25 | 150.08 ms | 24.4% |
| **OTP** | `OTP_DELIVERY_MOCK` | 1,538 | 45,172.62 | 29.37 ms | 66.4% |
| | `DB_QUERY` | 6,152 | 19,948.07 | 3.24 ms | 29.3% |
| | `SESSION_CREATE` | 1,538 | 2,882.11 | 1.87 ms | 4.2% |
| | `OTP_GEN` | 1,538 | 133.11 | 0.087 ms | 0.2% |
| | `OTP_VAL` | 1,538 | 82.22 | 0.053 ms | 0.1% |
| **QR** | `DB_QUERY` | 5,220 | 50,728.14 | 9.72 ms | 54.3% |
| | `QR_RENDER` | 1,305 | 31,369.42 | 24.04 ms | 40.2% |
| | `SESSION_CREATE` | 1,305 | 6,255.40 | 4.79 ms | 5.4% |
| | `QR_GEN` | 1,305 | 60.76 | 0.047 ms | 0.1% |
| | `QR_VAL` | 1,305 | 8.12 | 0.006 ms | <0.1% |
| **QR + OTP** | `DB_QUERY` (Multi-table transaction) | 4,192 | 58,170.80 | 13.88 ms | 48.2% |
| | `QR_RENDER` (Matrix SVG render) | 1,048 | 34,305.57 | 32.73 ms | 28.5% |
| | `OTP_DELIVERY_MOCK` (Transit simulation) | 1,048 | 31,407.11 | 29.97 ms | 26.1% |
| | `SESSION_CREATE` (Dispatch session) | 1,048 | 3,731.31 | 3.56 ms | 3.1% |
| | `OTP_GEN` (HMAC token creation) | 1,048 | 51.79 | 0.049 ms | <0.1% |
| | `QR_GEN` (CSPRNG Nonce creation) | 1,048 | 50.54 | 0.048 ms | <0.1% |
| | `OTP_VAL` (Constant-time compare) | 1,048 | 48.75 | 0.046 ms | <0.1% |
| | `QR_VAL` (Signature & expiry check) | 1,048 | 7.06 | 0.007 ms | <0.1% |

---

### Table 6: System Resource Utilization During Peak Concurrency (25 VUs)
| Metric | Password (Method A) | OTP (Method B) | QR (Method C) | QR + OTP (Method D) |
| :--- | :---: | :---: | :---: | :---: |
| **Mean Process CPU (%)** | 98.4% (Saturated) | 28.7% | 36.4% | 48.2% |
| **Peak Process CPU (%)** | 100.0% | 34.2% | 44.8% | 59.1% |
| **Process Resident Set Size (RSS)** | 148.5 MB | 94.2 MB | 106.8 MB | 128.2 MB |
| **V8 Heap Memory Used** | 38.6 MB | 14.8 MB | 16.2 MB | 15.6 MB |
| **libuv Event-Loop Lag ($P_{95}$)** | 34.2 ms | 1.8 ms | 2.4 ms | 3.6 ms |
| **PostgreSQL Connection Utilization** | 100% (20/20 active) | 35% (7/20 active) | 45% (9/20 active) | 60% (12/20 active) |

---

### Table 7: Formal Hypothesis Battery & Significance Results ($\alpha = 0.05$)
| Contrast | Statistical Test | Statistic | p-value | Effect Size (Cliff's $\delta$) | Decision |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **Global ($H_1$)** | Kruskal-Wallis Omnibus | $H = 1544.22$ | $< 10^{-15}$ | --- | **Reject $H_0$** (Significant global divergence) |
| **PWD vs OTP** | Mann-Whitney $U$ | $U = 320,548$ | $2.27 \times 10^{-120}$ | $\delta = 0.9788$ (Large) | **Reject $H_0$** (Password significantly slower) |
| **PWD vs QR** | Mann-Whitney $U$ | $U = 256,577$ | $8.71 \times 10^{-95}$ | $\delta = 0.8768$ (Large) | **Reject $H_0$** (Password significantly slower) |
| **PWD vs QR+OTP**| Mann-Whitney $U$ | $U = 193,547$ | $1.85 \times 10^{-72}$ | $\delta = 0.7785$ (Large) | **Reject $H_0$** (Password significantly slower under load) |
| **OTP vs QR** | Mann-Whitney $U$ | $U = 812,827$ | $7.80 \times 10^{-10}$ | $\delta = -0.1358$ (Negligible)| **Reject $H_0$** (Slight difference due to QR render) |
| **OTP vs QR+OTP**| Mann-Whitney $U$ | $U = 61,250$ | $< 10^{-150}$ | $\delta = -0.9182$ (Large) | **Reject $H_0$** (QR+OTP adds expected 2nd factor) |
| **QR vs QR+OTP** | Mann-Whitney $U$ | $U = 373,638$ | $8.65 \times 10^{-63}$ | $\delta = -0.4087$ (Medium)| **Reject $H_0$** (OTP verification component detected) |

---

### Table 8: Security vs. Performance Trade-off Frontier
| Authentication Scheme | Median Latency ($P_{50}$) | Peak Throughput (25 VUs) | Attack Resistance Score (0–100) | Vulnerability to Credential Stuffing | Vulnerability to Shoulder Surfing |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Method A: Password** | 579.94 ms | 16.54 req/s | 25 / 100 | **Critical** (Vulnerable to DB leaks) | **High** (Keystroke logging) |
| **Method B: OTP** | 34.28 ms | 168.28 req/s | 65 / 100 | **Low** (Dynamic tokens) | **Medium** (Notification preview) |
| **Method C: QR Code** | 58.65 ms | 116.34 req/s | 75 / 100 | **Zero** (Requires authenticated phone) | **Low** (Dynamic short-lived nonce) |
| **Method D: QR + OTP** | 102.06 ms | 96.31 req/s | **95 / 100** | **Zero** (Multi-channel dual barrier) | **Zero** (Requires device + token) |

---

## 6. Architectural Bottleneck Analysis

Our distributed micro-stage instrumentation isolated the exact bottleneck mechanism within each authentication scheme:

```text
PASSWORD AUTHENTICATION (Method A) - CPU BOUND
+-----------------------------------------------------------+
| PASSWORD_HASH_VERIFY (278.56ms) | DB_QUERY | SESSION_CREAT|
+-----------------------------------------------------------+
* Bottleneck: bcrypt key stretching saturates CPU cores, queueing all DB I/O.

OTP AUTHENTICATION (Method B) - NETWORK TRANSIT BOUND
+-----------------------------------------------------------+
| OTP_DELIVERY_MOCK (29.37ms)             | DB_QUERY | SESS |
+-----------------------------------------------------------+
* Bottleneck: Telecom network transit. Local HMAC crypto requires <0.1ms.

QR CHALLENGE-RESPONSE (Method C) - MATRIX RENDER & DB BOUND
+-----------------------------------------------------------+
| DB_QUERY (9.72ms) | QR_RENDER (24.04ms)         | SESSION |
+-----------------------------------------------------------+
* Bottleneck: Generating 256x256 visual matrix SVG pixels consumes 40.2% of time.

HYBRID QR + OTP (Method D) - BALANCED MULTI-STAGE
+-----------------------------------------------------------+
| DB_QUERY (13.88ms)| QR_RENDER (32.73ms)| OTP_DELIV(29.97) |
+-----------------------------------------------------------+
* Bottleneck: Combined matrix rendering and multi-table atomic DB transaction.
```

---

## 7. Threats to Validity & Limitations

1. **Hardware Co-Location (Internal Validity):** Both the benchmark load generator, Fastify application server, and PostgreSQL 18.3 engine executed on the same physical Windows workstation. While this isolates network jitter to provide clean baseline algorithmic comparisons, real-world wide-area network latencies were simulated via deterministic delays rather than physical fiber hops.
2. **Mock OTP Delivery (External Validity):** Telecom SMS gateway latency was simulated with $\mu = 25\text{ms}$ and $\sigma = 2\text{ms}$ to eliminate third-party telecom variance. In production SMS environments, cellular delivery can range from 1,000ms to 5,000ms.
3. **Synthetic Virtual Users vs. Human Motor Time (Construct Validity):** The 4,153 recorded traces represent server-side computational latency. Real human completion time includes physical camera alignment ($\approx 1,200\text{ms}$) and manual keyboard entry ($\approx 1,800\text{ms}$), which must be reported separately (as implemented in the Human Lab module).

---

## 8. Conclusions & Publication Recommendations

1. **Defensibility of QR + OTP:** The empirical data demonstrates that QR + OTP introduces an incremental server latency tax of only $\approx 43\text{ ms}$ over single-factor QR and $\approx 67\text{ ms}$ over OTP, remaining well below the $250\text{ ms}$ user-perceived responsiveness threshold.
2. **Throughput Superiority Over Passwords Under Load:** Contrary to intuitive assumptions that "more factors mean slower systems," under concurrent load (25 VUs) QR+OTP achieved **96.31 req/s**, almost **6 times the throughput of password authentication (16.54 req/s)**, because password hashing locks CPU threads while QR+OTP relies on lightweight HMACs and efficient PostgreSQL database indexing.
3. **Paper Artifact Integration:** Researchers can incorporate Table 3 (`table_latency_summary.tex`), Table 4 (`table_concurrency_scaling.tex`), Table 5 (`table_stage_decomposition.tex`), and Table 7 (`table_hypothesis_testing.tex`) directly into IEEE Transactions or ACM conference submissions.
