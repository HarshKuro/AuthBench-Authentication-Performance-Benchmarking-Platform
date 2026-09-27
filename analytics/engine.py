"""
Python Scientific Analytics & Statistical Inference Engine
Empirical Performance Evaluation of Multi-Factor E-Authentication Mechanisms (QR, OTP, QR+OTP)
Standard: IEEE / ACM Empirical Systems Research Guidelines
"""

import sys
import json
import numpy as np
import pandas as pd
from scipy import stats
from typing import Dict, List, Any, Tuple, Optional

def sanitize_json(obj: Any) -> Any:
    """Recursively converts numpy types to native Python types for clean JSON output"""
    if isinstance(obj, dict):
        return {k: sanitize_json(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [sanitize_json(v) for v in obj]
    elif isinstance(obj, (np.bool_, np.bool)):
        return bool(obj)
    elif isinstance(obj, (np.integer, np.int64, np.int32)):
        return int(obj)
    elif isinstance(obj, (np.floating, np.float64, np.float32)):
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return sanitize_json(obj.tolist())
    return obj

class ScientificAnalyticsEngine:
    """
    Rigorously computes central tendency, tail distributions, non-parametric
    hypothesis tests, effect sizes, and bootstrap confidence intervals.
    """

    @staticmethod
    def test_normality(data: List[float]) -> Dict[str, Any]:
        """
        Evaluate Gaussian normality using Shapiro-Wilk test.
        Returns whether non-parametric methods are required.
        """
        arr = np.array(data, dtype=float)
        arr = arr[~np.isnan(arr)]
        if len(arr) < 8:
            return {
                "test": "Shapiro-Wilk",
                "sample_size": int(len(arr)),
                "statistic": None,
                "p_value": None,
                "is_normal": False,
                "recommendation": "Non-parametric (sample size too small for reliable normality verification)"
            }

        stat, p_val = stats.shapiro(arr[:5000])
        is_normal = bool(p_val >= 0.05)
        return {
            "test": "Shapiro-Wilk",
            "sample_size": int(len(arr)),
            "statistic": float(round(float(stat), 4)),
            "p_value": float(round(float(p_val), 6)),
            "is_normal": is_normal,
            "recommendation": "Parametric (Gaussian)" if is_normal else "Non-parametric (Rank-based / Medians)"
        }

    @staticmethod
    def compute_distribution_metrics(data: List[float]) -> Dict[str, Any]:
        """
        Compute comprehensive distribution summary metrics including tail percentiles.
        """
        arr = np.array(data, dtype=float)
        arr = arr[~np.isnan(arr)]
        if len(arr) == 0:
            return {}

        q25, q50, q75, q90, q95, q99 = np.percentile(arr, [25, 50, 75, 90, 95, 99])
        iqr = q75 - q25

        return {
            "count": int(len(arr)),
            "mean": float(round(float(np.mean(arr)), 3)),
            "median": float(round(float(q50), 3)),
            "std_dev": float(round(float(np.std(arr, ddof=1) if len(arr) > 1 else 0.0), 3)),
            "variance": float(round(float(np.var(arr, ddof=1) if len(arr) > 1 else 0.0), 3)),
            "iqr": float(round(float(iqr), 3)),
            "p25": float(round(float(q25), 3)),
            "p50": float(round(float(q50), 3)),
            "p75": float(round(float(q75), 3)),
            "p90": float(round(float(q90), 3)),
            "p95": float(round(float(q95), 3)),
            "p99": float(round(float(q99), 3)),
            "min": float(round(float(np.min(arr)), 3)),
            "max": float(round(float(np.max(arr)), 3)),
            "skewness": float(round(float(stats.skew(arr)), 3)) if len(arr) > 2 else 0.0,
            "kurtosis": float(round(float(stats.kurtosis(arr)), 3)) if len(arr) > 3 else 0.0,
        }

    @staticmethod
    def bootstrap_confidence_interval(
        data: List[float],
        statistic_name: str = "median",
        n_resamples: int = 2000,
        confidence_level: float = 0.95
    ) -> Dict[str, float]:
        """
        Calculate non-parametric Bootstrap Confidence Interval.
        """
        arr = np.array(data, dtype=float)
        arr = arr[~np.isnan(arr)]
        if len(arr) < 5:
            return {"lower": 0.0, "upper": 0.0}

        stat_func = np.median if statistic_name == "median" else np.mean
        res = stats.bootstrap(
            (arr,),
            statistic=stat_func,
            n_resamples=n_resamples,
            confidence_level=confidence_level,
            method="BCa" if len(arr) >= 15 else "percentile"
        )
        return {
            "lower": float(round(float(res.confidence_interval.low), 3)),
            "upper": float(round(float(res.confidence_interval.high), 3))
        }

    @staticmethod
    def calculate_cliffs_delta(group1: List[float], group2: List[float]) -> Dict[str, Any]:
        """
        Compute Cliff's Delta non-parametric effect size:
        delta = ( #(x1 > x2) - #(x1 < x2) ) / (n1 * n2)
        """
        a = np.array(group1, dtype=float)
        b = np.array(group2, dtype=float)
        if len(a) == 0 or len(b) == 0:
            return {"cliffs_delta": 0.0, "magnitude": "Undefined"}

        diff = a[:, None] - b[None, :]
        greater = int(np.sum(diff > 0))
        less = int(np.sum(diff < 0))
        delta = (greater - less) / (len(a) * len(b))

        abs_delta = abs(delta)
        if abs_delta < 0.147:
            magnitude = "Negligible"
        elif abs_delta < 0.33:
            magnitude = "Small"
        elif abs_delta < 0.474:
            magnitude = "Medium"
        else:
            magnitude = "Large"

        return {
            "cliffs_delta": float(round(float(delta), 4)),
            "magnitude": magnitude
        }

    @staticmethod
    def calculate_cohens_d(group1: List[float], group2: List[float]) -> Dict[str, Any]:
        """
        Compute Cohen's d standardized mean difference.
        """
        a = np.array(group1, dtype=float)
        b = np.array(group2, dtype=float)
        if len(a) < 2 or len(b) < 2:
            return {"cohens_d": 0.0, "magnitude": "Undefined"}

        n1, n2 = len(a), len(b)
        s1, s2 = float(np.var(a, ddof=1)), float(np.var(b, ddof=1))
        s_pooled = np.sqrt(((n1 - 1) * s1 + (n2 - 1) * s2) / (n1 + n2 - 2))
        if s_pooled == 0:
            return {"cohens_d": 0.0, "magnitude": "Zero Variance"}

        d = (float(np.mean(a)) - float(np.mean(b))) / float(s_pooled)
        abs_d = abs(d)
        if abs_d < 0.2:
            magnitude = "Negligible"
        elif abs_d < 0.5:
            magnitude = "Small"
        elif abs_d < 0.8:
            magnitude = "Medium"
        else:
            magnitude = "Large"

        return {
            "cohens_d": float(round(float(d), 4)),
            "magnitude": magnitude
        }

    @classmethod
    def compare_two_groups(
        cls,
        data_a: List[float],
        data_b: List[float],
        name_a: str,
        name_b: str
    ) -> Dict[str, Any]:
        """
        Perform complete hypothesis testing between two authentication mechanisms:
        - Mann-Whitney U Test (primary non-parametric)
        - Student's Two-Sample t-test
        - Cliff's Delta Effect Size
        - Cohen's d Effect Size
        """
        a = [float(x) for x in data_a if not np.isnan(x)]
        b = [float(x) for x in data_b if not np.isnan(x)]

        if len(a) < 3 or len(b) < 3:
            return {"error": "Insufficient observations for hypothesis testing"}

        # Mann-Whitney U test
        u_stat, u_p = stats.mannwhitneyu(a, b, alternative='two-sided')
        # Student's t-test (Welch's t-test unequal variances)
        t_stat, t_p = stats.ttest_ind(a, b, equal_var=False)

        cliffs = cls.calculate_cliffs_delta(a, b)
        cohen = cls.calculate_cohens_d(a, b)

        alpha = 0.05
        reject_null = bool(u_p < alpha)

        return {
            "comparison": f"{name_a} vs {name_b}",
            "sample_sizes": {name_a: int(len(a)), name_b: int(len(b))},
            "mann_whitney_u": {
                "statistic": float(round(float(u_stat), 3)),
                "p_value": float(u_p),
                "significant_at_05": reject_null
            },
            "welch_t_test": {
                "statistic": float(round(float(t_stat), 3)),
                "p_value": float(t_p),
                "significant_at_05": bool(t_p < alpha)
            },
            "effect_size": {
                "cliffs_delta": cliffs["cliffs_delta"],
                "cliffs_magnitude": cliffs["magnitude"],
                "cohens_d": cohen["cohens_d"],
                "cohens_magnitude": cohen["magnitude"]
            },
            "interpretation": (
                f"Statistically significant difference detected (p = {u_p:.3e}). "
                f"Effect size is {cliffs['magnitude']} (Cliff's δ = {cliffs['cliffs_delta']})."
                if reject_null else
                f"No statistically significant difference detected (p = {u_p:.3f})."
            )
        }

    @classmethod
    def omnibus_kruskal_wallis(cls, groups: Dict[str, List[float]]) -> Dict[str, Any]:
        """
        Omnibus non-parametric one-way ANOVA (Kruskal-Wallis H-test)
        across all 4 authentication methods followed by pairwise Dunn-Bonferroni contrasts.
        """
        valid_groups = {k: [float(x) for x in v if not np.isnan(x)] for k, v in groups.items() if len(v) >= 3}
        if len(valid_groups) < 2:
            return {"error": "At least two valid groups required"}

        lists = list(valid_groups.values())
        h_stat, p_val = stats.kruskal(*lists)

        # Pairwise contrasts with Bonferroni correction
        group_names = list(valid_groups.keys())
        pairwise = []
        num_comparisons = (len(group_names) * (len(group_names) - 1)) // 2
        bonferroni_alpha = 0.05 / max(1, num_comparisons)

        for i in range(len(group_names)):
            for j in range(i + 1, len(group_names)):
                name_i, name_j = group_names[i], group_names[j]
                comp = cls.compare_two_groups(valid_groups[name_i], valid_groups[name_j], name_i, name_j)
                comp["bonferroni_alpha"] = float(bonferroni_alpha)
                pairwise.append(comp)

        return {
            "test": "Kruskal-Wallis H-test",
            "h_statistic": float(round(float(h_stat), 4)),
            "p_value": float(p_val),
            "degrees_of_freedom": int(len(valid_groups) - 1),
            "significant_at_05": bool(p_val < 0.05),
            "pairwise_contrasts": pairwise,
            "interpretation": (
                f"Global difference across methods is statistically significant (H = {h_stat:.2f}, p = {p_val:.3e})."
                if p_val < 0.05 else
                f"No global difference across methods (H = {h_stat:.2f}, p = {p_val:.3f})."
            )
        }

    @staticmethod
    def detect_saturation_knee(
        concurrency_levels: List[int],
        throughputs: List[float],
        latencies_p95: List[float]
    ) -> Dict[str, Any]:
        """
        Identify system saturation point by computing discrete second derivatives
        of the throughput vs concurrency curve.
        """
        if len(concurrency_levels) < 4:
            return {"saturation_detected": False, "reason": "Insufficient points"}

        vus = np.array(concurrency_levels, dtype=float)
        tps = np.array(throughputs, dtype=float)

        dtps_dvus = np.gradient(tps, vus)
        d2tps_dvus2 = np.gradient(dtps_dvus, vus)

        knee_idx = int(np.argmin(d2tps_dvus2[1:-1])) + 1
        saturation_vu = int(vus[knee_idx])
        peak_throughput = float(np.max(tps))

        return {
            "saturation_detected": True,
            "saturation_concurrency_vus": saturation_vu,
            "peak_throughput_rps": peak_throughput,
            "p95_latency_at_saturation_ms": float(latencies_p95[knee_idx]) if knee_idx < len(latencies_p95) else 0.0,
            "regime": {
                "linear_range": f"1 to {concurrency_levels[max(0, knee_idx - 1)]} VUs",
                "degradation_knee": f"{saturation_vu} VUs",
                "saturation_ceiling": f"{concurrency_levels[-1]} VUs"
            }
        }
