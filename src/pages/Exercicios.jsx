import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Dumbbell,
  Check,
  Zap,
  Trophy,
  Clock,
  Flame,
  Star,
  ChevronRight,
  Target,
  Plus,
  BarChart3,
  AlertCircle,
  Activity,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createPageUrl } from "@/utils";
import ActivityChart from "@/components/analytics/ActivityChart";
import AIInsights from "@/components/analytics/AIInsights";
import WorkoutDashboard from "@/components/workout/WorkoutDashboard";
import { supabase } from "@/lib/supabaseClient";

const treinos = [
  {
    id: "caminhada-leve",
    name: "Caminhada Leve",
    desc: "Ideal para iniciar — 15 min",
    duration: 15,
    xp: 20,
    calories: 80,
    objetivos: ["Reduzir colesterol", "Melhorar hábitos", "Perder peso"],
    beneficio: "Saúde cardiovascular",
    intensityTag: "leve",
    exercises: [
      { name: "Aquecimento", duration: "2 min", desc: "Alongamentos básicos" },
      { name: "Caminhada moderada", duration: "10 min", desc: "Ritmo confortável" },
      { name: "Desaquecimento", duration: "3 min", desc: "Diminuir o ritmo" },
    ],
  },
  {
    id: "cardio-basico",
    name: "Cardio Básico",
    desc: "Fortalece o coração — 20 min",
    duration: 20,
    xp: 35,
    calories: 150,
    objetivos: ["Reduzir colesterol", "Perder peso", "Melhorar hábitos"],
    beneficio: "Queima calorias e melhora circulação",
    intensityTag: "moderado",
    exercises: [
      { name: "Polichinelos", duration: "3 min", desc: "3 séries de 1 min" },
      { name: "Marcha no lugar", duration: "5 min", desc: "Joelhos altos" },
      { name: "Step lateral", duration: "5 min", desc: "Alternando lados" },
      { name: "Agachamento leve", duration: "4 min", desc: "2 séries de 15" },
      { name: "Alongamento", duration: "3 min", desc: "Relaxar músculos" },
    ],
  },
  {
    id: "hiit-iniciante",
    name: "HIIT Iniciante",
    desc: "Queima gordura rápido — 15 min",
    duration: 15,
    xp: 50,
    calories: 200,
    objetivos: ["Perder peso"],
    beneficio: "Alta queima calórica",
    intensityTag: "intenso",
    exercises: [
      { name: "Aquecimento", duration: "2 min", desc: "Preparar o corpo" },
      { name: "Burpees modificados", duration: "30s / 30s x4", desc: "Sem pulo" },
      { name: "Mountain climbers", duration: "30s / 30s x4", desc: "Ritmo moderado" },
      { name: "Descanso ativo", duration: "3 min", desc: "Caminhada leve" },
    ],
  },
  {
    id: "forca-resistencia",
    name: "Força & Resistência",
    desc: "Tonificação muscular — 25 min",
    duration: 25,
    xp: 60,
    calories: 180,
    objetivos: ["Perder peso", "Melhorar hábitos"],
    beneficio: "Aumenta metabolismo",
    intensityTag: "moderado",
    exercises: [
      { name: "Aquecimento dinâmico", duration: "3 min", desc: "Movimentos leves" },
      { name: "Flexão de braço", duration: "3x 10", desc: "Pode ser na parede" },
      { name: "Prancha", duration: "3x 30s", desc: "Descanso 30s" },
      { name: "Lunges", duration: "3x 12", desc: "Alternando pernas" },
      { name: "Ponte de glúteo", duration: "3x 15", desc: "Segure no topo" },
      { name: "Alongamento", duration: "5 min", desc: "Todos os grupos" },
    ],
  },
  {
    id: "cardio-avancado",
    name: "Cardio Avançado",
    desc: "Máxima queima calórica — 30 min",
    duration: 30,
    xp: 80,
    calories: 350,
    objetivos: ["Perder peso", "Reduzir colesterol"],
    beneficio: "Perda acelerada de peso",
    intensityTag: "intenso",
    exercises: [
      { name: "Aquecimento progressivo", duration: "5 min", desc: "Aumentar intensidade" },
      { name: "Corrida intervalada", duration: "15 min", desc: "1 min forte / 1 min leve" },
      { name: "Burpees completos", duration: "3x 10", desc: "Com pulo" },
      { name: "Desaquecimento", duration: "5 min", desc: "Diminuir gradualmente" },
    ],
  },
  {
    id: "treino-mestre",
    name: "Treino do Mestre",
    desc: "O desafio definitivo — 45 min",
    duration: 45,
    xp: 150,
    calories: 500,
    objetivos: ["Perder peso", "Reduzir colesterol", "Melhorar hábitos"],
    beneficio: "Transformação completa",
    intensityTag: "intenso",
    exercises: [
      { name: "Aquecimento completo", duration: "7 min", desc: "Preparação total" },
      { name: "Circuito de força", duration: "15 min", desc: "5 exercícios, 3 rounds" },
      { name: "HIIT intenso", duration: "10 min", desc: "Tabata (20s/10s)" },
      { name: "Core", duration: "8 min", desc: "Prancha, abdômen, oblíquos" },
      { name: "Cool down", duration: "5 min", desc: "Recuperação ativa" },
    ],
  },
];

function toISODateLocal(d = new Date()) {
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function calcRankByXp(xp) {
  if (xp >= 1500) return "Mestre";
  if (xp >= 1000) return "Diamante";
  if (xp >= 600) return "Ouro";
  if (xp >= 300) return "Prata";
  if (xp >= 100) return "Bronze";
  return "Iniciante";
}

export default function Exercicios() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);

  const [activities, setActivities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fatalError, setFatalError] = useState("");

  const [selectedTreino, setSelectedTreino] = useState(null);
  const [completingWorkout, setCompletingWorkout] = useState(false);

  const [showLogModal, setShowLogModal] = useState(false);
  const [logForm, setLogForm] = useState({
    tipo: "",
    intensidade: "media",
    tempo: "",
    data: toISODateLocal(new Date()),
  });
  const [isLogging, setIsLogging] = useState(false);

  const [showAnalytics, setShowAnalytics] = useState(false);

  // esses dois feeds ficam "best effort" (não travam a UI)
  const [colesterolRecords, setColesterolRecords] = useState([]);
  const [mealLogs, setMealLogs] = useState([]);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadData() {
    setIsLoading(true);
    setFatalError("");

    try {
      // 1) Sessão
      const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr) throw sessionErr;

      const u = sessionData?.session?.user;
      if (!u) {
        window.location.href = createPageUrl("Login");
        return;
      }
      setUser(u);

      // 2) Profile (best effort)
      let p = null;
      try {
        const { data, error } = await supabase.from("profiles").select("*").eq("id", u.id).maybeSingle();
        if (!error) p = data || null;
      } catch {
        // ignore
      }
      setProfile(p);

      // 3) Carregar exercícios (tabela exercise_logs)
      // Se a tabela não existir ainda, não pode “matar” a página.
      let exLogs = [];
      try {
        const { data, error } = await supabase
          .from("exercise_logs")
          .select("id, tipo, intensidade, tempo_min, data, descricao, xp_ganho, treino_id, created_at")
          .order("created_at", { ascending: false })
          .limit(200);

        if (error) {
          // Se não existir tabela: 42P01 — só não trava a UI.
          console.warn("Exercicios: erro ao carregar exercise_logs:", error);
          exLogs = [];
        } else {
          exLogs = Array.isArray(data) ? data : [];
        }
      } catch {
        exLogs = [];
      }

      setActivities(exLogs);

      // 4) (Opcional) Se você tiver tabelas de colesterol/refeição no futuro:
      // Não vamos depender disso para renderizar.
      setColesterolRecords([]);
      setMealLogs([]);
    } catch (e) {
      console.error("Exercicios fatal:", e);
      setFatalError(e?.message || String(e));
    } finally {
      setIsLoading(false);
    }
  }

  // Personalização: objetivo e nível do usuário (vindo do quiz)
  const objetivoUsuario = useMemo(() => {
    return (
      profile?.objetivo ||
      profile?.goal ||
      profile?.objetivo_principal ||
      null
    );
  }, [profile]);

  const nivelUsuario = useMemo(() => {
    return (
      profile?.nivel_atividade ||
      profile?.activity_level ||
      profile?.nivel ||
      null
    );
  }, [profile]);

  // Regras simples e eficazes:
  // - Perder peso: prioriza HIIT + Cardio + Força
  // - Reduzir colesterol: prioriza Cardio + Caminhada consistente
  // - Melhorar hábitos: prioriza caminhada + cardio básico + força leve (constância)
  const treinosOrdenados = useMemo(() => {
    const list = [...treinos];

    function score(t) {
      let s = 0;

      // 1) objetivo
      if (objetivoUsuario && t.objetivos?.includes(objetivoUsuario)) s += 100;

      // 2) heurística por objetivo (mesmo se texto variar)
      const obj = String(objetivoUsuario || "").toLowerCase();
      if (obj.includes("peso")) {
        if (t.id.includes("hiit")) s += 40;
        if (t.id.includes("cardio")) s += 30;
        if (t.id.includes("forca")) s += 20;
      } else if (obj.includes("colesterol")) {
        if (t.id.includes("caminhada")) s += 35;
        if (t.id.includes("cardio")) s += 30;
      } else if (obj.includes("hab")) {
        if (t.id.includes("caminhada")) s += 35;
        if (t.id.includes("cardio-basico")) s += 20;
        if (t.id.includes("forca")) s += 10;
      }

      // 3) adequação ao nível de atividade
      const lvl = String(nivelUsuario || "").toLowerCase();
      if (lvl.includes("inic") || lvl.includes("sed") || lvl.includes("baixo")) {
        if (t.intensityTag === "leve") s += 25;
        if (t.intensityTag === "intenso") s -= 25;
      }
      if (lvl.includes("reg") || lvl.includes("moder")) {
        if (t.intensityTag === "moderado") s += 15;
      }
      if (lvl.includes("avan") || lvl.includes("alto") || lvl.includes("atle")) {
        if (t.intensityTag === "intenso") s += 20;
      }

      // 4) constância: se o usuário tem poucas atividades registradas, prioriza treinos mais curtos
      const done = activities.length;
      if (done < 5 && t.duration <= 20) s += 10;

      return s;
    }

    list.sort((a, b) => score(b) - score(a));
    return list;
  }, [objetivoUsuario, nivelUsuario, activities.length]);

  // Gamificação (best effort: não quebra se não existir colunas no profile)
  const xpTotal = useMemo(() => Number(profile?.xp_total || 0) || 0, [profile]);
  const metasConcluidas = useMemo(() => Number(profile?.metas_concluidas || 0) || 0, [profile]);
  const rank = useMemo(() => profile?.rank || calcRankByXp(xpTotal), [profile, xpTotal]);

  function calcXpFromForm(tempoMinutos, intensidade) {
    const intensidadeMultiplicador = { baixa: 0.5, media: 1, alta: 1.5 };
    const baseXP = Math.round((tempoMinutos / 5) * 10);
    return Math.round(baseXP * (intensidadeMultiplicador[intensidade] || 1));
  }

  async function createExerciseLog(payload) {
    // payload: { tipo, intensidade, tempo_min, data, descricao, xp_ganho, treino_id }
    const { data, error } = await supabase.from("exercise_logs").insert([payload]).select("*").maybeSingle();
    if (error) throw error;
    return data;
  }

  async function updateProfileBestEffort(partial) {
    if (!user?.id) return;
    try {
      const { error } = await supabase.from("profiles").update(partial).eq("id", user.id);
      if (error) {
        // não trava UX
        console.warn("Exercicios: update profile (best effort) falhou:", error);
      }
    } catch (e) {
      console.warn("Exercicios: update profile (best effort) exception:", e);
    }
  }

  const isUnlocked = () => true;

  const completeWorkout = async (treino) => {
    setCompletingWorkout(true);
    try {
      const minutos = parseInt(treino.duration, 10) || 30;

      await createExerciseLog({
        tipo: "exercicio",
        intensidade: treino.intensityTag === "intenso" ? "alta" : treino.intensityTag === "leve" ? "baixa" : "media",
        tempo_min: minutos,
        data: toISODateLocal(new Date()),
        descricao: `Completou: ${treino.name} - ${minutos} min`,
        xp_ganho: treino.xp,
        treino_id: treino.id,
      });

      // Atualiza gamificação se as colunas existirem (best effort)
      const newXp = xpTotal + treino.xp;
      const newMetas = metasConcluidas + 1;
      const newRank = calcRankByXp(newXp);

      await updateProfileBestEffort({
        xp_total: newXp,
        metas_concluidas: newMetas,
        rank: newRank,
        dias_consecutivos: (Number(profile?.dias_consecutivos || 0) || 0) + 1,
      });

      await loadData();
      setSelectedTreino(null);
    } catch (e) {
      console.error("Exercicios: completeWorkout erro:", e);
      alert(e?.message || "Não foi possível registrar o treino.");
    } finally {
      setCompletingWorkout(false);
    }
  };

  const handleLogWorkout = async () => {
    if (!logForm.tipo || !logForm.tempo || !logForm.data) return;

    setIsLogging(true);
    try {
      const tempoMinutos = parseInt(logForm.tempo, 10);
      const xpGanho = calcXpFromForm(tempoMinutos, logForm.intensidade);

      await createExerciseLog({
        tipo: "exercicio",
        intensidade: logForm.intensidade,
        tempo_min: tempoMinutos,
        data: logForm.data,
        descricao: `${logForm.tipo} - Intensidade ${logForm.intensidade} - ${tempoMinutos} min`,
        xp_ganho: xpGanho,
        treino_id: null,
      });

      const newXp = xpTotal + xpGanho;
      const newMetas = metasConcluidas + 1;
      const newRank = calcRankByXp(newXp);

      await updateProfileBestEffort({
        xp_total: newXp,
        metas_concluidas: newMetas,
        rank: newRank,
      });

      setShowLogModal(false);
      setLogForm({ tipo: "", intensidade: "media", tempo: "", data: toISODateLocal(new Date()) });

      await loadData();
      alert(`🎉 Treino registrado! +${xpGanho} XP ganhos!`);
    } catch (e) {
      console.error("Exercicios: handleLogWorkout erro:", e);
      alert(e?.message || "Não foi possível registrar o treino.");
    } finally {
      setIsLogging(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-rose-50 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-8 h-8 border-3 border-red-600 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (fatalError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-rose-50">
        <div className="max-w-lg mx-auto px-4 pt-6 pb-24">
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => (window.location.href = createPageUrl("Dashboard"))}
              className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Treinos</h1>
              <p className="text-sm text-gray-500">Evolua seu corpo e seu rank</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-red-200">
            <div className="flex items-center gap-2 text-red-700 font-semibold">
              <AlertCircle className="w-5 h-5" />
              Erro ao carregar Exercícios
            </div>
            <div className="text-sm text-red-700 mt-2 break-words">{fatalError}</div>
            <Button className="mt-4 w-full" onClick={loadData}>
              Tentar novamente
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const recomendadoLabel =
    objetivoUsuario ? `Para: ${objetivoUsuario}` : "Personalize pelo seu objetivo";

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
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">Treinos</h1>
            <p className="text-sm text-gray-500">Evolua com consistência (e com foco no seu objetivo)</p>
          </div>
        </div>

        {/* Banner "eficaz": objetivo / nível */}
        <div className="bg-gradient-to-r from-red-500 to-rose-600 rounded-2xl p-4 text-white mb-6">
          <div className="flex items-center gap-2 font-semibold">
            <Target className="w-5 h-5" />
            {recomendadoLabel}
          </div>
          <div className="text-xs opacity-90 mt-1">
            {nivelUsuario ? `Nível: ${nivelUsuario}` : "Dica: complete o quiz para recomendações ainda melhores."}
          </div>
          {!objetivoUsuario && (
            <Button
              variant="secondary"
              className="mt-3 bg-white/15 hover:bg-white/25 text-white border border-white/20"
              onClick={() => (window.location.href = createPageUrl("Quiz"))}
            >
              Fazer quiz / ajustar objetivo
            </Button>
          )}
        </div>

        {/* Stats Rápidos */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white rounded-xl p-3 border border-gray-100 text-center">
            <Zap className="w-5 h-5 text-yellow-500 mx-auto mb-1" />
            <div className="font-bold text-gray-900">{xpTotal}</div>
            <div className="text-xs text-gray-500">XP Total</div>
          </div>
          <div className="bg-white rounded-xl p-3 border border-gray-100 text-center">
            <Trophy className="w-5 h-5 text-amber-500 mx-auto mb-1" />
            <div className="font-bold text-gray-900">{rank}</div>
            <div className="text-xs text-gray-500">Seu Rank</div>
          </div>
          <div className="bg-white rounded-xl p-3 border border-gray-100 text-center">
            <Star className="w-5 h-5 text-orange-500 mx-auto mb-1" />
            <div className="font-bold text-gray-900">{metasConcluidas}</div>
            <div className="text-xs text-gray-500">Concluídos</div>
          </div>
        </div>

        {/* Dashboard de Treinos */}
        <WorkoutDashboard activities={activities} />

        {/* Botões de Ação */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <Button
            onClick={() => setShowLogModal(true)}
            className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white py-5 rounded-xl shadow-md"
          >
            <Plus className="w-5 h-5 mr-2" />
            Registrar Treino
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
            <ActivityChart activities={activities} />
            <AIInsights
              profile={profile}
              activities={activities}
              colesterolRecords={colesterolRecords}
              mealLogs={mealLogs}
            />
          </motion.div>
        )}

        {/* Lista de Treinos */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Treinos Guiados</h2>
          <span className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded-full">
            {objetivoUsuario ? `Foco: ${objetivoUsuario}` : "Recomendação padrão"}
          </span>
        </div>

        <div className="space-y-3">
          {treinosOrdenados.map((treino, idx) => {
            const unlocked = isUnlocked(treino);
            const isRecomendado =
              !!objetivoUsuario && treino.objetivos?.includes(objetivoUsuario);

            return (
              <motion.div
                key={treino.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
              >
                <button
                  onClick={() => unlocked && setSelectedTreino(treino)}
                  disabled={!unlocked}
                  className={`w-full text-left bg-white rounded-2xl p-4 border-2 transition-all relative ${
                    isRecomendado
                      ? "border-red-300 shadow-md hover:shadow-lg cursor-pointer"
                      : "border-gray-100 hover:border-red-200 hover:shadow-md cursor-pointer"
                  }`}
                >
                  {isRecomendado && (
                    <div className="absolute -top-2 -right-2 bg-gradient-to-r from-red-500 to-rose-600 text-white px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1">
                      <Target className="w-3 h-3" />
                      IDEAL PARA VOCÊ
                    </div>
                  )}

                  <div className="flex items-center gap-4">
                    <div
                      className={`w-14 h-14 rounded-xl flex items-center justify-center ${
                        isRecomendado ? "bg-gradient-to-br from-red-500 to-rose-600" : "bg-red-100"
                      }`}
                    >
                      <Dumbbell className={`w-7 h-7 ${isRecomendado ? "text-white" : "text-red-600"}`} />
                    </div>

                    <div className="flex-1">
                      <div className="font-semibold text-gray-900">{treino.name}</div>
                      <div className="text-sm text-gray-500">{treino.desc}</div>

                      {treino.beneficio && (
                        <div className="text-xs text-red-600 font-medium mt-1">
                          💪 {treino.beneficio}
                        </div>
                      )}

                      <div className="flex items-center gap-3 mt-2 text-xs">
                        <span className="flex items-center gap-1 text-gray-400">
                          <Clock className="w-3 h-3" /> {treino.duration} min
                        </span>
                        <span className="flex items-center gap-1 text-yellow-500">
                          <Zap className="w-3 h-3" /> +{treino.xp} XP
                        </span>
                        <span className="flex items-center gap-1 text-orange-500">
                          <Flame className="w-3 h-3" /> {treino.calories} kcal
                        </span>
                      </div>
                    </div>

                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                </button>
              </motion.div>
            );
          })}
        </div>

        {/* Modal de Registro de Treino */}
        <AnimatePresence>
          {showLogModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
              onClick={() => !isLogging && setShowLogModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-3xl w-full max-w-md p-6"
              >
                <h3 className="text-xl font-bold text-gray-900 mb-2">Registrar Treino</h3>
                <p className="text-sm text-gray-500 mb-6">Preencha os dados do seu treino</p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Treino</label>
                    <Select value={logForm.tipo} onValueChange={(value) => setLogForm({ ...logForm, tipo: value })}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Caminhada">🚶 Caminhada</SelectItem>
                        <SelectItem value="Corrida">🏃 Corrida</SelectItem>
                        <SelectItem value="Ciclismo">🚴 Ciclismo</SelectItem>
                        <SelectItem value="Natação">🏊 Natação</SelectItem>
                        <SelectItem value="Musculação">💪 Musculação</SelectItem>
                        <SelectItem value="Yoga">🧘 Yoga</SelectItem>
                        <SelectItem value="Dança">💃 Dança</SelectItem>
                        <SelectItem value="Futebol">⚽ Futebol</SelectItem>
                        <SelectItem value="Outro">🏋️ Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Intensidade</label>
                    <Select
                      value={logForm.intensidade}
                      onValueChange={(value) => setLogForm({ ...logForm, intensidade: value })}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="baixa">🟢 Baixa (leve)</SelectItem>
                        <SelectItem value="media">🟡 Média (moderado)</SelectItem>
                        <SelectItem value="alta">🔴 Alta (intenso)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tempo (minutos)</label>
                    <Input
                      type="number"
                      placeholder="Ex: 30"
                      value={logForm.tempo}
                      onChange={(e) => setLogForm({ ...logForm, tempo: e.target.value })}
                      min="1"
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Data do Treino</label>
                    <Input
                      type="date"
                      value={logForm.data}
                      onChange={(e) => setLogForm({ ...logForm, data: e.target.value })}
                      max={toISODateLocal(new Date())}
                      className="w-full"
                    />
                  </div>

                  {logForm.tipo && logForm.tempo && (
                    <div className="bg-red-50 rounded-xl p-4 border border-red-200">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-700">XP estimado:</span>
                        <span className="font-bold text-red-600 flex items-center gap-1">
                          <Zap className="w-4 h-4" />
                          +{calcXpFromForm(parseInt(logForm.tempo, 10), logForm.intensidade)} XP
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 mt-6">
                  <Button
                    onClick={() => setShowLogModal(false)}
                    variant="outline"
                    className="flex-1"
                    disabled={isLogging}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleLogWorkout}
                    className="flex-1 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white"
                    disabled={!logForm.tipo || !logForm.tempo || !logForm.data || isLogging}
                  >
                    {isLogging ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                        className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                      />
                    ) : (
                      <>
                        <Check className="w-4 h-4 mr-1" />
                        Registrar
                      </>
                    )}
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modal de Treino Guiado */}
        <AnimatePresence>
          {selectedTreino && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 flex items-end justify-center z-50 p-4"
              onClick={() => setSelectedTreino(null)}
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

                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center">
                      <Dumbbell className="w-8 h-8 text-red-600" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">{selectedTreino.name}</h2>
                      <div className="flex items-center gap-3 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" /> {selectedTreino.duration} min
                        </span>
                        <span className="flex items-center gap-1 text-yellow-500">
                          <Zap className="w-4 h-4" /> +{selectedTreino.xp} XP
                        </span>
                        <span className="flex items-center gap-1 text-orange-500">
                          <Flame className="w-4 h-4" /> {selectedTreino.calories} kcal
                        </span>
                      </div>
                      {objetivoUsuario && selectedTreino.objetivos?.includes(objetivoUsuario) && (
                        <div className="mt-2 text-xs inline-flex items-center gap-1 bg-red-50 text-red-700 px-2 py-1 rounded-full border border-red-200">
                          <Target className="w-3 h-3" />
                          Recomendado para seu objetivo
                        </div>
                      )}
                    </div>
                  </div>

                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-red-600" />
                    Passo a passo
                  </h3>
                  <div className="space-y-3 mb-6">
                    {selectedTreino.exercises.map((ex, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                        <div className="w-8 h-8 rounded-lg bg-red-500 text-white flex items-center justify-center font-bold text-sm">
                          {idx + 1}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{ex.name}</div>
                          <div className="text-xs text-gray-500">{ex.desc}</div>
                        </div>
                        <div className="text-xs text-red-600 font-medium">{ex.duration}</div>
                      </div>
                    ))}
                  </div>

                  <Button
                    onClick={() => completeWorkout(selectedTreino)}
                    disabled={completingWorkout}
                    className="w-full bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white py-6 rounded-xl text-lg font-semibold"
                  >
                    {completingWorkout ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                        className="w-6 h-6 border-2 border-white border-t-transparent rounded-full"
                      />
                    ) : (
                      <>
                        <Check className="w-5 h-5 mr-2" />
                        Completar Treino (+{selectedTreino.xp} XP)
                      </>
                    )}
                  </Button>

                  <div className="text-[11px] text-gray-500 mt-3">
                    * Dica: consistência vale mais que intensidade. O app prioriza treinos coerentes com seu objetivo.
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
