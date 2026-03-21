

# Add Verified Domain Sales to Comparable Sales Database

## What we're doing
Adding ~65+ new verified sales from the screenshot and the text list, bringing the total from 3,086 to ~3,150+ records.

## Data sources

**From screenshot** (sorted by price, venues include TOP.DOMAINS, Spaceship.com, GoDaddy, Afternic, Atom.com, Dynadot, Namecheap, DropCatch):
- longevity.app → $74,988 (TOP.DOMAINS)
- mrkt.xyz → $35,000 (Spaceship.com)
- 5685.com → $23,249 (GoDaddy)
- longevity.pro → $17,888 (Afternic)
- texaspolkamuseum.com → $13,250 (GoDaddy)
- frijoles.com → $10,949 (Atom.com)
- 53999.com → $10,088 (GoDaddy)
- nepallivetoday.com → $8,100 (Dynadot)
- juju.app → $7,988 (Afternic)
- sportami.com → $7,200 (Afternic)
- roulette-overzicht.com → $6,900 (Namecheap)
- iowa.net → $6,521 (GoDaddy)
- tacodivebar.com → $6,199 (GoDaddy)
- adpd.com → $6,000 (Afternic)
- turbobot.com → $5,988 (Afternic)
- canadarugbyleague.com → $5,028 (GoDaddy)
- trustflowai.com → $4,888 (Afternic)
- cortisone-info.com → $4,805 (DropCatch)
- info-brocantes.com → $4,500 (DropCatch)
- interconsult.com → $4,200 (DropCatch)
- himalayancurrynh.com → $4,149 (GoDaddy)
- codata.ai → $4,050 (Namecheap)
- vnoattheharbor.com → $4,001 (GoDaddy)
- nibclive.com → $3,851 (GoDaddy)
- plakanresort.com → $3,600 (GoDaddy)
- sticksandbeansnorthlake.com → $3,550 (GoDaddy)
- sagedoc.com → $3,504 (Atom.com)
- viair.com → $3,500 (DropCatch)
- brainpals.com → $3,488 (Afternic)
- northplanner.com → $3,448 (Atom.com)
- linac.com → $3,383 (Namecheap)
- sponsoriq.com → $3,374 (Atom.com)
- paylume.com → $3,324 (Atom.com)
- leapprofit.com → $3,299 (Atom.com)
- coverartshop.com → $3,226 (GoDaddy)
- mahnal.com → $3,150 (GoDaddy)
- bizful.com → $3,000 (Atom.com)
- zarasus.com → $2,949 (GoDaddy)
- raleighhobbyshop.com → $2,900 (GoDaddy)
- lonjev.com → $2,799 (Atom.com)
- pbs.us.com → $2,600 (Namecheap)
- naturesmedicinecolorado.com → $2,550 (GoDaddy)
- luckydumplingco.com → $2,550 (GoDaddy)
- porkpuffs.com → $2,549 (Atom.com)
- biztools.com → $2,522 (DropCatch)
- agentmailing.com → $2,501 (DropCatch)
- parsel.net → $2,500 (Atom.com)
- acendr.com → $2,499 (Atom.com)
- givelane.com → $2,499 (Atom.com)
- zonachapu.net → $2,425 (GoDaddy)
- michaelsokolove.com → $2,425 (GoDaddy)
- us-cap.org → $2,425 (Namecheap)
- vetcode.com → $2,376 (GoDaddy)

**From text list:**
- ClassCraft.com → $35,500
- Iowa.org → $17,000
- Subtle.ai → $16,200
- GlobalGoldenVisa.com → $10,497
- GriefInstitute.com → $10,000
- AgentWorkflows.io → $9,888
- Honduras.ai → $7,500
- EngageOnline.com → $24,888
- Helpa.ai → $19,750
- AdAstra.org → $8,338
- KeystoneOS.com → $7,988
- FaceLink.com → $7,577
- Jelee.com → $6,988
- PrimeTime.net → $6,500

## Implementation

1. **Single SQL migration** — INSERT all ~67 records into `comparable_sales` using `ON CONFLICT (domain_name) DO UPDATE` to safely handle any duplicates.
   - `sale_date`: today's date (2026-03-21) as approximate sale date
   - `venue`: mapped from the screenshot/list (e.g., "GoDaddy", "Afternic", "Atom.com", etc.). Text-list entries without venue info will use "End-User" as default.
   - `tld`: extracted from each domain name
   - `notes`: "Verified sale - March 2026"

2. **No code changes needed** — the existing valuation engine and comparables tool already query this table dynamically.

## Outcome
Database grows from 3,086 → ~3,153 verified sales, improving valuation accuracy especially for .ai, .app, .io, and specialty TLDs.

