import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Trophy, Zap, Star, TrendingUp, Calendar, Target, Flame, Award } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import ColesterolChart from '@/components/analytics/ColesterolChart';
import ActivityChart from '@/components/analytics/ActivityChart';
import AIInsights from '@/components/analytics/AIInsights';
import CaloriesChart from '@/components/analytics/CaloriesChart';

const ranks = [
  { name: 'Iniciante', min: 0, max: 100, color: 'from-gray-400 to-gray-500', icon: '🌱', desc: 'Começando a jornada' },
  { name: 'Bronze', min: 100, max: 300, color: 'from-amber-600 to-amber-700', icon: '🥉', desc: 'Primeiros passos dados' },
  { name: 'Prata', min: 300, max: 600, color: 'from-gray-300 to-gray-400', icon: '🥈', desc: 'Evoluindo consistentemente' },
  { name: 'Ouro', min: 600, max: 1000, color: 'from-yellow-400 to-yellow-500', icon: '🥇', desc: 'Comprometimento exemplar' },
  { name: 'Diamante', min: 1000, max: 1500, color: 'from-cyan-400 to-blue-500', icon: '💎', desc: 'Elite da saúde' },
  { name: 'Mestre', min: 1500, max: 9999, color: 'from-purple-500 to-pink-500', icon: '👑', desc: 'Lenda viva' }
];

export default function Progresso() {
  const [profile, setProfile] = useState(null);
  const [activities, setActivities] = useState([]);
  const [colesterolRecords, setColesterolRecords] = useState([]);
  const [mealLogs, setMealLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const user = await base44.auth.me();
    const [profiles, logs, colesterol, meals] = await Promise.all([
      base44.entities.UserProfile.filter({ created_by: user.email }),
      base44.entities.ActivityLog.list('-created_date', 50),
      base44.entities.ColesterolRecord.list('-data_exame', 10),
      base44.entities.MealLog.list('-created_date', 30)
    ]);
    
    if (profiles.length > 0) {
      setProfile(profiles[0]);
    }
    setActivities(logs);
    setColesterolRecords(colesterol);
    setMealLogs(meals);
    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  const xp = profile?.xp_total || 0;
  const currentRank = ranks.find(r => xp >= r.min && xp < r.max) || ranks[0];
  const currentRankIndex = ranks.indexOf(currentRank);

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-rose-50">
      <div className="max-w-lg mx-auto px-4 pt-6 pb-24">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => window.location.href = createPageUrl('Dashboard')} className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Meu Progresso</h1>
            <p className="text-sm text-gray-500">Sua evolução na jornada</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-2 mb-6">
          <div className="bg-white rounded-xl p-3 border border-gray-100 text-center">
            <Zap className="w-5 h-5 text-yellow-500 mx-auto mb-1" />
            <div className="font-bold text-gray-900 text-lg">{xp}</div>
            <div className="text-[10px] text-gray-500">XP Total</div>
          </div>
          <div className="bg-white rounded-xl p-3 border border-gray-100 text-center">
            <Target className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
            <div className="font-bold text-gray-900 text-lg">{profile?.metas_concluidas || 0}</div>
            <div className="text-[10px] text-gray-500">Metas</div>
          </div>
          <div className="bg-white rounded-xl p-3 border border-gray-100 text-center">
            <Flame className="w-5 h-5 text-orange-500 mx-auto mb-1" />
            <div className="font-bold text-gray-900 text-lg">{profile?.dias_consecutivos || 0}</div>
            <div className="text-[10px] text-gray-500">Sequência</div>
          </div>
          <div className="bg-white rounded-xl p-3 border border-gray-100 text-center">
            <Award className="w-5 h-5 text-purple-500 mx-auto mb-1" />
            <div className="font-bold text-gray-900 text-lg">{currentRankIndex + 1}/6</div>
            <div className="text-[10px] text-gray-500">Rank</div>
          </div>
        </div>

        {/* Current Rank */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`bg-gradient-to-br ${currentRank.color} rounded-2xl p-6 mb-6 text-white text-center`}
        >
          <div className="text-5xl mb-3">{currentRank.icon}</div>
          <h2 className="text-2xl font-bold mb-1">{currentRank.name}</h2>
          <p className="opacity-90">{currentRank.desc}</p>
        </motion.div>

        {/* Timeline de Ranks */}
        <h2 className="font-semibold text-gray-900 mb-4">Jornada de Ranks</h2>
        <div className="space-y-3 mb-8">
          {ranks.map((rank, idx) => {
            const isCurrentRank = rank.name === currentRank.name;
            const isUnlocked = idx <= currentRankIndex;
            const progress = isCurrentRank 
              ? ((xp - rank.min) / (rank.max - rank.min)) * 100
              : isUnlocked ? 100 : 0;
            
            return (
              <motion.div
                key={rank.name}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className={`bg-white rounded-xl p-4 border ${isCurrentRank ? 'border-emerald-300 ring-2 ring-emerald-100' : 'border-gray-100'}`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${rank.color} flex items-center justify-center text-xl ${!isUnlocked && 'opacity-30'}`}>
                    {rank.icon}
                  </div>
                  <div className="flex-1">
                    <div className={`font-semibold ${isUnlocked ? 'text-gray-900' : 'text-gray-400'}`}>
                      {rank.name}
                      {isCurrentRank && <span className="ml-2 text-xs text-emerald-500">(Atual)</span>}
                    </div>
                    <div className="text-xs text-gray-500">{rank.min} - {rank.max} XP</div>
                  </div>
                  {isUnlocked && !isCurrentRank && (
                    <Star className="w-5 h-5 text-yellow-500" fill="currentColor" />
                  )}
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className={`h-full bg-gradient-to-r ${rank.color} transition-all duration-500`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Gráficos e Análises */}
        <div className="space-y-4 mb-8">
          <ColesterolChart records={colesterolRecords} />
          <ActivityChart activities={activities} />
          <CaloriesChart mealLogs={mealLogs} />
        </div>

        {/* Insights da IA */}
        <AIInsights 
          profile={profile}
          activities={activities}
          colesterolRecords={colesterolRecords}
          mealLogs={mealLogs}
        />

        {/* Histórico de Atividades */}
        <h2 className="font-semibold text-gray-900 mb-4 mt-8">Atividades Recentes</h2>
        {activities.length > 0 ? (
          <div className="space-y-3">
            {activities.map((activity, idx) => (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-white rounded-xl p-4 border border-gray-100"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      activity.tipo === 'exercicio' ? 'bg-blue-100 text-blue-600' :
                      activity.tipo === 'alimentacao' ? 'bg-green-100 text-green-600' :
                      'bg-purple-100 text-purple-600'
                    }`}>
                      {activity.tipo === 'exercicio' ? '🏃' :
                       activity.tipo === 'alimentacao' ? '🥗' : '✅'}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 text-sm">{activity.descricao}</div>
                      <div className="text-xs text-gray-500">
                        {format(new Date(activity.created_date), "d 'de' MMM", { locale: ptBR })}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-yellow-500 font-medium">
                    <Zap className="w-4 h-4" />
                    +{activity.xp_ganho}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Calendar className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p>Nenhuma atividade registrada ainda</p>
          </div>
        )}
      </div>
    </div>
  );
}