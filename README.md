# Larder — Pantry Tracker + Recipe Finder

Full app: pantry ingredient tracking via barcode scan or manual entry
(with nutrient data from Calorie API, Open Food Facts, and USDA), plus a
recipe curation flow (protein/cuisine/time/diet selectors) powered by
Spoonacular and Edamam — searchable individually or together — ranked
by how much of each recipe you already have in your pantry.

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project.
2. In the SQL editor, run everything in `supabase/schema.sql`. This creates
   the `pantry_items` and `saved_recipes` tables, both with row-level
   security scoped to `auth.uid()` — so each user only ever sees their
   own data.

   **If you already ran an earlier version of this schema**, `saved_recipes`
   needs a migration — Edamam's recipe IDs are text (URIs), not numbers
   like Spoonacular's, so the column type has to change. Run this once in
   the SQL editor instead of the full script above:
   ```sql
   alter table saved_recipes alter column recipe_id type text;
   alter table saved_recipes add column if not exists source text not null default 'spoonacular';
   alter table saved_recipes drop constraint if exists saved_recipes_user_id_recipe_id_key;
   alter table saved_recipes add constraint saved_recipes_user_id_recipe_id_source_key unique (user_id, recipe_id, source);
   ```
3. Under **Authentication > Providers**, email/password should already be
   enabled by default. Under **Authentication > Settings**, you can turn
   off "Confirm email" if you want signups to work without an email step
   while testing.
4. Under **Project Settings > API**, copy the **Project URL** and
   **anon public key**.

### 3. Get API keys

- **Calorie API** (primary lookup): sign up at
  [calorieapi.com](https://calorieapi.com/auth/register) — free tier
  includes 1,000 requests/month, no credit card required. Replaced
  Nutritionix in this role after Nutritionix discontinued its public
  free tier entirely (confirmed on their developer site — it's
  enterprise-only pricing now, no self-serve middle tier).
- **Open Food Facts** (first fallback): no key needed, queried directly.
- **USDA FoodData Central** (name-search fallback only — see note below):
  get a free key at
  [fdc.nal.usda.gov/api-key-signup](https://fdc.nal.usda.gov/api-key-signup.html).
- **Spoonacular** (recipe source #1): sign up at
  [spoonacular.com/food-api/console](https://spoonacular.com/food-api/console)
  and copy your API key. You're on the free tier, which has a daily request
  cap — each recipe search costs 1 API call if you selected 0-1 proteins,
  or 2 calls if you selected 2 proteins (see note below on why).
- **Edamam** (recipe source #2, added to widen thin result sets): create a
  free account at [developer.edamam.com](https://developer.edamam.com),
  create an application under the **Recipe Search API**, and copy the
  **Application ID** and **Application Key** it gives you. Their free
  developer tier is rate-limited per minute rather than a hard daily cap,
  which is generally more forgiving than Spoonacular's.

**Important limitation:** USDA FoodData Central has no barcode/UPC lookup
endpoint — only name search. So for barcode scans, the real fallback chain
is Calorie API → Open Food Facts (2 sources, not 3) — though Calorie
API's own barcode endpoint already checks Open Food Facts internally
before giving up, so our direct OFF fallback mostly matters when
Calorie API itself is down or quota-exhausted, not as a second shot at
data Calorie API already failed to find. USDA is used as a
third-pass fallback only when you manually type a product name to search.
This is a hard constraint of USDA's API, not a design choice — flagging it
so it's not a silent assumption.

### 4. Configure environment variables

Copy `.env.example` to `.env` and fill in the values from steps 2 and 3:

```bash
cp .env.example .env
```

### 5. Run locally

```bash
npm run dev
```

### 6. Deploy to Netlify

- Push this project to a GitHub repo, then connect it in Netlify, or drag
  the `dist/` folder (after `npm run build`) into Netlify's manual deploy.
- Add the same environment variables from your `.env` file under
  **Site settings > Environment variables** in Netlify.
- Barcode scanning needs camera access, which browsers only allow over
  **HTTPS or localhost** — Netlify serves over HTTPS by default, so this
  works once deployed; just note it won't work if you preview over plain
  HTTP on a local network IP.

## What's built

**Pantry (Phase 1)**
- Email/password auth via Supabase
- Add pantry items by scanning a barcode (camera-based, via ZXing) or by
  typing a name/brand to search
- Nutrient lookup chain: Calorie API → Open Food Facts → (USDA for name
  search only)
- If no source has data, you can enter nutrition facts manually
- Pantry items render as nutrition-facts-label cards, with quantity
  +/− controls, full edit, and remove
- Search/filter your pantry by name or brand

**Recipe finder (Phase 2)**
- Selector wizard: Regular meal or Dessert, a **recipe source picker**
  (Spoonacular / Edamam / Both), up to 2 proteins (each with a specific
  cut of meat, e.g. Chicken Breast vs Chicken Thigh), up to 2 cuisines, a
  prep-time bucket, one diet, plus Kid-friendly and Prioritize-healthier
  toggles
- "Both" queries Spoonacular and Edamam in the same search and merges the
  results — the fix for searches coming back with very few or zero
  recipes, since a single source's narrow filter combination can have a
  small underlying pool. If one source errors out (bad key, rate limit),
  results from the other source still show, with an error noted separately.
- Recipes ranked by how many ingredients you already have in your pantry
  (shown as a match bar + "X to buy" count), across whichever source(s)
  you searched — unless "prioritize healthier" is on, which reorders
  Spoonacular results by health score (Edamam has no equivalent, so its
  results stay pantry-ranked either way)
- Every search is randomized by default (different results each time,
  even with identical filters) — turning on "prioritize healthier" trades
  that randomization for a consistent health-ranked order
- Star/favorite a recipe to save it; a separate "Saved" page lists and
  lets you remove favorites

### API mapping decisions worth knowing about

These came up because the real APIs don't match the request 1:1 — flagging
them here so they're not silent assumptions:

- **Fixed: a randomization bug was causing empty/sparse results.**
  Search results used to apply a random "offset" on top of Spoonacular's
  own `sort=random`. On narrow filter combinations, the real matching
  pool can be quite small (5-10 recipes), so an offset like 25 would ask
  for "results starting at position 25" when there were none — an empty
  response. This has been removed; `sort=random` alone already shuffles
  which recipes come back, without an offset risking that.
- **Edamam is now a second, independent recipe source** with its own
  free tier, added specifically so a narrow search on one source can
  still return results from the other via the "Both" option. Its filters
  don't map 1:1 onto Spoonacular's:
  - Edamam actually **has** native Low-Carb, Keto, and Mediterranean
    filters — Spoonacular has to approximate all three (see below).
  - Edamam has **no "Soul Food" cuisine equivalent either** — mapped to
    the closest available value, "american" (broad, imperfect).
  - "Thai" isn't its own cuisine value in Edamam — mapped to the broader
    "south east asian."
  - Edamam has no health-score sort — the "prioritize healthier" toggle
    only reorders Spoonacular results; Edamam results are unaffected by
    it either way.
- **2 proteins selected → 2 API calls per source, not 1.** Spoonacular's
  ingredient filter requires *all* listed ingredients in one recipe
  (AND), not either/or. So "either protein" means running one search per
  protein and merging results — which is what you chose, but it does
  mean a 2-protein search costs double the quota of a 1-protein search,
  on whichever source(s) you're searching.
- **"Low-Carb" isn't a real Spoonacular diet** — there's no such enum value
  in their API. It's approximated with their `maxCarbs` nutrient filter,
  capped at 20g per serving. (Edamam has a native `low-carb` diet label,
  used directly there.)
- **"Mediterranean" isn't a diet either** — Spoonacular only has it as a
  *cuisine*. Selecting it under "diet" adds Mediterranean to your cuisine
  filter instead.
- **Specific cuts of meat are a text match, not a structured filter.**
  "Chicken Breast" is sent as-is to Spoonacular's ingredient search —
  common phrasing works well, but an unusual cut name may return fewer
  results than picking "Any cut."
- **There's no "kid friendly" filter anywhere in Spoonacular's API** —
  checked their full diet/cuisine/type parameter list, none of them cover
  it. It's approximated by adding "kid friendly" as free text to the
  search query, which only works if a recipe happens to be titled or
  tagged that way in their database. Expect it to be hit or miss, not a
  reliable filter.
- **"Soul Food" isn't an official Spoonacular cuisine** — mapped to their
  Southern + African + Cajun cuisines combined (OR'd together).
- **USDA has no barcode lookup** — see the barcode section above.

## Known gaps / things not yet built

- Recipe "cook this" flow that decrements pantry quantities used
- Pagination on recipe search results (currently returns up to ~12 per
  search)
- Meal planning / weekly calendar view
