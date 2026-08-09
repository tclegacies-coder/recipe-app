// ============================================================
// Edamam recipe search (Recipe Search API v2)
//
// Confirmed against Edamam's own documentation before building
// (not guessed) — developer.edamam.com/edamam-docs-recipe-api:
// - Base endpoint requires type=public as a required query param
//   (Edamam's own "type" concept — unrelated to our dessert/meal
//   type toggle, which uses their separate dishType param)
// - Auth: app_id + app_key as query params, PLUS a required
//   "Edamam-Account-User" request header identifying the account
// - cuisineType, dishType, mealType: confirmed enum value lists
// - diet: low-carb IS a native diet label here (unlike Spoonacular,
//   which has no such value)
// - health: keto-friendly, paleo, vegetarian, vegan, gluten-free,
//   and — notably — "Mediterranean" are all native health labels
//   here (Spoonacular only has Mediterranean as a cuisine)
// - No "Soul Food" equivalent in Edamam's cuisineType list either —
//   closest available is "american" (broader, imperfect)
// - "Thai" isn't its own cuisineType value — mapped to the broader
//   "south east asian"
// - No native health-score sort like Spoonacular's — the
//   "prioritize healthier" toggle has no effect on Edamam results;
//   only Spoonacular results get reordered by it
// - "random" is a real documented parameter for shuffling results
// - There is NO "kid friendly" filter here either — same free-text
//   query approximation as Spoonacular
// ============================================================

import { TIME_BUCKETS } from "./recipeOptions";
import { scorePantryMatch } from "./recipeUtils";

const EDAMAM_APP_ID = import.meta.env.VITE_EDAMAM_APP_ID;
const EDAMAM_APP_KEY = import.meta.env.VITE_EDAMAM_APP_KEY;
// This must be your actual Edamam account username (from your Edamam
// dashboard profile) — NOT your app ID. An earlier version of this file
// defaulted to the app ID when this was left blank, which is a plausible
// cause of 401/403 rejections, since that's not a valid account
// identifier. No fallback now — better to fail clearly than send a
// value likely to be wrong.
const EDAMAM_ACCOUNT_USER = import.meta.env.VITE_EDAMAM_ACCOUNT_USER;
const BASE_URL = "https://api.edamam.com/api/recipes/v2";

const CUISINE_MAP = {
  Mexican: "mexican",
  "Soul Food": "american",
  Chinese: "chinese",
  Korean: "korean",
  Italian: "italian",
  Indian: "indian",
  Thai: "south east asian",
  Mediterranean: "mediterranean",
};

// Diet labels the user picks -> { diet, health } Edamam parameter,
// whichever applies. Edamam splits "diet" (nutrient-ratio-based) from
// "health" (ingredient-based) labels, unlike Spoonacular's single enum.
const DIET_MAP = {
  Keto: { health: "keto-friendly" },
  Paleo: { health: "paleo" },
  Vegetarian: { health: "vegetarian" },
  Vegan: { health: "vegan" },
  "Gluten-Free": { health: "gluten-free" },
  "Low-Carb": { diet: "low-carb" },
  Mediterranean: { health: "Mediterranean" },
  None: {},
};

function buildTimeParam(timeBucketIndex) {
  const bucket = TIME_BUCKETS[timeBucketIndex];
  if (!bucket || bucket.maxReadyTime == null) return null;
  return `1-${bucket.maxReadyTime}`;
}

function normalizeRecipe(hit) {
  const recipe = hit.recipe;
  const ingredientNames = (recipe.ingredients || []).map((i) => i.food || i.text || "");
  return {
    id: recipe.uri,
    source: "edamam",
    title: recipe.label,
    image: recipe.image,
    readyInMinutes: recipe.totalTime || null,
    servings: recipe.yield || null,
    sourceUrl: recipe.url,
    rankScore: 0,
    ingredientNames,
    matchedProteins: [],
  };
}

async function runRecipeSearch(params) {
  if (!EDAMAM_APP_ID || !EDAMAM_APP_KEY) {
    throw new Error(
      "Edamam API credentials are missing. Add VITE_EDAMAM_APP_ID and VITE_EDAMAM_APP_KEY to your .env file."
    );
  }
  if (!EDAMAM_ACCOUNT_USER) {
    throw new Error(
      "VITE_EDAMAM_ACCOUNT_USER is missing. Set it to your actual Edamam account username (from your Edamam dashboard) — not your app ID."
    );
  }
  const url = new URL(BASE_URL);
  url.searchParams.set("type", "public");
  url.searchParams.set("app_id", EDAMAM_APP_ID);
  url.searchParams.set("app_key", EDAMAM_APP_KEY);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== "") {
      url.searchParams.set(key, value);
    }
  });

  const res = await fetch(url.toString(), {
    headers: { "Edamam-Account-User": EDAMAM_ACCOUNT_USER },
  });
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      throw new Error(
        "Edamam rejected the request. Check that: (1) your app ID/key are from the Recipe Search API application specifically, not a different Edamam product, (2) VITE_EDAMAM_ACCOUNT_USER is your actual Edamam account username, not your app ID, and (3) your Edamam plan is confirmed active."
      );
    }
    if (res.status === 429) {
      throw new Error("Edamam's rate limit was hit. Wait a moment and try again.");
    }
    throw new Error(`Edamam request failed (${res.status}).`);
  }
  const data = await res.json();
  return data.hits || [];
}

/**
 * Search Edamam for recipes. Same option shape as searchSpoonacular
 * so the caller can query either or both sources interchangeably.
 */
export async function searchEdamam({
  proteins,
  cuisines,
  diet,
  timeBucketIndex,
  pantryItems,
  isDessert = false,
  kidFriendly = false,
}) {
  const cuisineTypes = cuisines.map((c) => CUISINE_MAP[c]).filter(Boolean);
  const dietMapping = DIET_MAP[diet] || {};
  const time = buildTimeParam(timeBucketIndex);
  const effectiveProteins = isDessert ? [] : proteins;

  const sharedParams = {
    cuisineType: cuisineTypes.join(","),
    diet: dietMapping.diet || null,
    health: dietMapping.health || null,
    dishType: isDessert ? "desserts" : null,
    time,
    random: "true",
    q: kidFriendly ? "kid friendly" : null,
  };

  const byId = new Map();

  if (effectiveProteins.length === 0) {
    const hits = await runRecipeSearch(sharedParams);
    hits.forEach((h) => {
      const normalized = normalizeRecipe(h);
      byId.set(normalized.id, normalized);
    });
  } else {
    // Edamam's q is free-text search rather than a structured
    // ingredient AND-filter, but querying separately per protein/cut
    // and merging keeps behavior consistent with the Spoonacular path
    // (and lets us track which protein each hit matched).
    for (const protein of effectiveProteins) {
      const q = kidFriendly ? `${protein} kid friendly` : protein;
      const hits = await runRecipeSearch({ ...sharedParams, q });
      hits.forEach((h) => {
        const normalized = normalizeRecipe(h);
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
