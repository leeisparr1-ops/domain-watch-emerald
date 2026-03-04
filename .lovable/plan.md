

## Enhanced Search Volume Trends Chart

The current sparkline is a minimal 60px-tall area chart with no axes, no labels, and no context -- just a colored blob. The dotDB reference shows a much richer visualization: visible Y-axis with formatted numbers, X-axis with year labels, a proper title, summary stats, and a more polished look.

### What changes

**Redesign `SEOVolumeSparkline.tsx`** into a richer, more informative component:

1. **Visible axes** -- Show X-axis with month/year labels (every 2-3 months to avoid crowding) and Y-axis with formatted volume numbers (e.g. "55.6M", "12K")
2. **Header stats row** -- Above the chart, display key metrics inline: peak volume, current volume, and trend direction with percentage change (e.g. "+340% ↑")
3. **Larger default height** -- Increase from 60px to ~160px when used in the AI Advisor and Valuation Estimator report cards (keep a compact mode for bulk table)
4. **Grid lines** -- Subtle horizontal reference lines so values are readable at a glance
5. **Better gradient fill** -- Richer gradient with more opacity, matching the dotDB style blue-to-transparent fill
6. **Animated dot on hover** -- Already have `activeDot`, but increase prominence
7. **Title label** -- "Search Volume Trends (Last 12 Months)" as a subtle header inside the chart card
8. **Trend badge** -- Small pill showing the overall trend direction and % change (e.g. "▲ 142% rising")

**Props stay backward-compatible** -- add an optional `variant` prop (`"compact" | "detailed"`, default `"detailed"`) so the bulk table can still use a compact version while the Advisor/Valuation pages get the full treatment.

### Files to modify

- `src/components/tools/SEOVolumeSparkline.tsx` -- Complete redesign with dual variant support
- `src/components/tools/AIDomainAdvisor.tsx` -- Pass `variant="detailed"` and increased height (~160px)
- `src/components/tools/DomainValuationEstimator.tsx` -- Same, pass `variant="detailed"` with increased height

### Technical details

- Use recharts `CartesianGrid`, `YAxis`, `XAxis` with custom tick formatters
- Y-axis formatter: numbers > 1M show as "1.2M", > 1K as "12K", else raw
- X-axis: show every 3rd label to prevent overlap
- Trend calculation: `((last - first) / first * 100)` with arrow icon
- Compact variant keeps current behavior (no axes, 52-60px)
- Detailed variant renders inside a subtle bordered card with padding

