import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Heart, TrendingUp, AlertCircle, Sparkles, Check, Crown, ArrowRight, Salad, Dumbbell, Droplets, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';

const getDiagnostico = (profile) => {
  const pontosFortes = [];
  const oportunidades = [];
  
  // Análise da alimentação
  if (profile.alimentacao === 'Boa') {
    pontosFortes.push({
      icon: Salad,
      title: 'Alimentação equilibrada',
      desc: 'Você já tem uma base nutricional sólida!'
    });
  } else if (profile.alimentacao === 'Média') {
    oportunidades.push({
      icon: Salad,
      title: 'Alimentação pode melhorar',
      desc: 'Pequenos ajustes podem fazer grande diferença'
    });
  } else {
    oportunidades.push({
      icon: Salad,
      title: 'Priorizar alimentação',
      desc: 'Investir em refeições mais equilibradas é essencial'
    });
  }
  
  // Análise de exercícios
  if (profile.exercicios === 'Sim') {
    pontosFortes.push({
      icon: Dumbbell,
      title: 'Vida ativa',
      desc: 'Exercícios regulares ajudam muito na saúde cardiovascular'
    });
  } else {
    oportunidades.push({
      icon: Dumbbell,
      title: 'Iniciar atividades físicas',
      desc: 'Caminhadas leves já trazem benefícios'
    });
  }
  
  // Análise da idade
  if (profile.idade >= 40) {
    oportunidades.push({
      icon: Heart,
      title: 'Atenção especial à saúde cardiovascular',
      desc: 'Após os 40, cuidados preventivos são ainda mais importantes'
    });
  }
  
  // Sempre adicionar hidratação como oportunidade
  oportunidades.push({
    icon: Droplets,
    title: 'Hidratação adequada',
    desc: 'Beber água regularmente beneficia todo o organismo'
  });
  
  return { pontosFortes, oportunidades };
};

export default function Diagnostico() {
  const [profile, setProfile] = useState(null);
  const [diagnostico, setDiagnostico] = useState(null);
  const [showPremium, setShowPremium] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const user = await base44.auth.me();
      const profiles = await base44.entities.UserProfile.filter({ created_by: user.email });
      
      if (profiles.length > 0 && profiles[0].quiz_completo) {
        setProfile(profiles[0]);
        setDiagnostico(getDiagnostico(profiles[0]));
      } else {
        window.location.href = createPageUrl('Onboarding');
      }
    } catch (error) {
      console.error(error);
    }
    setIsLoading(false);
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

  if (!profile || !diagnostico) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-4 pb-24">
      <div className="max-w-lg mx-auto pt-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg shadow-emerald-200">
            <Heart className="w-8 h-8 text-white" fill="white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Seu Diagnóstico Personalizado
          </h1>
          <p className="text-gray-600">
            Baseado nas suas respostas, {profile.idade} anos
          </p>
        </motion.div>

        {/* Objetivo */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl p-5 mb-6 text-white"
        >
          <div className="flex items-center gap-3">
            <Target className="w-6 h-6" />
            <div>
              <div className="text-sm opacity-90">Seu objetivo</div>
              <div className="font-semibold text-lg">{profile.objetivo}</div>
            </div>
          </div>
        </motion.div>

        {/* Pontos Fortes */}
        {diagnostico.pontosFortes.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
              <h2 className="font-semibold text-gray-900">Seus Pontos Fortes</h2>
            </div>
            <div className="space-y-3">
              {diagnostico.pontosFortes.map((item, idx) => (
                <div key={idx} className="bg-white rounded-xl p-4 border border-emerald-100 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{item.title}</div>
                      <div className="text-sm text-gray-600">{item.desc}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Oportunidades */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-8"
        >
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="w-5 h-5 text-amber-500" />
            <h2 className="font-semibold text-gray-900">Oportunidades de Melhoria</h2>
          </div>
          <div className="space-y-3">
            {diagnostico.oportunidades.map((item, idx) => (
              <div key={idx} className="bg-white rounded-xl p-4 border border-amber-100 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                    <item.icon className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{item.title}</div>
                    <div className="text-sm text-gray-600">{item.desc}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Premium CTA */}
        {!profile.plano_ativo && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-6 text-white"
          >
            <div className="flex items-center gap-2 mb-4">
              <Crown className="w-6 h-6 text-yellow-400" />
              <span className="font-semibold text-lg">Plano Premium</span>
            </div>
            
            <p className="text-gray-300 mb-5">
              Desbloqueie todo o potencial do HeartBalance com acesso completo às ferramentas avançadas.
            </p>

            <div className="space-y-3 mb-6">
              {[
                'Plano alimentar personalizado',
                'Acompanhamento de progresso',
                'Receitas saudáveis exclusivas',
                'Dicas diárias no WhatsApp',
                'Suporte prioritário'
              ].map((item, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                  <span className="text-gray-200">{item}</span>
                </div>
              ))}
            </div>

            <div className="bg-white/10 rounded-xl p-4 mb-5">
              <div className="flex items-baseline justify-between mb-2">
                <span className="text-gray-400">Mensal</span>
                <span className="text-2xl font-bold">R$ 25<span className="text-sm text-gray-400">/mês</span></span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-gray-400">Anual</span>
                <div className="text-right">
                  <span className="text-2xl font-bold">R$ 200<span className="text-sm text-gray-400">/ano</span></span>
                  <div className="text-xs text-emerald-400">Economia de R$ 100!</div>
                </div>
              </div>
            </div>

            <Button
              onClick={() => window.location.href = createPageUrl('Premium')}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white py-6 rounded-xl text-lg font-medium"
            >
              Ativar Premium
              <Sparkles className="w-5 h-5 ml-2" />
            </Button>
          </motion.div>
        )}

        {/* Botão para Dashboard se já é premium */}
        {profile.plano_ativo && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Button
              onClick={() => window.location.href = createPageUrl('Dashboard')}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white py-6 rounded-xl text-lg font-medium"
            >
              Acessar Meu Painel
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
}