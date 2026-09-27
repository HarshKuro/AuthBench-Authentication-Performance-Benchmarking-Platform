# Scientific Visualization Style Guide: E-Authentication Benchmarking

**Target Standard:** IEEE Transactions / ACM TOCS / Nature Systems Research Guidelines  
**Focus:** Minimal Academic Engineering & Scientific Precision  
**Scope:** Universal Visual Identity for all Performance Figures in "Performance Evaluation of QR Code and OTP-Based E-Authentication"

---

## 1. Core Philosophy

1. **Scientific Integrity over Decoration:** Data ink ratio is maximized. No 3D effects, no gradient fills, no drop shadows, and no decorative iconography.
2. **Empirical Grounding:** Every pixel, marker, and bar maps directly to empirical hardware-measured traces from PostgreSQL 18.3. No interpolated, synthetic, or smoothed points without explicit annotation.
3. **Black-and-White & Color-Blind Accessibility:**
   - Every authentication scheme is assigned a unique categorical color with distinct luminance levels.
   - Line charts utilize distinct marker shapes (`o`, `s`, `D`, `^`) and stroke styles (solid, dashed, dotted) so graphs remain completely decipherable in greyscale printouts.

---

## 2. Visual Palette Specification

| Component | Identifier | Hex Code | Swatch | Luminance / Contrast Role |
| :--- | :--- | :---: | :---: | :--- |
| **Method A: Password** | Baseline Control | `#64748B` | Slate Gray | Neutral baseline; distinct low-saturation gray-blue |
| **Method B: OTP** | Single-Factor POS | `#D97706` | Amber | High-visibility warm tone; easily separable from blues |
| **Method C: QR** | Single-Factor POS | `#0284C7` | Sky Blue | Mid-luminance cool tone representing visual optical channel |
| **Method D: QR + OTP** | Proposed Hybrid | `#7C3AED` | Royal Purple | High-salience chromatic focal point; strictly identical across all charts |
| **Grid Lines** | Major Grids | `#E5E7EB` | Light Gray | Ultra-subtle background delimiter (`alpha = 0.8`, `lw = 0.6`) |
| **Axes & Spines** | Outer Bounds | `#9CA3AF` | Mid Gray | Clean lower/left boundary; top and right spines hidden |
| **Primary Typography**| Labels & Titles | `#111827` | Deep Navy/Black | Maximum contrast on white canvas |
| **Secondary Text** | Annotations/Ticks | `#475569` | Muted Charcoal | De-emphasized secondary text |
| **Canvas Background** | Page Canvas | `#FFFFFF` | Pure White | IEEE/ACM publication standard |

### Micro-Stage Palette (Internal Decompositions)
- **Bcrypt Key Derivation:** `#DC2626` (Crimson Muted)
- **QR Matrix Rendering:** `#0284C7` (Sky Blue)
- **OTP Transit Simulation:** `#D97706` (Amber)
- **Database Query / Commit:** `#2563EB` (Royal Blue)
- **Session Dispatch:** `#059669` (Emerald Green)
- **Nonce / HMAC Validation:** `#7C3AED` (Royal Purple)

---

## 3. Typography Scale & Hierarchy

All figures employ clean, modern academic sans-serif typography (`DejaVu Sans`, `Arial`, `Helvetica`, `Inter`):

| Structural Element | Point Size | Font Weight | Color | Case / Alignment |
| :--- | :---: | :---: | :---: | :--- |
| **Figure Canvas Title** | 13–14 pt | Semibold / Bold | `#111827` | Title Case, Centered or Left |
| **Panel Identifiers `(a), (b)`** | 10.5–11 pt | Bold | `#111827` | Upper-left corner of subpanel |
| **Axis Titles (X & Y)** | 11.0 pt | Medium | `#111827` | Sentence Case with explicit units in parentheses `(ms)` |
| **Tick Labels** | 9.5 pt | Regular | `#475569` | Numeric formatting with thousands separators |
| **Legend Text** | 9.0 pt | Regular | `#111827` | Sentence Case; compact box with `#E5E7EB` border |
| **Data Annotations** | 8.0–8.5 pt | Regular / Medium | Contextual | Direct factual callouts only (e.g., `102.1 ms`) |

---

## 4. Axis & Measurement Rules

1. **Units:**
   - Always explicit: `ms` for latency (never `msec` or `milliseconds`).
   - `Successful authentications/s` or `Throughput (auth/s)` for throughput.
   - `Concurrent virtual users` for load level.
   - `CPU utilization (%)` and `Resident set size (MB)` for resources.
2. **Logarithmic Scaling:**
   - Scientifically mandated for latency distributions (Figures 1, 2, and 6) due to the three-orders-of-magnitude span between sub-millisecond HMAC crypto ($<0.1\text{ ms}$) and saturated bcrypt key derivation ($>1,740\text{ ms}$).
   - Major ticks are placed at integer multiples of standard steps: `10`, `25`, `50`, `100`, `250`, `500`, `1,000`, `2,000`.
3. **Spines:**
   - Top and right spines are removed (`axes.spines.top = False`, `axes.spines.right = False`) to eliminate unnecessary borders.
   - Bottom and left spines are retained at `0.8 pt` with `#9CA3AF`.

---

## 5. Export Standard & Resolution

Every figure is compiled into three distinct formats located in `research-output/figures/`:
1. **PNG (`.png`):** High-density raster rendered at **300 DPI** with bounding box set to `tight`.
2. **SVG (`.svg`):** Scalable Vector Graphics retaining pure text elements for lossless scaling in web and vector design tools.
3. **PDF (`.pdf`):** Embedded vector format with TrueType fonts preserved for native `\includegraphics` inclusion in LaTeX manuscripts (`pdflatex`, `xelatex`, `lualatex`).
