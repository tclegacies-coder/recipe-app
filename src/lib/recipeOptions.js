// ============================================================
// Shared recipe search options — the fixed lists the wizard UI
// shows, independent of which recipe API(s) are queried. Each
// API module (spoonacular.js, edamam.js) maps these onto its own
// parameter values.
// ============================================================

// Cut-of-meat refinement per protein. The first entry in each list is
// the protein name itself ("any cut"). This is a text match against
// each API's ingredient/search data, not a guaranteed structured "cut"
// tag — common phrasing is used, but an unusual cut name may return
// fewer results than a broader one.
export const PROTEIN_CUTS = {
  Chicken: [
    { label: "Any cut", value: "Chicken" },
    { label: "Chicken Breast", value: "Chicken Breast" },
    { label: "Chicken Thigh", value: "Chicken Thigh" },
    { label: "Chicken Wing", value: "Chicken Wing" },
    { label: "Chicken Drumstick", value: "Chicken Drumstick" },
    { label: "Ground Chicken", value: "Ground Chicken" },
  ],
  Beef: [
    { label: "Any cut", value: "Beef" },
    { label: "Ground Beef", value: "Ground Beef" },
    { label: "Beef Steak", value: "Beef Steak" },
    { label: "Beef Ribeye", value: "Beef Ribeye" },
    { label: "Beef Sirloin", value: "Beef Sirloin" },
    { label: "Beef Roast", value: "Beef Roast" },
    { label: "Beef Brisket", value: "Beef Brisket" },
  ],
  Pork: [
    { label: "Any cut", value: "Pork" },
    { label: "Pork Chop", value: "Pork Chop" },
    { label: "Pork Tenderloin", value: "Pork Tenderloin" },
    { label: "Ground Pork", value: "Ground Pork" },
    { label: "Pork Ribs", value: "Pork Ribs" },
    { label: "Pork Shoulder", value: "Pork Shoulder" },
  ],
  Fish: [
    { label: "Any fish", value: "Fish" },
    { label: "Salmon", value: "Salmon" },
    { label: "Tilapia", value: "Tilapia" },
    { label: "Cod", value: "Cod" },
    { label: "Halibut", value: "Halibut" },
    { label: "Tuna", value: "Tuna" },
  ],
  Shrimp: [{ label: "Shrimp", value: "Shrimp" }],
  Tofu: [{ label: "Tofu", value: "Tofu" }],
  Eggs: [{ label: "Eggs", value: "Eggs" }],
  Beans: [{ label: "Beans", value: "Beans" }],
};

export const PROTEINS = Object.keys(PROTEIN_CUTS);

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

export const RECIPE_SOURCES = [
  { value: "spoonacular", label: "Spoonacular" },
  { value: "edamam", label: "Edamam" },
  { value: "both", label: "Both (more results)" },
];
