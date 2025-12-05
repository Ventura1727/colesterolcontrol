import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Heart, Crown, Lock, Salad, Dumbbell, Droplets, BookOpen, TrendingDown, Calendar, Target, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import RankCard from '@/components/dashboard/RankCard';
import ColesterolTracker from '@/components/dashboard/ColesterolTracker';

const features = [
  { id: 'exercicios', title: 'Exercícios', desc: 'Treinos que liberam XP', icon: Dumbbell, premium: true, page: 'Exercicios' },
  { id: 'alimentacao', title: 'Alimentação', desc: 'Receitas anti-colesterol', icon: Salad, premium: true, page: 'Alimentacao' },
  { id: 'progresso', title: 'Meu Progresso', desc: 'Acompanhe sua evolução', icon: TrendingDown, premium: true, page: 'Progresso' },
  { id: 'hidratacao', title: 'Hidratação', desc: 'Lembretes de água', icon: Droplets, premium: true, page: null },
  { id: 'educacao', title: 'Conteúdo', desc: 'Artigos sobre saúde', icon: BookOpen, premium: false, page: null },
  { id: 'lembretes', title: 'Lembretes', desc: 'Notificações diárias', icon: Calendar, premium: true, page: null }
];

export default function Dashboard() {
  const [profile, setProfile] = useState(null);
  const [colesterolRecords, setColesterolRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showLockedModal, setShowLockedModal] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Verificar autenticação
      let user;
      try {
        user = await base44.auth.me();
        // Garantir que não é guest
        if (!user || user.role === 'guest') {
          base44.auth.redirectToLogin(createPageUrl('Dashboard'));
          return;
        }
      } catch (e) {
        // Se der erro, redirecionar para login
        base44.auth.redirectToLogin(createPageUrl('Dashboard'));
        return;
      }

      const [profiles, records] = await Promise.all([
        base44.entities.UserProfile.filter({ created_by: user.email }),
        base44.entities.ColesterolRecord.list('-data_exame', 10)
      ]);

      if (profiles.length > 0) {
        setProfile(profiles[0]);
      } else {
        // Se não tem perfil, verificar se veio do quiz
        const quizData = localStorage.getItem('heartbalance_quiz');
        if (quizData) {
          // Criar perfil automaticamente (Modo Teste: Premium Ativo)
          const newProfile = await base44.entities.UserProfile.create({
            ...JSON.parse(quizData),
            plano_ativo: true,
            data_inicio_plano: new Date().toISOString().split('T')[0],
            rank: 'Iniciante',
            xp_total: 0,
            metas_concluidas: 0,
            dias_consecutivos: 0
          });
          setProfile(newProfile);
          localStorage.removeItem('heartbalance_quiz');
        } else {
          window.location.href = createPageUrl('Onboarding');
          return;
        }
      }
      setColesterolRecords(records);
    } catch (error) {
      console.error(error);
    }
    setIsLoading(false);
  };

  const handleFeatureClick = (feature) => {
    if (feature.premium && !profile?.plano_ativo) {
      setShowLockedModal(true);
    } else if (feature.page) {
      window.location.href = createPageUrl(feature.page);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-4 pb-24">
      <div className="max-w-lg mx-auto pt-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-200">
              <Heart className="w-6 h-6 text-white" fill="white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">HeartBalance</h1>
              <p className="text-sm text-gray-500">
                {profile?.plano_ativo ? (
                  <span className="flex items-center gap-1 text-amber-600">
                    <Crown className="w-4 h-4" />
                    Premium Ativo
                  </span>
                ) : (
                  'Plano Gratuito'
                )}
              </p>
            </div>
          </div>
          {profile?.plano_ativo && (
            <div className="flex items-center gap-1 bg-yellow-100 text-yellow-700 px-3 py-1.5 rounded-full text-sm font-medium">
              <Zap className="w-4 h-4" />
              {profile.xp_total || 0} XP
            </div>
          )}
        </div>

        {/* Rank Card - Apenas Premium */}
        {profile?.plano_ativo && (
          <RankCard 
            profile={profile} 
            onViewProgress={() => window.location.href = createPageUrl('Progresso')}
          />
        )}

        {/* Colesterol Tracker - Apenas Premium */}
        {profile?.plano_ativo && (
          <ColesterolTracker 
            records={colesterolRecords} 
            onRecordAdded={loadData}
          />
        )}

        {/* Resumo do Perfil */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl p-5 mb-6 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Target className="w-5 h-5 text-emerald-600" />
              Seu Perfil
            </h2>
            <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">{profile?.objetivo}</span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-gray-500 text-xs">Idade</div>
              <div className="font-medium">{profile?.idade} anos</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-gray-500 text-xs">Alimentação</div>
              <div className="font-medium">{profile?.alimentacao}</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-gray-500 text-xs">Exercícios</div>
              <div className="font-medium">{profile?.exercicios}</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-gray-500 text-xs">Dias seguidos</div>
              <div className="font-medium">{profile?.dias_consecutivos || 0} dias 🔥</div>
            </div>
          </div>
        </motion.div>

        {/* Grid de Funcionalidades */}
        <h2 className="font-semibold text-gray-900 mb-4">Funcionalidades</h2>
        <div className="grid grid-cols-2 gap-3">
          {features.map((feature, idx) => (
            <motion.button
              key={feature.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              onClick={() => handleFeatureClick(feature)}
              className={`relative bg-white rounded-xl p-4 border text-left transition-all hover:shadow-md ${
                feature.premium && !profile?.plano_ativo
                  ? 'border-gray-200 opacity-75'
                  : 'border-emerald-100 hover:border-emerald-300'
              }`}
            >
              {feature.premium && !profile?.plano_ativo && (
                <div className="absolute top-2 right-2">
                  <Lock className="w-4 h-4 text-gray-400" />
                </div>
              )}
              <div className={`w-10 h-10 rounded-xl mb-3 flex items-center justify-center ${
                feature.premium && !profile?.plano_ativo ? 'bg-gray-100' : 'bg-emerald-100'
              }`}>
                <feature.icon className={`w-5 h-5 ${
                  feature.premium && !profile?.plano_ativo ? 'text-gray-400' : 'text-emerald-600'
                }`} />
              </div>
              <div className="font-medium text-gray-900 text-sm mb-1">{feature.title}</div>
              <div className="text-xs text-gray-500">{feature.desc}</div>
            </motion.button>
          ))}
        </div>

        {/* Dica do dia */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-6 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl p-5 text-white"
        >
          <div className="text-sm opacity-90 mb-1">💡 Dica do dia</div>
          <p className="font-medium">
            Inclua uma porção de aveia no café da manhã. As fibras solúveis ajudam a reduzir o colesterol LDL naturalmente.
          </p>
        </motion.div>

        {/* Modal de Bloqueio */}
        {showLockedModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-2xl p-6 max-w-sm w-full"
            >
              <div className="text-center">
                <div className="w-16 h-16 bg-amber-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <Crown className="w-8 h-8 text-amber-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Funcionalidade Premium
                </h3>
                <p className="text-gray-600 mb-6">
                  Desbloqueie treinos gamificados, receitas exclusivas e acompanhamento de colesterol!
                </p>
                <div className="space-y-3">
                  <Button
                    onClick={() => window.location.href = createPageUrl('Premium')}
                    className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white py-5 rounded-xl"
                  >
                    Ver Plano Premium
                  </Button>
                  <Button
                    onClick={() => setShowLockedModal(false)}
                    variant="ghost"
                    className="w-full text-gray-500"
                  >
                    Talvez depois
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}