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
  if (!pesoKg || !alturaCm) return null;
  const h = alturaCm / 100;
  if (!h || h <= 0) return null;
  const v = pesoKg / (h * h);
  return Number.isFinite(v) ? v : null;
}

function ymd(d) {
  return d.toISOString().split("T")[0];
}

export default function Progresso() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [waterLogs, setWaterLogs] = useState([]);
  const [userEmail, setUserEmail] = useState("");

  const hoje = ymd(new Date());

  async function loadAll() {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData?.session;
      
      if (!session) {
        window.location.href = createPageUrl("Login");
        return;
      }

      setUserEmail(session.user.email || "");

      // Busca dados do perfil com tratamento de erro
      const { data: prof, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .maybeSingle();

      if (error) console.error("Erro ao carregar perfil:", error);
      setProfile(prof || {});

      // Busca logs de água
      const logs = await waterLogList();
      setWaterLogs(Array.isArray(logs) ? logs : []);

    } catch (err) {
      console.error("Falha crítica no carregamento:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  // Lógica de Rank Sincronizada com o Dashboard
  const nivel = useMemo(() => {
    const rankNome = profile?.rank || "Iniciante";
    const cores = {
      "Diamante": "text-indigo-700",
      "Ouro": "text-amber-600",
      "Prata": "text-slate-500",
      "Bronze": "text-orange-700",
      "Iniciante": "text-gray-400"
    };
    return { nome: rankNome, cor: cores[rankNome] || "text-gray-400" };
  }, [profile]);

  const metaLitros = Number(profile?.meta_agua_litros || 2.5);
  const metaMl = metaLitros * 1000;

  const consumoHojeMl = useMemo(() => {
    return (waterLogs || []).filter(l => l?.data === hoje).reduce((sum, l) => sum + Number(l?.quantidade_ml || 0), 0);
  }, [waterLogs, hoje]);

  const pct = metaMl > 0 ? Math.min((consumoHojeMl / metaMl) * 100, 100) : 0;
  const metaBatida = consumoHojeMl >= metaMl;

  // Gráfico de 7 dias
  const ultimos7 = useMemo(() => {
    const arr = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const date = ymd(d);
      const total = (waterLogs || []).filter(l => l?.data === date).reduce((sum, l) => sum + Number(l?.quantidade_ml || 0), 0);
      arr.push({ date, totalMl: total, bateuMeta: total >= metaMl && metaMl > 0 });
    }
    return arr;
  }, [waterLogs, metaMl]);

  const maxMl7 = Math.max(...ultimos7.map(d => d.totalMl), metaMl, 1);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <div className="max-w-xl mx-auto px-4 pt-6">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => window.location.href = createPageUrl("Dashboard")} className="w-10 h-10 rounded-2xl bg-white shadow-sm flex items-center justify-center active:scale-90 transition-transform">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="text-xl font-black text-gray-900 tracking-tight">Evolução</h1>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{hoje}</p>
              <h2 className="text-lg font-black text-gray-900 leading-none mt-1">{userEmail.split('@')[0]}</h2>
            </div>
            <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${metaBatida ? "bg-green-100 text-green-700" : "bg-indigo-100 text-indigo-700"}`}>
              {metaBatida ? "Meta Batida" : "Em Progresso"}
            </div>
          </div>
          
          <div className="flex gap-2">
            <div className="flex-1 bg-slate-50 rounded-2xl p-3 border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Nível</span>
              <span className={`text-sm font-black ${nivel.cor} flex items-center gap-1`}>
                <Sparkles className="w-3 h-3" /> {nivel.nome}
              </span>
            </div>
            <div className="flex-1 bg-slate-50 rounded-2xl p-3 border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">XP Atual</span>
              <span className="text-sm font-black text-slate-900">{profile?.xp_total || 0} XP</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 mb-6">
          {/* Card Hidratação */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
               <div className="flex items-center gap-2 font-bold text-gray-900"><Droplets className="text-blue-500 w-5 h-5" /> Água</div>
               <span className="text-xs font-bold text-blue-600">{(consumoHojeMl/1000).toFixed(1)}L / {metaLitros}L</span>
            </div>
            <div className="w-full bg-slate-100 h-4 rounded-full overflow-hidden mb-4">
              <div className="bg-blue-500 h-full transition-all duration-700" style={{ width: `${pct}%` }} />
            </div>
            <div className="flex items-end gap-1 h-20">
              {ultimos7.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                  <div className={`w-full rounded-t-md ${d.bateuMeta ? "bg-green-400" : "bg-blue-100"}`} style={{ height: `${(d.totalMl / maxMl7) * 100}%` }} />
                  <span className="text-[8px] font-bold text-gray-300">{d.date.slice(8)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Card Medidas */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 font-bold text-gray-900 mb-4"><Scale className="text-slate-400 w-5 h-5" /> Biometria</div>
            <div className="grid grid-cols-3 gap-2">
               <div className="text-center">
                  <span className="text-[9px] font-bold text-gray-400 uppercase block">Peso</span>
                  <span className="text-sm font-black text-gray-900">{profile?.peso_kg || '--'}kg</span>
               </div>
               <div className="text-center">
                  <span className="text-[9px] font-bold text-gray-400 uppercase block">Altura</span>
                  <span className="text-sm font-black text-gray-900">{profile?.altura_cm || '--'}cm</span>
               </div>
               <div className="text-center">
                  <span className="text-[9px] font-bold text-gray-400 uppercase block">IMC</span>
                  <span className="text-sm font-black text-indigo-600">{calcIMC(profile?.peso_kg, profile?.altura_cm)?.toFixed(1) || '--'}</span>
               </div>
            </div>
          </div>
        </div>

        <Button onClick={() => window.location.href = createPageUrl("Perfil")} className="w-full bg-indigo-600 h-14 rounded-2xl font-black text-white shadow-lg shadow-indigo-100">
          Atualizar Meus Dados
        </Button>
      </div>
    </div>
  );
}
