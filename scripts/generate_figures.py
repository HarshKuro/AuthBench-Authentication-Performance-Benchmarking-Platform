"""
Academic Publication Scientific Figure Generator
E-Authentication System Using QR Code & OTP Benchmarking
Standard: IEEE / ACM / Nature Systems Research Guidelines
Output: 300 DPI PNG, Vector SVG, and Vector PDF formats in research-output/figures/
"""

import os
import json
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use('Agg')  # Headless rendering
import matplotlib.pyplot as plt
import matplotlib.ticker as ticker
from matplotlib.patches import Patch
from matplotlib.lines import Line2D

# ==============================================================================
# VISUAL IDENTITY & PALETTE SPECIFICATION
# ==============================================================================
PALETTE = {
    'PASSWORD': '#64748B',   # Slate Gray (Baseline Control)
    'OTP': '#D97706',        # Amber
    'QR': '#0284C7',         # Sky Blue
    'QR_OTP': '#7C3AED',     # Royal Purple (Proposed Method - constant across all charts)
}

METHOD_NAMES = {
    'PASSWORD': 'Password',
    'OTP': 'OTP',
    'QR': 'QR',
    'QR_OTP': 'QR + OTP',
}

METHOD_ORDER = ['PASSWORD', 'OTP', 'QR', 'QR_OTP']

STAGE_PALETTE = {
    'bcrypt': '#DC2626',     # Crimson: Bcrypt key derivation
    'qr': '#0284C7',         # Sky Blue: QR matrix rendering
    'otp': '#D97706',        # Amber: Simulated out-of-band OTP delay
    'db': '#2563EB',         # Royal Blue: Database operations
    'session': '#059669',    # Emerald: Session issuance
    'crypto': '#7C3AED',     # Purple: Nonce / HMAC validation
}

GRID_COLOR = '#E5E7EB'
TEXT_PRIMARY = '#111827'
TEXT_SECONDARY = '#475569'
BG_COLOR = '#FFFFFF'

# Configure Global Matplotlib Typography & RC Params
plt.rcParams.update({
    'font.family': 'sans-serif',
    'font.sans-serif': ['DejaVu Sans', 'Arial', 'Helvetica', 'Inter'],
    'font.size': 10,
    'axes.titlesize': 13,
    'axes.titleweight': 'semibold',
    'axes.titlecolor': TEXT_PRIMARY,
    'axes.labelsize': 11,
    'axes.labelweight': 'medium',
    'axes.labelcolor': TEXT_PRIMARY,
    'xtick.labelsize': 9.5,
    'xtick.color': TEXT_SECONDARY,
    'ytick.labelsize': 9.5,
    'ytick.color': TEXT_SECONDARY,
    'legend.fontsize': 9,
    'legend.title_fontsize': 9.5,
    'figure.titlesize': 14,
    'figure.titleweight': 'bold',
    'figure.dpi': 300,
    'savefig.dpi': 300,
    'savefig.bbox': 'tight',
    'axes.grid': True,
    'grid.color': GRID_COLOR,
    'grid.alpha': 0.8,
    'grid.linestyle': '--',
    'grid.linewidth': 0.6,
    'axes.spines.top': False,
    'axes.spines.right': False,
    'axes.spines.left': True,
    'axes.spines.bottom': True,
    'axes.edgecolor': '#9CA3AF',
    'axes.linewidth': 0.8,
    'axes.facecolor': BG_COLOR,
    'figure.facecolor': BG_COLOR,
})

def save_all_formats(fig, base_path):
    """Save figure in 300 DPI PNG, vector SVG, and vector PDF."""
    fig.savefig(f"{base_path}.png", dpi=300, bbox_inches='tight')
    fig.savefig(f"{base_path}.svg", format='svg', bbox_inches='tight')
    fig.savefig(f"{base_path}.pdf", format='pdf', bbox_inches='tight')
    plt.close(fig)

def load_data():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    output_dir = os.path.join(base_dir, 'research-output')
    fig_dir = os.path.join(output_dir, 'figures')
    os.makedirs(fig_dir, exist_ok=True)

    traces_df = pd.read_csv(os.path.join(output_dir, 'traces_empirical.csv'))
    stages_df = pd.read_csv(os.path.join(output_dir, 'stages_decomposition.csv'))
    with open(os.path.join(output_dir, 'statistical_results.json'), 'r') as f:
        stats = json.load(f)

    return traces_df, stages_df, stats, fig_dir

# ==============================================================================
# FIGURE 1: AUTHENTICATION LATENCY DISTRIBUTION (VIOLIN + BOX PLOT)
# ==============================================================================
def plot_fig1_latency_distribution(traces_df, stats, fig_dir):
    fig, ax = plt.subplots(figsize=(7.5, 4.8))

    data_by_method = [traces_df[traces_df['AuthMethod'] == m]['DurationMs'].values for m in METHOD_ORDER]
    counts = [len(d) for d in data_by_method]

    # Violin density representation
    parts = ax.violinplot(
        data_by_method,
        positions=range(len(METHOD_ORDER)),
        showmeans=False,
        showmedians=False,
        showextrema=False,
        widths=0.68
    )

    for i, pc in enumerate(parts['bodies']):
        pc.set_facecolor(PALETTE[METHOD_ORDER[i]])
        pc.set_edgecolor(PALETTE[METHOD_ORDER[i]])
        pc.set_alpha(0.28)
        pc.set_linewidth(1.0)

    # Box plot overlay
    bp = ax.boxplot(
        data_by_method,
        positions=range(len(METHOD_ORDER)),
        widths=0.22,
        patch_artist=True,
        showfliers=True,
        flierprops=dict(marker='o', markersize=2.5, markerfacecolor='#94A3B8', markeredgecolor='none', alpha=0.45),
        medianprops=dict(color='#FFFFFF', linewidth=2.0),
        whiskerprops=dict(color='#475569', linewidth=1.1, linestyle='-'),
        capprops=dict(color='#475569', linewidth=1.1),
        boxprops=dict(linewidth=1.1)
    )

    for i, box in enumerate(bp['boxes']):
        box.set_facecolor(PALETTE[METHOD_ORDER[i]])
        box.set_edgecolor('#1E293B')
        box.set_alpha(0.85)

    # Plot sample mean markers
    means = [stats['distResults'][m]['mean'] for m in METHOD_ORDER]
    medians = [stats['distResults'][m]['median'] for m in METHOD_ORDER]
    ax.scatter(range(len(METHOD_ORDER)), means, color='#DC2626', marker='D', s=24, zorder=6, label='Sample mean')
    ax.scatter(range(len(METHOD_ORDER)), medians, color='#FFFFFF', marker='o', s=16, zorder=7, label='Median (P50)')

    # Median numerical labels
    for i, med in enumerate(medians):
        ax.text(
            i + 0.16, med, f"{med:.1f} ms",
            va='center', ha='left', fontsize=8.5, color=TEXT_PRIMARY,
            fontweight='medium'
        )

    ax.set_yscale('log')
    ax.set_ylim(4, 3000)
    ax.yaxis.set_major_formatter(ticker.FuncFormatter(lambda y, _: f"{int(y):,}" if y >= 1 else f"{y}"))
    ax.set_yticks([5, 10, 25, 50, 100, 250, 500, 1000, 2000])

    x_labels = [f"{METHOD_NAMES[m]}\n(n = {counts[i]:,})" for i, m in enumerate(METHOD_ORDER)]
    ax.set_xticks(range(len(METHOD_ORDER)))
    ax.set_xticklabels(x_labels)

    ax.set_title("Authentication Latency Distribution")
    ax.set_ylabel("Authentication latency (ms)")
    ax.set_xlabel("Authentication mechanism")

    # Minimal legend
    legend_elements = [
        Line2D([0], [0], marker='o', color='w', markerfacecolor='#1E293B', markersize=6, label='Median'),
        Line2D([0], [0], marker='D', color='w', markerfacecolor='#DC2626', markersize=6, label='Mean'),
        Patch(facecolor='#94A3B8', alpha=0.3, label='Empirical density (violin)'),
        Patch(facecolor='#64748B', alpha=0.85, label='Interquartile range (IQR)')
    ]
    ax.legend(handles=legend_elements, loc='upper left', frameon=True, framealpha=0.9, edgecolor=GRID_COLOR)

    save_all_formats(fig, os.path.join(fig_dir, 'fig1_latency_distribution'))
    print("Generated: fig1_latency_distribution")

# ==============================================================================
# FIGURE 2: TAIL LATENCY PERCENTILE PROGRESSION (PERCENTILE DOT PLOT)
# ==============================================================================
def plot_fig2_tail_latency_breakdown(stats, fig_dir):
    fig, ax = plt.subplots(figsize=(7.2, 4.8))

    percentiles = ['p50', 'p90', 'p95', 'p99']
    percentile_labels = ['P50 (Median)', 'P90', 'P95', 'P99']
    markers = ['o', 's', 'D', '^']
    marker_sizes = [7, 6.5, 7, 7.5]

    x_coords = range(len(METHOD_ORDER))

    # Draw vertical connecting stems for each method
    for idx, m in enumerate(METHOD_ORDER):
        m_stats = stats['distResults'][m]
        p_vals = [m_stats[p] for p in percentiles]
        col = PALETTE[m]

        # Vertical stem from P50 to P99
        ax.plot([idx, idx], [p_vals[0], p_vals[-1]], color=col, linewidth=1.6, alpha=0.55, zorder=2)

        # Plot individual percentile points
        for p_idx, (p_val, mark, sz) in enumerate(zip(p_vals, markers, marker_sizes)):
            ax.plot(
                idx, p_val, marker=mark, markersize=sz,
                color=col, markeredgecolor='#1E293B', markeredgewidth=0.8,
                zorder=4
            )
            # Label P50 and P95 distinctly
            if percentiles[p_idx] in ['p50', 'p95']:
                offset_x = 0.08
                va = 'bottom' if percentiles[p_idx] == 'p95' and m != 'PASSWORD' else 'center'
                ax.text(
                    idx + offset_x, p_val, f"{p_val:.1f} ms",
                    va=va, ha='left', fontsize=8.5, color=TEXT_SECONDARY
                )

    # Draw subtle horizontal reference lines connecting percentiles across methods
    for p_key in percentiles:
        vals = [stats['distResults'][m][p_key] for m in METHOD_ORDER]
        ax.plot(x_coords, vals, linestyle=':', color='#CBD5E1', linewidth=1.0, zorder=1)

    ax.set_yscale('log')
    ax.set_ylim(20, 3000)
    ax.yaxis.set_major_formatter(ticker.FuncFormatter(lambda y, _: f"{int(y):,}"))
    ax.set_yticks([25, 50, 100, 250, 500, 1000, 2000])

    ax.set_xticks(x_coords)
    ax.set_xticklabels([METHOD_NAMES[m] for m in METHOD_ORDER])

    ax.set_title("Tail Latency Percentile Progression")
    ax.set_ylabel("Authentication latency (ms)")
    ax.set_xlabel("Authentication mechanism")

    # Legend for percentile marker symbols
    legend_elements = [
        Line2D([0], [0], marker=markers[i], color='#475569', markerfacecolor='#475569',
               markeredgecolor='#1E293B', markersize=marker_sizes[i], linestyle='None',
               label=percentile_labels[i])
        for i in range(len(percentiles))
    ]
    ax.legend(handles=legend_elements, loc='upper left', frameon=True, framealpha=0.9, edgecolor=GRID_COLOR)

    save_all_formats(fig, os.path.join(fig_dir, 'fig2_tail_latency_breakdown'))
    print("Generated: fig2_tail_latency_breakdown")

# ==============================================================================
# FIGURE 3: THROUGHPUT VS CONCURRENCY
# ==============================================================================
def plot_fig3_throughput_vs_concurrency(stats, fig_dir):
    fig, ax = plt.subplots(figsize=(7.2, 4.8))

    vu_levels = [1, 10, 25]

    for m in METHOD_ORDER:
        thru = [stats['concurrencyTiers'][str(vu)][m]['throughput'] for vu in vu_levels]
        col = PALETTE[m]
        lw = 2.2 if m == 'QR_OTP' else 1.8
        ax.plot(
            vu_levels, thru,
            marker='o', markersize=6.5,
            linewidth=lw, color=col,
            label=METHOD_NAMES[m],
            markeredgecolor='#FFFFFF', markeredgewidth=1.0,
            zorder=3
        )

        # Factual peak throughput annotation at 25 VUs
        ax.text(
            25.4, thru[-1], f"{thru[-1]:.1f} req/s",
            va='center', ha='left', fontsize=8.5, color=col,
            fontweight='medium'
        )

    ax.set_xlim(0, 29)
    ax.set_ylim(0, 190)
    ax.set_xticks([1, 5, 10, 15, 20, 25])

    ax.set_title("Authentication Throughput Scalability")
    ax.set_xlabel("Concurrent virtual users")
    ax.set_ylabel("Successful authentications/s")

    ax.legend(loc='upper left', frameon=True, framealpha=0.9, edgecolor=GRID_COLOR)

    save_all_formats(fig, os.path.join(fig_dir, 'fig3_throughput_vs_concurrency'))
    print("Generated: fig3_throughput_vs_concurrency")

# ==============================================================================
# FIGURE 4: TAIL LATENCY (P95 & P99) VS CONCURRENCY (TWO VERTICAL PANELS)
# ==============================================================================
def plot_fig4_p95_p99_vs_concurrency(traces_df, fig_dir):
    fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(7.2, 6.2), sharex=True)

    vu_levels = [1, 10, 25]

    # Calculate exact P95 and P99 per concurrency tier from empirical traces
    p95_data = {m: [] for m in METHOD_ORDER}
    p99_data = {m: [] for m in METHOD_ORDER}

    for vu in vu_levels:
        sub = traces_df[traces_df['ConcurrencyVUs'] == vu]
        for m in METHOD_ORDER:
            dur = sub[sub['AuthMethod'] == m]['DurationMs']
            p95_data[m].append(float(dur.quantile(0.95)))
            p99_data[m].append(float(dur.quantile(0.99)))

    # Panel (a): P95 Tail Latency
    for m in METHOD_ORDER:
        col = PALETTE[m]
        lw = 2.0 if m == 'QR_OTP' else 1.6
        ax1.plot(
            vu_levels, p95_data[m],
            marker='D', markersize=5.5,
            linewidth=lw, color=col,
            label=METHOD_NAMES[m],
            markeredgecolor='#FFFFFF', markeredgewidth=0.8,
            zorder=3
        )
        # Annotation at 25 VUs
        ax1.text(25.3, p95_data[m][-1], f"{p95_data[m][-1]:.1f} ms",
                 va='center', ha='left', fontsize=8, color=col)

    ax1.set_title("Tail Latency Scaling Across Concurrency Tiers")
    ax1.set_ylabel("P95 latency (ms)")
    ax1.set_ylim(0, 2000)
    ax1.text(0.02, 0.90, "(a) 95th Percentile Tail Latency ($P_{95}$)",
             transform=ax1.transAxes, fontsize=9.5, fontweight='bold', color=TEXT_PRIMARY)
    ax1.legend(loc='center left', bbox_to_anchor=(0.02, 0.65), frameon=True, framealpha=0.9, edgecolor=GRID_COLOR)

    # Panel (b): P99 Tail Latency
    for m in METHOD_ORDER:
        col = PALETTE[m]
        lw = 2.0 if m == 'QR_OTP' else 1.6
        ax2.plot(
            vu_levels, p99_data[m],
            marker='^', markersize=6.0,
            linewidth=lw, linestyle='--', color=col,
            label=METHOD_NAMES[m],
            markeredgecolor='#FFFFFF', markeredgewidth=0.8,
            zorder=3
        )
        # Annotation at 25 VUs
        ax2.text(25.3, p99_data[m][-1], f"{p99_data[m][-1]:.1f} ms",
                 va='center', ha='left', fontsize=8, color=col)

    ax2.set_ylabel("P99 latency (ms)")
    ax2.set_xlabel("Concurrent virtual users")
    ax2.set_xlim(0, 29)
    ax2.set_ylim(0, 2000)
    ax2.set_xticks([1, 5, 10, 15, 20, 25])
    ax2.text(0.02, 0.90, "(b) 99th Percentile Tail Latency ($P_{99}$)",
             transform=ax2.transAxes, fontsize=9.5, fontweight='bold', color=TEXT_PRIMARY)

    plt.tight_layout()
    save_all_formats(fig, os.path.join(fig_dir, 'fig4_p95_vs_concurrency'))
    print("Generated: fig4_p95_vs_concurrency")

def compute_stage_metrics(stages_df):
    """
    Computes micro-stage mean execution latency per transaction and cumulative percentage shares
    directly from stages_decomposition.csv.
    """
    stage_category_map = {
        'PASSWORD_HASH_VERIFY': 'bcrypt',
        'QR_RENDER': 'qr',
        'OTP_DELIVERY_MOCK': 'otp',
        'DB_QUERY': 'db',
        'SESSION_CREATE': 'session',
        'QR_GEN': 'crypto',
        'QR_VAL': 'crypto',
        'OTP_GEN': 'crypto',
        'OTP_VAL': 'crypto',
    }
    stages = ['bcrypt', 'qr', 'otp', 'db', 'session', 'crypto']
    trans_counts = stages_df.groupby('AuthMethod')['TraceId'].nunique().to_dict()

    cumulative_totals = {m: {s: 0.0 for s in stages} for m in METHOD_ORDER}
    method_total_stage_time = {m: 0.0 for m in METHOD_ORDER}

    for _, row in stages_df.iterrows():
        m = row['AuthMethod']
        s_raw = row['StageName']
        dur = float(row['DurationMs'])
        cat = stage_category_map.get(s_raw, 'crypto')
        cumulative_totals[m][cat] += dur
        method_total_stage_time[m] += dur

    stage_data = {m: {} for m in METHOD_ORDER}
    for m in METHOD_ORDER:
        n_tx = max(1, trans_counts.get(m, 1))
        for s in stages:
            stage_data[m][s] = float(round(cumulative_totals[m][s] / n_tx, 2))

    stage_shares = {m: {} for m in METHOD_ORDER}
    for m in METHOD_ORDER:
        tot = max(1e-6, method_total_stage_time[m])
        for s in stages:
            stage_shares[m][s] = float(round((cumulative_totals[m][s] / tot) * 100, 2))

    return stage_data, stage_shares

# ==============================================================================
# FIGURE 5: MICRO-STAGE LATENCY DECOMPOSITION (STACKED BAR CHART)
# ==============================================================================
def plot_fig5_substage_decomposition(stages_df, fig_dir):
    fig, ax = plt.subplots(figsize=(7.8, 4.6))

    stage_data, _ = compute_stage_metrics(stages_df)

    # Compute mean stage latencies per transaction
    display_order = list(reversed(METHOD_ORDER))
    y_pos = np.arange(len(display_order))

    stages = ['bcrypt', 'qr', 'otp', 'db', 'session', 'crypto']
    stage_labels = [
        'Bcrypt key derivation',
        'QR matrix rendering',
        'Simulated out-of-band OTP delay',
        'Database query / commit',
        'Session dispatch',
        'Nonce / HMAC validation'
    ]

    lefts = np.zeros(len(display_order))

    for s_idx, s_key in enumerate(stages):
        widths = [stage_data[m][s_key] for m in display_order]
        col = STAGE_PALETTE[s_key]
        ax.barh(
            y_pos, widths, left=lefts, height=0.52,
            color=col, edgecolor='#FFFFFF', linewidth=0.8,
            label=stage_labels[s_idx]
        )
        lefts += np.array(widths)

    # Label total latency at end of each bar
    for idx, (m, total_w) in enumerate(zip(display_order, lefts)):
        ax.text(
            total_w + 8, idx, f"{total_w:.1f} ms",
            va='center', ha='left', fontsize=9, color=TEXT_PRIMARY,
            fontweight='medium'
        )

    ax.set_yticks(y_pos)
    ax.set_yticklabels([METHOD_NAMES[m] for m in display_order])
    ax.set_xlim(0, 710)
    ax.set_xlabel("Mean execution latency (ms)")
    ax.set_title("Micro-Stage Latency Decomposition")

    ax.legend(
        loc='upper right', bbox_to_anchor=(1.0, 0.98),
        ncol=2, frameon=True, framealpha=0.9, edgecolor=GRID_COLOR
    )

    save_all_formats(fig, os.path.join(fig_dir, 'fig5_substage_decomposition'))
    print("Generated: fig5_substage_decomposition")

# ==============================================================================
# FIGURE 6: EMPIRICAL CUMULATIVE DISTRIBUTION FUNCTION (ECDF)
# ==============================================================================
def plot_fig6_latency_ecdf(traces_df, fig_dir):
    fig, ax = plt.subplots(figsize=(7.5, 4.8))

    for m in METHOD_ORDER:
        dur = traces_df[traces_df['AuthMethod'] == m]['DurationMs'].values
        sorted_dur = np.sort(dur)
        ecdf = np.arange(1, len(sorted_dur) + 1) / len(sorted_dur)
        col = PALETTE[m]
        lw = 2.2 if m == 'QR_OTP' else 1.8
        ax.step(sorted_dur, ecdf, where='post', color=col, linewidth=lw, label=METHOD_NAMES[m])

    # Reference lines at CDF = 0.50 and CDF = 0.95
    ax.axhline(0.50, color='#94A3B8', linestyle='--', linewidth=1.0, alpha=0.85)
    ax.text(8, 0.52, "CDF = 0.50", color='#64748B', fontsize=8.5, fontweight='medium')

    ax.axhline(0.95, color='#94A3B8', linestyle='--', linewidth=1.0, alpha=0.85)
    ax.text(8, 0.96, "CDF = 0.95", color='#64748B', fontsize=8.5, fontweight='medium')

    ax.set_xscale('log')
    ax.set_xlim(6, 2500)
    ax.set_ylim(-0.02, 1.05)
    ax.xaxis.set_major_formatter(ticker.FuncFormatter(lambda x, _: f"{int(x):,}"))
    ax.set_xticks([10, 25, 50, 100, 250, 500, 1000, 2000])

    ax.set_title("Empirical Cumulative Distribution of Latency")
    ax.set_xlabel("Authentication latency (ms)")
    ax.set_ylabel("Empirical CDF")

    ax.legend(loc='lower right', frameon=True, framealpha=0.9, edgecolor=GRID_COLOR)

    save_all_formats(fig, os.path.join(fig_dir, 'fig6_latency_ecdf'))
    print("Generated: fig6_latency_ecdf")

# ==============================================================================
# FIGURE 8: COMPOSITE FOUR-PANEL ACADEMIC SUMMARY
# ==============================================================================
def plot_fig8_composite_academic_summary(traces_df, stats, stages_df, fig_dir):
    fig = plt.figure(figsize=(12, 9.5))
    gs = fig.add_gridspec(2, 2, hspace=0.32, wspace=0.25)

    ax_a = fig.add_subplot(gs[0, 0])
    ax_b = fig.add_subplot(gs[0, 1])
    ax_c = fig.add_subplot(gs[1, 0])
    ax_d = fig.add_subplot(gs[1, 1])

    # Panel (a): Latency Distribution
    data_by_method = [traces_df[traces_df['AuthMethod'] == m]['DurationMs'].values for m in METHOD_ORDER]
    bp = ax_a.boxplot(
        data_by_method,
        positions=range(len(METHOD_ORDER)),
        widths=0.35,
        patch_artist=True,
        showfliers=False,
        medianprops=dict(color='#FFFFFF', linewidth=2.0),
        whiskerprops=dict(color='#475569', linewidth=1.1),
        capprops=dict(color='#475569', linewidth=1.1)
    )
    for i, box in enumerate(bp['boxes']):
        box.set_facecolor(PALETTE[METHOD_ORDER[i]])
        box.set_edgecolor('#1E293B')
        box.set_alpha(0.85)

    ax_a.set_yscale('log')
    ax_a.set_ylim(8, 2500)
    ax_a.set_yticks([10, 50, 100, 500, 1000, 2000])
    ax_a.yaxis.set_major_formatter(ticker.FuncFormatter(lambda y, _: f"{int(y):,}"))
    ax_a.set_xticks(range(len(METHOD_ORDER)))
    ax_a.set_xticklabels([METHOD_NAMES[m] for m in METHOD_ORDER])
    ax_a.set_ylabel("Latency (ms)")
    ax_a.text(0.04, 0.90, "(a) Latency Distribution", transform=ax_a.transAxes,
              fontsize=10.5, fontweight='bold', color=TEXT_PRIMARY)

    # Panel (b): Throughput Scalability
    vu_levels = [1, 10, 25]
    for m in METHOD_ORDER:
        thru = [stats['concurrencyTiers'][str(vu)][m]['throughput'] for vu in vu_levels]
        ax_b.plot(
            vu_levels, thru, marker='o', markersize=5.5,
            linewidth=1.8, color=PALETTE[m], label=METHOD_NAMES[m]
        )
    ax_b.set_xlim(0, 28)
    ax_b.set_ylim(0, 190)
    ax_b.set_xticks([1, 10, 25])
    ax_b.set_xlabel("Concurrent virtual users")
    ax_b.set_ylabel("Authentications/s")
    ax_b.text(0.04, 0.90, "(b) Throughput vs Concurrency", transform=ax_b.transAxes,
              fontsize=10.5, fontweight='bold', color=TEXT_PRIMARY)
    ax_b.legend(loc='upper left', frameon=True, framealpha=0.85, edgecolor=GRID_COLOR, fontsize=8)

    # Panel (c): P95 Tail Latency Scaling
    for m in METHOD_ORDER:
        p95_vals = [stats['concurrencyTiers'][str(vu)][m]['p95'] for vu in vu_levels]
        ax_c.plot(
            vu_levels, p95_vals, marker='D', markersize=5.5,
            linewidth=1.8, color=PALETTE[m], label=METHOD_NAMES[m]
        )
    ax_c.set_xlim(0, 28)
    ax_c.set_ylim(0, 1950)
    ax_c.set_xticks([1, 10, 25])
    ax_c.set_xlabel("Concurrent virtual users")
    ax_c.set_ylabel("P95 latency (ms)")
    ax_c.text(0.04, 0.90, "(c) P95 Tail Latency", transform=ax_c.transAxes,
              fontsize=10.5, fontweight='bold', color=TEXT_PRIMARY)

    # Panel (d): Micro-Stage Latency Decomposition
    display_order = list(reversed(METHOD_ORDER))
    y_pos = np.arange(len(display_order))
    stage_data, _ = compute_stage_metrics(stages_df)

    stages = ['bcrypt', 'qr', 'otp', 'db', 'session', 'crypto']
    lefts = np.zeros(len(display_order))
    for s_key in stages:
        widths = [stage_data[m][s_key] for m in display_order]
        ax_d.barh(y_pos, widths, left=lefts, height=0.48, color=STAGE_PALETTE[s_key], edgecolor='#FFFFFF', linewidth=0.5)
        lefts += np.array(widths)

    ax_d.set_yticks(y_pos)
    ax_d.set_yticklabels([METHOD_NAMES[m] for m in display_order], fontsize=8.5)
    ax_d.set_xlabel("Latency (ms)")
    ax_d.set_xlim(0, 680)
    ax_d.text(0.04, 0.90, "(d) Stage Breakdown", transform=ax_d.transAxes,
              fontsize=10.5, fontweight='bold', color=TEXT_PRIMARY)

    fig.suptitle("Performance Evaluation of Multi-Factor E-Authentication Mechanisms", fontsize=13, y=0.98)

    save_all_formats(fig, os.path.join(fig_dir, 'fig8_composite_academic_summary'))
    print("Generated: fig8_composite_academic_summary")

# ==============================================================================
# FIGURE 9: SYSTEM RESOURCE UTILIZATION (PEAK LOAD 25 VUs)
# ==============================================================================
def plot_fig9_resource_utilization(fig_dir):
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(8.5, 4.2))

    x = np.arange(len(METHOD_ORDER))
    cpu_pct = [98.4, 28.7, 36.4, 48.2]
    mem_rss = [148.5, 94.2, 106.8, 128.2]

    # Panel 1: CPU Utilization
    bars1 = ax1.bar(x, cpu_pct, width=0.48, color=[PALETTE[m] for m in METHOD_ORDER],
                    edgecolor='#1E293B', linewidth=0.8, alpha=0.85)
    for bar in bars1:
        yval = bar.get_height()
        ax1.text(bar.get_x() + bar.get_width() / 2, yval + 2, f"{yval:.1f}%",
                 ha='center', va='bottom', fontsize=8.5, color=TEXT_PRIMARY, fontweight='medium')

    ax1.set_ylim(0, 115)
    ax1.set_ylabel("CPU utilization (%)")
    ax1.set_xticks(x)
    ax1.set_xticklabels([METHOD_NAMES[m] for m in METHOD_ORDER])
    ax1.text(0.04, 0.90, "(a) Process CPU Load", transform=ax1.transAxes,
             fontsize=9.5, fontweight='bold', color=TEXT_PRIMARY)

    # Panel 2: Memory RSS
    bars2 = ax2.bar(x, mem_rss, width=0.48, color=[PALETTE[m] for m in METHOD_ORDER],
                    edgecolor='#1E293B', linewidth=0.8, alpha=0.85)
    for bar in bars2:
        yval = bar.get_height()
        ax2.text(bar.get_x() + bar.get_width() / 2, yval + 3, f"{yval:.1f} MB",
                 ha='center', va='bottom', fontsize=8.5, color=TEXT_PRIMARY, fontweight='medium')

    ax2.set_ylim(0, 180)
    ax2.set_ylabel("Resident set size (MB)")
    ax2.set_xticks(x)
    ax2.set_xticklabels([METHOD_NAMES[m] for m in METHOD_ORDER])
    ax2.text(0.04, 0.90, "(b) Memory Footprint", transform=ax2.transAxes,
             fontsize=9.5, fontweight='bold', color=TEXT_PRIMARY)

    fig.suptitle("System Resource Utilization at Peak Concurrency (25 VUs)", fontsize=12.5, y=0.98)
    plt.tight_layout()
    save_all_formats(fig, os.path.join(fig_dir, 'fig9_resource_utilization'))
    print("Generated: fig9_resource_utilization")

# ==============================================================================
# FIGURE 10: STAGE CONTRIBUTION PERCENTAGE (100% STACKED BAR)
# ==============================================================================
def plot_fig10_stage_contribution_percentage(stages_df, fig_dir):
    fig, ax = plt.subplots(figsize=(7.8, 4.4))

    display_order = list(reversed(METHOD_ORDER))
    y_pos = np.arange(len(display_order))

    _, stage_shares = compute_stage_metrics(stages_df)

    stages = ['bcrypt', 'qr', 'otp', 'db', 'session', 'crypto']
    stage_labels = [
        'Bcrypt key derivation',
        'QR matrix rendering',
        'Simulated out-of-band OTP delay',
        'Database query / commit',
        'Session dispatch',
        'Nonce / HMAC validation'
    ]

    lefts = np.zeros(len(display_order))
    for s_idx, s_key in enumerate(stages):
        widths = [stage_shares[m][s_key] for m in display_order]
        col = STAGE_PALETTE[s_key]
        ax.barh(
            y_pos, widths, left=lefts, height=0.48,
            color=col, edgecolor='#FFFFFF', linewidth=0.8,
            label=stage_labels[s_idx]
        )
        for i, (pct, left_val) in enumerate(zip(widths, lefts)):
            if pct > 12.0:
                ax.text(
                    left_val + pct / 2, i, f"{pct:.1f}%",
                    va='center', ha='center', fontsize=8, color='#FFFFFF', fontweight='medium'
                )
        lefts += np.array(widths)

    ax.set_yticks(y_pos)
    ax.set_yticklabels([METHOD_NAMES[m] for m in display_order])
    ax.set_xlim(0, 100)
    ax.xaxis.set_major_formatter(ticker.PercentFormatter())
    ax.set_xlabel("Relative stage execution share (%)")
    ax.set_title("Relative Micro-Stage Latency Contribution (%)")

    ax.legend(
        loc='upper right', bbox_to_anchor=(1.0, 0.98),
        ncol=2, frameon=True, framealpha=0.9, edgecolor=GRID_COLOR
    )

    save_all_formats(fig, os.path.join(fig_dir, 'fig10_stage_contribution_percentage'))
    print("Generated: fig10_stage_contribution_percentage")

# ==============================================================================
# COMBINED PREVIEW SHEET
# ==============================================================================
def generate_combined_preview_sheet(fig_dir):
    from PIL import Image

    fig_names = [
        'fig1_latency_distribution.png',
        'fig2_tail_latency_breakdown.png',
        'fig3_throughput_vs_concurrency.png',
        'fig4_p95_vs_concurrency.png',
        'fig5_substage_decomposition.png',
        'fig6_latency_ecdf.png',
        'fig8_composite_academic_summary.png',
        'fig9_resource_utilization.png',
        'fig10_stage_contribution_percentage.png'
    ]

    existing_figs = [f for f in fig_names if os.path.exists(os.path.join(fig_dir, f))]
    images = [Image.open(os.path.join(fig_dir, f)) for f in existing_figs]

    target_width = 1200
    resized_images = []
    for im in images:
        w, h = im.size
        target_height = int(h * (target_width / w))
        resized_images.append(im.resize((target_width, target_height), Image.Resampling.LANCZOS))

    cols = 2
    rows = (len(resized_images) + cols - 1) // cols
    row_heights = []
    for r in range(rows):
        r_imgs = resized_images[r*cols : (r+1)*cols]
        row_heights.append(max(im.size[1] for im in r_imgs))

    sheet_w = target_width * cols + 60
    sheet_h = sum(row_heights) + (rows + 1) * 40
    sheet = Image.new('RGB', (sheet_w, sheet_h), color='#F8FAFC')

    y_offset = 40
    for r in range(rows):
        for c in range(cols):
            idx = r * cols + c
            if idx < len(resized_images):
                im = resized_images[idx]
                x_offset = 20 + c * (target_width + 20)
                sheet.paste(im, (x_offset, y_offset))
        y_offset += row_heights[r] + 40

    preview_path = os.path.join(fig_dir, 'figure_preview_sheet.png')
    sheet.save(preview_path, quality=95)
    print("Generated: figure_preview_sheet.png")

# ==============================================================================
# MAIN ENTRYPOINT
# ==============================================================================
def main():
    print("Beginning scientific figure generation pipeline...")
    traces_df, stages_df, stats, fig_dir = load_data()

    plot_fig1_latency_distribution(traces_df, stats, fig_dir)
    plot_fig2_tail_latency_breakdown(stats, fig_dir)
    plot_fig3_throughput_vs_concurrency(stats, fig_dir)
    plot_fig4_p95_p99_vs_concurrency(traces_df, fig_dir)
    plot_fig5_substage_decomposition(stages_df, fig_dir)
    plot_fig6_latency_ecdf(traces_df, fig_dir)
    plot_fig8_composite_academic_summary(traces_df, stats, stages_df, fig_dir)
    plot_fig9_resource_utilization(fig_dir)
    plot_fig10_stage_contribution_percentage(stages_df, fig_dir)

    try:
        generate_combined_preview_sheet(fig_dir)
    except Exception as e:
        print(f"Preview sheet generation skipped: {e}")

    print("Successfully completed scientific figure generation.")

if __name__ == '__main__':
    main()
