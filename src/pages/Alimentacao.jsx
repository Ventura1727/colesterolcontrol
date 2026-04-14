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

// --- MOTOR DE INTELIGÊNCIA NUTRICIONAL (BLACKLIST COMPLETA) ---
const TERMOS_VILOES = [
  // Frituras e Gorduras Saturadas/Trans
  "frito", "frita", "fritura", "empanado", "milanesa", "parmegiana", "bacon", "banha", 
  "maionese", "gordura", "torresmo", "panceta", "manteiga", "margarina", "oleo", "óleo",
  // Açúcares e Doces de Alto Índice Glicêmico
  "doce", "açúcar", "açucar", "melado", "caramelo", "xarope", "chocolate", "achocolatado", 
  "sorvete", "pudim", "bolo", "torta", "biscoito", "bolacha", "recheado", "confeitaria",
  // Doces Regionais e Tradicionais
  "moleque", "paçoca", "pacoca", "rapadura", "quindim", "brigadeiro", "beijinho", "goiabada", 
  "churros", "donut", "sonho", "pamonha", "canjica", "curau", "maria mole",
  // Ultraprocessados e Embutidos (Inimigos do Colesterol)
  "refrigerante", "refri", "salsicha", "presunto", "mortadela", "salame", "nuggets", 
  "linguiça", "linguica", "pepperoni", "apresuntado", "salsichão", "nugget",
  // Fast Food e Massas Pesadas
  "pizza", "hambúrguer", "hamburguer", "burger", "salgadinho", "coxinha", "pastel", 
  "kibe", "empada", "hot dog", "cachorro quente", "beirute", "lasanhas", "lasanha"
];

const receitas = [
  {
    id: "aveia-frutas",
    name: "Bowl de Aveia com Frutas",
    desc: "Café da manhã anti-colesterol",
    time: 10, xp: 15, calories: 280, benefit: "Reduz LDL",
    rank_required: "Iniciante", image: "🥣",
    ingredients: ["1/2 xícara de aveia", "1 banana", "1/2 xícara de morangos", "Canela a gosto"],
    steps: ["Cozinhe a aveia com água", "Adicione as frutas cortadas", "Polvilhe canela"]
  },
  {
    id: "salada-salmao",
    name: "Salada com Salmão Grelhado",
    desc: "Almoço rico em Ômega-3",
    time: 25, xp: 25, calories: 420, benefit: "Aumenta HDL",
    rank_required: "Iniciante", image: "🥗",
    ingredients: ["150g de salmão", "Mix de folhas", "Tomate cereja", "Abacate", "Azeite"],
    steps: ["Grelhe o salmão", "Monte a salada", "Finalize com azeite de oliva"]
  },
  {
    id: "sopa-legumes",
    name: "Sopa Detox de Legumes",
    desc: "Jantar leve e nutritivo",
    time: 30, xp: 20, calories: 180, benefit: "Desintoxica",
    rank_required: "Bronze", image: "🍲",
    ingredients: ["Cenoura", "Abobrinha", "Brócolis", "Gengibre", "Cebola e alho"],
    steps: ["Refogue cebola e alho", "Adicione legumes e água", "Cozinhe por 20 min"]
  },
  {
    id: "smoothie-verde",
    name: "Smoothie Verde Energético",
    desc: "Lanche poderoso",
    time: 5, xp: 15, calories: 150, benefit: "Fibras e energia",
    rank_required: "Bronze", image: "🥤",
    ingredients: ["Espinafre", "Banana", "Maçã verde", "Água de coco"],
    steps: ["Bata tudo no liquidificador", "Sirva gelado"]
  },
  {
    id: "peixe-assado",
    name: "Peixe Assado com Ervas",
    desc: "Proteína saudável",
    time: 35, xp: 35, calories: 320, benefit: "Ômega-3 + Proteína",
    rank_required: "Prata", image: "🐟",
    ingredients: ["Filé de tilápia", "Limão", "Alecrim", "Azeite"],
    steps: ["Tempere o peixe", "Asse a 180°C por 25 min"]
  },
  {
    id: "bowl-quinoa",
    name: "Bowl de Quinoa Mediterrâneo",
    desc: "Superalimento completo",
    time: 25, xp: 40, calories: 480, benefit: "Proteína vegetal",
    rank_required: "Ouro", image: "🥙",
    ingredients: ["Quinoa", "Grão de bico", "Pepino", "Tomate", "Queijo feta"],
    steps: ["Cozinhe a quinoa", "Misture os ingredientes", "Tempere com limão"]
  }
];

const rankOrder = ["Iniciante", "Bronze", "Prata", "Ouro", "Diamante", "Mestre"];

// --- UTILITÁRIOS ---
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
    return error ? [] : data;
  } catch { return []; }
}

function todayISODate() { return new Date().toISOString().slice(0, 10); }

function computeCustomMealXp({ isHealthy, calories, targetCalories }) {
  if (!isHealthy) return 0;
  const cals = Number(calories || 0);
  if (cals <= 0) return 10;
  const target = Number(targetCalories || 2000);
  const ratio = cals / Math.max(target, 1);
  if (ratio <= 0.2) return 20;
  if (ratio <= 0.35) return 15;
  if (ratio <= 0.5) return 10;
  return 5;
}

export default function Alimentacao() {
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [catalog, setCatalog] = useState(null);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [selectedReceita, setSelectedReceita] = useState(null);
  const [completing, setCompleting] = useState(false);
  const [mealLogs, setMealLogs] = useState([]);
  const [colesterolRecords, setColesterolRecords] = useState([]);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const day = useMemo(() => todayISODate(), []);
  const [localDoneSet, setLocalDoneSet] = useState(new Set());

  // Estados do Modal e Fluxo
  const [entrySource, setEntrySource] = useState(null);
  const [showSourceModal, setShowSourceModal] = useState(false);
  const [showFoodModal, setShowFoodModal] = useState(false);
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
    const col = await safeSelect("cholesterol_records", (q) => q.eq("user_id", user.id).order("record_date", { ascending: false }));
    setProfile(prof); setMealLogs(meals); setColesterolRecords(col);
    setIsLoading(false);
  };

  // --- LÓGICA DE CLASSIFICAÇÃO BLINDADA ---
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

  const derivedCaloriesTotal = useMemo(() => Math.round((derivedKcalPer100 * Number(portionValue)) / 100), [derivedKcalPer100, portionValue]);

  const customMealXpPreview = useMemo(() => computeCustomMealXp({
    isHealthy: derivedHealthy, calories: derivedCaloriesTotal, targetCalories: profile?.basal_kcal
  }), [derivedHealthy, derivedCaloriesTotal, profile?.basal_kcal]);

  function resetFoodFlow() {
    setShowFoodModal(false); setFoodQuery(""); setFoodSelected(null); 
    setPortionValue("100"); setShowCreateInline(false); setCreateCategoryId("");
  }

  async function registerMeal() {
    setSubmitLoading(true);
    try {
      await supabase.from("meal_logs").insert({
        user_id: profile.id, description: foodQuery, calories: derivedCaloriesTotal, is_healthy: derivedHealthy, date: day
      });
      if (customMealXpPreview > 0) {
        const newXp = (profile.xp_total || 0) + customMealXpPreview;
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

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-white"><Loader2 className="animate-spin text-red-500 w-10 h-10" /></div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-rose-50 pb-24 font-sans">
      <div className="max-w-lg mx-auto px-4 pt-6">
        <header className="flex items-center gap-3 mb-6">
          <button onClick={() => window.location.href = "/"} className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center shadow-sm"><ArrowLeft className="text-gray-600" /></button>
          <div><h1 className="text-xl font-bold text-gray-900 tracking-tight">Alimentação</h1><p className="text-xs text-gray-500 font-medium">Foco no controle de colesterol</p></div>
        </header>

        <CaloriesDashboard mealLogs={mealLogs} basalRate={profile?.basal_kcal || 2000} />

        <section className="bg-white rounded-3xl p-6 border border-red-100 shadow-sm mb-6 mt-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 bg-red-50 rounded-2xl flex items-center justify-center"><Plus className="text-red-500 w-5 h-5" /></div>
            <h3 className="font-bold text-gray-800 text-lg">Novo Registro</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Button onClick={() => { setEntrySource("text"); setShowFoodModal(true); }} variant="outline" className="rounded-2xl border-red-100 h-14 text-red-700 hover:bg-red-50 font-bold transition-all"><PencilLine className="mr-2 w-4 h-4" /> Escrever</Button>
            <Button onClick={() => setShowSourceModal(true)} className="rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 text-white h-14 font-bold shadow-lg shadow-red-100 transition-all active:scale-95"><Camera className="mr-2 w-4 h-4" /> Foto</Button>
          </div>
        </section>

        <Button onClick={() => setShowAnalytics(!showAnalytics)} variant="outline" className="w-full mb-6 py-7 rounded-2xl border-purple-100 text-purple-700 bg-white font-bold shadow-sm">
          <BarChart3 className="mr-2 w-5 h-5" /> {showAnalytics ? "Recolher" : "Analisar"} Saúde do Dia
        </Button>
        {showAnalytics && <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 mb-6"><CaloriesChart mealLogs={mealLogs} /><AIInsights profile={profile} mealLogs={mealLogs} /></motion.div>}

        <h2 className="font-bold mb-4 text-gray-900 text-lg flex items-center gap-2 px-1"><Heart className="w-5 h-5 text-red-500" /> Receitas Recomendadas</h2>
        <div className="space-y-4">
          {receitas.map((r, idx) => (
            <motion.button key={r.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.1 }} className="w-full text-left bg-white p-5 rounded-3xl border border-gray-100 flex items-center gap-4 hover:shadow-md hover:border-red-100 transition-all group">
              <div className="text-3xl bg-red-50 w-14 h-14 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">{r.image}</div>
              <div className="flex-1"><div className="font-bold text-gray-800 text-base">{r.name}</div><div className="text-xs text-gray-400 font-medium">{r.desc}</div><div className="mt-2 flex gap-2"><span className="text-[10px] font-bold text-orange-500 bg-orange-50 px-2 py-0.5 rounded-lg">{r.calories} kcal</span><span className="text-[10px] font-bold text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded-lg">+{r.xp} XP</span></div></div>
              <ChevronRight className="text-gray-300" />
            </motion.button>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {showFoodModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => !submitLoading && resetFoodFlow()}>
            <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-white rounded-[40px] w-full max-w-md p-8 overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-6"><h3 className="font-black text-2xl text-gray-900 tracking-tight">Registrar Refeição</h3><button onClick={resetFoodFlow} className="p-2 bg-gray-50 rounded-full hover:bg-gray-100 transition-colors"><X className="text-gray-400" /></button></div>
              
              <div className="space-y-6">
                <div className="relative">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">O que você consumiu?</label>
                  <input value={foodQuery} onChange={e => { setFoodQuery(e.target.value); setFoodSelected(null); }} placeholder="Ex: Mandioca frita, Paçoca..." className="w-full border-2 border-gray-100 rounded-2xl p-4 font-bold text-gray-800 focus:border-red-500 outline-none transition-all placeholder:text-gray-300" />
                  
                  {foodResults.length > 0 && !foodSelected && (
                    <div className="absolute w-full z-10 border border-gray-100 rounded-3xl mt-2 overflow-hidden shadow-2xl bg-white max-h-60 overflow-y-auto">
                      {foodResults.map(f => {
                        const isVilao = TERMOS_VILOES.some(t => f.name.toLowerCase().includes(t));
                        const finalHealthy = isVilao ? false : f.is_healthy;
                        return (
                          <button key={f.id} onClick={() => { setFoodSelected(f); setFoodQuery(f.name); }} className="w-full p-4 text-left hover:bg-red-50 text-sm border-b border-gray-50 flex justify-between items-center group">
                            <div><div className="font-bold text-gray-800 group-hover:text-red-700 transition-colors">{f.name}</div><div className="text-[10px] text-gray-400 font-black uppercase tracking-tighter">{f.kcal_per_100g} kcal/100g</div></div>
                            <span className={`text-[10px] font-black px-3 py-1.5 rounded-xl ${finalHealthy ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{finalHealthy ? "SAUDÁVEL" : "NÃO SAUDÁVEL"}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {showCreateInline && !foodSelected && (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-amber-50 p-6 rounded-3xl mt-4 border border-amber-100 shadow-inner">
                      <p className="text-[10px] font-black text-amber-800 mb-4 flex items-center gap-2 uppercase tracking-widest"><Sparkles className="w-4 h-4" /> Alimento novo detectado!</p>
                      <select value={createCategoryId} onChange={e => setCreateCategoryId(e.target.value)} className="w-full p-4 rounded-2xl border-2 border-white bg-white text-sm font-bold outline-none shadow-sm focus:border-amber-500 transition-all">
                        <option value="">Selecione a Categoria...</option>
                        {catalog?.categories?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                      <Button onClick={createAndSelectFood} className="w-full mt-4 bg-amber-600 text-white h-12 rounded-2xl font-black shadow-lg shadow-amber-100 active:scale-95 transition-all">Confirmar Classificação</Button>
                    </motion.div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Quantidade</label><input type="number" value={portionValue} onChange={e => setPortionValue(e.target.value)} className="w-full border-2 border-gray-100 rounded-2xl p-4 font-black text-gray-800 bg-gray-50" /></div>
                  <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Unidade</label><select value={portionUnit} onChange={e => setPortionUnit(e.target.value)} className="w-full border-2 border-gray-100 rounded-2xl p-4 bg-gray-50 font-black text-gray-800 outline-none"><option value="g">Gramas (g)</option><option value="ml">Mililitros (ml)</option></select></div>
                </div>

                <div className="p-6 rounded-[32px] bg-gray-50 border border-gray-100 space-y-4">
                  <div className="flex justify-between items-center"><span className="text-sm text-gray-400 font-bold uppercase tracking-tight">Calorias Estimadas</span><span className="font-black text-xl text-gray-900">{derivedCaloriesTotal} <small className="text-xs">kcal</small></span></div>
                  <div className="flex justify-between items-center"><span className="text-sm text-gray-400 font-bold uppercase tracking-tight">Selo Heartbalance</span><span className={`text-[10px] font-black px-4 py-2 rounded-2xl shadow-sm border ${derivedHealthy ? "bg-green-100 text-green-700 border-green-200" : "bg-red-100 text-red-700 border-red-200"}`}>{derivedHealthy ? "SAUDÁVEL ✅" : "NÃO SAUDÁVEL ⚠️"}</span></div>
                  <div className="flex justify-between items-center pt-3 border-t border-gray-200"><span className="text-sm text-yellow-800 font-black uppercase">XP Recompensa</span><span className="font-black text-2xl text-yellow-600">+{customMealXpPreview} <small className="text-xs">XP</small></span></div>
                </div>

                <Button onClick={registerMeal} disabled={submitLoading || !foodQuery || (showCreateInline && !foodSelected)} className="w-full py-8 rounded-[32px] bg-gradient-to-br from-red-500 to-rose-600 text-white font-black text-xl shadow-2xl shadow-red-200 hover:shadow-red-300 transition-all active:scale-95 disabled:opacity-50">
                  {submitLoading ? <Loader2 className="animate-spin w-8 h-8" /> : `SALVAR REFEIÇÃO`}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
