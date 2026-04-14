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
  Sparkles,
} from "lucide-react";
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

function ymd(d) {
  return d.toISOString().split("T")[0];
}

export default function Progresso() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [waterLogs, setWaterLogs] = useState([]);
  const [userEmail, setUserEmail] = useState("");

  const hoje = ymd(new Date());

  async function loadAll() {
    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData?.session;
    if (!session?.user) {
      window.location.href = createPageUrl("Login");
      return;
    }

    setUserEmail(session.user.email || "");

    // ✅ ADICIONADO: 'rank' e 'xp_total' na busca para bater com o Dashboard
    const { data: prof, error } = await supabase
      .from("profiles")
      .select("id, peso_kg, altura_cm, basal_kcal, meta_agua_litros, objetivo, rank, xp_total")
      .eq("id", session.user.id)
      .maybeSingle();

    if (error) console.error("Progresso load profile error:", error);
    setProfile(prof || null);

    const logs = await waterLogList();
    setWaterLogs(Array.isArray(logs) ? logs : []);
  }

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        await loadAll();
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

  const pct = metaMl > 0 ? Math.min((consumoHojeMl / metaMl) * 100, 100) : 0;
  const faltamMl = Math.max(metaMl - consumoHojeMl, 0);

  const pontosHoje = Math.floor(consumoHojeMl / 250);
  const metaBatida = consumoHojeMl >= metaMl;

  // ✅ CORRIGIDO: Nível agora lê do banco de dados para ser idêntico ao Dashboard
  const nivel = useMemo(() => {
    const rankNome = profile?.rank || "Iniciante";
    const cores = {
      "Diamante": "text-indigo-700",
      "Ouro": "text-amber-600",
      "Prata": "text-slate-500",
      "Bronze": "text-orange-700",
      "Iniciante": "text-gray-500"
    };
    return { 
      nome: rankNome, 
      cor: cores[rankNome] || "text-gray-500" 
    };
  }, [profile]);

  // Resto da lógica de histórico (mantida igual)
  const ultimos7 = useMemo(() => {
    const arr = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const date = ymd(d);
      const total = (waterLogs || []).filter((l) => l?.data === date).reduce((sum, l) => sum + Number(l?.quantidade_ml || 0), 0);
      arr.push({ date, totalMl: total, pontos: Math.floor(total / 250), bateuMeta: total >= metaMl && metaMl > 0 });
    }
    return arr;
  }, [waterLogs, metaMl]);

  const streak = useMemo(() => {
    let s = 0;
    for (let i = ultimos7.length - 1; i >= 0; i--) {
      if (ultimos7[i].bateuMeta) s++; else break;
    }
    return s;
  }, [ultimos7]);

  const pontosSemana = useMemo(() => ultimos7.reduce((sum, d) => sum + (d.pontos || 0), 0), [ultimos7]);
  const maxMl7 = Math.max(...ultimos7.map((d) => d.totalMl), metaMl, 1);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50">
      <div className="max-w-5xl mx-auto px-4 pt-6 pb-24">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => (window.location.href = createPageUrl("Dashboard"))} className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Progresso</h1>
            <p className="text-sm text-gray-500">Acompanhe sua evolução</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm mb-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm text-gray-500 flex items-center gap-2"><Calendar className="w-4 h-4" /> Hoje ({hoje})</div>
              <div className="text-xl font-bold text-gray-900 mt-1">Olá, {userEmail || "usuário"}</div>
              <div className="text-sm text-gray-600 mt-1">Objetivo: <span className="font-semibold">{profile?.objetivo || "não definido"}</span></div>
              
              <div className="mt-3 flex flex-wrap gap-2">
                <div className="px-3 py-2 rounded-xl bg-indigo-50 border border-indigo-100 text-sm text-indigo-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Nível: <span className={`font-bold ${nivel.cor}`}>{nivel.nome}</span>
                </div>
                <div className="px-3 py-2 rounded-xl bg-amber-50 border border-amber-100 text-sm text-amber-900 flex items-center gap-2">
                  <Trophy className="w-4 h-4" />
                  Streak: <span className="font-bold">{streak}</span> dia(s)
                </div>
              </div>
            </div>

            <div className={`px-3 py-2 rounded-xl border text-sm flex items-center gap-2 ${metaBatida ? "bg-green-50 border-green-200 text-green-800" : "bg-indigo-50 border-indigo-200 text-indigo-800"}`}>
              {metaBatida ? <BadgeCheck className="w-4 h-4" /> : <Trophy className="w-4 h-4" />}
              {metaBatida ? "Meta atingida hoje" : "Missão do dia: bater a meta"}
            </div>
          </div>
        </div>

        {/* Grid de Cards (Hidratação, Medidas, Saúde) */}
        <div className="grid lg:grid-cols-3 gap-4 mb-5">
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Droplets className="w-5 h-5 text-blue-600" />
                <div className="font-semibold text-gray-900">Hidratação</div>
              </div>
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
              <div className="h-3 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600" style={{ width: `${pct}%` }} />
            </div>
            <Button onClick={() => (window.location.href = "/hidratacao")} variant="outline" className="mt-4 w-full">Abrir Hidratação <ChevronRight className="w-4 h-4 ml-1" /></Button>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-2 mb-3"><Scale className="w-5 h-5 text-gray-700" /><div className="font-semibold text-gray-900">Medidas</div></div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between"><span className="text-gray-500 flex items-center gap-2"><Scale className="w-4 h-4" /> Peso</span><span className="font-semibold text-gray-900">{profile?.peso_kg ? `${profile.peso_kg} kg` : "—"}</span></div>
              <div className="flex items-center justify-between"><span className="text-gray-500 flex items-center gap-2"><Ruler className="w-4 h-4" /> Altura</span><span className="font-semibold text-gray-900">{profile?.altura_cm ? `${profile.altura_cm} cm` : "—"}</span></div>
              <div className="flex items-center justify-between"><span className="text-gray-500">IMC</span><span className="font-semibold text-gray-900">{calcIMC(profile?.peso_kg, profile?.altura_cm)?.toFixed(1) || "—"}</span></div>
            </div>
            <Button onClick={() => (window.location.href = "/perfil")} className="mt-4 w-full bg-gradient-to-r from-indigo-600 to-blue-600 text-white">Atualizar dados</Button>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-2 mb-3"><HeartPulse className="w-5 h-5 text-rose-600" /><div className="font-semibold text-gray-900">Saúde</div></div>
            <div className="mt-4 bg-rose-50 border border-rose-100 rounded-xl p-4">
              <div className="text-xs text-gray-600 mb-1">Status</div>
              <div className="font-semibold text-gray-900">Pronto para integrar dados clínicos</div>
            </div>
            <Button onClick={() => window.location.href = createPageUrl("Diagnostico")} variant="outline" className="mt-4 w-full">Ver recomendações <ChevronRight className="w-4 h-4 ml-1" /></Button>
          </div>
        </div>

        {/* Gráfico 7 dias */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm mb-5">
          <div className="flex items-center justify-between mb-4">
            <div className="font-semibold text-gray-900 flex items-center gap-2"><Droplets className="w-4 h-4 text-blue-600" /> Últimos 7 dias</div>
          </div>
          <div className="flex items-end gap-2 h-28">
            {ultimos7.map((d) => (
              <div key={d.date} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full h-full flex items-end">
                  <div className={`w-full rounded-t-lg ${d.bateuMeta ? "bg-green-500" : "bg-blue-200"}`} style={{ height: `${(d.totalMl / maxMl7) * 100}%` }} />
                </div>
                <div className="text-[10px] text-gray-500">{d.date.slice(5)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Rodapé Gamificado */}
        <div className="bg-gradient-to-r from-indigo-600 to-blue-600 rounded-2xl p-5 text-white">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm opacity-90">Seu progresso</div>
              <div className="text-2xl font-extrabold">{profile?.xp_total || 0} XP Total</div>
              <div className="text-xs opacity-90 mt-1">Mantenha seus registros em dia para subir no ranking global!</div>
            </div>
            <Trophy className="w-10 h-10 opacity-90" />
          </div>
        </div>
      </div>
    </div>
  );
}
