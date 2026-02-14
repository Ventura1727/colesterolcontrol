import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Heart, Check, TrendingDown, Crown, Zap, Shield, Star, Sparkles } from 'lucide-react';
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
    price: 24.9,
    totalSavings: 0,
    recommended: false,
    color: 'from-gray-500 to-gray-600'
  },
  {
    id: 'trimestral',
    name: 'Plano Trimestral',
    duration: '3 meses',
    price: 59.9,
    totalSavings: 24.7,
    recommended: true,
    color: 'from-red-500 to-rose-600'
  },
  {
    id: 'anual',
    name: 'Plano Anual',
    duration: '12 meses',
    price: 199.9,
    totalSavings: 128.8,
    recommended: false,
    color: 'from-amber-500 to-orange-600'
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
    // Apenas não conseguimos salvar no profiles (porque falta auth.uid()).
    if (!user) {
      console.warn('persistQuizToProfiles: user not logged-in; skipping save to profiles');
      return;
    }

    const idade = getOptionalNumber(quizData, ['idade', 'age']);
    const pesoKg = getOptionalNumber(quizData, ['peso_kg', 'pesoKg', 'peso', 'weight']);
    const altura = getOptionalNumber(quizData, ['altura', 'height']);

    // mapeamento direto do quiz atual
    const payload = {
      id: user.id,
      idade: idade,
      objetivo: quizData.objetivo ?? null,
      alimentacao_objetivo: quizData.alimentacao ?? null,
      exercicios_objetivo: quizData.exercicios ?? null,
      // se sua tabela usa peso_kg/altura (como vimos no print)
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

        {/* Escolha Seu Plano */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-8"
        >
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">Escolha Seu Plano Premium</h2>
          <p className="text-center text-gray-600 mb-6">Quanto mais tempo, maior a economia!</p>

          <div className="space-y-3">
            {plans.map((plan) => (
              <button
                key={plan.id}
                onClick={() => setSelectedPlan(plan.id)}
                className={`w-full rounded-2xl p-5 border-2 transition-all text-left relative ${
                  selectedPlan === plan.id
                    ? 'border-red-500 bg-red-50 shadow-lg'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                {plan.recommended && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-red-500 to-rose-600 text-white px-4 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                    <Crown className="w-3 h-3" />
                    Mais Popular
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900 mb-1">{plan.name}</h3>
                    <p className="text-sm text-gray-500 mb-2">{plan.duration} de acesso completo</p>

                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-2xl font-bold text-gray-900">R$ {plan.price.toFixed(2)}</span>
                    </div>
                    {plan.totalSavings > 0 && (
                      <p className="text-xs text-red-600 font-medium">
                        🔥 Economia de R$ {plan.totalSavings.toFixed(2)} vs planos mensais
                      </p>
                    )}
                  </div>

                  <div
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      selectedPlan === plan.id ? 'border-red-500 bg-red-500' : 'border-gray-300'
                    }`}
                  >
                    {selectedPlan === plan.id && <Check className="w-4 h-4 text-white" />}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Segurança e Benefícios */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-2xl p-6 mb-6 border border-gray-200"
        >
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-green-600" />
            Segurança e Benefícios
          </h3>
          <div className="space-y-3 text-sm text-gray-700">
            <div className="flex items-start gap-2">
              <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span>Pagamento 100% seguro e criptografado</span>
            </div>
            <div className="flex items-start gap-2">
              <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span>Acesso imediato após confirmação do pagamento</span>
            </div>
            <div className="flex items-start gap-2">
              <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span>Cancele quando quiser, sem multas ou taxas</span>
            </div>
            <div className="flex items-start gap-2">
              <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span>Suporte dedicado para assinantes premium</span>
            </div>
          </div>
        </motion.div>

        {/* Depoimentos */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
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

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="sticky bottom-4 bg-white rounded-2xl p-6 border-2 border-red-500 shadow-xl"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-gray-500">Você escolheu:</p>
              <p className="font-bold text-gray-900">{currentPlan.name}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-red-600">R$ {currentPlan.price.toFixed(2)}</p>
            </div>
          </div>

          <Button
            onClick={handleContinue}
            disabled={isContinuing}
            className="w-full bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white py-6 rounded-xl text-lg font-semibold shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isContinuing ? 'Salvando…' : 'Continuar para Pagamento'}
            <Zap className="w-5 h-5 ml-2" />
          </Button>

          <p className="text-xs text-center text-gray-500 mt-3">🔒 Pagamento 100% seguro</p>
        </motion.div>
      </div>
    </div>
  );
}
