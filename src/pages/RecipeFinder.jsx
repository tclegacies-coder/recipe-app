import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { usePantry } from "../hooks/usePantry";
import { useSavedRecipes } from "../hooks/useSavedRecipes";
import {
  PROTEINS,
  PROTEIN_CUTS,
  CUISINES,
  DIETS,
  TIME_BUCKETS,
  RECIPE_SOURCES,
} from "../lib/recipeOptions";
import { searchRecipes } from "../lib/recipeSearch";
import RecipeCard from "../components/RecipeCard";
import "./RecipeFinder.css";

function toggleProtein(selected, protein, max) {
  const exists = selected.find((p) => p.protein === protein);
  if (exists) return selected.filter((p) => p.protein !== protein);
  if (selected.length >= max) return selected;
  const defaultCut = PROTEIN_CUTS[protein][0];
  return [...selected, { protein, cutValue: defaultCut.value, cutLabel: defaultCut.label }];
}

function toggleInList(list, value, max) {
  if (list.includes(value)) return list.filter((v) => v !== value);
  if (list.length >= max) return list;
  return [...list, value];
}

export default function RecipeFinder() {
  const { session } = useAuth();
  const userId = session?.user?.id;
  const { items: pantryItems } = usePantry(userId);
  const { isSaved, toggleSave } = useSavedRecipes(userId);

  const [isDessert, setIsDessert] = useState(false);
  const [source, setSource] = useState("both");
  const [selectedProteins, setSelectedProteins] = useState([]); // [{protein, cutValue, cutLabel}]
  const [cuisines, setCuisines] = useState([]);
  const [timeBucketIndex, setTimeBucketIndex] = useState(null);
  const [diet, setDiet] = useState("None");
  const [kidFriendly, setKidFriendly] = useState(false);
  const [preferHealthy, setPreferHealthy] = useState(false);

  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);

  const canSearch = timeBucketIndex !== null;

  const handleCutChange = (protein, cutValue) => {
    setSelectedProteins((prev) =>
      prev.map((p) => {
        if (p.protein !== protein) return p;
        const cut = PROTEIN_CUTS[protein].find((c) => c.value === cutValue);
        return { ...p, cutValue: cut.value, cutLabel: cut.label };
      })
    );
  };

  const handleSearch = async () => {
    if (!canSearch) return;
    setSearching(true);
    setSearchError(null);
    try {
      const found = await searchRecipes({
        proteins: selectedProteins.map((p) => p.cutValue),
        cuisines,
        diet,
        timeBucketIndex,
        pantryItems,
        isDessert,
        kidFriendly,
        preferHealthy,
        source,
      });
      setResults(found);
    } catch (err) {
      setSearchError(err.message);
      setResults(null);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="finder-page">
      <header className="finder-header">
        <p className="finder-eyebrow">Larder</p>
        <h1>Find something to cook</h1>
      </header>

      <div className="finder-wizard">
        <section className="finder-step">
          <p className="finder-step-label">What are you looking for?</p>
          <div className="finder-chip-row">
            <button
              className={`finder-chip ${!isDessert ? "finder-chip-active" : ""}`}
              onClick={() => setIsDessert(false)}
            >
              Regular meal
            </button>
            <button
              className={`finder-chip ${isDessert ? "finder-chip-active" : ""}`}
              onClick={() => setIsDessert(true)}
            >
              Dessert
            </button>
          </div>
          {isDessert && (
            <p className="finder-hint">
              Dessert search skips protein selection and ranks by your pantry ingredients, same
              as a regular search.
            </p>
          )}
        </section>

        <section className="finder-step">
          <p className="finder-step-label">Recipe source</p>
          <div className="finder-chip-row">
            {RECIPE_SOURCES.map((s) => (
              <button
                key={s.value}
                className={`finder-chip ${source === s.value ? "finder-chip-active" : ""}`}
                onClick={() => setSource(s.value)}
              >
                {s.label}
              </button>
            ))}
          </div>
          <p className="finder-hint">
            {source === "both"
              ? "Searches both databases and merges results — the best way to avoid a too-narrow result set."
              : `Only searching ${RECIPE_SOURCES.find((s) => s.value === source)?.label}. Switch to "Both" if a search comes back sparse.`}
          </p>
        </section>

        {!isDessert && (
          <section className="finder-step">
            <p className="finder-step-label">1. Protein (up to 2)</p>
            <div className="finder-chip-row">
              {PROTEINS.map((p) => (
                <button
                  key={p}
                  className={`finder-chip ${
                    selectedProteins.some((sp) => sp.protein === p) ? "finder-chip-active" : ""
                  }`}
                  onClick={() => setSelectedProteins((prev) => toggleProtein(prev, p, 2))}
                >
                  {p}
                </button>
              ))}
            </div>
            {selectedProteins.length > 0 && (
              <div className="finder-cut-row">
                {selectedProteins.map((sp) => (
                  <label key={sp.protein} className="finder-cut-select">
                    {sp.protein} cut
                    <select
                      value={sp.cutValue}
                      onChange={(e) => handleCutChange(sp.protein, e.target.value)}
                    >
                      {PROTEIN_CUTS[sp.protein].map((cut) => (
                        <option key={cut.value} value={cut.value}>
                          {cut.label}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
            )}
          </section>
        )}

        <section className="finder-step">
          <p className="finder-step-label">2. Cuisine (up to 2)</p>
          <div className="finder-chip-row">
            {CUISINES.map((c) => (
              <button
                key={c}
                className={`finder-chip ${cuisines.includes(c) ? "finder-chip-active" : ""}`}
                onClick={() => setCuisines((prev) => toggleInList(prev, c, 2))}
              >
                {c}
              </button>
            ))}
          </div>
        </section>

        <section className="finder-step">
          <p className="finder-step-label">3. How much time do you have?</p>
          <div className="finder-chip-row">
            {TIME_BUCKETS.map((bucket, i) => (
              <button
                key={bucket.label}
                className={`finder-chip ${timeBucketIndex === i ? "finder-chip-active" : ""}`}
                onClick={() => setTimeBucketIndex(i)}
              >
                {bucket.label}
              </button>
            ))}
          </div>
        </section>

        <section className="finder-step">
          <p className="finder-step-label">4. Following a specific diet?</p>
          <div className="finder-chip-row">
            {DIETS.map((d) => (
              <button
                key={d}
                className={`finder-chip ${diet === d ? "finder-chip-active" : ""}`}
                onClick={() => setDiet(d)}
              >
                {d}
              </button>
            ))}
          </div>
        </section>

        <section className="finder-step">
          <p className="finder-step-label">5. Extra filters</p>
          <div className="finder-toggle-row">
            <label className="finder-toggle">
              <input
                type="checkbox"
                checked={kidFriendly}
                onChange={(e) => setKidFriendly(e.target.checked)}
              />
              Kid-friendly
            </label>
            <label className="finder-toggle">
              <input
                type="checkbox"
                checked={preferHealthy}
                onChange={(e) => setPreferHealthy(e.target.checked)}
              />
              Prioritize healthier recipes
            </label>
          </div>
          <p className="finder-hint">
            {kidFriendly &&
              "Kid-friendly isn't a real filter in either recipe database — this searches for recipes titled or tagged that way, so results can be hit or miss. "}
            {preferHealthy &&
              (source === "edamam"
                ? "Note: Edamam has no health-score sort, so this toggle has no effect when Edamam is the only source selected."
                : "With this on, Spoonacular results are ranked by health score instead of being freshly randomized each search (Edamam has no equivalent sort, so its results are unaffected).")}
          </p>
        </section>

        <button
          className="btn-primary finder-search-btn"
          onClick={handleSearch}
          disabled={!canSearch || searching}
        >
          {searching ? "Searching…" : "Find recipes"}
        </button>
        {!canSearch && (
          <p className="finder-hint">Pick how much time you have to enable search.</p>
        )}
        {canSearch && !preferHealthy && (
          <p className="finder-hint">
            Results are randomized — search again with the same filters for a different set.
          </p>
        )}
      </div>

      {searchError && <p className="finder-error">{searchError}</p>}

      {results && (
        <div className="finder-results">
          <h2 className="finder-results-heading">
            {results.length} recipe{results.length === 1 ? "" : "s"} found
          </h2>
          {results.length === 0 ? (
            <p className="finder-empty">
              No recipes matched. Try loosening a filter — fewer proteins/cuisines, a broader cut
              of meat, or a longer time budget.
            </p>
          ) : (
            <div className="finder-grid">
              {results.map((recipe) => (
                <RecipeCard
                  key={`${recipe.source}-${recipe.id}`}
                  recipe={recipe}
                  isSaved={isSaved(recipe)}
                  onToggleSave={toggleSave}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
