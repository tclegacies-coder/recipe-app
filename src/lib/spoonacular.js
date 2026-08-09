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
// ============================================================

const SPOONACULAR_API_KEY = import.meta.env.VITE_SPOONACULAR_API_KEY;
const BASE_URL = "https://api.spoonacular.com/recipes/complexSearch";

export const PROTEINS = ["Chicken", "Beef", "Pork", "Fish", "Shrimp", "Tofu", "Eggs", "Beans"];

export const CUISINES = [
  "Mexican",
  "Soul Food",
  "Chinese",
  "Korean",
  "Italian",
  "Indian",
  "Thai",
  "Mediterranean",
];

export const DIETS = [
  "None",
  "Keto",
  "Paleo",
  "Vegetarian",
  "Vegan",
  "Gluten-Free",
  "Low-Carb",
  "Mediterranean",
];

export const TIME_BUCKETS = [
  { label: "Under 15 min", maxReadyTime: 15 },
  { label: "15-30 min", maxReadyTime: 30 },
  { label: "30-60 min", maxReadyTime: 60 },
  { label: "60+ min", maxReadyTime: null },
];

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
  return {
    id: raw.id,
    title: raw.title,
    image: raw.image,
    readyInMinutes: raw.readyInMinutes,
    servings: raw.servings,
    sourceUrl: raw.sourceUrl,
    spoonacularScore: raw.spoonacularScore,
    extendedIngredients: raw.extendedIngredients || [],
    matchedProteins: [],
  };
}

function scorePantryMatch(recipe, pantryItems) {
  const pantryNames = pantryItems.map((p) => (p.name || "").toLowerCase());
  const ingredients = recipe.extendedIngredients || [];
  let matched = 0;
  ingredients.forEach((ing) => {
    const ingName = (ing.name || ing.nameClean || "").toLowerCase();
    if (!ingName) return;
    const isMatch = pantryNames.some(
      (pn) => pn && (ingName.includes(pn) || pn.includes(ingName))
    );
    if (isMatch) matched += 1;
  });
  return {
    matchedCount: matched,
    totalCount: ingredients.length,
    missingCount: Math.max(0, ingredients.length - matched),
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
 * Search for recipes matching the selected proteins (OR), cuisines (OR),
 * diet, and time budget, then rank by how much of the recipe's
 * ingredient list is already in the pantry.
 *
 * @param {Object} opts
 * @param {string[]} opts.proteins - 0-2 selected proteins
 * @param {string[]} opts.cuisines - 0-2 selected cuisines
 * @param {string} opts.diet - one of DIETS
 * @param {number} opts.timeBucketIndex - index into TIME_BUCKETS
 * @param {Array} opts.pantryItems - current pantry items (for ranking)
 */
export async function searchRecipes({ proteins, cuisines, diet, timeBucketIndex, pantryItems }) {
  const cuisineParam = buildCuisineParam(cuisines, diet);
  const dietParam = DIET_MAP[diet] || null;
  const maxCarbs = diet === "Low-Carb" ? LOW_CARB_MAX_CARBS_G : null;
  const maxReadyTime = TIME_BUCKETS[timeBucketIndex]?.maxReadyTime ?? null;

  const sharedParams = {
    cuisine: cuisineParam,
    diet: dietParam,
    maxCarbs,
    maxReadyTime,
    addRecipeInformation: true,
    fillIngredients: true,
    instructionsRequired: true,
  };

  const byId = new Map();

  if (proteins.length === 0) {
    const results = await runComplexSearch({ ...sharedParams, number: 12 });
    results.forEach((r) => {
      const normalized = normalizeRecipe(r);
      byId.set(normalized.id, normalized);
    });
  } else {
    // 2 proteins -> OR semantics via 2 separate calls (Spoonacular's
    // includeIngredients is AND, so this is required, not optional).
    const numberPerCall = proteins.length === 2 ? 6 : 10;
    for (const protein of proteins) {
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

  const merged = Array.from(byId.values()).map((recipe) => ({
    ...recipe,
    pantryMatch: scorePantryMatch(recipe, pantryItems || []),
  }));

  merged.sort((a, b) => {
    if (b.pantryMatch.matchedCount !== a.pantryMatch.matchedCount) {
      return b.pantryMatch.matchedCount - a.pantryMatch.matchedCount;
    }
    return (b.spoonacularScore || 0) - (a.spoonacularScore || 0);
  });

  return merged;
}
