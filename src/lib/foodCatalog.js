// src/lib/foodCatalog.js
import { supabase } from "@/lib/supabaseClient";

/**
 * Normaliza texto para busca:
 * - minúsculas, sem acento, remove símbolos, espaços múltiplos
 * - plural simples (remove "s" no final de palavras)
 */
export function normalizeFoodName(text) {
  return String(text || "")
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove acentos
    .replace(/[^a-z0-9\s-]/g, "") // remove símbolos
    .replace(/\s+/g, " ")
    .replace(/s\b/g, "") // plural simples (bananas -> banana)
    .trim();
}

/**
 * Carrega catálogo (categories + foods + aliases)
 * Observação: isso serve pra match local rápido (alias/canônico).
 */
export async function loadFoodCatalog() {
  const [{ data: categories }, { data: foods }, { data: aliases }] = await Promise.all([
    supabase.from("food_categories").select("id,name,default_kcal_per_100g,default_is_healthy").order("name"),
    supabase.from("foods").select("id,canonical_name,category_id,kcal_per_100g,is_healthy").order("canonical_name"),
    supabase.from("food_aliases").select("id,food_id,alias").limit(5000),
  ]);

  const foodsById = new Map((foods || []).map((f) => [f.id, f]));
  const categoriesById = new Map((categories || []).map((c) => [c.id, c]));

  const aliasToFoodId = new Map();
  for (const a of aliases || []) {
    aliasToFoodId.set(normalizeFoodName(a.alias), a.food_id);
  }

  // permite buscar direto pelo canonical_name também
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
 * Match local (rápido) usando catálogo carregado.
 */
export function findFoodMatch(rawText, catalog) {
  const norm = normalizeFoodName(rawText);
  if (!norm) return { status: "empty" };
  if (!catalog) return { status: "unknown", normalized: norm };

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
        source: "base",
      },
    };
  }

  // 2) tentativa “contém” (fuzzy leve)
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
          source: "base",
        },
      };
    }
  }

  return { status: "unknown", normalized: norm };
}

/**
 * Salva alimento desconhecido (não pode travar UX)
 */
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
    // silêncio
  }
}

/**
 * ---------------------------
 * ✅ NOVO: Busca híbrida (base + aliases + meus alimentos)
 * ---------------------------
 *
 * Retorna itens no formato:
 * { id, name, kcal_per_100g, is_healthy, source: "base" | "custom" }
 */
export async function searchFoodsHybrid({ query, catalog, userId, limit = 8 }) {
  const q = String(query || "").trim();
  if (q.length < 2) return [];

  const norm = normalizeFoodName(q);
  const results = [];
  const seen = new Set(); // chave: `${source}_${id}`

  const pushUnique = (item) => {
    if (!item?.id) return;
    const key = `${item.source || "base"}_${item.id}`;
    if (seen.has(key)) return;
    seen.add(key);
    results.push(item);
  };

  // 0) match local exato (se catálogo carregado)
  try {
    const match = findFoodMatch(q, catalog);
    if (match?.status === "matched" && match.food) {
      pushUnique({
        id: match.food.id,
        name: match.food.name,
        kcal_per_100g: Number(match.food.kcal_per_100g || 0),
        is_healthy: Boolean(match.food.is_healthy),
        source: "base",
      });
    }
  } catch {}

  // 1) tenta RPC search_food (se existir no seu banco)
  // (se não existir, cai no catch silenciosamente)
  try {
    const { data, error } = await supabase.rpc("search_food", { q: q, lim: limit });
    if (!error && Array.isArray(data)) {
      for (const row of data) {
        // tenta suportar nomes possíveis que seu RPC devolve
        pushUnique({
          id: row.id,
          name: row.canonical_name || row.name || row.food_name || "",
          kcal_per_100g: Number(row.kcal_per_100g || 0),
          is_healthy: Boolean(row.is_healthy),
          source: row.source === "custom" ? "custom" : "base",
        });
      }
    }
  } catch {
    // ignora
  }

  // 2) fallback: foods.ilike(canonical_name)
  try {
    const { data, error } = await supabase
      .from("foods")
      .select("id,canonical_name,kcal_per_100g,is_healthy")
      .ilike("canonical_name", `%${q}%`)
      .order("canonical_name", { ascending: true })
      .limit(limit);

    if (!error && Array.isArray(data)) {
      for (const f of data) {
        pushUnique({
          id: f.id,
          name: f.canonical_name,
          kcal_per_100g: Number(f.kcal_per_100g || 0),
          is_healthy: Boolean(f.is_healthy),
          source: "base",
        });
      }
    }
  } catch {}

  // 3) fallback: food_aliases.ilike(alias) -> busca foods por ids
  try {
    const { data: aliasRows, error: aliasErr } = await supabase
      .from("food_aliases")
      .select("food_id,alias")
      .ilike("alias", `%${q}%`)
      .limit(30);

    if (!aliasErr && Array.isArray(aliasRows) && aliasRows.length) {
      const ids = Array.from(new Set(aliasRows.map((a) => a.food_id).filter(Boolean))).slice(0, 20);
      if (ids.length) {
        const { data: foodsByAlias, error: foodsErr } = await supabase
          .from("foods")
          .select("id,canonical_name,kcal_per_100g,is_healthy")
          .in("id", ids)
          .limit(limit);

        if (!foodsErr && Array.isArray(foodsByAlias)) {
          for (const f of foodsByAlias) {
            pushUnique({
              id: f.id,
              name: f.canonical_name,
              kcal_per_100g: Number(f.kcal_per_100g || 0),
              is_healthy: Boolean(f.is_healthy),
              source: "base",
            });
          }
        }
      }
    }
  } catch {}

  // 4) meus alimentos (user_custom_foods) — schema pode variar, então tentamos múltiplas seleções
  if (userId) {
    const trySelect = async (selectStr) => {
      try {
        const { data, error } = await supabase
          .from("user_custom_foods")
          .select(selectStr)
          .eq("user_id", userId)
          .ilike(selectStr.includes("food_name") ? "food_name" : selectStr.includes("name") ? "name" : "canonical_name", `%${q}%`)
          .order(selectStr.includes("food_name") ? "food_name" : selectStr.includes("name") ? "name" : "canonical_name", { ascending: true })
          .limit(limit);

        if (error) return null;
        return Array.isArray(data) ? data : [];
      } catch {
        return null;
      }
    };

    let customRows = await trySelect("id,user_id,food_name,kcal_per_100g,is_healthy");
    if (customRows === null) customRows = await trySelect("id,user_id,name,kcal_per_100g,is_healthy");
    if (customRows === null) customRows = await trySelect("id,user_id,canonical_name,kcal_per_100g,is_healthy");

    if (Array.isArray(customRows)) {
      for (const r of customRows) {
        const name = r.food_name || r.name || r.canonical_name || "";
        pushUnique({
          id: r.id,
          name,
          kcal_per_100g: Number(r.kcal_per_100g || 0),
          is_healthy: typeof r.is_healthy === "boolean" ? r.is_healthy : true,
          source: "custom",
        });
      }
    }
  }

  // 5) ordena: exatos primeiro (normalizado igual), depois por nome
  const score = (item) => {
    const n = normalizeFoodName(item?.name || "");
    if (n === norm) return 0;
    if (n.startsWith(norm)) return 1;
    if (n.includes(norm)) return 2;
    return 3;
  };

  results.sort((a, b) => {
    const sa = score(a);
    const sb = score(b);
    if (sa !== sb) return sa - sb;
    return String(a.name || "").localeCompare(String(b.name || ""), "pt-BR");
  });

  return results.slice(0, limit);
}

/**
 * ---------------------------
 * ✅ NOVO: cria alimento do usuário (inline no modal)
 * ---------------------------
 *
 * Tenta suportar schemas diferentes:
 * - food_name
 * - name
 * - canonical_name
 */
export async function createUserCustomFood({ userId, name, kcalPer100g, isHealthy }) {
  if (!userId) throw new Error("missing userId");
  const foodName = String(name || "").trim();
  if (!foodName) throw new Error("missing name");

  const kcal = Number.isFinite(Number(kcalPer100g)) ? Number(kcalPer100g) : 0;
  const healthy = Boolean(isHealthy);

  // tenta 1: food_name
  try {
    const { data, error } = await supabase
      .from("user_custom_foods")
      .insert({
        user_id: userId,
        food_name: foodName,
        kcal_per_100g: kcal,
        is_healthy: healthy,
      })
      .select("*")
      .single();

    if (error) throw error;
    return data;
  } catch {}

  // tenta 2: name
  try {
    const { data, error } = await supabase
      .from("user_custom_foods")
      .insert({
        user_id: userId,
        name: foodName,
        kcal_per_100g: kcal,
        is_healthy: healthy,
      })
      .select("*")
      .single();

    if (error) throw error;
    return data;
  } catch {}

  // tenta 3: canonical_name
  const { data, error } = await supabase
    .from("user_custom_foods")
    .insert({
      user_id: userId,
      canonical_name: foodName,
      kcal_per_100g: kcal,
      is_healthy: healthy,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}
