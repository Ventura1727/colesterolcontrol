// src/pages/Hidratacao.jsx
import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Droplets,
  Plus,
  User,
  Ruler,
  Weight,
  Flame,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabaseClient";
import { createPageUrl } from "@/utils";

function toNumberOrNull(v) {
  if (v == null) return null;
  const s = String(v).trim().replace(",", ".");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function calcMetaAguaLitros(pesoKg, basalKcal) {
  // Regra simples e explicável:
  // - base: 35ml por kg
  // - + 250ml por cada 1000 kcal de basal (opcional)
  if (!pesoKg || !Number.isFinite(pesoKg)) return null;

  const baseMl = pesoKg * 35;
  const extraMl = basalKcal && Number.isFinite(basalKcal) ? (basalKcal / 1000) * 250 : 0;
  const totalMl = baseMl + extraMl;

  const litros = totalMl / 1000;
  return Math.max(1.5, Math.min(6, Number(litros.toFixed(1))));
}

function ymd(d) {
  return d.toISOString().split("T")[0];
}

function nowHHMM() {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

/**
 * API via Vercel serverless /api/water-log (GET/POST)
 * - GET: retorna { data: [...] } ou [...] (vamos tolerar os dois)
 * - POST: body { quantidade_ml, data, hora }
 */
async function apiGetWaterLogs() {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;
  if (!token) throw new Error("Sem sessão. Faça login novamente.");

  const r = await fetch("/api/water-log", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const j = await r.json().catch(() => null);
  if (!r.ok) {
    const msg = j?.error || j?.message || `Erro ao carregar hidratação (${r.status})`;
    throw new Error(msg);
  }

  const arr = Array.isArray(j) ? j : Array.isArray(j?.data) ? j.data : [];
  return arr;
}

async function apiCreateWaterLog({ quantidade_ml, data, hora }) {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;
  if (!token) throw new Error("Sem sessão. Faça login novamente.");

  const r = await fetch("/api/water-log", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ quantidade_ml, data, hora }),
  });

  const j = await r.json().catch(() => null);
  if (!r.ok) {
    const msg = j?.error || j?.message || `Erro ao registrar (${r.status})`;
    throw new Error(msg);
  }
  return j;
}

export default function Hidratacao() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [profile, setProfile] = useState(null);
  const [logs, setLogs] = useState([]);

  const [showOther, setShowOther] = useState(false);
  const [otherMl, setOtherMl] = useState("");

  const hoje = ymd(new Date());

  async function loadAll() {
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

    if (error) console.error("Hidratacao load profile error:", error);
    setProfile(prof || null);

    const arr = await apiGetWaterLogs();
    setLogs(Array.isArray(arr) ? arr : []);
  }

  useEffect(() => {
    (async () => {
      try {
        setIsLoading(true);
        await loadAll();
      } catch (e) {
        console.error(e);
        alert(e?.message || "Erro ao carregar hidratação.");
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const pesoNum = useMemo(() => toNumberOrNull(profile?.peso_kg), [profile?.peso_kg]);
  const basalNum = useMemo(() => toNumberOrNull(profile?.basal_kcal), [profile?.basal_kcal]);

  const metaLitros = useMemo(() => {
    const p = toNumberOrNull(profile?.meta_agua_litros);
    if (p) return Number(p);
    const auto = calcMetaAguaLitros(pesoNum, basalNum);
    return auto ?? 2.5;
  }, [profile?.meta_agua_litros, pesoNum, basalNum]);

  const metaMl = metaLitros * 1000;

  const logsHoje = useMemo(() => {
    return (logs || [])
      .filter((l) => l?.data === hoje)
      .sort((a, b) => String(b?.hora || "").localeCompare(String(a?.hora || "")));
  }, [logs, hoje]);

  const totalHojeMl = useMemo(() => {
    return logsHoje.reduce((sum, l) => sum + Number(l?.quantidade_ml || 0), 0);
  }, [logsHoje]);

  const faltamMl = Math.max(metaMl - totalHojeMl, 0);
  const pct = metaMl > 0 ? Math.min((totalHojeMl / metaMl) * 100, 100) : 0;

  const copos250 = Math.round(metaMl / 250);

  async function addWater(ml) {
    try {
      setIsSaving(true);
      await apiCreateWaterLog({
        quantidade_ml: ml,
        data: hoje,
        hora: nowHHMM(),
      });
      const arr = await apiGetWaterLogs();
      setLogs(arr);
    } catch (e) {
      console.error(e);
      alert(e?.message || "Erro ao registrar água.");
    } finally {
      setIsSaving(false);
    }
  }

  async function addOther() {
    const ml = toNumberOrNull(otherMl);
    if (!ml || ml <= 0) {
      alert("Informe um volume válido (ml).");
      return;
    }
    setShowOther(false);
    setOtherMl("");
    await addWater(Math.round(ml));
  }

  if (isLoading) {
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

        {/* Hero Meta */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-5 text-white mb-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
              <Droplets className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <div className="text-3xl font-extrabold">{metaLitros.toFixed(1)}L</div>
              <div className="text-sm opacity-90">Meta diária de água recomendada</div>
              <div className="text-xs opacity-80 mt-1">
                Aproximadamente {copos250} copos de 250ml
              </div>
            </div>
          </div>
        </div>

        {/* Card Perfil (somente leitura) */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm mb-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="font-semibold text-gray-900 flex items-center gap-2">
                <User className="w-4 h-4 text-indigo-700" />
                Seu Perfil
              </div>
              <div className="text-xs text-gray-500">
                Peso, altura e basal ajustam automaticamente a meta de água
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => (window.location.href = "/perfil")}
              className="shrink-0"
            >
              Editar
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-3 mt-4">
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
              <div className="text-[11px] text-gray-500 flex items-center gap-1">
                <Weight className="w-3 h-3" /> Peso
              </div>
              <div className="font-bold text-gray-900">
                {profile?.peso_kg ? `${profile.peso_kg} kg` : "—"}
              </div>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
              <div className="text-[11px] text-gray-500 flex items-center gap-1">
                <Ruler className="w-3 h-3" /> Altura
              </div>
              <div className="font-bold text-gray-900">
                {profile?.altura_cm ? `${profile.altura_cm} cm` : "—"}
              </div>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
              <div className="text-[11px] text-gray-500 flex items-center gap-1">
                <Flame className="w-3 h-3" /> Basal
              </div>
              <div className="font-bold text-gray-900">
                {profile?.basal_kcal ? `${profile.basal_kcal} kcal` : "—"}
              </div>
            </div>
          </div>

          {!profile?.peso_kg || !profile?.altura_cm ? (
            <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900">
              💡 Preencha <b>peso</b> e <b>altura</b> no Perfil para metas mais precisas.
            </div>
          ) : null}
        </div>

        {/* Acompanhamento diário */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="font-semibold text-gray-900 flex items-center gap-2">
              <Droplets className="w-4 h-4 text-blue-700" />
              Acompanhamento Diário
            </div>
            <div className="text-xs text-gray-500 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Hoje
            </div>
          </div>

          <div className="flex items-end justify-between mb-2">
            <div>
              <div className="text-4xl font-extrabold text-gray-900">
                {(totalHojeMl / 1000).toFixed(1)}L
              </div>
              <div className="text-sm text-gray-500">de {metaLitros.toFixed(1)}L hoje</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-700">
                {(faltamMl / 1000).toFixed(1)}L
              </div>
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

          {/* Botões */}
          <div className="grid grid-cols-3 gap-3 mt-4">
            <Button
              disabled={isSaving}
              onClick={() => addWater(250)}
              variant="outline"
              className="py-7 rounded-2xl"
            >
              <div className="flex flex-col items-center">
                <Droplets className="w-5 h-5 text-blue-700 mb-1" />
                <div className="font-bold text-gray-900">250ml</div>
                <div className="text-[11px] text-gray-500">Copo</div>
              </div>
            </Button>

            <Button
              disabled={isSaving}
              onClick={() => addWater(500)}
              variant="outline"
              className="py-7 rounded-2xl"
            >
              <div className="flex flex-col items-center">
                <Droplets className="w-5 h-5 text-blue-700 mb-1" />
                <div className="font-bold text-gray-900">500ml</div>
                <div className="text-[11px] text-gray-500">Garrafa</div>
              </div>
            </Button>

            <Button
              disabled={isSaving}
              onClick={() => setShowOther(true)}
              className="py-7 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
            >
              <div className="flex flex-col items-center">
                <Plus className="w-5 h-5 mb-1" />
                <div className="font-bold">Outro</div>
                <div className="text-[11px] opacity-90">Volume</div>
              </div>
            </Button>
          </div>

          {/* Input Outro */}
          {showOther ? (
            <div className="mt-4 bg-slate-50 border border-slate-100 rounded-2xl p-4">
              <div className="text-sm font-semibold text-gray-900 mb-2">Registrar outro volume</div>
              <div className="flex gap-2">
                <Input
                  value={otherMl}
                  onChange={(e) => setOtherMl(e.target.value)}
                  placeholder="Ex: 350"
                  inputMode="numeric"
                />
                <Button disabled={isSaving} onClick={addOther}>
                  Salvar
                </Button>
                <Button
                  variant="outline"
                  disabled={isSaving}
                  onClick={() => {
                    setShowOther(false);
                    setOtherMl("");
                  }}
                >
                  Cancelar
                </Button>
              </div>
              <div className="text-xs text-gray-500 mt-2">Informe o volume em mililitros (ml).</div>
            </div>
          ) : null}
        </div>

        {/* Registros de hoje */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="font-semibold text-gray-900">Registros Hoje</div>
            <div className="text-xs text-gray-500">
              Total hoje: <b>{(totalHojeMl / 1000).toFixed(1)}L</b>
            </div>
          </div>

          {logsHoje.length === 0 ? (
            <div className="text-sm text-gray-500">
              Nenhum registro hoje. Clique em <b>250ml</b> ou <b>500ml</b> para começar.
            </div>
          ) : (
            <div className="space-y-2">
              {logsHoje.map((l) => (
                <div
                  key={l?.id || `${l?.data}-${l?.hora}-${l?.quantidade_ml}`}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100"
                >
                  <div className="flex items-center gap-2">
                    <Droplets className="w-4 h-4 text-blue-700" />
                    <div className="font-semibold text-gray-900">
                      {Number(l?.quantidade_ml || 0)}ml
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">{l?.hora || "--:--"}</div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4">
            <Button
              variant="outline"
              className="w-full"
              disabled={isSaving}
              onClick={async () => {
                setIsLoading(true);
                try {
                  await loadAll();
                } catch (e) {
                  console.error(e);
                  alert(e?.message || "Erro ao recarregar.");
                } finally {
                  setIsLoading(false);
                }
              }}
            >
              Recarregar dados
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
