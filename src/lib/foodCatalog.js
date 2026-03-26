// src/lib/foodCatalog.js
import { supabase } from "@/lib/supabaseClient";

/**
 * Normaliza texto para busca
 */
export function normalizeFoodName(text) {
  return String(text || "")
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, " ")
    .replace(/s\b/g, "")
    .trim();
}

/**
 * Carrega catálogo base
 */
export async function loadFoodCatalog() {
  const [{ data: categories }, { data: foods }, { data: aliases }] = await Promise.all([
    supabase.from("food_categories").select("id,name,default_kcal_per_100g,default_is_healthy"),
    supabase.from("foods").select("id,canonical_name,category_id,kcal_per_100g,is_healthy"),
    supabase.from("food_aliases").select("id,food_id,alias").limit(5000),
  ]);

  const foodsById = new Map((foods || []).map((f) => [f.id, f]));
  const categoriesById = new Map((categories || []).map((c) => [c.id, c]));

  const aliasToFoodId = new Map();

  for (const a of aliases || []) {
    aliasToFoodId.set(normalizeFoodName(a.alias), a.food_id);
  }

  for (const f of foods || []) {
    aliasToFoodId.set(normalizeFoodName(f.canonical_name), f.id);
  }

  return {
    categories: categories || [],
    foods: foods || [],
    aliasToFoodId,
    foodsById,
    categoriesById,
  };
}

/**
 * Match local
 */
export function findFoodMatch(rawText, catalog) {
  const norm = normalizeFoodName(rawText);
  if (!norm || !catalog) return { status: "unknown" };

  const foodId = catalog.aliasToFoodId.get(norm);
  if (foodId) {
    const food = catalog.foodsById.get(foodId);
    return {
      status: "matched",
      food: {
        id: food.id,
        name: food.canonical_name,
        kcal_per_100g: Number(food.kcal_per_100g || 0),
        is_healthy: Boolean(food.is_healthy),
        source: "base",
      },
    };
  }

  return { status: "unknown" };
}

/**
 * Busca híbrida
 */
export async function searchFoodsHybrid({ query, catalog, userId, limit = 8 }) {
  const q = String(query || "").trim();
  if (q.length < 2) return [];

  const results = [];
  const seen = new Set();

  const push = (item) => {
    const key = `${item.source}_${item.id}`;
    if (!seen.has(key)) {
      seen.add(key);
      results.push(item);
    }
  };

  // Base foods
  const { data: foods } = await supabase
    .from("foods")
    .select("id,canonical_name,kcal_per_100g,is_healthy")
    .ilike("canonical_name", `%${q}%`)
    .limit(limit);

  for (const f of foods || []) {
    push({
      id: f.id,
      name: f.canonical_name,
      kcal_per_100g: Number(f.kcal_per_100g || 0),
      is_healthy: Boolean(f.is_healthy),
      source: "base",
    });
  }

  // Custom foods
  if (userId) {
    const { data: custom } = await supabase
      .from("user_custom_foods")
      .select("id,name,kcal_per_100,is_healthy")
      .eq("user_id", userId)
      .ilike("name", `%${q}%`)
      .limit(limit);

    for (const c of custom || []) {
      push({
        id: c.id,
        name: c.name,
        kcal_per_100g: Number(c.kcal_per_100 || 0),
        is_healthy: Boolean(c.is_healthy),
        source: "custom",
      });
    }
  }

  return results.slice(0, limit);
}

/**
 * Criação de alimento custom (CORRIGIDO)
 */
export async function createUserCustomFood({ userId, name, kcalPer100g, isHealthy }) {
  if (!userId) throw new Error("missing userId");

  const foodName = String(name || "").trim();
  if (!foodName) throw new Error("missing name");

  const kcal = Number(kcalPer100g || 0);
  const normalized = normalizeFoodName(foodName);

  const { data, error } = await supabase
    .from("user_custom_foods")
    .insert({
      user_id: userId,
      name: foodName,
      normalized_name: normalized,
      kcal_per_100: kcal,
      unit_type: "g",
      is_healthy: Boolean(isHealthy),
    })
    .select()
    .single();

  if (error) {
    console.error("Erro Supabase:", error);
    throw error;
  }

  return data;
}
