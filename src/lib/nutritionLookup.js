// ============================================================
// Nutrient lookup chain: Calorie API -> Open Food Facts -> USDA
//
// Calorie API replaced Nutritionix as the primary source because
// Nutritionix discontinued its public free tier entirely (confirmed
// on developer.nutritionix.com — it's enterprise-only pricing now).
// Calorie API offers a 1,000 requests/month free tier, no card
// required, and its barcode endpoint already falls back to Open
// Food Facts internally — see note below on what that means for
// our own OFF fallback layer.
//
// Endpoints and response shapes below are taken directly from
// Calorie API's own docs (calorieapi.com/docs/food-search and
// /docs/barcode-lookup), not guessed:
//   Base URL: https://calorieapiadmin.com/api/v1
//   GET /search/barcode/{upc} -> { product, serving, nutrition_per_100g, ... }
//   GET /search/foods?q=...   -> { data: [{ id, name, brand, calories,
//                                            protein, carbs, fat }], ... }
// Note: the /search/foods response does NOT include fiber, sugar, or
// sodium — only calories/protein/carbs/fat. Those fields are left
// null for name-search results from Calorie API; the barcode endpoint
// does return them.
//
// IMPORTANT NOTE ON USDA + BARCODES (unchanged from before):
// USDA FoodData Central has NO barcode/UPC lookup endpoint at all —
// only search-by-name. So it remains a name-search-only fallback.
//
// NOTE ON THE OPEN FOOD FACTS FALLBACK LAYER:
// Calorie API's own barcode endpoint already checks Open Food Facts
// internally before returning a 404. So our separate direct-OFF call
// below is mainly a safety net for when Calorie API itself is down,
// erroring, or quota-exhausted — not a second data source for
// barcodes Calorie API has already failed to resolve.
// ============================================================

const CALORIE_API_KEY = import.meta.env.VITE_CALORIE_API_KEY;
const CALORIE_API_BASE = "https://calorieapiadmin.com/api/v1";
const USDA_API_KEY = import.meta.env.VITE_USDA_API_KEY;

/**
 * Normalized ingredient shape returned by every lookup function:
 * {
 *   name, brand, source ('calorieapi' | 'openfoodfacts' | 'usda'),
 *   servingQty, servingUnit,
 *   calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg,
 *   raw // original API payload, kept for debugging
 * }
 */

async function lookupCalorieApiByUPC(barcode) {
  if (!CALORIE_API_KEY) return null;
  try {
    const res = await fetch(`${CALORIE_API_BASE}/search/barcode/${encodeURIComponent(barcode)}`, {
      headers: { "X-API-Key": CALORIE_API_KEY },
    });
    if (res.status === 404) return null;
    if (!res.ok) {
      console.warn(`Calorie API barcode lookup returned ${res.status}`);
      return null;
    }
    const data = await res.json();
    const n = data.nutrition_per_100g || {};
    return {
      name: data.product?.name || "Unknown item",
      brand: data.product?.brand || "",
      source: "calorieapi",
      servingQty: data.serving?.quantity ?? 100,
      servingUnit: data.serving?.unit ?? "g",
      calories: n.energy_kcal ?? null,
      protein_g: n.protein_g ?? null,
      carbs_g: n.carbohydrates_g ?? null,
      fat_g: n.fat_g ?? null,
      fiber_g: n.fiber_g ?? null,
      sugar_g: n.sugars_g ?? null,
      sodium_mg: n.sodium_g != null ? n.sodium_g * 1000 : null,
      raw: data,
    };
  } catch (err) {
    console.warn("Calorie API barcode lookup failed:", err);
    return null;
  }
}

async function lookupCalorieApiByName(query) {
  if (!CALORIE_API_KEY) return null;
  try {
    const res = await fetch(
      `${CALORIE_API_BASE}/search/foods?q=${encodeURIComponent(query)}&limit=1&verified_only=true`,
      { headers: { "X-API-Key": CALORIE_API_KEY } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const food = data.data?.[0];
    if (!food) return null;
    return {
      name: food.name,
      brand: food.brand || "",
      source: "calorieapi",
      servingQty: 100,
      servingUnit: "g",
      calories: food.calories ?? null,
      protein_g: food.protein ?? null,
      carbs_g: food.carbs ?? null,
      fat_g: food.fat ?? null,
      // Not returned by the /search/foods endpoint — only barcode
      // lookups include these.
      fiber_g: null,
      sugar_g: null,
      sodium_mg: null,
      raw: food,
    };
  } catch (err) {
    console.warn("Calorie API name search failed:", err);
    return null;
  }
}

async function lookupOpenFoodFactsByUPC(barcode) {
  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json`
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status !== 1 || !data.product) return null;
    const p = data.product;
    const n = p.nutriments || {};
    return {
      name: p.product_name || p.generic_name || "Unknown item",
      brand: p.brands || "",
      source: "openfoodfacts",
      servingQty: 100,
      servingUnit: "g",
      calories: n["energy-kcal_100g"] ?? null,
      protein_g: n["proteins_100g"] ?? null,
      carbs_g: n["carbohydrates_100g"] ?? null,
      fat_g: n["fat_100g"] ?? null,
      fiber_g: n["fiber_100g"] ?? null,
      sugar_g: n["sugars_100g"] ?? null,
      sodium_mg: n["sodium_100g"] != null ? n["sodium_100g"] * 1000 : null,
      raw: p,
    };
  } catch (err) {
    console.warn("Open Food Facts lookup failed:", err);
    return null;
  }
}

async function lookupOpenFoodFactsByName(query) {
  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(
        query
      )}&search_simple=1&action=process&json=1&page_size=1`
    );
    if (!res.ok) return null;
    const data = await res.json();
    const p = data?.products?.[0];
    if (!p) return null;
    const n = p.nutriments || {};
    return {
      name: p.product_name || query,
      brand: p.brands || "",
      source: "openfoodfacts",
      servingQty: 100,
      servingUnit: "g",
      calories: n["energy-kcal_100g"] ?? null,
      protein_g: n["proteins_100g"] ?? null,
      carbs_g: n["carbohydrates_100g"] ?? null,
      fat_g: n["fat_100g"] ?? null,
      fiber_g: n["fiber_100g"] ?? null,
      sugar_g: n["sugars_100g"] ?? null,
      sodium_mg: n["sodium_100g"] != null ? n["sodium_100g"] * 1000 : null,
      raw: p,
    };
  } catch (err) {
    console.warn("Open Food Facts name search failed:", err);
    return null;
  }
}

async function lookupUSDAByName(query) {
  if (!USDA_API_KEY) return null;
  try {
    const res = await fetch(
      `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${USDA_API_KEY}&query=${encodeURIComponent(
        query
      )}&pageSize=1`
    );
    if (!res.ok) return null;
    const data = await res.json();
    const food = data?.foods?.[0];
    if (!food) return null;
    const getNutrient = (name) =>
      food.foodNutrients?.find((n) => n.nutrientName === name)?.value ?? null;
    return {
      name: food.description,
      brand: food.brandName || food.brandOwner || "",
      source: "usda",
      servingQty: 100,
      servingUnit: "g",
      calories: getNutrient("Energy"),
      protein_g: getNutrient("Protein"),
      carbs_g: getNutrient("Carbohydrate, by difference"),
      fat_g: getNutrient("Total lipid (fat)"),
      fiber_g: getNutrient("Fiber, total dietary"),
      sugar_g: getNutrient("Sugars, total including NLEA"),
      sodium_mg: getNutrient("Sodium, Na"),
      raw: food,
    };
  } catch (err) {
    console.warn("USDA lookup failed:", err);
    return null;
  }
}

/**
 * Barcode lookup chain: Calorie API -> Open Food Facts (direct fallback).
 * (USDA has no barcode endpoint — see note at top of file.)
 * Returns { result, triedSources } so the UI can show what was checked.
 */
export async function lookupByBarcode(barcode) {
  const triedSources = [];

  triedSources.push("calorieapi");
  const cal = await lookupCalorieApiByUPC(barcode);
  if (cal) return { result: cal, triedSources };

  triedSources.push("openfoodfacts");
  const off = await lookupOpenFoodFactsByUPC(barcode);
  if (off) return { result: off, triedSources };

  return { result: null, triedSources };
}

/**
 * Name-based lookup chain (manual entry): Calorie API -> Open Food Facts -> USDA.
 */
export async function lookupByName(query) {
  const triedSources = [];

  triedSources.push("calorieapi");
  const cal = await lookupCalorieApiByName(query);
  if (cal) return { result: cal, triedSources };

  triedSources.push("openfoodfacts");
  const off = await lookupOpenFoodFactsByName(query);
  if (off) return { result: off, triedSources };

  triedSources.push("usda");
  const usda = await lookupUSDAByName(query);
  if (usda) return { result: usda, triedSources };

  return { result: null, triedSources };
}
