import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  TrendingUp,
  Droplets,
  Activity,
  HeartPulse,
  Ruler,
  Scale,
  Calendar,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { createPageUrl } from "@/utils";
import { supabase } from "@/lib/supabaseClient";
import { waterLogList } from "@/lib/waterApi";

function toISODateLocal(d = new Date()) {
  // yyyy-mm-dd no fuso local (evita problemas de UTC)
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function normalizeLogs(resp) {
  if (Array.isArray(resp)) return resp;
  if (resp && Array.isArray(resp.data)) return resp.data;
  if (resp && Array.isArray(resp.logs)) return resp.logs;
  return [];
}

export default function Progresso() {
  const [isLoading, setIsLoading] = useState(true);
  const [fatalError, setFatalError] = useState("");
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [waterLogs, setWaterLogs] = useState([]);

  const hoje = useMemo(() => toISODateLocal(new Date()), []);

  const metaLitros = useMemo(() => {
    // tenta achar alguma meta no profile; senão fallback 2.8
    const candidates = [
      profile?.meta_agua_litros,
      profile?.water_goal_liters,
      profile?.meta_diaria_agua_litros,
      profile?.meta_agua_ml ? Number(profile.meta_agua_ml) / 1000 : null,
      profile?.water_goal_ml ? Number(profile.water_goal_ml) / 1000 : null,
    ].filter((v) => v != null);

    const v = candidates.length ? Number(String(candidates[0]).replace(",", ".")) : 2.8;
    return Number.isFinite(v) && v > 0 ? v : 2.8;
  }, [profile]);

  const metaML = useMemo(() => Math.round(metaLitros * 1000), [metaLitros]);

  const consumoHojeML = useMemo(() => {
    const logs = Array.isArray(waterLogs) ? waterLogs : [];
    return logs
      .filter((l) => (l?.data || "").slice(0, 10) === hoje)
      .reduce((sum, l) => sum + (Number(l?.quantidade_ml) || 0), 0);
  }, [waterLogs, hoje]);

  const consumoHojeL = useMemo(() => consumoHojeML / 1000, [consumoHojeML]);

  const restanteHojeML = useMemo(() => Math.max(metaML - consumoHojeML, 0), [metaML, consumoHojeML]);

  const pctHoje = useMemo(() => {
    if (!metaML) return 0;
    const pct = (consumoHojeML / metaML) * 100;
    return Math.max(0, Math.min(100, pct));
  }, [consumoHojeML, metaML]);

  const week = useMemo(() => {
    const logs = Array.isArray(waterLogs) ? waterLogs : [];
    const arr = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const iso = toISODateLocal(d);

      const total = logs
        .filter((l) => (l?.data || "").slice(0, 10) === iso)
        .reduce((sum, l) => sum + (Number(l?.quantidade_ml) || 0), 0);

      const label = ["D", "S", "T", "Q", "Q", "S", "S"][d.getDay()] || "";
      arr.push({ iso, totalML: total, litros: (total / 1000).toFixed(1), label });
    }
    return arr;
  }, [waterLogs]);

  const maxWeekML = useMemo(() => {
    const max = Math.max(...week.map((d) => d.totalML), metaML);
    return max > 0 ? max : metaML || 2500;
  }, [week, metaML]);

  const pesoKg = useMemo(() => {
    const v =
      profile?.peso ??
      profile?.peso_kg ??
      profile?.weight ??
      profile?.weight_kg ??
      null;
    const n = v != null ? Number(String(v).replace(",", ".")) : null;
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [profile]);

  const alturaCm = useMemo(() => {
    const v =
      profile?.altura ??
      profile?.altura_cm ??
      profile?.height ??
      profile?.height_cm ??
      null;
    const n = v != null ? Number(String(v).replace(",", ".")) : null;
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [profile]);

  const imc = useMemo(() => {
    if (!pesoKg || !alturaCm) return null;
    const m = alturaCm / 100;
    const v = pesoKg / (m * m);
    return Number.isFinite(v) ? v : null;
  }, [pesoKg, alturaCm]);

  const displayName = useMemo(() => {
    const fromProfile =
      profile?.nome ||
      profile?.name ||
      profile?.full_name ||
      profile?.display_name ||
      null;

    const fromAuth =
      user?.user_metadata?.name ||
      user?.user_metadata?.full_name ||
      user?.email ||
      null;

    return fromProfile || fromAuth || "Usuário";
  }, [profile, user]);

  async function loadAll() {
    setIsLoading(true);
    setFatalError("");

    try {
      const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr) throw sessionErr;

      const session = sessionData?.session;
      const u = session?.user;

      if (!u) {
        window.location.href = createPageUrl("Login");
        return;
      }

      setUser(u);

      // Profile é "best effort" (não pode quebrar)
      try {
        const { data: p, error: pErr } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", u.id)
          .maybeSingle();

        if (!pErr) setProfile(p || null);
      } catch {
        // ignore
      }

      // Logs de água (fonte real do progresso)
      const resp = await waterLogList();
      setWaterLogs(normalizeLogs(resp));
    } catch (e) {
      console.error("Progresso fatal:", e);
      setFatalError(e?.message || String(e));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const statusHidratacao = useMemo(() => {
    if (pctHoje >= 100) return { icon: CheckCircle2, text: "Meta atingida hoje", tone: "text-green-700" };
    if (pctHoje >= 60) return { icon: Droplets, text: "Bom ritmo hoje", tone: "text-blue-700" };
    return { icon: AlertCircle, text: "Vamos melhorar hoje", tone: "text-amber-700" };
  }, [pctHoje]);

  const StatusIcon = statusHidratacao.icon;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto p-4 md:p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button
            variant="ghost"
            onClick={() => (window.location.href = createPageUrl("Dashboard"))}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">Progresso</h1>
            <p className="text-muted-foreground">Acompanhe sua evolução</p>
          </div>
        </div>

        {isLoading && (
          <div className="text-sm text-muted-foreground">Carregando progresso...</div>
        )}

        {!isLoading && fatalError && (
          <div className="rounded-2xl border p-5 bg-red-50">
            <div className="flex items-center gap-2 text-red-700 font-semibold">
              <AlertCircle className="w-5 h-5" />
              Erro ao carregar Progresso
            </div>
            <div className="text-sm text-red-700 mt-2 break-words">{fatalError}</div>
            <Button className="mt-4" onClick={loadAll}>
              Tentar novamente
            </Button>
          </div>
        )}

        {!isLoading && !fatalError && (
          <>
            {/* Boas-vindas + resumo */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border bg-card p-6 mb-6"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="w-5 h-5 text-indigo-600" />
                    <h2 className="text-lg font-semibold">Olá, {displayName}</h2>
                  </div>
                  <div className="text-sm text-muted-foreground flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Hoje ({hoje})
                  </div>
                </div>

                <div className={`flex items-center gap-2 text-sm ${statusHidratacao.tone}`}>
                  <StatusIcon className="w-4 h-4" />
                  {statusHidratacao.text}
                </div>
              </div>
            </motion.div>

            {/* Cards principais */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {/* Hidratação hoje */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border bg-card p-5"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Droplets className="w-5 h-5 text-blue-600" />
                    <div className="font-semibold">Hidratação</div>
                  </div>
                  <div className="text-xs text-muted-foreground">Hoje</div>
                </div>

                <div className="flex items-end justify-between mb-2">
                  <div>
                    <div className="text-3xl font-bold">{consumoHojeL.toFixed(1)}L</div>
                    <div className="text-sm text-muted-foreground">de {metaLitros.toFixed(1)}L</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-blue-600">
                      {(restanteHojeML / 1000).toFixed(1)}L
                    </div>
                    <div className="text-xs text-muted-foreground">faltam</div>
                  </div>
                </div>

                <div className="w-full bg-muted rounded-full h-3">
                  <div
                    className="h-3 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600"
                    style={{ width: `${pctHoje}%` }}
                  />
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  {Math.round(pctHoje)}% da meta diária
                </div>
              </motion.div>

              {/* IMC / medidas */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border bg-card p-5"
              >
                <div className="flex items-center gap-2 mb-3">
                  <Scale className="w-5 h-5 text-indigo-600" />
                  <div className="font-semibold">Medidas</div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <Scale className="w-4 h-4" /> Peso
                    </span>
                    <span className="font-semibold">
                      {pesoKg ? `${pesoKg.toFixed(1)} kg` : "Não cadastrado"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <Ruler className="w-4 h-4" /> Altura
                    </span>
                    <span className="font-semibold">
                      {alturaCm ? `${alturaCm.toFixed(0)} cm` : "Não cadastrado"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <Activity className="w-4 h-4" /> IMC
                    </span>
                    <span className="font-semibold">
                      {imc ? imc.toFixed(1) : "—"}
                    </span>
                  </div>
                </div>

                <Button
                  variant="outline"
                  className="mt-4 w-full"
                  onClick={() => (window.location.href = createPageUrl("Perfil"))}
                >
                  Atualizar dados
                </Button>
              </motion.div>

              {/* Saúde cardiometabólica (placeholder seguro) */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border bg-card p-5"
              >
                <div className="flex items-center gap-2 mb-3">
                  <HeartPulse className="w-5 h-5 text-rose-600" />
                  <div className="font-semibold">Saúde</div>
                </div>

                <div className="text-sm text-muted-foreground">
                  Aqui podemos mostrar pressão, colesterol e metas clínicas assim que confirmarmos
                  onde esses dados estão armazenados no Supabase.
                </div>

                <Button
                  className="mt-4 w-full"
                  onClick={() => (window.location.href = createPageUrl("Dashboard"))}
                >
                  Ver recomendações
                </Button>
              </motion.div>
            </div>

            {/* Últimos 7 dias - hidratação */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border bg-card p-6 mb-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Droplets className="w-5 h-5 text-blue-600" />
                  <div className="font-semibold">Últimos 7 dias</div>
                </div>
                <div className="text-xs text-muted-foreground">
                  Meta: {metaLitros.toFixed(1)}L/dia
                </div>
              </div>

              <div className="flex items-end justify-between gap-2 h-32">
                {week.map((d) => {
                  const h = (d.totalML / maxWeekML) * 100;
                  const isToday = d.iso === hoje;
                  return (
                    <div key={d.iso} className="flex-1 flex flex-col items-center gap-2">
                      <div className="w-full flex flex-col justify-end h-full">
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: `${h}%` }}
                          transition={{ duration: 0.35 }}
                          className={`w-full rounded-t-lg ${
                            isToday
                              ? "bg-gradient-to-t from-blue-500 to-indigo-600"
                              : "bg-blue-200"
                          }`}
                        />
                      </div>
                      <div className="text-center">
                        <div className="text-[10px] text-muted-foreground font-medium">
                          {d.label}
                        </div>
                        <div className="text-xs font-bold">{d.litros}L</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>

            {/* Próximos blocos (sem quebrar) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border bg-card p-6"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="w-5 h-5 text-emerald-600" />
                  <div className="font-semibold">Exercícios</div>
                </div>
                <div className="text-sm text-muted-foreground">
                  Vamos conectar aqui seus treinos e minutos ativos assim que ajustarmos a página de Exercícios
                  (está em branco hoje).
                </div>
                <Button
                  variant="outline"
                  className="mt-4 w-full"
                  onClick={() => (window.location.href = createPageUrl("Exercicios"))}
                >
                  Ir para Exercícios
                </Button>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border bg-card p-6"
              >
                <div className="flex items-center gap-2 mb-2">
                  <HeartPulse className="w-5 h-5 text-indigo-600" />
                  <div className="font-semibold">Nutrição</div>
                </div>
                <div className="text-sm text-muted-foreground">
                  Vamos resumir aqui calorias, macros e aderência ao plano quando o Nutricionista IA estiver
                  retornando respostas sem erro.
                </div>
                <Button
                  variant="outline"
                  className="mt-4 w-full"
                  onClick={() => (window.location.href = createPageUrl("Nutricionista"))}
                >
                  Ir para Nutricionista IA
                </Button>
              </motion.div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
