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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabaseClient";
import { createPageUrl } from "@/utils";

/**
 * Objetivos suportados (sem rota /quiz).
 * O “quiz” vira simplesmente o campo `objetivo` no profiles (ou user_profiles).
 */
const OBJETIVOS = [
  { id: "melhorar_habitos", label: "Melhorar hábitos", hint: "Consistência + leve/moderado" },
  { id: "perder_peso", label: "Perder peso", hint: "Cardio + força em circuito" },
  { id: "hipertrofia", label: "Hipertrofia", hint: "Força progressiva" },
  { id: "condicionamento", label: "Condicionamento", hint: "Resistência e fôlego" },
  { id: "mobilidade", label: "Mobilidade", hint: "Alongamento e amplitude" },
];

function normalizeObjetivo(raw) {
  const s = (raw || "").toString().trim().toLowerCase();
  if (!s) return null;

  if (s.includes("perder") || s.includes("emag")) return "perder_peso";
  if (s.includes("hipertrof") || s.includes("massa")) return "hipertrofia";
  if (s.includes("condicion") || s.includes("fôlego") || s.includes("cardio")) return "condicionamento";
  if (s.includes("mobil") || s.includes("along")) return "mobilidade";
  if (s.includes("hábito") || s.includes("habito") || s.includes("rotina")) return "melhorar_habitos";

  // fallback: tenta match por label
  const found = OBJETIVOS.find((o) => o.label.toLowerCase() === s);
  return found?.id ?? "melhorar_habitos";
}

function objetivoLabel(objId) {
  return OBJETIVOS.find((o) => o.id === objId)?.label ?? "Não definido";
}

/**
 * Planos baseados em boas práticas gerais (educativo, não médico)
 * Cada objetivo gera 3 cards principais + recomendação semanal.
 */
function buildPlan(objId) {
  const common = {
    disclaimer:
      "Essas sugestões são educativas e baseadas em práticas comuns de treino. Se você tiver restrições médicas, adapte com um profissional.",
  };

  switch (objId) {
    case "perder_peso":
      return {
        ...common,
        headline: "Plano focado em Perder Peso",
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
        headline: "Plano focado em Hipertrofia",
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
        headline: "Plano focado em Condicionamento",
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
        headline: "Plano focado em Mobilidade",
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
        headline: "Plano focado em Melhorar Hábitos",
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

function toNumberOrNull(v) {
  if (v == null) return null;
  const s = String(v).trim().replace(",", ".");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export default function Exercicios() {
  const [loading, setLoading] = useState(true);

  const [userEmail, setUserEmail] = useState("");
  const [profileRow, setProfileRow] = useState(null); // public.profiles (tem objetivo? pode ter)
  const [userProfileRow, setUserProfileRow] = useState(null); // user_profiles (quiz/objetivo etc)

  const [showGoalModal, setShowGoalModal] = useState(false);
  const [goalDraft, setGoalDraft] = useState("melhorar_habitos");

  const [showCustomize, setShowCustomize] = useState(false);
  const [customizePlanKey, setCustomizePlanKey] = useState(null);

  // Personalização simples (UI-only)
  const [custom, setCustom] = useState({
    nivel: "iniciante", // iniciante | intermediario | avancado
    diasSemana: 3,
    tempoMin: 30,
    local: "casa", // casa | academia
    limitacoes: "",
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

        // 1) profiles (fonte do guard/premium) — pode conter objetivo também
        let prof = null;
        try {
          const { data, error } = await supabase
            .from("profiles")
            .select("id, objetivo")
            .eq("id", session.user.id)
            .maybeSingle();
          if (!error && data) prof = data;
        } catch {
          prof = null;
        }

        // 2) user_profiles (dados ricos)
        let up = null;
        try {
          const { data, error } = await supabase
            .from("user_profiles")
            .select("id, objetivo")
            .eq("id", session.user.id)
            .maybeSingle();
          if (!error && data) up = data;
        } catch {
          up = null;
        }

        setProfileRow(prof);
        setUserProfileRow(up);

        // define draft inicial
        const existingRaw = up?.objetivo ?? prof?.objetivo ?? "";
        const normalized = normalizeObjetivo(existingRaw) || "melhorar_habitos";
        setGoalDraft(normalized);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const objetivoId = useMemo(() => {
    const raw = userProfileRow?.objetivo ?? profileRow?.objetivo ?? "";
    return normalizeObjetivo(raw);
  }, [userProfileRow, profileRow]);

  const objetivoAtualLabel = objetivoLabel(objetivoId);
  const plan = useMemo(() => buildPlan(objetivoId || "melhorar_habitos"), [objetivoId]);

  async function saveObjetivo(newObjId) {
    const newLabel = objetivoLabel(newObjId);

    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData?.session;
    if (!session?.user) throw new Error("Sessão expirada. Faça login novamente.");

    const userId = session.user.id;

    // salva em user_profiles (preferencial) e também em profiles (para consistência com outras telas)
    try {
      await supabase.from("user_profiles").upsert({ id: userId, objetivo: newLabel }, { onConflict: "id" });
    } catch {
      // ignore
    }

    try {
      await supabase.from("profiles").upsert({ id: userId, objetivo: newLabel }, { onConflict: "id" });
    } catch {
      // ignore
    }

    // atualiza estado local
    setUserProfileRow((p) => ({ ...(p || { id: userId }), objetivo: newLabel }));
    setProfileRow((p) => ({ ...(p || { id: userId }), objetivo: newLabel }));
  }

  function openCustomize(cardKey) {
    setCustomizePlanKey(cardKey);
    setShowCustomize(true);
  }

  // Ajusta “texto” do plano baseado na personalização (UI-only)
  const customizationSummary = useMemo(() => {
    const dias = Math.min(Math.max(toNumberOrNull(custom.diasSemana) || 3, 1), 7);
    const tempo = Math.min(Math.max(toNumberOrNull(custom.tempoMin) || 30, 10), 120);
    const nivel = (custom.nivel || "iniciante").toLowerCase();
    const local = (custom.local || "casa").toLowerCase();

    return { dias, tempo, nivel, local };
  }, [custom]);

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
              <p className="text-sm text-gray-500">Treinos coerentes com seu objetivo</p>
            </div>
          </div>

          <Button
            onClick={() => setShowGoalModal(true)}
            variant="outline"
            className="rounded-xl"
          >
            <RefreshCcw className="w-4 h-4 mr-2" />
            Redefinir objetivo
          </Button>
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
                {objetivoId ? (
                  OBJETIVOS.find((o) => o.id === objetivoId)?.hint
                ) : (
                  "Não definido — recomendamos escolher um objetivo para personalizar melhor."
                )}
              </div>

              <div className="mt-3 flex items-start gap-2 text-xs text-gray-500">
                <Info className="w-4 h-4 mt-0.5" />
                <div>{plan.disclaimer}</div>
              </div>
            </div>

            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 min-w-[220px] hidden md:block">
              <div className="text-xs text-indigo-700 font-semibold mb-1">Plano sugerido</div>
              <div className="text-sm text-indigo-900">{plan.headline}</div>
              <div className="text-xs text-indigo-700 mt-2">
                {customizationSummary.dias}x/sem • {customizationSummary.tempo} min • {customizationSummary.local}
              </div>
            </div>
          </div>
        </div>

        {/* Cards do plano */}
        <div className="grid lg:grid-cols-3 gap-4 mb-6">
          {plan.cards.map((c) => {
            const Icon = c.icon;
            return (
              <div key={c.key} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Icon className="w-5 h-5 text-indigo-700" />
                    <div className="font-semibold text-gray-900">{c.title}</div>
                  </div>
                  <div className="text-xs text-gray-500">{c.duration}</div>
                </div>

                <div className="text-sm text-gray-600 mb-3">{c.desc}</div>

                <div className="inline-flex items-center gap-2 text-xs px-2 py-1 rounded-full border bg-slate-50 text-slate-700 mb-3">
                  <HeartPulse className="w-3 h-3" />
                  Intensidade: {c.intensity}
                </div>

                <ul className="space-y-2 text-sm">
                  {c.items.map((it, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-gray-700">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5" />
                      <span>{it}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  onClick={() => openCustomize(c.key)}
                  variant="outline"
                  className="mt-4 w-full"
                >
                  Personalizar treino <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            );
          })}
        </div>

        {/* Recomendação semanal */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <HeartPulse className="w-5 h-5 text-rose-600" />
            <div className="font-semibold text-gray-900">Recomendação semanal</div>
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-sm text-gray-700">
              {plan.weekly[0]}
            </div>
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-sm text-gray-700">
              {plan.weekly[1]}
            </div>
          </div>
        </div>

        {/* Modal: Redefinir objetivo */}
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
                    <div className="text-sm text-gray-500">
                      Isso muda as sugestões de treino automaticamente.
                    </div>
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
                        goalDraft === o.id
                          ? "border-indigo-300 bg-indigo-50"
                          : "border-gray-200 bg-white hover:bg-gray-50"
                      }`}
                    >
                      <div className="font-semibold text-gray-900">{o.label}</div>
                      <div className="text-sm text-gray-500">{o.hint}</div>
                    </button>
                  ))}

                  <div className="flex gap-3 pt-2">
                    <Button
                      variant="outline"
                      className="w-full rounded-xl"
                      onClick={() => setShowGoalModal(false)}
                    >
                      Cancelar
                    </Button>
                    <Button
                      className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700"
                      onClick={async () => {
                        await saveObjetivo(goalDraft);
                        setShowGoalModal(false);
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

        {/* Modal: Personalizar treino (UI-only, sem alert) */}
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
                className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden"
              >
                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <div className="text-lg font-bold text-gray-900">Personalizar treino</div>
                    <div className="text-sm text-gray-500">
                      Ajuste preferências. (Ainda sem salvar logs — apenas UI.)
                    </div>
                  </div>
                  <button
                    className="w-10 h-10 rounded-xl border border-gray-200 flex items-center justify-center"
                    onClick={() => setShowCustomize(false)}
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>

                <div className="p-6 grid md:grid-cols-2 gap-4">
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                    <div className="font-semibold text-gray-900 mb-3">Preferências</div>

                    <div className="space-y-3">
                      <div>
                        <label className="text-sm text-gray-600">Nível</label>
                        <div className="grid grid-cols-3 gap-2 mt-2">
                          {["iniciante", "intermediario", "avancado"].map((n) => (
                            <button
                              key={n}
                              onClick={() => setCustom((p) => ({ ...p, nivel: n }))}
                              className={`py-2 rounded-xl border text-sm ${
                                custom.nivel === n
                                  ? "border-indigo-300 bg-indigo-50 text-indigo-900"
                                  : "border-gray-200 bg-white text-gray-700"
                              }`}
                            >
                              {n === "iniciante" ? "Iniciante" : n === "intermediario" ? "Intermediário" : "Avançado"}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-sm text-gray-600">Dias/semana</label>
                          <Input
                            value={custom.diasSemana}
                            onChange={(e) => setCustom((p) => ({ ...p, diasSemana: e.target.value }))}
                            inputMode="numeric"
                            className="mt-2"
                            placeholder="Ex: 3"
                          />
                        </div>
                        <div>
                          <label className="text-sm text-gray-600">Tempo (min)</label>
                          <Input
                            value={custom.tempoMin}
                            onChange={(e) => setCustom((p) => ({ ...p, tempoMin: e.target.value }))}
                            inputMode="numeric"
                            className="mt-2"
                            placeholder="Ex: 30"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-sm text-gray-600">Local</label>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          {[
                            { id: "casa", label: "Casa" },
                            { id: "academia", label: "Academia" },
                          ].map((opt) => (
                            <button
                              key={opt.id}
                              onClick={() => setCustom((p) => ({ ...p, local: opt.id }))}
                              className={`py-2 rounded-xl border text-sm ${
                                custom.local === opt.id
                                  ? "border-indigo-300 bg-indigo-50 text-indigo-900"
                                  : "border-gray-200 bg-white text-gray-700"
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="text-sm text-gray-600">Limitações / observações</label>
                        <Input
                          value={custom.limitacoes}
                          onChange={(e) => setCustom((p) => ({ ...p, limitacoes: e.target.value }))}
                          className="mt-2"
                          placeholder="Ex: dor no joelho / sem impacto"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                    <div className="font-semibold text-gray-900 mb-2">Resumo (UI)</div>
                    <div className="text-sm text-gray-600 mb-4">
                      Card selecionado: <span className="font-semibold">{customizePlanKey || "—"}</span>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Objetivo</span>
                        <span className="font-semibold text-gray-900">{objetivoAtualLabel}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Frequência</span>
                        <span className="font-semibold text-gray-900">{customizationSummary.dias}x/sem</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Tempo</span>
                        <span className="font-semibold text-gray-900">{customizationSummary.tempo} min</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Nível</span>
                        <span className="font-semibold text-gray-900">{customizationSummary.nivel}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Local</span>
                        <span className="font-semibold text-gray-900">{customizationSummary.local}</span>
                      </div>
                    </div>

                    <div className="mt-4 bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-sm text-indigo-900">
                      Próximo passo (quando você quiser): salvar preferências e logs de treino no Supabase
                      para calcular streak/XP por semana.
                    </div>

                    <div className="flex gap-3 mt-4">
                      <Button variant="outline" className="w-full rounded-xl" onClick={() => setShowCustomize(false)}>
                        Fechar
                      </Button>
                      <Button
                        className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700"
                        onClick={() => setShowCustomize(false)}
                      >
                        Aplicar (UI)
                      </Button>
                    </div>
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
