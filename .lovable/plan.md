

## Fix: SEO Volume Chart vs Headline Number Mismatch

### Problem
The headline says "~286,260/mo" (sum of all keyword volumes), but the chart only shows the monthly trend for the single top keyword (~27,100). This is confusing and looks like a bug.

### Root Cause
In `estimateSEOVolume()` (`src/lib/seoVolume.ts`), `estimatedMonthlySearches` sums volumes across all words, but `monthlySearches` is only populated from the top keyword's DataForSEO trend data. There's no aggregated monthly trend.

### Solution
Two changes:

**1. Aggregate monthly searches across all keywords** (`src/lib/seoVolume.ts`)
- Instead of only storing `monthlySearches` from the top keyword, merge monthly data from all keywords that have DataForSEO trend data
- For each month, sum the `search_volume` across all keywords
- This way the chart values will align with the headline total

**2. Add a clarifying label to the chart** (`src/components/tools/SEOVolumeSparkline.tsx`)
- If aggregation isn't possible (e.g., only one keyword has monthly data), add a subtitle like "Showing trend for top keyword: {keyword}" so users understand the difference
- When aggregated data is available, the Current/Peak values will match the headline figure

### Files to modify
- `src/lib/seoVolume.ts` — Aggregate `monthly_searches` arrays across all keywords instead of only keeping the top keyword's data
- `src/components/tools/SEOVolumeSparkline.tsx` — Optionally accept a `topKeyword` prop to show which keyword the trend represents if not aggregated

