import React, { useState, useEffect, useMemo } from 'react';
import { 
  CheckCircle2, Circle, Plus, Trophy, Target, Zap, ArrowLeft, 
  RefreshCcw, PlusCircle, Save, Dumbbell, X, Trash2, LayoutGrid, Activity
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// --- Configuração do Supabase (Segura para Vercel) ---
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL, 
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export default function ExerciciosPage() {
  // --- Estados de Controle ---
  const [loading, setLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [goal, setGoal] = useState('perda_peso'); // perda_peso, ganho_massa, saude_geral
  
  // --- Banco de Dados de Exercícios por Objetivo ---
  const exerciseLibrary = {
    perda_peso: [
      { id: 'pp1', nome: "HIIT Iniciante", series: "4x", tempo: "20 min", kcal: 250, tipo: "Cardio", icon: <Activity className="w-4 h-4 text-orange-500" /> },
      { id: 'pp2', nome: "Polichinelos", series: "3x50", tempo: "10 min", kcal: 100, tipo: "Cardio", icon: <Zap className="w-4 h-4 text-yellow-500" /> },
      { id: 'pp3', nome: "Burpees", series: "3x12", tempo: "15 min", kcal: 180, tipo: "Explosão", icon: <Activity className="w-4 h-4 text-red-500" /> }
    ],
    ganho_massa: [
      { id: 'gm1', nome: "Agachamento Livre", series: "4x12", tempo: "15 min", kcal: 120, tipo: "Força", icon: <Dumbbell className="w-4 h-4 text-blue-500" /> },
      { id: 'gm2', nome: "Supino Reto", series: "3x10", tempo: "15 min", kcal: 90, tipo: "Força", icon: <Dumbbell className="w-4 h-4 text-blue-500" /> },
      { id: 'gm3', nome: "Levantamento Terra", series: "3x8", tempo: "20 min", kcal: 150, tipo: "Força", icon: <Dumbbell className="w-4 h-4 text-blue-500" /> }
    ],
    saude_geral: [
      { id: 'sg1', nome: "Yoga Matinal", series: "1x", tempo: "30 min", kcal: 80, tipo: "Flexibilidade", icon: <Activity className="w-4 h-4 text-green-500" /> },
      { id: 'sg2', nome: "Caminhada Leve", series: "1x", tempo: "40 min", kcal: 200, tipo: "Lazer", icon: <Activity className="w-4 h-4 text-emerald-500" /> }
    ]
  };

  // --- Estados de Exercícios Ativos ---
  const [activeExercises, setActiveExercises] = useState([]);
  const [customExercises, setCustomExercises] = useState([]);
  const [newEx, setNewEx] = useState({ nome: '', series: '', kcal: '' });

  // --- Lógica de Mudança de Objetivo ---
  useEffect(() => {
    // Ao mudar o objetivo, carregamos a biblioteca correspondente marcada como não concluída
    const loaded = exerciseLibrary[goal].map(ex => ({ ...ex, concluido: false }));
    setActiveExercises(loaded);
  }, [goal]);

  // --- Cálculos de Progresso ---
  const stats = useMemo(() => {
    const total = activeExercises.length + customExercises.length;
    const completed = activeExercises.filter(e => e.concluido).length + customExercises.filter(e => e.concluido).length;
    const xp = (completed * 15) + (completed === total && total > 0 ? 50 : 0);
    return { percent: Math.round((completed / total) * 100) || 0, xp };
  }, [activeExercises, customExercises]);

  // --- Ações ---
  const toggleExercise = (id, isCustom = false) => {
    const setter = isCustom ? setCustomExercises : setActiveExercises;
    setter(prev => prev.map(ex => ex.id === id ? { ...ex, concluido: !ex.concluido } : ex));
  };

  const handleAddCustom = () => {
    if (!newEx.nome) return;
    const newItem = {
      id: `custom-${Date.now()}`,
      nome: newEx.nome,
      series: newEx.series || "1x",
      kcal: parseInt(newEx.kcal) || 0,
      tipo: "Personalizado",
      concluido: false,
      icon: <PlusCircle className="w-4 h-4 text-indigo-500" />
    };
    setCustomExercises([...customExercises, newItem]);
    setNewEx({ nome: '', series: '', kcal: '' });
    setIsAdding(false);
  };

  const saveDailyProgress = async () => {
    setLoading(true);
    const { error } = await supabase.from('profiles').upsert({
      last_goal: goal,
      daily_xp: stats.xp,
      custom_data: customExercises,
      updated_at: new Date()
    });
    setLoading(false);
    if (!error) alert("Progresso sincronizado!");
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-28">
      {/* Header Profissional */}
      <header className="bg-white border-b sticky top-0 z-20 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => window.history.back()} className="rounded-full">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Button>
          <h1 className="font-extrabold text-xl tracking-tight text-slate-900 uppercase">Workout</h1>
        </div>
        <Button onClick={saveDailyProgress} disabled={loading} size="sm" className="bg-indigo-600 hover:bg-indigo-700 shadow-md transition-all">
          {loading ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Salvar
        </Button>
      </header>

      <main className="p-4 space-y-6 max-w-2xl mx-auto">
        {/* Dashboard de Progresso */}
        <Card className="overflow-hidden border-none shadow-xl bg-slate-900 text-white">
          <CardContent className="p-6 relative">
            <div className="flex justify-between items-end mb-6">
              <div className="space-y-1">
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Status do Treino</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-black text-indigo-400">{stats.percent}%</span>
                  <span className="text-slate-500 font-medium">completo</span>
                </div>
              </div>
              <div className="text-right">
                <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30 mb-2">
                  <Trophy className="w-3 h-3 mr-1" /> {stats.xp} XP acumulados
                </Badge>
                <p className="text-[10px] text-slate-500 font-mono">GOAL: {goal.replace('_', ' ')}</p>
              </div>
            </div>
            <Progress value={stats.percent} className="h-3 bg-slate-800" />
          </CardContent>
        </Card>

        {/* Seletor de Intenção do Usuário */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-500 uppercase ml-1">Foco do Dia</label>
          <Select value={goal} onValueChange={setGoal}>
            <SelectTrigger className="w-full bg-white border-slate-200 shadow-sm h-12">
              <SelectValue placeholder="Selecione seu objetivo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="perda_peso">Perda de Peso & Queima</SelectItem>
              <SelectItem value="ganho_massa">Ganho de Massa & Força</SelectItem>
              <SelectItem value="saude_geral">Manutenção & Bem-estar</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Tabs defaultValue="sugeridos" className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-12 bg-slate-200/50 p-1 rounded-xl">
            <TabsTrigger value="sugeridos" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <Activity className="w-4 h-4 mr-2" /> Inteligente
            </TabsTrigger>
            <TabsTrigger value="custom" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <LayoutGrid className="w-4 h-4 mr-2" /> Personalizado
            </TabsTrigger>
          </TabsList>

          {/* Conteúdo Inteligente */}
          <TabsContent value="sugeridos" className="mt-6 space-y-4">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-sm font-bold text-slate-700 uppercase">Sugestões Baseadas no Foco</h3>
              <Badge variant="outline" className="text-[10px] uppercase font-bold text-slate-400">Total: {activeExercises.length}</Badge>
            </div>
            {activeExercises.map((ex) => (
              <ExerciseCard key={ex.id} ex={ex} onToggle={() => toggleExercise(ex.id)} />
            ))}
          </TabsContent>

          {/* Conteúdo Personalizado */}
          <TabsContent value="custom" className="mt-6 space-y-4">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-sm font-bold text-slate-700 uppercase">Seu Plano Manual</h3>
              <Button size="sm" variant="ghost" className="text-indigo-600 font-bold text-xs" onClick={() => setIsAdding(true)}>
                <Plus className="w-4 h-4 mr-1" /> NOVO
              </Button>
            </div>

            {customExercises.map((ex) => (
              <ExerciseCard 
                key={ex.id} 
                ex={ex} 
                onToggle={() => toggleExercise(ex.id, true)} 
                onDelete={() => setCustomExercises(customExercises.filter(i => i.id !== ex.id))}
              />
            ))}

            {isAdding && (
              <Card className="border-2 border-indigo-100 shadow-lg animate-in fade-in zoom-in duration-200">
                <CardContent className="p-4 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-black text-indigo-600 uppercase">Novo Exercício</span>
                    <Button variant="ghost" size="icon" onClick={() => setIsAdding(false)}><X className="w-4 h-4" /></Button>
                  </div>
                  <Input placeholder="Nome do exercício" value={newEx.nome} onChange={e => setNewEx({...newEx, nome: e.target.value})} className="h-12" />
                  <div className="grid grid-cols-2 gap-3">
                    <Input placeholder="Séries/Repet." value={newEx.series} onChange={e => setNewEx({...newEx, series: e.target.value})} />
                    <Input placeholder="Kcal est." type="number" value={newEx.kcal} onChange={e => setNewEx({...newEx, kcal: e.target.value})} />
                  </div>
                  <Button className="w-full bg-slate-900 text-white h-12 font-bold uppercase tracking-tight" onClick={handleAddCustom}>
                    Adicionar ao Plano
                  </Button>
                </CardContent>
              </Card>
            )}

            {customExercises.length === 0 && !isAdding && (
              <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl">
                <PlusCircle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-400 text-sm font-medium">Nenhum exercício personalizado ainda.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer Flutuante de Resumo */}
      <div className="fixed bottom-6 left-4 right-4 max-w-md mx-auto">
        <div className="bg-white/80 backdrop-blur-md border border-slate-200 shadow-2xl rounded-2xl p-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
              <Zap className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase leading-none">Meta Diária</p>
              <p className="text-sm font-black text-slate-800">Ganhar 200 XP</p>
            </div>
          </div>
          <div className="flex flex-col items-end">
             <div className="flex items-center gap-1">
               <span className="text-xs font-bold text-slate-700">{stats.xp}</span>
               <span className="text-[10px] font-bold text-slate-400">/ 200</span>
             </div>
             <div className="w-24 h-1.5 bg-slate-100 rounded-full mt-1 overflow-hidden">
               <div className="h-full bg-indigo-500 transition-all duration-500" style={{ width: `${Math.min((stats.xp/200)*100, 100)}%` }}></div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Subcomponente de Card para Evitar Repetição de Código ---
function ExerciseCard({ ex, onToggle, onDelete }) {
  return (
    <Card className={`transition-all duration-300 border-none shadow-sm ${ex.concluido ? 'bg-slate-100/80 shadow-none' : 'bg-white hover:shadow-md'}`}>
      <CardContent className="p-4 flex items-center gap-4">
        <button 
          onClick={onToggle}
          className={`group relative flex-shrink-0 transition-transform active:scale-90`}
        >
          {ex.concluido ? (
            <div className="bg-green-500 rounded-full p-1.5 shadow-lg shadow-green-200">
              <CheckCircle2 className="w-6 h-6 text-white" />
            </div>
          ) : (
            <Circle className="w-9 h-9 text-slate-200 group-hover:text-indigo-400 transition-colors" />
          )}
        </button>
        
        <div className="flex-grow min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 bg-slate-50 rounded-lg">{ex.icon}</span>
            <h3 className={`font-bold text-slate-800 truncate ${ex.concluido ? 'line-through text-slate-400 font-medium' : ''}`}>
              {ex.nome}
            </h3>
          </div>
          <div className="flex items-center gap-3">
             <Badge variant="secondary" className="bg-slate-100 text-[9px] text-slate-600 font-bold border-none">
               {ex.series}
             </Badge>
             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{ex.tempo}</span>
             <span className="text-[10px] font-bold text-indigo-500/70">{ex.kcal} KCAL</span>
          </div>
        </div>

        {onDelete && (
          <Button variant="ghost" size="icon" onClick={onDelete} className="text-slate-300 hover:text-red-400">
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
