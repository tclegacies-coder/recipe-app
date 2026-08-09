import "./RecipeCard.css";

export default function RecipeCard({ recipe, isSaved, onToggleSave }) {
  const { matchedCount, totalCount, missingCount } = recipe.pantryMatch;

  return (
    <div className="recipe-card">
      {recipe.image && (
        <div className="recipe-card-image-wrap">
          <img src={recipe.image} alt="" className="recipe-card-image" />
          <button
            className={`recipe-save-btn ${isSaved ? "recipe-save-btn-active" : ""}`}
            onClick={() => onToggleSave(recipe)}
            aria-label={isSaved ? "Remove from saved recipes" : "Save recipe"}
          >
            {isSaved ? "★" : "☆"}
          </button>
        </div>
      )}
      <div className="recipe-card-body">
        <h3 className="recipe-card-title">{recipe.title}</h3>

        <div className="recipe-card-meta">
          <span className="recipe-tag recipe-tag-source">
            {recipe.source === "edamam" ? "Edamam" : "Spoonacular"}
          </span>
          {recipe.readyInMinutes != null && (
            <span className="recipe-tag">{recipe.readyInMinutes} min</span>
          )}
          {recipe.matchedProteins.map((p) => (
            <span key={p} className="recipe-tag recipe-tag-protein">
              {p}
            </span>
          ))}
        </div>

        {totalCount > 0 && (
          <div className="recipe-pantry-match">
            <div className="recipe-pantry-match-bar">
              <div
                className="recipe-pantry-match-fill"
                style={{ width: `${Math.round((matchedCount / totalCount) * 100)}%` }}
              />
            </div>
            <p className="recipe-pantry-match-label">
              Uses {matchedCount} of {totalCount} ingredients from your pantry
              {missingCount > 0 && ` — ${missingCount} to buy`}
            </p>
          </div>
        )}

        <a
          className="recipe-card-link"
          href={recipe.sourceUrl}
          target="_blank"
          rel="noreferrer"
        >
          View full recipe →
        </a>
      </div>
    </div>
  );
}
