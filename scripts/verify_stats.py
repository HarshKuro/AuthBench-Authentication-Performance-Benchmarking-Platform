import pandas as pd
import numpy as np
from scipy import stats

traces = pd.read_csv('research-output/traces_empirical.csv')
groups = {m: traces[traces['AuthMethod'] == m]['DurationMs'].values for m in ['PASSWORD', 'OTP', 'QR', 'QR_OTP']}

# Kruskal-Wallis omnibus
kw_stat, kw_p = stats.kruskal(*[groups[m] for m in ['PASSWORD', 'OTP', 'QR', 'QR_OTP']])
print(f'Kruskal-Wallis: H = {kw_stat:.4f}, p = {kw_p:.4e}')

def cliffs_delta(a, b):
    diff = a[:, None] - b[None, :]
    greater = np.sum(diff > 0)
    less = np.sum(diff < 0)
    delta = (greater - less) / (len(a) * len(b))
    ad = abs(delta)
    if ad < 0.147: mag = 'Negligible'
    elif ad < 0.33: mag = 'Small'
    elif ad < 0.474: mag = 'Medium'
    else: mag = 'Large'
    return delta, mag

pairs = [
    ('PASSWORD', 'OTP'),
    ('PASSWORD', 'QR'),
    ('PASSWORD', 'QR_OTP'),
    ('OTP', 'QR'),
    ('OTP', 'QR_OTP'),
    ('QR', 'QR_OTP')
]

results = []
for m1, m2 in pairs:
    u_stat, u_p = stats.mannwhitneyu(groups[m1], groups[m2], alternative='two-sided')
    delta, mag = cliffs_delta(groups[m1], groups[m2])
    results.append({
        'pair': f'{m1} vs {m2}',
        'n1': len(groups[m1]),
        'n2': len(groups[m2]),
        'U': u_stat,
        'p_raw': u_p,
        'delta': delta,
        'magnitude': mag
    })

# Holm-Bonferroni step-down adjustment
sorted_indices = np.argsort([r['p_raw'] for r in results])
m_tests = len(results)
p_holm = [0.0] * m_tests

accum = 0.0
for rank, idx in enumerate(sorted_indices):
    mult = m_tests - rank
    adj = min(1.0, results[idx]['p_raw'] * mult)
    accum = max(accum, adj)
    p_holm[idx] = accum

for i, r in enumerate(results):
    r['p_holm'] = p_holm[i]
    print(f"{r['pair']}: n1={r['n1']}, n2={r['n2']}, U={r['U']:.1f}, p_raw={r['p_raw']:.3e}, p_holm={r['p_holm']:.3e}, delta={r['delta']:.4f} ({r['magnitude']})")
