import "./NutritionLabelCard.css";

const SOURCE_LABELS = {
  calorieapi: "Calorie API",
  openfoodfacts: "Open Food Facts",
  usda: "USDA FoodData Central",
  manual: "Entered manually",
};

function round(value, digits = 0) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return Number(value).toFixed(digits);
}

export default function NutritionLabelCard({ item, onQuantityChange, onEdit, onDelete }) {
  return (
    <div className="nlabel">
      <div className="nlabel-top">
        <div>
          <p className="nlabel-eyebrow">{item.brand || "Unbranded"}</p>
          <h3 className="nlabel-name">{item.name}</h3>
        </div>
        <div className="nlabel-qty">
          <div className="nlabel-qty-controls">
            <button
              className="nlabel-qty-btn"
              onClick={() => onQuantityChange(item.id, Math.max(0, item.quantity - 1))}
              aria-label={`Decrease quantity of ${item.name}`}
            >
              −
            </button>
            <span className="nlabel-qty-num">{item.quantity}</span>
            <button
              className="nlabel-qty-btn"
              onClick={() => onQuantityChange(item.id, item.quantity + 1)}
              aria-label={`Increase quantity of ${item.name}`}
            >
              +
            </button>
          </div>
          <span className="nlabel-qty-unit">{item.quantity_unit || "ct"}</span>
        </div>
      </div>

      <div className="nlabel-rule nlabel-rule-thick" />

      <p className="nlabel-heading">Nutrition Facts</p>
      <p className="nlabel-serving">
        Serving size {item.serving_qty ?? "—"} {item.serving_unit ?? ""}
      </p>

      <div className="nlabel-rule nlabel-rule-thick" />

      <div className="nlabel-row nlabel-row-bold">
        <span>Calories</span>
        <span>{round(item.calories)}</span>
      </div>

      <div className="nlabel-rule" />

      <div className="nlabel-row">
        <span>Protein</span>
        <span>{round(item.protein_g, 1)} g</span>
      </div>
      <div className="nlabel-row">
        <span>Total Carbohydrate</span>
        <span>{round(item.carbs_g, 1)} g</span>
      </div>
      <div className="nlabel-row nlabel-row-sub">
        <span>Dietary Fiber</span>
        <span>{round(item.fiber_g, 1)} g</span>
      </div>
      <div className="nlabel-row nlabel-row-sub">
        <span>Sugars</span>
        <span>{round(item.sugar_g, 1)} g</span>
      </div>
      <div className="nlabel-row">
        <span>Total Fat</span>
        <span>{round(item.fat_g, 1)} g</span>
      </div>
      <div className="nlabel-row">
        <span>Sodium</span>
        <span>{round(item.sodium_mg)} mg</span>
      </div>

      <div className="nlabel-rule nlabel-rule-thick" />

      <div className="nlabel-footer">
        <span className="nlabel-source">
          {SOURCE_LABELS[item.source] || item.source || "Unknown source"}
        </span>
        <div className="nlabel-actions">
          <button className="nlabel-btn" onClick={() => onEdit(item)}>
            Edit
          </button>
          <button className="nlabel-btn nlabel-btn-danger" onClick={() => onDelete(item.id)}>
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}
