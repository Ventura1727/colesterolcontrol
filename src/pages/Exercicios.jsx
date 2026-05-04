import React, { useState, useEffect, useCallback } from 'react';
import {
  CheckCircle2, Circle, Trophy, Target, Zap, ArrowLeft,
  RefreshCcw, PlusCircle, Dumbbell, X, Activity, Flame, Award
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

// ── Biblioteca fixa de exercícios ──
const exerciseLibrary = {
  perda_peso: [
    { id: 'pp1', nome: "HIIT Queima Rápida", tempo: 20, baseKcal: 12 },
    { id: 'pp2', nome: "Polichinelos Intensos", tempo: 10, baseKcal: 8 },
    { id: 'pp3', nome: "Corrida Estacionária", tempo: 15, baseKcal: 10 },
    { id: 'pp4', nome: "Burpees", tempo: 10, baseKcal: 14 },
  ],
  ganho_massa: [
    { id: 'gm1', nome: "Agachamento com Peso", tempo: 15, baseKcal: 6 },
    { id: 'gm2', nome: "Flexões de Braço", tempo: 10, baseKcal: 5 },
    { id: 'gm3', nome: "Prancha Abdominal", tempo: 5, baseKcal: 4 },
  ],
  flexibilidade: [
    { id: 'fl1', nome: "Alongamento Completo", tempo: 15, baseKcal: 3 },
    { id: 'fl2', nome: "Yoga Básico", tempo: 20, baseKcal: 4 },
  ],
};

const XP_POR_EXERCICIO = 25;
const XP_BONUS_COMPLETO = 50;

function getToday() {
  return new Date().toISOString().split('T')[0];
}

export default function ExerciciosPage() {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [goal, setGoal] = useState('perda_peso');

  const [xpTotal, setXpTotal] = useState(0);
  const [completedIds, setCompletedIds] = useState([]);
  const [completedDate, setCompletedDate] = useState('');
  const [customExercises, setCustomExercises] = useState([]);
  const [newEx, setNewEx] = useState({ nome: '', tempo: '15', intensidade: 'moderado' });
  const [saveStatus, setSaveStatus] = useState('');

  // ── 1. CARREGAR DADOS ──
  useEffect(() => {
    async function loadData() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          window.location.href = '/login';
          return;
        }

        const uid = session.user.id;
        setUserId(uid);

        const { data, error } = await supabase
          .from('profiles')
          .select('xp_total, completed_exercises_today, completed_exercises_date, custom_exercises')
          .eq('id', uid)
          .maybeSingle();

        if (error) {
          console.error("Erro ao carregar perfil:", error);
          setLoading(false);
          return;
        }

        if (data) {
          setXpTotal(data.xp_total || 0);
          setCustomExercises(data.custom_exercises || []);

          // Reset diário: se a data salva não é hoje, limpa os completados
          const hoje = getToday();
          if (data.completed_exercises_date === hoje) {
            setCompletedIds(data.completed_exercises_today || []);
            setCompletedDate(hoje);
          } else {
            // Novo dia → resetar completados no banco
            setCompletedIds([]);
            setCompletedDate(hoje);
            await supabase.from('profiles').update({
              completed_exercises_today: [],
              completed_exercises_date: hoje,
            }).eq('id', uid);
          }
        }
      } catch (err) {
        console.error("Erro geral:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // ── 2. PERSISTIR NO BANCO ──
  const saveToDatabase = useCallback(async (updates) => {
    if (!userId) return;
    setSaveStatus('salvando...');
    const { error } = await supabase
      .from('profiles')
      .update({ ...updates, last_activity: new Date().toISOString() })
      .eq('id', userId);

    if (error) {
      console.error("Erro ao salvar:", error);
      setSaveStatus('erro ao salvar');
    } else {
      setSaveStatus('salvo ✓');
    }
    setTimeout(() => setSaveStatus(''), 2000);
  }, [userId]);

  // ── 3. COMPLETAR EXERCÍCIO ──
  const toggleExercise = async (id) => {
    if (completedIds.includes(id)) return; // Já completado hoje

    const newCompleted = [...completedIds, id];
    const newXP = xpTotal + XP_POR_EXERCICIO;

    // Checar se completou TODOS (bônus)
    const totalExercicios = exerciseLibrary[goal].length + customExercises.length;
    const ganhouBonus = newCompleted.length >= totalExercicios;
    const xpFinal = ganhouBonus ? newXP + XP_BONUS_COMPLETO : newXP;

    // Atualização otimista
    setCompletedIds(newCompleted);
    setXpTotal(xpFinal);

    // Salvar no banco
    await saveToDatabase({
      xp_total: xpFinal,
      completed_exercises_today: newCompleted,
      completed_exercises_date: getToday(),
    });
  };

  // ── 4. CÁLCULO DE CALORIAS ──
  const calculateKcal = (tempo, intensidade) => {
    const fatores = { leve: 3, moderado: 5, intenso: 8 };
    return Math.round(parseInt(tempo) * (fatores[intensidade] || 5));
  };

  // ── 5. ADICIONAR EXERCÍCIO CUSTOM ──
  const handleAddCustom = async () => {
    if (!newEx.nome.trim()) return;
    const estimatedKcal = calculateKcal(newEx.tempo, newEx.intensidade);

    const newItem = {
      id: `custom-${Date.now()}`,
      nome: newEx.nome.trim(),
      tempo: parseInt(newEx.tempo),
      kcal: estimatedKcal,
      intensidade: newEx.intensidade,
    };

    const updatedCustom = [...customExercises, newItem];
    setCustomExercises(updatedCustom);
    setIsAdding(false);
    setNewEx({ nome: '', tempo: '15', intensidade: 'moderado' });

    // Salvar exercícios customizados no banco
    await saveToDatabase({ custom_exercises: updatedCustom });
  };

  // ── 6. REMOVER EXERCÍCIO CUSTOM ──
  const removeCustomExercise = async (id) => {
    const updatedCustom = customExercises.filter(ex => ex.id !== id);
    setCustomExercises(updatedCustom);
    // Remover dos completados também se estiver lá
    const updatedCompleted = completedIds.filter(cid => cid !== id);
    setCompletedIds(updatedCompleted);
    await saveToDatabase({
      custom_exercises: updatedCustom,
      completed_exercises_today: updatedCompleted,
    });
  };

  // ── CÁLCULOS DE PROGRESSO ──
  const totalExercicios = exerciseLibrary[goal].length + customExercises.length;
  const progressPercent = totalExercicios > 0
    ? Math.round((completedIds.length / totalExercicios) * 100)
    : 0;

  const kcalTotal = [
    ...exerciseLibrary[goal].filter(ex => completedIds.includes(ex.id)).map(ex => ex.baseKcal * ex.tempo),
    ...customExercises.filter(ex => completedIds.includes(ex.id)).map(ex => ex.kcal || 0),
  ].reduce((a, b) => a + b, 0);

  // ── LOADING STATE ──
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-white">
        <div className="text-center">
          <Dumbbell className="w-10 h-10 text-blue-500 animate-pulse mx-auto mb-3" />
          <p className="text-slate-500">Carregando seu treino...</p>
        </div>
      </div>
    );
  }

  // ── RENDER ──
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-8">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => window.history.back()}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-lg font-bold text-slate-800">Exercícios</h1>
              <p className="text-xs text-slate-400">HeartBalance Training</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-amber-50 text-amber-700 border-amber-200 gap-1">
              <Zap className="w-3 h-3" />
              {xpTotal} XP
            </Badge>
            {saveStatus && (
              <span className="text-xs text-green-500 animate-pulse">{saveStatus}</span>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 mt-4 space-y-4">
        {/* Seletor de Objetivo */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {Object.keys(exerciseLibrary).map((key) => (
            <Button
              key={key}
              variant={goal === key ? "default" : "outline"}
              size="sm"
              onClick={() => setGoal(key)}
              className="whitespace-nowrap rounded-full text-xs"
            >
              {key === 'perda_peso' && '🔥 Perda de Peso'}
              {key === 'ganho_massa' && '💪 Ganho de Massa'}
              {key === 'flexibilidade' && '🧘 Flexibilidade'}
            </Button>
          ))}
        </div>

        {/* Card de Progresso */}
        <Card className="border-0 shadow-md bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-medium text-slate-600">Progresso Diário</p>
                <p className="text-2xl font-bold text-slate-800">{progressPercent}%</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500">Calorias queimadas</p>
                <p className="text-lg font-bold text-orange-600 flex items-center gap-1">
                  <Flame className="w-4 h-4" />
                  {kcalTotal} kcal
                </p>
              </div>
            </div>
            <Progress value={progressPercent} className="h-3 rounded-full" />
            <div className="flex justify-between mt-2">
              <p className="text-xs text-slate-500">
                {completedIds.length}/{totalExercicios} exercícios
              </p>
              {progressPercent >= 100 && (
                <p className="text-xs font-bold text-green-600 flex items-center gap-1">
                  <Trophy className="w-3 h-3" /> +{XP_BONUS_COMPLETO} XP bônus!
                </p>
              )}
            </div>
            {progressPercent < 100 && (
              <p className="text-xs text-blue-600 mt-1">
                Complete todos para ganhar +{XP_BONUS_COMPLETO} XP de bônus!
              </p>
            )}
          </CardContent>
        </Card>

        {/* Tabs: Sugestões / Meus Treinos */}
        <Tabs defaultValue="sugestoes" className="w-full">
          <TabsList className="w-full grid grid-cols-2 rounded-xl">
            <TabsTrigger value="sugestoes" className="rounded-xl text-xs">
              <Target className="w-3 h-3 mr-1" /> Sugestões
            </TabsTrigger>
            <TabsTrigger value="meus" className="rounded-xl text-xs">
              <Dumbbell className="w-3 h-3 mr-1" /> Meus Treinos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sugestoes" className="mt-3 space-y-2">
            {exerciseLibrary[goal].map((ex) => (
              <ExerciseRow
                key={ex.id}
                ex={ex}
                isCompleted={completedIds.includes(ex.id)}
                onToggle={() => toggleExercise(ex.id)}
                kcalDisplay={ex.baseKcal * ex.tempo}
              />
            ))}
          </TabsContent>

          <TabsContent value="meus" className="mt-3 space-y-2">
            {customExercises.length === 0 && !isAdding && (
              <div className="text-center py-8 text-slate-400">
                <Dumbbell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhum exercício personalizado ainda.</p>
                <p className="text-xs">Adicione seus próprios treinos!</p>
              </div>
            )}

            {customExercises.map((ex) => (
              <div key={ex.id} className="relative">
                <ExerciseRow
                  ex={ex}
                  isCompleted={completedIds.includes(ex.id)}
                  onToggle={() => toggleExercise(ex.id)}
                  kcalDisplay={ex.kcal}
                />
                {!completedIds.includes(ex.id) && (
                  <button
                    onClick={() => removeCustomExercise(ex.id)}
                    className="absolute top-2 right-2 p-1 text-slate-300 hover:text-red-500 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}

            {/* Formulário de adicionar */}
            {!isAdding ? (
              <Button
                onClick={() => setIsAdding(true)}
                variant="outline"
                className="w-full border-dashed border-2 h-14 text-slate-500 gap-2 rounded-xl"
              >
                <PlusCircle className="w-5 h-5" /> Adicionar Exercício Próprio
              </Button>
            ) : (
              <Card className="border-blue-200 bg-blue-50/30">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-700">Novo Exercício</p>
                    <button onClick={() => setIsAdding(false)}>
                      <X className="w-4 h-4 text-slate-400" />
                    </button>
                  </div>
                  <Input
                    placeholder="Nome do exercício"
                    value={newEx.nome}
                    onChange={(e) => setNewEx({ ...newEx, nome: e.target.value })}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">Duração (min)</label>
                      <Input
                        type="number"
                        min="1"
                        max="120"
                        value={newEx.tempo}
                        onChange={(e) => setNewEx({ ...newEx, tempo: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">Intensidade</label>
                      <select
                        className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                        value={newEx.intensidade}
                        onChange={(e) => setNewEx({ ...newEx, intensidade: e.target.value })}
                      >
                        <option value="leve">🚶 Leve</option>
                        <option value="moderado">🏃 Moderado</option>
                        <option value="intenso">🔥 Intenso</option>
                      </select>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500">
                    Estimativa: ~{calculateKcal(newEx.tempo, newEx.intensidade)} kcal
                  </p>
                  <Button onClick={handleAddCustom} className="w-full gap-2" size="sm">
                    <PlusCircle className="w-4 h-4" /> Confirmar
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// ── Componente de Linha de Exercício ──
function ExerciseRow({ ex, isCompleted, onToggle, kcalDisplay }) {
  return (
    <div
      onClick={!isCompleted ? onToggle : undefined}
      className={`flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer ${
        isCompleted
          ? 'bg-green-50 border-green-200 opacity-75'
          : 'bg-white border-slate-100 hover:border-blue-200 hover:shadow-sm active:scale-[0.98]'
      }`}
    >
      <div className="flex items-center gap-3">
        {isCompleted ? (
          <CheckCircle2 className="w-6 h-6 text-green-500 flex-shrink-0" />
        ) : (
          <Circle className="w-6 h-6 text-slate-300 flex-shrink-0" />
        )}
        <div>
          <p className={`font-medium text-sm ${isCompleted ? 'line-through text-slate-400' : 'text-slate-700'}`}>
            {ex.nome}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-slate-400">{ex.tempo} min</span>
            <span className="text-xs text-orange-500 font-medium flex items-center gap-0.5">
              <Flame className="w-3 h-3" /> {kcalDisplay} kcal
            </span>
            {ex.intensidade && (
              <span className="text-xs text-blue-400">
                {ex.intensidade === 'leve' ? '🚶' : ex.intensidade === 'moderado' ? '🏃' : '🔥'}
              </span>
            )}
          </div>
        </div>
      </div>
      {isCompleted && (
        <Badge className="bg-green-100 text-green-700 border-green-200 text-[10px]">
          +{XP_POR_EXERCICIO} XP
        </Badge>
      )}
    </div>
  );
}
