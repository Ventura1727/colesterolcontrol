import React, { useMemo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Droplets, Calculator, Info, Heart, Zap, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createPageUrl } from "@/utils";
import HydrationDashboard from "@/components/hydration/HydrationDashboard";
import { supabase } from "@/lib/supabaseClient";

/**
 * Fallback local (se API falhar):
 * - Guarda logs por dia, por usuário
 */
function todayISODate() {
  return new Date().toISOString().slice(0, 10);
}

function localKey(userId) {
  return `hb_water_logs_${userId}`;
}

function readLocalLogs(userId) {
  try {
    const raw = localStorage.getItem(localKey(userId));
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function writeLocalLogs(userId, logs) {
  try {
    localStorage.setItem(localKey(userId), JSON.stringify(Array.isArray(logs) ? logs : []));
  } catch {
    // ignore
  }
}

export default function Hidratacao() {
  const [profile, setProfile] = useState(null);
  const [userId, setUserId] = useState(null);

  const [isLoading, setIsLoading] = useState(true);
  const [form, setForm] = useState({ peso: "", altura: "", basal: "" });
  const [waterNeeded, setWaterNeeded] = useState(null); // string "3.1"
  const [waterLogs, setWaterLogs] = useState([]); // [{quantidade_ml, data, hora}]

  const day = useMemo(() => todayISODate(), []);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const calculateWater = (peso, basal) => {
    if (!peso) return;

    let waterInMl = Number(peso) * 35;

    if (basal) {
      const basalNum = Number(basal);
      if (basalNum > 2000) waterInMl += 500;
      else if (basalNum > 1500) waterInMl += 300;
    }

    const waterInLiters = (waterInMl / 1000).toFixed(1);
    setWaterNeeded(waterInLiters);
  };

  const safeJson = async (res) => {
    try {
      return await res.json();
    } catch {
      return null;
    }
  };

  const fetchWaterLogsFromApi = async (token) => {
    try {
      const res = await fetch("/api/water-log", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) return null;

      const data = await safeJson(res);
      if (!Array.isArray(data)) return [];
      return data;
    } catch {
      return null;
    }
  };

  const loadData = async () => {
    setIsLoading(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;

      if (!user) {
        window.location.href = `/login?next=${encodeURIComponent("/hidratacao")}`;
        return;
      }

      setUserId(user.id);

      // 1) Perfil — fonte de verdade: user_profiles.id = user.id
      let prof = null;
      try {
        const { data, error } = await supabase.from("user_profiles").select("*").eq("id", user.id).single();
        if (!error) prof = data;
      } catch {
        prof = null;
      }

      // Se não existir perfil ainda, cria mínimo (não quebra)
      if (!prof) {
        const payload = {
          id: user.id,
          plano_ativo: true,
          peso_hidratacao: null,
          altura_hidratacao: null,
          basal_hidratacao: null,
        };

        try {
          const { data: created } = await supabase.from("user_profiles").insert(payload).select("*").single();
          prof = created || payload;
        } catch {
          prof = payload;
        }
      }

      setProfile(prof);

      // Preenche form + calcula meta se já tiver peso
      if (prof?.peso_hidratacao) {
        setForm({
          peso: String(prof.peso_hidratacao ?? ""),
          altura: String(prof.altura_hidratacao ?? ""),
          basal: String(prof.basal_hidratacao ?? ""),
        });
        calculateWater(prof.peso_hidratacao, prof.basal_hidratacao);
      }

      // 2) Logs de água — tenta API; se falhar, usa localStorage
      const session = await supabase.auth.getSession();
      const token = session?.data?.session?.access_token;

      let logs = null;
      if (token) logs = await fetchWaterLogsFromApi(token);

      if (logs === null) {
        // fallback local
        const local = readLocalLogs(user.id);
        setWaterLogs(local);
      } else {
        setWaterLogs(logs);
        // mantém backup local para UX offline/robustez
        writeLocalLogs(user.id, logs);
      }
    } catch (err) {
      console.error("Erro ao carregar dados:", err);

      // fallback: se já sabemos userId, tenta local
      if (userId) setWaterLogs(readLocalLogs(userId));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCalculate = async () => {
    const peso = Number(form.peso);
    const basal = form.basal ? Number(form.basal) : null;

    if (!peso || peso <= 0) {
      alert("Por favor, insira um peso válido");
      return;
    }

    calculateWater(peso, basal);

    // garante profile carregado e usa id do auth
    if (!profile?.id) return;

    try {
      const { error } = await supabase
        .from("user_profiles")
        .update({
          peso_hidratacao: peso,
          altura_hidratacao: form.altura ? Number(form.altura) : null,
          basal_hidratacao: basal,
        })
        .eq("id", profile.id);

      if (error) console.error("Erro ao atualizar perfil:", error);

      // atualiza estado local também
      setProfile((p) => ({
        ...(p || {}),
        peso_hidratacao: peso,
        altura_hidratacao: form.altura ? Number(form.altura) : null,
        basal_hidratacao: basal,
      }));
    } catch (e) {
      console.error("Erro ao atualizar perfil:", e);
    }
  };

  const registrarAgua = async (quantidade_ml) => {
    // 1) atualização otimista (progresso sobe na hora)
    const agora = new Date();
    const data = day;
    const hora = agora.toTimeString().split(" ")[0];

    const optimistic = {
      quantidade_ml,
      data,
      hora,
    };

    setWaterLogs((prev) => {
      const next = [optimistic, ...(Array.isArray(prev) ? prev : [])];
      if (userId) writeLocalLogs(userId, next);
      return next;
    });

    // 2) tenta persistir via API
    try {
      const session = await supabase.auth.getSession();
      const token = session?.data?.session?.access_token;

      if (!token) throw new Error("Sem token");

      // Preferência: usar o mesmo endpoint /api/water-log para POST (mais consistente).
      // Se o seu backend só tiver /api/water-log-post, mantemos fallback abaixo.
      let ok = false;

      // Tentativa A: POST /api/water-log
      try {
        const resA = await fetch("/api/water-log", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ quantidade_ml, data, hora }),
        });
        ok = resA.ok;
      } catch {
        ok = false;
      }

      // Tentativa B: POST /api/water-log-post (compatibilidade)
      if (!ok) {
        const resB = await fetch("/api/water-log-post", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ quantidade_ml, data, hora }),
        });
        ok = resB.ok;
      }

      if (!ok) {
        // mantém otimista/local; não derruba a UX
        console.warn("Falha ao persistir water log na API (mantendo local).");
        return;
      }

      // 3) re-sincroniza do servidor (se disponível)
      const serverLogs = await fetchWaterLogsFromApi(token);
      if (serverLogs !== null) {
        setWaterLogs(serverLogs);
        if (userId) writeLocalLogs(userId, serverLogs);
      }
    } catch (err) {
      console.error("Erro ao registrar água:", err);
      // mantém o log otimista no localStorage para não “sumir”
      // (opcional) você pode mostrar toast aqui
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-rose-50 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-8 h-8 border-3 border-red-600 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-rose-50">
      <div className="max-w-lg mx-auto px-4 pt-6 pb-24">
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

        {/* Calculadora */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl p-6 mb-6 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Calculator className="w-5 h-5 text-blue-600" />
            <h2 className="font-semibold text-gray-900">Calcule Sua Meta de Água</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Peso (kg) *</label>
              <Input type="number" placeholder="Ex: 70" value={form.peso} onChange={(e) => setForm({ ...form, peso: e.target.value })} className="w-full" />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Altura (cm)</label>
              <Input type="number" placeholder="Ex: 170" value={form.altura} onChange={(e) => setForm({ ...form, altura: e.target.value })} className="w-full" />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Taxa Metabólica Basal (kcal/dia)</label>
              <Input type="number" placeholder="Ex: 1800" value={form.basal} onChange={(e) => setForm({ ...form, basal: e.target.value })} className="w-full" />
              <p className="text-xs text-gray-500 mt-1">Opcional: ajuda a personalizar sua meta</p>
            </div>

            <Button onClick={handleCalculate} className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white py-5 rounded-xl">
              <Calculator className="w-5 h-5 mr-2" />
              Calcular Meta Diária
            </Button>
          </div>
        </motion.div>

        {/* Resultado */}
        {waterNeeded && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-6 mb-6 text-white text-center">
            <Droplets className="w-12 h-12 mx-auto mb-3 opacity-90" />
            <div className="text-5xl font-bold mb-2">{waterNeeded}L</div>
            <p className="text-blue-100">Meta diária de água recomendada</p>
            <p className="text-sm text-blue-100 mt-2">Aproximadamente {Math.ceil(Number(waterNeeded) / 0.25)} copos de 250ml</p>
          </motion.div>
        )}

        {/* Dashboard de Hidratação */}
        {waterNeeded && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white rounded-2xl p-6 mb-6 border border-gray-100 shadow-sm">
            <HydrationDashboard waterLogs={waterLogs} metaDiaria={waterNeeded} onLogAdded={registrarAgua} />
          </motion.div>
        )}

        {/* Por que Hidratação é Importante */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white rounded-2xl p-6 mb-6 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Info className="w-5 h-5 text-red-600" />
            <h2 className="font-semibold text-gray-900">Por Que Hidratação é Crucial?</h2>
          </div>

          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                <Heart className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900 mb-1">Saúde Cardiovascular</h3>
                <p className="text-sm text-gray-600">A água ajuda o sangue a circular melhor, reduzindo a carga no coração e mantendo a pressão arterial equilibrada.</p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                <Zap className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900 mb-1">Controle do Apetite</h3>
                <p className="text-sm text-gray-600">Beber água regularmente ajuda a saciar e reduz a sensação de fome, evitando excessos alimentares.</p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                <Droplets className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900 mb-1">Metabolismo Ativo</h3>
                <p className="text-sm text-gray-600">Estar bem hidratado melhora o metabolismo e facilita a eliminação de toxinas do organismo.</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Sinais de Desidratação */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-amber-50 rounded-2xl p-6 mb-6 border border-amber-200">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="w-5 h-5 text-amber-600" />
            <h2 className="font-semibold text-amber-900">Sinais de Desidratação</h2>
          </div>

          <ul className="space-y-2 text-sm text-amber-800">
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
              Sede excessiva e boca seca
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
              Urina escura e com odor forte
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
              Cansaço e dores de cabeça
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
              Pele seca e tontura
            </li>
          </ul>
        </motion.div>

        {/* Dicas Práticas */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <h2 className="font-semibold text-gray-900">Dicas para Manter-se Hidratado</h2>
          </div>

          <div className="space-y-3 text-sm text-gray-700">
            <div className="flex gap-2">
              <span className="text-green-600 font-bold">1.</span>
              <p>Comece o dia com um copo de água em jejum</p>
            </div>
            <div className="flex gap-2">
              <span className="text-green-600 font-bold">2.</span>
              <p>Tenha sempre uma garrafa de água por perto</p>
            </div>
            <div className="flex gap-2">
              <span className="text-green-600 font-bold">3.</span>
              <p>Beba água antes, durante e depois das refeições</p>
            </div>
            <div className="flex gap-2">
              <span className="text-green-600 font-bold">4.</span>
              <p>Configure lembretes no celular a cada 2 horas</p>
            </div>
            <div className="flex gap-2">
              <span className="text-green-600 font-bold">5.</span>
              <p>Chás e água de coco também contam para hidratação</p>
            </div>
            <div className="flex gap-2">
              <span className="text-green-600 font-bold">6.</span>
              <p>Aumente a ingestão em dias quentes ou ao praticar exercícios</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
