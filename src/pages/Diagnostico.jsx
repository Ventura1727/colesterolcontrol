import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Heart, TrendingUp, AlertCircle, Sparkles, Check, Crown, ArrowRight, Salad, Dumbbell, Droplets, Target, Star, Zap, Shield, Gift, Users, Clock, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/supabaseClient';
import { createPageUrl } from '@/utils';

const getDiagnostico = (profile) => {
  const pontosFortes = [];
  const oportunidades = [];
  
  if (profile.alimentacao === 'Boa') {
    pontosFortes.push({ icon: Salad, title: 'Alimentação equilibrada', desc: 'Você já tem uma base nutricional sólida!' });
  } else if (profile.alimentacao === 'Média') {
    oportunidades.push({ icon: Salad, title: 'Alimentação pode melhorar', desc: 'Pequenos ajustes podem fazer grande diferença' });
  } else {
    oportunidades.push({ icon: Salad, title: 'Priorizar alimentação', desc: 'Investir em refeições mais equilibradas é essencial' });
  }
  
  if (profile.exercicios === 'Sim') {
    pontosFortes.push({ icon: Dumbbell, title: 'Vida ativa', desc: 'Exercícios regulares ajudam muito na saúde cardiovascular' });
  } else {
    oportunidades.push({ icon: Dumbbell, title: 'Iniciar atividades físicas', desc: 'Caminhadas leves já trazem benefícios' });
  }
  
  if (profile.idade >= 40) {
    oportunidades.push({ icon: Heart, title: 'Atenção especial à saúde cardiovascular', desc: 'Após os 40, cuidados preventivos são ainda mais importantes' });
  }
  
  oportunidades.push({ icon: Droplets, title: 'Hidratação adequada', desc: 'Beber água regularmente beneficia todo o organismo' });
  
  return { pontosFortes, oportunidades };
};

const testimonials = [
  { name: 'Maria S.', age: 52, text: 'Reduzi meu colesterol em 40 pontos em 3 meses!', avatar: '👩' },
  { name: 'João P.', age: 45, text: 'O sistema de metas me mantém motivado todos os dias.', avatar: '👨' },
  { name: 'Ana L.', age: 38, text: 'As receitas são deliciosas e fáceis de fazer.', avatar: '👩‍🦰' }
];

export default function Diagnostico() {
  const [profile, setProfile] = useState(null);
  const [diagnostico, setDiagnostico] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showFullSales, setShowFullSales] = useState(false);

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
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!profile || !diagnostico) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      <div className="max-w-lg mx-auto px-4 pt-8 pb-32">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg shadow-emerald-200">
            <Heart className="w-8 h-8 text-white" fill="white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Seu Diagnóstico Personalizado</h1>
          <p className="text-gray-600">Olá! Aqui está o que descobrimos sobre você:</p>
        </motion.div>

        {/* Resumo do Perfil */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white rounded-2xl p-5 mb-6 border border-gray-100 shadow-sm">
          <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Target className="w-5 h-5 text-emerald-600" />
            Seu Perfil
          </h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100">
              <div className="text-emerald-600 text-xs font-medium">Idade</div>
              <div className="font-bold text-gray-900">{profile.idade} anos</div>
            </div>
            <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100">
              <div className="text-emerald-600 text-xs font-medium">Alimentação</div>
              <div className="font-bold text-gray-900">{profile.alimentacao}</div>
            </div>
            <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100">
              <div className="text-emerald-600 text-xs font-medium">Exercícios</div>
              <div className="font-bold text-gray-900">{profile.exercicios}</div>
            </div>
            <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100">
              <div className="text-emerald-600 text-xs font-medium">Objetivo</div>
              <div className="font-bold text-gray-900 text-xs">{profile.objetivo}</div>
            </div>
          </div>
        </motion.div>

        {/* Objetivo Principal */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl p-5 mb-6 text-white">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Target className="w-6 h-6" />
            </div>
            <div>
              <div className="text-sm opacity-90">Sua Meta Principal</div>
              <div className="font-bold text-xl">{profile.objetivo}</div>
            </div>
          </div>
        </motion.div>

        {/* Pontos Fortes */}
        {diagnostico.pontosFortes.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mb-6">
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
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="w-5 h-5 text-amber-500" />
            <h2 className="font-semibold text-gray-900">O Que Podemos Melhorar</h2>
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

        {/* Se já é premium */}
        {profile.plano_ativo && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <Button onClick={() => window.location.href = createPageUrl('Dashboard')} className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white py-6 rounded-xl text-lg font-medium">
              Acessar Meu Painel
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </motion.div>
        )}

        {/* SEÇÃO DE VENDAS - Apenas se não é premium */}
        {!profile.plano_ativo && (
          <>
            {/* Separador Visual */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="relative my-10">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="bg-gradient-to-br from-emerald-50 via-white to-teal-50 px-4 text-sm text-gray-500">
                  A boa notícia é...
                </span>
              </div>
            </motion.div>

            {/* Headline de Vendas */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-3">
                Você Pode Transformar Sua Saúde em <span className="text-emerald-600">90 Dias</span>
              </h2>
              <p className="text-gray-600">
                Com o HeartBalance Premium, você terá um plano personalizado baseado no seu perfil para {profile.objetivo.toLowerCase()}.
              </p>
            </motion.div>

            {/* Urgência */}
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.55 }} className="bg-gradient-to-r from-red-500 to-orange-500 rounded-2xl p-4 mb-6 text-white text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Clock className="w-5 h-5" />
                <span className="font-bold">OFERTA POR TEMPO LIMITADO</span>
              </div>
              <p className="text-sm opacity-90">50% OFF no plano anual - Válido apenas hoje!</p>
            </motion.div>

            {/* O que está incluso */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="bg-white rounded-3xl p-6 mb-6 border border-gray-100 shadow-lg">
              <div className="flex items-center gap-2 mb-5">
                <Gift className="w-6 h-6 text-emerald-600" />
                <h3 className="font-bold text-lg text-gray-900">O Que Você Vai Receber</h3>
              </div>

              <div className="space-y-4">
                {[
                  { icon: Dumbbell, title: 'Sistema de Treinos Gamificado', desc: 'Suba de rank e desbloqueie novos exercícios', highlight: true },
                  { icon: Salad, title: 'Receitas Anti-Colesterol', desc: 'Cardápios exclusivos que você desbloqueia', highlight: true },
                  { icon: TrendingUp, title: 'Acompanhamento de Colesterol', desc: 'Metas personalizadas baseadas nos seus exames', highlight: true },
                  { icon: Star, title: 'Sistema de Ranks e Conquistas', desc: 'Do Iniciante ao Mestre - evolua sua saúde', highlight: false },
                  { icon: Zap, title: 'Desafios Semanais', desc: 'Ganhe XP e desbloqueie recompensas', highlight: false },
                  { icon: Shield, title: 'Garantia de 7 Dias', desc: 'Não gostou? Devolvemos 100% do valor', highlight: false }
                ].map((item, idx) => (
                  <div key={idx} className={`flex items-start gap-3 p-3 rounded-xl ${item.highlight ? 'bg-emerald-50 border border-emerald-100' : ''}`}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${item.highlight ? 'bg-emerald-500' : 'bg-gray-100'}`}>
                      <item.icon className={`w-5 h-5 ${item.highlight ? 'text-white' : 'text-gray-600'}`} />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{item.title}</div>
                      <div className="text-sm text-gray-600">{item.desc}</div>
                    </div>
                    <Check className="w-5 h-5 text-emerald-500 flex-shrink-0 ml-auto" />
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Depoimentos */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65 }} className="mb-6">
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-5 h-5 text-emerald-600" />
                <h3 className="font-semibold text-gray-900">+2.500 pessoas já transformaram sua saúde</h3>
              </div>
              <div className="space-y-3">
                {testimonials.map((t, idx) => (
                  <div key={idx} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-xl">
                        {t.avatar}
                      </div>
                      <div className="flex-1">
                        <p className="text-gray-700 text-sm mb-1">"{t.text}"</p>
                        <p className="text-xs text-gray-500">{t.name}, {t.age} anos</p>
                      </div>
                      <div className="flex text-yellow-400">
                        {[...Array(5)].map((_, i) => <Star key={i} className="w-3 h-3" fill="currentColor" />)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Preços */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }} className="mb-6">
              <div className="grid grid-cols-2 gap-3">
                {/* Mensal */}
                <div className="bg-white rounded-2xl p-4 border border-gray-200 text-center">
                  <div className="text-sm text-gray-500 mb-1">Mensal</div>
                  <div className="text-2xl font-bold text-gray-900">R$ 25</div>
                  <div className="text-xs text-gray-500">/mês</div>
                </div>
                {/* Anual - Destaque */}
                <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-4 text-center text-white relative overflow-hidden">
                  <div className="absolute -top-1 -right-1 bg-yellow-400 text-gray-900 text-[10px] font-bold px-2 py-1 rounded-bl-lg">
                    -50%
                  </div>
                  <div className="text-sm opacity-90 mb-1">Anual</div>
                  <div className="text-2xl font-bold">R$ 149</div>
                  <div className="text-xs opacity-90 line-through">R$ 300</div>
                  <div className="text-xs mt-1 bg-white/20 rounded-full px-2 py-0.5 inline-block">
                    Apenas R$ 12,42/mês
                  </div>
                </div>
              </div>
            </motion.div>

            {/* CTA Principal */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.75 }}>
              <Button onClick={() => window.location.href = createPageUrl('Premium')} className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white py-7 rounded-2xl text-lg font-bold shadow-xl shadow-emerald-200/50 mb-4">
                Quero Começar Agora
                <Sparkles className="w-5 h-5 ml-2" />
              </Button>
              
              <div className="flex items-center justify-center gap-4 text-xs text-gray-500">
                <div className="flex items-center gap-1">
                  <Shield className="w-4 h-4" />
                  <span>Pagamento seguro</span>
                </div>
                <div className="flex items-center gap-1">
                  <Check className="w-4 h-4" />
                  <span>Garantia de 7 dias</span>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
}
