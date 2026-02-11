// src/pages/Hidratacao.jsx
import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Droplets, Calculator, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import HydrationDashboard from "@/components/hydration/HydrationDashboard";
import { supabase } from "@/lib/supabaseClient";
import { createPageUrl } from "@/utils";
import { waterLogList } from "@/lib/waterApi";

function toNumberOrNull(v) {
  if (v == null) return null;
  const s = String(v).trim().replace(",", ".");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function calcMetaAguaLitros(pesoKg, basalKcal) {
  if (!pesoKg || !Number.isFinite(pesoKg)) return null;
  const baseMl = pesoKg * 35;
  const extraMl = basalKcal && Number.isFinite(basalKcal) ? (basalKcal / 1000) * 250 : 0;
  const litros = (baseMl + extraMl) / 1000;
  return Math.max(1.5, Math.min(6, Number(litros.toFixed(1))));
}

export default function Hidratacao() {
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [profile, setProfile] = useState(null);
  const [waterLogs, setWaterLogs] = useState([]);

  const [form, setForm] = useState({
    peso_kg: "",
    altura_cm: "",
    basal_kcal: "",
  });

  const pesoNum = useMemo(() => toNumberOrNull(form.peso_kg), [form.peso_kg]);
  const alturaNum = useMemo(() => toNumberOrNull(form.altura_cm), [form.altura_cm]);
  const basalNum = useMemo(() => toNumberOrNull(form.basal_kcal), [form.basal_kcal]);

  const metaAuto = useMemo(() => calcMetaAguaLitros(pesoNum, basalNum), [pesoNum, basalNum]);

  async function refreshLogs() {
    const logs = await waterLogList();
    setWaterLogs(Array.isArray(logs) ? logs : []);
  }

  useEffect(() => {
    (async () => {
      try {
        setIsLoading(true);

        const { data: sessionData } = await supabase.auth.getSession();
        const session = sessionData?.session;
        if (!session?.user) {
          window.location.href = createPageUrl("Login");
          return;
        }

        const { data: prof, error } = await supabase
          .from("profiles")
          .select("id, peso_kg, altura_cm, basal_kcal, meta_agua_litros")
          .eq("id", session.user.id)
          .maybeSingle();

        if (error) console.error("Hidratacao load profile error:", error);

        if (prof) {
          setProfile(prof);
          setForm({
            peso_kg: prof.peso_kg ?? "",
            altura_cm: prof.altura_cm ?? "",
            basal_kcal: prof.basal_kcal ?? "",
          });
        }

        await refreshLogs();
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  async function handleSalvarMeta() {
    setSaving(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData?.session;
      if (!session?.user) throw new Error("Sessão expirada. Faça login novamente.");

      const payload = {
        id: session.user.id,
        peso_kg: pesoNum,
        altura_cm: alturaNum,
        basal_kcal: basalNum,
        meta_agua_litros: metaAuto,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from("profiles").upsert(payload, { onConflict: "id" });
      if (error) throw error;

      setProfile((p) => ({ ...(p || {}), ...payload }));
      alert("✅ Meta e medidas salvas!");
    } catch (e) {
      console.error("Salvar meta error:", e);
      alert(e?.message || "Erro ao salvar. Verifique o Supabase (profiles).");
    } finally {
      setSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  const metaDiaria = profile?.meta_agua_litros ?? metaAuto ?? 2.5;

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

        {/* Meta Topo */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white mb-5">
          <div className="flex items-center gap-2 mb-2">
            <Droplets className="w-6 h-6" />
            <div className="text-4xl font-extrabold">{Number(metaDiaria).toFixed(1)}L</div>
          </div>
          <div className="text-sm opacity-90">Meta diária de água recomendada</div>
          <div className="text-xs opacity-80 mt-1">
            Aproximadamente {Math.round((Number(metaDiaria) * 1000) / 250)} copos de 250ml
          </div>
        </div>

        {/* Calcular meta */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm mb-5">
          <div className="flex items-center gap-2 mb-4">
            <Calculator className="w-5 h-5 text-blue-600" />
            <h2 className="font-semibold text-gray-900">Calcule sua meta de água</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Peso (kg) *</label>
              <Input
                value={form.peso_kg}
                onChange={(e) => setForm((p) => ({ ...p, peso_kg: e.target.value }))}
                placeholder="Ex: 70"
                inputMode="decimal"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Altura (cm)</label>
              <Input
                value={form.altura_cm}
                onChange={(e) => setForm((p) => ({ ...p, altura_cm: e.target.value }))}
                placeholder="Ex: 170"
                inputMode="decimal"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Basal (kcal/dia)</label>
              <Input
                value={form.basal_kcal}
                onChange={(e) => setForm((p) => ({ ...p, basal_kcal: e.target.value }))}
                placeholder="Ex: 1800"
                inputMode="decimal"
              />
              <div className="text-[11px] text-gray-500 mt-1">Opcional: ajusta melhor a meta</div>
            </div>
          </div>

          <div className="mt-4 flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-xl p-3">
            <Info className="w-4 h-4 text-blue-700 mt-0.5" />
            <div className="text-xs text-gray-700">
              Meta estimada: <strong>{metaAuto ? `${metaAuto.toFixed(1)}L/dia` : "—"}</strong>. Você pode salvar para
              usar automaticamente no Progresso e no Dashboard.
            </div>
          </div>

          <Button
            onClick={handleSalvarMeta}
            disabled={saving || !pesoNum}
            className="mt-4 w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white py-6 rounded-2xl text-lg font-semibold"
          >
            {saving ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                className="w-6 h-6 border-2 border-white border-t-transparent rounded-full"
              />
            ) : (
              "Salvar medidas e meta"
            )}
          </Button>
        </div>

        {/* Dashboard */}
        <HydrationDashboard
          waterLogs={waterLogs}
          metaDiaria={metaDiaria}
          onLogsUpdated={(logs) => setWaterLogs(logs)}
        />
      </div>
    </div>
  );
}
