// src/pages/Dashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Heart,
  Crown,
  Lock,
  Salad,
  Dumbbell,
  Droplets,
  BookOpen,
  TrendingDown,
  Target,
  Zap,
  Bot,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { createPageUrl } from "@/utils";
import RankCard from "@/components/dashboard/RankCard";
import ColesterolTracker from "@/components/dashboard/ColesterolTracker";
import { supabase } from "@/lib/supabaseClient";

const features = [
  { id: "nutricionista", title: "Nutricionista IA", desc: "Planos e análise de pratos", icon: Bot, premium: true, page: "Nutricionista" },
  { id: "exercicios", title: "Exercícios", desc: "Treinos que liberam XP", icon: Dumbbell, premium: true, page: "Exercicios" },
  { id: "alimentacao", title: "Receitas", desc: "Pratos anti-colesterol", icon: Salad, premium: true, page: "Alimentacao" },
  { id: "progresso", title: "Meu Progresso", desc: "Acompanhe sua evolução", icon: TrendingDown, premium: true, page: "Progresso" },
  { id: "hidratacao", title: "Hidratação", desc: "Calcule sua meta diária", icon: Droplets, premium: true, page: "Hidratacao" },
  { id: "educacao", title: "Conteúdo", desc: "Artigos sobre saúde", icon: BookOpen, premium: false, page: "Conteudo" },
];

export default function Dashboard() {
  const [profile, setProfile] = useState(null);
  const [access, setAccess] = useState({
    role: null,
    plano_ativo: false,
    premium_until: null,
    is_premium: null,
  });
  const [colesterolRecords, setColesterolRecords] = useState([]);
  const [historicoAgua, setHistoricoAgua] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showLockedModal, setShowLockedModal] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setIsLoading(true);

        const { data: sessionData } = await supabase.auth.getSession();
        const session = sessionData?.session;

        if (!session?.user) {
          window.location.href = `/login?next=${encodeURIComponent("/dashboard")}`;
          return;
        }

        const userId = session.user.id;

        // A) Premium + Perfil base em profiles
        let role = null;
        let plano_ativo = false;
        let premium_until = null;
        let is_premium = null;

        const { data: prof, error: profErr } = await supabase
          .from("profiles")
          .select(
            "role, plano_ativo, premium_until, is_premium, idade, alimentacao_objetivo, exercicios_objetivo, xp_total, rank, dias_consecutivos, metas_concluidas, meta_agua_litros"
          )
          .eq("id", userId)
          .maybeSingle();

        let profData = prof;

        if (!profErr && profData) {
          role = profData?.role ?? null;
          plano_ativo = Boolean(profData?.plano_ativo);
          premium_until = profData?.premium_until ?? null;
          is_premium = profData?.is_premium ?? null;
        } else if (!profErr && !profData) {
          const { data: created } = await supabase
            .from("profiles")
            .upsert({ id: userId }, { onConflict: "id" })
            .select(
              "role, plano_ativo, premium_until, is_premium, idade, alimentacao_objetivo, exercicios_objetivo, xp_total, rank, dias_consecutivos, metas_concluidas, meta_agua_litros"
            )
            .single();

          profData = created;

          role = created?.role ?? null;
          plano_ativo = Boolean(created?.plano_ativo);
          premium_until = created?.premium_until ?? null;
          is_premium = created?.is_premium ?? null;
        } else {
          role = null;
          plano_ativo = false;
        }

        // B) Dados extras (se existirem) em user_profiles
        let richProfile = null;

        try {
          const { data: up, error: upErr } = await supabase
            .from("user_profiles")
            .select("*")
            .eq("id", userId)
            .maybeSingle();

          if (!upErr && up) richProfile = up;
        } catch {
          richProfile = null;
        }

        // Monta um profile final: prioriza profiles, mas mantém extras de user_profiles
        const finalProfile = {
          ...(richProfile || {}),
          ...(profData || {}),
        };

        if (!mounted) return;

        setAccess({ role, plano_ativo, premium_until, is_premium });
        setProfile(finalProfile);

        // C) Colesterol (tabela correta: cholesterol_records)
        try {
          const { data: recs } = await supabase
            .from("cholesterol_records")
            .select("*")
            .eq("user_id", userId)
            .order("record_date", { ascending: false })
            .order("id", { ascending: false })
            .limit(10);

          setColesterolRecords(Array.isArray(recs) ? recs : []);
        } catch {
          setColesterolRecords([]);
        }

       // D) Water logs via API
try {
  const token = session?.access_token;
  const res = await fetch("/api/water-log", {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    setHistoricoAgua([]);
  } else {
    const json = await res.json().catch(() => ({}));
    const items = Array.isArray(json) ? json : (json?.data || []);
    setHistoricoAgua(Array.isArray(items) ? items : []);
  }
} catch {
  setHistoricoAgua([]);
}
        } catch {
          setHistoricoAgua([]);
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, []);

  const isPremium = useMemo(() => {
    const premiumUntilOk = access?.premium_until
      ? new Date(access.premium_until) > new Date()
      : false;

    return (
      access?.role === "admin" ||
      access?.plano_ativo === true ||
      access?.is_premium === true ||
      premiumUntilOk
    );
  }, [access]);

  const handleFeatureClick = (feature) => {
    if (feature.premium && !isPremium) {
      setShowLockedModal(true);
    } else if (feature.page) {
      window.location.href = createPageUrl(feature.page);
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

  const hoje = new Date().toISOString().split("T")[0];
  const consumoHoje = (historicoAgua || [])
    .filter((item) => item?.data === hoje)
    .reduce((total, item) => total + (item?.quantidade_ml || 0), 0);

  const metaLitros = Number(profile?.meta_agua_litros || 2.0);
  const metaDiaria = Math.round(metaLitros * 1000);
  const progresso = Math.min((consumoHoje / Math.max(metaDiaria, 1)) * 100, 100);

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-rose-50 p-4 pb-24">
      <div className="max-w-lg mx-auto pt-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-rose-600 rounded-xl flex items-center justify-center shadow-lg shadow-red-200">
              <Heart className="w-6 h-6 text-white" fill="white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">HeartBalance</h1>
              <p className="text-sm text-gray-500">
                {isPremium ? (
                  <span className="flex items-center gap-1 text-amber-600">
                    <Crown className="w-4 h-4" />
                    Premium Ativo
                  </span>
                ) : (
                  "Plano Gratuito"
                )}
              </p>
            </div>
          </div>

          {isPremium && (
            <div className="flex items-center gap-1 bg-yellow-100 text-yellow-700 px-3 py-1.5 rounded-full text-sm font-medium">
              <Zap className="w-4 h-4" />
              {profile?.xp_total || 0} XP
            </div>
          )}
        </div>

        {isPremium && (
          <RankCard
            profile={profile}
            onViewProgress={() => (window.location.href = createPageUrl("Progresso"))}
          />
        )}

        {/* ✅ Colesterol Tracker */}
        {isPremium && (
          <ColesterolTracker
            records={colesterolRecords}
            onRecordAdded={() => {
              setTimeout(() => window.location.reload(), 200);
            }}
          />
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-5 mb-6 border border-gray-100 shadow-sm"
        >
          <h2 className="font-semibold text-gray-900 flex items-center gap-2 mb-3">
            <Droplets className="w-5 h-5 text-blue-600" />
            Hidratação de Hoje
          </h2>
          <div className="w-full bg-gray-200 rounded-full h-4 mb-2">
            <div
              className="bg-blue-500 h-4 rounded-full"
              style={{ width: `${progresso}%` }}
            />
          </div>
          <p className="text-sm text-gray-700">
            {consumoHoje}ml / {metaDiaria}ml
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-5 mb-6 border border-gray-100 shadow-sm"
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Target className="w-5 h-5 text-emerald-600" />
              Seu Perfil
            </h2>
            <span className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded-full">
              {profile?.alimentacao_objetivo || "—"}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-gray-500 text-xs">Idade</div>
              <div className="font-medium">
                {profile?.idade ? `${profile.idade} anos` : "—"}
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-gray-500 text-xs">Alimentação</div>
              <div className="font-medium">
                {profile?.alimentacao_objetivo || "—"}
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-gray-500 text-xs">Exercícios</div>
              <div className="font-medium">
                {profile?.exercicios_objetivo || "—"}
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-gray-500 text-xs">Dias seguidos</div>
              <div className="font-medium">
                {profile?.dias_consecutivos || 0} dias 🔥
              </div>
            </div>
          </div>
        </motion.div>

        <h2 className="font-semibold text-gray-900 mb-4">Funcionalidades</h2>
        <div className="grid grid-cols-2 gap-3">
          {features.map((feature, idx) => (
            <motion.button
              key={feature.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              onClick={() => handleFeatureClick(feature)}
              className={`relative bg-white rounded-xl p-4 border text-left transition-all hover:shadow-md ${
                feature.premium && !isPremium
                  ? "border-gray-200 opacity-75"
                  : "border-red-100 hover:border-red-300"
              }`}
            >
              {feature.premium && !isPremium && (
                <div className="absolute top-2 right-2">
                  <Lock className="w-4 h-4 text-gray-400" />
                </div>
              )}

              <div
                className={`w-10 h-10 rounded-xl mb-3 flex items-center justify-center ${
                  feature.premium && !isPremium ? "bg-gray-100" : "bg-red-100"
                }`}
              >
                <feature.icon
                  className={`w-5 h-5 ${
                    feature.premium && !isPremium ? "text-gray-400" : "text-red-600"
                  }`}
                />
              </div>

              <div className="font-medium text-gray-900 text-sm mb-1">
                {feature.title}
              </div>
              <div className="text-xs text-gray-500">{feature.desc}</div>
            </motion.button>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-6 bg-gradient-to-r from-red-500 to-rose-600 rounded-2xl p-5 text-white"
        >
          <div className="text-sm opacity-90 mb-1">💡 Dica do dia</div>
          <p className="font-medium">
            Inclua uma porção de aveia no café da manhã. As fibras solúveis ajudam a reduzir o colesterol LDL naturalmente.
          </p>
        </motion.div>
      </div>

      {showLockedModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl p-6 max-w-sm w-full"
          >
            <div className="text-center">
              <div className="w-16 h-16 bg-amber-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                <Crown className="w-8 h-8 text-amber-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Funcionalidade Premium
              </h3>
              <p className="text-gray-600 mb-6">
                Desbloqueie treinos gamificados, receitas exclusivas e acompanhamento de colesterol!
              </p>
              <div className="space-y-3">
                <Button
                  onClick={() => (window.location.href = createPageUrl("Vendas"))}
                  className="w-full bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white py-5 rounded-xl"
                >
                  Ver Plano Premium
                </Button>
                <Button
                  onClick={() => setShowLockedModal(false)}
                  variant="ghost"
                  className="w-full text-gray-500"
                >
                  Talvez depois
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
