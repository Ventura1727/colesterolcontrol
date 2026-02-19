// src/lib/foodCatalog.js
import { supabase } from "@/lib/supabaseClient";

export function normalizeFoodName(text) {
  return String(text || "")
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove acentos
    .replace(/[^a-z0-9\s-]/g, "")    // remove símbolos
    .replace(/\s+/g, " ")
    .replace(/s\b/g, "")            // plural simples (bananas -> banana)
    .trim();
}

// carrega catálogo (categories + foods + aliases)
export async function loadFoodCatalog() {
  const [{ data: categories }, { data: foods }, { data: aliases }] = await Promise.all([
    supabase.from("food_categories").select("id,name,default_kcal_per_100g,default_is_healthy").order("name"),
    supabase.from("foods").select("id,canonical_name,category_id,kcal_per_100g,is_healthy").order("canonical_name"),
    supabase.from("food_aliases").select("id,food_id,alias").limit(5000),
  ]);

  // mapas para busca rápida
  const foodsById = new Map((foods || []).map(f => [f.id, f]));
  const categoriesById = new Map((categories || []).map(c => [c.id, c]));

  const aliasToFoodId = new Map();
  for (const a of (aliases || [])) {
    aliasToFoodId.set(normalizeFoodName(a.alias), a.food_id);
  }

  // também permite bater direto no canonical_name
  for (const f of (foods || [])) {
    aliasToFoodId.set(normalizeFoodName(f.canonical_name), f.id);
  }

  return { categories: categories || [], foods: foods || [], aliasToFoodId, foodsById, categoriesById };
}

export function findFoodMatch(rawText, catalog) {
  const norm = normalizeFoodName(rawText);
  if (!norm) return { status: "empty" };

  // 1) match exato alias/canônico
  const foodId = catalog.aliasToFoodId.get(norm);
  if (foodId) {
    const food = catalog.foodsById.get(foodId);
    const category = food?.category_id ? catalog.categoriesById.get(food.category_id) : null;

    return {
      status: "matched",
      normalized: norm,
      food: {
        id: food.id,
        name: food.canonical_name,
        kcal_per_100g: Number(food.kcal_per_100g || 0),
        is_healthy: Boolean(food.is_healthy),
        category,
      },
    };
  }

  // 2) tentativa “contém” (fuzzy leve)
  // exemplo: "banana prata madura" contém "banana prata"
  for (const [aliasNorm, fId] of catalog.aliasToFoodId.entries()) {
    if (aliasNorm.length >= 4 && norm.includes(aliasNorm)) {
      const food = catalog.foodsById.get(fId);
      const category = food?.category_id ? catalog.categoriesById.get(food.category_id) : null;
      return {
        status: "matched",
        normalized: norm,
        food: {
          id: food.id,
          name: food.canonical_name,
          kcal_per_100g: Number(food.kcal_per_100g || 0),
          is_healthy: Boolean(food.is_healthy),
          category,
        },
      };
    }
  }

  return { status: "unknown", normalized: norm };
}

export async function saveUnknownFood({ userId, rawText, normalizedText, chosenCategoryId, chosenKcalEstimate }) {
  try {
    await supabase.from("unknown_foods").insert({
      user_id: userId || null,
      raw_text: rawText,
      normalized_text: normalizedText,
      chosen_category_id: chosenCategoryId || null,
      chosen_kcal_estimate: chosenKcalEstimate ?? null,
    });
  } catch {
    // silêncio: não pode travar UX
  }
}
