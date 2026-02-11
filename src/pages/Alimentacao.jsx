// src/pages/Alimentacao.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { createPageUrl } from "@/utils";
import CaloriesChart from "@/components/analytics/CaloriesChart";
import AIInsights from "@/components/analytics/AIInsights";
import CaloriesDashboard from "@/components/nutrition/CaloriesDashboard";
import { supabase } from "@/lib/supabaseClient";

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

// Lê tabelas sem quebrar caso não existam ainda
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
  } catch {
    // ignore
  }
}

function sameDay(isoDatetimeOrDate, dayYYYYMMDD) {
  if (!isoDatetimeOrDate) return false;
  const s = String(isoDatetimeOrDate);
  return s.slice(0, 10) === dayYYYYMMDD;
}

export default function Alimentacao() {
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedReceita, setSelectedReceita] = useState(null);
  const [completing, setCompleting] = useState(false);

  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);

  const [mealLogs, setMealLogs] = useState([]);
  const [activities, setActivities] = useState([]);
  const [colesterolRecords, setColesterolRecords] = useState([]);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showCameraOptions, setShowCameraOptions] = useState(false);

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const day = useMemo(() => todayISODate(), []);
  const [localDoneSet, setLocalDoneSet] = useState(() => readLocalDoneSet(todayISODate()));

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadData = async () => {
    setIsLoading(true);

    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;

    if (!user) {
      window.location.href = `/login?next=${encodeURIComponent("/alimentacao")}`;
      return;
    }

    /**
     * PERFIL: Fonte única = public.profiles
     * - maybeSingle evita 406 quando não há linha
     * - upsert mínimo evita app quebrar caso user não tenha profile ainda
     */
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
          .upsert(
            { id: user.id, rank: "Iniciante", xp_total: 0, metas_concluidas: 0, dias_consecutivos: 0 },
            { onConflict: "id" }
          )
          .select("id, role, plano_ativo, rank, xp_total, metas_concluidas, dias_consecutivos, objetivo, basal_kcal")
          .single();

        if (!upsertErr) prof = created;
      } catch {
        prof = { id: user.id, rank: "Iniciante", xp_total: 0, metas_concluidas: 0, dias_consecutivos: 0 };
      }
    }

    setProfile(prof);

    // Logs (se tabelas não existirem, retorna [])
    const meals = await safeSelect("meal_logs", (q) => q.order("created_at", { ascending: false }).limit(60));
    const acts = await safeSelect("activity_logs", (q) => q.order("created_at", { ascending: false }).limit(60));
    const colesterol = await safeSelect("colesterol_records", (q) => q.order("data_exame", { ascending: false }).limit(5));

    setMealLogs(meals);
    setActivities(acts);
    setColesterolRecords(colesterol);

    // Atualiza também o localStorage set do dia (fallback)
    setLocalDoneSet(readLocalDoneSet(day));

    setIsLoading(false);
  };

  const isUnlocked = (receita) => {
    const userRankIndex = rankOrder.indexOf(profile?.rank || "Iniciante");
    const requiredRankIndex = rankOrder.indexOf(receita.rank_required);
    return userRankIndex >= requiredRankIndex;
  };

  /**
   * Fonte de verdade: meal_logs do dia com description == receita.name
   * Fallback: localStorage do dia com recipe.id
   */
  const completedTodaySet = useMemo(() => {
    const set = new Set();

    const todaysMeals = Array.isArray(mealLogs)
      ? mealLogs.filter((m) => sameDay(m?.date || m?.created_at, day))
      : [];

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

  const completeReceita = async (receita) => {
    if (!profile?.id) return;

    if (isCompletedToday(receita)) {
      setSelectedReceita(null);
      return;
    }

    setCompleting(true);

    // atualização otimista do “done” (para UX imediata)
    const nextLocal = new Set(localDoneSet);
    nextLocal.add(receita.id);
    setLocalDoneSet(nextLocal);
    writeLocalDoneSet(day, nextLocal);

    try {
      // 1) Meal log (fonte de verdade do "concluído hoje")
      try {
        await supabase.from("meal_logs").insert({
          user_id: profile.id,
          description: receita.name,
          calories: receita.calories,
          is_healthy: true,
          ai_feedback: `Receita saudável: ${receita.benefit}`,
          date: new Date().toISOString().slice(0, 10),
        });
      } catch {
        // se falhar, mantém no localStorage (fallback)
      }

      // 2) Activity log (histórico)
      try {
        await supabase.from("activity_logs").insert({
          user_id: profile.id,
          tipo: "alimentacao",
          descricao: `Preparou: ${receita.name}`,
          xp_ganho: receita.xp,
          data: day,
        });
      } catch {
        // ignore
      }

      // 3) Atualiza XP/rank em profiles
      const currentXp = Number(profile?.xp_total || 0);
      const currentMetas = Number(profile?.metas_concluidas || 0);

      const newXp = currentXp + (receita.xp || 0);
      const newMetas = currentMetas + 1;
      const newRank = computeRankFromXp(newXp);

      try {
        await supabase
          .from("profiles")
          .update({ xp_total: newXp, metas_concluidas: newMetas, rank: newRank })
          .eq("id", profile.id);
      } catch {
        // ignore
      }

      setProfile({ ...profile, xp_total: newXp, metas_concluidas: newMetas, rank: newRank });

      await loadData();
      setSelectedReceita(null);
    } finally {
      setCompleting(false);
    }
  };

  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // permite selecionar a mesma foto novamente
    if (!file) return;

    setPhotoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setPhotoPreview(reader.result);
    reader.readAsDataURL(file);

    setShowPhotoModal(true);
  };

  const analyzeFood = async () => {
    // Aqui era base44.integrations.UploadFile + InvokeLLM
    // Vamos manter simples por enquanto para não travar o app.
    setAnalyzing(true);
    try {
      alert(
        "Análise por IA está em manutenção nesta versão.\n\n" +
          "Próximo passo: implementar upload no Supabase Storage + endpoint /api/analyze-meal para o OpenAI.\n" +
          "Se você quiser, eu te passo isso prontinho."
      );
    } finally {
      setAnalyzing(false);
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
            <p className="text-sm text-gray-500">Receitas para reduzir colesterol</p>
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
            <div className="text-xs text-gray-500">Liberadas</div>
          </div>
        </div>

        {/* Dashboard de Calorias */}
        <CaloriesDashboard mealLogs={mealLogs} basalRate={profile?.basal_kcal || 2000} />

        {/* Botões de Ação */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handlePhotoSelect}
            accept="image/*"
            className="hidden"
          />

          <input
            type="file"
            ref={cameraInputRef}
            onChange={handlePhotoSelect}
            // alguns navegadores respeitam melhor esse accept
            accept="image/*;capture=camera"
            capture="environment"
            className="hidden"
          />

          <Button
            onClick={() => setShowCameraOptions(true)}
            className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white py-5 rounded-xl shadow-md"
          >
            <Camera className="w-5 h-5 mr-2" />
            Analisar Refeição
          </Button>

          <Button
            onClick={() => setShowAnalytics(!showAnalytics)}
            variant="outline"
            className="border-2 border-purple-200 hover:bg-purple-50 text-purple-700 py-5 rounded-xl"
          >
            <BarChart3 className="w-5 h-5 mr-2" />
            {showAnalytics ? "Ocultar" : "Ver"} Análises
          </Button>
        </div>

        {/* Análises e Insights */}
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

        {/* Lista de Receitas */}
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
                    unlocked
                      ? "border-red-100 hover:border-red-300 hover:shadow-md cursor-pointer"
                      : "border-gray-200 opacity-60 cursor-not-allowed"
                  } ${done ? "opacity-70" : ""}`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-14 h-14 rounded-xl flex items-center justify-center text-3xl ${
                        unlocked ? "bg-red-50" : "bg-gray-100"
                      }`}
                    >
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

        {/* Modal de Opções de Câmera */}
        <AnimatePresence>
          {showCameraOptions && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
              onClick={() => setShowCameraOptions(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-3xl w-full max-w-sm p-6"
              >
                <h3 className="text-xl font-bold text-gray-900 mb-2 text-center">Como deseja adicionar a foto?</h3>
                <p className="text-sm text-gray-500 mb-6 text-center">Escolha a origem da imagem da sua refeição</p>

                <div className="space-y-3">
                  <Button
                    onClick={() => {
                      setShowCameraOptions(false);
                      if (cameraInputRef.current) {
                        cameraInputRef.current.value = "";
                        cameraInputRef.current.click();
                      }
                    }}
                    className="w-full bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white py-5 rounded-xl flex items-center justify-center gap-3"
                  >
                    <Camera className="w-6 h-6" />
                    <div className="text-left">
                      <div className="font-semibold">Tirar Foto Agora</div>
                      <div className="text-xs opacity-90">Abrir câmera</div>
                    </div>
                  </Button>

                  <Button
                    onClick={() => {
                      setShowCameraOptions(false);
                      if (fileInputRef.current) {
                        fileInputRef.current.value = "";
                        fileInputRef.current.click();
                      }
                    }}
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

                <Button onClick={() => setShowCameraOptions(false)} variant="ghost" className="w-full mt-4 text-gray-500">
                  Cancelar
                </Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modal de Análise de Foto */}
        <AnimatePresence>
          {showPhotoModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
              onClick={() => !analyzing && setShowPhotoModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-3xl w-full max-w-md overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900">Análise de Refeição</h3>
                    {!analyzing && (
                      <button onClick={() => setShowPhotoModal(false)} className="text-gray-400 hover:text-gray-600">
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
                        A IA vai analisar sua refeição e te dar feedback sobre calorias e impacto no colesterol.
                        <br />
                        (Nesta versão, o recurso está em manutenção.)
                      </p>
                    </div>
                  </div>

                  <Button
                    onClick={analyzeFood}
                    disabled={analyzing}
                    className="w-full bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white py-5 rounded-xl text-lg font-semibold"
                  >
                    {analyzing ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Analisando...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Zap className="w-5 h-5" />
                        Analisar Agora
                      </span>
                    )}
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modal de Receita */}
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
                      <span
                        className={`flex items-center gap-1 ${
                          isCompletedToday(selectedReceita) ? "text-gray-300" : "text-yellow-500"
                        }`}
                      >
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
