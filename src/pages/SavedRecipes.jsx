import { useAuth } from "../hooks/useAuth";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import "./SavedRecipes.css";

export default function SavedRecipes() {
  const { session } = useAuth();
  const userId = session?.user?.id;
  const [saved, setSaved] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchSaved = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const { data } = await supabase
      .from("saved_recipes")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    setSaved(data || []);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchSaved();
  }, [fetchSaved]);

  const handleRemove = async (recipeId) => {
    await supabase.from("saved_recipes").delete().eq("user_id", userId).eq("recipe_id", recipeId);
    setSaved((prev) => prev.filter((r) => r.recipe_id !== recipeId));
  };

  return (
    <div className="saved-page">
      <header className="saved-header">
        <p className="saved-eyebrow">Larder</p>
        <h1>Saved recipes</h1>
      </header>

      {loading ? (
        <p className="saved-empty">Loading…</p>
      ) : saved.length === 0 ? (
        <p className="saved-empty">
          Nothing saved yet. Star a recipe from the recipe finder to keep it here.
        </p>
      ) : (
        <div className="saved-grid">
          {saved.map((r) => (
            <div className="saved-card" key={r.id}>
              {r.image && <img src={r.image} alt="" className="saved-card-image" />}
              <div className="saved-card-body">
                <h3>{r.title}</h3>
                {r.ready_in_minutes != null && (
                  <p className="saved-card-meta">{r.ready_in_minutes} min</p>
                )}
                <div className="saved-card-actions">
                  <a href={r.source_url} target="_blank" rel="noreferrer" className="btn-secondary">
                    View recipe
                  </a>
                  <button className="nlabel-btn nlabel-btn-danger" onClick={() => handleRemove(r.recipe_id)}>
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
