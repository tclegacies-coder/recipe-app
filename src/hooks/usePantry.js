import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export function usePantry(userId) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchItems = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const { data, error: fetchError } = await supabase
      .from("pantry_items")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (fetchError) {
      setError(fetchError.message);
    } else {
      setItems(data);
      setError(null);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const addItem = async (item) => {
    const { data, error: insertError } = await supabase
      .from("pantry_items")
      .insert([{ ...item, user_id: userId }])
      .select()
      .single();
    if (insertError) {
      setError(insertError.message);
      return { error: insertError };
    }
    setItems((prev) => [data, ...prev]);
    return { data };
  };

  const updateItem = async (id, updates) => {
    const { data, error: updateError } = await supabase
      .from("pantry_items")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (updateError) {
      setError(updateError.message);
      return { error: updateError };
    }
    setItems((prev) => prev.map((i) => (i.id === id ? data : i)));
    return { data };
  };

  const deleteItem = async (id) => {
    const { error: deleteError } = await supabase.from("pantry_items").delete().eq("id", id);
    if (deleteError) {
      setError(deleteError.message);
      return { error: deleteError };
    }
    setItems((prev) => prev.filter((i) => i.id !== id));
    return { success: true };
  };

  return { items, loading, error, addItem, updateItem, deleteItem, refresh: fetchItems };
}
