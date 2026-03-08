

## Add Verified Domain Sales to Database

Extract ~110 verified sales from the two uploaded screenshots and insert them into the `comparable_sales` table.

### Data Summary
- **Screenshot 1**: ~55 sales ranging from $11,000 (gork.ai) down to ~$2,175 (gangnammoore.com)
- **Screenshot 2**: ~55 sales ranging from $2,155 (mwhite.com.co) down to $1,075 (datadelta.com)
- **Venues**: GoDaddy, Atom.com, Namecheap, DropCatch, Afternic, Sedo, Spaceship.com, Catched.com, Dynadot, Sav.com, fruits.co

### Implementation
Single database insert of all ~110 records into `comparable_sales` with:
- `domain_name`, `tld`, `sale_price`, `venue`
- `notes`: "Verified sale 2026"
- `ON CONFLICT (domain_name) DO NOTHING` to skip duplicates

No code changes required — data-only operation.

