// src/pages/Exercicios.jsx
import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Dumbbell,
  HeartPulse,
  Footprints,
  StretchHorizontal,
  Target,
  RefreshCcw,
  CheckCircle2,
  ChevronRight,
  X,
  Info,
  Plus,
  Trash2,
  Wand2,
  Trophy,
  Flame,
  Medal,
  Sparkles,
  RotateCcw,
  CalendarDays,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabaseClient";
import { createPageUrl } from "@/utils";

/**
 * =========================================================
 * OBJETIVOS
 * =========================================================
 */
const OBJETIVOS = [
  { id: "melhorar_habitos", label: "Melhorar hábitos", hint: "Consistência + leve/moderado" },
  { id: "perder_peso", label: "Perder peso", hint: "Cardio + força em circuito" },
  { id: "hipertrofia", label: "Hipertrofia", hint: "Força progressiva" },
  { id: "condicionamento", label: "Condicionamento", hint: "Resistência e fôlego" },
  { id: "mobilidade", label: "Mobilidade", hint: "Alongamento e amplitude" },
];

/**
 * =========================================================
 * HELPERS
 * =========================================================
 */
function normalizeObjetivo(raw) {
  const s = (raw || "").toString().trim().toLowerCase();
  if (!s) return null;

  if (OBJETIVOS.some((o) => o.id === s)) return s;

  if (s.includes("perder") || s.includes("emag")) return "perder_peso";
  if (s.includes("hipertrof") || s.includes("massa")) return "hipertrofia";
  if (s.includes("condicion") || s.includes("fôlego") || s.includes("cardio")) return "condicionamento";
  if (s.includes("mobil") || s.includes("along")) return "mobilidade";
  if (s.includes("hábito") || s.includes("habito") || s.includes("rotina")) return "melhorar_habitos";

  const found = OBJETIVOS.find((o) => o.label.toLowerCase() === s);
  return found?.id ?? "melhorar_habitos";
}

function objetivoLabel(objId) {
  return OBJETIVOS.find((o) => o.id === objId)?.label ?? "Não definido";
}

function safeObj(v) {
  return v && typeof v === "object" && !Array.isArray(v) ? v : {};
}

function safeArr(v) {
  return Array.isArray(v) ? v : [];
}

function toNumberOrNull(v) {
  if (v == null) return null;
  const s = String(v).trim().replace(",", ".");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function getTodayKey() {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

function formatDateBR(isoDate) {
  try {
    const [y, m, d] = String(isoDate).split("-");
    if (!y || !m || !d) return isoDate;
    return `${d}/${m}/${y}`;
  } catch {
    return isoDate;
  }
}

function parseISODateLocal(isoDate) {
  if (!isoDate) return null;
  const [y, m, d] = String(isoDate).split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function diffDays(a, b) {
  const ms = 24 * 60 * 60 * 1000;
  const utcA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const utcB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((utcA - utcB) / ms);
}

function buildProgressEntry(prev = {}) {
  return {
    completedExerciseIds: safeArr(prev.completedExerciseIds),
    completedWorkoutIds: safeArr(prev.completedWorkoutIds),
    points: Number(prev.points) || 0,
    updatedAt: prev.updatedAt || new Date().toISOString(),
  };
}

function calcCurrentStreak(progressMap) {
  const entries = Object.entries(safeObj(progressMap))
    .filter(([, value]) => {
      const v = safeObj(value);
      return (Number(v.points) || 0) > 0 || safeArr(v.completedExerciseIds).length > 0;
    })
    .map(([date]) => date)
    .sort((a, b) => b.localeCompare(a));

  if (entries.length === 0) return 0;

  let streak = 0;
  let cursor = parseISODateLocal(getTodayKey());
  if (!cursor) return 0;

  const entrySet = new Set(entries);

  while (cursor) {
    const y = cursor.getFullYear();
    const m = String(cursor.getMonth() + 1).padStart(2, "0");
    const d = String(cursor.getDate()).padStart(2, "0");
    const key = `${y}-${m}-${d}`;

    if (entrySet.has(key)) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
      continue;
    }

    break;
  }

  return streak;
}

function calcTotalPoints(progressMap) {
  return Object.values(safeObj(progressMap)).reduce((sum, entry) => sum + (Number(entry?.points) || 0), 0);
}

function calcWorkoutDays(progressMap) {
  return Object.values(safeObj(progressMap)).filter((entry) => {
    return (Number(entry?.points) || 0) > 0 || safeArr(entry?.completedExerciseIds).length > 0;
  }).length;
}

function getBadges({ totalPoints, streak, totalWorkoutDays, totalExercisesCompleted }) {
  const badges = [];

  if (totalExercisesCompleted >= 1) {
    badges.push({
      id: "primeiro_passo",
      title: "Primeiro passo",
      desc: "Concluiu o primeiro exercício",
      icon: Star,
    });
  }

  if (totalWorkoutDays >= 3) {
    badges.push({
      id: "consistencia_3",
      title: "Consistência 3x",
      desc: "Treinou em 3 dias",
      icon: Medal,
    });
  }

  if (streak >= 3) {
    badges.push({
      id: "streak_3",
      title: "Streak 3 dias",
      desc: "3 dias seguidos em ação",
      icon: Flame,
    });
  }

  if (streak >= 7) {
    badges.push({
      id: "streak_7",
      title: "Streak 7 dias",
      desc: "Uma semana de consistência",
      icon: Trophy,
    });
  }

  if (totalPoints >= 100) {
    badges.push({
      id: "pontos_100",
      title: "100 pontos",
      desc: "Acumulou 100 pontos",
      icon: Trophy,
    });
  }

  if (totalPoints >= 300) {
    badges.push({
      id: "pontos_300",
      title: "300 pontos",
      desc: "Evolução forte",
      icon: Sparkles,
    });
  }

  return badges;
}

/**
 * =========================================================
 * PLANO SUGERIDO
 * =========================================================
 */
function buildSuggestedPlan(objId) {
  const common = {
    disclaimer:
      "Essas sugestões são educativas e baseadas em práticas comuns de treino. Se você tiver restrições médicas, adapte com um profissional.",
  };

  switch (objId) {
    case "perder_peso":
      return {
        ...common,
        headline: "Plano sugerido focado em Perder Peso",
        cards: [
          {
            key: "treino_a",
            icon: Dumbbell,
            title: "Treino A (Circuito Full Body)",
            duration: "25–40 min",
            intensity: "Leve/Moderada",
            desc: "Força em circuito + pouco descanso para elevar gasto calórico.",
            items: [
              "Agachamento (3x10–12)",
              "Flexão inclinada (3x8–12)",
              "Remada elástica (3x10–12)",
              "Afundo alternado (3x10 cada perna)",
              "Prancha (3x30–45s)",
            ],
          },
          {
            key: "cardio",
            icon: Footprints,
            title: "Cardio (caminhada rápida)",
            duration: "25–45 min",
            intensity: "Moderada",
            desc: "Zona confortável (consegue falar frases curtas).",
            items: ["Caminhada contínua", "Opcional: 5x (1 min mais rápido / 2 min normal)"],
          },
          {
            key: "mobilidade",
            icon: StretchHorizontal,
            title: "Mobilidade curta",
            duration: "8–12 min",
            intensity: "Leve",
            desc: "Diminui tensão e melhora qualidade do movimento.",
            items: ["Alongar peitoral e quadril", "Mobilidade coluna torácica", "Panturrilha e posterior"],
          },
        ],
        weekly: ["4 sessões/semana (2 força + 2 cardio)", "Meta: +5 min cardio/sem ou +1 série em 1 exercício"],
      };

    case "hipertrofia":
      return {
        ...common,
        headline: "Plano sugerido focado em Hipertrofia",
        cards: [
          {
            key: "treino_a",
            icon: Dumbbell,
            title: "Treino A (Força Progressiva)",
            duration: "35–55 min",
            intensity: "Moderada",
            desc: "Volume e progressão (aumentar repetições/carga ao longo das semanas).",
            items: [
              "Agachamento (4x6–10)",
              "Flexão/ Supino (4x6–12)",
              "Remada (4x8–12)",
              "Elevação pélvica (3x10–12)",
              "Core: prancha (3x45–60s)",
            ],
          },
          {
            key: "treino_b",
            icon: Dumbbell,
            title: "Treino B (Ênfase superiores)",
            duration: "35–55 min",
            intensity: "Moderada",
            desc: "Mais estímulo para costas/peito/braços.",
            items: [
              "Remada (4x8–12)",
              "Flexão (4x8–15)",
              "Desenvolvimento ombro (3x8–12)",
              "Rosca bíceps (3x10–12)",
              "Tríceps (3x10–12)",
            ],
          },
          {
            key: "recuperacao",
            icon: HeartPulse,
            title: "Recuperação ativa",
            duration: "15–25 min",
            intensity: "Leve",
            desc: "Ajuda a manter consistência sem estourar fadiga.",
            items: ["Caminhada leve", "Mobilidade 10 min", "Sono e hidratação como prioridade"],
          },
        ],
        weekly: ["3–4 sessões/semana (A/B alternando)", "Meta: +1 rep por semana até o topo do range, depois aumenta carga"],
      };

    case "condicionamento":
      return {
        ...common,
        headline: "Plano sugerido focado em Condicionamento",
        cards: [
          {
            key: "intervalado",
            icon: Footprints,
            title: "Cardio intervalado leve",
            duration: "20–30 min",
            intensity: "Moderada",
            desc: "Melhora fôlego sem ser agressivo.",
            items: ["5 min aquecimento", "8x (1 min rápido + 1 min leve)", "5 min desaquecimento"],
          },
          {
            key: "forca_base",
            icon: Dumbbell,
            title: "Força básica",
            duration: "25–35 min",
            intensity: "Leve/Moderada",
            desc: "Base muscular para sustentar evolução do cardio.",
            items: ["Agachamento (3x10)", "Remada (3x10)", "Flexão (3x8–12)", "Prancha (3x30–45s)"],
          },
          {
            key: "mobilidade",
            icon: StretchHorizontal,
            title: "Mobilidade + respiração",
            duration: "10–15 min",
            intensity: "Leve",
            desc: "Melhora relaxamento e padrão respiratório.",
            items: ["Alongamento de quadril", "Torácica", "Respiração diafragmática 3–5 min"],
          },
        ],
        weekly: ["4 sessões/semana (2 cardio + 2 força)", "Meta: +1 intervalo por semana ou +2 min total"],
      };

    case "mobilidade":
      return {
        ...common,
        headline: "Plano sugerido focado em Mobilidade",
        cards: [
          {
            key: "rotina_mob",
            icon: StretchHorizontal,
            title: "Rotina diária (mobilidade)",
            duration: "10–15 min",
            intensity: "Leve",
            desc: "Amplitude + postura para reduzir dores e rigidez.",
            items: ["Coluna torácica", "Quadril", "Tornozelo", "Peitoral"],
          },
          {
            key: "forca_suave",
            icon: Dumbbell,
            title: "Força suave",
            duration: "20–30 min",
            intensity: "Leve",
            desc: "Fortalece sem travar. Priorize controle do movimento.",
            items: ["Agachamento lento (3x8–10)", "Remada elástica (3x10)", "Ponte glútea (3x12)", "Prancha (3x30s)"],
          },
          {
            key: "caminhada",
            icon: Footprints,
            title: "Caminhada leve",
            duration: "15–30 min",
            intensity: "Leve",
            desc: "Circulação + consistência.",
            items: ["Passo confortável", "Foco em regularidade"],
          },
        ],
        weekly: ["5–6 sessões/semana (curtas)", "Meta: +2 min na rotina de mobilidade a cada semana"],
      };

    case "melhorar_habitos":
    default:
      return {
        ...common,
        headline: "Plano sugerido focado em Melhorar Hábitos",
        cards: [
          {
            key: "forca_base",
            icon: Dumbbell,
            title: "Treino A (Força Básica)",
            duration: "25–35 min",
            intensity: "Leve/Moderada",
            desc: "Base para postura, energia e confiança.",
            items: ["Agachamento com peso do corpo (3x12)", "Remada elástica (3x12)", "Flexão inclinada (3x8–12)", "Prancha (3x30s)"],
          },
          {
            key: "cardio_leve",
            icon: Footprints,
            title: "Cardio leve (caminhada)",
            duration: "20–30 min",
            intensity: "Leve/Moderada",
            desc: "Fácil de manter e ótimo custo-benefício para saúde.",
            items: ["Caminhada contínua", "Sem sofrimento: manter regularidade"],
          },
          {
            key: "mobilidade",
            icon: StretchHorizontal,
            title: "Mobilidade curta",
            duration: "8–12 min",
            intensity: "Leve",
            desc: "Reduz tensão e melhora qualidade do movimento.",
            items: ["Alongar peitoral e quadril", "Mobilidade coluna torácica"],
          },
        ],
        weekly: ["3 sessões/semana (força + caminhada + mobilidade)", "Meta: 1% melhor por semana (mais 1 série, +5 min, etc.)"],
      };
  }
}

/**
 * =========================================================
 * SUGESTÕES DO APP EM CIMA DO TREINO DO USUÁRIO
 * =========================================================
 */
function generateImprovements(customPlan = [], meta = {}) {
  const plan = safeArr(customPlan);
  const allExercises = plan.flatMap((w) => safeArr(w.exercises));
  const names = allExercises.map((e) => (e?.name || "").toLowerCase());
  const limit = (meta?.limitacoes || "").toLowerCase();

  const suggestions = [];

  if (plan.length === 0) {
    suggestions.push("Você ainda não criou nenhum treino. Crie pelo menos 1 treino (ex: Treino A) e adicione exercícios.");
    return suggestions;
  }

  if (allExercises.length < 4) {
    suggestions.push("Seu plano tem poucos exercícios. Para ser mais completo, tente ter pelo menos 4–8 exercícios no total (somando todos os treinos).");
  }

  const hasWarmup = names.some((n) => n.includes("aquec") || n.includes("caminh") || n.includes("bike") || n.includes("esteira"));
  if (!hasWarmup) suggestions.push("Sugestão: inclua um aquecimento leve (5–10 min) em pelo menos 2 dias/semana.");

  const hasMobility = names.some((n) => n.includes("along") || n.includes("mobil") || n.includes("respira"));
  if (!hasMobility) suggestions.push("Sugestão: inclua 8–12 min de mobilidade/alongamento em 2–3 dias/semana.");

  const hasLeg = names.some((n) => n.includes("agach") || n.includes("leg") || n.includes("afundo") || n.includes("terra") || n.includes("passada"));
  const hasBack = names.some((n) => n.includes("remad") || n.includes("pux") || n.includes("costas"));
  const hasChest = names.some((n) => n.includes("supino") || n.includes("flex") || n.includes("peito"));

  if (!hasLeg) suggestions.push("Seu plano está sem pernas. Sugestão: inclua 1 exercício de pernas (ex: agachamento, passada, leg press).");
  if (!hasBack) suggestions.push("Seu plano está sem costas. Sugestão: inclua 1 exercício de puxada/remada.");
  if (!hasChest) suggestions.push("Seu plano está sem peito. Sugestão: inclua flexão ou supino.");

  if (limit.includes("lombar")) {
    suggestions.push("Observação (lombar): prefira exercícios com controle e menos carga axial. Evite exagero em levantamento terra pesado sem orientação.");
  }

  if (meta?.diasSemana >= 6) {
    suggestions.push("Você marcou muitos dias/semana. Para manter consistência, considere 4–5 dias bem feitos antes de subir para 6–7.");
  }

  if (meta?.tempoMin >= 75) {
    suggestions.push("Se seu treino estiver muito longo, uma ideia é dividir em A/B ou reduzir volume para não desistir por cansaço.");
  }

  suggestions.push("Dica de progresso: quando ficar fácil, aumente 1 variável por vez (repetições OU série OU carga), não tudo junto.");

  return suggestions;
}

/**
 * =========================================================
 * COMPONENTE PRINCIPAL
 * =========================================================
 */
export default function Exercicios() {
  const [loading, setLoading] = useState(true);
  const [savingProgress, setSavingProgress] = useState(false);

  const [userEmail, setUserEmail] = useState("");
  const [profileRow, setProfileRow] = useState(null);

  const [showGoalModal, setShowGoalModal] = useState(false);
  const [goalDraft, setGoalDraft] = useState("melhorar_habitos");

  const [showCustomize, setShowCustomize] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [custom, setCustom] = useState({
    nivel: "iniciante",
    diasSemana: 3,
    tempoMin: 30,
    local: "casa",
    limitacoes: "",
    useCustomPlan: true,
    customPlan: [
      {
        id: crypto?.randomUUID?.() || String(Date.now()),
        name: "Treino A",
        exercises: [
          {
            id: crypto?.randomUUID?.() || String(Date.now() + 1),
            name: "Caminhada",
            sets: "",
            reps: "20 min",
            notes: "",
          },
        ],
      },
    ],
    progress: {},
  });

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);

        const { data: sessionData } = await supabase.auth.getSession();
        const session = sessionData?.session;

        if (!session?.user) {
          window.location.href = `/login?next=${encodeURIComponent("/exercicios")}`;
          return;
        }

        setUserEmail(session.user.email || "");

        let prof = null;
        try {
          const { data, error } = await supabase
            .from("profiles")
            .select("id, exercicios_objetivo, exercicios_custom")
            .eq("id", session.user.id)
            .maybeSingle();

          if (!error && data) prof = data;
        } catch {
          prof = null;
        }

        setProfileRow(prof);

        const dbCustom = safeObj(prof?.exercicios_custom);
        if (Object.keys(dbCustom).length > 0) {
          setCustom((prev) => ({
            ...prev,
            ...dbCustom,
            customPlan: safeArr(dbCustom.customPlan).map((w) => ({
              id: w?.id || crypto?.randomUUID?.() || String(Date.now()),
              name: w?.name || "Treino",
              exercises: safeArr(w?.exercises).map((e) => ({
                id: e?.id || crypto?.randomUUID?.() || String(Date.now()),
                name: e?.name || "",
                sets: e?.sets ?? "",
                reps: e?.reps ?? "",
                notes: e?.notes ?? "",
              })),
            })),
            progress: safeObj(dbCustom.progress),
          }));
        }

        const existingRaw = prof?.exercicios_objetivo ?? "";
        const normalized = normalizeObjetivo(existingRaw) || "melhorar_habitos";
        setGoalDraft(normalized);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const todayKey = useMemo(() => getTodayKey(), []);
  const todayProgress = useMemo(() => buildProgressEntry(custom.progress?.[todayKey]), [custom.progress, todayKey]);

  const completedExerciseIds = useMemo(() => new Set(safeArr(todayProgress.completedExerciseIds)), [todayProgress]);
  const completedWorkoutIds = useMemo(() => new Set(safeArr(todayProgress.completedWorkoutIds)), [todayProgress]);

  const objetivoId = useMemo(() => {
    const raw = profileRow?.exercicios_objetivo ?? "";
    return normalizeObjetivo(raw);
  }, [profileRow]);

  const objetivoAtualLabel = objetivoLabel(objetivoId);
  const suggestedPlan = useMemo(() => buildSuggestedPlan(objetivoId || "melhorar_habitos"), [objetivoId]);

  const metaSummary = useMemo(() => {
    const dias = Math.min(Math.max(toNumberOrNull(custom.diasSemana) || 3, 1), 7);
    const tempo = Math.min(Math.max(toNumberOrNull(custom.tempoMin) || 30, 10), 120);
    const nivel = (custom.nivel || "iniciante").toLowerCase();
    const local = (custom.local || "casa").toLowerCase();
    return { dias, tempo, nivel, local };
  }, [custom]);

  const hasCustomPlan = useMemo(() => safeArr(custom.customPlan).length > 0, [custom]);

  const mainPlanCards = useMemo(() => {
    if (custom.useCustomPlan && hasCustomPlan) {
      return safeArr(custom.customPlan).map((w) => ({
        key: w.id,
        icon: Dumbbell,
        title: w.name || "Treino",
        duration: `${metaSummary.tempo} min`,
        intensity:
          metaSummary.nivel === "avancado"
            ? "Moderada/Alta"
            : metaSummary.nivel === "intermediario"
            ? "Moderada"
            : "Leve/Moderada",
        desc: `Plano do usuário • ${metaSummary.dias}x/sem • ${metaSummary.local}`,
        isCustom: true,
        items: safeArr(w.exercises).map((e, idx) => {
          const sets = (e.sets || "").trim();
          const reps = (e.reps || "").trim();
          const notes = (e.notes || "").trim();
          const right = [sets ? `${sets} séries` : "", reps ? `${reps}` : ""].filter(Boolean).join(" • ");
          const base = `${(e.name || "").trim() || `Exercício ${idx + 1}`}`;
          const extra = right ? ` (${right})` : "";
          const obs = notes ? ` — ${notes}` : "";
          return {
            id: e.id,
            label: `${base}${extra}${obs}`,
          };
        }),
      }));
    }

    return safeArr(suggestedPlan.cards).map((c) => ({
      ...c,
      isCustom: false,
      items: safeArr(c.items).map((it, idx) => ({
        id: `${c.key}_${idx}`,
        label: it,
      })),
    }));
  }, [custom.useCustomPlan, hasCustomPlan, custom.customPlan, metaSummary, suggestedPlan.cards]);

  const mainHeadline = useMemo(() => {
    if (custom.useCustomPlan && hasCustomPlan) return "Seu plano personalizado";
    return suggestedPlan.headline;
  }, [custom.useCustomPlan, hasCustomPlan, suggestedPlan.headline]);

  const mainWeekly = useMemo(() => {
    if (custom.useCustomPlan && hasCustomPlan) {
      return [
        `${metaSummary.dias} sessões/semana (definido por você)`,
        "Meta: consistência primeiro. Depois evolua 1% por semana (tempo, repetições ou carga).",
      ];
    }
    return suggestedPlan.weekly;
  }, [custom.useCustomPlan, hasCustomPlan, metaSummary, suggestedPlan.weekly]);

  const improvementList = useMemo(() => {
    return generateImprovements(custom.customPlan, {
      diasSemana: metaSummary.dias,
      tempoMin: metaSummary.tempo,
      limitacoes: custom.limitacoes || "",
    });
  }, [custom.customPlan, metaSummary, custom.limitacoes]);

  const completedExercisesCount = useMemo(() => completedExerciseIds.size, [completedExerciseIds]);
  const completedWorkoutsCountToday = useMemo(() => completedWorkoutIds.size, [completedWorkoutIds]);
  const totalExercisesCountToday = useMemo(() => mainPlanCards.flatMap((c) => safeArr(c.items)).length, [mainPlanCards]);
  const overallProgressPercent = useMemo(() => {
    if (!totalExercisesCountToday) return 0;
    return Math.round((completedExercisesCount / totalExercisesCountToday) * 100);
  }, [completedExercisesCount, totalExercisesCountToday]);

  const todayPoints = useMemo(() => Number(todayProgress.points) || 0, [todayProgress]);

  const progressStats = useMemo(() => {
    const progressMap = safeObj(custom.progress);

    const totalPoints = calcTotalPoints(progressMap);
    const totalWorkoutDays = calcWorkoutDays(progressMap);

    const totalExercisesCompleted = Object.values(progressMap).reduce((sum, entry) => {
      return sum + safeArr(entry?.completedExerciseIds).length;
    }, 0);

    const streak = calcCurrentStreak(progressMap);
    const badges = getBadges({
      totalPoints,
      streak,
      totalWorkoutDays,
      totalExercisesCompleted,
    });

    return {
      totalPoints,
      totalWorkoutDays,
      totalExercisesCompleted,
      streak,
      badges,
    };
  }, [custom.progress]);

  /**
   * =========================================================
   * DB
   * =========================================================
   */
  async function saveObjetivo(newObjId) {
    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData?.session;
    if (!session?.user) throw new Error("Sessão expirada. Faça login novamente.");

    const userId = session.user.id;

    const { error } = await supabase
      .from("profiles")
      .upsert({ id: userId, exercicios_objetivo: newObjId }, { onConflict: "id" });

    if (error) throw new Error(error.message);

    setProfileRow((p) => ({ ...(p || { id: userId }), exercicios_objetivo: newObjId }));
  }

  async function saveCustomToDb(nextCustom) {
    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData?.session;
    if (!session?.user) throw new Error("Sessão expirada. Faça login novamente.");

    const userId = session.user.id;

    const payload = {
      ...nextCustom,
      customPlan: safeArr(nextCustom.customPlan),
      progress: safeObj(nextCustom.progress),
    };

    const { error } = await supabase
      .from("profiles")
      .upsert({ id: userId, exercicios_custom: payload }, { onConflict: "id" });

    if (error) throw new Error(error.message);

    setProfileRow((p) => ({ ...(p || { id: userId }), exercicios_custom: payload }));
  }

  async function commitCustomUpdate(nextCustom) {
    const previous = custom;
    setCustom(nextCustom);

    try {
      setSavingProgress(true);
      await saveCustomToDb(nextCustom);
    } catch (e) {
      console.error(e);
      setCustom(previous);
      alert(`Erro ao salvar: ${e?.message || e}`);
    } finally {
      setSavingProgress(false);
    }
  }

  /**
   * =========================================================
   * GAMIFICAÇÃO
   * =========================================================
   */
  async function toggleExerciseComplete(exerciseId, workoutId) {
    const currentEntry = buildProgressEntry(custom.progress?.[todayKey]);
    const exerciseSet = new Set(safeArr(currentEntry.completedExerciseIds));
    const workoutSet = new Set(safeArr(currentEntry.completedWorkoutIds));

    const wasCompleted = exerciseSet.has(exerciseId);

    if (wasCompleted) {
      exerciseSet.delete(exerciseId);
    } else {
      exerciseSet.add(exerciseId);
    }

    // recalcula workout concluído automaticamente
    const targetWorkout = mainPlanCards.find((card) => card.key === workoutId);
    if (targetWorkout) {
      const allIds = safeArr(targetWorkout.items).map((item) => item.id);
      const allDone = allIds.length > 0 && allIds.every((id) => exerciseSet.has(id));

      if (allDone) {
        workoutSet.add(workoutId);
      } else {
        workoutSet.delete(workoutId);
      }
    }

    const points = exerciseSet.size * 10 + workoutSet.size * 20;

    const next = {
      ...custom,
      progress: {
        ...safeObj(custom.progress),
        [todayKey]: {
          completedExerciseIds: Array.from(exerciseSet),
          completedWorkoutIds: Array.from(workoutSet),
          points,
          updatedAt: new Date().toISOString(),
        },
      },
    };

    await commitCustomUpdate(next);
  }

  async function completeWorkout(card) {
    const currentEntry = buildProgressEntry(custom.progress?.[todayKey]);
    const exerciseSet = new Set(safeArr(currentEntry.completedExerciseIds));
    const workoutSet = new Set(safeArr(currentEntry.completedWorkoutIds));

    safeArr(card.items).forEach((item) => exerciseSet.add(item.id));
    workoutSet.add(card.key);

    const points = exerciseSet.size * 10 + workoutSet.size * 20;

    const next = {
      ...custom,
      progress: {
        ...safeObj(custom.progress),
        [todayKey]: {
          completedExerciseIds: Array.from(exerciseSet),
          completedWorkoutIds: Array.from(workoutSet),
          points,
          updatedAt: new Date().toISOString(),
        },
      },
    };

    await commitCustomUpdate(next);
  }

  async function resetTodayProgress() {
    const ok = window.confirm("Deseja limpar o progresso de hoje?");
    if (!ok) return;

    const nextProgress = { ...safeObj(custom.progress) };
    delete nextProgress[todayKey];

    const next = {
      ...custom,
      progress: nextProgress,
    };

    await commitCustomUpdate(next);
  }

  /**
   * =========================================================
   * EDITOR PLANO
   * =========================================================
   */
  function addWorkout() {
    setCustom((prev) => ({
      ...prev,
      customPlan: [
        ...safeArr(prev.customPlan),
        {
          id: crypto?.randomUUID?.() || String(Date.now()),
          name: `Treino ${String.fromCharCode(65 + safeArr(prev.customPlan).length)}`,
          exercises: [],
        },
      ],
    }));
  }

  function removeWorkout(workoutId) {
    setCustom((prev) => ({
      ...prev,
      customPlan: safeArr(prev.customPlan).filter((w) => w.id !== workoutId),
    }));
  }

  function updateWorkoutName(workoutId, name) {
    setCustom((prev) => ({
      ...prev,
      customPlan: safeArr(prev.customPlan).map((w) => (w.id === workoutId ? { ...w, name } : w)),
    }));
  }

  function addExercise(workoutId) {
    setCustom((prev) => ({
      ...prev,
      customPlan: safeArr(prev.customPlan).map((w) => {
        if (w.id !== workoutId) return w;
        return {
          ...w,
          exercises: [
            ...safeArr(w.exercises),
            {
              id: crypto?.randomUUID?.() || String(Date.now()),
              name: "",
              sets: "",
              reps: "",
              notes: "",
            },
          ],
        };
      }),
    }));
  }

  function removeExercise(workoutId, exId) {
    setCustom((prev) => ({
      ...prev,
      customPlan: safeArr(prev.customPlan).map((w) => {
        if (w.id !== workoutId) return w;
        return {
          ...w,
          exercises: safeArr(w.exercises).filter((e) => e.id !== exId),
        };
      }),
    }));
  }

  function updateExercise(workoutId, exId, patch) {
    setCustom((prev) => ({
      ...prev,
      customPlan: safeArr(prev.customPlan).map((w) => {
        if (w.id !== workoutId) return w;
        return {
          ...w,
          exercises: safeArr(w.exercises).map((e) => (e.id === exId ? { ...e, ...patch } : e)),
        };
      }),
    }));
  }

  /**
   * =========================================================
   * LOADING
   * =========================================================
   */
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50">
      <div className="max-w-6xl mx-auto px-4 pt-6 pb-24">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => (window.location.href = createPageUrl("Dashboard"))}
              className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>

            <div>
              <h1 className="text-xl font-bold text-gray-900">Exercícios</h1>
              <p className="text-sm text-gray-500">Plano principal, progresso e gamificação</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button onClick={() => setShowGoalModal(true)} variant="outline" className="rounded-xl">
              <RefreshCcw className="w-4 h-4 mr-2" />
              Redefinir objetivo
            </Button>

            <Button
              onClick={() => setShowCustomize(true)}
              className="rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700"
            >
              Personalizar treino
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>

        {/* Card objetivo */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm mb-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm text-gray-500 flex items-center gap-2">
                <Target className="w-4 h-4" />
                Objetivo atual
              </div>

              <div className="text-2xl font-bold text-gray-900 mt-1">{objetivoAtualLabel}</div>

              <div className="text-sm text-gray-600 mt-1">
                {objetivoId
                  ? OBJETIVOS.find((o) => o.id === objetivoId)?.hint
                  : "Não definido — recomendamos escolher um objetivo."}
              </div>

              <div className="mt-3 flex items-start gap-2 text-xs text-gray-500">
                <Info className="w-4 h-4 mt-0.5" />
                <div>{suggestedPlan.disclaimer}</div>
              </div>
            </div>

            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 min-w-[260px] hidden md:block">
              <div className="text-xs text-indigo-700 font-semibold mb-1">Plano em uso</div>
              <div className="text-sm text-indigo-900">
                {custom.useCustomPlan && hasCustomPlan ? "Plano personalizado (seu)" : "Plano sugerido (app)"}
              </div>
              <div className="text-xs text-indigo-700 mt-2">
                {metaSummary.dias}x/sem • {metaSummary.tempo} min • {metaSummary.local}
              </div>

              {custom.limitacoes?.trim() ? (
                <div className="text-xs text-indigo-700 mt-2">
                  <span className="font-semibold">Limitações:</span> {custom.limitacoes}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* Dashboard gamificado */}
        <div className="grid md:grid-cols-4 gap-4 mb-5">
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
              <Trophy className="w-4 h-4 text-amber-500" />
              Pontos de hoje
            </div>
            <div className="text-3xl font-bold text-gray-900">{todayPoints}</div>
            <div className="text-xs text-gray-500 mt-1">+10 por exercício • +20 por treino completo</div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Exercícios
            </div>
            <div className="text-3xl font-bold text-gray-900">{completedExercisesCount}</div>
            <div className="text-xs text-gray-500 mt-1">Concluídos hoje</div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
              <Flame className="w-4 h-4 text-rose-500" />
              Streak
            </div>
            <div className="text-3xl font-bold text-gray-900">{progressStats.streak}</div>
            <div className="text-xs text-gray-500 mt-1">Dias seguidos</div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
              <CalendarDays className="w-4 h-4 text-indigo-600" />
              Dias ativos
            </div>
            <div className="text-3xl font-bold text-gray-900">{progressStats.totalWorkoutDays}</div>
            <div className="text-xs text-gray-500 mt-1">Desde o início</div>
          </div>
        </div>

        {/* Resumo forte */}
        <div className="grid lg:grid-cols-3 gap-4 mb-5">
          <div className="lg:col-span-2 bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div>
                <div className="text-sm text-gray-500">Progresso de hoje</div>
                <div className="text-lg font-bold text-gray-900">
                  {overallProgressPercent}% concluído • {formatDateBR(todayKey)}
                </div>
              </div>

              <Button variant="outline" className="rounded-xl" onClick={resetTodayProgress} disabled={savingProgress}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Limpar hoje
              </Button>
            </div>

            <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-600 via-blue-600 to-emerald-500 transition-all duration-500"
                style={{ width: `${overallProgressPercent}%` }}
              />
            </div>

            <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-500">
              <div>{completedExercisesCount}/{totalExercisesCountToday} exercícios</div>
              <div>{completedWorkoutsCountToday} treino(s) completo(s) hoje</div>
              {savingProgress ? <div>Salvando...</div> : <div>Salvo automaticamente</div>}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <div className="text-sm text-gray-500">Resumo acumulado</div>
            <div className="text-lg font-bold text-gray-900 mt-1">Seu desempenho</div>

            <div className="mt-4 space-y-3 text-sm text-gray-700">
              <div className="flex items-center justify-between">
                <span>Pontos totais</span>
                <span className="font-semibold">{progressStats.totalPoints}</span>
              </div>

              <div className="flex items-center justify-between">
                <span>Exercícios concluídos</span>
                <span className="font-semibold">{progressStats.totalExercisesCompleted}</span>
              </div>

              <div className="flex items-center justify-between">
                <span>Melhor streak</span>
                <span className="font-semibold">{progressStats.streak} dias atuais</span>
              </div>
            </div>
          </div>
        </div>

        {/* Badges */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm mb-5">
          <div className="flex items-center gap-2 mb-4">
            <Medal className="w-5 h-5 text-amber-500" />
            <div className="font-semibold text-gray-900">Badges e conquistas</div>
          </div>

          {progressStats.badges.length === 0 ? (
            <div className="text-sm text-gray-500">
              Conclua seus primeiros exercícios para desbloquear badges.
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
              {progressStats.badges.map((badge) => {
                const Icon = badge.icon;
                return (
                  <div
                    key={badge.id}
                    className="rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50 to-yellow-50 p-4"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className="w-5 h-5 text-amber-600" />
                      <div className="font-semibold text-gray-900">{badge.title}</div>
                    </div>
                    <div className="text-sm text-gray-600">{badge.desc}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Plano PRINCIPAL */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm mb-4">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <div className="text-sm text-gray-500">Plano principal</div>
              <div className="text-lg font-bold text-gray-900">{mainHeadline}</div>
            </div>

            {custom.useCustomPlan && hasCustomPlan ? (
              <Button variant="outline" className="rounded-xl" onClick={() => setShowSuggestions(true)}>
                <Wand2 className="w-4 h-4 mr-2" />
                Sugestões do app
              </Button>
            ) : null}
          </div>

          <div className="grid lg:grid-cols-3 gap-4">
            {mainPlanCards.map((card) => {
              const Icon = card.icon;
              const itemIds = safeArr(card.items).map((item) => item.id);
              const completedItems = itemIds.filter((id) => completedExerciseIds.has(id)).length;
              const totalItems = itemIds.length;
              const allDone = totalItems > 0 && completedItems === totalItems;
              const progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
              const isWorkoutDone = completedWorkoutIds.has(card.key);

              return (
                <div key={card.key} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Icon className="w-5 h-5 text-indigo-700" />
                      <div className="font-semibold text-gray-900">{card.title}</div>
                    </div>
                    <div className="text-xs text-gray-500">{card.duration}</div>
                  </div>

                  <div className="text-sm text-gray-600 mb-3">{card.desc}</div>

                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="inline-flex items-center gap-2 text-xs px-2 py-1 rounded-full border bg-slate-50 text-slate-700">
                      <HeartPulse className="w-3 h-3" />
                      Intensidade: {card.intensity}
                    </div>

                    <div
                      className={`text-xs px-2 py-1 rounded-full border ${
                        allDone
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      }`}
                    >
                      {allDone ? "Concluído" : `${completedItems}/${totalItems}`}
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-emerald-500 transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{progress}% do treino concluído</div>
                  </div>

                  <div className="space-y-3">
                    {safeArr(card.items).map((item) => {
                      const done = completedExerciseIds.has(item.id);

                      return (
                        <div
                          key={item.id}
                          className={`rounded-xl border p-3 transition ${
                            done ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-50"
                          }`}
                        >
                          <div className="flex items-start gap-3 justify-between">
                            <div className="flex items-start gap-2 text-sm flex-1">
                              <CheckCircle2
                                className={`w-4 h-4 mt-0.5 ${done ? "text-emerald-600" : "text-gray-400"}`}
                              />
                              <span className={done ? "text-emerald-900 line-through" : "text-gray-700"}>
                                {item.label}
                              </span>
                            </div>

                            <Button
                              size="sm"
                              variant={done ? "outline" : "default"}
                              className={`rounded-xl shrink-0 ${
                                done ? "" : "bg-emerald-600 hover:bg-emerald-700 text-white"
                              }`}
                              onClick={() => toggleExerciseComplete(item.id, card.key)}
                              disabled={savingProgress}
                            >
                              {done ? "Feito" : "Concluir"}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-4">
                    <Button
                      onClick={() => completeWorkout(card)}
                      disabled={savingProgress || isWorkoutDone || totalItems === 0}
                      className={`w-full rounded-xl ${
                        isWorkoutDone
                          ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100"
                          : "bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700"
                      }`}
                    >
                      {isWorkoutDone ? "Treino concluído ✅" : "Concluir treino completo"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recomendação semanal */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm mb-5">
          <div className="flex items-center gap-2 mb-3">
            <HeartPulse className="w-5 h-5 text-rose-600" />
            <div className="font-semibold text-gray-900">Recomendação semanal</div>
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-sm text-gray-700">{mainWeekly[0]}</div>
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-sm text-gray-700">{mainWeekly[1]}</div>
          </div>
        </div>

        {/* Modal: objetivo */}
        <AnimatePresence>
          {showGoalModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
              onClick={() => setShowGoalModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-3xl w-full max-w-lg overflow-hidden"
              >
                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <div className="text-lg font-bold text-gray-900">Redefinir objetivo</div>
                    <div className="text-sm text-gray-500">Isso muda as sugestões do app automaticamente.</div>
                  </div>

                  <button
                    className="w-10 h-10 rounded-xl border border-gray-200 flex items-center justify-center"
                    onClick={() => setShowGoalModal(false)}
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>

                <div className="p-6 space-y-3">
                  {OBJETIVOS.map((o) => (
                    <button
                      key={o.id}
                      onClick={() => setGoalDraft(o.id)}
                      className={`w-full text-left rounded-2xl p-4 border transition ${
                        goalDraft === o.id ? "border-indigo-300 bg-indigo-50" : "border-gray-200 bg-white hover:bg-gray-50"
                      }`}
                    >
                      <div className="font-semibold text-gray-900">{o.label}</div>
                      <div className="text-sm text-gray-500">{o.hint}</div>
                    </button>
                  ))}

                  <div className="flex gap-3 pt-2">
                    <Button variant="outline" className="w-full rounded-xl" onClick={() => setShowGoalModal(false)}>
                      Cancelar
                    </Button>

                    <Button
                      className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700"
                      onClick={async () => {
                        try {
                          await saveObjetivo(goalDraft);
                          setShowGoalModal(false);
                        } catch (e) {
                          console.error(e);
                          alert(`Erro ao salvar objetivo: ${e?.message || e}`);
                        }
                      }}
                    >
                      Salvar objetivo
                    </Button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modal: sugestões */}
        <AnimatePresence>
          {showSuggestions && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
              onClick={() => setShowSuggestions(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-3xl w-full max-w-lg overflow-hidden"
              >
                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <div className="text-lg font-bold text-gray-900">Sugestões do app</div>
                    <div className="text-sm text-gray-500">Melhorias opcionais em cima do seu treino.</div>
                  </div>

                  <button
                    className="w-10 h-10 rounded-xl border border-gray-200 flex items-center justify-center"
                    onClick={() => setShowSuggestions(false)}
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>

                <div className="p-6 space-y-3">
                  {improvementList.map((s, idx) => (
                    <div key={idx} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-gray-700">
                      {s}
                    </div>
                  ))}

                  <div className="pt-2">
                    <Button variant="outline" className="w-full rounded-xl" onClick={() => setShowSuggestions(false)}>
                      Fechar
                    </Button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modal: personalizar */}
        <AnimatePresence>
          {showCustomize && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
              onClick={() => setShowCustomize(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-3xl w-full max-w-3xl overflow-hidden"
              >
                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <div className="text-lg font-bold text-gray-900">Personalizar treino</div>
                    <div className="text-sm text-gray-500">
                      Crie treinos do seu jeito. O app vai priorizar o plano personalizado.
                    </div>
                  </div>

                  <button
                    className="w-10 h-10 rounded-xl border border-gray-200 flex items-center justify-center"
                    onClick={() => setShowCustomize(false)}
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>

                <div className="p-6 space-y-5">
                  <div className="rounded-2xl border border-gray-200 bg-slate-50 p-4">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-gray-900">Plano principal</div>
                        <div className="text-xs text-gray-500">
                          Se ativado, o seu plano substitui o plano sugerido na tela principal.
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={!!custom.useCustomPlan}
                          onChange={(e) => setCustom((c) => ({ ...c, useCustomPlan: e.target.checked }))}
                        />
                        <span className="text-sm text-gray-700">Usar plano personalizado como principal</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                      <div>
                        <div className="text-xs font-medium text-gray-600 mb-1">Nível</div>
                        <select
                          className="w-full h-10 rounded-xl border border-gray-200 px-3 text-sm bg-white"
                          value={custom.nivel}
                          onChange={(e) => setCustom((c) => ({ ...c, nivel: e.target.value }))}
                        >
                          <option value="iniciante">Iniciante</option>
                          <option value="intermediario">Intermediário</option>
                          <option value="avancado">Avançado</option>
                        </select>
                      </div>

                      <div>
                        <div className="text-xs font-medium text-gray-600 mb-1">Local</div>
                        <select
                          className="w-full h-10 rounded-xl border border-gray-200 px-3 text-sm bg-white"
                          value={custom.local}
                          onChange={(e) => setCustom((c) => ({ ...c, local: e.target.value }))}
                        >
                          <option value="casa">Casa</option>
                          <option value="academia">Academia</option>
                          <option value="ar_livre">Ar livre</option>
                        </select>
                      </div>

                      <div>
                        <div className="text-xs font-medium text-gray-600 mb-1">Dias/semana</div>
                        <Input
                          type="number"
                          min={1}
                          max={7}
                          value={custom.diasSemana}
                          onChange={(e) => setCustom((c) => ({ ...c, diasSemana: e.target.value }))}
                          className="rounded-xl bg-white"
                        />
                      </div>

                      <div>
                        <div className="text-xs font-medium text-gray-600 mb-1">Tempo (min)</div>
                        <Input
                          type="number"
                          min={10}
                          max={120}
                          value={custom.tempoMin}
                          onChange={(e) => setCustom((c) => ({ ...c, tempoMin: e.target.value }))}
                          className="rounded-xl bg-white"
                        />
                      </div>
                    </div>

                    <div className="mt-3">
                      <div className="text-xs font-medium text-gray-600 mb-1">Limitações / Observações</div>
                      <Input
                        placeholder="Ex: dor na lombar, joelho, sem halteres..."
                        value={custom.limitacoes}
                        onChange={(e) => setCustom((c) => ({ ...c, limitacoes: e.target.value }))}
                        className="rounded-xl bg-white"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-base font-semibold text-gray-900">Seu plano (livre)</div>
                      <div className="text-xs text-gray-500">Crie quantos treinos quiser. Ex: A/B/C ou Seg/Qua/Sex.</div>
                    </div>

                    <Button variant="outline" className="rounded-xl" onClick={addWorkout}>
                      <Plus className="w-4 h-4 mr-2" />
                      Adicionar treino
                    </Button>
                  </div>

                  <div className="space-y-4">
                    {safeArr(custom.customPlan).map((w) => (
                      <div key={w.id} className="rounded-2xl border border-gray-200 p-4 bg-white">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex-1">
                            <div className="text-xs text-gray-500 mb-1">Nome do treino</div>
                            <Input
                              value={w.name}
                              onChange={(e) => updateWorkoutName(w.id, e.target.value)}
                              className="rounded-xl"
                              placeholder="Ex: Treino A (Peito/Tríceps)"
                            />
                          </div>

                          <Button variant="outline" className="rounded-xl" onClick={() => removeWorkout(w.id)}>
                            <Trash2 className="w-4 h-4 mr-2" />
                            Remover
                          </Button>
                        </div>

                        <div className="mt-4 flex items-center justify-between">
                          <div className="text-sm font-semibold text-gray-900">Exercícios</div>

                          <Button variant="outline" className="rounded-xl" onClick={() => addExercise(w.id)}>
                            <Plus className="w-4 h-4 mr-2" />
                            Adicionar exercício
                          </Button>
                        </div>

                        {safeArr(w.exercises).length === 0 ? (
                          <div className="mt-3 text-sm text-gray-500">Nenhum exercício ainda. Clique em “Adicionar exercício”.</div>
                        ) : (
                          <div className="mt-3 space-y-3">
                            {safeArr(w.exercises).map((e) => (
                              <div key={e.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                <div className="grid md:grid-cols-4 gap-3">
                                  <div className="md:col-span-2">
                                    <div className="text-xs text-gray-500 mb-1">Exercício</div>
                                    <Input
                                      value={e.name}
                                      onChange={(ev) => updateExercise(w.id, e.id, { name: ev.target.value })}
                                      className="rounded-xl bg-white"
                                      placeholder="Ex: Supino reto / Caminhada / Agachamento"
                                    />
                                  </div>

                                  <div>
                                    <div className="text-xs text-gray-500 mb-1">Séries</div>
                                    <Input
                                      value={e.sets}
                                      onChange={(ev) => updateExercise(w.id, e.id, { sets: ev.target.value })}
                                      className="rounded-xl bg-white"
                                      placeholder="Ex: 3"
                                    />
                                  </div>

                                  <div>
                                    <div className="text-xs text-gray-500 mb-1">Reps / Tempo</div>
                                    <Input
                                      value={e.reps}
                                      onChange={(ev) => updateExercise(w.id, e.id, { reps: ev.target.value })}
                                      className="rounded-xl bg-white"
                                      placeholder="Ex: 10–12 ou 20 min"
                                    />
                                  </div>
                                </div>

                                <div className="mt-3 flex items-center gap-3">
                                  <div className="flex-1">
                                    <div className="text-xs text-gray-500 mb-1">Observações (opcional)</div>
                                    <Input
                                      value={e.notes}
                                      onChange={(ev) => updateExercise(w.id, e.id, { notes: ev.target.value })}
                                      className="rounded-xl bg-white"
                                      placeholder="Ex: manter lombar neutra / RPE 7 / descanso 60s"
                                    />
                                  </div>

                                  <Button variant="outline" className="rounded-xl" onClick={() => removeExercise(w.id, e.id)}>
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Remover
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-col md:flex-row gap-3 pt-2">
                    <Button variant="outline" className="w-full rounded-xl" onClick={() => setShowCustomize(false)}>
                      Fechar
                    </Button>

                    <Button
                      variant="outline"
                      className="w-full rounded-xl"
                      onClick={() => setShowSuggestions(true)}
                    >
                      <Wand2 className="w-4 h-4 mr-2" />
                      Gerar sugestões do app
                    </Button>

                    <Button
                      className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700"
                      onClick={async () => {
                        try {
                          const next = {
                            ...custom,
                            customPlan: safeArr(custom.customPlan),
                            progress: safeObj(custom.progress),
                          };

                          await saveCustomToDb(next);
                          alert("Plano personalizado salvo ✅");
                          setShowCustomize(false);
                        } catch (e) {
                          console.error(e);
                          alert(`Erro ao salvar: ${e?.message || e}`);
                        }
                      }}
                    >
                      Salvar personalização
                    </Button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Rodapé discreto */}
        <div className="mt-8 text-xs text-gray-500">
          Logado como: <span className="font-medium">{userEmail || "usuário"}</span>
        </div>
      </div>
    </div>
  );
}
