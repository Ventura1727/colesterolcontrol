// src/pages/Dashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Heart, Crown, Lock, Salad, Dumbbell, Droplets, BookOpen,
  TrendingDown, Target, Zap, Bot, LogOut
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

function isPremiumByUntil(premiumUntil) {
  if (!premiumUntil) return false;
  const d = new Date(premiumUntil);
  return Number.isFinite(d.getTime()) && d > new Date();
}

export default function Dashboard() {
  const [profile, setProfile] = useState(null);
  const [access, setAccess] = useState({ sub_is_premium: false });
  const [colesterolRecords, setColesterolRecords] = useState([]);
  const [historicoAgua, setHistoricoAgua] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showLockedModal, setShowLockedModal] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

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

        // 1) Subscription
        const { data: sub } = await supabase.from("subscriptions").select("*").eq("user_id", session.user.id).maybeSingle();
        
        // 2) Profile (Fonte da Verdade)
        const { data: prof } = await supabase.from("profiles").select("*").eq("id", session.user.id).maybeSingle();
        
        // 3) User Profile (Legado)
        const { data: userProf } = await supabase.from("user_profiles").select("*").eq("id", session.user.id).maybeSingle();

        if (!mounted) return;

        // ✅ UNIFICAÇÃO: 'profiles' sempre tem prioridade sobre 'user_profiles'
        const mergedProfile = { ...(userProf || {}), ...(prof || {}) };
        
        setProfile(mergedProfile);
        setAccess({
          sub_is_premium: sub?.is_premium || prof?.is_premium,
          premium_until: sub?.premium_until || prof?.premium_until,
          role: prof?.role
        });

        const { data: recs } = await supabase.from("cholesterol_records").select("*").eq("user_id", session.user.id).order("record_date", { ascending: false }).limit(10);
        setColesterolRecords(recs || []);

        const res = await fetch("/api/water-log", { headers: { Authorization: `Bearer ${session.access_token}` } });
        const waterData = await res.json();
        setHistoricoAgua(Array.isArray(waterData) ? waterData : (waterData?.data || []));

      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  const isPremium = useMemo(() => {
    return access?.role === "admin" || access?.sub_is_premium || isPremiumByUntil(access?.premium_until);
  }, [access]);

  const progressoAgua = useMemo(() => {
    const hoje = new Date().toISOString().split("T")[0];
    const consumo = historicoAgua.filter(i => i.data === hoje).reduce((acc, i) => acc + i.quantidade_ml, 0);
    const meta = (profile?.meta_agua_litros || 2) * 1000;
    return { consumo, meta, pct: Math.min((consumo / meta) * 100, 100) };
  }, [historicoAgua, profile]);

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-3 border-red-600 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-rose-50 p-4 pb-24">
      <div className="max-w-lg mx-auto pt-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-red-600 rounded-xl flex items-center justify-center shadow-lg"><Heart className="text-white" fill="white" /></div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">HeartBalance</h1>
              <p className="text-sm text-gray-500">{isPremium ? "Premium Ativo" : "Plano Gratuito"}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="bg-yellow-100 text-yellow-700 px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-1">
              <Zap className="w-4 h-4" /> {profile?.xp_total || 0} XP
            </div>
            <button onClick={handleLogout} className="text-xs font-bold text-slate-600 flex items-center gap-1"><LogOut className="w-4 h-4" /> Sair</button>
          </div>
        </div>

        {isPremium && <RankCard profile={profile} onViewProgress={() => window.location.href = createPageUrl("Progresso")} />}
        {isPremium && <ColesterolTracker records={colesterolRecords} onRecordAdded={() => window.location.reload()} />}

        <div className="bg-white rounded-2xl p-5 mb-6 border border-gray-100 shadow-sm">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2 mb-3"><Droplets className="text-blue-600" /> Hidratação</h2>
          <div className="w-full bg-gray-200 rounded-full h-4 mb-2"><div className="bg-blue-500 h-4 rounded-full" style={{ width: `${progressoAgua.pct}%` }} /></div>
          <p className="text-sm text-gray-700">{progressoAgua.consumo}ml / {progressoAgua.meta}ml</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {features.map((f) => (
            <button key={f.id} onClick={() => (f.premium && !isPremium) ? setShowLockedModal(true) : window.location.href = createPageUrl(f.page)} className="bg-white rounded-xl p-4 border border-red-100 text-left">
              <div className="w-10 h-10 rounded-xl bg-red-100 mb-3 flex items-center justify-center"><f.icon className="text-red-600 w-5 h-5" /></div>
              <div className="font-medium text-gray-900 text-sm">{f.title}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
