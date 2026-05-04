import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  Circle, 
  Plus, 
  Trophy, 
  Target, 
  Zap, 
  ArrowLeft,
  RefreshCcw,
  PlusCircle,
  Save,
  Dumbbell,
  X,
  Trash2
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";

// --- Inicialização do Supabase ---
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const SuccessEffect = () => (
  <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
    <div className="animate-bounce bg-yellow-400 p-4 rounded-full shadow-2xl">
      <Trophy className="w-12 h-12 text-white" />
    </div>
  </div>
);

export default function ExerciciosPage() {
  // Estados de Interface
  const [activeTab, setActiveTab] = useState('sugeridos');
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  // Estados de Dados
  const [userProgress, setUserProgress] = useState({ points: 0, streak: 3, goal: 'weight_loss' });
  const [suggestedExercises, setSuggestedExercises] = useState([
    { id: 1, nome: "Caminhada Rápida", series: "1x", tempo: "30 min", concluido: false, calorias: 150, tipo: "cardio" },
    { id: 2, nome: "Agachamentos", series: "3x15", tempo: "10 min", concluido: false, calorias: 80, tipo: "força" }
  ]);
  const [customExercises, setCustomExercises] = useState([]);
  
  // Estado do Formulário
  const [newEx, setNewEx] = useState({ nome: '', series: '', calorias: '' });

  const progressPercent = Math.round(
    ((suggestedExercises.filter(e => e.concluido).length + customExercises.filter(e => e.concluido).length) / 
    (suggestedExercises.length + customExercises.length)) * 100
  ) || 0;

  // Lógica de Adição
  const handleAddCustom = () => {
    if (!newEx.nome) return alert("Digite o nome do exercício");
    const newItem = {
      id: Date.now(),
      nome: newEx.nome,
      series: newEx.series || "1x",
      calorias: parseInt(newEx.calorias) || 0,
      concluido: false,
      tipo: "custom"
    };
    setCustomExercises([...customExercises, newItem]);
    setNewEx({ nome: '', series: '', calorias: '' });
    setIsAdding(false);
  };

  const toggleExercise = (id, isCustom = false) => {
    const setter = isCustom ? setCustomExercises : setSuggestedExercises;
    setter(prev => prev.map(ex => {
      if (ex.id === id) {
        const newState = !ex.concluido;
        setUserProgress(curr => ({ ...curr, points: newState ? curr.points + 10 : curr.points - 10 }));
        return { ...ex, concluido: newState };
      }
      return ex;
    }));
  };

  const removeCustom = (id) => {
    setCustomExercises(customExercises.filter(ex => ex.id !== id));
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {showSuccess && <SuccessEffect />}

      <header className="bg-white border-b sticky top-0 z-10 px-4 py-4 flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => window.history.back()}><ArrowLeft className="w-5 h-5" /></Button>
        <h1 className="font-bold text-lg">Exercícios</h1>
        <Button variant="ghost" size="icon" disabled={loading}><Save className="w-5 h-5 text-blue-600" /></Button>
      </header>

      <main className="p-4 space-y-6 max-w-md mx-auto">
        {/* Status Card */}
        <Card className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white border-none shadow-lg">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start mb-4">
              <div><p className="text-blue-100 text-sm">Progresso Diário</p><h2 className="text-3xl font-bold">{progressPercent}%</h2></div>
              <div className="text-right"><Badge className="bg-white/20 text-white border-none">{userProgress.points} XP</Badge></div>
            </div>
            <Progress value={progressPercent} className="h-2 bg-white/20" />
          </CardContent>
        </Card>

        <Tabs defaultValue="sugeridos" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="sugeridos">Sugeridos</TabsTrigger>
            <TabsTrigger value="custom">Personalizado</TabsTrigger>
          </TabsList>

          <TabsContent value="sugeridos" className="space-y-4">
            {suggestedExercises.map((ex) => (
              <Card key={ex.id} className={ex.concluido ? 'opacity-60 bg-slate-50' : 'bg-white'}>
                <CardContent className="p-4 flex items-center gap-4">
                  <button onClick={() => toggleExercise(ex.id, false)}>
                    {ex.concluido ? <CheckCircle2 className="text-green-500 w-7 h-7" /> : <Circle className="text-slate-300 w-7 h-7" />}
                  </button>
                  <div className="flex-grow">
                    <h3 className={`font-semibold ${ex.concluido ? 'line-through' : ''}`}>{ex.nome}</h3>
                    <p className="text-xs text-slate-500">{ex.series} • {ex.calorias} kcal</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="custom" className="space-y-4">
            {/* Lista de Personalizados */}
            {customExercises.map((ex) => (
              <Card key={ex.id} className={ex.concluido ? 'opacity-60' : ''}>
                <CardContent className="p-4 flex items-center gap-4">
                  <button onClick={() => toggleExercise(ex.id, true)}>
                    {ex.concluido ? <CheckCircle2 className="text-green-500 w-7 h-7" /> : <Circle className="text-slate-300 w-7 h-7" />}
                  </button>
                  <div className="flex-grow">
                    <h3 className="font-semibold">{ex.nome}</h3>
                    <p className="text-xs text-slate-500">{ex.series} • {ex.calorias} kcal</p>
                  </div>
                  <button onClick={() => removeCustom(ex.id)}><Trash2 className="w-4 h-4 text-red-300" /></button>
                </CardContent>
              </Card>
            ))}

            {/* Interface de Adição */}
            {!isAdding ? (
              <Button 
                variant="outline" 
                className="w-full border-dashed py-8 flex-col gap-2 h-auto"
                onClick={() => setIsAdding(true)}
              >
                <PlusCircle className="w-8 h-8 text-slate-400" />
                <span className="text-slate-600">Adicionar Novo Exercício</span>
              </Button>
            ) : (
              <Card className="border-2 border-blue-200">
                <CardContent className="p-4 space-y-3">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-bold text-sm text-slate-700">Novo Exercício</h4>
                    <button onClick={() => setIsAdding(false)}><X className="w-4 h-4" /></button>
                  </div>
                  <Input 
                    placeholder="Nome (ex: Flexões)" 
                    value={newEx.nome} 
                    onChange={e => setNewEx({...newEx, nome: e.target.value})}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Input 
                      placeholder="Séries (ex: 3x10)" 
                      value={newEx.series} 
                      onChange={e => setNewEx({...newEx, series: e.target.value})}
                    />
                    <Input 
                      placeholder="Kcal est." 
                      type="number"
                      value={newEx.calorias} 
                      onChange={e => setNewEx({...newEx, calorias: e.target.value})}
                    />
                  </div>
                  <Button className="w-full bg-blue-600" onClick={handleAddCustom}>Confirmar</Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 flex justify-around items-center max-w-md mx-auto">
        <div className="text-center font-bold">
          <p className="text-[10px] text-slate-400 uppercase">Ganhos de Hoje</p>
          <p className="text-blue-600">{userProgress.points} XP</p>
        </div>
        <Button variant="ghost" onClick={() => window.location.reload()}><RefreshCcw className="w-4 h-4 mr-2" /> Reset</Button>
      </div>
    </div>
  );
}
