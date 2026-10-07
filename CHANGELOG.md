# Changelog & Scientific Rigor Audit Log

All notable modifications to the benchmarking, statistical analysis, figure rendering, and publication reporting subsystems of the AuthBench platform are documented below.

This refactoring was executed to ensure that all final research outputs are **scientifically defensible**, **statistically rigorous**, **academically honest**, and **100% reproducible** directly from the empirical dataset (`traces_empirical.csv`, $N = 3,973$; `stages_decomposition.csv`, $N = 35,058$).

---

## [2.0.0] - Publication-Ready Statistical & Reporting Architecture

### 1. Summary of Changes & Rationale

| Component | Files Modified / Created | Nature of Change & Scientific Rationale |
| :--- | :--- | :--- |
| **Statistical Engine** | [`analytics/engine.py`](file:///c:/Users/skbeh/Music/AuthBench-Authentication-Performance-Benchmarking-Platform/analytics/engine.py) | **Enhanced Statistical Rigor**: Seeded BCa bootstrap with `np.random.default_rng(42)` for deterministic reproducibility across runs. Added complete sample sizes ($n_1, n_2$), degrees of freedom ($\text{df}=3$), and formal distributional equality null hypothesis statements ($H_0: F_1 = F_2$) to Kruskal-Wallis omnibus and Mann-Whitney U tests. Implemented step-down Holm-Bonferroni family-wise error rate control ($p_{\text{holm}}$) across all 6 pairwise contrasts. Added Cliff's delta ($\delta$) non-parametric effect sizes with standard magnitude categorization (Negligible, Small, Medium, Large). |
| **Standalone Analysis Pipeline** | [`scripts/run_analysis.py`](file:///c:/Users/skbeh/Music/AuthBench-Authentication-Performance-Benchmarking-Platform/scripts/run_analysis.py) *(new)* | **Zero-Dependency Reproducibility**: Implemented standalone script that loads raw CSVs directly (`traces_empirical.csv` and `stages_decomposition.csv`) without requiring a live PostgreSQL instance, computes exact distribution metrics, BCa CIs, omnibus/pairwise hypothesis tests, and stage contributions, and outputs [`research-output/statistical_results.json`](file:///c:/Users/skbeh/Music/AuthBench-Authentication-Performance-Benchmarking-Platform/research-output/statistical_results.json). |
| **Figure Generation** | [`scripts/generate_figures.py`](file:///c:/Users/skbeh/Music/AuthBench-Authentication-Performance-Benchmarking-Platform/scripts/generate_figures.py) | **Scientific Defensibility & Terminology Cleanup**: Completely purged unsupported Figure 7 ("Empirical Security vs. Latency Frontier") and deleted obsolete fig7 image files (`.png`, `.svg`, `.pdf`). Refactored Figures 5, 8, and 10 to compute sub-stage decomposition and percentage contributions directly from the 35,058 empirical micro-stage records. Replaced misleading cellular labels with accurate terminology ("Simulated out-of-band OTP delay"). Re-rendered composite preview sheet with 9 valid figures. |
| **Report & Table Synthesis** | [`scripts/generate_reports.py`](file:///c:/Users/skbeh/Music/AuthBench-Authentication-Performance-Benchmarking-Platform/scripts/generate_reports.py) *(new)* | **Publication Reporting**: Generates 4 modular publication LaTeX tables (`table_latency_summary.tex`, `table_concurrency_scaling.tex`, `table_stage_decomposition.tex`, `table_hypothesis_testing.tex`), full research reports ([`RESEARCH_REPORT.md`](file:///c:/Users/skbeh/Music/AuthBench-Authentication-Performance-Benchmarking-Platform/research-output/RESEARCH_REPORT.md) and [`report.md`](file:///c:/Users/skbeh/Music/AuthBench-Authentication-Performance-Benchmarking-Platform/research-output/report.md)), figure preview documentation ([`FIGURES_PREVIEW.md`](file:///c:/Users/skbeh/Music/AuthBench-Authentication-Performance-Benchmarking-Platform/research-output/FIGURES_PREVIEW.md)), and consistency audits ([`CONSISTENCY_AUDIT.md`](file:///c:/Users/skbeh/Music/AuthBench-Authentication-Performance-Benchmarking-Platform/research-output/CONSISTENCY_AUDIT.md)). Removed all unsubstantiated penetration-testing percentages, replaced placeholder texts, and structured RQs (RQ1–RQ6) and hypotheses ($H_1, H_{2a}$–$H_{2f}$). |
| **End-to-End Orchestrator** | [`scripts/run_pipeline.py`](file:///c:/Users/skbeh/Music/AuthBench-Authentication-Performance-Benchmarking-Platform/scripts/run_pipeline.py) *(new)* | **Automated Integrity Verification**: Chains `run_analysis.py` -> `generate_figures.py` -> `generate_reports.py` and runs 14 automated verification assertions (checking file existence, non-emptiness, exact numerical consistency against raw CSVs, absence of placeholders, and absence of unsupported figures/metrics). |
| **Database Exporter Fallback** | [`scripts/export_and_analyze.ts`](file:///c:/Users/skbeh/Music/AuthBench-Authentication-Performance-Benchmarking-Platform/scripts/export_and_analyze.ts) | **Fault-Tolerant Export**: Added graceful fallback to `scripts/run_analysis.py` if PostgreSQL is offline or unreachable in local development. |
| **Backend API Route Alignment** | [`backend/src/routes/analytics.routes.ts`](file:///c:/Users/skbeh/Music/AuthBench-Authentication-Performance-Benchmarking-Platform/backend/src/routes/analytics.routes.ts) | **Consistency**: Corrected hypothesis test null hypothesis strings and replaced hardcoded LaTeX table templates with dynamic loading from `table_latency_summary.tex`. |
| **NPM Script Integration** | [`package.json`](file:///c:/Users/skbeh/Music/AuthBench-Authentication-Performance-Benchmarking-Platform/package.json) | **Developer Ergonomics**: Added `npm run pipeline`, `npm run pipeline:analyze`, `npm run pipeline:figures`, and `npm run pipeline:reports`. |

---

### 2. Summary of Statistical Analysis Executed

All statistical calculations were executed on the warm trace population ($N = 3,973$ request traces, excluding 180 cold-start warm-up iterations) and micro-stage decomposition records ($N = 35,058$ micro-stages):

#### 2.1 Latency Distributions & 95% BCa Bootstrap Confidence Intervals (2,000 resamples, seed 42)
- **Password** ($n = 217$): Median = **579.938 ms** [95% BCa CI: 563.805, 608.825 ms], Mean = **831.596 ms**, IQR = **511.088 ms** (Q1: 564.125, Q3: 1075.213), P95 = **1654.407 ms**, P99 = **2084.786 ms**.
- **OTP** ($n = 1,493$): Median = **34.280 ms** [95% BCa CI: 34.024, 34.544 ms], Mean = **44.695 ms**, IQR = **9.816 ms** (Q1: 30.685, Q3: 40.501), P95 = **103.587 ms**, P99 = **196.883 ms**.
- **QR Code** ($n = 1,260$): Median = **58.652 ms** [95% BCa CI: 58.330, 58.983 ms], Mean = **69.393 ms**, IQR = **9.680 ms** (Q1: 55.431, Q3: 65.111), P95 = **130.609 ms**, P99 = **216.591 ms**.
- **Hybrid QR + OTP** ($n = 1,003$): Median = **102.062 ms** [95% BCa CI: 101.543, 102.631 ms], Mean = **125.480 ms**, IQR = **17.291 ms** (Q1: 96.068, Q3: 113.359), P95 = **245.975 ms**, P99 = **377.940 ms**.

#### 2.2 Concurrency Scaling & Throughput (25 Virtual Users)
- **Password**: 16.54 req/s (P95: 1654.41 ms) — constrained by CPU-bound bcrypt work-factor 12 hashing.
- **OTP**: 168.28 req/s (P95: 103.59 ms) — lightweight database lookups + simulated OOB delay.
- **QR Code**: 116.34 req/s (P95: 130.61 ms) — polling-interval dominated.
- **Hybrid QR + OTP**: 96.31 req/s (P95: 245.98 ms) — composite verification overhead.

#### 2.3 Non-Parametric Hypothesis Testing
- **Omnibus Kruskal-Wallis Test**:
  - $H = 1544.2206$, $\text{df} = 3$, $p = 0.0$ ($p < 10^{-300}$).
  - Decision: Reject omnibus $H_0$ ($p < 0.001$). Latency distributions differ significantly across authentication schemes.
- **Pairwise Mann-Whitney U Tests with Holm-Bonferroni Correction & Cliff's Delta Effect Sizes**:
  1. **Password vs. OTP** ($H_{2a}$): $U = 323,981.0$, $p_{\text{raw}} = 1.889 \times 10^{-120}$, $p_{\text{holm}} = 1.133 \times 10^{-119}$, $\delta = 0.9788$ (**Large**).
  2. **Password vs. QR** ($H_{2b}$): $U = 256,589.0$, $p_{\text{raw}} = 6.966 \times 10^{-95}$, $p_{\text{holm}} = 3.483 \times 10^{-94}$, $\delta = 0.8768$ (**Large**).
  3. **Password vs. QR+OTP** ($H_{2c}$): $U = 193,640.0$, $p_{\text{raw}} = 1.383 \times 10^{-72}$, $p_{\text{holm}} = 5.531 \times 10^{-72}$, $\delta = 0.7785$ (**Large**).
  4. **OTP vs. QR** ($H_{2d}$): $U = 816,511.0$, $p_{\text{raw}} = 3.902 \times 10^{-10}$, $p_{\text{holm}} = 7.804 \times 10^{-10}$, $\delta = -0.1358$ (**Negligible**).
  5. **OTP vs. QR+OTP** ($H_{2e}$): $U = 61,228.0$, $p_{\text{raw}} = 0.0$ ($< 10^{-300}$), $p_{\text{holm}} = 0.0$ ($< 10^{-300}$), $\delta = -0.9182$ (**Large**).
  6. **QR vs. QR+OTP** ($H_{2f}$): $U = 373,737.0$, $p_{\text{raw}} = 5.779 \times 10^{-63}$, $p_{\text{holm}} = 1.734 \times 10^{-62}$, $\delta = -0.4087$ (**Medium**).

#### 2.4 Micro-Stage Decomposition ($N = 35,058$ micro-stages)
- **Password** (786 stage records, 161,165.72 ms cumulative): Hashing dominates at **96.6%** (median 579.94 ms), DB auth at 3.3% (median 12.18 ms), token generation at 0.1% (median 0.12 ms).
- **OTP** (12,304 stage records, 68,218.17 ms cumulative): Simulated OOB delivery delay accounts for **44.9%** (median 15.00 ms), DB verification accounts for 31.9% (median 5.82 ms), token issue accounts for 16.5% (median 3.41 ms), code generation accounts for 6.7% (median 1.15 ms).
- **QR Code** (10,440 stage records, 88,421.84 ms cumulative): Channel polling dominates at **84.8%** (median 50.00 ms), token issuance at 10.3% (median 4.12 ms), DB channel lookup at 4.9% (median 1.84 ms).
- **Hybrid QR + OTP** (11,528 stage records, 127,772.95 ms cumulative): QR polling accounts for **58.7%** (median 50.00 ms), simulated OTP delivery accounts for **23.5%** (median 15.00 ms), composite DB verification accounts for 12.1% (median 6.44 ms), token issue accounts for 5.7% (median 3.22 ms).

---

### 3. Complete List of Generated Publication Artifacts

#### Data & Machine-Readable Analytics
- [`research-output/statistical_results.json`](file:///c:/Users/skbeh/Music/AuthBench-Authentication-Performance-Benchmarking-Platform/research-output/statistical_results.json): Full machine-readable dataset containing metadata, descriptive statistics, bootstrap CIs, hypothesis testing results, and stage decompositions.

#### LaTeX Tables (`table_*.tex`)
- [`research-output/table_latency_summary.tex`](file:///c:/Users/skbeh/Music/AuthBench-Authentication-Performance-Benchmarking-Platform/research-output/table_latency_summary.tex) (Table 3: Latency Distribution & Tail Performance Across Schemes).
- [`research-output/table_concurrency_scaling.tex`](file:///c:/Users/skbeh/Music/AuthBench-Authentication-Performance-Benchmarking-Platform/research-output/table_concurrency_scaling.tex) (Table 4: Concurrency Scaling & Throughput at 1, 10, and 25 VUs).
- [`research-output/table_stage_decomposition.tex`](file:///c:/Users/skbeh/Music/AuthBench-Authentication-Performance-Benchmarking-Platform/research-output/table_stage_decomposition.tex) (Table 5: Micro-Stage Latency Decomposition, $N=35,058$).
- [`research-output/table_hypothesis_testing.tex`](file:///c:/Users/skbeh/Music/AuthBench-Authentication-Performance-Benchmarking-Platform/research-output/table_hypothesis_testing.tex) (Table 7: Non-Parametric Hypothesis Testing, Omnibus Kruskal-Wallis & Holm-Adjusted Pairwise Contrasts).

#### Comprehensive Reports & Audits
- [`research-output/RESEARCH_REPORT.md`](file:///c:/Users/skbeh/Music/AuthBench-Authentication-Performance-Benchmarking-Platform/research-output/RESEARCH_REPORT.md): Comprehensive publication-grade research report with complete methodology, empirical evaluation, and threat model analysis.
- [`research-output/report.md`](file:///c:/Users/skbeh/Music/AuthBench-Authentication-Performance-Benchmarking-Platform/research-output/report.md): Standalone academic executive summary.
- [`research-output/FIGURES_PREVIEW.md`](file:///c:/Users/skbeh/Music/AuthBench-Authentication-Performance-Benchmarking-Platform/research-output/FIGURES_PREVIEW.md): Visual figure catalog with high-resolution image links and academic figure captions.
- [`research-output/CONSISTENCY_AUDIT.md`](file:///c:/Users/skbeh/Music/AuthBench-Authentication-Performance-Benchmarking-Platform/research-output/CONSISTENCY_AUDIT.md): Cross-artifact verification audit confirming 100% numerical consistency across all tables, reports, and JSON artifacts.

#### Scientific Figures (Rendered in Vector PDF, SVG, and 300 DPI PNG)
- `fig1_latency_distribution.{pdf,svg,png}`: Empirical Latency Distribution by Authentication Scheme (Violin & Box Plot).
- `fig2_tail_latency_breakdown.{pdf,svg,png}`: Tail Latency Breakdown (Median, P90, P95, P99).
- `fig3_throughput_vs_concurrency.{pdf,svg,png}`: Throughput vs. Virtual User Concurrency.
- `fig4_p95_vs_concurrency.{pdf,svg,png}`: P95 Latency Degradation vs. Virtual User Concurrency.
- `fig5_substage_decomposition.{pdf,svg,png}`: Micro-Stage Latency Breakdown ($N=35,058$).
- `fig6_latency_ecdf.{pdf,svg,png}`: Empirical Cumulative Distribution Functions (ECDF).
- `fig8_composite_academic_summary.{pdf,svg,png}`: Comprehensive 4-Panel Academic Summary.
- `fig9_resource_utilization.{pdf,svg,png}`: Server Resource Utilization Under Peak Load.
- `fig10_stage_contribution_percentage.{pdf,svg,png}`: Micro-Stage Latency Contribution (% of Total Stage Time).
- `figure_preview_sheet.png`: Unified 3x3 multi-panel preview sheet of all legitimate research figures.
- *(Note: Unsupported `fig7_security_performance_frontier.*` has been permanently deleted).*

---

### 4. Explicit Note on Acknowledged Limitations

To uphold strict scientific integrity, the following limitations are explicitly stated in all generated reports:

1. **Simulated Out-of-Band OTP Delivery Delay (`OTP_DELIVERY_MOCK`)**:
   - The OTP and Hybrid QR+OTP benchmark pipelines employ a synthetic delivery delay model (`OTP_DELIVERY_MOCK`, parameterized at ~15 ms) to represent dispatch latency without incurring commercial SMS gateway costs or carrier rate limits.
   - Consequently, OTP latency measurements reflect server-side dispatch overhead and simulated queuing rather than cellular telco network transmission, SS7 routing latency, or end-user device reception delays.
2. **Controlled Synthetic Workload Environment**:
   - Benchmarks were conducted using Autocannon within a dedicated testbed environment over high-speed loopback networking.
   - Findings do not reflect variable real-world wide-area network (WAN) latency, packet loss, cellular jitter, mobile device CPU throttling, or camera auto-focus / optical framing delays.
3. **Strict Separation of Machine Latency vs. Human Interaction Time**:
   - All empirical metrics measure exclusively server-side request processing, cryptographic computation, database persistence, and polling channel round-trips.
   - Human physical execution time (e.g., keyboard entry of passwords, reading OTP digits from an SMS handset, physical aiming of mobile camera at a QR code) was excluded from synthetic load testing and must not be conflated with system throughput.
4. **Theoretical Threat Modeling vs. Empirical Penetration Testing**:
   - Security evaluations presented in the research report are grounded in formal protocol security analysis and cryptographic threat modeling (e.g., dictionary attacks, credential stuffing, shoulder surfing, phishing resistance).
   - AuthBench did not execute empirical adversarial exploit penetration testing; all previously reported arbitrary security effectiveness metrics (e.g., "Password 25%, OTP 80%") have been removed as unsupported by empirical trace telemetry.

---

### 5. Reproducibility Instructions

The entire benchmarking analytics, figure rendering, table generation, and report synthesis pipeline can be re-executed from scratch with a single command:

```bash
# Full pipeline execution (Analysis -> Figures -> Reports -> Integrity Audit)
npm run pipeline
# OR directly via Python:
python scripts/run_pipeline.py
```

Individual pipeline stages can also be executed independently:
```bash
python scripts/run_analysis.py    # Generates statistical_results.json from raw CSVs
python scripts/generate_figures.py # Renders all 9 scientific figures + preview sheet
python scripts/generate_reports.py # Synthesizes LaTeX tables, Markdown reports & audits
```
