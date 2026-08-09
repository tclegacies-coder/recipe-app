import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { usePantry } from "../hooks/usePantry";
import { useSavedRecipes } from "../hooks/useSavedRecipes";
import { searchRecipes, PROTEINS, CUISINES, DIETS, TIME_BUCKETS } from "../lib/spoonacular";
import RecipeCard from "../components/RecipeCard";
import "./RecipeFinder.css";

function toggleInList(list, value, max) {
  if (list.includes(value)) return list.filter((v) => v !== value);
  if (list.length >= max) return list;
  return [...list, value];
}

export default function RecipeFinder() {
  const { session } = useAuth();
  const userId = session?.user?.id;
  const { items: pantryItems } = usePantry(userId);
  const { savedIds, toggleSave } = useSavedRecipes(userId);

  const [proteins, setProteins] = useState([]);
  const [cuisines, setCuisines] = useState([]);
  const [timeBucketIndex, setTimeBucketIndex] = useState(null);
  const [diet, setDiet] = useState("None");

  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);

  const canSearch = timeBucketIndex !== null;

  const handleSearch = async () => {
    if (!canSearch) return;
    setSearching(true);
    setSearchError(null);
    try {
      const found = await searchRecipes({
        proteins,
        cuisines,
        diet,
        timeBucketIndex,
        pantryItems,
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
          <p className="finder-step-label">1. Protein (up to 2)</p>
          <div className="finder-chip-row">
            {PROTEINS.map((p) => (
              <button
                key={p}
                className={`finder-chip ${proteins.includes(p) ? "finder-chip-active" : ""}`}
                onClick={() => setProteins((prev) => toggleInList(prev, p, 2))}
              >
                {p}
              </button>
            ))}
          </div>
        </section>

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
      </div>

      {searchError && <p className="finder-error">{searchError}</p>}

      {results && (
        <div className="finder-results">
          <h2 className="finder-results-heading">
            {results.length} recipe{results.length === 1 ? "" : "s"} found
          </h2>
          {results.length === 0 ? (
            <p className="finder-empty">
              No recipes matched. Try loosening a filter — fewer proteins/cuisines, or a longer
              time budget.
            </p>
          ) : (
            <div className="finder-grid">
              {results.map((recipe) => (
                <RecipeCard
                  key={recipe.id}
                  recipe={recipe}
                  isSaved={savedIds.has(recipe.id)}
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
