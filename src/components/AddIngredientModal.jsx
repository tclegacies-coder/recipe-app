import { useState } from "react";
import BarcodeScanner from "./BarcodeScanner";
import { lookupByBarcode, lookupByName } from "../lib/nutritionLookup";
import "./AddIngredientModal.css";

const EMPTY_FORM = {
  name: "",
  brand: "",
  quantity: 1,
  quantity_unit: "ct",
  serving_qty: "",
  serving_unit: "",
  calories: "",
  protein_g: "",
  carbs_g: "",
  fat_g: "",
  fiber_g: "",
  sugar_g: "",
  sodium_mg: "",
  source: "manual",
};

export default function AddIngredientModal({ onClose, onSave, editItem }) {
  const isEditing = Boolean(editItem);
  const [mode, setMode] = useState(isEditing ? "confirm" : "choose"); // choose | scanning | manual-search | confirm
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchStatus, setSearchStatus] = useState(null);
  const [form, setForm] = useState(
    isEditing
      ? {
          name: editItem.name ?? "",
          brand: editItem.brand ?? "",
          quantity: editItem.quantity ?? 1,
          quantity_unit: editItem.quantity_unit ?? "ct",
          serving_qty: editItem.serving_qty ?? "",
          serving_unit: editItem.serving_unit ?? "",
          calories: editItem.calories ?? "",
          protein_g: editItem.protein_g ?? "",
          carbs_g: editItem.carbs_g ?? "",
          fat_g: editItem.fat_g ?? "",
          fiber_g: editItem.fiber_g ?? "",
          sugar_g: editItem.sugar_g ?? "",
          sodium_mg: editItem.sodium_mg ?? "",
          source: editItem.source ?? "manual",
        }
      : EMPTY_FORM
  );

  const runLookup = async (lookupFn, arg) => {
    setSearching(true);
    setSearchStatus(null);
    const { result, triedSources } = await lookupFn(arg);
    setSearching(false);
    if (result) {
      setForm((prev) => ({
        ...prev,
        name: result.name,
        brand: result.brand,
        serving_qty: result.servingQty ?? "",
        serving_unit: result.servingUnit ?? "",
        calories: result.calories ?? "",
        protein_g: result.protein_g ?? "",
        carbs_g: result.carbs_g ?? "",
        fat_g: result.fat_g ?? "",
        fiber_g: result.fiber_g ?? "",
        sugar_g: result.sugar_g ?? "",
        sodium_mg: result.sodium_mg ?? "",
        source: result.source,
      }));
      setMode("confirm");
    } else {
      setSearchStatus(
        `No match found (checked: ${triedSources.join(", ")}). You can enter nutrition info manually below.`
      );
      setForm((prev) => ({ ...prev, name: typeof arg === "string" && !/^\d+$/.test(arg) ? arg : prev.name }));
      setMode("confirm");
    }
  };

  const handleBarcodeDetected = (barcode) => {
    setMode("choose");
    runLookup(lookupByBarcode, barcode);
  };

  const handleNameSearch = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    runLookup(lookupByName, searchQuery.trim());
  };

  const handleFieldChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    onSave({
      ...(isEditing ? { id: editItem.id } : {}),
      ...form,
      quantity: Number(form.quantity) || 1,
      serving_qty: form.serving_qty === "" ? null : Number(form.serving_qty),
      calories: form.calories === "" ? null : Number(form.calories),
      protein_g: form.protein_g === "" ? null : Number(form.protein_g),
      carbs_g: form.carbs_g === "" ? null : Number(form.carbs_g),
      fat_g: form.fat_g === "" ? null : Number(form.fat_g),
      fiber_g: form.fiber_g === "" ? null : Number(form.fiber_g),
      sugar_g: form.sugar_g === "" ? null : Number(form.sugar_g),
      sodium_mg: form.sodium_mg === "" ? null : Number(form.sodium_mg),
    });
  };

  if (mode === "scanning") {
    return (
      <BarcodeScanner onDetected={handleBarcodeDetected} onClose={() => setMode("choose")} />
    );
  }

  return (
    <div className="modal-overlay" role="dialog" aria-label="Add pantry item">
      <div className="modal-panel">
        <div className="modal-header">
          <h3>{isEditing ? "Edit ingredient" : "Add ingredient"}</h3>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {mode === "choose" && (
          <div className="modal-choose">
            <button className="modal-choice-btn" onClick={() => setMode("scanning")}>
              📷 Scan barcode
            </button>
            <button className="modal-choice-btn" onClick={() => setMode("manual-search")}>
              ⌨️ Enter name / brand
            </button>
          </div>
        )}

        {mode === "manual-search" && (
          <form onSubmit={handleNameSearch} className="modal-search-form">
            <label htmlFor="ingredient-search">Product name or brand</label>
            <input
              id="ingredient-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="e.g. Chobani Vanilla Yogurt"
              autoFocus
            />
            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={() => setMode("choose")}>
                Back
              </button>
              <button type="submit" className="btn-primary" disabled={searching}>
                {searching ? "Searching…" : "Search"}
              </button>
            </div>
          </form>
        )}

        {mode === "confirm" && (
          <form onSubmit={handleSave} className="modal-confirm-form">
            {searchStatus && <p className="modal-status">{searchStatus}</p>}
            <div className="modal-grid">
              <label>
                Name
                <input value={form.name} onChange={handleFieldChange("name")} required />
              </label>
              <label>
                Brand
                <input value={form.brand} onChange={handleFieldChange("brand")} />
              </label>
              <label>
                Quantity on hand
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={form.quantity}
                  onChange={handleFieldChange("quantity")}
                />
              </label>
              <label>
                Unit
                <input
                  value={form.quantity_unit}
                  onChange={handleFieldChange("quantity_unit")}
                  placeholder="ct, oz, lb, box…"
                />
              </label>
              <label>
                Serving size
                <input
                  type="number"
                  step="0.1"
                  value={form.serving_qty}
                  onChange={handleFieldChange("serving_qty")}
                />
              </label>
              <label>
                Serving unit
                <input value={form.serving_unit} onChange={handleFieldChange("serving_unit")} />
              </label>
              <label>
                Calories
                <input type="number" value={form.calories} onChange={handleFieldChange("calories")} />
              </label>
              <label>
                Protein (g)
                <input
                  type="number"
                  step="0.1"
                  value={form.protein_g}
                  onChange={handleFieldChange("protein_g")}
                />
              </label>
              <label>
                Carbs (g)
                <input
                  type="number"
                  step="0.1"
                  value={form.carbs_g}
                  onChange={handleFieldChange("carbs_g")}
                />
              </label>
              <label>
                Fat (g)
                <input type="number" step="0.1" value={form.fat_g} onChange={handleFieldChange("fat_g")} />
              </label>
              <label>
                Fiber (g)
                <input
                  type="number"
                  step="0.1"
                  value={form.fiber_g}
                  onChange={handleFieldChange("fiber_g")}
                />
              </label>
              <label>
                Sugar (g)
                <input
                  type="number"
                  step="0.1"
                  value={form.sugar_g}
                  onChange={handleFieldChange("sugar_g")}
                />
              </label>
              <label>
                Sodium (mg)
                <input
                  type="number"
                  value={form.sodium_mg}
                  onChange={handleFieldChange("sodium_mg")}
                />
              </label>
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => (isEditing ? onClose() : setMode("choose"))}
              >
                {isEditing ? "Cancel" : "Start over"}
              </button>
              <button type="submit" className="btn-primary">
                {isEditing ? "Save changes" : "Save to pantry"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
