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
    ingredients: ["1/2 xícara de aveia", "1 banana", "1/2 xícara de morangos", "Canela a gosto"],
    steps: ["Cozinhe a aveia", "Adicione as frutas", "Polvilhe canela"],
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
    ingredients: ["150g de salmão", "Mix de folhas", "Abacate"],
    steps: ["Grelhe o salmão", "Monte a salada"],
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
    ingredients: ["Cenoura", "Abobrinha", "Brócolis"],
    steps: ["Refogue os legumes", "Cozinhe por 20 min"],
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
function sameDay(iso, dayStr) { return iso?.slice(0, 10) === dayStr; }

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

function calcCaloriesFromKcalPer100(kcalPer100, portion) {
  const p = Number(portion || 0);
  const k100 = Number(kcalPer100 || 0);
  return Math.round((k100 * p) / 100);
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
      try { const cat = await loadFoodCatalog(); setCatalog(cat); } 
      finally { setCatalogLoading(false); }
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
    if (!user) return;
    const { data: prof } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
    const meals = await safeSelect("meal_logs", (q) => q.eq("user_id", user.id).order("created_at", { ascending: false }));
    const acts = await safeSelect("activity_logs", (q) => q.eq("user_id", user.id).order("created_at", { ascending: false }));
    const col = await safeSelect("cholesterol_records", (q) => q.eq("user_id", user.id).order("record_date", { ascending: false }));
    setProfile(prof); setMealLogs(meals); setActivities(acts); setColesterolRecords(col);
    setIsLoading(false);
  };

  // --- LÓGICA REVISADA DE SAÚDE E CALORIAS ---
  const derivedHealthy = useMemo(() => {
    const nomeBaixo = (foodQuery || "").toLowerCase();
    const temTermoVilao = TERMOS_VILOES.some(t => nomeBaixo.includes(t));
    if (temTermoVilao) return false;
    if (foodSelected) return !!foodSelected.is_healthy;
    if (showCreateInline && createCategoryId && catalog?.categories) {
      const cat = catalog.categories.find(c => String(c.id) === String(createCategoryId));
      return !!cat?.default_is_healthy;
    }
    return false;
  }, [foodSelected, showCreateInline, createCategoryId, catalog, foodQuery]);

  const derivedKcalPer100 = useMemo(() => {
    if (foodSelected) return Number(foodSelected.kcal_per_100g || 0);
    if (showCreateInline && createCategoryId && catalog?.categories) {
      const cat = catalog.categories.find(c => String(c.id) === String(createCategoryId));
      const manual = Number(createKcalPer100);
      return manual > 0 ? manual : Number(cat?.default_kcal_per_100g || 0);
    }
    return 0;
  }, [foodSelected, showCreateInline, createCategoryId, createKcalPer100, catalog]);

  const derivedCaloriesTotal = useMemo(() => calcCaloriesFromKcalPer100(derivedKcalPer100, portionValue), [derivedKcalPer100, portionValue]);

  const customMealXpPreview = useMemo(() => computeCustomMealXp({
    isHealthy: derivedHealthy, calories: derivedCaloriesTotal, targetCalories: profile?.basal_kcal
  }), [derivedHealthy, derivedCaloriesTotal, profile?.basal_kcal]);

  // --- AÇÕES ---
  function resetFoodFlow() {
    setShowFoodModal(false); setShowSourceModal(false); setPhotoPreview(null);
    setFoodQuery(""); setFoodSelected(null); setPortionValue("100");
    setShowCreateInline(false); setCreateCategoryId(""); setCreateKcalPer100(""); setSubmitLoading(false);
  }

  async function registerMeal() {
    const xp = customMealXpPreview;
    setSubmitLoading(true);
    try {
      await supabase.from("meal_logs").insert({
        user_id: profile.id, description: foodQuery, calories: derivedCaloriesTotal, is_healthy: derivedHealthy, date: day
      });
      if (xp > 0) {
        const newXp = (profile.xp_total || 0) + xp;
        await supabase.from("profiles").update({ xp_total: newXp, rank: computeRankFromXp(newXp) }).eq("id", profile.id);
      }
      resetFoodFlow(); loadData();
    } finally { setSubmitLoading(false); }
  }

  async function createAndSelectFood() {
    if (!createCategoryId) return alert("Selecione uma categoria.");
    const cat = catalog.categories.find(c => String(c.id) === String(createCategoryId));
    const nomeBaixo = foodQuery.toLowerCase();
    const isHealthy = TERMOS_VILOES.some(t => nomeBaixo.includes(t)) ? false : !!cat.default_is_healthy;
    const kcal = Number(createKcalPer100) > 0 ? Number(createKcalPer100) : Number(cat.default_kcal_per_100g);

    setSubmitLoading(true);
    try {
      const row = await createUserCustomFood({ userId: profile.id, name: foodQuery, kcalPer100g: kcal, isHealthy });
      setFoodSelected({ ...row, source: "custom", is_healthy: isHealthy, kcal_per_100g: kcal });
      setShowCreateInline(false);
    } finally { setSubmitLoading(false); }
  }

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-red-500" /></div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-rose-50 pb-24">
      <div className="max-w-lg mx-auto px-4 pt-6">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => window.location.href = "/"} className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center"><ArrowLeft /></button>
          <h1 className="text-xl font-bold">Alimentação</h1>
        </div>

        <CaloriesDashboard mealLogs={mealLogs} basalRate={profile?.basal_kcal || 2000} />

        <div className="bg-white rounded-2xl p-5 border border-red-100 shadow-sm mb-6 mt-6">
          <h3 className="font-bold mb-4">Registrar Alimento</h3>
          <div className="grid grid-cols-2 gap-3">
            <Button onClick={() => { setEntrySource("text"); setShowFoodModal(true); }} variant="outline" className="rounded-xl border-red-200 h-12"><PencilLine className="mr-2" /> Escrever</Button>
            <Button onClick={() => setShowSourceModal(true)} className="rounded-xl bg-red-500 text-white h-12"><Camera className="mr-2" /> Foto</Button>
          </div>
        </div>

        <Button onClick={() => setShowAnalytics(!showAnalytics)} variant="outline" className="w-full mb-6 py-6 rounded-xl border-purple-200 text-purple-700 bg-white"><BarChart3 className="mr-2" /> {showAnalytics ? "Ocultar" : "Ver"} Análises</Button>
        {showAnalytics && <div className="space-y-4 mb-6"><CaloriesChart mealLogs={mealLogs} /><AIInsights profile={profile} mealLogs={mealLogs} /></div>}

        <h2 className="font-bold mb-4">Receitas</h2>
        <div className="space-y-3">
          {receitas.map((r) => (
            <button key={r.id} className="w-full text-left bg-white p-4 rounded-2xl border border-red-50 flex items-center gap-4">
              <div className="text-3xl bg-red-50 w-12 h-12 rounded-xl flex items-center justify-center">{r.image}</div>
              <div className="flex-1"><div className="font-bold">{r.name}</div><div className="text-xs text-gray-500">{r.desc}</div></div>
              <ChevronRight className="text-gray-300" />
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {showSourceModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setShowSourceModal(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-white rounded-3xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-center mb-6">Registrar com Foto</h3>
              <div className="space-y-3">
                <Button onClick={() => setShowSourceModal(false)} className="w-full bg-red-500 text-white py-6 rounded-xl"><Camera className="mr-2" /> Tirar Foto</Button>
                <Button onClick={() => setShowSourceModal(false)} variant="outline" className="w-full py-6 rounded-xl"><Upload className="mr-2" /> Galeria</Button>
              </div>
            </motion.div>
          </div>
        )}

        {showFoodModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => !submitLoading && resetFoodFlow()}>
            <motion.div initial={{ y: 50 }} animate={{ y: 0 }} className="bg-white rounded-3xl w-full max-w-md p-6 overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4"><h3 className="font-bold">Registrar Refeição</h3><X onClick={resetFoodFlow} className="cursor-pointer text-gray-400" /></div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">Nome do Alimento</label>
                  <input value={foodQuery} onChange={e => { setFoodQuery(e.target.value); setFoodSelected(null); }} placeholder="Ex: Manga, Bolinho..." className="w-full border-2 border-gray-100 rounded-2xl p-4 mt-1" />
                  
                  {foodResults.length > 0 && !foodSelected && (
                    <div className="border rounded-2xl mt-2 overflow-hidden shadow-sm bg-white">
                      {foodResults.map(f => {
                        const isVilao = TERMOS_VILOES.some(t => f.name.toLowerCase().includes(t));
                        const finalHealthy = isVilao ? false : f.is_healthy;
                        return (
                          <button key={f.id} onClick={() => { setFoodSelected(f); setFoodQuery(f.name); }} className="w-full p-4 text-left hover:bg-gray-50 text-sm border-b flex justify-between items-center">
                            <div><div className="font-bold">{f.name}</div><div className="text-[10px] text-gray-400">{f.kcal_per_100g} kcal/100g</div></div>
                            <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${finalHealthy ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{finalHealthy ? "SAUDÁVEL" : "NÃO SAUDÁVEL"}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {showCreateInline && !foodSelected && (
                    <div className="bg-gray-50 p-4 rounded-2xl mt-3 border">
                      <p className="text-xs font-bold mb-2">Novo Alimento! Selecione a Categoria:</p>
                      <select value={createCategoryId} onChange={e => setCreateCategoryId(e.target.value)} className="w-full p-3 rounded-xl border text-sm">
                        <option value="">Selecione...</option>
                        {catalog?.categories?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                      <Button onClick={createAndSelectFood} className="w-full mt-3 bg-red-500 text-white h-10 rounded-xl">Confirmar</Button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-xs font-bold text-gray-500 uppercase">Quantidade</label><input type="number" value={portionValue} onChange={e => setPortionValue(e.target.value)} className="w-full border-2 border-gray-100 rounded-2xl p-4 mt-1" /></div>
                  <div><label className="text-xs font-bold text-gray-500 uppercase">Unidade</label><select value={portionUnit} onChange={e => setPortionUnit(e.target.value)} className="w-full border-2 border-gray-100 rounded-2xl p-4 mt-1 bg-white"><option value="g">Gramas (g)</option><option value="ml">Mililitros (ml)</option></select></div>
                </div>

                <div className="p-4 rounded-2xl bg-gray-50 space-y-2">
                  <div className="flex justify-between text-sm"><span>Calorias Totais:</span><span className="font-bold">{derivedCaloriesTotal} kcal</span></div>
                  <div className="flex justify-between items-center"><span>Classificação:</span><span className={`text-xs font-bold px-3 py-1 rounded-full ${derivedHealthy ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{derivedHealthy ? "SAUDÁVEL ✅" : "NÃO SAUDÁVEL ⚠️"}</span></div>
                  <div className="flex justify-between text-sm pt-2 border-t"><span>XP a Ganhar:</span><span className="font-bold text-yellow-600">+{customMealXpPreview} XP</span></div>
                </div>

                <Button onClick={registerMeal} disabled={submitLoading || !foodQuery} className="w-full py-6 rounded-2xl bg-red-500 text-white font-bold text-lg shadow-lg">
                  {submitLoading ? <Loader2 className="animate-spin" /> : "SALVAR REFEIÇÃO"}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
