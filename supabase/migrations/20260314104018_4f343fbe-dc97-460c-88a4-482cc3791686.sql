UPDATE public.portfolio_domains
SET list_price = purchase_price,
    purchase_price = 0
WHERE purchase_price > 0
  AND (list_price IS NULL OR list_price = 0);