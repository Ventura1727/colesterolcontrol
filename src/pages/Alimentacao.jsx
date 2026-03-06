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
  PencilLine,
  Info,
  ScanSearch,
  Sparkles,
  Apple,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { createPageUrl } from "@/utils";
import CaloriesChart from "@/components/analytics/CaloriesChart";
import AIInsights from "@/components/analytics/AIInsights";
import CaloriesDashboard from "@/components/nutrition/CaloriesDashboard";
import { supabase } from "@/lib/supabaseClient";
import { loadFoodCatalog, searchFoodsHybrid, createUserCustomFood } from "@/lib/foodCatalog";

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
  return String(isoDatetimeOrDate).slice(0, 10) === dayYYYYMMDD;
}

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

function calcCaloriesFromKcalPer100(kcalPer100, portion) {
  const p = Number(portion || 0);
  const k100 = Number(kcalPer100 || 0);
  if (!Number.isFinite(p) || p <= 0) return 0;
  if (!Number.isFinite(k100) || k100 <= 0) return 0;
  return Math.round((k100 * p) / 100);
}

function buildPhotoFoodFallback(fileName = "") {
  const raw = String(fileName || "")
    .replace(/\.[^/.]+$/, "")
    .replace(/[_-]+/g, " ")
    .trim();

  return {
    guessedName: raw || "",
    confidence: 0,
    source: "fallback",
  };
}

async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    try {
      const reader = new FileReader();
      reader.onload = () => {
        const result = String(reader.result || "");
        const base64 = result.includes(",") ? result.split(",")[1] : result;
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    } catch (e) {
      reject(e);
    }
  });
}

async function tryAnalyzeFoodPhoto(file) {
  if (!file) return null;

  try {
    const base64 = await fileToBase64(file);
    const { data, error } = await supabase.functions.invoke("analyze-food-photo", {
      body: {
        image_base64: base64,
        mime_type: file.type || "image/jpeg",
        file_name: file.name || "image.jpg",
      },
    });

    if (!error && data) {
      const guessedName =
        data?.food_name ||
        data?.name ||
        data?.item ||
        data?.description ||
        "";

      if (guessedName) {
        return {
          guessedName: String(guessedName).trim(),
          confidence: Number(data?.confidence || 0),
          source: "edge_function",
        };
      }
    }
  } catch {}

  try {
    const form = new FormData();
    form.append("file", file);

    const res = await fetch("/api/analyze-food-photo", {
      method: "POST",
      body: form,
    });

    if (res.ok) {
      const data = await res.json();
      const guessedName =
        data?.food_name ||
        data?.name ||
        data?.item ||
        data?.description ||
        "";

      if (guessedName) {
        return {
          guessedName: String(guessedName).trim(),
          confidence: Number(data?.confidence || 0),
          source: "api_route",
        };
      }
    }
  } catch {}

  return buildPhotoFoodFallback(file?.name);
}

export default function Alimentacao() {
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const [catalog, setCatalog] = useState(null);
  const [catalogLoading, setCatalogLoading] = useState(true);

  const [selectedReceita, setSelectedReceita] = useState(null);
  const [completing, setCompleting] = useState(false);

  const [mealLogs, setMealLogs] = useState([]);
  const [activities, setActivities] = useState([]);
  const [colesterolRecords, setColesterolRecords] = useState([]);
  const [showAnalytics, setShowAnalytics] = useState(false);

  const day = useMemo(() => todayISODate(), []);
  const [localDoneSet, setLocalDoneSet] = useState(() => readLocalDoneSet(todayISODate()));

  const [entrySource, setEntrySource] = useState(null); // "text" | "photo" | null
  const [showSourceModal, setShowSourceModal] = useState(false);
  const [showFoodModal, setShowFoodModal] = useState(false);

  const [processingPhoto, setProcessingPhoto] = useState(false);

  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoAnalysisSource, setPhotoAnalysisSource] = useState(null);

  const [foodQuery, setFoodQuery] = useState("");
  const [foodResults, setFoodResults] = useState([]);
  const [foodSearching, setFoodSearching] = useState(false);
  const [foodSelected, setFoodSelected] = useState(null);

  const [portionValue, setPortionValue] = useState("100");
  const [portionUnit, setPortionUnit] = useState("g");

  const [showCreateInline, setShowCreateInline] = useState(false);
  const [createCategoryId, setCreateCategoryId] = useState("");
  const [showAdvancedCreate, setShowAdvancedCreate] = useState(false);
  const [createKcalPer100, setCreateKcalPer100] = useState("");

  const [submitLoading, setSubmitLoading] = useState(false);

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

  useEffect(() => {
    let ok = true;
    (async () => {
      setCatalogLoading(true);
      try {
        const cat = await loadFoodCatalog();
        if (ok) setCatalog(cat);
      } catch {
        if (ok) setCatalog(null);
      } finally {
        if (ok) setCatalogLoading(false);
      }
    })();
    return () => {
      ok = false;
    };
  }, []);

  useEffect(() => {
    const t = setTimeout(async () => {
      const q = String(foodQuery || "").trim();
      if (q.length < 2) {
        setFoodResults([]);
        setShowCreateInline(false);
        return;
      }

      setFoodSearching(true);
      try {
        const items = await searchFoodsHybrid({
          query: q,
          catalog,
          userId: profile?.id || null,
          limit: 8,
        });
        setFoodResults(items || []);
        setShowCreateInline((items || []).length === 0);
      } catch {
        setFoodResults([]);
        setShowCreateInline(true);
      } finally {
        setFoodSearching(false);
      }
    }, 250);

    return () => clearTimeout(t);
  }, [foodQuery, catalog, profile?.id]);

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

    const meals = await safeSelect("meal_logs", (q) => q.eq("user_id", user.id).order("created_at", { ascending: false }).limit(60));
    const acts = await safeSelect("activity_logs", (q) => q.eq("user_id", user.id).order("created_at", { ascending: false }).limit(60));

    let colesterol = await safeSelect("cholesterol_records", (q) => q.eq("user_id", user.id).order("record_date", { ascending: false }).limit(5));
    if (!colesterol || colesterol.length === 0) {
      colesterol = await safeSelect("colesterol_records", (q) => q.eq("user_id", user.id).order("data_exame", { ascending: false }).limit(5));
    }

    if (mountedFlag) {
      setProfile(prof);
      setMealLogs(meals);
      setActivities(acts);
      setColesterolRecords(colesterol);
      setLocalDoneSet(readLocalDoneSet(day));
      setIsLoading(false);
    }
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

  const todayMealsCount = useMemo(() => {
    return Array.isArray(mealLogs) ? mealLogs.filter((m) => sameDay(m?.date || m?.created_at, day)).length : 0;
  }, [mealLogs, day]);

  const derivedHealthy = useMemo(() => {
    if (foodSelected && typeof foodSelected.is_healthy === "boolean") return foodSelected.is_healthy;

    if (showCreateInline && createCategoryId && catalog?.categories?.length) {
      const cat = (catalog.categories || []).find((c) => String(c.id) === String(createCategoryId));
      if (cat && typeof cat.default_is_healthy === "boolean") return cat.default_is_healthy;
    }

    return false;
  }, [foodSelected, showCreateInline, createCategoryId, catalog]);

  const derivedKcalPer100 = useMemo(() => {
    if (foodSelected && Number(foodSelected.kcal_per_100g || 0) > 0) return Number(foodSelected.kcal_per_100g || 0);

    const advanced = Number(createKcalPer100 || 0);
    if (showCreateInline && advanced > 0) return advanced;

    if (showCreateInline && createCategoryId && catalog?.categories?.length) {
      const cat = (catalog.categories || []).find((c) => String(c.id) === String(createCategoryId));
      const def = Number(cat?.default_kcal_per_100g || 0);
      if (def > 0) return def;
    }

    return 0;
  }, [foodSelected, showCreateInline, createCategoryId, createKcalPer100, catalog]);

  const derivedCaloriesTotal = useMemo(() => {
    return calcCaloriesFromKcalPer100(derivedKcalPer100, portionValue);
  }, [derivedKcalPer100, portionValue]);

  const customMealXpPreview = useMemo(() => {
    return computeCustomMealXp({
      isHealthy: Boolean(derivedHealthy),
      calories: Number(derivedCaloriesTotal || 0),
      targetCalories: Number(profile?.basal_kcal || 2000),
    });
  }, [derivedHealthy, derivedCaloriesTotal, profile?.basal_kcal]);

  function resetFoodFlow() {
    setEntrySource(null);
    setShowSourceModal(false);
    setShowFoodModal(false);

    setPhotoFile(null);
    setPhotoPreview(null);
    setPhotoAnalysisSource(null);

    setFoodQuery("");
    setFoodResults([]);
    setFoodSelected(null);

    setPortionValue("100");
    setPortionUnit("g");

    setShowCreateInline(false);
    setCreateCategoryId("");
    setShowAdvancedCreate(false);
    setCreateKcalPer100("");

    setProcessingPhoto(false);
    setSubmitLoading(false);
  }

  function startRegisterFlow() {
    setEntrySource(null);
    setPhotoFile(null);
    setPhotoPreview(null);
    setPhotoAnalysisSource(null);
    setFoodQuery("");
    setFoodResults([]);
    setFoodSelected(null);
    setPortionValue("100");
    setPortionUnit("g");
    setShowCreateInline(false);
    setCreateCategoryId("");
    setShowAdvancedCreate(false);
    setCreateKcalPer100("");
    setShowSourceModal(true);
  }

  async function openRegisterBySource(source) {
    setEntrySource(source);
    setShowSourceModal(false);

    if (source === "text") {
      setShowFoodModal(true);
      return;
    }

    openImagePicker({
      source: "camera",
      onFile: onPickedFile,
    });
  }

  async function onPickedFile(file) {
    setPhotoFile(file);

    const reader = new FileReader();
    reader.onloadend = () => setPhotoPreview(reader.result);
    reader.readAsDataURL(file);

    setProcessingPhoto(true);

    try {
      const analysis = await tryAnalyzeFoodPhoto(file);

      if (analysis?.guessedName) {
        setFoodQuery(analysis.guessedName);
      } else {
        setFoodQuery("");
      }

      setPhotoAnalysisSource(analysis?.source || null);
      setShowFoodModal(true);
    } finally {
      setProcessingPhoto(false);
    }
  }

  function onSelectFood(item) {
    setFoodSelected(item);
    setFoodQuery(item?.name || "");
    setShowCreateInline(false);
    setCreateCategoryId("");
    setShowAdvancedCreate(false);
    setCreateKcalPer100("");
  }

  async function createAndSelectFood() {
    if (!profile?.id) return;

    const name = String(foodQuery || "").trim();
    if (!name) return;

    if (!createCategoryId) {
      alert("Selecione uma categoria para o app estimar calorias e decidir se é saudável.");
      return;
    }

    const cat = (catalog?.categories || []).find((c) => String(c.id) === String(createCategoryId));
    const kcalPer100 =
      Number(createKcalPer100 || 0) > 0 ? Number(createKcalPer100 || 0) : Number(cat?.default_kcal_per_100g || 0);
    const isHealthy = typeof cat?.default_is_healthy === "boolean" ? cat.default_is_healthy : false;

    setSubmitLoading(true);
    try {
      const row = await createUserCustomFood({
        userId: profile.id,
        name,
        kcalPer100g: kcalPer100,
        isHealthy,
      });

      const selected = {
        id: row?.id || `custom_${Date.now()}`,
        name: row?.food_name || row?.name || row?.canonical_name || name,
        kcal_per_100g: Number(row?.kcal_per_100g || kcalPer100 || 0),
        is_healthy: typeof row?.is_healthy === "boolean" ? row.is_healthy : isHealthy,
        source: "custom",
      };

      setFoodSelected(selected);
      setFoodQuery(selected.name);
      setShowCreateInline(false);
    } catch {
      alert("Não consegui criar esse alimento agora. Tente novamente.");
    } finally {
      setSubmitLoading(false);
    }
  }

  async function registerMeal() {
    if (!profile?.id) return;

    const desc = String(foodQuery || "").trim();
    if (!desc) return;

    const caloriesNum = Number(derivedCaloriesTotal || 0);
    const isHealthy = Boolean(derivedHealthy);

    const xp = computeCustomMealXp({
      isHealthy,
      calories: caloriesNum,
      targetCalories: Number(profile?.basal_kcal || 2000),
    });

    setSubmitLoading(true);

    try {
      try {
        await supabase.from("meal_logs").insert({
          user_id: profile.id,
          description: desc,
          calories: caloriesNum,
          is_healthy: isHealthy,
          ai_feedback: foodSelected
            ? `Base ${foodSelected.source === "custom" ? "pessoal" : "do app"}`
            : createCategoryId
            ? "Estimativa por categoria"
            : photoFile
            ? "Registro por foto com confirmação do usuário"
            : null,
          date: day,
        });
      } catch {}

      try {
        await supabase.from("activity_logs").insert({
          user_id: profile.id,
          tipo: "alimentacao",
          descricao: `Registrou refeição: ${desc}`,
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
        await supabase
          .from("profiles")
          .update({ xp_total: newXp, metas_concluidas: newMetas, rank: newRank })
          .eq("id", profile.id);
      } catch {}

      setProfile({ ...profile, xp_total: newXp, metas_concluidas: newMetas, rank: newRank });

      resetFoodFlow();
      await loadData(true);
    } finally {
      setSubmitLoading(false);
    }
  }

  const isCompletedToday = (receita) => completedTodaySet.has(receita.id);

  async function completeReceita(receita) {
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
  }

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
            <p className="text-sm text-gray-500">Registrar alimento por texto ou foto</p>
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
            <Apple className="w-5 h-5 text-green-500 mx-auto mb-1" />
            <div className="font-bold text-gray-900">{todayMealsCount}</div>
            <div className="text-xs text-gray-500">Registros hoje</div>
          </div>
        </div>

        <CaloriesDashboard mealLogs={mealLogs} basalRate={profile?.basal_kcal || 2000} />

        {/* Bloco principal único */}
        <div className="bg-white rounded-2xl p-5 border border-red-100 shadow-sm mb-6">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center">
              <Plus className="w-6 h-6 text-red-600" />
            </div>
            <div className="flex-1">
              <div className="font-bold text-gray-900">Registrar alimento</div>
              <div className="text-sm text-gray-500 mt-1">
                O app calcula calorias, classifica o alimento e soma XP quando ele for saudável.
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-4">
            <Button
              onClick={() => {
                setEntrySource("text");
                setShowFoodModal(true);
              }}
              variant="outline"
              className="rounded-xl border-2 border-red-200 hover:bg-red-50"
            >
              <PencilLine className="w-4 h-4 mr-2" />
              Escrever
            </Button>

            <Button
              onClick={startRegisterFlow}
              className="rounded-xl bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white"
            >
              <Camera className="w-4 h-4 mr-2" />
              Foto
            </Button>
          </div>
        </div>

        <Button
          onClick={() => setShowAnalytics(!showAnalytics)}
          variant="outline"
          className="w-full mb-6 border-2 border-purple-200 hover:bg-purple-50 text-purple-700 py-5 rounded-xl"
        >
          <BarChart3 className="w-5 h-5 mr-2" />
          {showAnalytics ? "Ocultar" : "Ver"} Análises
        </Button>

        {showAnalytics && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4 mb-6"
          >
            <CaloriesChart mealLogs={mealLogs} />
            <AIInsights
              profile={profile}
              activities={(activities || []).filter((a) => a.tipo === "alimentacao")}
              colesterolRecords={colesterolRecords}
              mealLogs={mealLogs}
            />
          </motion.div>
        )}

        {/* Receitas */}
        <h2 className="font-semibold text-gray-900 mb-4">Receitas Saudáveis</h2>
        <div className="space-y-3">
          {sortedReceitas.map((receita, idx) => {
            const unlocked = isUnlocked(receita);
            const done = isCompletedToday(receita);

            return (
              <motion.div
                key={receita.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
              >
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

                    {unlocked ? (
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    ) : (
                      <div className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-lg">{receita.rank_required}</div>
                    )}
                  </div>
                </button>
              </motion.div>
            );
          })}
        </div>

        {/* modal: escolher origem da foto */}
        <AnimatePresence>
          {showSourceModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
              onClick={() => setShowSourceModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-3xl w-full max-w-sm p-6"
              >
                <h3 className="text-xl font-bold text-gray-900 mb-2 text-center">Registrar alimento</h3>
                <p className="text-sm text-gray-500 mb-6 text-center">Escolha como deseja enviar a foto</p>

                <div className="space-y-3">
                  <Button
                    onClick={() => openRegisterBySource("photo")}
                    className="w-full bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white py-5 rounded-xl flex items-center justify-center gap-3"
                  >
                    <Camera className="w-6 h-6" />
                    <div className="text-left">
                      <div className="font-semibold">Tirar foto</div>
                      <div className="text-xs opacity-90">Abrir câmera do celular</div>
                    </div>
                  </Button>

                  <Button
                    onClick={() =>
                      openImagePicker({
                        source: "gallery",
                        onFile: onPickedFile,
                      })
                    }
                    variant="outline"
                    className="w-full border-2 border-gray-200 hover:bg-gray-50 py-5 rounded-xl flex items-center justify-center gap-3"
                  >
                    <Upload className="w-6 h-6" />
                    <div className="text-left">
                      <div className="font-semibold">Escolher da galeria</div>
                      <div className="text-xs text-gray-500">Usar foto existente</div>
                    </div>
                  </Button>
                </div>

                <Button onClick={() => setShowSourceModal(false)} variant="ghost" className="w-full mt-4 text-gray-500">
                  Cancelar
                </Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* processamento da foto */}
        <AnimatePresence>
          {processingPhoto && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
            >
              <div className="bg-white rounded-3xl w-full max-w-sm p-6 text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-red-500 mb-3" />
                <div className="font-bold text-gray-900">Analisando foto</div>
                <div className="text-sm text-gray-500 mt-1">
                  Tentando sugerir o nome do alimento antes da sua confirmação.
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* modal único de registro */}
        <AnimatePresence>
          {showFoodModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
              onClick={() => !submitLoading && setShowFoodModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-3xl w-full max-w-md overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900">Registrar alimento</h3>

                    {!submitLoading && (
                      <button
                        onClick={() => {
                          setShowFoodModal(false);
                          resetFoodFlow();
                        }}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-6 h-6" />
                      </button>
                    )}
                  </div>

                  {catalogLoading && (
                    <div className="mb-3 text-xs text-gray-500 flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Carregando catálogo de alimentos…
                    </div>
                  )}

                  {photoPreview && (
                    <div className="mb-4 rounded-2xl overflow-hidden border border-gray-200">
                      <img src={photoPreview} alt="Prévia" className="w-full h-48 object-cover" />
                    </div>
                  )}

                  {entrySource === "photo" ? (
                    <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
                      <div className="flex items-start gap-2">
                        <ScanSearch className="w-4 h-4 mt-0.5" />
                        <div>
                          O app tentou sugerir o nome do alimento pela foto, mas o registro só será salvo depois que você confirmar ou corrigir o nome.
                          {photoAnalysisSource ? (
                            <div className="text-xs mt-1 opacity-80">Origem da tentativa: {photoAnalysisSource}</div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ) : null}

                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Alimento</label>
                      <input
                        value={foodQuery}
                        onChange={(e) => {
                          const v = e.target.value;
                          setFoodQuery(v);
                          setFoodSelected(null);
                        }}
                        placeholder="Ex: banana, arroz, frango, aveia..."
                        className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-red-200"
                      />

                      {(foodSearching || foodResults.length > 0 || (foodQuery || "").trim().length >= 2) && (
                        <div className="mt-2 rounded-xl border border-gray-200 bg-white overflow-hidden">
                          {foodSearching && <div className="px-3 py-2 text-xs text-gray-500">Buscando…</div>}

                          {!foodSearching && foodResults.length === 0 && (foodQuery || "").trim().length >= 2 && (
                            <div className="px-3 py-2 text-xs text-gray-500">Nenhum alimento encontrado.</div>
                          )}

                          {!foodSearching &&
                            foodResults.map((f) => (
                              <button
                                key={`${f.source}_${f.id}`}
                                type="button"
                                onClick={() => onSelectFood(f)}
                                className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center justify-between"
                              >
                                <div>
                                  <div className="text-sm text-gray-900 font-medium">
                                    {f.name}{" "}
                                    <span className="text-[10px] text-gray-400">
                                      {f.source === "custom" ? "(meu alimento)" : "(base)"}
                                    </span>
                                  </div>
                                  <div className="text-xs text-gray-500">{Number(f.kcal_per_100g || 0)} kcal / 100g</div>
                                </div>

                                <span
                                  className={`text-[11px] px-2 py-1 rounded-full border ${
                                    f.is_healthy
                                      ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                                      : "bg-red-50 border-red-200 text-red-700"
                                  }`}
                                >
                                  {f.is_healthy ? "Saudável" : "Não saudável"}
                                </span>
                              </button>
                            ))}
                        </div>
                      )}

                      {foodSelected && (
                        <div className="mt-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
                          Selecionado ✅ O app vai calcular calorias e classificar automaticamente.
                        </div>
                      )}

                      {showCreateInline && (foodQuery || "").trim().length >= 2 && (
                        <div className="mt-3 rounded-2xl border border-gray-200 bg-gray-50 p-4">
                          <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                            <Plus className="w-4 h-4" />
                            Criar “{String(foodQuery || "").trim()}”
                          </div>

                          <div className="mt-3">
                            <label className="text-xs font-medium text-gray-600">Categoria</label>
                            <select
                              value={createCategoryId}
                              onChange={(e) => setCreateCategoryId(e.target.value)}
                              className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-3 text-sm bg-white outline-none focus:ring-2 focus:ring-red-200"
                            >
                              <option value="">Selecione…</option>
                              {(catalog?.categories || []).map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.name}
                                </option>
                              ))}
                            </select>

                            {createCategoryId && (
                              <div className="mt-2 text-xs text-gray-600 flex items-start gap-2">
                                <Info className="w-4 h-4 mt-0.5 text-gray-400" />
                                <div>
                                  <div>
                                    Estimativa:{" "}
                                    <b>
                                      {Number(
                                        (catalog?.categories || []).find((c) => String(c.id) === String(createCategoryId))
                                          ?.default_kcal_per_100g || 0
                                      )}{" "}
                                      kcal / 100g
                                    </b>
                                  </div>
                                  <div>
                                    Classificação:{" "}
                                    <b>
                                      {(catalog?.categories || []).find((c) => String(c.id) === String(createCategoryId))
                                        ?.default_is_healthy
                                        ? "Saudável"
                                        : "Não saudável"}
                                    </b>
                                  </div>
                                </div>
                              </div>
                            )}

                            <button
                              type="button"
                              onClick={() => setShowAdvancedCreate((v) => !v)}
                              className="mt-3 text-xs text-gray-600 hover:text-gray-900 flex items-center gap-1"
                            >
                              <PencilLine className="w-3.5 h-3.5" />
                              {showAdvancedCreate ? "Ocultar" : "Avançado"} (opcional)
                            </button>

                            {showAdvancedCreate && (
                              <div className="mt-2">
                                <label className="text-xs font-medium text-gray-600">kcal por 100g (opcional)</label>
                                <input
                                  value={createKcalPer100}
                                  onChange={(e) => setCreateKcalPer100(e.target.value.replace(/[^\d]/g, ""))}
                                  placeholder="Ex: 60"
                                  className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-3 text-sm bg-white outline-none focus:ring-2 focus:ring-red-200"
                                  inputMode="numeric"
                                />
                              </div>
                            )}

                            <Button
                              onClick={createAndSelectFood}
                              disabled={submitLoading || !String(foodQuery || "").trim() || !createCategoryId}
                              className="w-full mt-3 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white py-5 rounded-xl font-semibold disabled:opacity-70"
                            >
                              {submitLoading ? (
                                <span className="flex items-center gap-2">
                                  <Loader2 className="w-5 h-5 animate-spin" />
                                  Criando…
                                </span>
                              ) : (
                                <span className="flex items-center gap-2">
                                  <Check className="w-5 h-5" />
                                  Criar e selecionar
                                </span>
                              )}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-sm font-medium text-gray-700">Porção</label>
                        <input
                          value={portionValue}
                          onChange={(e) => setPortionValue(e.target.value.replace(/[^\d]/g, ""))}
                          placeholder="Ex: 100"
                          className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-red-200"
                          inputMode="numeric"
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium text-gray-700">Unid.</label>
                        <select
                          value={portionUnit}
                          onChange={(e) => setPortionUnit(e.target.value)}
                          className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-3 text-sm bg-white outline-none focus:ring-2 focus:ring-red-200"
                        >
                          <option value="g">g</option>
                          <option value="ml">ml</option>
                        </select>
                      </div>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-xl p-3 text-sm flex items-center justify-between">
                      <span className="text-gray-700">Calorias estimadas</span>
                      <span className="font-bold text-gray-900">{derivedCaloriesTotal || 0} kcal</span>
                    </div>

                    <div
                      className={`rounded-xl px-4 py-3 text-sm border flex items-center justify-between ${
                        derivedHealthy ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800"
                      }`}
                    >
                      <span>Classificação do app</span>
                      <span className="font-semibold">{derivedHealthy ? "Saudável" : "Não saudável"}</span>
                    </div>

                    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-sm text-yellow-800 flex items-center justify-between">
                      <span>XP ao registrar</span>
                      <span className="font-bold">+{customMealXpPreview} XP</span>
                    </div>

                    {!derivedHealthy && (
                      <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-800">
                        Refeições não saudáveis não geram XP. Mas continuam contando nas calorias do dia.
                      </div>
                    )}

                    <Button
                      onClick={registerMeal}
                      disabled={submitLoading || !String(foodQuery || "").trim() || !portionValue}
                      className="w-full py-5 rounded-xl text-lg font-semibold bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white"
                    >
                      {submitLoading ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Processando...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <Sparkles className="w-5 h-5" />
                          Salvar refeição (+{customMealXpPreview} XP)
                        </span>
                      )}
                    </Button>

                    <Button
                      onClick={() => {
                        setShowFoodModal(false);
                        resetFoodFlow();
                      }}
                      variant="ghost"
                      className="w-full text-gray-500"
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modal receita */}
        <AnimatePresence>
          {selectedReceita && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 flex items-end justify-center z-50 p-4"
              onClick={() => setSelectedReceita(null)}
            >
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
                        <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                          {idx + 1}
                        </div>
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
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                        className="w-6 h-6 border-2 border-white border-t-transparent rounded-full"
                      />
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
