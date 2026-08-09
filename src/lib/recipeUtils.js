// Shared by spoonacular.js and edamam.js — scores how many of a
// recipe's ingredients are already in the pantry, given each API's
// ingredient list normalized to a flat array of name strings.
export function scorePantryMatch(ingredientNames, pantryItems) {
  const pantryNames = (pantryItems || []).map((p) => (p.name || "").toLowerCase());
  let matched = 0;
  ingredientNames.forEach((rawName) => {
    const ingName = (rawName || "").toLowerCase();
    if (!ingName) return;
    const isMatch = pantryNames.some(
      (pn) => pn && (ingName.includes(pn) || pn.includes(ingName))
    );
    if (isMatch) matched += 1;
  });
  return {
    matchedCount: matched,
    totalCount: ingredientNames.length,
    missingCount: Math.max(0, ingredientNames.length - matched),
  };
}
