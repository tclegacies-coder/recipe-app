import { useMemo, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { usePantry } from "../hooks/usePantry";
import NutritionLabelCard from "../components/NutritionLabelCard";
import AddIngredientModal from "../components/AddIngredientModal";
import "./Pantry.css";

export default function Pantry() {
  const { session } = useAuth();
  const userId = session?.user?.id;
  const { items, loading, error, addItem, updateItem, deleteItem } = usePantry(userId);
  const [showAdd, setShowAdd] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [query, setQuery] = useState("");

  const filteredItems = useMemo(() => {
    if (!query.trim()) return items;
    const q = query.toLowerCase();
    return items.filter(
      (i) => i.name?.toLowerCase().includes(q) || i.brand?.toLowerCase().includes(q)
    );
  }, [items, query]);

  const handleSave = async (item) => {
    const { id, ...fields } = item;
    const { error: saveError } = id ? await updateItem(id, fields) : await addItem(fields);
    if (!saveError) {
      setShowAdd(false);
      setEditingItem(null);
    }
  };

  const handleQuantityChange = async (id, newQuantity) => {
    await updateItem(id, { quantity: newQuantity });
  };

  const handleDelete = async (id) => {
    if (window.confirm("Remove this item from your pantry?")) {
      await deleteItem(id);
    }
  };

  return (
    <div className="pantry-page">
      <header className="pantry-header">
        <div>
          <p className="pantry-eyebrow">Larder</p>
          <h1>Your pantry</h1>
        </div>
      </header>

      <div className="pantry-toolbar">
        <input
          type="search"
          placeholder="Search your pantry…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pantry-search"
        />
        <button className="btn-primary" onClick={() => setShowAdd(true)}>
          + Add ingredient
        </button>
      </div>

      {error && <p className="pantry-error">{error}</p>}

      {loading ? (
        <p className="pantry-empty">Loading your pantry…</p>
      ) : filteredItems.length === 0 ? (
        <div className="pantry-empty-state">
          <p>
            {items.length === 0
              ? "Nothing in your pantry yet. Scan a barcode or add an item to get started."
              : "No items match your search."}
          </p>
        </div>
      ) : (
        <div className="pantry-grid">
          {filteredItems.map((item) => (
            <NutritionLabelCard
              key={item.id}
              item={item}
              onQuantityChange={handleQuantityChange}
              onEdit={setEditingItem}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {(showAdd || editingItem) && (
        <AddIngredientModal
          onClose={() => {
            setShowAdd(false);
            setEditingItem(null);
          }}
          onSave={handleSave}
          editItem={editingItem}
        />
      )}
    </div>
  );
}
