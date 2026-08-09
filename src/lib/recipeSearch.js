import { searchSpoonacular } from "./spoonacular";
import { searchEdamam } from "./edamam";

/**
 * Searches one or both recipe sources and returns a merged, ranked list.
 * Each recipe keeps its own `source` field ('spoonacular' | 'edamam') so
 * the UI can show where it came from.
 *
 * @param {Object} opts - same shape as searchSpoonacular/searchEdamam,
 *   plus:
 * @param {string} opts.source - 'spoonacular' | 'edamam' | 'both'
 */
export async function searchRecipes({ source, preferHealthy, ...rest }) {
  const wantSpoonacular = source === "spoonacular" || source === "both";
  const wantEdamam = source === "edamam" || source === "both";

  const calls = [];
  if (wantSpoonacular) {
    calls.push(searchSpoonacular({ ...rest, preferHealthy }));
  }
  if (wantEdamam) {
    // preferHealthy has no Edamam equivalent (see edamam.js notes) —
    // not passed through, Edamam results are unaffected by it.
    calls.push(searchEdamam(rest));
  }

  const settled = await Promise.allSettled(calls);

  const results = [];
  const errors = [];
  settled.forEach((outcome) => {
    if (outcome.status === "fulfilled") {
      results.push(...outcome.value);
    } else {
      errors.push(outcome.reason?.message || String(outcome.reason));
    }
  });

  // Only throw if every requested source failed — if one of two
  // sources fails when "both" is selected, still show what succeeded.
  if (results.length === 0 && errors.length > 0) {
    throw new Error(errors.join(" "));
  }

  // Prioritize-healthy only reorders Spoonacular results (see above),
  // so when both sources are active the health-ranked Spoonacular
  // results are kept first, followed by Edamam's pantry-ranked results.
  if (preferHealthy) {
    return results;
  }

  return results.sort((a, b) => {
    if (b.pantryMatch.matchedCount !== a.pantryMatch.matchedCount) {
      return b.pantryMatch.matchedCount - a.pantryMatch.matchedCount;
    }
    return (b.rankScore || 0) - (a.rankScore || 0);
  });
}
