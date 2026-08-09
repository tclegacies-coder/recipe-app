import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export function useSavedRecipes(userId) {
  const [savedIds, setSavedIds] = useState(new Set());
  const [loading, setLoading] = useState(true);

  const fetchSaved = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("saved_recipes")
      .select("recipe_id")
      .eq("user_id", userId);
    if (!error && data) {
      setSavedIds(new Set(data.map((r) => r.recipe_id)));
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
        recipe_id: recipe.id,
        title: recipe.title,
        image: recipe.image,
        ready_in_minutes: recipe.readyInMinutes,
        source_url: recipe.sourceUrl,
      },
    ]);
    if (!error) {
      setSavedIds((prev) => new Set(prev).add(recipe.id));
    }
    return { error };
  };

  const unsaveRecipe = async (recipeId) => {
    const { error } = await supabase
      .from("saved_recipes")
      .delete()
      .eq("user_id", userId)
      .eq("recipe_id", recipeId);
    if (!error) {
      setSavedIds((prev) => {
        const next = new Set(prev);
        next.delete(recipeId);
        return next;
      });
    }
    return { error };
  };

  const toggleSave = (recipe) =>
    savedIds.has(recipe.id) ? unsaveRecipe(recipe.id) : saveRecipe(recipe);

  return { savedIds, loading, saveRecipe, unsaveRecipe, toggleSave, refresh: fetchSaved };
}
