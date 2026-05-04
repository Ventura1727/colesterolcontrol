import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  Circle, 
  Play, 
  Plus, 
  Trophy, 
  Target, 
  Zap, 
  ArrowLeft,
  RefreshCcw,
  PlusCircle,
  Save,
  Dumbbell
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js'; // Importação direta do SDK
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// --- Inicialização Direta do Supabase ---
// Isso evita o erro de "file not found" e usa suas variáveis do Vercel
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// --- Componente de Feedback Visual ---
const SuccessEffect = () => (
  <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
    <div className="animate-bounce bg-yellow-400 p-4 rounded-full shadow-2xl">
      <Trophy className="w-12 h-12 text-white" />
    </div>
  </div>
);

export default function ExerciciosPage() {
  const [activeTab, setActiveTab] = useState('sugeridos');
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  const [userProgress, setUserProgress] = useState({
    points: 0,
    streak: 3,
    level: 1,
    goal: 'weight_loss'
  });

  const [suggestedExercises, setSuggestedExercises] = useState([
    { id: 1, nome: "Caminhada Rápida", series: "1x", tempo: "30 min", concluido: false, calorias: 150, tipo: "cardio" },
    { id: 2, nome: "Agachamentos", series: "3x15", tempo: "10 min", concluido: false, calorias: 80, tipo: "força" },
    { id: 3, nome: "Prancha Abdominal", series: "3x 45s", tempo: "5 min", concluido: false, calorias: 40, tipo: "core" }
  ]);

  const [customExercises, setCustomExercises] = useState([]);

  const completedCount = suggestedExercises.filter(e => e.concluido).length;
  const progressPercent = Math.round((completedCount / suggestedExercises.length) * 100);

  useEffect(() => {
    if (progressPercent === 100 && completedCount > 0) {
      setShowSuccess(true);
      const timer = setTimeout(() => setShowSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [progressPercent, completedCount]);

  const toggleExercise = (id) => {
    setSuggestedExercises(prev => prev.map(ex => {
      if (ex.id === id) {
        const newState = !ex.concluido;
        setUserProgress(curr => ({
          ...curr,
          points: newState ? curr.points + 10 : curr.points - 10
        }));
        return { ...ex, concluido: newState };
      }
      return ex;
    }));
  };

  const generateImprovements = () => {
    const suggestions = [];
    if (userProgress.goal === 'weight_loss') {
      const hasCardio = suggestedExercises.some(e => e.tipo === 'cardio');
      if (!hasCardio) suggestions.push("Adicione 15 min de cardio para acelerar a queima calórica.");
    }
    if (suggestedExercises.length < 3) {
      suggestions.push("Seu volume de treino está baixo. Que tal adicionar um alongamento?");
    }
    return suggestions.length > 0 ? suggestions : ["Plano equilibrado! Mantenha o foco."];
  };

  const saveToSupabase = async () => {
    setLoading(true);
    try {
      // Nota: Certifique-se de que a tabela 'profiles' existe e tem essas colunas
      const { error } = await supabase
        .from('profiles')
        .upsert({ 
          exercicios_custom: customExercises,
          pontos_totais: userProgress.points,
          updated_at: new Date()
        });
      if (error) throw error;
      alert("Progresso salvo com sucesso!");
    } catch (err) {
      console.error("Erro ao salvar:", err.message);
      alert("Erro ao salvar: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {showSuccess && <SuccessEffect />}

      <header className="bg-white border-b sticky top-0 z-10 px-4 py-4 flex items-center justify-between">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => window.history.back()}
          className="rounded-full"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </Button>
        <h1 className="font-bold text-lg text-slate-800">Exercícios</h1>
        <Button variant="ghost" size="icon" onClick={saveToSupabase} disabled={loading}>
          <Save className={`w-5 h-5 ${loading ? 'animate-spin' : 'text-blue-600'}`} />
        </Button>
      </header>

      <main className="p-4 space-y-6 max-w-md mx-auto">
        <Card className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white border-none shadow-lg">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-blue-100 text-sm font-medium">Progresso Diário</p>
                <h2 className="text-3xl font-bold">{progressPercent}%</h2>
              </div>
              <div className="text-right">
                <Badge variant="secondary" className="bg-white/20 text-white border-none mb-1">
                  <Zap className="w-3 h-3 mr-1 fill-yellow-400 text-yellow-400" />
                  {userProgress.streak} dias
                </Badge>
                <p className="text-xs text-blue-100">{userProgress.points} XP</p>
              </div>
            </div>
            <Progress value={progressPercent} className="h-2 bg-white/20" />
          </CardContent>
        </Card>

        <Tabs defaultValue="sugeridos" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="sugeridos">Sugeridos</TabsTrigger>
            <TabsTrigger value="custom">Personalizado</TabsTrigger>
          </TabsList>

          <TabsContent value="sugeridos" className="space-y-4">
            {suggestedExercises.map((ex) => (
              <Card key={ex.id} className={ex.concluido ? 'bg-slate-50 opacity-75' : 'bg-white'}>
                <CardContent className="p-4 flex items-center gap-4">
                  <button onClick={() => toggleExercise(ex.id)} className={ex.concluido ? 'text-green-500' : 'text-slate-300'}>
                    {ex.concluido ? <CheckCircle2 className="w-8 h-8" /> : <Circle className="w-8 h-8" />}
                  </button>
                  <div className="flex-grow">
                    <h3 className={`font-semibold ${ex.concluido ? 'line-through text-slate-500' : 'text-slate-800'}`}>{ex.nome}</h3>
                    <div className="flex gap-3 text-xs text-slate-500 mt-1">
                      <span className="flex items-center gap-1"><Dumbbell className="w-3 h-3" /> {ex.series}</span>
                      <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> {ex.calorias} kcal</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            <Card className="border-dashed bg-blue-50/50 border-blue-200">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-blue-700">
                  <Target className="w-4 h-4" /> Dicas de IA
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <ul className="text-xs text-blue-600 space-y-1">
                  {generateImprovements().map((tip, i) => <li key={i}>• {tip}</li>)}
                </ul>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="custom" className="text-center py-8">
            <div className="bg-white rounded-xl p-8 border-2 border-dashed border-slate-200">
              <PlusCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <Button className="bg-indigo-600">
                <Plus className="w-4 h-4 mr-2" /> Criar Exercício
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 flex justify-around items-center max-w-md mx-auto">
        <div className="text-center">
          <p className="text-[10px] text-slate-400 uppercase font-bold">Total Hoje</p>
          <p className="text-lg font-bold text-slate-800">{userProgress.points} XP</p>
        </div>
        <Button variant="ghost" className="text-blue-600" onClick={() => window.location.reload()}>
          <RefreshCcw className="w-4 h-4 mr-2" /> Resetar
        </Button>
      </div>
    </div>
  );
}
