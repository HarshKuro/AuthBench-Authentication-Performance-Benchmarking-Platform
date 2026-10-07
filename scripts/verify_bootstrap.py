import pandas as pd
import numpy as np
from scipy import stats

traces = pd.read_csv('research-output/traces_empirical.csv')
for m in ['PASSWORD', 'OTP', 'QR', 'QR_OTP']:
    arr = traces[traces['AuthMethod'] == m]['DurationMs'].values
    res = stats.bootstrap(
        (arr,),
        statistic=np.median,
        n_resamples=2000,
        confidence_level=0.95,
        method="BCa",
        random_state=np.random.default_rng(42)
    )
    print(f"{m}: Median={np.median(arr):.3f}, 95% BCa CI=[{res.confidence_interval.low:.3f}, {res.confidence_interval.high:.3f}]")
