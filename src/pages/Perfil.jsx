// src/pages/Perfil.jsx
import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Save, User, Ruler, Weight, Droplets, Flame } from "lucide-react";
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
  // regra simples e “explicável”:
  // - base: 35 ml por kg
  // - + 250 ml por cada 1000 kcal de basal (opcional)
  if (!pesoKg || !Number.isFinite(pesoKg)) return null;

  const baseMl = pesoKg * 35;
  const extraMl = basalKcal && Number.isFinite(basalKcal) ? (basalKcal / 1000) * 250 : 0;
  const totalMl = baseMl + extraMl;

  const litros = totalMl / 1000;
  return Math.max(1.5, Math.min(6, Number(litros.toFixed(1))));
}

export default function Perfil() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [userEmail, setUserEmail] = useState("");
  const [form, setForm] = useState({
    peso_kg: "",
    altura_cm: "",
    basal_kcal: "",
    objetivo: "",
  });

  const pesoNum = useMemo(() => toNumberOrNull(form.peso_kg), [form.peso_kg]);
  const alturaNum = useMemo(() => toNumberOrNull(form.altura_cm), [form.altura_cm]);
  const basalNum = useMemo(() => toNumberOrNull(form.basal_kcal), [form.basal_kcal]);

  const metaAuto = useMemo(() => calcMetaAguaLitros(pesoNum, basalNum), [pesoNum, basalNum]);

  const imc = useMemo(() => {
    if (!pesoNum || !alturaNum) return null;
    const h = alturaNum / 100;
    if (!h) return null;
    const v = pesoNum / (h * h);
    return Number.isFinite(v) ? v : null;
  }, [pesoNum, alturaNum]);

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

        if (error) console.error("Perfil load profile error:", error);

        if (prof) {
          setForm({
            peso_kg: prof.peso_kg ?? "",
            altura_cm: prof.altura_cm ?? "",
            basal_kcal: prof.basal_kcal ?? "",
            objetivo: prof.objetivo ?? "",
          });
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleSave() {
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
        objetivo: form.objetivo ? String(form.objetivo) : null,
        meta_agua_litros: metaAuto,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from("profiles").upsert(payload, { onConflict: "id" });
      if (error) throw error;

      alert("✅ Perfil atualizado com sucesso!");
      window.location.assign("/progresso");
    } catch (e) {
      console.error("Perfil save error:", e);
      alert(e?.message || "Erro ao salvar perfil.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-blue-50 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-blue-50">
      <div className="max-w-3xl mx-auto px-4 pt-6 pb-24">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => window.location.href = "/progresso"}
            className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Perfil</h1>
            <p className="text-sm text-gray-500">Atualize suas medidas e metas</p>
          </div>
        </div>

        {/* Card usuário */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
              <User className="w-5 h-5 text-indigo-700" />
            </div>
            <div>
              <div className="font-semibold text-gray-900">{userEmail || "Usuário"}</div>
              <div className="text-xs text-gray-500">Esses dados ajustam hidratação e recomendações</div>
            </div>
          </div>
        </div>

        {/* Medidas */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm mb-4">
          <div className="flex items-center gap-2 mb-4">
            <Ruler className="w-5 h-5 text-gray-700" />
            <h2 className="font-semibold text-gray-900">Medidas</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Peso (kg)</label>
              <div className="relative">
                <Weight className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  value={form.peso_kg}
                  onChange={(e) => setForm((p) => ({ ...p, peso_kg: e.target.value }))}
                  placeholder="Ex: 82"
                  className="pl-9"
                  inputMode="decimal"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Altura (cm)</label>
              <div className="relative">
                <Ruler className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  value={form.altura_cm}
                  onChange={(e) => setForm((p) => ({ ...p, altura_cm: e.target.value }))}
                  placeholder="Ex: 178"
                  className="pl-9"
                  inputMode="decimal"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Basal (kcal/dia)</label>
              <div className="relative">
                <Flame className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  value={form.basal_kcal}
                  onChange={(e) => setForm((p) => ({ ...p, basal_kcal: e.target.value }))}
                  placeholder="Ex: 1800"
                  className="pl-9"
                  inputMode="decimal"
                />
              </div>
            </div>
          </div>

          <div className="mt-4 grid md:grid-cols-2 gap-3">
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
              <div className="text-xs text-gray-600 mb-1">IMC estimado</div>
              <div className="text-2xl font-bold text-gray-900">
                {imc ? imc.toFixed(1) : "—"}
              </div>
              <div className="text-[11px] text-gray-500 mt-1">Calculado com peso e altura</div>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <Droplets className="w-4 h-4 text-blue-700" />
                <div className="text-xs text-gray-600">Meta diária sugerida</div>
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {metaAuto ? `${metaAuto.toFixed(1)}L` : "—"}
              </div>
              <div className="text-[11px] text-gray-500 mt-1">Ajusta automaticamente a Hidratação</div>
            </div>
          </div>
        </div>

        {/* Objetivo */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm mb-6">
          <h2 className="font-semibold text-gray-900 mb-2">Objetivo</h2>
          <p className="text-sm text-gray-500 mb-4">
            Se o usuário escolheu no quiz, esse campo ajuda o app a personalizar recomendações.
          </p>
          <Input
            value={form.objetivo}
            onChange={(e) => setForm((p) => ({ ...p, objetivo: e.target.value }))}
            placeholder="Ex: Perder peso / Reduzir colesterol / Melhorar hábitos"
          />
        </div>

        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white py-6 rounded-2xl text-lg font-semibold"
        >
          {saving ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              className="w-6 h-6 border-2 border-white border-t-transparent rounded-full"
            />
          ) : (
            <>
              <Save className="w-5 h-5 mr-2" />
              Salvar perfil
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
