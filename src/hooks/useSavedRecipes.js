import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

// Spoonacular IDs are numbers, Edamam IDs are full URI strings, and
// recipe_id comes back from Supabase as text regardless — so every
// saved-state lookup uses a "source:id" string key to stay consistent
// and avoid any cross-source collision.
function keyFor(recipe) {
  return `${recipe.source}:${recipe.id}`;
}

export function useSavedRecipes(userId) {
  const [savedKeys, setSavedKeys] = useState(new Set());
  const [loading, setLoading] = useState(true);

  const fetchSaved = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("saved_recipes")
      .select("recipe_id, source")
      .eq("user_id", userId);
    if (!error && data) {
      setSavedKeys(new Set(data.map((r) => `${r.source}:${r.recipe_id}`)));
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchSaved();
  }, [fetchSaved]);

  const saveRecipe = async (recipe) => {
    const { error } = await supabase.from("saved_recipes").insert([
      {
        user_id: userId,
        recipe_id: String(recipe.id),
        source: recipe.source,
        title: recipe.title,
        image: recipe.image,
        ready_in_minutes: recipe.readyInMinutes,
        source_url: recipe.sourceUrl,
      },
    ]);
    if (!error) {
      setSavedKeys((prev) => new Set(prev).add(keyFor(recipe)));
    }
    return { error };
  };

  const unsaveRecipe = async (recipe) => {
    const { error } = await supabase
      .from("saved_recipes")
      .delete()
      .eq("user_id", userId)
      .eq("recipe_id", String(recipe.id))
      .eq("source", recipe.source);
    if (!error) {
      setSavedKeys((prev) => {
        const next = new Set(prev);
        next.delete(keyFor(recipe));
        return next;
      });
    }
    return { error };
  };

  const isSaved = (recipe) => savedKeys.has(keyFor(recipe));

  const toggleSave = (recipe) => (isSaved(recipe) ? unsaveRecipe(recipe) : saveRecipe(recipe));

  return { isSaved, loading, saveRecipe, unsaveRecipe, toggleSave, refresh: fetchSaved };
}
