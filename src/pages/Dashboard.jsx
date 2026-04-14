import React, { useEffect, useMemo, useState } from "react";
import { 
  Heart, Crown, Lock, Salad, Dumbbell, Droplets, BookOpen, 
  TrendingDown, Target, Zap, Bot, LogOut 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { createPageUrl } from "@/utils";
import RankCard from "@/components/dashboard/RankCard";
import ColesterolTracker from "@/components/dashboard/ColesterolTracker";
import { supabase } from "@/lib/supabaseClient";

function isPremiumByUntil(premiumUntil) {
  if (!premiumUntil) return false;
  const d = new Date(premiumUntil);
  return Number.isFinite(d.getTime()) && d > new Date();
}

export default function Dashboard() {
  const [profile, setProfile] = useState(null);
  const [access, setAccess] = useState({ sub_is_premium: false, role: null, premium_until: null });
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
        const { data: sessionData } = await supabase.auth.getSession();
        const session = sessionData?.session;

        if (!session) {
          window.location.href = createPageUrl("Login");
          return;
        }

        // Busca Subscription, Profile e UserProfile em paralelo para ganhar tempo
        const [subRes, profRes, userProfRes] = await Promise.all([
          supabase.from("subscriptions").select("*").eq("user_id", session.user.id).maybeSingle(),
          supabase.from("profiles").select("*").eq("id", session.user.id).maybeSingle(),
          supabase.from("user_profiles").select("*").eq("id", session.user.id).maybeSingle()
        ]);

        if (!mounted) return;

        // Unificação: Profiles tem prioridade absoluta
        const mergedProfile = { ...(userProfRes.data || {}), ...(profRes.data || {}) };
        
        setProfile(mergedProfile);
        setAccess({
          sub_is_premium: subRes.data?.is_premium || profRes.data?.is_premium || false,
          premium_until: subRes.data?.premium_until || profRes.data?.premium_until || null,
          role: profRes.data?.role || null
        });

        // Carrega Colesterol
        const { data: recs } = await supabase.from("cholesterol_records")
          .select("*").eq("user_id", session.user.id)
          .order("record_date", { ascending: false }).limit(10);
        setColesterolRecords(recs || []);

        // Carrega Água
        const res = await fetch("/api/water-log", { headers: { Authorization: `Bearer ${session.access_token}` } });
        if (res.ok) {
          const waterData = await res.json();
          setHistoricoAgua(Array.isArray(waterData) ? waterData : (waterData?.data || []));
        }

      } catch (err) {
        console.error("Erro no Dashboard:", err);
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
    const consumo = (historicoAgua || []).filter(i => i.data === hoje).reduce((acc, i) => acc + (i.quantidade_ml || 0), 0);
    const meta = (profile?.meta_agua_litros || 2) * 1000;
    return { consumo, meta, pct: Math.min((consumo / Math.max(meta, 1)) * 100, 100) };
  }, [historicoAgua, profile]);

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-8 h-8 border-3 border-red-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-rose-50 p-4 pb-24">
      <div className="max-w-lg mx-auto pt-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-red-600 rounded-xl flex items-center justify-center shadow-lg shadow-red-100">
              <Heart className="text-white w-6 h-6" fill="white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 leading-tight">HeartBalance</h1>
              <p className="text-xs font-medium text-gray-500">{isPremium ? "✨ Premium Ativo" : "Plano Gratuito"}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="bg-amber-100 text-amber-700 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 border border-amber-200">
              <Zap className="w-3.5 h-3.5 fill-amber-500" /> {profile?.xp_total || 0} XP
            </div>
            <button onClick={handleLogout} className="text-[10px] font-black uppercase tracking-wider text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1">
              <LogOut className="w-3 h-3" /> Sair
            </button>
          </div>
        </div>

        {isPremium && profile && <RankCard profile={profile} onViewProgress={() => window.location.href = createPageUrl("Progresso")} />}
        
        {isPremium && (
          <ColesterolTracker records={colesterolRecords} onRecordAdded={() => window.location.reload()} />
        )}

        <div className="bg-white rounded-2xl p-5 mb-6 border border-gray-100 shadow-sm">
          <h2 className="font-bold text-gray-900 flex items-center gap-2 mb-3 text-sm uppercase tracking-tight">
            <Droplets className="text-blue-500 w-4 h-4" /> Hidratação de Hoje
          </h2>
          <div className="w-full bg-gray-100 rounded-full h-3 mb-2 overflow-hidden">
            <div className="bg-blue-500 h-full transition-all duration-500" style={{ width: `${progressoAgua.pct}%` }} />
          </div>
          <div className="flex justify-between items-center text-xs">
             <span className="font-bold text-blue-700">{progressoAgua.consumo}ml</span>
             <span className="text-gray-400">meta: {progressoAgua.meta}ml</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {features.map((f) => (
            <button 
              key={f.id} 
              onClick={() => (f.premium && !isPremium) ? setShowLockedModal(true) : window.location.href = createPageUrl(f.page)} 
              className="bg-white rounded-2xl p-4 border border-gray-50 text-left shadow-sm hover:shadow-md transition-all active:scale-95"
            >
              <div className="w-10 h-10 rounded-xl bg-red-50 mb-3 flex items-center justify-center">
                <f.icon className="text-red-600 w-5 h-5" />
              </div>
              <div className="font-bold text-gray-900 text-xs mb-1">{f.title}</div>
              <div className="text-[10px] text-gray-400 leading-tight">{f.desc}</div>
            </button>
          ))}
        </div>
      </div>
      
      {showLockedModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 z-50">
          <div className="bg-white rounded-3xl p-8 max-w-xs w-full text-center">
             <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Crown className="text-amber-600 w-8 h-8" />
             </div>
             <h3 className="font-black text-xl text-gray-900 mb-2">Área Premium</h3>
             <p className="text-sm text-gray-500 mb-6">Desbloqueie análises de IA, treinos e monitoramento de saúde completo.</p>
             <Button onClick={() => window.location.href = createPageUrl("Vendas")} className="w-full bg-red-600 h-12 rounded-xl font-bold">Ver Planos</Button>
             <button onClick={() => setShowLockedModal(false)} className="mt-4 text-xs font-bold text-gray-400 uppercase">Fechar</button>
          </div>
        </div>
      )}
    </div>
  );
}
