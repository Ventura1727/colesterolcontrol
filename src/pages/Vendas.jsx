import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Heart,
  Check,
  TrendingDown,
  Crown,
  Zap,
  Shield,
  Star,
  Sparkles,
  Lock,
  ArrowRight,
  Gauge,
  Brain,
  Salad,
  LineChart,
  BadgeCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '@/utils';
import { supabase } from '@/lib/supabaseClient';

const getDiagnostico = (quizData) => {
  const pontosFracos = [];
  const pontosFocos = [];

  if (quizData.alimentacao === 'Ruim') {
    pontosFracos.push('Alimentação precisa de atenção urgente');
    pontosFocos.push('Receitas anti-colesterol personalizadas');
  } else if (quizData.alimentacao === 'Média') {
    pontosFracos.push('Alimentação pode melhorar significativamente');
    pontosFocos.push('Planos nutricionais com IA');
  }

  if (quizData.exercicios === 'Não') {
    pontosFracos.push('Sedentarismo aumenta risco cardiovascular');
    pontosFocos.push('Treinos gamificados que motivam');
  }

  if (Number(quizData.idade) > 40) {
    pontosFracos.push('Idade requer monitoramento frequente');
    pontosFocos.push('Acompanhamento detalhado de exames');
  }

  return { pontosFracos, pontosFocos };
};

const plans = [
  {
    id: 'mensal',
    name: 'Plano Mensal',
    duration: '1 mês',
    months: 1,
    price: 24.9,
    recommended: false
  },
  {
    id: 'trimestral',
    name: 'Plano Trimestral',
    duration: '3 meses',
    months: 3,
    price: 59.9,
    recommended: true
  },
  {
    id: 'anual',
    name: 'Plano Anual',
    duration: '12 meses',
    months: 12,
    price: 199.9,
    recommended: false
  }
];

const testimonials = [
  { name: 'Maria S.', text: 'Reduzi 30 pontos de LDL em 2 meses!', rating: 5 },
  { name: 'João P.', text: 'Os treinos gamificados me motivaram muito', rating: 5 },
  { name: 'Ana L.', text: 'Melhor investimento na minha saúde', rating: 5 }
];

function isQuizValid(data) {
  if (!data || typeof data !== 'object') return false;
  if (data.idade == null) return false;
  if (!data.alimentacao) return false;
  if (!data.exercicios) return false;
  if (!data.objetivo) return false;
  return true;
}

// tenta extrair peso/altura se existirem no quiz, suportando chaves diferentes
function getOptionalNumber(obj, keys) {
  for (const k of keys) {
    const v = obj?.[k];
    if (v === 0 || v === '0') return 0;
    if (v == null || v === '') continue;
    const n = Number(v);
    if (!Number.isNaN(n) && Number.isFinite(n)) return n;
  }
  return null;
}

async function persistQuizToProfiles(quizData) {
  try {
    const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
    if (sessionErr) {
      console.warn('persistQuizToProfiles: getSession error', sessionErr);
      return;
    }

    const session = sessionData?.session;
    const user = session?.user;

    // Se não tiver login, não travamos o fluxo de compra.
    if (!user) {
      console.warn('persistQuizToProfiles: user not logged-in; skipping save to profiles');
      return;
    }

    const idade = getOptionalNumber(quizData, ['idade', 'age']);
    const pesoKg = getOptionalNumber(quizData, ['peso_kg', 'pesoKg', 'peso', 'weight']);
    const altura = getOptionalNumber(quizData, ['altura_cm', 'altura', 'height']);

    const payload = {
      id: user.id,
      idade: idade,
      objetivo: quizData.objetivo ?? null,
      alimentacao_objetivo: quizData.alimentacao ?? null,
      exercicios_objetivo: quizData.exercicios ?? null,
      peso_kg: pesoKg,
      altura_cm: altura,
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase.from('profiles').upsert(payload, { onConflict: 'id' });

    if (error) {
      console.error('Falha ao salvar quiz no profiles:', error);
    }
  } catch (e) {
    console.error('persistQuizToProfiles unexpected error:', e);
  }
}

function formatBRL(value) {
  try {
    return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  } catch {
    return `R$ ${Number(value || 0).toFixed(2)}`;
  }
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

export default function Vendas() {
  const [quizData, setQuizData] = useState(null);
  const [diagnostico, setDiagnostico] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState('trimestral');
  const [isContinuing, setIsContinuing] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('heartbalance_quiz');

    if (!saved) {
      window.location.href = createPageUrl('Onboarding');
      return;
    }

    try {
      const data = JSON.parse(saved);

      if (!isQuizValid(data)) {
        localStorage.removeItem('heartbalance_quiz');
        window.location.href = createPageUrl('Onboarding');
        return;
      }

      setQuizData(data);
      setDiagnostico(getDiagnostico(data));
    } catch (e) {
      localStorage.removeItem('heartbalance_quiz');
      window.location.href = createPageUrl('Onboarding');
    }
  }, []);

  const currentPlan = useMemo(() => plans.find((p) => p.id === selectedPlan), [selectedPlan]);

  const pricing = useMemo(() => {
    const mensal = plans.find((p) => p.id === 'mensal')?.price ?? 24.9;
    const months = currentPlan?.months ?? 3;
    const price = currentPlan?.price ?? 59.9;

    // "Preço de" calculado com base no mensal (realista)
    let original = mensal * months;

    // Evita mostrar "de" menor que "por"
    original = Math.max(original, price * 1.2);

    const savings = clamp(original - price, 0, 999999);
    const perDay = price / (months * 30); // aproximação simples

    return { original, price, savings, perDay, months };
  }, [currentPlan]);

  const premiumFeatures = useMemo(
    () => [
      {
        icon: Gauge,
        title: 'Dashboard inteligente personalizado',
        desc: 'Metas e recomendações adaptadas ao seu perfil.'
      },
      {
        icon: Salad,
        title: 'Plano alimentar com IA',
        desc: 'Sugestões práticas para sua rotina, focadas em colesterol.'
      },
      {
        icon: Brain,
        title: 'Nutricionista IA ilimitado',
        desc: 'Tire dúvidas quando quiser e receba orientação imediata.'
      },
      {
        icon: LineChart,
        title: 'Relatórios e evolução semanal',
        desc: 'Acompanhe progresso e pontos de atenção com clareza.'
      },
      {
        icon: BadgeCheck,
        title: 'Estratégia anti-colesterol',
        desc: 'Ações práticas para reduzir riscos e melhorar hábitos.'
      }
    ],
    []
  );

  const handleContinue = async () => {
    if (isContinuing) return;
    setIsContinuing(true);

    try {
      // 1) persistir quiz no Supabase (profiles) para refletir na Premium/Dashboard
      if (quizData) {
        await persistQuizToProfiles(quizData);
      }

      // 2) Salva o plano selecionado (id + metadados úteis pro Checkout)
      const planPayload = {
        id: currentPlan?.id || selectedPlan,
        name: currentPlan?.name || '',
        duration: currentPlan?.duration || '',
        price: typeof currentPlan?.price === 'number' ? currentPlan.price : null,
        months: currentPlan?.months ?? null,
        pricing: {
          original: pricing.original,
          savings: pricing.savings,
          perDay: pricing.perDay
        },
        selectedAt: new Date().toISOString()
      };

      localStorage.setItem('heartbalance_selected_plan', JSON.stringify(planPayload));
      window.location.href = createPageUrl('Checkout');
    } finally {
      setIsContinuing(false);
    }
  };

  if (!quizData || !diagnostico || !currentPlan) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-rose-50 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
          className="w-8 h-8 border-[3px] border-red-600 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-rose-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-rose-600 rounded-2xl mx-auto mb-4 flex items-center justify-center">
            <Heart className="w-8 h-8 text-white" fill="white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Seu Diagnóstico Personalizado</h1>
          <p className="text-gray-600">Baseado nas suas respostas, aqui está o que identificamos</p>
        </motion.div>

        {/* Resumo do Perfil */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-6 mb-6 border border-gray-200 shadow-sm"
        >
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-red-600" />
            Seu Perfil de Saúde
          </h2>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-gray-500 text-xs mb-1">Idade</div>
              <div className="font-medium">{quizData.idade} anos</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-gray-500 text-xs mb-1">Alimentação</div>
              <div className="font-medium">{quizData.alimentacao}</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-gray-500 text-xs mb-1">Exercícios</div>
              <div className="font-medium">{quizData.exercicios}</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-gray-500 text-xs mb-1">Objetivo</div>
              <div className="font-medium text-xs">{quizData.objetivo}</div>
            </div>
          </div>
        </motion.div>

        {/* Pontos de Atenção */}
        {diagnostico.pontosFracos.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-amber-50 rounded-2xl p-6 mb-6 border border-amber-200"
          >
            <h3 className="font-semibold text-amber-900 mb-3">⚠️ Pontos que Precisam de Atenção</h3>
            <p className="text-sm text-amber-800 mb-3">
              Com base no seu diagnóstico, o Premium foi desenhado para atuar exatamente nesses pontos com orientação
              prática e acompanhamento inteligente.
            </p>
            <ul className="space-y-2">
              {diagnostico.pontosFracos.map((ponto, idx) => (
                <li key={idx} className="text-sm text-amber-800 flex items-start gap-2">
                  <span className="text-amber-500 mt-0.5">•</span>
                  {ponto}
                </li>
              ))}
            </ul>
          </motion.div>
        )}

        {/* Como o App Ajuda */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-red-500 to-rose-600 rounded-2xl p-6 mb-6 text-white"
        >
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-6 h-6" />
            <h3 className="font-semibold text-lg">O HeartBalance Vai Te Ajudar Com:</h3>
          </div>
          <ul className="space-y-3">
            {diagnostico.pontosFocos.map((foco, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <Check className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span className="text-sm">{foco}</span>
              </li>
            ))}
            <li className="flex items-start gap-2">
              <Check className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span className="text-sm">Sistema de gamificação com XP e ranks motivacionais</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span className="text-sm">Acompanhamento completo de colesterol e análises com IA</span>
            </li>
          </ul>
        </motion.div>

        {/* Convencimento */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-white rounded-2xl p-6 mb-6 border border-gray-200 shadow-sm"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center border border-red-100">
              <Lock className="w-5 h-5 text-red-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-gray-900 text-lg mb-1">Desbloqueie seu Plano Completo</h3>
              <p className="text-sm text-gray-700">
                Você já tem seu diagnóstico. Agora, o Premium libera as ações certas para transformar seus hábitos e
                proteger seu coração com acompanhamento inteligente e personalizado.
              </p>
              <div className="mt-3 inline-flex items-center gap-2 text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-full px-3 py-1">
                <Shield className="w-4 h-4 text-green-600" />
                Acesso imediato após confirmação • Pagamento seguro
              </div>
            </div>
          </div>
        </motion.div>

        {/* Preview do Dashboard (Opção A - mock em HTML) */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-6"
        >
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">Preview do Painel Premium</h3>
                <p className="text-xs text-gray-500">Veja o que você vai desbloquear após o pagamento</p>
              </div>
              <div className="text-xs font-medium text-red-600 flex items-center gap-1">
                <Lock className="w-4 h-4" />
                Exclusivo Premium
              </div>
            </div>

            <div className="relative p-6 bg-gradient-to-br from-gray-50 to-white">
              <div className="grid grid-cols-12 gap-4">
                <div className="col-span-6 rounded-xl border border-gray-200 bg-white p-4">
                  <div className="text-xs text-gray-500 mb-2">Meta semanal</div>
                  <div className="h-6 w-24 bg-gray-200 rounded-lg" />
                  <div className="mt-3 h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full w-2/3 bg-gray-300" />
                  </div>
                  <div className="mt-2 text-[11px] text-gray-500">Progresso • Premium</div>
                </div>

                <div className="col-span-6 rounded-xl border border-gray-200 bg-white p-4">
                  <div className="text-xs text-gray-500 mb-2">Colesterol (estimativa)</div>
                  <div className="h-6 w-32 bg-gray-200 rounded-lg" />
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <div className="h-8 bg-gray-200 rounded-lg" />
                    <div className="h-8 bg-gray-200 rounded-lg" />
                    <div className="h-8 bg-gray-200 rounded-lg" />
                  </div>
                  <div className="mt-2 text-[11px] text-gray-500">Relatório • Premium</div>
                </div>

                <div className="col-span-12 rounded-xl border border-gray-200 bg-white p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="text-xs text-gray-500">Evolução</div>
                      <div className="text-sm font-semibold text-gray-900">Semanal</div>
                    </div>
                    <div className="text-[11px] text-gray-500">Premium</div>
                  </div>
                  <div className="h-24 rounded-xl bg-gray-100 border border-gray-200 flex items-end gap-2 p-3">
                    <div className="w-6 h-10 bg-gray-200 rounded-md" />
                    <div className="w-6 h-16 bg-gray-200 rounded-md" />
                    <div className="w-6 h-12 bg-gray-200 rounded-md" />
                    <div className="w-6 h-20 bg-gray-200 rounded-md" />
                    <div className="w-6 h-14 bg-gray-200 rounded-md" />
                    <div className="w-6 h-18 bg-gray-200 rounded-md" />
                  </div>
                </div>

                <div className="col-span-12 rounded-xl border border-gray-200 bg-white p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center">
                      <Brain className="w-4 h-4 text-gray-700" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-gray-900">Nutricionista IA</div>
                      <div className="text-xs text-gray-500">Pergunte e receba orientação imediata</div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-10 bg-gray-100 border border-gray-200 rounded-xl" />
                    <div className="h-10 bg-gray-100 border border-gray-200 rounded-xl" />
                  </div>
                </div>
              </div>

              <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
              <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
                <div className="max-w-md bg-white/90 border border-white/60 rounded-2xl p-5 shadow-xl">
                  <div className="w-12 h-12 rounded-2xl bg-red-50 mx-auto mb-3 flex items-center justify-center border border-red-100">
                    <Lock className="w-6 h-6 text-red-600" />
                  </div>
                  <h4 className="font-bold text-gray-900 mb-1">Conteúdo exclusivo para membros Premium</h4>
                  <p className="text-sm text-gray-700 mb-3">
                    Desbloqueie seu painel completo, metas personalizadas e acompanhamento com IA.
                  </p>
                  <div className="text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 inline-flex items-center gap-2">
                    <ArrowRight className="w-4 h-4 text-red-600" />
                    Pagou, liberou: acesso imediato após confirmação
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Benefícios Premium */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="bg-white rounded-2xl p-6 mb-8 border border-gray-200 shadow-sm"
        >
          <h3 className="font-semibold text-gray-900 mb-1">💎 O que você desbloqueia no Premium</h3>
          <p className="text-sm text-gray-600 mb-4">Tudo preparado para o seu perfil e seu objetivo.</p>

          <div className="grid grid-cols-1 gap-3">
            {premiumFeatures.map((f, idx) => {
              const Icon = f.icon;
              return (
                <div key={idx} className="relative overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
                  <div className="absolute top-3 right-3 text-[11px] font-semibold text-red-600 bg-white/90 border border-red-100 rounded-full px-2 py-1 flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    Premium
                  </div>

                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center">
                        <Icon className="w-5 h-5 text-gray-700" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">{f.title}</h4>
                        <p className="text-sm text-gray-600">{f.desc}</p>
                      </div>
                    </div>

                    <div className="mt-3 h-2 rounded-full bg-gray-200 overflow-hidden">
                      <div className="h-full w-2/3 bg-gray-300" />
                    </div>
                    <p className="text-[11px] text-gray-500 mt-2">🔒 Disponível após ativar o Premium</p>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Escolha Seu Plano */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-8"
        >
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">Escolha Seu Plano Premium</h2>
          <p className="text-center text-gray-600 mb-6">Quanto mais tempo, maior a economia!</p>

          <div className="space-y-3">
            {plans.map((plan) => {
              const isSelected = selectedPlan === plan.id;
              const mensal = plans.find((p) => p.id === 'mensal')?.price ?? 24.9;
              const original = Math.max(mensal * plan.months, plan.price * 1.2);
              const savings = clamp(original - plan.price, 0, 999999);

              return (
                <button
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan.id)}
                  className={`w-full rounded-2xl p-5 border-2 transition-all text-left relative ${
                    isSelected ? 'border-red-500 bg-red-50 shadow-lg' : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  {plan.recommended && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-red-500 to-rose-600 text-white px-4 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                      <Crown className="w-3 h-3" />
                      Mais Popular
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900 mb-1">{plan.name}</h3>
                      <p className="text-sm text-gray-500 mb-2">{plan.duration} de acesso completo</p>

                      <div className="flex items-baseline gap-2 mb-1 flex-wrap">
                        <span className="text-2xl font-bold text-gray-900">{formatBRL(plan.price)}</span>
                        <span className="text-xs text-gray-500 line-through">{formatBRL(original)}</span>
                        {savings > 0 && (
                          <span className="text-xs font-semibold text-red-600 bg-red-50 border border-red-100 rounded-full px-2 py-1">
                            Economize {formatBRL(savings)}
                          </span>
                        )}
                      </div>

                      {plan.id !== 'mensal' && (
                        <p className="text-xs text-gray-600">
                          Menos de{' '}
                          <span className="font-semibold text-gray-900">
                            {formatBRL(plan.price / (plan.months * 30))}
                          </span>{' '}
                          por dia
                        </p>
                      )}
                    </div>

                    <div
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                        isSelected ? 'border-red-500 bg-red-500' : 'border-gray-300'
                      }`}
                    >
                      {isSelected && <Check className="w-4 h-4 text-white" />}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Segurança e Benefícios */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-2xl p-6 mb-6 border border-gray-200"
        >
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-green-600" />
            Segurança e Benefícios
          </h3>
          <div className="space-y-3 text-sm text-gray-700">
            <div className="flex items-start gap-2">
              <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span>Pagamento 100% seguro via Mercado Pago</span>
            </div>
            <div className="flex items-start gap-2">
              <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span>Acesso imediato após confirmação do pagamento</span>
            </div>
            <div className="flex items-start gap-2">
              <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span>Cancele quando quiser (sem multas ou taxas)</span>
            </div>
            <div className="flex items-start gap-2">
              <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span>Garantia de 7 dias: se não fizer sentido, você pode pedir cancelamento</span>
            </div>
          </div>
        </motion.div>

        {/* Depoimentos */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white rounded-2xl p-6 mb-8 border border-gray-200"
        >
          <h3 className="font-semibold text-gray-900 mb-4">💬 O Que Dizem Nossos Usuários</h3>
          <div className="space-y-3">
            {testimonials.map((t, idx) => (
              <div key={idx} className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-1 mb-2">
                  {[...Array(t.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                  ))}
                </div>
                <p className="text-sm text-gray-700 mb-1">"{t.text}"</p>
                <p className="text-xs text-gray-500 font-medium">{t.name}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* CTA Sticky */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="sticky bottom-4 bg-white rounded-2xl p-6 border-2 border-red-500 shadow-xl"
        >
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <p className="text-sm text-gray-500">Você escolheu:</p>
              <p className="font-bold text-gray-900">{currentPlan.name}</p>

              <div className="mt-2 text-xs text-gray-600">
                De <span className="line-through">{formatBRL(pricing.original)}</span> por{' '}
                <span className="font-semibold text-gray-900">{formatBRL(pricing.price)}</span>
                {pricing.savings > 0 && (
                  <span className="ml-2 text-red-600 font-semibold">({formatBRL(pricing.savings)} off)</span>
                )}
              </div>

              <div className="mt-1 text-xs text-gray-600">
                Menos de <span className="font-semibold text-gray-900">{formatBRL(pricing.perDay)}</span> por dia para
                cuidar do seu coração ❤️
              </div>
            </div>

            <div className="text-right">
              <div className="text-xs text-gray-500">Total</div>
              <div className="text-2xl font-bold text-red-600">{formatBRL(pricing.price)}</div>
            </div>
          </div>

          <Button
            onClick={handleContinue}
            disabled={isContinuing}
            className="w-full bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white py-6 rounded-xl text-lg font-semibold shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isContinuing ? 'Salvando…' : 'Quero Desbloquear Meu Plano Agora'}
            <Zap className="w-5 h-5 ml-2" />
          </Button>

          <div className="mt-3 flex items-center justify-center gap-2 text-xs text-gray-600">
            <Shield className="w-4 h-4 text-green-600" />
            Pagamento 100% seguro • Liberação imediata após confirmação
          </div>
        </motion.div>
      </div>
    </div>
  );
}
