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
  const [access, setAccess] = useState({ sub_is_premium: false });
  const [colesterolRecords, setColesterolRecords] = useState([]);
  const [historicoAgua, setHistoricoAgua] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showLockedModal, setShowLockedModal] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        setIsLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { window.location.href = createPageUrl("Login"); return; }

        const [subRes, profRes, userProfRes] = await Promise.all([
          supabase.from("subscriptions").select("*").eq("user_id", session.user.id).maybeSingle(),
          supabase.from("profiles").select("*").eq("id", session.user.id).maybeSingle(),
          supabase.from("user_profiles").select("*").eq("id", session.user.id).maybeSingle()
        ]);

        if (!mounted) return;
        const merged = { ...(userProfRes.data || {}), ...(profRes.data || {}) };
        setProfile(merged);
        setAccess({
          sub_is_premium: subRes.data?.is_premium || profRes.data?.is_premium || false,
          premium_until: subRes.data?.premium_until || profRes.data?.premium_until || null,
          role: profRes.data?.role || null
        });

        const { data: recs } = await supabase.from("cholesterol_records").select("*").eq("user_id", session.user.id).order("record_date", { ascending: false }).limit(10);
        setColesterolRecords(recs || []);

        const res = await fetch("/api/water-log", { headers: { Authorization: `Bearer ${session.access_token}` } });
        const waterData = await res.json();
        setHistoricoAgua(Array.isArray(waterData) ? waterData : (waterData?.data || []));
      } finally { if (mounted) setIsLoading(false); }
    }
    load();
    return () => { mounted = false; };
  }, []);

  const isPremium = useMemo(() => access?.role === "admin" || access?.sub_is_premium || isPremiumByUntil(access?.premium_until), [access]);

  const waterData = useMemo(() => {
    const hoje = new Date().toISOString().split("T")[0];
    const consumo = (historicoAgua || []).filter(i => i.data === hoje).reduce((acc, i) => acc + (i.quantidade_ml || 0), 0);
    const meta = (profile?.meta_agua_litros || 2) * 1000;
    return { consumo, meta, pct: Math.min((consumo / Math.max(meta, 1)) * 100, 100) };
  }, [historicoAgua, profile]);

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="w-8 h-8 border-3 border-red-600 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-slate-50 p-4 pb-24">
      <div className="max-w-lg mx-auto pt-6">
        {/* Header Unificado */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-red-600 rounded-2xl flex items-center justify-center shadow-lg shadow-red-200">
              <Heart className="text-white w-6 h-6" fill="white" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">HeartBalance</h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{isPremium ? "✨ Premium" : "Free"}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="bg-amber-100 text-amber-700 px-3 py-1.5 rounded-2xl text-xs font-black flex items-center gap-1 border border-amber-200">
              <Zap className="w-3 h-3 fill-amber-500" /> {profile?.xp_total || 0} XP
            </div>
            <button onClick={() => supabase.auth.signOut().then(() => window.location.href = "/")} className="text-[10px] font-bold text-slate-400 uppercase hover:text-red-500 transition-colors">Sair</button>
          </div>
        </div>

        {isPremium && profile && <RankCard profile={profile} onViewProgress={() => window.location.href = createPageUrl("Progresso")} />}
        
        {isPremium && <ColesterolTracker records={colesterolRecords} onRecordAdded={() => window.location.reload()} />}

        {/* Card Hidratação - Mesmo estilo do Progresso */}
        <div className="bg-white rounded-[2rem] p-6 mb-6 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-slate-900 flex items-center gap-2 text-sm"><Droplets className="text-blue-500 w-4 h-4" /> Hidratação</h2>
            <span className="text-[10px] font-bold text-slate-400 uppercase">Hoje</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-4 mb-3 overflow-hidden">
            <div className="bg-blue-500 h-full transition-all duration-500" style={{ width: `${waterData.pct}%` }} />
          </div>
          <div className="flex justify-between items-baseline">
            <span className="text-2xl font-black text-slate-900">{(waterData.consumo/1000).toFixed(1)}L</span>
            <span className="text-xs font-bold text-slate-400">meta: {waterData.meta/1000}L</span>
          </div>
        </div>

        {/* Grid de Funcionalidades */}
        <div className="grid grid-cols-2 gap-4">
          {features.map((f) => (
            <button 
              key={f.id} 
              onClick={() => (f.premium && !isPremium) ? setShowLockedModal(true) : window.location.href = createPageUrl(f.page)} 
              className="bg-white rounded-[2rem] p-5 border border-slate-50 text-left shadow-sm hover:shadow-md transition-all active:scale-95"
            >
              <div className="w-10 h-10 rounded-2xl bg-slate-50 mb-4 flex items-center justify-center">
                <f.icon className="text-red-600 w-5 h-5" />
              </div>
              <div className="font-bold text-slate-900 text-xs mb-1">{f.title}</div>
              <div className="text-[10px] text-slate-400 leading-tight">{f.desc}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
