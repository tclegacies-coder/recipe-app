// ============================================================
// Spoonacular recipe search
//
// Confirmed against Spoonacular's official docs before building
// (not guessed):
// - cuisine: comma-separated = OR
// - diet: comma-separated = AND, pipe-separated = OR (we only ever
//   send one diet value, so this doesn't matter for us)
// - includeIngredients: comma-separated ingredients are required
//   together (AND) — NOT what we want for "either protein", so
//   2 selected proteins = 2 separate calls, merged client-side
// - "Low Carb" is NOT a real diet enum value (confirmed on
//   Spoonacular's diet-definitions page) — approximated via the
//   maxCarbs nutrient filter instead, capped at 20g/serving
// - "Mediterranean" is not a diet enum value either — it's a
//   cuisine, so selecting it as a "diet" adds it as a cuisine
// - "Soul Food" isn't an official cuisine value — mapped to
//   Southern + African + Cajun combined (cuisine OR-list)
// - type=dessert and sort=random are both real, documented
//   parameter values (confirmed on Spoonacular's meal-types and
//   sorting-options reference)
// - There is NO "kid friendly" filter anywhere in Spoonacular's
//   taxonomy (not a diet, cuisine, or type value) — approximated by
//   adding "kid friendly" as free text to the search query, per your
//   choice. This depends on recipes actually being titled/tagged
//   that way in Spoonacular's data, so it's not a guaranteed filter.
// - "healthiness" is a real sort value — used for the "prioritize
//   healthier recipes" option
// ============================================================

import { TIME_BUCKETS } from "./recipeOptions";
import { scorePantryMatch } from "./recipeUtils";

const SPOONACULAR_API_KEY = import.meta.env.VITE_SPOONACULAR_API_KEY;
const BASE_URL = "https://api.spoonacular.com/recipes/complexSearch";

// Cuisine labels the user picks -> Spoonacular's official cuisine value(s).
const CUISINE_MAP = {
  Mexican: ["Mexican"],
  "Soul Food": ["Southern", "African", "Cajun"],
  Chinese: ["Chinese"],
  Korean: ["Korean"],
  Italian: ["Italian"],
  Indian: ["Indian"],
  Thai: ["Thai"],
  Mediterranean: ["Mediterranean"],
};

// Diet labels the user picks -> Spoonacular's official diet enum value,
// or null if it needs special handling (Low-Carb, Mediterranean, None).
const DIET_MAP = {
  Keto: "ketogenic",
  Paleo: "paleo",
  Vegetarian: "vegetarian",
  Vegan: "vegan",
  "Gluten-Free": "gluten free",
  "Low-Carb": null,
  Mediterranean: null,
  None: null,
};

const LOW_CARB_MAX_CARBS_G = 20;

function buildCuisineParam(selectedCuisines, diet) {
  const expanded = new Set();
  selectedCuisines.forEach((c) => {
    (CUISINE_MAP[c] || []).forEach((v) => expanded.add(v));
  });
  if (diet === "Mediterranean") expanded.add("Mediterranean");
  return Array.from(expanded).join(",");
}

function normalizeRecipe(raw) {
  const ingredientNames = (raw.extendedIngredients || []).map((ing) => ing.name || ing.nameClean || "");
  return {
    id: raw.id,
    source: "spoonacular",
    title: raw.title,
    image: raw.image,
    readyInMinutes: raw.readyInMinutes,
    servings: raw.servings,
    sourceUrl: raw.sourceUrl,
    rankScore: raw.spoonacularScore || 0,
    ingredientNames,
    matchedProteins: [],
  };
}

async function runComplexSearch(params) {
  if (!SPOONACULAR_API_KEY) {
    throw new Error(
      "Spoonacular API key is missing. Add VITE_SPOONACULAR_API_KEY to your .env file."
    );
  }
  const url = new URL(BASE_URL);
  url.searchParams.set("apiKey", SPOONACULAR_API_KEY);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== "") {
      url.searchParams.set(key, value);
    }
  });

  const res = await fetch(url.toString());
  if (!res.ok) {
    if (res.status === 402) {
      throw new Error(
        "Spoonacular's daily free-tier quota has been used up. Try again tomorrow, or upgrade your plan."
      );
    }
    throw new Error(`Spoonacular request failed (${res.status}).`);
  }
  const data = await res.json();
  return data.results || [];
}

/**
 * Search for recipes matching the selected proteins/cuts (OR), cuisines
 * (OR), diet, and time budget, then rank by how much of the recipe's
 * ingredient list is already in the pantry.
 *
 * @param {Object} opts
 * @param {string[]} opts.proteins - 0-2 selected protein/cut strings
 *   (e.g. "Chicken Breast"), already resolved by the caller
 * @param {string[]} opts.cuisines - 0-2 selected cuisines
 * @param {string} opts.diet - one of DIETS
 * @param {number} opts.timeBucketIndex - index into TIME_BUCKETS
 * @param {Array} opts.pantryItems - current pantry items (for ranking)
 * @param {boolean} opts.isDessert - search desserts instead of savory
 *   recipes (type=dessert); protein selection is ignored when true
 * @param {boolean} opts.kidFriendly - append "kid friendly" to the
 *   free-text search query (see note at top of file — approximation,
 *   not a real filter)
 * @param {boolean} opts.preferHealthy - sort by Spoonacular's
 *   "healthiness" score instead of randomizing results
 */
export async function searchSpoonacular({
  proteins,
  cuisines,
  diet,
  timeBucketIndex,
  pantryItems,
  isDessert = false,
  kidFriendly = false,
  preferHealthy = false,
}) {
  const cuisineParam = buildCuisineParam(cuisines, diet);
  const dietParam = DIET_MAP[diet] || null;
  const maxCarbs = diet === "Low-Carb" ? LOW_CARB_MAX_CARBS_G : null;
  const maxReadyTime = TIME_BUCKETS[timeBucketIndex]?.maxReadyTime ?? null;
  const effectiveProteins = isDessert ? [] : proteins;

  // Prefer-healthy uses a deterministic health-ranked sort; otherwise
  // every search is randomized via Spoonacular's own sort=random, which
  // shuffles which recipes come back without needing an offset (an
  // offset was tried here originally and caused empty results on narrow
  // filter combos with small result pools — removed).
  const sortParams = preferHealthy ? { sort: "healthiness" } : { sort: "random" };

  const sharedParams = {
    cuisine: cuisineParam,
    diet: dietParam,
    maxCarbs,
    maxReadyTime,
    type: isDessert ? "dessert" : null,
    query: kidFriendly ? "kid friendly" : null,
    addRecipeInformation: true,
    fillIngredients: true,
    instructionsRequired: true,
    ...sortParams,
  };

  const byId = new Map();

  if (effectiveProteins.length === 0) {
    const results = await runComplexSearch({ ...sharedParams, number: 12 });
    results.forEach((r) => {
      const normalized = normalizeRecipe(r);
      byId.set(normalized.id, normalized);
    });
  } else {
    // 2 proteins -> OR semantics via 2 separate calls (Spoonacular's
    // includeIngredients is AND, so this is required, not optional).
    const numberPerCall = effectiveProteins.length === 2 ? 6 : 10;
    for (const protein of effectiveProteins) {
      const results = await runComplexSearch({
        ...sharedParams,
        includeIngredients: protein,
        number: numberPerCall,
      });
      results.forEach((r) => {
        const normalized = normalizeRecipe(r);
        if (byId.has(normalized.id)) {
          byId.get(normalized.id).matchedProteins.push(protein);
        } else {
          normalized.matchedProteins.push(protein);
          byId.set(normalized.id, normalized);
        }
      });
    }
  }

  return Array.from(byId.values()).map((recipe) => ({
    ...recipe,
    pantryMatch: scorePantryMatch(recipe.ingredientNames, pantryItems),
  }));
}
