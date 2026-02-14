import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Heart, TrendingDown, TrendingUp, Plus, Target, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/lib/supabaseClient";

function toNum(v) {
  if (v == null) return null;
  const s = String(v).trim().replace(",", ".");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function fmt(n) {
  if (n == null || !Number.isFinite(Number(n))) return "—";
  return String(Math.round(Number(n)));
}

function isHighRisk({ ldl, total, triglicerides }) {
  const LDL = toNum(ldl);
  const TOT = toNum(total);
  const TG = toNum(triglicerides);
  return (LDL != null && LDL >= 190) || (TOT != null && TOT >= 240) || (TG != null && TG >= 500);
}

function parseISODateOnly(d) {
  // aceita "YYYY-MM-DD" e também outros formatos simples; retorna Date (00:00 local)
  if (!d) return null;
  const s = String(d).trim();
  // se vier com tempo, pega só a data
  const datePart = s.includes("T") ? s.split("T")[0] : s;
  const parts = datePart.split("-");
  if (parts.length !== 3) return null;
  const [y, m, day] = parts.map((x) => Number(x));
  if (!y || !m || !day) return null;
  return new Date(y, m - 1, day, 0, 0, 0, 0);
}

function daysBetween(startDate, endDate) {
  // diferença em dias inteiros (start -> end), ambos com hora 00:00
  const ms = endDate.getTime() - startDate.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

export default function ColesterolTracker({ records, onRecordAdded }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [form, setForm] = useState({
    ldl: "",
    hdl: "",
    total: "",
    triglicerides: "",
    data_exame: new Date().toISOString().split("T")[0],
  });

  const latestRecord = records?.[0] || null;
  const previousRecord = records?.[1] || null;

  const meta = useMemo(() => {
    const ldl = toNum(latestRecord?.ldl);
    if (!ldl) return null;
    if (ldl > 160) return { target: Math.max(ldl - 30, 0), desc: "Meta: reduzir ~30 pontos em 90 dias", urgency: "high" };
    if (ldl > 130) return { target: Math.max(ldl - 20, 0), desc: "Meta: reduzir ~20 pontos em 60 dias", urgency: "medium" };
    if (ldl > 100) return { target: Math.max(ldl - 10, 0), desc: "Meta: reduzir ~10 pontos em 45 dias", urgency: "low" };
    return { target: ldl, desc: "Meta: manter níveis saudáveis", urgency: "success" };
  }, [latestRecord]);

  const urgencyColors = {
    high: "text-red-700 bg-red-50 border-red-200",
    medium: "text-amber-800 bg-amber-50 border-amber-200",
    low: "text-emerald-800 bg-emerald-50 border-emerald-200",
    success: "text-green-800 bg-green-50 border-green-200",
  };

  const getChange = (current, previous) => {
    const c = toNum(current);
    const p = toNum(previous);
    if (c == null || p == null) return null;
    return c - p;
  };

  const deltaLDL = getChange(latestRecord?.ldl, previousRecord?.ldl);
  const deltaTotal = getChange(latestRecord?.total, previousRecord?.total);
  const deltaTG = getChange(latestRecord?.triglicerides, previousRecord?.triglicerides);

  const highRisk = isHighRisk({
    ldl: latestRecord?.ldl,
    total: latestRecord?.total,
    triglicerides: latestRecord?.triglicerides,
  });

  /**
   * ✅ Contador de 90 dias a partir da data do último exame (record_date)
   */
  const cycle = useMemo(() => {
    if (!latestRecord?.record_date) return null;

    const start = parseISODateOnly(latestRecord.record_date);
    if (!start) return null;

    const today = new Date();
    const today0 = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);

    const daysPassedRaw = daysBetween(start, today0);
    const daysPassed = Math.max(0, daysPassedRaw);
    const totalDays = 90;

    // Dia 1 no próprio dia do exame (se daysPassed = 0)
    const dayNumber = Math.min(totalDays, daysPassed + 1);

    const progress = Math.min(100, (daysPassed / totalDays) * 100);
    const remaining = Math.max(0, totalDays - daysPassed);

    const due = daysPassed >= totalDays; // bateu/ultrapassou 90
    return { startISO: latestRecord.record_date, dayNumber, daysPassed, totalDays, remaining, progress, due };
  }, [latestRecord?.record_date]);

  const handleSubmit = async () => {
    setErrorMsg("");

    const payload = {
      record_date: form.data_exame,
      ldl: toNum(form.ldl),
      hdl: toNum(form.hdl),
      total: toNum(form.total),
      triglicerides: toNum(form.triglicerides),
    };

    const hasAny =
      payload.ldl != null || payload.hdl != null || payload.total != null || payload.triglicerides != null;

    if (!payload.record_date) {
      setErrorMsg("Informe a data do exame.");
      return;
    }
    if (!hasAny) {
      setErrorMsg("Informe pelo menos um valor (LDL, HDL, Total ou Triglicerídeos).");
      return;
    }

    setIsLoading(true);
    try {
      const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr) throw sessionErr;

      const token = sessionData?.session?.access_token;
      if (!token) throw new Error("Sessão inválida. Faça login novamente.");

      const res = await fetch("/api/colesterol-record", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`Falha ao salvar exame (HTTP ${res.status}). ${txt}`);
      }

      setIsOpen(false);
      onRecordAdded?.();
      setForm({
        ldl: "",
        hdl: "",
        total: "",
        triglicerides: "",
        data_exame: new Date().toISOString().split("T")[0],
      });
    } catch (err) {
      console.error("Erro ao salvar exame:", err);
      setErrorMsg(err?.message || "Erro ao salvar exame.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm mb-6"
    >
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-gray-900 flex items-center gap-2">
          <Heart className="w-5 h-5 text-red-600" />
          Exame de Colesterol
        </h2>

        <Button
          onClick={() => setIsOpen(true)}
          className="bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white rounded-xl"
          size="sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          Registrar exame
        </Button>
      </div>

      <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
        {latestRecord ? (
          <>
            <div className="text-xs text-gray-500 mb-2">
              Último exame:{" "}
              <span className="font-medium text-gray-800">{latestRecord?.record_date || "—"}</span>
            </div>

            {/* ✅ Progresso 90 dias */}
            {cycle && (
              <div className="mb-3">
                <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                  <span>Acompanhamento (90 dias)</span>
                  <span>
                    Dia <span className="font-semibold text-gray-800">{cycle.dayNumber}</span> / {cycle.totalDays}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-red-500 h-3 rounded-full transition-all"
                    style={{ width: `${cycle.progress}%` }}
                  />
                </div>

                {cycle.due ? (
                  <div className="mt-2 p-3 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 text-sm">
                    <div className="font-semibold">Hora de repetir o exame</div>
                    <div className="text-xs mt-1">
                      Já se passaram 90 dias desde o último registro. Registre um novo exame para comparar a evolução.
                    </div>
                    <div className="mt-2">
                      <Button
                        onClick={() => setIsOpen(true)}
                        className="bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white rounded-xl"
                        size="sm"
                      >
                        Registrar exame de acompanhamento
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-gray-500 mt-2">
                    Faltam <span className="font-semibold">{cycle.remaining}</span> dia(s) para o próximo check recomendado.
                  </div>
                )}
              </div>
            )}

            {highRisk && (
              <div className="mb-3 flex items-start gap-2 p-3 rounded-xl border border-red-200 bg-red-50 text-red-700">
                <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <div className="font-semibold">Atenção</div>
                  <div>
                    Alguns valores parecem altos para segurança. Recomendamos procurar um médico para avaliação e orientação.
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-white rounded-xl p-3 border border-gray-100">
                <div className="text-gray-500 text-xs mb-1">LDL</div>
                <div className="font-bold text-gray-900 flex items-center gap-2">
                  {fmt(latestRecord.ldl)}
                  {deltaLDL != null && (
                    <span className={`text-xs flex items-center gap-1 ${deltaLDL <= 0 ? "text-emerald-600" : "text-red-600"}`}>
                      {deltaLDL <= 0 ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
                      {deltaLDL > 0 ? `+${fmt(deltaLDL)}` : fmt(deltaLDL)}
                    </span>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-xl p-3 border border-gray-100">
                <div className="text-gray-500 text-xs mb-1">HDL</div>
                <div className="font-bold text-gray-900">{fmt(latestRecord.hdl)}</div>
              </div>

              <div className="bg-white rounded-xl p-3 border border-gray-100">
                <div className="text-gray-500 text-xs mb-1">Total</div>
                <div className="font-bold text-gray-900 flex items-center gap-2">
                  {fmt(latestRecord.total)}
                  {deltaTotal != null && (
                    <span className={`text-xs flex items-center gap-1 ${deltaTotal <= 0 ? "text-emerald-600" : "text-red-600"}`}>
                      {deltaTotal <= 0 ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
                      {deltaTotal > 0 ? `+${fmt(deltaTotal)}` : fmt(deltaTotal)}
                    </span>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-xl p-3 border border-gray-100">
                <div className="text-gray-500 text-xs mb-1">Triglicerídeos</div>
                <div className="font-bold text-gray-900 flex items-center gap-2">
                  {fmt(latestRecord.triglicerides)}
                  {deltaTG != null && (
                    <span className={`text-xs flex items-center gap-1 ${deltaTG <= 0 ? "text-emerald-600" : "text-red-600"}`}>
                      {deltaTG <= 0 ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
                      {deltaTG > 0 ? `+${fmt(deltaTG)}` : fmt(deltaTG)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {meta && (
              <div className={`mt-3 rounded-xl border p-3 flex items-start gap-2 ${urgencyColors[meta.urgency]}`}>
                <Target className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <div className="font-semibold">Meta sugerida</div>
                  <div>{meta.desc}</div>
                  <div className="text-xs mt-1 opacity-80">Alvo LDL: {fmt(meta.target)}</div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-sm text-gray-700">
            Você ainda não registrou um exame.
            <div className="text-xs text-gray-500 mt-1">
              Realize o exame e inclua os resultados aqui para o app acompanhar sua evolução ao longo de 90 dias.
            </div>
          </div>
        )}
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Registrar exame de colesterol</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <div className="text-xs text-gray-500 mb-1">Data do exame</div>
              <Input
                type="date"
                value={form.data_exame}
                onChange={(e) => setForm((s) => ({ ...s, data_exame: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-gray-500 mb-1">Colesterol Total</div>
                <Input
                  inputMode="decimal"
                  placeholder="ex: 210"
                  value={form.total}
                  onChange={(e) => setForm((s) => ({ ...s, total: e.target.value }))}
                />
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">LDL</div>
                <Input
                  inputMode="decimal"
                  placeholder="ex: 140"
                  value={form.ldl}
                  onChange={(e) => setForm((s) => ({ ...s, ldl: e.target.value }))}
                />
              </div>

              <div>
                <div className="text-xs text-gray-500 mb-1">HDL</div>
                <Input
                  inputMode="decimal"
                  placeholder="ex: 45"
                  value={form.hdl}
                  onChange={(e) => setForm((s) => ({ ...s, hdl: e.target.value }))}
                />
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Triglicerídeos</div>
                <Input
                  inputMode="decimal"
                  placeholder="ex: 150"
                  value={form.triglicerides}
                  onChange={(e) => setForm((s) => ({ ...s, triglicerides: e.target.value }))}
                />
              </div>
            </div>

            {errorMsg && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-3">
                {errorMsg}
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button onClick={() => setIsOpen(false)} variant="ghost" className="flex-1" disabled={isLoading}>
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit}
                className="flex-1 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white"
                disabled={isLoading}
              >
                {isLoading ? "Salvando..." : "Salvar exame"}
              </Button>
            </div>

            <div className="text-xs text-gray-500">
              *O app não substitui orientação médica. Em caso de valores muito altos, busque avaliação profissional.
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
