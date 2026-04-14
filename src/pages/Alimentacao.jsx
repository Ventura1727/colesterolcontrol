import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Salad, Lock, Check, Zap, Trophy, Clock, Flame, ChevronRight,
  Heart, Camera, Upload, X, Loader2, BarChart3, Plus, PencilLine, Info,
  ScanSearch, Sparkles, Apple,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { createPageUrl } from "@/utils";
import CaloriesChart from "@/components/analytics/CaloriesChart";
import AIInsights from "@/components/analytics/AIInsights";
import CaloriesDashboard from "@/components/nutrition/CaloriesDashboard";
import { supabase } from "@/lib/supabaseClient";
import { loadFoodCatalog, searchFoodsHybrid, createUserCustomFood } from "@/lib/foodCatalog";

// --- CONFIGURAÇÕES DE NEGÓCIO ---
const TERMOS_VILOES = [
  "bolinho", "frito", "fritura", "doce", "açúcar", "refrigerante", "bacon", 
  "salgadinho", "pizza", "hambúrguer", "sorvete", "chocolate", "presunto", "salsicha"
];

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

// --- FUNÇÕES AUXILIARES ---
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
  } catch { return []; }
}

function todayISODate() { return new Date().toISOString().slice(0, 10); }
function localKeyForDay(day) { return `hb_recipes_done_${day}`; }

function readLocalDoneSet(day) {
  try {
    const raw = localStorage.getItem(localKeyForDay(day));
    const arr = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch { return new Set(); }
}

function writeLocalDoneSet(day, set) {
  try { localStorage.setItem(localKeyForDay(day), JSON.stringify(Array.from(set))); } catch {}
}

function sameDay(isoDatetimeOrDate, dayYYYYMMDD) {
  if (!isoDatetimeOrDate) return false;
  return String(isoDatetimeOrDate).slice(0, 10) === dayYYYYMMDD;
}

function computeCustomMealXp({ isHealthy, calories, targetCalories }) {
  if (!isHealthy) return 0;
  const target = Number(targetCalories || 2000);
  const cals = Number(calories || 0);
  if (cals <= 0) return 10;
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
  return Math.round((k100 * p) / 100);
}

async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function tryAnalyzeFoodPhoto(file) {
  if (!file) return null;
  try {
    const base64 = await fileToBase64(file);
    const { data, error } = await supabase.functions.invoke("analyze-food-photo", {
      body: { image_base64: base64, mime_type: file.type || "image/jpeg", file_name: file.name || "image.jpg" },
    });
    if (!error && data) {
      const gName = data?.food_name || data?.name || data?.item || "";
      if (gName) return { guessedName: String(gName).trim(), confidence: Number(data?.confidence || 0), source: "AI" };
    }
  } catch {}
  return { guessedName: file.name.split('.')[0].replace(/[_-]/g, ' '), confidence: 0, source: "Manual" };
}

// --- COMPONENTE PRINCIPAL ---
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

  // Estados do Modal de Alimento
  const [entrySource, setEntrySource] = useState(null);
  const [showSourceModal, setShowSourceModal] = useState(false);
  const [showFoodModal, setShowFoodModal] = useState(false);
  const [processingPhoto, setProcessingPhoto] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [foodQuery, setFoodQuery] = useState("");
  const [foodResults, setFoodResults] = useState([]);
  const [foodSearching, setFoodSearching] = useState(false);
  const [foodSelected, setFoodSelected] = useState(null);
  const [portionValue, setPortionValue] = useState("100");
  const [portionUnit, setPortionUnit] = useState("g");
  const [showCreateInline, setShowCreateInline] = useState(false);
  const [createCategoryId, setCreateCategoryId] = useState("");
  const [createKcalPer100, setCreateKcalPer100] = useState("");
  const [submitLoading, setSubmitLoading] = useState(false);

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    (async () => {
      setCatalogLoading(true);
      try {
        const cat = await loadFoodCatalog();
        setCatalog(cat);
      } finally { setCatalogLoading(false); }
    })();
  }, []);

  useEffect(() => {
    const t = setTimeout(async () => {
      const q = foodQuery.trim();
      if (q.length < 2) { setFoodResults([]); setShowCreateInline(false); return; }
      setFoodSearching(true);
      try {
        const items = await searchFoodsHybrid({ query: q, catalog, userId: profile?.id, limit: 8 });
        setFoodResults(items || []);
        setShowCreateInline(items.length === 0);
      } finally { setFoodSearching(false); }
    }, 250);
    return () => clearTimeout(t);
  }, [foodQuery, catalog, profile?.id]);

  const loadData = async () => {
    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = "/login"; return; }

    const { data: prof } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
    const meals = await safeSelect("meal_logs", (q) => q.eq("user_id", user.id).order("created_at", { ascending: false }).limit(60));
    const acts = await safeSelect("activity_logs", (q) => q.eq("user_id", user.id).order("created_at", { ascending: false }).limit(60));
    const col = await safeSelect("cholesterol_records", (q) => q.eq("user_id", user.id).order("record_date", { ascending: false }).limit(5));

    setProfile(prof);
    setMealLogs(meals);
    setActivities(acts);
    setColesterolRecords(col);
    setLocalDoneSet(readLocalDoneSet(day));
    setIsLoading(false);
  };

  // --- LÓGICA DE CLASSIFICAÇÃO COM TRAVA DE SEGURANÇA ---
  const derivedHealthy = useMemo(() => {
    // 1. Trava de Texto (O Corretor do Bolinho de Chuva)
    const nomeBaixo = (foodQuery || "").toLowerCase();
    const temTermoVilao = TERMOS_VILOES.some(t => nomeBaixo.includes(t));
    if (temTermoVilao) return false;

    // 2. Se for alimento da base fixa
    if (foodSelected && typeof foodSelected.is_healthy === "boolean") return foodSelected.is_healthy;

    // 3. Se for criação por categoria
    if (showCreateInline && createCategoryId && catalog?.categories?.length) {
      const cat = catalog.categories.find((c) => String(c.id) === String(createCategoryId));
      if (cat && typeof cat.default_is_healthy === "boolean") return cat.default_is_healthy;
    }
    return false;
  }, [foodSelected, showCreateInline, createCategoryId, catalog, foodQuery]);

  const derivedKcalPer100 = useMemo(() => {
    if (foodSelected) return Number(foodSelected.kcal_per_100g || 0);
    if (showCreateInline && createCategoryId) {
      const cat = catalog?.categories?.find((c) => String(c.id) === String(createCategoryId));
      return Number(createKcalPer100 || cat?.default_kcal_per_100g || 0);
    }
    return 0;
  }, [foodSelected, showCreateInline, createCategoryId, createKcalPer100, catalog]);

  const derivedCaloriesTotal = useMemo(() => calcCaloriesFromKcalPer100(derivedKcalPer100, portionValue), [derivedKcalPer100, portionValue]);

  const customMealXpPreview = useMemo(() => computeCustomMealXp({
    isHealthy: derivedHealthy,
    calories: derivedCaloriesTotal,
    targetCalories: profile?.basal_kcal || 2000
  }), [derivedHealthy, derivedCaloriesTotal, profile?.basal_kcal]);

  // --- AÇÕES ---
  function resetFoodFlow() {
    setShowFoodModal(false); setShowSourceModal(false); setPhotoPreview(null);
    setFoodQuery(""); setFoodSelected(null); setPortionValue("100");
    setShowCreateInline(false); setCreateCategoryId(""); setCreateKcalPer100("");
    setEntrySource(null); setProcessingPhoto(false); setSubmitLoading(false);
  }

  async function onPickedFile(file) {
    const reader = new FileReader();
    reader.onloadend = () => setPhotoPreview(reader.result);
    reader.readAsDataURL(file);
    setProcessingPhoto(true);
    try {
      const analysis = await tryAnalyzeFoodPhoto(file);
      if (analysis?.guessedName) setFoodQuery(analysis.guessedName);
      setShowFoodModal(true);
    } finally { setProcessingPhoto(false); }
  }

  async function createAndSelectFood() {
    if (!createCategoryId) return alert("Selecione uma categoria para estimativa.");
    const name = foodQuery.trim();
    const cat = catalog.categories.find(c => String(c.id) === String(createCategoryId));
    
    // Trava na criação
    const nomeBaixo = name.toLowerCase();
    const temTermoVilao = TERMOS_VILOES.some(t => nomeBaixo.includes(t));
    const isHealthy = temTermoVilao ? false : (typeof cat.default_is_healthy === "boolean" ? cat.default_is_healthy : false);

    setSubmitLoading(true);
    try {
      const row = await createUserCustomFood({
        userId: profile.id,
        name,
        kcalPer100g: Number(createKcalPer100 || cat.default_kcal_per_100g),
        isHealthy
      });
      setFoodSelected({ ...row, source: "custom", name: row.name || name, is_healthy: isHealthy, kcal_per_100g: row.kcal_per_100g });
      setShowCreateInline(false);
    } finally { setSubmitLoading(false); }
  }

  async function registerMeal() {
    const xp = customMealXpPreview;
    setSubmitLoading(true);
    try {
      await supabase.from("meal_logs").insert({
        user_id: profile.id,
        description: foodQuery,
        calories: derivedCaloriesTotal,
        is_healthy: derivedHealthy,
        date: day,
        ai_feedback: foodSelected ? "Base do app" : "Registro manual"
      });
      
      if (xp > 0) {
        await supabase.from("activity_logs").insert({
          user_id: profile.id, tipo: "alimentacao", descricao: `Refeição: ${foodQuery}`, xp_ganho: xp, data: day
        });
        const newXp = (profile.xp_total || 0) + xp;
        await supabase.from("profiles").update({ xp_total: newXp, rank: computeRankFromXp(newXp) }).eq("id", profile.id);
      }
      resetFoodFlow(); loadData();
    } finally { setSubmitLoading(false); }
  }

  async function completeReceita(receita) {
    setCompleting(true);
    try {
      await supabase.from("meal_logs").insert({
        user_id: profile.id, description: receita.name, calories: receita.calories, is_healthy: true, date: day, ai_feedback: `Receita: ${receita.benefit}`
      });
      await supabase.from("activity_logs").insert({
        user_id: profile.id, tipo: "alimentacao", descricao: `Preparou: ${receita.name}`, xp_ganho: receita.xp, data: day
      });
      const newXp = (profile.xp_total || 0) + receita.xp;
      await supabase.from("profiles").update({ xp_total: newXp, rank: computeRankFromXp(newXp) }).eq("id", profile.id);
      const nextLocal = new Set(localDoneSet).add(receita.id);
      setLocalDoneSet(nextLocal); writeLocalDoneSet(day, nextLocal);
      setSelectedReceita(null); loadData();
    } finally { setCompleting(false); }
  }

  if (isLoading) return <div className="min-h-screen bg-white flex items-center justify-center"><Loader2 className="animate-spin text-red-500 w-10 h-10" /></div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-rose-50 pb-24">
      <div className="max-w-lg mx-auto px-4 pt-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => window.location.href = createPageUrl("Dashboard")} className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center">
            <ArrowLeft className="text-gray-600" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Alimentação</h1>
            <p className="text-sm text-gray-500">Controle seu colesterol e ganhe XP</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3 mb-6 text-center">
          <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
            <Zap className="w-5 h-5 text-yellow-500 mx-auto mb-1" />
            <div className="font-bold text-gray-900">{profile?.xp_total || 0}</div>
            <div className="text-[10px] text-gray-500 uppercase">XP Total</div>
          </div>
          <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
            <Trophy className="w-5 h-5 text-amber-500 mx-auto mb-1" />
            <div className="font-bold text-gray-900">{profile?.rank || "Iniciante"}</div>
            <div className="text-[10px] text-gray-500 uppercase">Seu Rank</div>
          </div>
          <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
            <Apple className="w-5 h-5 text-green-500 mx-auto mb-1" />
            <div className="font-bold text-gray-900">{mealLogs.filter(m => sameDay(m.date || m.created_at, day)).length}</div>
            <div className="text-[10px] text-gray-500 uppercase">Hoje</div>
          </div>
        </div>

        <CaloriesDashboard mealLogs={mealLogs} basalRate={profile?.basal_kcal || 2000} />

        {/* Card de Registro */}
        <div className="bg-white rounded-2xl p-5 border border-red-100 shadow-sm mb-6 mt-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
              <Plus className="text-red-500" />
            </div>
            <h3 className="font-bold text-gray-900">Registrar Alimento</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Button onClick={() => { setEntrySource("text"); setShowFoodModal(true); }} variant="outline" className="rounded-xl border-red-200 hover:bg-red-50 h-12">
              <PencilLine className="w-4 h-4 mr-2" /> Escrever
            </Button>
            <Button onClick={() => setShowSourceModal(true)} className="rounded-xl bg-gradient-to-r from-red-500 to-rose-600 text-white h-12 shadow-md">
              <Camera className="w-4 h-4 mr-2" /> Foto
            </Button>
          </div>
        </div>

        {/* Analytics Toggle */}
        <Button onClick={() => setShowAnalytics(!showAnalytics)} variant="outline" className="w-full mb-6 py-6 rounded-xl border-purple-200 text-purple-700 font-semibold bg-white">
          <BarChart3 className="w-5 h-5 mr-2" /> {showAnalytics ? "Ocultar" : "Ver"} Análises de Saúde
        </Button>

        {showAnalytics && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 mb-6">
            <CaloriesChart mealLogs={mealLogs} />
            <AIInsights profile={profile} mealLogs={mealLogs} colesterolRecords={colesterolRecords} />
          </motion.div>
        )}

        {/* Receitas List */}
        <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Salad className="w-5 h-5 text-green-600" /> Receitas Recomendadas
        </h2>
        <div className="space-y-3">
          {receitas.map((r, idx) => {
            const unlocked = rankOrder.indexOf(profile?.rank || "Iniciante") >= rankOrder.indexOf(r.rank_required);
            const done = localDoneSet.has(r.id);
            return (
              <motion.button 
                key={r.id} 
                initial={{ opacity: 0, x: -10 }} 
                animate={{ opacity: 1, x: 0 }} 
                transition={{ delay: idx * 0.05 }}
                onClick={() => unlocked && setSelectedReceita(r)} 
                disabled={!unlocked} 
                className={`w-full text-left bg-white p-4 rounded-2xl border transition-all ${unlocked ? "border-red-50 hover:shadow-md" : "opacity-50 grayscale"} ${done ? "border-emerald-100" : ""}`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-3xl ${unlocked ? "bg-red-50" : "bg-gray-100"}`}>
                    {unlocked ? r.image : <Lock className="w-6 h-6 text-gray-400" />}
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-gray-900 flex items-center gap-2">
                      {r.name} {done && <Check className="w-4 h-4 text-emerald-500" />}
                    </div>
                    <div className="text-xs text-gray-500 line-clamp-1">{r.desc}</div>
                    <div className="flex gap-3 mt-2">
                      <span className="flex items-center gap-1 text-[10px] text-gray-400 font-bold uppercase"><Clock className="w-3 h-3" />{r.time}m</span>
                      <span className="flex items-center gap-1 text-[10px] text-orange-500 font-bold uppercase"><Flame className="w-3 h-3" />{r.calories}kcal</span>
                      <span className="text-[10px] text-yellow-600 font-bold uppercase">+{r.xp} XP</span>
                    </div>
                  </div>
                  {unlocked ? <ChevronRight className="text-gray-300" /> : <span className="text-[10px] bg-gray-100 px-2 py-1 rounded text-gray-500">{r.rank_required}</span>}
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* --- MODAIS (FLUXO DE REGISTRO) --- */}
      <AnimatePresence>
        {/* Modal Origem Foto */}
        {showSourceModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowSourceModal(false)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-3xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
              <h3 className="text-xl font-bold text-center mb-2">Enviar Foto</h3>
              <p className="text-sm text-gray-500 text-center mb-6">Como deseja registrar sua refeição?</p>
              <div className="space-y-3">
                <Button onClick={() => { setShowSourceModal(false); openImagePicker({ source: "camera", onFile: onPickedFile }); }} className="w-full bg-red-500 text-white py-7 rounded-2xl text-lg font-bold shadow-lg"><Camera className="mr-3" /> Tirar Foto Agora</Button>
                <Button onClick={() => { setShowSourceModal(false); openImagePicker({ source: "gallery", onFile: onPickedFile }); }} variant="outline" className="w-full py-7 rounded-2xl text-lg font-bold border-2"><Upload className="mr-3" /> Galeria de Fotos</Button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Modal de Processamento */}
        {processingPhoto && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-3xl p-8 text-center max-w-xs w-full">
              <Loader2 className="w-12 h-12 animate-spin text-red-500 mx-auto mb-4" />
              <h4 className="font-bold text-lg">Analisando Imagem...</h4>
              <p className="text-sm text-gray-500 mt-2">Identificando o alimento para facilitar seu registro.</p>
            </div>
          </div>
        )}

        {/* Modal de Registro de Alimento (O CORAÇÃO DO APP) */}
        {showFoodModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => !submitLoading && resetFoodFlow()}>
            <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-white rounded-3xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-gray-900">Registrar Refeição</h3>
                  <button onClick={resetFoodFlow} className="p-2 hover:bg-gray-100 rounded-full"><X className="text-gray-400" /></button>
                </div>

                {photoPreview && <img src={photoPreview} className="w-full h-44 object-cover rounded-2xl mb-4 border shadow-inner" />}

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase ml-1">Nome do Alimento</label>
                    <input 
                      value={foodQuery} 
                      onChange={e => { setFoodQuery(e.target.value); setFoodSelected(null); }} 
                      placeholder="Ex: Pão integral, Omelete..." 
                      className="w-full border-2 border-gray-100 rounded-2xl p-4 mt-1 outline-none focus:border-red-200 transition-all text-gray-900 font-medium" 
                    />
                    
                    {foodSearching && <div className="flex items-center gap-2 text-xs text-blue-500 mt-2 ml-1"><Loader2 className="w-3 h-3 animate-spin" /> Buscando na base...</div>}
                    
                    {foodResults.length > 0 && !foodSelected && (
                      <div className="border-2 border-gray-50 rounded-2xl mt-2 overflow-hidden shadow-sm">
                        {foodResults.map(f => (
                          <button key={f.id} onClick={() => { setFoodSelected(f); setFoodQuery(f.name); }} className="w-full p-4 text-left hover:bg-gray-50 text-sm border-b last:border-0 flex justify-between items-center group">
                            <div>
                              <div className="font-bold text-gray-800 group-hover:text-red-600 transition-colors">{f.name}</div>
                              <div className="text-[10px] text-gray-400 font-bold uppercase">{f.kcal_per_100g} kcal / 100g</div>
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-1 rounded-lg uppercase ${f.is_healthy ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"}`}>
                              {f.is_healthy ? "Saudável" : "Não Saudável"}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}

                    {showCreateInline && !foodSelected && (
                      <div className="bg-red-50/50 p-5 rounded-2xl mt-3 border border-red-100">
                        <p className="text-xs font-bold text-red-800 mb-3 flex items-center gap-2"><Sparkles className="w-3 h-3" /> ALIMENTO NOVO! CLASSIFIQUE PARA SALVAR:</p>
                        <select value={createCategoryId} onChange={e => setCreateCategoryId(e.target.value)} className="w-full p-3 rounded-xl border-2 border-white bg-white text-sm font-medium outline-none">
                          <option value="">Selecione a categoria...</option>
                          {catalog?.categories?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <Button onClick={createAndSelectFood} disabled={!createCategoryId || submitLoading} className="w-full mt-3 bg-red-500 text-white h-11 rounded-xl font-bold">Confirmar Categoria</Button>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase ml-1">Quantidade</label>
                      <input type="number" value={portionValue} onChange={e => setPortionValue(e.target.value)} className="w-full border-2 border-gray-100 rounded-2xl p-4 mt-1 font-bold" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase ml-1">Unidade</label>
                      <select value={portionUnit} onChange={e => setPortionUnit(e.target.value)} className="w-full border-2 border-gray-100 rounded-2xl p-4 mt-1 font-bold bg-white">
                        <option value="g">Gramas (g)</option>
                        <option value="ml">Mililitros (ml)</option>
                      </select>
                    </div>
                  </div>

                  {/* Resumo Nutricional e XP */}
                  <div className="p-4 rounded-2xl border-2 border-gray-50 bg-gray-50/30 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Calorias Totais:</span>
                      <span className="font-bold text-gray-900">{derivedCaloriesTotal} kcal</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Classificação:</span>
                      <span className={`text-xs font-bold px-3 py-1 rounded-full ${derivedHealthy ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                        {derivedHealthy ? "SAUDÁVEL ✅" : "NÃO SAUDÁVEL ⚠️"}
                      </span>
                    </div>
                    <div className="pt-2 border-t border-gray-100 flex justify-between items-center">
                      <span className="text-sm font-bold text-yellow-700">XP a Ganhar:</span>
                      <span className="font-black text-yellow-600">+{customMealXpPreview} XP</span>
                    </div>
                  </div>

                  <Button 
                    onClick={registerMeal} 
                    disabled={submitLoading || !foodQuery || (showCreateInline && !foodSelected)} 
                    className="w-full py-7 rounded-2xl bg-gradient-to-r from-red-500 to-rose-600 text-white font-black text-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
                  >
                    {submitLoading ? <Loader2 className="animate-spin w-6 h-6" /> : `SALVAR REFEIÇÃO`}
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Modal Receita Detalhada */}
        {selectedReceita && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end justify-center z-50" onClick={() => setSelectedReceita(null)}>
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="bg-white rounded-t-[40px] w-full max-w-lg p-8 overflow-y-auto max-h-[92vh] shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="w-16 h-1.5 bg-gray-200 rounded-full mx-auto mb-8" />
              <div className="text-center mb-8">
                <div className="text-7xl mb-4 drop-shadow-sm">{selectedReceita.image}</div>
                <h2 className="text-3xl font-black text-gray-900 leading-tight">{selectedReceita.name}</h2>
                <div className="flex justify-center gap-3 mt-4">
                   <span className="bg-red-50 text-red-600 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider">{selectedReceita.benefit}</span>
                </div>
              </div>

              <div className="space-y-8">
                <div>
                  <h4 className="font-black text-gray-900 mb-4 flex items-center gap-2"><Check className="text-green-500" /> Ingredientes</h4>
                  <ul className="grid grid-cols-1 gap-3">
                    {selectedReceita.ingredients.map((ing, i) => (
                      <li key={i} className="bg-gray-50 p-3 rounded-xl text-sm text-gray-700 font-medium">• {ing}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="font-black text-gray-900 mb-4 flex items-center gap-2"><Sparkles className="text-yellow-500" /> Modo de Preparo</h4>
                  <ol className="space-y-4">
                    {selectedReceita.steps.map((s, i) => (
                      <li key={i} className="flex gap-4 items-start">
                        <span className="w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">{i+1}</span>
                        <p className="text-sm text-gray-600 font-medium leading-relaxed">{s}</p>
                      </li>
                    ))}
                  </ol>
                </div>

                <Button 
                  onClick={() => completeReceita(selectedReceita)} 
                  disabled={completing || localDoneSet.has(selectedReceita.id)} 
                  className={`w-full py-8 rounded-3xl text-white text-xl font-black shadow-xl transition-all ${localDoneSet.has(selectedReceita.id) ? "bg-gray-200 grayscale" : "bg-gradient-to-r from-emerald-500 to-teal-600"}`}
                >
                  {completing ? <Loader2 className="animate-spin w-8 h-8" /> : localDoneSet.has(selectedReceita.id) ? "CONCLUÍDA HOJE" : "CONCLUIR E GANHAR XP"}
                </Button>
                <div className="h-4" />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
