// src/pages/Hidratacao.jsx
import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Droplets, User, Calendar, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabaseClient";
import { createPageUrl } from "@/utils";
import { waterLogList } from "@/lib/waterApi";

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function toNumberOrNull(v) {
  if (v == null) return null;
  const s = String(v).trim().replace(",", ".");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

// mesma regra do Perfil (consistente)
function calcMetaAguaLitros(pesoKg, basalKcal) {
  if (!pesoKg || !Number.isFinite(pesoKg)) return null;
  const baseMl = pesoKg * 35;
  const extraMl = basalKcal && Number.isFinite(basalKcal) ? (basalKcal / 1000) * 250 : 0;
  const litros = (baseMl + extraMl) / 1000;
  return clamp(Number(litros.toFixed(1)), 1.5, 6);
}

async function waterLogCreate({ quantidade_ml, data, hora }) {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;
  if (!token) throw new Error("Sessão expirada. Faça login novamente.");

  const r = await fetch("/api/water-log", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ quantidade_ml, data, hora }),
  });

  const json = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(json?.error || "Erro ao salvar registro de água.");
  return json;
}

export default function Hidratacao() {
  const [loading, setLoading] = useState(true);
  const [savingOther, setSavingOther] = useState(false);

  const [profile, setProfile] = useState(null);
  const [waterLogs, setWaterLogs] = useState([]);

  const [otherMl, setOtherMl] = useState("");

  const hoje = new Date().toISOString().split("T")[0];

  async function loadAll() {
    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData?.session;
      if (!session?.user) {
        window.location.href = createPageUrl("Login");
        return;
      }

      const { data: prof, error } = await supabase
        .from("profiles")
        .select("id, peso_kg, altura_cm, basal_kcal, meta_agua_litros, objetivo")
        .eq("id", session.user.id)
        .maybeSingle();

      if (error) console.error("Hidratacao: load profile error:", error);

      const logs = await waterLogList();
      setWaterLogs(Array.isArray(logs) ? logs : []);
      setProfile(prof || null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  const peso = profile?.peso_kg ?? null;
  const altura = profile?.altura_cm ?? null;
  const basal = profile?.basal_kcal ?? null;

  const metaAuto = useMemo(() => calcMetaAguaLitros(Number(peso), Number(basal)), [peso, basal]);
  const metaLitros = Number(profile?.meta_agua_litros || metaAuto || 2.5);
  const metaMl = metaLitros * 1000;

  const consumoHojeMl = useMemo(() => {
    return (waterLogs || [])
      .filter((l) => l?.data === hoje)
      .reduce((sum, l) => sum + Number(l?.quantidade_ml || 0), 0);
  }, [waterLogs, hoje]);

  const pct = clamp((consumoHojeMl / metaMl) * 100, 0, 100);
  const faltamMl = Math.max(metaMl - consumoHojeMl, 0);

  const logsHoje = useMemo(() => {
    return (waterLogs || [])
      .filter((l) => l?.data === hoje)
      .slice()
      .sort((a, b) => String(b?.hora || "").localeCompare(String(a?.hora || "")));
  }, [waterLogs, hoje]);

  const ultimos7Dias = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().split("T")[0];
      days.push(iso);
    }
    const byDay = new Map(days.map((d) => [d, 0]));
    for (const l of waterLogs || []) {
      if (byDay.has(l?.data)) {
        byDay.set(l.data, byDay.get(l.data) + Number(l?.quantidade_ml || 0));
      }
    }
    return days.map((d) => ({ data: d, ml: byDay.get(d) || 0 }));
  }, [waterLogs]);

  async function addQuick(ml) {
    try {
      const now = new Date();
      const hora = now.toTimeString().slice(0, 5); // HH:MM
      await waterLogCreate({ quantidade_ml: ml, data: hoje, hora });
      await loadAll();
    } catch (e) {
      console.error(e);
      alert(e?.message || "Erro ao registrar água.");
    }
  }

  async function addOther() {
    const ml = toNumberOrNull(otherMl);
    if (!ml || ml <= 0) return;
    setSavingOther(true);
    try {
      const now = new Date();
      const hora = now.toTimeString().slice(0, 5);
      await waterLogCreate({ quantidade_ml: Math.round(ml), data: hoje, hora });
      setOtherMl("");
      await loadAll();
    } catch (e) {
      console.error(e);
      alert(e?.message || "Erro ao registrar água.");
    } finally {
      setSavingOther(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="max-w-3xl mx-auto px-4 pt-6 pb-24">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => (window.location.href = createPageUrl("Dashboard"))}
            className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Hidratação</h1>
            <p className="text-sm text-gray-500">Mantenha-se hidratado</p>
          </div>
        </div>

        {/* Meta */}
        <div className="rounded-2xl p-5 text-white shadow-sm mb-4 bg-gradient-to-r from-blue-600 to-indigo-600">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
              <Droplets className="w-5 h-5" />
            </div>
            <div>
              <div className="text-3xl font-extrabold">{metaLitros.toFixed(1)}L</div>
              <div className="text-sm opacity-90">Meta diária de água recomendada</div>
              <div className="text-xs opacity-80">
                Aproximadamente {Math.round((metaLitros * 1000) / 250)} copos de 250ml
              </div>
            </div>
          </div>
        </div>

        {/* Seu Perfil */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-gray-700" />
              <div>
                <div className="font-semibold text-gray-900">Seu Perfil</div>
                <div className="text-xs text-gray-500">
                  Peso, altura e basal ajustam automaticamente a meta de água
                </div>
              </div>
            </div>

            <Button onClick={() => (window.location.href = "/perfil")} variant="outline">
              Editar
            </Button>
          </div>

          <div className="grid md:grid-cols-3 gap-3">
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
              <div className="text-xs text-gray-500 mb-1">Peso</div>
              <div className="font-bold text-gray-900">{peso ? `${peso} kg` : "—"}</div>
            </div>
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
              <div className="text-xs text-gray-500 mb-1">Altura</div>
              <div className="font-bold text-gray-900">{altura ? `${altura} cm` : "—"}</div>
            </div>
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
              <div className="text-xs text-gray-500 mb-1">Basal</div>
              <div className="font-bold text-gray-900">{basal ? `${basal} kcal` : "—"}</div>
            </div>
          </div>
        </div>

        {/* Acompanhamento diário */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="font-semibold text-gray-900 flex items-center gap-2">
              <Droplets className="w-5 h-5 text-blue-600" />
              Acompanhamento Diário
            </div>
            <div className="text-xs text-gray-500 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Hoje
            </div>
          </div>

          <div className="flex items-end justify-between mb-2">
            <div>
              <div className="text-4xl font-extrabold text-gray-900">
                {(consumoHojeMl / 1000).toFixed(1)}L
              </div>
              <div className="text-xs text-gray-500">de {metaLitros.toFixed(1)}L hoje</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-700">{(faltamMl / 1000).toFixed(1)}L</div>
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

          <div className="mt-2 text-xs text-gray-500">{Math.round(pct)}% da meta diária</div>

          <div className="grid grid-cols-3 gap-3 mt-4">
            <Button
              onClick={() => addQuick(250)}
              variant="outline"
              className="rounded-xl py-6"
            >
              <div className="text-center">
                <div className="font-bold">250ml</div>
                <div className="text-xs text-gray-500">Copo</div>
              </div>
            </Button>

            <Button
              onClick={() => addQuick(500)}
              variant="outline"
              className="rounded-xl py-6"
            >
              <div className="text-center">
                <div className="font-bold">500ml</div>
                <div className="text-xs text-gray-500">Garrafa</div>
              </div>
            </Button>

            <Button
              onClick={() => {}}
              className="rounded-xl py-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              <div className="text-center">
                <div className="font-bold flex items-center justify-center gap-1">
                  <Plus className="w-4 h-4" /> Outro
                </div>
                <div className="text-xs opacity-90">Volume</div>
              </div>
            </Button>
          </div>

          {/* Outro volume */}
          <div className="mt-3 flex gap-2">
            <Input
              value={otherMl}
              onChange={(e) => setOtherMl(e.target.value)}
              placeholder="Ex: 350 (ml)"
              inputMode="numeric"
            />
            <Button onClick={addOther} disabled={savingOther}>
              {savingOther ? "Salvando..." : "Adicionar"}
            </Button>
          </div>
        </div>

        {/* Registros de hoje */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="font-semibold text-gray-900">Registros Hoje</div>
            <div className="text-xs text-gray-500">Total: {(consumoHojeMl / 1000).toFixed(1)}L</div>
          </div>

          {logsHoje.length === 0 ? (
            <div className="text-sm text-gray-500">Ainda não há registros hoje.</div>
          ) : (
            <div className="space-y-2">
              {logsHoje.map((l) => (
                <div
                  key={l.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100"
                >
                  <div className="text-sm text-gray-700">
                    <span className="font-semibold text-gray-900">{l.quantidade_ml}ml</span>{" "}
                    <span className="text-xs text-gray-500">({l.hora || "—"})</span>
                  </div>
                  <div className="text-xs text-gray-500">{l.data}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Últimos 7 dias */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="font-semibold text-gray-900">Últimos 7 dias</div>
            <div className="text-xs text-gray-500">Meta: {metaLitros.toFixed(1)}L/dia</div>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {ultimos7Dias.map((d) => {
              const dayPct = clamp((d.ml / metaMl) * 100, 0, 100);
              const label = new Date(d.data).toLocaleDateString("pt-BR", { weekday: "short" });
              return (
                <div key={d.data} className="text-center">
                  <div className="text-[10px] text-gray-500 mb-1">{label}</div>
                  <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div className="h-2 bg-gradient-to-r from-blue-500 to-indigo-600" style={{ width: `${dayPct}%` }} />
                  </div>
                  <div className="text-[11px] font-semibold text-gray-900 mt-1">
                    {(d.ml / 1000).toFixed(1)}L
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
