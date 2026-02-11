// src/pages/Progresso.jsx
import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Droplets,
  Scale,
  Ruler,
  HeartPulse,
  Trophy,
  Flame,
  Calendar,
  ChevronRight,
  BadgeCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabaseClient";
import { createPageUrl } from "@/utils";
import { waterLogList } from "@/lib/waterApi";

function calcIMC(pesoKg, alturaCm) {
  if (!pesoKg || !alturaCm) return null;
  const h = alturaCm / 100;
  if (!h) return null;
  const v = pesoKg / (h * h);
  return Number.isFinite(v) ? v : null;
}

export default function Progresso() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [waterLogs, setWaterLogs] = useState([]);
  const [userEmail, setUserEmail] = useState("");

  const hoje = new Date().toISOString().split("T")[0];

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);

        const { data: sessionData } = await supabase.auth.getSession();
        const session = sessionData?.session;
        if (!session?.user) {
          window.location.href = createPageUrl("Login");
          return;
        }

        setUserEmail(session.user.email || "");

        const { data: prof, error } = await supabase
          .from("profiles")
          .select("id, peso_kg, altura_cm, basal_kcal, meta_agua_litros, objetivo")
          .eq("id", session.user.id)
          .maybeSingle();

        if (error) console.error("Progresso load profile error:", error);
        setProfile(prof || null);

        const logs = await waterLogList();
        setWaterLogs(Array.isArray(logs) ? logs : []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const metaLitros = Number(profile?.meta_agua_litros || 2.5);
  const metaMl = metaLitros * 1000;

  const consumoHojeMl = useMemo(() => {
    return (waterLogs || [])
      .filter((l) => l?.data === hoje)
      .reduce((sum, l) => sum + Number(l?.quantidade_ml || 0), 0);
  }, [waterLogs, hoje]);

  const pct = Math.min((consumoHojeMl / metaMl) * 100, 100);
  const faltamMl = Math.max(metaMl - consumoHojeMl, 0);

  // Gamificação simples (eficaz e “explicável”):
  // - pontos por hidratação: 1 ponto a cada 250ml hoje
  // - badge se bateu meta
  const pontosHoje = Math.floor(consumoHojeMl / 250);
  const metaBatida = consumoHojeMl >= metaMl;

  const peso = profile?.peso_kg ?? null;
  const altura = profile?.altura_cm ?? null;
  const imc = calcIMC(peso, altura);

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
          <div>
            <h1 className="text-xl font-bold text-gray-900">Progresso</h1>
            <p className="text-sm text-gray-500">Acompanhe sua evolução</p>
          </div>
        </div>

        {/* Hero acolhedor */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm mb-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm text-gray-500 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Hoje ({hoje})
              </div>
              <div className="text-xl font-bold text-gray-900 mt-1">Olá, {userEmail || "usuário"}</div>
              <div className="text-sm text-gray-600 mt-1">
                Objetivo: <span className="font-semibold">{profile?.objetivo || "não definido"}</span>
              </div>
            </div>

            <div className={`px-3 py-2 rounded-xl border text-sm flex items-center gap-2 ${
              metaBatida ? "bg-green-50 border-green-200 text-green-800" : "bg-indigo-50 border-indigo-200 text-indigo-800"
            }`}>
              {metaBatida ? <BadgeCheck className="w-4 h-4" /> : <Trophy className="w-4 h-4" />}
              {metaBatida ? "Meta de hidratação atingida" : "Missão do dia: bater a meta"}
            </div>
          </div>
        </div>

        {/* Cards 3 colunas */}
        <div className="grid lg:grid-cols-3 gap-4 mb-5">
          {/* Hidratação */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Droplets className="w-5 h-5 text-blue-600" />
                <div className="font-semibold text-gray-900">Hidratação</div>
              </div>
              <div className="text-xs text-gray-500">Hoje</div>
            </div>

            <div className="flex items-end justify-between mb-2">
              <div>
                <div className="text-3xl font-bold text-gray-900">{(consumoHojeMl / 1000).toFixed(1)}L</div>
                <div className="text-xs text-gray-500">de {metaLitros.toFixed(1)}L</div>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold text-blue-700">{(faltamMl / 1000).toFixed(1)}L</div>
                <div className="text-xs text-gray-500">faltam</div>
              </div>
            </div>

            <div className="w-full bg-gray-100 rounded-full h-3">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.5 }}
                className="h-3 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600"
              />
            </div>

            <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
              <span>{Math.round(pct)}% da meta</span>
              <span className="flex items-center gap-1">
                <Flame className="w-3 h-3" /> {pontosHoje} pts hoje
              </span>
            </div>

            <Button
              onClick={() => (window.location.href = "/hidratacao")}
              variant="outline"
              className="mt-4 w-full"
            >
              Abrir Hidratação <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>

          {/* Medidas */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Scale className="w-5 h-5 text-gray-700" />
              <div className="font-semibold text-gray-900">Medidas</div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-500 flex items-center gap-2">
                  <Scale className="w-4 h-4" /> Peso
                </span>
                <span className="font-semibold text-gray-900">{peso ? `${peso} kg` : "Não cadastrado"}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-500 flex items-center gap-2">
                  <Ruler className="w-4 h-4" /> Altura
                </span>
                <span className="font-semibold text-gray-900">{altura ? `${altura} cm` : "Não cadastrado"}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-500">IMC</span>
                <span className="font-semibold text-gray-900">{imc ? imc.toFixed(1) : "—"}</span>
              </div>
            </div>

            <Button
              onClick={() => (window.location.href = "/perfil")}
              className="mt-4 w-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white"
            >
              Atualizar dados
            </Button>
          </div>

          {/* Saúde (placeholder “limpo” e útil) */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <HeartPulse className="w-5 h-5 text-rose-600" />
              <div className="font-semibold text-gray-900">Saúde</div>
            </div>

            <div className="text-sm text-gray-600">
              Aqui vamos consolidar indicadores (colesterol, pressão, etc.) assim que confirmarmos as tabelas no Supabase.
            </div>

            <div className="mt-4 bg-rose-50 border border-rose-100 rounded-xl p-4">
              <div className="text-xs text-gray-600 mb-1">Status</div>
              <div className="font-semibold text-gray-900">Pronto para integrar dados clínicos</div>
              <div className="text-[11px] text-gray-500 mt-1">
                Próximo passo: conectar registros de colesterol e medições.
              </div>
            </div>

            <Button
              onClick={() => alert("Em seguida, vamos conectar colesterol/pressão quando confirmarmos as tabelas.")}
              variant="outline"
              className="mt-4 w-full"
            >
              Ver recomendações <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>

        {/* Rodapé gamificado */}
        <div className="bg-gradient-to-r from-indigo-600 to-blue-600 rounded-2xl p-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm opacity-90">Seu progresso hoje</div>
              <div className="text-2xl font-extrabold">{pontosHoje} pontos</div>
              <div className="text-xs opacity-90 mt-1">
                Ganhe pontos bebendo água (1 ponto a cada 250ml). Amanhã adicionamos streak semanal aqui.
              </div>
            </div>
            <Trophy className="w-10 h-10 opacity-90" />
          </div>
        </div>
      </div>
    </div>
  );
}
