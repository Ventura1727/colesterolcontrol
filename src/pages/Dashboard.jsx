import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Heart, Crown, Lock, Salad, Dumbbell, Droplets, BookOpen, TrendingDown, Calendar, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';

const features = [
  {
    id: 'plano-alimentar',
    title: 'Plano Alimentar',
    desc: 'Receitas e cardápios personalizados',
    icon: Salad,
    premium: true
  },
  {
    id: 'exercicios',
    title: 'Exercícios',
    desc: 'Rotinas leves para o dia a dia',
    icon: Dumbbell,
    premium: true
  },
  {
    id: 'hidratacao',
    title: 'Hidratação',
    desc: 'Lembretes e metas de água',
    icon: Droplets,
    premium: true
  },
  {
    id: 'educacao',
    title: 'Conteúdo Educativo',
    desc: 'Artigos sobre colesterol e saúde',
    icon: BookOpen,
    premium: false
  },
  {
    id: 'progresso',
    title: 'Meu Progresso',
    desc: 'Acompanhe sua evolução',
    icon: TrendingDown,
    premium: true
  },
  {
    id: 'lembretes',
    title: 'Lembretes',
    desc: 'Notificações personalizadas',
    icon: Calendar,
    premium: true
  }
];

export default function Dashboard() {
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showLockedModal, setShowLockedModal] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const user = await base44.auth.me();
      const profiles = await base44.entities.UserProfile.filter({ created_by: user.email });
      
      if (profiles.length > 0) {
        setProfile(profiles[0]);
      } else {
        window.location.href = createPageUrl('Onboarding');
      }
    } catch (error) {
      console.error(error);
    }
    setIsLoading(false);
  };

  const handleFeatureClick = (feature) => {
    if (feature.premium && !profile?.plano_ativo) {
      setShowLockedModal(true);
    } else {
      // Navegar para a funcionalidade
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
          className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-4 pb-24">
      <div className="max-w-lg mx-auto pt-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
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
        </div>

        {/* Resumo do Perfil */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-5 mb-6 border border-gray-100 shadow-sm"
        >
          <h2 className="font-semibold text-gray-900 mb-3">Seu Perfil</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-gray-500">Idade</div>
              <div className="font-medium">{profile?.idade} anos</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-gray-500">Alimentação</div>
              <div className="font-medium">{profile?.alimentacao}</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-gray-500">Exercícios</div>
              <div className="font-medium">{profile?.exercicios}</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-gray-500">Objetivo</div>
              <div className="font-medium text-xs">{profile?.objetivo}</div>
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
                feature.premium && !profile?.plano_ativo
                  ? 'bg-gray-100'
                  : 'bg-emerald-100'
              }`}>
                <feature.icon className={`w-5 h-5 ${
                  feature.premium && !profile?.plano_ativo
                    ? 'text-gray-400'
                    : 'text-emerald-600'
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
                  Este recurso está disponível apenas para assinantes do plano Premium. 
                  Desbloqueie todo o potencial do HeartBalance!
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