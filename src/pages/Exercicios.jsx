import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, Circle, Trophy, Target, Zap, ArrowLeft, 
  RefreshCcw, PlusCircle, Save, Dumbbell, X, Activity, Flame
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL, 
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export default function ExerciciosPage() {
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [goal, setGoal] = useState('perda_peso');
  
  // Estados de Dados Persistentes
  const [totalXP, setTotalXP] = useState(0);
  const [completedIds, setCompletedIds] = useState([]); // IDs salvos no banco
  const [customExercises, setCustomExercises] = useState([]);
  const [newEx, setNewEx] = useState({ nome: '', tempo: '15', intensidade: 'moderado' });

  // 1. CARREGAR DADOS DO SUPABASE AO INICIAR
  useEffect(() => {
    async function loadUserData() {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('total_xp, completed_exercises_today, custom_exercises')
          .single();

        if (data) {
          setTotalXP(data.total_xp || 0);
          setCompletedIds(data.completed_exercises_today || []);
          setCustomExercises(data.custom_exercises || []);
        }
      } catch (err) {
        console.error("Erro ao carregar histórico:", err);
      } finally {
        setLoading(false);
      }
    }
    loadUserData();
  }, []);

  // 2. BIBLIOTECA FIXA DE EXERCÍCIOS
  const exerciseLibrary = {
    perda_peso: [
      { id: 'pp1', nome: "HIIT Queima Rápida", tempo: 20, baseKcal: 12 }, // kcal por minuto
      { id: 'pp2', nome: "Polichinelos Intensos", tempo: 10, baseKcal: 8 },
      { id: 'pp3', nome: "Corrida Estacionária", tempo: 15, baseKcal: 10 }
    ],
    ganho_massa: [
      { id: 'gm1', nome: "Agachamento com Peso", tempo: 15, baseKcal: 6 },
      { id: 'gm2', nome: "Flexões de Braço", tempo: 10, baseKcal: 5 }
    ]
  };

  // 3. LÓGICA DE COMPLETAR (COM TRAVA DE HISTÓRICO)
  const toggleExercise = async (id, isCustom = false) => {
    if (completedIds.includes(id)) return; // Trava: não pode completar 2x no mesmo dia

    const newCompleted = [...completedIds, id];
    const earnedXP = 25; // XP fixo por exercício
    const newTotalXP = totalXP + earnedXP;

    // Atualização Otimista na UI
    setCompletedIds(newCompleted);
    setTotalXP(newTotalXP);

    // Salvar no Banco de Dados imediatamente
    await supabase.from('profiles').update({
      total_xp: newTotalXP,
      completed_exercises_today: newCompleted,
      last_activity: new Date()
    }).eq('id', (await supabase.auth.getUser()).data.user?.id);
  };

  // 4. CÁLCULO AUTOMÁTICO DE CALORIAS (MET Simplificado)
  const calculateKcal = (tempo, intensidade) => {
    const fatores = { leve: 3, moderado: 5, intenso: 8 };
    return Math.round(parseInt(tempo) * fatores[intensidade]);
  };

  const handleAddCustom = () => {
    if (!newEx.nome) return;
    const estimatedKcal = calculateKcal(newEx.tempo, newEx.intensidade);
    
    const newItem = {
      id: `custom-${Date.now()}`,
      nome: newEx.nome,
      tempo: `${newEx.tempo} min`,
      kcal: estimatedKcal,
      intensidade: newEx.intensidade,
      concluido: false
    };

    setCustomExercises([...customExercises, newItem]);
    setIsAdding(false);
    setNewEx({ nome: '', tempo: '15', intensidade: 'moderado' });
  };

  const progressPercent = Math.round((completedIds.length / (exerciseLibrary[goal].length + customExercises.length)) * 100) || 0;

  if (loading) return <div className="flex h-screen items-center justify-center bg-slate-50">Carregando plano...</div>;

  return (
    <div className="min-h-screen bg-slate-50 pb-32">
      <header className="bg-white border-b sticky top-0 z-20 px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => window.history.back()}><ArrowLeft className="w-5 h-5" /></Button>
          <h1 className="font-black text-xl text-slate-800 uppercase tracking-tighter">HeartBalance Training</h1>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[10px] font-bold text-slate-400">TOTAL XP</span>
          <span className="text-lg font-black text-indigo-600 leading-none">{totalXP}</span>
        </div>
      </header>

      <main className="p-4 space-y-6 max-w-xl mx-auto">
        {/* Status Card Profissional */}
        <Card className="bg-slate-900 border-none shadow-2xl overflow-hidden text-white">
          <div className="p-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <p className="text-indigo-400 text-xs font-bold uppercase tracking-widest">Objetivo Diário</p>
                <h2 className="text-3xl font-black">{progressPercent}%</h2>
              </div>
              <Flame className={`w-8 h-8 ${progressPercent > 50 ? 'text-orange-500 animate-pulse' : 'text-slate-700'}`} />
            </div>
            <Progress value={progressPercent} className="h-3 bg-slate-800" />
            <p className="mt-4 text-xs text-slate-400 italic">Complete todos para bônus de 50 XP</p>
          </div>
        </Card>

        <Tabs defaultValue="ia" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-slate-200 h-12 rounded-xl p-1">
            <TabsTrigger value="ia" className="rounded-lg font-bold uppercase text-[10px]">Sugestões IA</TabsTrigger>
            <TabsTrigger value="custom" className="rounded-lg font-bold uppercase text-[10px]">Meus Treinos</TabsTrigger>
          </TabsList>

          <TabsContent value="ia" className="mt-6 space-y-3">
            {exerciseLibrary[goal].map((ex) => (
              <ExerciseRow 
                key={ex.id} 
                ex={ex} 
                isCompleted={completedIds.includes(ex.id)}
                onToggle={() => toggleExercise(ex.id)}
              />
            ))}
          </TabsContent>

          <TabsContent value="custom" className="mt-6 space-y-3">
            {customExercises.map((ex) => (
              <ExerciseRow 
                key={ex.id} 
                ex={ex} 
                isCompleted={completedIds.includes(ex.id)}
                onToggle={() => toggleExercise(ex.id, true)}
              />
            ))}
            
            {!isAdding ? (
              <Button onClick={() => setIsAdding(true)} variant="outline" className="w-full border-dashed border-2 h-16 text-slate-500 gap-2">
                <PlusCircle className="w-5 h-5" /> Adicionar Exercício Próprio
              </Button>
            ) : (
              <Card className="border-2 border-indigo-500/20 bg-indigo-50/30">
                <CardContent className="p-4 space-y-4">
                  <Input placeholder="Qual o exercício? (ex: Flexão)" value={newEx.nome} onChange={e => setNewEx({...newEx, nome: e.target.value})} />
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Duração (min)</label>
                      <Input type="number" value={newEx.tempo} onChange={e => setNewEx({...newEx, tempo: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Esforço</label>
                      <select 
                        className="w-full h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
                        value={newEx.intensidade}
                        onChange={e => setNewEx({...newEx, intensidade: e.target.value})}
                      >
                        <option value="leve">Leve (Caminhada)</option>
                        <option value="moderado">Moderado (Ritmo)</option>
                        <option value="intenso">Intenso (Suor)</option>
                      </select>
                    </div>
                  </div>
                  <Button className="w-full bg-indigo-600" onClick={handleAddCustom}>Confirmar e Estimar Gasto</Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function ExerciseRow({ ex, isCompleted, onToggle }) {
  return (
    <Card className={`transition-all ${isCompleted ? 'bg-green-50/50 border-green-100 opacity-70' : 'bg-white shadow-sm'}`}>
      <CardContent className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onToggle} disabled={isCompleted}>
            {isCompleted ? <CheckCircle2 className="w-8 h-8 text-green-500" /> : <Circle className="w-8 h-8 text-slate-200 hover:text-indigo-500" />}
          </button>
          <div>
            <h3 className={`font-bold text-slate-700 ${isCompleted ? 'line-through' : ''}`}>{ex.nome}</h3>
            <div className="flex gap-2 mt-1">
              <Badge variant="secondary" className="text-[9px] uppercase font-bold px-1.5">{ex.tempo} min</Badge>
              <span className="text-[10px] text-orange-600 font-bold flex items-center gap-0.5">
                <Flame className="w-3 h-3" /> {ex.baseKcal ? ex.baseKcal * ex.tempo : ex.kcal} kcal
              </span>
            </div>
          </div>
        </div>
        {isCompleted && <Badge className="bg-green-500 text-white border-none text-[8px]">FINALIZADO</Badge>}
      </CardContent>
    </Card>
  );
}
