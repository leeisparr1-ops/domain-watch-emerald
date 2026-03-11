-- Drop the OLD 10-parameter overload that requires scores_computed_at IS NOT NULL
DROP FUNCTION IF EXISTS public.find_hidden_gems(
  integer, numeric, text, integer, integer, integer, text, text, integer, integer
);