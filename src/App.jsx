import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Crown, Check, Sparkles, ArrowLeft, Shield, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '@/utils';

const benefits = [
  'Plano alimentar 100% personalizado',
  'Receitas exclusivas anti-colesterol',
  'Rotinas de exercícios adaptadas',
  'Lembretes de hidratação',
  'Acompanhamento de progresso',
  'Dicas diárias via WhatsApp',
  'Conteúdo educativo completo',
  'Suporte prioritário'
];

export default function Premium() {
  const [profile, setProfile] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState('anual');
  const [isLoading, setIsLoading] = useState(true);
  const [isActivating, setIsActivating] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const res = await fetch('/api/profile', { method: 'GET' });
      if (!res.ok) throw new Error('Falha ao carregar perfil');
      const data = await res.json();

      const perfil = Array.isArray(data?.profiles) ? data.profiles[0] : data?.profile;
      if (perfil) {
        setProfile(perfil);
        if (perfil.plano_ativo) {
          window.location.href = createPageUrl('Dashboard');
          return;
        }
      }
    } catch (error) {
      console.error('Erro ao carregar perfil:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleActivate = async () => {
    setIsActivating(true);
    try {
      const res = await fetch('/api/activate-premium', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: selectedPlan,
          data_inicio_plano: new Date().toISOString().split('T')[0]
        })
      });
      if (!res.ok) throw new Error('Falha ao ativar premium');
      window.location.href = createPageUrl('Dashboard');
    } catch (error) {
      console.error('Erro ao ativar premium:', error);
      alert('Não foi possível ativar seu plano agora. Tente novamente em instantes.');
    } finally {
      setIsActivating(false);
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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      {/* Header */}
      <div className="p-4">
        <button
          onClick={() => window.history.back()}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Voltar
        </button>
      </div>

      <div className="px-4 pb-12 max-w-lg mx-auto">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center pt-4 pb-8"
        >
          <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-3xl mx-auto mb-6 flex items-center justify-center shadow-lg shadow-amber-500/30">
            <Crown className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold mb-3">
            HeartBalance <span className="text-amber-400">Premium</span>
          </h1>
          <p className="text-gray-400 text-lg">
            Sua jornada para uma saúde cardiovascular completa
          </p>
        </motion.div>

        {/* Seleção de Plano */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 gap-3 mb-8"
        >
          <button
            onClick={() => setSelectedPlan('mensal')}
            className={`p-4 rounded-2xl border-2 transition-all ${
              selectedPlan === 'mensal'
                ? 'border-emerald-500 bg-emerald-500/10'
                : 'border-gray-700 bg-gray-800/50'
            }`}
          >
            <div className="text-sm text-gray-400 mb-1">Mensal</div>
            <div className="text-2xl font-bold">R$ 25</div>
            <div className="text-xs text-gray-500">/mês</div>
          </button>

          <button
            onClick={() => setSelectedPlan('anual')}
            className={`p-4 rounded-2xl border-2 transition-all relative ${
              selectedPlan === 'anual'
                ? 'border-emerald-500 bg-emerald-500/10'
                : 'border-gray-700 bg-gray-800/50'
            }`}
          >
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-xs px-3 py-1 rounded-full font-medium">
              Mais Popular
            </div>
            <div className="text-sm text-gray-400 mb-1">Anual</div>
            <div className="text-2xl font-bold">R$ 200</div>
            <div className="text-xs text-emerald-400">Economize R$ 100!</div>
          </button>
        </motion.div>

        {/* Benefícios */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gray-800/50 rounded-3xl p-6 mb-8 border border-gray-700"
        >
          <h2 className="font-semibold text-lg mb-5 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            O que você recebe
          </h2>
          <div className="space-y-4">
            {benefits.map((benefit, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                  <Check className="w-4 h-4 text-emerald-400" />
                </div>
                <span className="text-gray-300">{benefit}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Garantias */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-2 gap-3 mb-8"
        >
          <div className="bg-gray-800/30 rounded-xl p-4 text-center border border-gray-700/50">
            <Shield className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
            <div className="text-sm font-medium">7 dias de garantia</div>
            <div className="text-xs text-gray-500">Reembolso total</div>
          </div>
          <div className="bg-gray-800/30 rounded-xl p-4 text-center border border-gray-700/50">
            <Zap className="w-6 h-6 text-amber-400 mx-auto mb-2" />
            <div className="text-sm font-medium">Acesso imediato</div>
            <div className="text-xs text-gray-500">Ativação instantânea</div>
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Button
            onClick={handleActivate}
            disabled={isActivating}
            className="w-full bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white py-7 rounded-2xl text-lg font-semibold shadow-lg shadow-red-500/30 transition-all"
          >
            {isActivating ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                className="w-6 h-6 border-2 border-white border-t-transparent rounded-full"
              />
            ) : (
              <>
                Ativar Premium por R$ {selectedPlan === 'anual' ? '200/ano' : '25/mês'}
                <Sparkles className="w-5 h-5 ml-2" />
              </>
            )}
          </Button>

          <p className="text-center text-xs text-gray-500 mt-4">
            Ao ativar, você concorda com nossos termos de uso e política de privacidade.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
