import React, { useEffect, useMemo, useState } from "react";
import { 
  ArrowLeft, Droplets, Scale, Ruler, HeartPulse, Trophy, 
  Flame, Calendar, ChevronRight, BadgeCheck, Sparkles 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabaseClient";
import { createPageUrl } from "@/utils";
import { waterLogList } from "@/lib/waterApi";

function calcIMC(pesoKg, alturaCm) {
  if (!pesoKg || !alturaCm || alturaCm <= 0) return null;
  const h = alturaCm / 100;
  return pesoKg / (h * h);
}

export default function Progresso() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [waterLogs, setWaterLogs] = useState([]);
  const hoje = new Date().toISOString().split("T")[0];

  useEffect(() => {
    async function load() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { window.location.href = createPageUrl("Login"); return; }
        const { data: prof } = await supabase.from("profiles").select("*").eq("id", session.user.id).maybeSingle();
        setProfile(prof || {});
        const logs = await waterLogList();
        setWaterLogs(Array.isArray(logs) ? logs : []);
      } finally { setLoading(false); }
    }
    load();
  }, []);

  const nivel = useMemo(() => {
    const r = profile?.rank || "Iniciante";
    const c = { "Diamante": "text-indigo-600", "Ouro": "text-amber-600", "Prata": "text-slate-500", "Bronze": "text-orange-700" };
    return { nome: r, cor: c[r] || "text-slate-400" };
  }, [profile]);

  const water = useMemo(() => {
    const meta = (profile?.meta_agua_litros || 2.5) * 1000;
    const consumo = (waterLogs || []).filter(l => l.data === hoje).reduce((s, l) => s + Number(l.quantidade_ml || 0), 0);
    return { meta, consumo, pct: Math.min((consumo / meta) * 100, 100), batida: consumo >= meta };
  }, [waterLogs, profile, hoje]);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-slate-50 pb-24 p-4">
      <div className="max-w-lg mx-auto pt-6">
        {/* Header Unificado */}
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => window.location.href = createPageUrl("Dashboard")} className="w-12 h-12 rounded-2xl bg-white shadow-sm border border-slate-100 flex items-center justify-center active:scale-90 transition-all">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Evolução</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Seu Histórico</p>
          </div>
        </div>

        {/* Card de Rank - Estilo Dashboard */}
        <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 mb-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{hoje}</p>
              <h2 className="text-xl font-black text-slate-900">{profile?.rank || "Iniciante"}</h2>
            </div>
            <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-tighter ${water.batida ? "bg-green-100 text-green-700" : "bg-indigo-100 text-indigo-700"}`}>
              {water.batida ? "Meta Concluída" : "Em Progresso"}
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Ranking</span>
              <span className={`text-sm font-black ${nivel.cor} flex items-center gap-1`}><Sparkles className="w-3 h-3" /> {nivel.nome}</span>
            </div>
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">XP Total</span>
              <span className="text-sm font-black text-slate-900">{profile?.xp_total || 0} XP</span>
            </div>
          </div>
        </div>

        {/* Biometria Unificada */}
        <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 mb-6">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 mb-6"><Scale className="text-slate-400 w-4 h-4" /> Biometria Atual</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div><span className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Peso</span><span className="text-sm font-black text-slate-900">{profile?.peso_kg || '--'}kg</span></div>
            <div><span className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Altura</span><span className="text-sm font-black text-slate-900">{profile?.altura_cm || '--'}cm</span></div>
            <div><span className="text-[9px] font-bold text-slate-400 uppercase block mb-1">IMC</span><span className="text-sm font-black text-red-600">{calcIMC(profile?.peso_kg, profile?.altura_cm)?.toFixed(1) || '--'}</span></div>
          </div>
          <Button onClick={() => window.location.href = createPageUrl("Perfil")} className="w-full mt-6 bg-slate-900 h-12 rounded-2xl font-black text-white text-xs uppercase tracking-widest">Atualizar Medidas</Button>
        </div>
      </div>
    </div>
  );
}
