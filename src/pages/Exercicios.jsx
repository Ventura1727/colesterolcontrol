import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Dumbbell, Lock, Check, Zap, Trophy, Play, Clock, Flame, Star, ChevronRight, Target, Plus, BarChart3 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import ActivityChart from '@/components/analytics/ActivityChart';
import AIInsights from '@/components/analytics/AIInsights';
import WorkoutDashboard from '@/components/workout/WorkoutDashboard';

const treinos = [
  {
    id: 'caminhada-leve',
    name: 'Caminhada Leve',
    desc: 'Ideal para iniciantes - 15 min',
    duration: 15,
    xp: 20,
    calories: 80,
    rank_required: 'Iniciante',
    objetivos: ['Reduzir colesterol', 'Melhorar hábitos'],
    beneficio: 'Saúde cardiovascular',
    exercises: [
      { name: 'Aquecimento', duration: '2 min', desc: 'Alongamentos básicos' },
      { name: 'Caminhada moderada', duration: '10 min', desc: 'Ritmo confortável' },
      { name: 'Desaquecimento', duration: '3 min', desc: 'Diminuir o ritmo' }
    ]
  },
  {
    id: 'cardio-basico',
    name: 'Cardio Básico',
    desc: 'Fortalece o coração - 20 min',
    duration: 20,
    xp: 35,
    calories: 150,
    rank_required: 'Bronze',
    objetivos: ['Reduzir colesterol', 'Perder peso', 'Melhorar hábitos'],
    beneficio: 'Queima calorias e melhora circulação',
    exercises: [
      { name: 'Polichinelos', duration: '3 min', desc: '3 séries de 1 min' },
      { name: 'Marcha no lugar', duration: '5 min', desc: 'Joelhos altos' },
      { name: 'Step lateral', duration: '5 min', desc: 'Alternando lados' },
      { name: 'Agachamento leve', duration: '4 min', desc: '2 séries de 15' },
      { name: 'Alongamento', duration: '3 min', desc: 'Relaxar músculos' }
    ]
  },
  {
    id: 'hiit-iniciante',
    name: 'HIIT Iniciante',
    desc: 'Queima gordura rápido - 15 min',
    duration: 15,
    xp: 50,
    calories: 200,
    rank_required: 'Prata',
    objetivos: ['Perder peso'],
    beneficio: 'Alta queima calórica',
    exercises: [
      { name: 'Aquecimento', duration: '2 min', desc: 'Preparar o corpo' },
      { name: 'Burpees modificados', duration: '30s trabalho / 30s descanso x4', desc: 'Sem pulo' },
      { name: 'Mountain climbers', duration: '30s trabalho / 30s descanso x4', desc: 'Ritmo moderado' },
      { name: 'Descanso ativo', duration: '3 min', desc: 'Caminhada leve' }
    ]
  },
  {
    id: 'forca-resistencia',
    name: 'Força & Resistência',
    desc: 'Tonificação muscular - 25 min',
    duration: 25,
    xp: 60,
    calories: 180,
    rank_required: 'Ouro',
    objetivos: ['Perder peso', 'Melhorar hábitos'],
    beneficio: 'Aumenta metabolismo',
    exercises: [
      { name: 'Aquecimento dinâmico', duration: '3 min', desc: 'Círculos e movimentos' },
      { name: 'Flexão de braço', duration: '3 séries de 10', desc: 'Pode ser na parede' },
      { name: 'Prancha', duration: '3x 30s', desc: 'Descanso de 30s' },
      { name: 'Lunges', duration: '3 séries de 12', desc: 'Alternando pernas' },
      { name: 'Ponte de glúteo', duration: '3 séries de 15', desc: 'Segure no topo' },
      { name: 'Alongamento completo', duration: '5 min', desc: 'Todos os grupos' }
    ]
  },
  {
    id: 'cardio-avancado',
    name: 'Cardio Avançado',
    desc: 'Máxima queima calórica - 30 min',
    duration: 30,
    xp: 80,
    calories: 350,
    rank_required: 'Diamante',
    objetivos: ['Perder peso', 'Reduzir colesterol'],
    beneficio: 'Perda acelerada de peso',
    exercises: [
      { name: 'Aquecimento progressivo', duration: '5 min', desc: 'Aumentar intensidade' },
      { name: 'Corrida intervalada', duration: '15 min', desc: '1 min forte / 1 min leve' },
      { name: 'Burpees completos', duration: '3 séries de 10', desc: 'Com pulo' },
      { name: 'Desaquecimento', duration: '5 min', desc: 'Diminuir gradualmente' }
    ]
  },
  {
    id: 'treino-mestre',
    name: 'Treino do Mestre',
    desc: 'O desafio definitivo - 45 min',
    duration: 45,
    xp: 150,
    calories: 500,
    rank_required: 'Mestre',
    objetivos: ['Perder peso', 'Reduzir colesterol', 'Melhorar hábitos'],
    beneficio: 'Transformação completa',
    exercises: [
      { name: 'Aquecimento completo', duration: '7 min', desc: 'Preparação total' },
      { name: 'Circuito de força', duration: '15 min', desc: '5 exercícios, 3 rounds' },
      { name: 'HIIT intenso', duration: '10 min', desc: '20s on / 10s off (Tabata)' },
      { name: 'Core work', duration: '8 min', desc: 'Prancha, abdominais, oblíquos' },
      { name: 'Cool down', duration: '5 min', desc: 'Recuperação ativa' }
    ]
  }
];

const rankOrder = ['Iniciante', 'Bronze', 'Prata', 'Ouro', 'Diamante', 'Mestre'];

export default function Exercicios() {
  const [profile, setProfile] = useState(null);
  const [activities, setActivities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTreino, setSelectedTreino] = useState(null);
  const [completingWorkout, setCompletingWorkout] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  const [logForm, setLogForm] = useState({
    tipo: '',
    intensidade: 'media',
    tempo: ''
  });
  const [isLogging, setIsLogging] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [colesterolRecords, setColesterolRecords] = useState([]);
  const [mealLogs, setMealLogs] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const user = await base44.auth.me();
    const [profiles, logs, colesterol, meals] = await Promise.all([
      base44.entities.UserProfile.filter({ created_by: user.email }),
      base44.entities.ActivityLog.list('-created_date', 50),
      base44.entities.ColesterolRecord.list('-data_exame', 5),
      base44.entities.MealLog.list('-created_date', 20)
    ]);
    if (profiles.length > 0) {
      setProfile(profiles[0]);
    }
    setActivities(logs);
    setColesterolRecords(colesterol);
    setMealLogs(meals);
    setIsLoading(false);
  };

  const isUnlocked = (treino) => {
    return true; // Todas as atividades estão liberadas
  };

  // Ordenar treinos por relevância ao objetivo do usuário
  const treinosOrdenados = [...treinos].sort((a, b) => {
    const objetivoUsuario = profile?.objetivo;
    if (!objetivoUsuario) return 0;
    
    const aMatch = a.objetivos?.includes(objetivoUsuario);
    const bMatch = b.objetivos?.includes(objetivoUsuario);
    
    if (aMatch && !bMatch) return -1;
    if (!aMatch && bMatch) return 1;
    return 0;
  });

  const completeWorkout = async (treino) => {
    setCompletingWorkout(true);
    
    await base44.entities.ActivityLog.create({
      tipo: 'exercicio',
      descricao: `Completou: ${treino.name}`,
      xp_ganho: treino.xp,
      data: new Date().toISOString().split('T')[0],
      treino_id: treino.id
    });

    const newXp = (profile.xp_total || 0) + treino.xp;
    const newMetas = (profile.metas_concluidas || 0) + 1;
    
    let newRank = profile.rank || 'Iniciante';
    if (newXp >= 1500) newRank = 'Mestre';
    else if (newXp >= 1000) newRank = 'Diamante';
    else if (newXp >= 600) newRank = 'Ouro';
    else if (newXp >= 300) newRank = 'Prata';
    else if (newXp >= 100) newRank = 'Bronze';

    await base44.entities.UserProfile.update(profile.id, {
      xp_total: newXp,
      metas_concluidas: newMetas,
      rank: newRank,
      dias_consecutivos: (profile.dias_consecutivos || 0) + 1
    });

    setProfile({ ...profile, xp_total: newXp, metas_concluidas: newMetas, rank: newRank });
    setCompletingWorkout(false);
    setSelectedTreino(null);
  };

  const handleLogWorkout = async () => {
    if (!logForm.tipo || !logForm.tempo) return;
    
    setIsLogging(true);
    
    // Calcular XP baseado na intensidade e tempo
    const intensidadeMultiplicador = {
      baixa: 0.5,
      media: 1,
      alta: 1.5
    };
    
    const tempoMinutos = parseInt(logForm.tempo);
    const baseXP = Math.round((tempoMinutos / 5) * 10); // 10 XP a cada 5 min
    const xpGanho = Math.round(baseXP * intensidadeMultiplicador[logForm.intensidade]);
    
    await base44.entities.ActivityLog.create({
      tipo: 'exercicio',
      descricao: `${logForm.tipo} - Intensidade ${logForm.intensidade} - ${tempoMinutos} min`,
      xp_ganho: xpGanho,
      data: new Date().toISOString().split('T')[0]
    });

    const newXp = (profile.xp_total || 0) + xpGanho;
    const newMetas = (profile.metas_concluidas || 0) + 1;
    
    let newRank = profile.rank || 'Iniciante';
    if (newXp >= 1500) newRank = 'Mestre';
    else if (newXp >= 1000) newRank = 'Diamante';
    else if (newXp >= 600) newRank = 'Ouro';
    else if (newXp >= 300) newRank = 'Prata';
    else if (newXp >= 100) newRank = 'Bronze';

    await base44.entities.UserProfile.update(profile.id, {
      xp_total: newXp,
      metas_concluidas: newMetas,
      rank: newRank
    });

    setProfile({ ...profile, xp_total: newXp, metas_concluidas: newMetas, rank: newRank });
    setIsLogging(false);
    setShowLogModal(false);
    setLogForm({ tipo: '', intensidade: 'media', tempo: '' });
    await loadData();
    alert(`🎉 Treino registrado! +${xpGanho} XP ganhos!`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-rose-50">
      <div className="max-w-lg mx-auto px-4 pt-6 pb-24">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => window.location.href = createPageUrl('Dashboard')} className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Treinos</h1>
            <p className="text-sm text-gray-500">Evolua seu corpo e seu rank</p>
          </div>
        </div>

        {/* Stats Rápidos */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white rounded-xl p-3 border border-gray-100 text-center">
            <Zap className="w-5 h-5 text-yellow-500 mx-auto mb-1" />
            <div className="font-bold text-gray-900">{profile?.xp_total || 0}</div>
            <div className="text-xs text-gray-500">XP Total</div>
          </div>
          <div className="bg-white rounded-xl p-3 border border-gray-100 text-center">
            <Trophy className="w-5 h-5 text-amber-500 mx-auto mb-1" />
            <div className="font-bold text-gray-900">{profile?.rank || 'Iniciante'}</div>
            <div className="text-xs text-gray-500">Seu Rank</div>
          </div>
          <div className="bg-white rounded-xl p-3 border border-gray-100 text-center">
            <Star className="w-5 h-5 text-orange-500 mx-auto mb-1" />
            <div className="font-bold text-gray-900">{profile?.metas_concluidas || 0}</div>
            <div className="text-xs text-gray-500">Concluídos</div>
          </div>
        </div>

        {/* Dashboard de Treinos */}
        <WorkoutDashboard activities={activities.filter(a => a.tipo === 'exercicio')} />

        {/* Botões de Ação */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <Button
            onClick={() => setShowLogModal(true)}
            className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white py-5 rounded-xl shadow-md"
          >
            <Plus className="w-5 h-5 mr-2" />
            Registrar Treino
          </Button>
          <Button
            onClick={() => setShowAnalytics(!showAnalytics)}
            variant="outline"
            className="border-2 border-purple-200 hover:bg-purple-50 text-purple-700 py-5 rounded-xl"
          >
            <BarChart3 className="w-5 h-5 mr-2" />
            {showAnalytics ? 'Ocultar' : 'Ver'} Análises
          </Button>
        </div>

        {/* Análises e Insights */}
        {showAnalytics && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4 mb-6"
          >
            <ActivityChart activities={activities.filter(a => a.tipo === 'exercicio')} />
            <AIInsights 
              profile={profile}
              activities={activities.filter(a => a.tipo === 'exercicio')}
              colesterolRecords={colesterolRecords}
              mealLogs={mealLogs}
            />
          </motion.div>
        )}

        {/* Lista de Treinos */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Treinos Guiados</h2>
          {profile?.objetivo && (
            <span className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded-full">
              Para: {profile.objetivo}
            </span>
          )}
        </div>
        <div className="space-y-3">
          {treinosOrdenados.map((treino, idx) => {
            const unlocked = isUnlocked(treino);
            const isRecomendado = profile?.objetivo && treino.objetivos?.includes(profile.objetivo);
            return (
              <motion.div
                key={treino.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <button
                  onClick={() => unlocked && setSelectedTreino(treino)}
                  disabled={!unlocked}
                  className={`w-full text-left bg-white rounded-2xl p-4 border-2 transition-all relative ${
                    isRecomendado 
                      ? 'border-red-300 shadow-md hover:shadow-lg cursor-pointer' 
                      : 'border-gray-100 hover:border-red-200 hover:shadow-md cursor-pointer'
                  }`}
                >
                  {isRecomendado && (
                    <div className="absolute -top-2 -right-2 bg-gradient-to-r from-red-500 to-rose-600 text-white px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1">
                      <Target className="w-3 h-3" />
                      IDEAL PARA VOCÊ
                    </div>
                  )}
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${
                      isRecomendado ? 'bg-gradient-to-br from-red-500 to-rose-600' : 'bg-red-100'
                    }`}>
                      <Dumbbell className={`w-7 h-7 ${isRecomendado ? 'text-white' : 'text-red-600'}`} />
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900">{treino.name}</div>
                      <div className="text-sm text-gray-500">{treino.desc}</div>
                      {treino.beneficio && (
                        <div className="text-xs text-red-600 font-medium mt-1">
                          💪 {treino.beneficio}
                        </div>
                      )}
                      <div className="flex items-center gap-3 mt-2 text-xs">
                        <span className="flex items-center gap-1 text-gray-400">
                          <Clock className="w-3 h-3" /> {treino.duration} min
                        </span>
                        <span className="flex items-center gap-1 text-yellow-500">
                          <Zap className="w-3 h-3" /> +{treino.xp} XP
                        </span>
                        <span className="flex items-center gap-1 text-orange-500">
                          <Flame className="w-3 h-3" /> {treino.calories} kcal
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                </button>
              </motion.div>
            );
          })}
        </div>

        {/* Modal de Registro de Treino */}
        <AnimatePresence>
          {showLogModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
              onClick={() => !isLogging && setShowLogModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-3xl w-full max-w-md p-6"
              >
                <h3 className="text-xl font-bold text-gray-900 mb-2">Registrar Treino</h3>
                <p className="text-sm text-gray-500 mb-6">Preencha os dados do seu treino</p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Treino</label>
                    <Select value={logForm.tipo} onValueChange={(value) => setLogForm({...logForm, tipo: value})}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Caminhada">🚶 Caminhada</SelectItem>
                        <SelectItem value="Corrida">🏃 Corrida</SelectItem>
                        <SelectItem value="Ciclismo">🚴 Ciclismo</SelectItem>
                        <SelectItem value="Natação">🏊 Natação</SelectItem>
                        <SelectItem value="Musculação">💪 Musculação</SelectItem>
                        <SelectItem value="Yoga">🧘 Yoga</SelectItem>
                        <SelectItem value="Dança">💃 Dança</SelectItem>
                        <SelectItem value="Futebol">⚽ Futebol</SelectItem>
                        <SelectItem value="Outro">🏋️ Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Intensidade</label>
                    <Select value={logForm.intensidade} onValueChange={(value) => setLogForm({...logForm, intensidade: value})}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="baixa">🟢 Baixa (leve, confortável)</SelectItem>
                        <SelectItem value="media">🟡 Média (moderado esforço)</SelectItem>
                        <SelectItem value="alta">🔴 Alta (máximo esforço)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tempo (minutos)</label>
                    <Input
                      type="number"
                      placeholder="Ex: 30"
                      value={logForm.tempo}
                      onChange={(e) => setLogForm({...logForm, tempo: e.target.value})}
                      min="1"
                      className="w-full"
                    />
                  </div>

                  {logForm.tipo && logForm.tempo && (
                    <div className="bg-red-50 rounded-xl p-4 border border-red-200">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-700">XP estimado:</span>
                        <span className="font-bold text-red-600 flex items-center gap-1">
                          <Zap className="w-4 h-4" />
                          +{Math.round((parseInt(logForm.tempo) / 5) * 10 * (logForm.intensidade === 'baixa' ? 0.5 : logForm.intensidade === 'alta' ? 1.5 : 1))} XP
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 mt-6">
                  <Button
                    onClick={() => setShowLogModal(false)}
                    variant="outline"
                    className="flex-1"
                    disabled={isLogging}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleLogWorkout}
                    className="flex-1 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white"
                    disabled={!logForm.tipo || !logForm.tempo || isLogging}
                  >
                    {isLogging ? (
                      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} className="w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                    ) : (
                      <>
                        <Check className="w-4 h-4 mr-1" />
                        Registrar
                      </>
                    )}
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modal de Treino */}
        <AnimatePresence>
          {selectedTreino && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 flex items-end justify-center z-50 p-4"
              onClick={() => setSelectedTreino(null)}
            >
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-t-3xl w-full max-w-lg max-h-[85vh] overflow-auto"
              >
                <div className="p-6">
                  <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-6" />
                  
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center">
                      <Dumbbell className="w-8 h-8 text-emerald-600" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">{selectedTreino.name}</h2>
                      <div className="flex items-center gap-3 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" /> {selectedTreino.duration} min
                        </span>
                        <span className="flex items-center gap-1 text-yellow-500">
                          <Zap className="w-4 h-4" /> +{selectedTreino.xp} XP
                        </span>
                      </div>
                    </div>
                  </div>

                  <h3 className="font-semibold text-gray-900 mb-3">Exercícios</h3>
                  <div className="space-y-3 mb-6">
                    {selectedTreino.exercises.map((ex, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center font-bold text-sm">
                          {idx + 1}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{ex.name}</div>
                          <div className="text-xs text-gray-500">{ex.desc}</div>
                        </div>
                        <div className="text-xs text-emerald-600 font-medium">{ex.duration}</div>
                      </div>
                    ))}
                  </div>

                  <Button
                    onClick={() => completeWorkout(selectedTreino)}
                    disabled={completingWorkout}
                    className="w-full bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white py-6 rounded-xl text-lg font-semibold"
                  >
                    {completingWorkout ? (
                      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} className="w-6 h-6 border-2 border-white border-t-transparent rounded-full" />
                    ) : (
                      <>
                        <Check className="w-5 h-5 mr-2" />
                        Completar Treino (+{selectedTreino.xp} XP)
                      </>
                    )}
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}