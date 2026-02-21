// src/pages/Alimentacao.jsx
import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Salad,
  Lock,
  Check,
  Zap,
  Trophy,
  Clock,
  Flame,
  ChevronRight,
  Heart,
  Camera,
  Upload,
  X,
  Loader2,
  BarChart3,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { createPageUrl } from "@/utils";
import CaloriesChart from "@/components/analytics/CaloriesChart";
import AIInsights from "@/components/analytics/AIInsights";
import CaloriesDashboard from "@/components/nutrition/CaloriesDashboard";
import { supabase } from "@/lib/supabaseClient";

/* =========================
   RECEITAS (mantido)
========================= */
const receitas = [
  {
    id: "aveia-frutas",
    name: "Bowl de Aveia com Frutas",
    desc: "Café da manhã anti-colesterol",
    time: 10,
    xp: 15,
    calories: 280,
    benefit: "Reduz LDL",
    rank_required: "Iniciante",
    image: "🥣",
    ingredients: ["1/2 xícara de aveia", "1 banana", "1/2 xícara de morangos", "Canela a gosto", "Mel (opcional)"],
    steps: ["Cozinhe a aveia com água ou leite vegetal", "Adicione as frutas cortadas", "Polvilhe canela e mel"],
  },
  {
    id: "salada-salmao",
    name: "Salada com Salmão Grelhado",
    desc: "Almoço rico em Ômega-3",
    time: 25,
    xp: 25,
    calories: 420,
    benefit: "Aumenta HDL",
    rank_required: "Iniciante",
    image: "🥗",
    ingredients: ["150g de salmão", "Mix de folhas verdes", "Tomate cereja", "Abacate", "Azeite de oliva"],
    steps: ["Grelhe o salmão com ervas", "Monte a salada com as folhas", "Adicione tomate e abacate", "Finalize com azeite"],
  },
  {
    id: "sopa-legumes",
    name: "Sopa Detox de Legumes",
    desc: "Jantar leve e nutritivo",
    time: 30,
    xp: 20,
    calories: 180,
    benefit: "Desintoxica",
    rank_required: "Bronze",
    image: "🍲",
    ingredients: ["Cenoura", "Abobrinha", "Brócolis", "Gengibre", "Cebola e alho"],
    steps: ["Refogue cebola e alho", "Adicione os legumes e água", "Cozinhe por 20 min", "Bata no liquidificador"],
  },
  {
    id: "smoothie-verde",
    name: "Smoothie Verde Energético",
    desc: "Lanche poderoso",
    time: 5,
    xp: 15,
    calories: 150,
    benefit: "Fibras e energia",
    rank_required: "Bronze",
    image: "🥤",
    ingredients: ["Espinafre", "Banana", "Maçã verde", "Gengibre", "Água de coco"],
    steps: ["Bata todos os ingredientes no liquidificador", "Sirva gelado"],
  },
  {
    id: "peixe-assado",
    name: "Peixe Assado com Ervas",
    desc: "Proteína saudável",
    time: 35,
    xp: 35,
    calories: 320,
    benefit: "Ômega-3 + Proteína",
    rank_required: "Prata",
    image: "🐟",
    ingredients: ["Filé de tilápia ou pescada", "Limão", "Alecrim e tomilho", "Azeite", "Sal marinho"],
    steps: ["Tempere o peixe com limão e ervas", "Regue com azeite", "Asse a 180°C por 25 min"],
  },
  {
    id: "bowl-quinoa",
    name: "Bowl de Quinoa Mediterrâneo",
    desc: "Superalimento completo",
    time: 25,
    xp: 40,
    calories: 480,
    benefit: "Proteína vegetal",
    rank_required: "Ouro",
    image: "🥙",
    ingredients: ["Quinoa", "Grão de bico", "Pepino", "Tomate", "Azeitonas", "Queijo feta"],
    steps: ["Cozinhe a quinoa", "Misture todos os ingredientes", "Tempere com azeite e limão"],
  },
  {
    id: "wrap-integral",
    name: "Wrap Integral Gourmet",
    desc: "Refeição completa",
    time: 15,
    xp: 30,
    calories: 380,
    benefit: "Fibras + Proteína",
    rank_required: "Diamante",
    image: "🌯",
    ingredients: ["Wrap integral", "Peito de frango grelhado", "Abacate", "Rúcula", "Molho de iogurte"],
    steps: ["Grelhe o frango", "Monte o wrap com todos ingredientes", "Enrole e sirva"],
  },
  {
    id: "risoto-cogumelos",
    name: "Risoto de Cogumelos Selvagens",
    desc: "Receita gourmet saudável",
    time: 45,
    xp: 60,
    calories: 520,
    benefit: "Antioxidantes",
    rank_required: "Mestre",
    image: "🍚",
    ingredients: ["Arroz arbóreo", "Mix de cogumelos", "Vinho branco", "Caldo de legumes", "Parmesão light"],
    steps: ["Refogue os cogumelos", "Adicione o arroz e o vinho", "Vá adicionando caldo aos poucos", "Finalize com parmesão"],
  },
];

const rankOrder = ["Iniciante", "Bronze", "Prata", "Ouro", "Diamante", "Mestre"];

function computeRankFromXp(xp) {
  if (xp >= 1500) return "Mestre";
  if (xp >= 1000) return "Diamante";
  if (xp >= 600) return "Ouro";
  if (xp >= 300) return "Prata";
  if (xp >= 100) return "Bronze";
  return "Iniciante";
}

async function safeSelect(table, queryBuilderFn) {
  try {
    const q = queryBuilderFn(supabase.from(table).select("*"));
    const { data, error } = await q;
    if (error) return [];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function todayISODate() {
  return new Date().toISOString().slice(0, 10);
}

function localKeyForDay(day) {
  return `hb_recipes_done_${day}`;
}

function readLocalDoneSet(day) {
  try {
    const raw = localStorage.getItem(localKeyForDay(day));
    const arr = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function writeLocalDoneSet(day, set) {
  try {
    localStorage.setItem(localKeyForDay(day), JSON.stringify(Array.from(set)));
  } catch {}
}

function sameDay(isoDatetimeOrDate, dayYYYYMMDD) {
  if (!isoDatetimeOrDate) return false;
  const s = String(isoDatetimeOrDate);
  return s.slice(0, 10) === dayYYYYMMDD;
}

// XP baseado no “meal saudável”
function computeCustomMealXp({ isHealthy, calories, targetCalories }) {
  if (!isHealthy) return 0;

  const target = Number(targetCalories || 2000);
  const cals = calories == null ? null : Number(calories);

  if (!Number.isFinite(cals) || cals <= 0) return 10;

  const ratio = cals / Math.max(target, 1);
  if (ratio <= 0.2) return 20;
  if (ratio <= 0.35) return 15;
  if (ratio <= 0.5) return 10;
  return 5;
}

function openImagePicker({ source, onFile }) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  if (source === "camera") input.setAttribute("capture", "environment");
  input.onchange = (e) => {
    const file = e.target.files?.[0];
    if (file) onFile(file);
  };
  input.click();
}

/* =========================
   HELPERS: foods/custom
========================= */
function getFoodUnitType(row) {
  if (row?.unit_type === "ml") return "ml";
  if (row?.unit_type === "unit") return "unit";
  return "g";
}

function getFoodKcalPer100(row) {
  // foods: kcal_per_100g
  if (row?.kcal_per_100g != null) return Number(row.kcal_per_100g) || 0;
  // custom: kcal_per_100
  if (row?.kcal_per_100 != null) return Number(row.kcal_per_100) || 0;
  // fallback
  if (row?.kcal_per_100 != null) return Number(row.kcal_per_100) || 0;
  return 0;
}

function calcItemKcalTotal({ unit_type, quantity, kcal_per_100 }) {
  const q = Number(quantity || 0);
  const k100 = Number(kcal_per_100 || 0);
  if (!Number.isFinite(q) || q <= 0) return 0;

  if (unit_type === "g" || unit_type === "ml") {
    if (!Number.isFinite(k100) || k100 <= 0) return 0;
    return (k100 * q) / 100;
  }
  return 0;
}

function nowLocalISO() {
  return new Date().toISOString();
}

export default function Alimentacao() {
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedReceita, setSelectedReceita] = useState(null);
  const [completing, setCompleting] = useState(false);

  // analyze foto (mantido)
  const [flowMode, setFlowMode] = useState(null);
  const [showPickerModal, setShowPickerModal] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [showAnalyzeModal, setShowAnalyzeModal] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  // NOVO: Registro manual
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [mealType, setMealType] = useState("almoco");
  const [entryAt, setEntryAt] = useState(() => nowLocalISO());

  const [foodQuery, setFoodQuery] = useState("");
  const [foodResults, setFoodResults] = useState([]);
  const [foodSearching, setFoodSearching] = useState(false);

  const [cartItems, setCartItems] = useState([]);

  // criação de alimento personalizado inline
  const [showCreateCustom, setShowCreateCustom] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customUnitType, setCustomUnitType] = useState("g"); // g/ml
  const [customKcalPer100, setCustomKcalPer100] = useState("");
  const [customIsHealthy, setCustomIsHealthy] = useState(true);
  const [creatingCustom, setCreatingCustom] = useState(false);

  // dados antigos/analytics (mantidos)
  const [mealLogs, setMealLogs] = useState([]);
  const [activities, setActivities] = useState([]);
  const [colesterolRecords, setColesterolRecords] = useState([]);
  const [showAnalytics, setShowAnalytics] = useState(false);

  // novo: entries do dia
  const [todayEntries, setTodayEntries] = useState([]);

  const day = useMemo(() => todayISODate(), []);
  const [localDoneSet, setLocalDoneSet] = useState(() => readLocalDoneSet(todayISODate()));

  useEffect(() => {
    let mounted = true;
    (async () => {
      await loadData(mounted);
    })();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadTodayEntries = async (userId) => {
    try {
      const start = new Date();
      start.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from("meal_entries")
        .select(
          `
          id,
          entry_at,
          meal_type,
          total_kcal,
          source,
          notes,
          meal_entry_items (
            id,
            name_snapshot,
            unit_type,
            quantity,
            kcal_total,
            is_healthy_snapshot
          )
        `
        )
        .eq("user_id", userId)
        .gte("entry_at", start.toISOString())
        .order("entry_at", { ascending: false });

      if (error) {
        setTodayEntries([]);
        return;
      }

      setTodayEntries(Array.isArray(data) ? data : []);
    } catch {
      setTodayEntries([]);
    }
  };

  const loadData = async (mountedFlag = true) => {
    setIsLoading(true);

    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;

    if (!user) {
      window.location.href = `/login?next=${encodeURIComponent("/alimentacao")}`;
      return;
    }

    let prof = null;

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, role, plano_ativo, rank, xp_total, metas_concluidas, dias_consecutivos, objetivo, basal_kcal")
        .eq("id", user.id)
        .maybeSingle();

      if (!error) prof = data;
    } catch {
      prof = null;
    }

    if (!prof) {
      try {
        const { data: created, error: upsertErr } = await supabase
          .from("profiles")
          .upsert({ id: user.id, rank: "Iniciante", xp_total: 0, metas_concluidas: 0, dias_consecutivos: 0 }, { onConflict: "id" })
          .select("id, role, plano_ativo, rank, xp_total, metas_concluidas, dias_consecutivos, objetivo, basal_kcal")
          .single();

        if (!upsertErr) prof = created;
      } catch {
        prof = { id: user.id, rank: "Iniciante", xp_total: 0, metas_concluidas: 0, dias_consecutivos: 0 };
      }
    }

    if (mountedFlag) setProfile(prof);

    const meals = await safeSelect("meal_logs", (q) => q.eq("user_id", user.id).order("created_at", { ascending: false }).limit(60));
    const acts = await safeSelect("activity_logs", (q) => q.eq("user_id", user.id).order("created_at", { ascending: false }).limit(60));

    let colesterol = await safeSelect("cholesterol_records", (q) => q.eq("user_id", user.id).order("record_date", { ascending: false }).limit(5));
    if (!colesterol || colesterol.length === 0) {
      colesterol = await safeSelect("colesterol_records", (q) => q.eq("user_id", user.id).order("data_exame", { ascending: false }).limit(5));
    }

    if (mountedFlag) {
      setMealLogs(meals);
      setActivities(acts);
      setColesterolRecords(colesterol);
      setLocalDoneSet(readLocalDoneSet(day));
    }

    await loadTodayEntries(user.id);

    if (mountedFlag) setIsLoading(false);
  };

  const isUnlocked = (receita) => {
    const userRankIndex = rankOrder.indexOf(profile?.rank || "Iniciante");
    const requiredRankIndex = rankOrder.indexOf(receita.rank_required);
    return userRankIndex >= requiredRankIndex;
  };

  const completedTodaySet = useMemo(() => {
    const set = new Set();

    const todaysMeals = Array.isArray(mealLogs) ? mealLogs.filter((m) => sameDay(m?.date || m?.created_at, day)) : [];

    for (const m of todaysMeals) {
      const desc = (m?.description || "").trim();
      if (!desc) continue;
      const found = receitas.find((r) => r.name === desc);
      if (found) set.add(found.id);
    }

    for (const id of localDoneSet) set.add(id);
    return set;
  }, [mealLogs, localDoneSet, day]);

  const isCompletedToday = (receita) => completedTodaySet.has(receita.id);

  const sortedReceitas = useMemo(() => {
    return [...receitas].sort((a, b) => {
      const aDone = completedTodaySet.has(a.id) ? 1 : 0;
      const bDone = completedTodaySet.has(b.id) ? 1 : 0;
      if (aDone !== bDone) return aDone - bDone;

      const ar = rankOrder.indexOf(a.rank_required);
      const br = rankOrder.indexOf(b.rank_required);
      if (ar !== br) return ar - br;

      return (a.xp || 0) - (b.xp || 0);
    });
  }, [completedTodaySet]);

  /* =========================
     BUSCA: foods + custom
  ========================= */
  async function searchFoods(q) {
    const query = String(q || "").trim();
    if (query.length < 2) {
      setFoodResults([]);
      return;
    }

    setFoodSearching(true);
    try {
      const userId = profile?.id;
      let combined = [];

      // 1) tenta RPC search_food (global)
      try {
        const { data, error } = await supabase.rpc("search_food", { q: query });
        if (!error && Array.isArray(data)) {
          combined = combined.concat(
            data.slice(0, 8).map((row) => ({
              ...row,
              _source: "global",
              _displayName: row.canonical_name || row.name,
              _kcal100: getFoodKcalPer100(row),
              _unit: getFoodUnitType(row),
              _healthy: row.is_healthy,
            }))
          );
        }
      } catch {
        // ignora
      }

      // 2) fallback foods (se RPC falhou ou veio vazio)
      if (combined.length === 0) {
        const { data, error } = await supabase
          .from("foods")
          .select("id, canonical_name, kcal_per_100g, is_healthy")
          .ilike("canonical_name", `%${query}%`)
          .order("canonical_name", { ascending: true })
          .limit(8);

        if (!error && Array.isArray(data)) {
          combined = combined.concat(
            data.map((row) => ({
              ...row,
              _source: "global",
              _displayName: row.canonical_name,
              _kcal100: getFoodKcalPer100(row),
              _unit: "g",
              _healthy: row.is_healthy,
            }))
          );
        }
      }

      // 3) busca também no custom do usuário (pra ficar eficiente)
      if (userId) {
        const { data: customData, error: customErr } = await supabase
          .from("user_custom_foods")
          .select("id, name, unit_type, kcal_per_100, kcal_per_unit")
          .eq("user_id", userId)
          .ilike("name", `%${query}%`)
          .order("name", { ascending: true })
          .limit(8);

        if (!customErr && Array.isArray(customData)) {
          combined = combined.concat(
            customData.map((row) => ({
              ...row,
              _source: "custom",
              _displayName: row.name,
              _kcal100: Number(row.kcal_per_100 || 0),
              _unit: row.unit_type || "g",
              _healthy: null, // não existe no schema custom atual; tratamos depois
            }))
          );
        }
      }

      // remove duplicados por nome (best-effort)
      const seen = new Set();
      const final = [];
      for (const r of combined) {
        const key = String(r._displayName || "").toLowerCase();
        if (!key) continue;
        if (seen.has(key)) continue;
        seen.add(key);
        final.push(r);
        if (final.length >= 10) break;
      }

      setFoodResults(final);
    } catch {
      setFoodResults([]);
    } finally {
      setFoodSearching(false);
    }
  }

  useEffect(() => {
    const t = setTimeout(() => {
      searchFoods(foodQuery);
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [foodQuery]);

  function addFoodToCart(row) {
    const name = row?._displayName || row?.canonical_name || row?.name || "";
    if (!name) return;

    const unit_type = row?._unit || getFoodUnitType(row);
    const kcal_per_100 = row?._kcal100 ?? getFoodKcalPer100(row);

    const defaultQty = unit_type === "unit" ? 1 : 100;

    const item = {
      key: `${row.id}-${Date.now()}`,
      food_id: row._source === "global" ? row.id : null,
      custom_food_id: row._source === "custom" ? row.id : null,
      name,
      unit_type,
      quantity: defaultQty,
      kcal_per_100,
      // saudável:
      // - global: vem de foods.is_healthy
      // - custom: a gente vai permitir salvar saudável quando criar (aqui pode vir null)
      is_healthy: typeof row.is_healthy === "boolean" ? row.is_healthy : null,
      is_custom: row._source === "custom",
    };

    item.kcal_total = calcItemKcalTotal(item);

    setCartItems((prev) => [...prev, item]);
    setFoodQuery("");
    setFoodResults([]);
    setShowCreateCustom(false);
  }

  function updateCartQty(itemKey, nextQtyStr) {
    const nextQty = Number(String(nextQtyStr || "").replace(",", "."));
    setCartItems((prev) =>
      prev.map((it) => {
        if (it.key !== itemKey) return it;
        const updated = { ...it, quantity: Number.isFinite(nextQty) ? nextQty : it.quantity };
        updated.kcal_total = calcItemKcalTotal(updated);
        return updated;
      })
    );
  }

  function removeCartItem(itemKey) {
    setCartItems((prev) => prev.filter((it) => it.key !== itemKey));
  }

  const cartTotalKcal = useMemo(() => {
    return Math.round((cartItems || []).reduce((sum, it) => sum + (Number(it.kcal_total || 0) || 0), 0));
  }, [cartItems]);

  const mealIsHealthy = useMemo(() => {
    if (!cartItems || cartItems.length === 0) return false;
    // regra por enquanto: só é saudável se TODOS os itens do catálogo forem saudáveis e nenhum item desconhecido existir.
    // itens custom (sem is_healthy) contam como "desconhecido" => não dá XP.
    return cartItems.every((it) => it.is_healthy === true);
  }, [cartItems]);

  const customMealXpPreview = useMemo(() => {
    return computeCustomMealXp({
      isHealthy: mealIsHealthy,
      calories: cartTotalKcal,
      targetCalories: Number(profile?.basal_kcal || 2000),
    });
  }, [mealIsHealthy, cartTotalKcal, profile?.basal_kcal]);

  /* =========================
     CRIAR ALIMENTO PERSONALIZADO (inline)
  ========================= */
  const openCreateCustom = () => {
    const base = String(foodQuery || "").trim();
    setCustomName(base);
    setCustomUnitType("g");
    setCustomKcalPer100("");
    setCustomIsHealthy(true);
    setShowCreateCustom(true);
  };

  const createCustomFood = async () => {
    if (!profile?.id) return;
    const name = String(customName || "").trim();
    if (!name) return;

    const kcal100 = Number(String(customKcalPer100 || "").replace(",", "."));
    if (!Number.isFinite(kcal100) || kcal100 <= 0) {
      alert("Informe as calorias por 100g (ex: 165).");
      return;
    }

    setCreatingCustom(true);
    try {
      // Schema atual user_custom_foods não tem is_healthy.
      // Então: salvamos custom e ele entra no carrinho como "desconhecido" (sem XP).
      // Se você quiser XP também para custom, eu te mando um SQL curto pra adicionar a coluna is_healthy e pronto.
      const { data, error } = await supabase
        .from("user_custom_foods")
        .insert({
          user_id: profile.id,
          name,
          unit_type: customUnitType,
          kcal_per_100: kcal100,
          kcal_per_unit: null,
        })
        .select()
        .single();

      if (error || !data?.id) {
        console.error(error);
        alert("Erro ao criar alimento personalizado. Veja o console.");
        return;
      }

      // adiciona no carrinho imediatamente
      addFoodToCart({
        id: data.id,
        _source: "custom",
        _displayName: data.name,
        _kcal100: Number(data.kcal_per_100 || 0),
        _unit: data.unit_type || "g",
        is_healthy: null,
      });

      setShowCreateCustom(false);
    } finally {
      setCreatingCustom(false);
    }
  };

  /* =========================
     FLUXO ANALISAR FOTO (mantido)
  ========================= */
  const startAnalyzeFlow = () => {
    setFlowMode("analyze");
    setPhotoFile(null);
    setPhotoPreview(null);
    setShowPickerModal(true);
  };

  const onPickedFile = (file) => {
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setPhotoPreview(reader.result);
    reader.readAsDataURL(file);

    setShowPickerModal(false);
    setShowAnalyzeModal(true);
  };

  const analyzeFood = async () => {
    setAnalyzing(true);
    try {
      alert(
        "Nesta versão, a análise automática por foto está desativada.\n\n" +
          "Use: Registrar alimentação (manual)\n" +
          "O app calcula calorias e decide saudável automaticamente."
      );
    } finally {
      setAnalyzing(false);
    }
  };

  /* =========================
     RECEITAS (mantido)
  ========================= */
  const completeReceita = async (receita) => {
    if (!profile?.id) return;

    if (isCompletedToday(receita)) {
      setSelectedReceita(null);
      return;
    }

    setCompleting(true);

    const nextLocal = new Set(localDoneSet);
    nextLocal.add(receita.id);
    setLocalDoneSet(nextLocal);
    writeLocalDoneSet(day, nextLocal);

    try {
      try {
        await supabase.from("meal_logs").insert({
          user_id: profile.id,
          description: receita.name,
          calories: receita.calories,
          is_healthy: true,
          ai_feedback: `Receita saudável: ${receita.benefit}`,
          date: day,
        });
      } catch {}

      try {
        await supabase.from("activity_logs").insert({
          user_id: profile.id,
          tipo: "alimentacao",
          descricao: `Preparou: ${receita.name}`,
          xp_ganho: receita.xp,
          data: day,
        });
      } catch {}

      const currentXp = Number(profile?.xp_total || 0);
      const currentMetas = Number(profile?.metas_concluidas || 0);

      const newXp = currentXp + (receita.xp || 0);
      const newMetas = currentMetas + 1;
      const newRank = computeRankFromXp(newXp);

      try {
        await supabase.from("profiles").update({ xp_total: newXp, metas_concluidas: newMetas, rank: newRank }).eq("id", profile.id);
      } catch {}

      setProfile({ ...profile, xp_total: newXp, metas_concluidas: newMetas, rank: newRank });

      await loadData(true);
      setSelectedReceita(null);
    } finally {
      setCompleting(false);
    }
  };

  /* =========================
     SALVAR REFEIÇÃO (meal_entries + items)
  ========================= */
  const registerMealEntry = async () => {
    if (!profile?.id) return;
    if (!cartItems || cartItems.length === 0) return;

    const totalKcal = cartTotalKcal;

    const xp = computeCustomMealXp({
      isHealthy: mealIsHealthy,
      calories: totalKcal,
      targetCalories: Number(profile?.basal_kcal || 2000),
    });

    setRegistering(true);
    try {
      const { data: entry, error: entryErr } = await supabase
        .from("meal_entries")
        .insert({
          user_id: profile.id,
          entry_at: entryAt,
          meal_type: mealType,
          source: "manual",
          notes: null,
        })
        .select()
        .single();

      if (entryErr || !entry?.id) {
        console.error(entryErr);
        alert("Erro ao salvar refeição (meal_entries). Veja o console.");
        return;
      }

      const itemsToInsert = cartItems.map((it) => ({
        meal_entry_id: entry.id,
        food_id: it.food_id,
        custom_food_id: it.custom_food_id,
        name_snapshot: it.name,
        unit_type: it.unit_type,
        quantity: it.quantity,
        kcal_per_100_snapshot: it.unit_type === "g" || it.unit_type === "ml" ? it.kcal_per_100 : null,
        kcal_total: Math.round(Number(it.kcal_total || 0)),
        is_healthy_snapshot: it.is_healthy === true ? true : it.is_healthy === false ? false : null,
      }));

      const { error: itemsErr } = await supabase.from("meal_entry_items").insert(itemsToInsert);
      if (itemsErr) {
        console.error(itemsErr);
        alert("Erro ao salvar itens (meal_entry_items). Veja o console.");
        return;
      }

      // compat com seu dashboard atual
      try {
        const desc = cartItems.map((it) => it.name).slice(0, 4).join(", ") + (cartItems.length > 4 ? "..." : "");
        await supabase.from("meal_logs").insert({
          user_id: profile.id,
          description: desc || "Refeição registrada",
          calories: totalKcal || 0,
          is_healthy: Boolean(mealIsHealthy),
          ai_feedback: null,
          date: day,
        });
      } catch {}

      try {
        await supabase.from("activity_logs").insert({
          user_id: profile.id,
          tipo: "alimentacao",
          descricao: `Registrou refeição (${mealType})`,
          xp_ganho: xp,
          data: day,
        });
      } catch {}

      const currentXp = Number(profile?.xp_total || 0);
      const currentMetas = Number(profile?.metas_concluidas || 0);

      const newXp = currentXp + xp;
      const newMetas = currentMetas + 1;
      const newRank = computeRankFromXp(newXp);

      try {
        await supabase.from("profiles").update({ xp_total: newXp, metas_concluidas: newMetas, rank: newRank }).eq("id", profile.id);
      } catch {}

      setProfile({ ...profile, xp_total: newXp, metas_concluidas: newMetas, rank: newRank });

      // reset
      setShowRegisterModal(false);
      setMealType("almoco");
      setEntryAt(nowLocalISO());
      setFoodQuery("");
      setFoodResults([]);
      setCartItems([]);
      setShowCreateCustom(false);

      await loadData(true);
    } finally {
      setRegistering(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-rose-50">
      <div className="max-w-lg mx-auto px-4 pt-6 pb-24">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => (window.location.href = createPageUrl("Dashboard"))}
            className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Alimentação</h1>
            <p className="text-sm text-gray-500">Registre suas refeições e ganhe XP</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white rounded-xl p-3 border border-gray-100 text-center">
            <Zap className="w-5 h-5 text-yellow-500 mx-auto mb-1" />
            <div className="font-bold text-gray-900">{profile?.xp_total || 0}</div>
            <div className="text-xs text-gray-500">XP Total</div>
          </div>
          <div className="bg-white rounded-xl p-3 border border-gray-100 text-center">
            <Trophy className="w-5 h-5 text-amber-500 mx-auto mb-1" />
            <div className="font-bold text-gray-900">{profile?.rank || "Iniciante"}</div>
            <div className="text-xs text-gray-500">Seu Rank</div>
          </div>
          <div className="bg-white rounded-xl p-3 border border-gray-100 text-center">
            <Salad className="w-5 h-5 text-green-500 mx-auto mb-1" />
            <div className="font-bold text-gray-900">{sortedReceitas.filter((r) => isUnlocked(r)).length}</div>
            <div className="text-xs text-gray-500">Receitas liberadas</div>
          </div>
        </div>

        {/* Dashboard de Calorias (mantido) */}
        <CaloriesDashboard mealLogs={mealLogs} basalRate={profile?.basal_kcal || 2000} />

        {/* Botões */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <Button
            onClick={startAnalyzeFlow}
            className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white py-5 rounded-xl shadow-md"
          >
            <Camera className="w-5 h-5 mr-2" />
            Avaliar refeição
          </Button>

          <Button
            onClick={() => {
              setShowRegisterModal(true);
              setMealType("almoco");
              setEntryAt(nowLocalISO());
              setFoodQuery("");
              setFoodResults([]);
              setCartItems([]);
              setShowCreateCustom(false);
              setCustomName("");
              setCustomKcalPer100("");
              setCustomUnitType("g");
              setCustomIsHealthy(true);
            }}
            className="bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white py-5 rounded-xl shadow-md"
          >
            <Plus className="w-5 h-5 mr-2" />
            Registrar alimentação
          </Button>
        </div>

        {/* Refeições de hoje */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold text-gray-900">Minhas refeições de hoje</h2>
            <span className="text-xs text-gray-500">{todayEntries?.length || 0} registro(s)</span>
          </div>

          {(!todayEntries || todayEntries.length === 0) ? (
            <div className="text-sm text-gray-500">Você ainda não registrou refeições hoje.</div>
          ) : (
            <div className="space-y-3">
              {todayEntries.map((e) => (
                <div key={e.id} className="rounded-xl border border-gray-100 p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-gray-900">
                      {String(e.meal_type || "refeicao").toUpperCase()}
                      <span className="ml-2 text-xs font-normal text-gray-500">{String(e.entry_at || "").slice(11, 16)}</span>
                    </div>
                    <div className="text-sm font-bold text-orange-600">{Math.round(Number(e.total_kcal || 0))} kcal</div>
                  </div>

                  <div className="mt-2 space-y-1">
                    {(e.meal_entry_items || []).map((it) => (
                      <div key={it.id} className="flex items-center justify-between text-xs text-gray-600">
                        <span className="truncate max-w-[70%]">{it.name_snapshot}</span>
                        <span className="flex items-center gap-2">
                          <span className="text-gray-500">
                            {Number(it.quantity || 0)}
                            {it.unit_type === "g" ? "g" : it.unit_type === "ml" ? "ml" : ""}
                          </span>
                          <span className="text-gray-700 font-medium">{Math.round(Number(it.kcal_total || 0))} kcal</span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full border ${
                              it.is_healthy_snapshot === true
                                ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                                : it.is_healthy_snapshot === false
                                ? "bg-red-50 border-red-200 text-red-700"
                                : "bg-gray-50 border-gray-200 text-gray-600"
                            }`}
                          >
                            {it.is_healthy_snapshot === true ? "Saudável" : it.is_healthy_snapshot === false ? "Não" : "N/A"}
                          </span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Botão análises */}
        <Button
          onClick={() => setShowAnalytics(!showAnalytics)}
          variant="outline"
          className="w-full mb-6 border-2 border-purple-200 hover:bg-purple-50 text-purple-700 py-5 rounded-xl"
        >
          <BarChart3 className="w-5 h-5 mr-2" />
          {showAnalytics ? "Ocultar" : "Ver"} Análises
        </Button>

        {showAnalytics && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="space-y-4 mb-6">
            <CaloriesChart mealLogs={mealLogs} />
            <AIInsights
              profile={profile}
              activities={(activities || []).filter((a) => a.tipo === "alimentacao")}
              colesterolRecords={colesterolRecords}
              mealLogs={mealLogs}
            />
          </motion.div>
        )}

        {/* Lista de Receitas */}
        <h2 className="font-semibold text-gray-900 mb-4">Receitas Saudáveis</h2>
        <div className="space-y-3">
          {sortedReceitas.map((receita, idx) => {
            const unlocked = isUnlocked(receita);
            const done = isCompletedToday(receita);

            return (
              <motion.div key={receita.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.03 }}>
                <button
                  onClick={() => unlocked && setSelectedReceita(receita)}
                  disabled={!unlocked}
                  className={`w-full text-left bg-white rounded-2xl p-4 border transition-all ${
                    unlocked ? "border-red-100 hover:border-red-300 hover:shadow-md cursor-pointer" : "border-gray-200 opacity-60 cursor-not-allowed"
                  } ${done ? "opacity-70" : ""}`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-3xl ${unlocked ? "bg-red-50" : "bg-gray-100"}`}>
                      {unlocked ? receita.image : <Lock className="w-6 h-6 text-gray-400" />}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div className="font-semibold text-gray-900">{receita.name}</div>
                        {done && (
                          <span className="inline-flex items-center gap-1 text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-100">
                            <Check className="w-3 h-3" />
                            Concluída hoje
                          </span>
                        )}
                      </div>

                      <div className="text-sm text-gray-500">{receita.desc}</div>

                      <div className="flex items-center gap-3 mt-2 text-xs">
                        <span className="flex items-center gap-1 text-gray-400">
                          <Clock className="w-3 h-3" /> {receita.time} min
                        </span>
                        <span className="flex items-center gap-1 text-orange-500">
                          <Flame className="w-3 h-3" /> {receita.calories} kcal
                        </span>
                        <span className={`flex items-center gap-1 ${done ? "text-gray-300" : "text-yellow-500"}`}>
                          <Zap className="w-3 h-3" /> +{receita.xp} XP
                        </span>
                      </div>
                    </div>

                    {unlocked ? <ChevronRight className="w-5 h-5 text-gray-400" /> : <div className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-lg">{receita.rank_required}</div>}
                  </div>
                </button>
              </motion.div>
            );
          })}
        </div>

        {/* Modal picker analyze */}
        <AnimatePresence>
          {showPickerModal && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setShowPickerModal(false)}>
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-3xl w-full max-w-sm p-6"
              >
                <h3 className="text-xl font-bold text-gray-900 mb-2 text-center">Avaliar Refeição</h3>
                <p className="text-sm text-gray-500 mb-6 text-center">Escolha a origem da imagem</p>

                <div className="space-y-3">
                  <Button
                    onClick={() => openImagePicker({ source: "camera", onFile: onPickedFile })}
                    className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white py-5 rounded-xl flex items-center justify-center gap-3"
                  >
                    <Camera className="w-6 h-6" />
                    <div className="text-left">
                      <div className="font-semibold">Tirar Foto Agora</div>
                      <div className="text-xs opacity-90">Abrir câmera</div>
                    </div>
                  </Button>

                  <Button
                    onClick={() => openImagePicker({ source: "gallery", onFile: onPickedFile })}
                    variant="outline"
                    className="w-full border-2 border-gray-200 hover:bg-gray-50 py-5 rounded-xl flex items-center justify-center gap-3"
                  >
                    <Upload className="w-6 h-6" />
                    <div className="text-left">
                      <div className="font-semibold">Escolher da Galeria</div>
                      <div className="text-xs text-gray-500">Selecionar foto existente</div>
                    </div>
                  </Button>
                </div>

                <Button onClick={() => setShowPickerModal(false)} variant="ghost" className="w-full mt-4 text-gray-500">
                  Cancelar
                </Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modal analyze */}
        <AnimatePresence>
          {showAnalyzeModal && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => !analyzing && setShowAnalyzeModal(false)}>
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-3xl w-full max-w-md overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900">Avaliar Refeição</h3>
                    {!analyzing && (
                      <button onClick={() => setShowAnalyzeModal(false)} className="text-gray-400 hover:text-gray-600">
                        <X className="w-6 h-6" />
                      </button>
                    )}
                  </div>

                  {photoPreview && (
                    <div className="mb-4 rounded-xl overflow-hidden">
                      <img src={photoPreview} alt="Prévia" className="w-full h-64 object-cover" />
                    </div>
                  )}

                  <div className="bg-blue-50 rounded-xl p-4 mb-4">
                    <div className="flex items-start gap-2 text-sm text-blue-700">
                      <Heart className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      <p>
                        Aqui é só para tirar dúvida. Não ganha XP.
                        <br />
                        (Na versão atual, a IA por foto está desativada.)
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Button
                      onClick={analyzeFood}
                      disabled={analyzing}
                      className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white py-5 rounded-xl text-lg font-semibold"
                    >
                      {analyzing ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Analisando...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <Zap className="w-5 h-5" />
                          Avaliar Agora
                        </span>
                      )}
                    </Button>

                    <Button
                      onClick={() => {
                        setShowAnalyzeModal(false);
                        setShowRegisterModal(true);
                        setMealType("almoco");
                        setEntryAt(nowLocalISO());
                        setFoodQuery("");
                        setFoodResults([]);
                        setCartItems([]);
                        setShowCreateCustom(false);
                      }}
                      variant="outline"
                      className="w-full border-2 border-red-200 hover:bg-red-50 py-5 rounded-xl"
                    >
                      Registrar alimentação (manual)
                    </Button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modal registrar */}
        <AnimatePresence>
          {showRegisterModal && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => !registering && setShowRegisterModal(false)}>
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-3xl w-full max-w-md overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900">Registrar Alimentação</h3>
                    {!registering && (
                      <button onClick={() => setShowRegisterModal(false)} className="text-gray-400 hover:text-gray-600">
                        <X className="w-6 h-6" />
                      </button>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Tipo de refeição</label>
                      <select
                        value={mealType}
                        onChange={(e) => setMealType(e.target.value)}
                        className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-red-200 bg-white"
                      >
                        <option value="cafe">Café da manhã</option>
                        <option value="almoco">Almoço</option>
                        <option value="lanche">Lanche</option>
                        <option value="jantar">Jantar</option>
                        <option value="ceia">Ceia</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-700">Buscar alimento</label>
                      <input
                        value={foodQuery}
                        onChange={(e) => {
                          setFoodQuery(e.target.value);
                          setShowCreateCustom(false);
                        }}
                        placeholder="Ex: aveia, cereal, frango..."
                        className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-red-200"
                      />

                      {(foodSearching || foodResults.length > 0 || (foodQuery || "").trim().length >= 2) && (
                        <div className="mt-2 rounded-xl border border-gray-200 bg-white overflow-hidden">
                          {foodSearching && <div className="px-3 py-2 text-xs text-gray-500">Buscando…</div>}

                          {!foodSearching && foodResults.length === 0 && (foodQuery || "").trim().length >= 2 && (
                            <div className="px-3 py-2 text-xs text-gray-600">
                              Não encontrei esse alimento.
                              <div className="mt-2">
                                <Button
                                  type="button"
                                  onClick={openCreateCustom}
                                  variant="outline"
                                  className="w-full border-2 border-red-200 hover:bg-red-50 rounded-xl"
                                >
                                  Criar alimento: “{String(foodQuery || "").trim()}”
                                </Button>
                              </div>
                            </div>
                          )}

                          {!foodSearching &&
                            foodResults.map((r) => (
                              <button
                                key={`${r._source}-${r.id}`}
                                type="button"
                                onClick={() => addFoodToCart(r)}
                                className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center justify-between"
                              >
                                <div className="min-w-0">
                                  <div className="text-sm text-gray-900 font-medium truncate">
                                    {r._displayName}
                                    {r._source === "custom" && (
                                      <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full border bg-purple-50 border-purple-200 text-purple-700">
                                        Meu
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {Number(r._kcal100 || 0)} kcal / 100{r._unit === "ml" ? "ml" : "g"}
                                  </div>
                                </div>

                                {r._source === "global" ? (
                                  <span
                                    className={`text-[11px] px-2 py-1 rounded-full border ${
                                      r.is_healthy ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-red-50 border-red-200 text-red-700"
                                    }`}
                                  >
                                    {r.is_healthy ? "Saudável" : "Não saudável"}
                                  </span>
                                ) : (
                                  <span className="text-[11px] px-2 py-1 rounded-full border bg-gray-50 border-gray-200 text-gray-700">
                                    Personalizado
                                  </span>
                                )}
                              </button>
                            ))}
                        </div>
                      )}
                    </div>

                    {/* Criar alimento inline */}
                    {showCreateCustom && (
                      <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                        <div className="text-sm font-semibold text-gray-900 mb-2">Criar alimento personalizado</div>

                        <div className="space-y-2">
                          <div>
                            <label className="text-xs font-medium text-gray-700">Nome</label>
                            <input
                              value={customName}
                              onChange={(e) => setCustomName(e.target.value)}
                              className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-200 bg-white"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-xs font-medium text-gray-700">Unidade</label>
                              <select
                                value={customUnitType}
                                onChange={(e) => setCustomUnitType(e.target.value)}
                                className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-200 bg-white"
                              >
                                <option value="g">g</option>
                                <option value="ml">ml</option>
                              </select>
                            </div>

                            <div>
                              <label className="text-xs font-medium text-gray-700">Kcal por 100</label>
                              <input
                                value={customKcalPer100}
                                onChange={(e) => setCustomKcalPer100(e.target.value.replace(/[^\d.,]/g, ""))}
                                placeholder="Ex: 165"
                                inputMode="decimal"
                                className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-200 bg-white"
                              />
                            </div>
                          </div>

                          <div className="flex gap-2 pt-1">
                            <Button
                              type="button"
                              onClick={createCustomFood}
                              disabled={creatingCustom}
                              className="flex-1 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white rounded-xl"
                            >
                              {creatingCustom ? (
                                <span className="flex items-center gap-2">
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  Salvando...
                                </span>
                              ) : (
                                "Salvar alimento"
                              )}
                            </Button>
                            <Button
                              type="button"
                              onClick={() => setShowCreateCustom(false)}
                              variant="outline"
                              className="rounded-xl border-2 border-gray-200 hover:bg-white"
                            >
                              Cancelar
                            </Button>
                          </div>

                          <div className="text-[11px] text-gray-600">
                            Dica: você pode criar em 10s e usar sempre depois. (Isso torna o app rápido no dia a dia.)
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Carrinho */}
                    <div className="rounded-2xl border border-gray-200 p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm font-semibold text-gray-900">Itens da refeição</div>
                        <div className="text-sm font-bold text-orange-600">{cartTotalKcal} kcal</div>
                      </div>

                      {cartItems.length === 0 ? (
                        <div className="text-xs text-gray-500">Adicione pelo menos 1 alimento.</div>
                      ) : (
                        <div className="space-y-2">
                          {cartItems.map((it) => (
                            <div key={it.key} className="flex items-center gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-gray-900 truncate">{it.name}</div>
                                <div className="text-xs text-gray-500">
                                  {it.is_custom ? "Personalizado" : it.is_healthy === true ? "Saudável ✅" : "Não saudável ⚠️"}
                                  {it.is_healthy == null && it.is_custom && " (não conta XP ainda)"}
                                </div>
                              </div>

                              <div className="w-28">
                                <input
                                  value={String(it.quantity)}
                                  onChange={(e) => updateCartQty(it.key, e.target.value)}
                                  className="w-full border border-gray-200 rounded-xl px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-red-200"
                                  inputMode="decimal"
                                />
                                <div className="text-[10px] text-gray-500 text-center mt-0.5">{it.unit_type === "ml" ? "ml" : it.unit_type === "g" ? "g" : "un"}</div>
                              </div>

                              <div className="w-16 text-right">
                                <div className="text-sm font-semibold text-gray-900">{Math.round(Number(it.kcal_total || 0))}</div>
                                <div className="text-[10px] text-gray-500">kcal</div>
                              </div>

                              <button
                                type="button"
                                onClick={() => removeCartItem(it.key)}
                                className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center hover:bg-gray-50"
                              >
                                <X className="w-4 h-4 text-gray-500" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* XP */}
                    <div
                      className={`rounded-xl p-3 text-sm border flex items-center justify-between ${
                        mealIsHealthy ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-yellow-50 border-yellow-200 text-yellow-800"
                      }`}
                    >
                      <span>XP ao registrar</span>
                      <span className="font-bold">+{customMealXpPreview} XP</span>
                    </div>

                    {!mealIsHealthy && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-sm text-yellow-800">
                        Para ganhar XP, a refeição precisa ser saudável (somente itens “Saudável ✅” do catálogo). Itens personalizados ainda não contam XP nesta versão.
                      </div>
                    )}

                    <Button
                      onClick={registerMealEntry}
                      disabled={registering || cartItems.length === 0}
                      className="w-full bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white py-5 rounded-xl text-lg font-semibold disabled:opacity-70"
                    >
                      {registering ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Salvando...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <Check className="w-5 h-5" />
                          Salvar refeição (+{customMealXpPreview} XP)
                        </span>
                      )}
                    </Button>

                    <Button onClick={() => setShowRegisterModal(false)} variant="ghost" className="w-full text-gray-500">
                      Cancelar
                    </Button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modal receita (mantido) */}
        <AnimatePresence>
          {selectedReceita && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 flex items-end justify-center z-50 p-4" onClick={() => setSelectedReceita(null)}>
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-t-3xl w-full max-w-lg max-h-[85vh] overflow-auto"
              >
                <div className="p-6">
                  <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-6" />
                  <div className="text-center mb-6">
                    <div className="text-6xl mb-3">{selectedReceita.image}</div>
                    <h2 className="text-xl font-bold text-gray-900">{selectedReceita.name}</h2>

                    <div className="flex items-center justify-center gap-4 text-sm text-gray-500 mt-2">
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" /> {selectedReceita.time} min
                      </span>
                      <span className="flex items-center gap-1 text-orange-500">
                        <Flame className="w-4 h-4" /> {selectedReceita.calories} kcal
                      </span>
                      <span className={`flex items-center gap-1 ${isCompletedToday(selectedReceita) ? "text-gray-300" : "text-yellow-500"}`}>
                        <Zap className="w-4 h-4" /> +{selectedReceita.xp} XP
                      </span>
                    </div>

                    <div className="inline-flex items-center gap-1 bg-red-50 text-red-600 px-3 py-1 rounded-full text-sm mt-2">
                      <Heart className="w-4 h-4" />
                      {selectedReceita.benefit}
                    </div>

                    {isCompletedToday(selectedReceita) && (
                      <div className="mt-3 inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-sm border border-emerald-100">
                        <Check className="w-4 h-4" />
                        Você já concluiu esta receita hoje ✅
                      </div>
                    )}
                  </div>

                  <h3 className="font-semibold text-gray-900 mb-3">Ingredientes</h3>
                  <div className="bg-gray-50 rounded-xl p-4 mb-4">
                    <ul className="space-y-2">
                      {selectedReceita.ingredients.map((ing, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-sm text-gray-700">
                          <Check className="w-4 h-4 text-emerald-500" />
                          {ing}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <h3 className="font-semibold text-gray-900 mb-3">Modo de Preparo</h3>
                  <div className="space-y-3 mb-6">
                    {selectedReceita.steps.map((step, idx) => (
                      <div key={idx} className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">{idx + 1}</div>
                        <p className="text-sm text-gray-700">{step}</p>
                      </div>
                    ))}
                  </div>

                  <Button
                    onClick={() => completeReceita(selectedReceita)}
                    disabled={completing || isCompletedToday(selectedReceita)}
                    className={`w-full py-6 rounded-xl text-lg font-semibold ${
                      isCompletedToday(selectedReceita)
                        ? "bg-gray-200 text-gray-500 hover:bg-gray-200 cursor-not-allowed"
                        : "bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white"
                    }`}
                  >
                    {completing ? (
                      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} className="w-6 h-6 border-2 border-white border-t-transparent rounded-full" />
                    ) : isCompletedToday(selectedReceita) ? (
                      <>
                        <Check className="w-5 h-5 mr-2" />
                        Concluída hoje
                      </>
                    ) : (
                      <>
                        <Check className="w-5 h-5 mr-2" />
                        Preparei esta receita (+{selectedReceita.xp} XP)
                      </>
                    )}
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
