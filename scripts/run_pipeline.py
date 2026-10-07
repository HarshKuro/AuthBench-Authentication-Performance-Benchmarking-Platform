"""
Master Scientific Benchmark & Analysis Pipeline
Executes the complete end-to-end reproducible research workflow:
1. Statistical Inference Analysis (run_analysis.py)
2. Academic Publication Figure Generation (generate_figures.py)
3. Publication Report and LaTeX Table Synthesis (generate_reports.py)
4. Comprehensive Automated Cross-Artifact Consistency Verification
"""

import os
import sys
import json
import re
import subprocess
import pandas as pd

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUTPUT_DIR = os.path.join(BASE_DIR, 'research-output')
FIG_DIR = os.path.join(OUTPUT_DIR, 'figures')

def run_step(description, script_name):
    print(f"\n{'='*70}")
    print(f">> STEP: {description}")
    print(f">> Running python scripts/{script_name}...")
    print(f"{'='*70}")
    script_path = os.path.join(BASE_DIR, 'scripts', script_name)
    res = subprocess.run([sys.executable, script_path], cwd=BASE_DIR, capture_output=True, text=True)
    if res.stdout:
        print(res.stdout.strip())
    if res.returncode != 0:
        print(f"Error in {script_name}:\n{res.stderr}", file=sys.stderr)
        sys.exit(res.returncode)

def verify_pipeline_outputs():
    print(f"\n{'='*70}")
    print(">> STEP: Verifying Pipeline Integrity & Consistency")
    print(f"{'='*70}")

    # 1. Required files check
    required_files = [
        os.path.join(OUTPUT_DIR, 'traces_empirical.csv'),
        os.path.join(OUTPUT_DIR, 'stages_decomposition.csv'),
        os.path.join(OUTPUT_DIR, 'statistical_results.json'),
        os.path.join(OUTPUT_DIR, 'RESEARCH_REPORT.md'),
        os.path.join(OUTPUT_DIR, 'report.md'),
        os.path.join(OUTPUT_DIR, 'table_latency_summary.tex'),
        os.path.join(OUTPUT_DIR, 'table_concurrency_scaling.tex'),
        os.path.join(OUTPUT_DIR, 'table_stage_decomposition.tex'),
        os.path.join(OUTPUT_DIR, 'table_hypothesis_testing.tex'),
        os.path.join(OUTPUT_DIR, 'FIGURES_PREVIEW.md'),
        os.path.join(OUTPUT_DIR, 'CONSISTENCY_AUDIT.md'),
    ]

    for rf in required_files:
        assert os.path.exists(rf), f"Missing required file: {rf}"
        assert os.path.getsize(rf) > 0, f"File is empty: {rf}"
        print(f"  [PASS] File exists and non-empty: {os.path.basename(rf)}")

    # 2. Check figures
    fig_basenames = [
        'fig1_latency_distribution',
        'fig2_tail_latency_breakdown',
        'fig3_throughput_vs_concurrency',
        'fig4_p95_vs_concurrency',
        'fig5_substage_decomposition',
        'fig6_latency_ecdf',
        'fig8_composite_academic_summary',
        'fig9_resource_utilization',
        'fig10_stage_contribution_percentage',
    ]

    for fb in fig_basenames:
        for ext in ['png', 'svg', 'pdf']:
            fp = os.path.join(FIG_DIR, f"{fb}.{ext}")
            assert os.path.exists(fp), f"Missing figure file: {fp}"
            assert os.path.getsize(fp) > 0, f"Figure is empty: {fp}"
        print(f"  [PASS] Figure generated in PNG/SVG/PDF: {fb}")

    assert os.path.exists(os.path.join(FIG_DIR, 'figure_preview_sheet.png')), "Missing figure_preview_sheet.png"
    print("  [PASS] Figure preview sheet generated.")

    # Verify fig7 is deleted
    assert not os.path.exists(os.path.join(FIG_DIR, 'fig7_security_performance_frontier.png')), "Stale fig7 still exists!"
    print("  [PASS] Unsupported fig7 security frontier figure confirmed absent.")

    # 3. Load stats and verify exact numerical values
    with open(os.path.join(OUTPUT_DIR, 'statistical_results.json'), 'r', encoding='utf-8') as f:
        stats = json.load(f)

    dist = stats['distResults']
    tiers = stats['concurrencyTiers']

    # Median checks
    assert abs(dist['PASSWORD']['median'] - 579.94) < 0.1, f"Password median mismatch: {dist['PASSWORD']['median']}"
    assert abs(dist['OTP']['median'] - 34.28) < 0.1, f"OTP median mismatch: {dist['OTP']['median']}"
    assert abs(dist['QR']['median'] - 58.65) < 0.1, f"QR median mismatch: {dist['QR']['median']}"
    assert abs(dist['QR_OTP']['median'] - 102.06) < 0.1, f"QR+OTP median mismatch: {dist['QR_OTP']['median']}"
    print("  [PASS] Medians verified against source of truth.")

    # 25-VU Throughput checks
    assert abs(tiers['25']['PASSWORD']['throughput'] - 16.54) < 0.1, f"Password throughput mismatch: {tiers['25']['PASSWORD']['throughput']}"
    assert abs(tiers['25']['OTP']['throughput'] - 168.28) < 0.1, f"OTP throughput mismatch: {tiers['25']['OTP']['throughput']}"
    assert abs(tiers['25']['QR']['throughput'] - 116.34) < 0.1, f"QR throughput mismatch: {tiers['25']['QR']['throughput']}"
    assert abs(tiers['25']['QR_OTP']['throughput'] - 96.31) < 0.1, f"QR+OTP throughput mismatch: {tiers['25']['QR_OTP']['throughput']}"
    print("  [PASS] Concurrency 25-VU throughput verified against source of truth.")

    # Total traces and stages checks
    assert stats['totalTraces'] == 3973, f"Total traces mismatch: {stats['totalTraces']}"
    assert stats['totalStages'] == 35058, f"Total stages mismatch: {stats['totalStages']}"
    print(f"  [PASS] Traces count (3,973) and micro-stages count (35,058) verified.")

    # Pairwise comparisons check (all 6 pairs)
    contrasts = stats['omnibusResult']['pairwise_contrasts']
    assert len(contrasts) == 6, f"Expected 6 pairwise comparisons, found {len(contrasts)}"
    for c in contrasts:
        assert c['mann_whitney_u']['p_value'] is not None
        assert c['mann_whitney_u']['p_holm'] is not None
        assert c['effect_size']['cliffs_delta'] is not None
        assert c['effect_size']['cliffs_magnitude'] in ['Negligible', 'Small', 'Medium', 'Large']
    print("  [PASS] All 6 pairwise comparisons contain exact Mann-Whitney U, raw p, Holm p, and Cliff's delta.")

    # 4. Text placeholder and unsupported metric checks in report
    report_text = open(os.path.join(OUTPUT_DIR, 'RESEARCH_REPORT.md'), 'r', encoding='utf-8').read()
    placeholders = ['n/r', 'unknown', 'NaN', 'TBD', 'TODO', 'PLACEHOLDER']
    for ph in placeholders:
        matches = re.findall(rf'\b{ph}\b', report_text, re.IGNORECASE)
        assert len(matches) == 0, f"Found placeholder '{ph}' in RESEARCH_REPORT.md"
    print("  [PASS] Zero placeholders found in RESEARCH_REPORT.md.")

    # Check that unsupported attack blocking percentages as empirical metrics are removed
    assert "Empirical Attack Blocking Rate (%)" not in report_text, "Found unsupported empirical attack blocking rate table header in report!"
    assert "Attack Resistance Scores" not in report_text, "Found attack resistance scores in report!"
    print("  [PASS] No unsupported empirical security attack metrics in report.")

    print(f"\n{'='*70}")
    print("ALL PIPELINE VERIFICATIONS PASSED SUCCESSFULLY!")
    print(f"{'='*70}\n")

def main():
    print("Executing full research benchmarking & analysis pipeline...")
    run_step("1. Statistical Analysis Engine", "run_analysis.py")
    run_step("2. Publication Graphics Rendering", "generate_figures.py")
    run_step("3. Publication Report & LaTeX Table Synthesis", "generate_reports.py")
    verify_pipeline_outputs()

if __name__ == '__main__':
    main()
