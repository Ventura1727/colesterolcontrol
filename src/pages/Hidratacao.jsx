import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Droplets,
  Calculator,
  Info,
  Heart,
  Zap,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createPageUrl } from "@/utils";
import HydrationDashboard from "@/components/hydration/HydrationDashboard";
import { supabase } from "@/lib/supabaseClient";

function toISODate(d = new Date()) {
  // yyyy-mm-dd
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
}

function toHHMMSS(d = new Date()) {
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

export default function Hidratacao() {
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const [form, setForm] = useState({ peso: "", altura: "", basal: "" });
  const [waterNeeded, setWaterNeeded] = useState(3.1); // default
  const [logs, setLogs] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const todayISO = useMemo(() => toISODate(new Date()), []);
  const nowHHMMSS = useMemo(() => toHHMMSS(new Date()), []);

  const dailyTotalML = useMemo(() => {
    if (!Array.isArray(logs)) return 0;
    return logs
      .filter((l) => (l?.data || "").slice(0, 10) === todayISO)
      .reduce((sum, l) => sum + (Number(l?.quantidade_ml) || 0), 0);
  }, [logs, todayISO]);

  const dailyTotalL = useMemo(() => dailyTotalML / 1000, [dailyTotalML]);

  const remainingL = useMemo(() => {
    const r = Number(waterNeeded || 0) - dailyTotalL;
    return r > 0 ? r : 0;
  }, [waterNeeded, dailyTotalL]);

  const progressPct = useMemo(() => {
    const goalML = Number(waterNeeded || 0) * 1000;
    if (!goalML) return 0;
    const pct = (dailyTotalML / goalML) * 100;
    return Math.max(0, Math.min(100, pct));
  }, [dailyTotalML, waterNeeded]);

  async function getAccessToken() {
    const { data, error } = await supabase.auth.getSession();
    if (error || !data?.session?.access_token) return null;
    return data.session.access_token;
  }

  async function fetchProfile() {
    // Se você já tem outro fluxo de profile, pode manter o seu.
    // Aqui é só "best effort" sem quebrar a hidratação.
    try {
      const { data } = await supabase.auth.getUser();
      const user = data?.user;
      if (!user) return;

      // Se existir profile table, ok. Se não existir, ignore.
      const { data: p } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (p) setProfile(p);
    } catch {
      // ignore
    }
  }

  async function fetchWaterLogs() {
    const token = await getAccessToken();
    if (!token) return;

    const r = await fetch("/api/water-log", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const json = await r.json();

    // ✅ compatível com: array direto, {data:[]}, {logs:[]}
    const arr = Array.isArray(json) ? json : json?.data || json?.logs || [];
    setLogs(Array.isArray(arr) ? arr : []);
  }

  async function addWater(ml) {
    if (!ml || ml <= 0) return;

    setIsSubmitting(true);
    try {
      const token = await getAccessToken();
      if (!token) return;

      const body = {
        quantidade_ml: Number(ml),
        // ✅ salvar data em ISO (igual ao que o backend está retornando)
        data: todayISO,
        hora: toHHMMSS(new Date()),
      };

      const r = await fetch("/api/water-log", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      // Mesmo se 201, vamos sempre refazer o GET para atualizar a UI
      await r.json().catch(() => null);
      await fetchWaterLogs();
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleCalcGoal() {
    const peso = Number(String(form.peso).replace(",", "."));
    // regra simples: 35 ml/kg (ajuste depois se quiser)
    if (!peso || peso <= 0) return;
    const goalL = (peso * 35) / 1000;
    setWaterNeeded(Number(goalL.toFixed(1)));
  }

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      try {
        await fetchProfile();
        await fetchWaterLogs();
      } finally {
        setIsLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto p-4 md:p-6">
        <div className="flex items-center gap-3 mb-6">
          <Button
            variant="ghost"
            onClick={() => (window.location.href = createPageUrl("Dashboard"))}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">Hidratação</h1>
            <p className="text-muted-foreground">Mantenha-se hidratado</p>
          </div>
        </div>

        {/* Top card meta */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-6 text-white bg-gradient-to-r from-blue-600 to-indigo-500 mb-6"
        >
          <div className="flex items-center gap-3">
            <Droplets className="w-7 h-7" />
            <div>
              <div className="text-4xl font-bold">{Number(waterNeeded).toFixed(1)}L</div>
              <div className="opacity-90">Meta diária de água recomendada</div>
              <div className="opacity-80 text-sm">
                Aproximadamente {Math.round((Number(waterNeeded) * 1000) / 250)} copos de 250ml
              </div>
            </div>
          </div>
        </motion.div>

        {/* Dashboard / acompanhamento */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border bg-card p-5 mb-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Droplets className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-semibold">Acompanhamento Diário</h2>
            </div>
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                Hoje
              </span>
            </div>
          </div>

          {/* Se seu HydrationDashboard já faz tudo, pode usar ele.
              Se não, este bloco já mostra o progresso de forma correta. */}
          <HydrationDashboard
            isLoading={isLoading}
            goalLiters={Number(waterNeeded)}
            consumedLiters={dailyTotalL}
            remainingLiters={remainingL}
            progressPct={progressPct}
            logs={logs}
          />

          <div className="grid grid-cols-3 gap-3 mt-5">
            <Button
              className="h-20 rounded-2xl"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => addWater(250)}
            >
              <div className="flex flex-col items-center">
                <Droplets className="w-5 h-5 mb-1" />
                <div className="font-semibold">250ml</div>
                <div className="text-xs text-muted-foreground">Copo</div>
              </div>
            </Button>

            <Button
              className="h-20 rounded-2xl"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => addWater(500)}
            >
              <div className="flex flex-col items-center">
                <Droplets className="w-5 h-5 mb-1" />
                <div className="font-semibold">500ml</div>
                <div className="text-xs text-muted-foreground">Garrafa</div>
              </div>
            </Button>

            <Button
              className="h-20 rounded-2xl"
              disabled={isSubmitting}
              onClick={() => {
                const v = prompt("Digite o volume em ml (ex: 300):");
                const ml = Number(String(v || "").replace(",", "."));
                if (ml && ml > 0) addWater(ml);
              }}
            >
              <div className="flex flex-col items-center">
                <span className="text-2xl mb-1">＋</span>
                <div className="font-semibold">Outro</div>
                <div className="text-xs opacity-90">Volume</div>
              </div>
            </Button>
          </div>
        </motion.div>

        {/* Calculadora */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border bg-card p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <Calculator className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-semibold">Calcule Sua Meta de Água</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-sm font-medium">Peso (kg) *</label>
              <Input
                placeholder="Ex: 70"
                value={form.peso}
                onChange={(e) => setForm((f) => ({ ...f, peso: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Altura (cm)</label>
              <Input
                placeholder="Ex: 170"
                value={form.altura}
                onChange={(e) => setForm((f) => ({ ...f, altura: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium">
                Taxa Metabólica Basal (kcal/dia)
              </label>
              <Input
                placeholder="Ex: 1800"
                value={form.basal}
                onChange={(e) => setForm((f) => ({ ...f, basal: e.target.value }))}
              />
              <div className="text-xs text-muted-foreground mt-1">
                Opcional: ajuda a personalizar sua meta
              </div>
            </div>
          </div>

          <Button className="mt-4 w-full" onClick={handleCalcGoal}>
            Calcular Meta Diária
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
