// src/pages/Dashboard.jsx
import React, { useState, useEffect, useMemo } from "react";
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
import { waterLogList } from "@/lib/waterApi";

const features = [
  { id: "nutricionista", title: "Nutricionista IA", desc: "Planos e análise de pratos", icon: Bot, premium: true, page: "Nutricionista" },
  { id: "exercicios", title: "Exercícios", desc: "Treinos que liberam XP", icon: Dumbbell, premium: true, page: "Exercicios" },
  { id: "alimentacao", title: "Receitas", desc: "Pratos anti-colesterol", icon: Salad, premium: true, page: "Alimentacao" },
  { id: "progresso", title: "Meu Progresso", desc: "Acompanhe sua evolução", icon: TrendingDown, premium: true, page: "Progresso" },
  { id: "hidratacao", title: "Hidratação", desc: "Calcule sua meta diária", icon: Droplets, premium: true, page: "Hidratacao" },
  { id: "educacao", title: "Conteúdo", desc: "Artigos sobre saúde", icon: BookOpen, premium: false, page: "Conteudo" },
];

function isFutureDate(value) {
  if (!value) return false;
  const d = new Date(value);
  return Number.isFinite(d.getTime()) && d > new Date();
}

export default function Dashboard() {
  const [profile, setProfile] = useState(null);
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
        const user = session?.user;

        if (!user) {
          window.location.href = `/login?next=${encodeURIComponent("/dashboard")}`;
          return;
        }

        // 1) PERFIL (fonte única)
        // Observação: aqui eu assumo que você já tem as colunas no public.profiles:
        // role, plano_ativo, premium_until, is_premium, objetivo, peso_kg, altura_cm, basal_kcal,
        // xp_total, rank, metas_concluidas, dias_consecutivos (se alguma não existir, só não mostra).
        const { data: prof, error: profErr } = await supabase
          .from("profiles")
          .select(`
            id,
            role,
            plano_ativo,
            plano_tipo,
            plano_inicio,
            plano_fim,
            is_premium,
            premium_until,
            objetivo,
            peso_kg,
            altura_cm,
            basal_kcal,
            meta_agua_litros,
            rank,
            xp_total,
            metas_concluidas,
            dias_consecutivos
          `)
          .eq("id", user.id)
          .maybeSingle();

        if (profErr) console.error("Dashboard: load profile error:", profErr);

        // Se não existe linha ainda, garante criação mínima (evita telas vazias)
        let finalProfile = prof || null;
        if (!finalProfile) {
          const { data: created, error: upsertErr } = await supabase
            .from("profiles")
            .upsert({ id: user.id }, { onConflict: "id" })
            .select(`
              id,
              role,
              plano_ativo,
              is_premium,
              premium_until,
              objetivo,
              peso_kg,
              altura_cm,
              basal_kcal,
              meta_agua_litros,
              rank,
              xp_total,
              metas_concluidas,
              dias_consecutivos
            `)
            .single();

          if (!upsertErr) finalProfile = created;
        }

        if (!mounted) return;
        setProfile(finalProfile);

        // 2) COLESTEROL (não quebra se tabela não existir)
        try {
          const { data: recs } = await supabase
            .from("colesterol_records")
            .select("*")
            .order("data_exame", { ascending: false })
            .limit(10);

          if (!mounted) return;
          setColesterolRecords(Array.isArray(recs) ? recs : []);
        } catch {
          if (!mounted) return;
          setColesterolRecords([]);
        }

        // 3) ÁGUA (usa helper já padronizado)
        try {
          const logs = await waterLogList();
          if (!mounted) return;
          setHistoricoAgua(Array.isArray(logs) ? logs : []);
        } catch {
          if (!mounted) return;
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

  // Premium unificado
  const isPremium = useMemo(() => {
    const premiumUntilOk = isFutureDate(profile?.premium_until);
    return (
      profile?.role === "admin" ||
      profile?.plano_ativo === true ||
      profile?.is_premium === true ||
      premiumUntilOk
    );
  }, [profile]);

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

  // Hidratação de hoje (meta vinda do profile)
  const hoje = new Date().toISOString().split("T")[0];
  const consumoHoje = (historicoAgua || [])
    .filter((item) => item?.data === hoje)
    .reduce((total, item) => total + Number(item?.quantidade_ml || 0), 0);

  const metaLitros = Number(profile?.meta_agua_litros || 2.5);
  const metaDiariaMl = metaLitros * 1000;
  const progresso = Math.min((consumoHoje / metaDiariaMl) * 100, 100);

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-rose-50 p-4 pb-24">
      <div className="max-w-lg mx-auto pt-6">
        {/* Header */}
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

        {/* Rank Card - Premium */}
        {isPremium && (
          <RankCard
            profile={profile}
            onViewProgress={() => (window.location.href = createPageUrl("Progresso"))}
          />
        )}

        {/* Colesterol Tracker - Premium */}
        {isPremium && (
          <ColesterolTracker
            records={colesterolRecords}
            onRecordAdded={() => window.location.reload()}
          />
        )}

        {/* Hidratação */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-5 mb-6 border border-gray-100 shadow-sm"
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Droplets className="w-5 h-5 text-blue-600" />
              Hidratação de Hoje
            </h2>
            <button
              onClick={() => (window.location.href = "/hidratacao")}
              className="text-sm text-blue-700 hover:underline"
            >
              Abrir
            </button>
          </div>

          <div className="w-full bg-gray-200 rounded-full h-4 mb-2">
            <div className="bg-blue-500 h-4 rounded-full" style={{ width: `${progresso}%` }} />
          </div>

          <p className="text-sm text-gray-700">
            {consumoHoje}ml / {metaDiariaMl}ml ({metaLitros.toFixed(1)}L)
          </p>

          {!profile?.meta_agua_litros && (
            <p className="text-xs text-gray-500 mt-2">
              Dica: preencha peso/altura/basal em <span className="font-semibold">Perfil</span> para calcular a meta automaticamente.
            </p>
          )}
        </motion.div>

        {/* Resumo do Perfil (agora baseado no profiles real) */}
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

            <Button
              onClick={() => (window.location.href = "/perfil")}
              variant="outline"
              className="h-8 px-3"
            >
              Editar
            </Button>
          </div>

          <div className="mb-3">
            <span className="text-xs text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full">
              Objetivo: {profile?.objetivo || "não definido"}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-gray-500 text-xs">Peso</div>
              <div className="font-medium">{profile?.peso_kg ? `${profile.peso_kg} kg` : "—"}</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-gray-500 text-xs">Altura</div>
              <div className="font-medium">{profile?.altura_cm ? `${profile.altura_cm} cm` : "—"}</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-gray-500 text-xs">Basal</div>
              <div className="font-medium">{profile?.basal_kcal ? `${profile.basal_kcal} kcal` : "—"}</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-gray-500 text-xs">Dias seguidos</div>
              <div className="font-medium">{profile?.dias_consecutivos || 0} dias 🔥</div>
            </div>
          </div>
        </motion.div>

        {/* Grid de Funcionalidades */}
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

              <div className="font-medium text-gray-900 text-sm mb-1">{feature.title}</div>
              <div className="text-xs text-gray-500">{feature.desc}</div>
            </motion.button>
          ))}
        </div>

        {/* Dica do dia */}
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

      {/* Modal de Bloqueio */}
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
              <h3 className="text-xl font-bold text-gray-900 mb-2">Funcionalidade Premium</h3>
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
