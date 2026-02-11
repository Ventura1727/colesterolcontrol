import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Droplets } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createPageUrl } from "@/utils";
import HydrationDashboard from "@/components/hydration/HydrationDashboard";
import { waterLogList } from "@/lib/waterApi";
import { supabase } from "@/lib/supabaseClient";

export default function Hidratacao() {
  const [isLoading, setIsLoading] = useState(true);
  const [waterLogs, setWaterLogs] = useState([]);
  const [metaDiaria, setMetaDiaria] = useState(2.8); // default (litros)

  // (Opcional) tenta puxar meta do profile se existir, senão mantém default
  async function loadMetaFromProfile() {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("meta_agua_litros, meta_agua_ml, water_goal_liters, water_goal_ml")
        .eq("id", user.id)
        .maybeSingle();

      const goal =
        profile?.meta_agua_litros ??
        (profile?.meta_agua_ml ? Number(profile.meta_agua_ml) / 1000 : null) ??
        profile?.water_goal_liters ??
        (profile?.water_goal_ml ? Number(profile.water_goal_ml) / 1000 : null);

      if (goal && Number.isFinite(Number(goal))) {
        setMetaDiaria(Number(goal));
      }
    } catch {
      // ignore
    }
  }

  async function loadLogs() {
    const resp = await waterLogList();

    // ✅ waterLogList às vezes pode devolver array ou {data:[]}
    const logsArr = Array.isArray(resp) ? resp : resp?.data || resp?.logs || [];
    setWaterLogs(Array.isArray(logsArr) ? logsArr : []);
  }

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      try {
        await loadMetaFromProfile();
        await loadLogs();
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const metaLitrosStr = useMemo(() => {
    const n = Number(metaDiaria || 0);
    return Number.isFinite(n) ? n.toFixed(1) : "2.8";
  }, [metaDiaria]);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto p-4 md:p-6">
        {/* Top bar */}
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

        {/* Card meta */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-6 text-white bg-gradient-to-r from-blue-600 to-indigo-500 mb-6"
        >
          <div className="flex items-center gap-3">
            <Droplets className="w-7 h-7" />
            <div>
              <div className="text-4xl font-bold">{metaLitrosStr}L</div>
              <div className="opacity-90">Meta diária de água recomendada</div>
              <div className="opacity-80 text-sm">
                Aproximadamente {Math.round((Number(metaLitrosStr) * 1000) / 250)} copos de 250ml
              </div>
            </div>
          </div>
        </motion.div>

        {/* ✅ Deixe o Dashboard ser o ÚNICO “Acompanhamento Diário”
            (evita duplicação e mantém layout limpo) */}
        <HydrationDashboard
          waterLogs={waterLogs}
          metaDiaria={metaDiaria}
          onLogsUpdated={setWaterLogs}
        />

        {/* Loading discreto (opcional) */}
        {isLoading && (
          <div className="mt-4 text-sm text-muted-foreground">Carregando...</div>
        )}
      </div>
    </div>
  );
}
