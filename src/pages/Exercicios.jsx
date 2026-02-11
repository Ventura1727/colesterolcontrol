// src/pages/Exercicios.jsx
import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Dumbbell,
  Target,
  CheckCircle2,
  Flame,
  Timer,
  ChevronRight,
  RefreshCw,
  Save,
  HeartPulse,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabaseClient";
import { createPageUrl } from "@/utils";

const OBJECTIVE_PRESETS = [
  { key: "perder_peso", label: "Perder peso", hints: ["emagrecer", "perder peso", "definir", "queimar"] },
  { key: "melhorar_habitos", label: "Melhorar hábitos", hints: ["habitos", "hábitos", "saúde", "saude", "bem-estar", "rotina"] },
  { key: "hipertrofia", label: "Hipertrofia", hints: ["hipertrofia", "massa", "ganhar massa", "fortalecer", "musculo", "músculo"] },
  { key: "reduzir_colesterol", label: "Reduzir colesterol", hints: ["colesterol", "ldl", "hdl", "cardio"] },
];

function normalizeText(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim();
}

function inferObjectiveKey(objetivoRaw) {
  const v = normalizeText(objetivoRaw);
  if (!v) return null;

  for (const p of OBJECTIVE_PRESETS) {
    if (p.hints.some((h) => v.includes(normalizeText(h)))) return p.key;
  }

  // fallback leve
  if (v.includes("peso") || v.includes("emagre")) return "perder_peso";
  if (v.includes("hiper") || v.includes("massa") || v.includes("mus")) return "hipertrofia";
  if (v.includes("colesterol") || v.includes("ldl") || v.includes("cardio")) return "reduzir_colesterol";
  if (v.includes("hab") || v.includes("saud") || v.includes("rotina")) return "melhorar_habitos";
  return "melhorar_habitos";
}

function buildPlan(objectiveKey) {
  // Conteúdo “explicável”, simples e coerente (sem promessas médicas).
  // Cada bloco tem: tipo, duração, intensidade, por que.
  switch (objectiveKey) {
    case "perder_peso":
      return {
        title: "Plano focado em Perda de Peso",
        subtitle: "Cardio + força total do corpo para aumentar gasto calórico.",
        blocks: [
          {
            name: "Treino A (Full Body + Cardio leve)",
            duration: "35–45 min",
            intensity: "Moderada",
            why: "Combina força (manter massa magra) + gasto calórico com cardio.",
            items: [
              "Agachamento (3x10)",
              "Remada (3x10)",
              "Flexão (3x8–12)",
              "Prancha (3x30–45s)",
              "Caminhada rápida (10–15 min)",
            ],
          },
          {
            name: "Treino B (HIIT leve / intervalado)",
            duration: "20–30 min",
            intensity: "Moderada/Alta (ajustável)",
            why: "Intervalos aumentam o consumo de energia no dia (sem precisar ser extremo).",
            items: [
              "Aquecimento 5 min",
              "8–10 ciclos: 30s rápido + 60s leve",
              "Desaceleração 5 min",
              "Alongamento 3–5 min",
            ],
          },
          {
            name: "Treino C (Força + core)",
            duration: "30–40 min",
            intensity: "Moderada",
            why: "Força consistente melhora composição corporal e reduz risco de lesões.",
            items: [
              "Levantamento terra com halter (3x8–10)",
              "Desenvolvimento ombro (3x10)",
              "Avanço/lunge (3x10 cada perna)",
              "Abdominal dead bug (3x10)",
            ],
          },
        ],
        weekly: [
          "3 treinos/semana (A, B, C)",
          "Caminhada 20–30 min em 2 dias extras (opcional)",
          "Progredir: +1 série ou +5% de carga a cada 1–2 semanas",
        ],
      };

    case "hipertrofia":
      return {
        title: "Plano focado em Hipertrofia",
        subtitle: "Força com progressão + volume semanal organizado.",
        blocks: [
          {
            name: "Treino A (Peito + Tríceps)",
            duration: "45–60 min",
            intensity: "Moderada/Alta",
            why: "Split clássico para aumentar volume por grupo muscular com qualidade.",
            items: [
              "Supino (4x6–10)",
              "Crucifixo (3x10–12)",
              "Paralelas ou tríceps banco (3x8–12)",
              "Tríceps corda (3x10–12)",
              "Core: prancha (3x45s)",
            ],
          },
          {
            name: "Treino B (Costas + Bíceps)",
            duration: "45–60 min",
            intensity: "Moderada/Alta",
            why: "Puxadas/Remadas para dorsais + bíceps com sobrecarga gradual.",
            items: [
              "Puxada na barra/polia (4x6–10)",
              "Remada (4x8–10)",
              "Face pull (3x12–15)",
              "Rosca direta (3x8–12)",
              "Rosca martelo (2–3x10–12)",
            ],
          },
          {
            name: "Treino C (Pernas + Ombro)",
            duration: "50–70 min",
            intensity: "Moderada/Alta",
            why: "Grandes grupamentos (pernas) + ombros para equilíbrio e ganho global.",
            items: [
              "Agachamento (4x6–10)",
              "Stiff/RDL (3x8–10)",
              "Leg press (3x10–12)",
              "Elevação lateral (3x12–15)",
              "Desenvolvimento (3x8–10)",
            ],
          },
        ],
        weekly: [
          "3–4 treinos/semana (A, B, C, opcional repetir o mais fraco)",
          "Progredir: quando bater topo de reps, subir carga",
          "Descanso 60–120s nos multiarticulares",
        ],
      };

    case "reduzir_colesterol":
      return {
        title: "Plano focado em Redução de Colesterol",
        subtitle: "Aeróbico moderado consistente + força 2–3x/semana.",
        blocks: [
          {
            name: "Aeróbico Moderado",
            duration: "30–45 min",
            intensity: "Moderada (consegue falar frases curtas)",
            why: "Consistência em aeróbico moderado é útil para saúde cardiovascular.",
            items: [
              "Caminhada rápida / bike / elíptico",
              "Ritmo contínuo",
              "Finalizar com 5 min leve",
            ],
          },
          {
            name: "Força Essencial (Full Body)",
            duration: "30–40 min",
            intensity: "Leve/Moderada",
            why: "Força ajuda metabolismo e saúde geral sem exigir alta intensidade.",
            items: [
              "Agachamento (3x10)",
              "Remada (3x10)",
              "Flexão (3x8–12)",
              "Elevação pélvica (3x12)",
              "Alongamento 5 min",
            ],
          },
          {
            name: "Mobilidade / Recuperação",
            duration: "15–20 min",
            intensity: "Leve",
            why: "Melhora adesão e reduz dores — mantém o hábito.",
            items: [
              "Mobilidade quadril/tornozelo",
              "Alongamento posterior",
              "Respiração 2–3 min",
            ],
          },
        ],
        weekly: [
          "Aeróbico 3–5x/semana",
          "Força 2–3x/semana",
          "Aumentar duração do aeróbico gradualmente (+5 min/semana)",
        ],
      };

    case "melhorar_habitos":
    default:
      return {
        title: "Plano focado em Melhorar Hábitos",
        subtitle: "Rotina simples: consistência > intensidade.",
        blocks: [
          {
            name: "Treino A (Força Básica)",
            duration: "25–35 min",
            intensity: "Leve/Moderada",
            why: "Base para postura, dor lombar, energia e confiança.",
            items: [
              "Agachamento com peso do corpo (3x12)",
              "Remada elástica (3x12)",
              "Flexão inclinada (3x8–12)",
              "Prancha (3x30s)",
            ],
          },
          {
            name: "Cardio leve (caminhada)",
            duration: "20–30 min",
            intensity: "Leve/Moderada",
            why: "Fácil de manter e tem ótimo custo-benefício para saúde.",
            items: ["Caminhada contínua", "Sem sofrimento: manter regularidade"],
          },
          {
            name: "Mobilidade curta",
            duration: "8–12 min",
            intensity: "Leve",
            why: "Reduz tensão e melhora qualidade do movimento.",
            items: ["Alongar peitoral e quadril", "Mobilidade coluna torácica"],
          },
        ],
        weekly: [
          "3 sessões/semana (A + caminhada + mobilidade)",
          "Meta: 1% melhor por semana (mais 1 série, 5 min a mais, etc.)",
        ],
      };
  }
}

export default function Exercicios() {
  const [loading, setLoading] = useState(true);
  const [savingObjective, setSavingObjective] = useState(false);

  const [profile, setProfile] = useState(null);

  const [showObjectiveModal, setShowObjectiveModal] = useState(false);
  const [objectiveDraft, setObjectiveDraft] = useState("");

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

        const { data: prof, error } = await supabase
          .from("profiles")
          .select("id, objetivo, xp_total, rank")
          .eq("id", session.user.id)
          .maybeSingle();

        if (!error && prof) {
          setProfile(prof);
          setObjectiveDraft(prof?.objetivo || "");
        } else if (!error && !prof) {
          // garante profile mínimo pra não quebrar
          const { data: created } = await supabase
            .from("profiles")
            .upsert({ id: session.user.id }, { onConflict: "id" })
            .select("id, objetivo, xp_total, rank")
            .single();

          setProfile(created || { id: session.user.id, objetivo: "" });
          setObjectiveDraft(created?.objetivo || "");
        } else {
          setProfile({ id: session.user.id, objetivo: "" });
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const objectiveKey = useMemo(() => inferObjectiveKey(profile?.objetivo), [profile?.objetivo]);
  const plan = useMemo(() => buildPlan(objectiveKey), [objectiveKey]);

  const objectiveLabel = useMemo(() => {
    const key = objectiveKey || "melhorar_habitos";
    return OBJECTIVE_PRESETS.find((p) => p.key === key)?.label || "Melhorar hábitos";
  }, [objectiveKey]);

  async function saveObjective(newObjectiveText) {
    const trimmed = String(newObjectiveText || "").trim();
    setSavingObjective(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData?.session;
      if (!session?.user) throw new Error("Sessão expirada.");

      const payload = {
        id: session.user.id,
        objetivo: trimmed ? trimmed : null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from("profiles").upsert(payload, { onConflict: "id" });
      if (error) throw error;

      setProfile((p) => ({ ...(p || {}), id: session.user.id, objetivo: trimmed }));
      setShowObjectiveModal(false);
    } catch (e) {
      console.error("Save objective error:", e);
      alert(e?.message || "Erro ao salvar objetivo.");
    } finally {
      setSavingObjective(false);
    }
  }

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
      <div className="max-w-5xl mx-auto px-4 pt-6 pb-24">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => (window.location.href = createPageUrl("Dashboard"))}
            className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">Exercícios</h1>
            <p className="text-sm text-gray-500">Treinos coerentes com seu objetivo</p>
          </div>

          <Button
            onClick={() => setShowObjectiveModal(true)}
            variant="outline"
            className="border-gray-200"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Redefinir objetivo
          </Button>
        </div>

        {/* Objetivo atual */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm mb-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Target className="w-4 h-4 text-emerald-600" />
                Objetivo atual
              </div>
              <div className="text-xl font-bold text-gray-900 mt-1">{objectiveLabel}</div>
              <div className="text-sm text-gray-600 mt-1">
                {profile?.objetivo ? (
                  <span className="font-medium">“{profile.objetivo}”</span>
                ) : (
                  <span className="text-gray-500">Não definido — recomendamos escolher um objetivo para personalizar melhor.</span>
                )}
              </div>
            </div>

            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3">
              <div className="flex items-center gap-2 text-indigo-800 text-sm font-semibold">
                <Dumbbell className="w-4 h-4" />
                Plano sugerido
              </div>
              <div className="text-xs text-indigo-700 mt-1">{plan?.title}</div>
            </div>
          </div>

          <div className="mt-4 flex items-start gap-2 text-xs text-gray-500">
            <Info className="w-4 h-4 mt-0.5" />
            <p>
              Essas sugestões são educativas e baseadas em práticas comuns de treino. Se você tiver restrições médicas,
              adapte com um profissional.
            </p>
          </div>
        </div>

        {/* Plano */}
        <div className="grid lg:grid-cols-3 gap-4 mb-6">
          {(plan?.blocks || []).map((b, idx) => (
            <motion.div
              key={b.name}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <div className="font-semibold text-gray-900">{b.name}</div>
                  <div className="text-xs text-gray-500 mt-1">{b.why}</div>
                </div>
                <div className="text-right">
                  <div className="inline-flex items-center gap-1 text-xs bg-slate-50 border border-slate-100 rounded-full px-2 py-1 text-slate-700">
                    <Timer className="w-3 h-3" />
                    {b.duration}
                  </div>
                  <div className="mt-2 inline-flex items-center gap-1 text-xs bg-rose-50 border border-rose-100 rounded-full px-2 py-1 text-rose-700">
                    <Flame className="w-3 h-3" />
                    {b.intensity}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                {(b.items || []).map((it, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                    <span>{it}</span>
                  </div>
                ))}
              </div>

              <Button
                onClick={() => alert("Por enquanto é só UI (sem salvar logs). Em seguida podemos criar logs de treino no Supabase.")}
                variant="outline"
                className="mt-4 w-full"
              >
                Personalizar treino <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </motion.div>
          ))}
        </div>

        {/* Recomendações semana */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm mb-6">
          <div className="flex items-center gap-2 mb-3">
            <HeartPulse className="w-5 h-5 text-rose-600" />
            <div className="font-semibold text-gray-900">Recomendação semanal</div>
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            {(plan?.weekly || []).map((w, idx) => (
              <div key={idx} className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-sm text-gray-700">
                {w}
              </div>
            ))}
          </div>

          <div className="mt-4 text-xs text-gray-500">
            Dica: se o usuário quer mudar objetivo (ex: de “perder peso” para “melhorar hábitos”), isso é normal — o app deve ajustar as sugestões automaticamente.
          </div>
        </div>
      </div>

      {/* Modal redefinir objetivo */}
      <AnimatePresence>
        {showObjectiveModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
            onClick={() => !savingObjective && setShowObjectiveModal(false)}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <div className="text-lg font-bold text-gray-900">Redefinir objetivo</div>
                    <div className="text-sm text-gray-500">Isso ajusta automaticamente as sugestões de treino.</div>
                  </div>
                  {!savingObjective && (
                    <button
                      onClick={() => setShowObjectiveModal(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-2">Escolha rápida</div>
                    <div className="grid grid-cols-2 gap-2">
                      {OBJECTIVE_PRESETS.map((p) => (
                        <Button
                          key={p.key}
                          type="button"
                          variant="outline"
                          className="justify-start"
                          onClick={() => setObjectiveDraft(p.label)}
                          disabled={savingObjective}
                        >
                          <Target className="w-4 h-4 mr-2 text-emerald-600" />
                          {p.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-2">Ou escreva do seu jeito</div>
                    <Input
                      value={objectiveDraft}
                      onChange={(e) => setObjectiveDraft(e.target.value)}
                      placeholder="Ex: Perder peso / Melhorar hábitos / Hipertrofia"
                      disabled={savingObjective}
                    />
                  </div>
                </div>

                <div className="mt-5 space-y-2">
                  <Button
                    onClick={() => saveObjective(objectiveDraft)}
                    disabled={savingObjective}
                    className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white py-6 rounded-2xl text-lg font-semibold"
                  >
                    {savingObjective ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                        className="w-6 h-6 border-2 border-white border-t-transparent rounded-full"
                      />
                    ) : (
                      <>
                        <Save className="w-5 h-5 mr-2" />
                        Salvar objetivo
                      </>
                    )}
                  </Button>

                  <Button
                    onClick={() => setShowObjectiveModal(false)}
                    disabled={savingObjective}
                    variant="ghost"
                    className="w-full text-gray-500"
                  >
                    Cancelar
                  </Button>
                </div>

                <div className="mt-4 text-xs text-gray-500">
                  Observação: por enquanto o treino não gera logs. Depois adicionamos uma tabela de “training_logs” com XP e streak.
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
