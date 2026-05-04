import React, { useEffect, useMemo, useState } from "react";
import {
  Heart, Crown, Lock, Salad, Dumbbell, Droplets, BookOpen,
  TrendingDown, Target, Zap, Bot, LogOut, Flame, Trophy
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { createPageUrl } from "@/utils";
import RankCard from "@/components/dashboard/RankCard";
import ColesterolTracker from "@/components/dashboard/ColesterolTracker";
import { supabase } from "@/lib/supabaseClient";

// ── Features do Dashboard ──
const dashboardFeatures = [
  { id: "diet", title: "Alimentação", desc: "Controle o que você come", icon: Salad, page: "Alimentacao", premium: false },
  { id: "exercise", title: "Exercícios", desc: "Treinos e atividades", icon: Dumbbell, page: "Exercicios", premium: false },
  { id: "water", title: "Hidratação", desc: "Beba mais água", icon: Droplets, page: "Hidratacao", premium: false },
  { id: "ai", title: "Insights IA", desc: "Análise inteligente", icon: Bot, page: "IAInsights", premium: true },
  { id: "guide", title: "Guia Saúde", desc: "Dicas de colesterol", icon: BookOpen, page: "Guia", premium: false },
];

function isPremiumByUntil(premiumUntil) {
  if (!premiumUntil) return false;
  const d = new Date(premiumUntil);
  return Number.isFinite(d.getTime()) && d > new Date();
}

function getToday() {
  return new Date().toISOString().split("T")[0];
}

export default function Dashboard() {
  const [profile, setProfile] = useState(null);
  const [access, setAccess] = useState({ sub_is_premium: false });
  const [colesterolRecords, setColesterolRecords] = useState([]);
  const [historicoAgua, setHistoricoAgua] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showLockedModal, setShowLockedModal] = useState(false);

  // ── Dados de exercícios para exibir no dashboard ──
  const [exerciseProgress, setExerciseProgress] = useState({
    completed: 0,
    total: 0,
    kcal: 0,
  });

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        setIsLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          window.location.href = createPageUrl("Login");
          return;
        }

        const uid = session.user.id;

        const [subRes, profRes] = await Promise.all([
          supabase.from("subscriptions").select("*").eq("user_id", uid).maybeSingle(),
          supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
        ]);

        if (!mounted) return;

        const profileData = profRes.data || {};
        setProfile(profileData);

        setAccess({
          sub_is_premium: subRes.data?.is_premium || profileData?.is_premium || false,
          premium_until: subRes.data?.premium_until || profileData?.premium_until || null,
          role: profileData?.role || null,
        });

        // ── Calcular progresso de exercícios do dia ──
        const hoje = getToday();
        const completedToday = (profileData.completed_exercises_date === hoje)
          ? (profileData.completed_exercises_today || [])
          : [];

        // Estimar total de exercícios (3 sugestões padrão + customizados)
        const customCount = (profileData.custom_exercises || []).length;
        const defaultCount = 4; // Quantidade padrão de exercícios sugeridos
        setExerciseProgress({
          completed: completedToday.length,
          total: defaultCount + customCount,
          kcal: completedToday.length * 150, // Estimativa média
        });

        // ── Colesterol ──
        const { data: recs } = await supabase
          .from("cholesterol_records")
          .select("*")
          .eq("user_id", uid)
          .order("record_date", { ascending: false })
          .limit(10);
        setColesterolRecords(recs || []);

        // ── Hidratação ──
        try {
          const res = await fetch("/api/water-log", {
            headers: { Authorization: `Bearer ${session.access_token}` },
          });
          const waterData = await res.json();
          setHistoricoAgua(Array.isArray(waterData) ? waterData : (waterData?.data || []));
        } catch (err) {
          console.warn("Erro ao carregar hidratação:", err);
          setHistoricoAgua([]);
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  const isPremium = useMemo(
    () => access?.role === "admin" || access?.sub_is_premium || isPremiumByUntil(access?.premium_until),
    [access]
  );

  const waterData = useMemo(() => {
    const hoje = getToday();
    const consumo = (historicoAgua || [])
      .filter((i) => i.data === hoje)
      .reduce((acc, i) => acc + (i.quantidade_ml || 0), 0);
    const meta = (profile?.meta_agua_litros || 2) * 1000;
    return {
      consumo,
      meta,
      pct: Math.min((consumo / Math.max(meta, 1)) * 100, 100),
    };
  }, [historicoAgua, profile]);

  const exercisePct = exerciseProgress.total > 0
    ? Math.round((exerciseProgress.completed / exerciseProgress.total) * 100)
    : 0;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-white">
        <div className="text-center">
          <Heart className="w-10 h-10 text-red-400 animate-pulse mx-auto mb-3" />
          <p className="text-slate-500">Carregando seu painel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-8">
      {/* Header */}
      <div className="bg-white border-b border-slate-100">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-400 to-pink-500 flex items-center justify-center">
                <Heart className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-800">HeartBalance</h1>
                <p className="text-xs text-slate-400">
                  {isPremium ? "✨ Premium" : "Free"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="bg-amber-50 text-amber-700 border-amber-200 gap-1">
                <Zap className="w-3 h-3" />
                {profile?.xp_total || 0} XP
              </Badge>
              <button
                onClick={() => supabase.auth.signOut().then(() => (window.location.href = "/"))}
                className="text-[10px] font-bold text-slate-400 uppercase hover:text-red-500 transition-colors"
              >
                Sair
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 mt-4 space-y-4">
        {/* Rank Card (Premium) */}
        {isPremium && profile && (
          <RankCard
            profile={profile}
            onClick={() => (window.location.href = createPageUrl("Progresso"))}
          />
        )}

        {/* Colesterol Tracker (Premium) */}
        {isPremium && (
          <ColesterolTracker
            records={colesterolRecords}
            onRefresh={() => window.location.reload()}
          />
        )}

        {/* ── Card de Exercícios - NOVO ── */}
        <div
          onClick={() => (window.location.href = createPageUrl("Exercicios"))}
          className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm cursor-pointer hover:shadow-md transition-all active:scale-[0.98]"
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Dumbbell className="w-4 h-4 text-blue-500" /> Exercícios
            </p>
            <span className="text-xs text-slate-400">Hoje</span>
          </div>
          <Progress value={exercisePct} className="h-2 rounded-full mb-2" />
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">
              {exerciseProgress.completed}/{exerciseProgress.total} completos
            </span>
            {exercisePct >= 100 && (
              <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                <Trophy className="w-3 h-3" /> Completo!
              </span>
            )}
          </div>
        </div>

        {/* Card de Hidratação */}
        <div
          onClick={() => (window.location.href = createPageUrl("Hidratacao"))}
          className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm cursor-pointer hover:shadow-md transition-all active:scale-[0.98]"
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Droplets className="w-4 h-4 text-blue-400" /> Hidratação
            </p>
            <span className="text-xs text-slate-400">Hoje</span>
          </div>
          <Progress value={waterData.pct} className="h-2 rounded-full mb-2" />
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-blue-600">
              {(waterData.consumo / 1000).toFixed(1)}L
            </span>
            <span className="text-xs text-slate-400">
              meta: {(waterData.meta / 1000).toFixed(1)}L
            </span>
          </div>
        </div>

        {/* Grid de Features */}
        <div className="grid grid-cols-2 gap-3">
          {dashboardFeatures.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.id}
                onClick={() =>
                  f.premium && !isPremium
                    ? setShowLockedModal(true)
                    : (window.location.href = createPageUrl(f.page))
                }
                className="bg-white rounded-2xl p-5 border border-slate-50 text-left shadow-sm hover:shadow-md transition-all active:scale-95 cursor-pointer relative"
              >
                {f.premium && !isPremium && (
                  <Lock className="w-3 h-3 text-slate-300 absolute top-3 right-3" />
                )}
                <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center mb-2">
                  <Icon className="w-5 h-5 text-slate-600" />
                </div>
                <p className="text-sm font-semibold text-slate-700">{f.title}</p>
                <p className="text-xs text-slate-400 mt-0.5">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal de conteúdo bloqueado */}
      {showLockedModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center">
            <Crown className="w-10 h-10 text-amber-500 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-800 mb-2">Conteúdo Premium</h3>
            <p className="text-sm text-slate-500 mb-4">
              Faça upgrade para acessar Insights IA e recursos avançados.
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowLockedModal(false)}
              >
                Voltar
              </Button>
              <Button
                className="flex-1 bg-amber-500 hover:bg-amber-600"
                onClick={() => (window.location.href = createPageUrl("Premium"))}
              >
                Ver Planos
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
