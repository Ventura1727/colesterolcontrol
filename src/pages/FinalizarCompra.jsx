import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Heart, Sparkles } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';

export default function FinalizarCompra() {
  const [status, setStatus] = useState('processing');

  useEffect(() => {
    finalizarCompra();
  }, []);

  const finalizarCompra = async () => {
    try {
      const user = await base44.auth.me();
      const pendingPurchase = JSON.parse(localStorage.getItem('heartbalance_pending_purchase') || '{}');
      const quizData = pendingPurchase.quiz || JSON.parse(localStorage.getItem('heartbalance_quiz') || '{}');

      // Verificar se já tem perfil
      const profiles = await base44.entities.UserProfile.filter({ created_by: user.email });

      if (profiles.length > 0) {
        await base44.entities.UserProfile.update(profiles[0].id, {
          ...quizData,
          plano_ativo: true,
          data_inicio_plano: new Date().toISOString().split('T')[0],
          rank: profiles[0].rank || 'Iniciante',
          xp_total: profiles[0].xp_total || 0,
          metas_concluidas: profiles[0].metas_concluidas || 0,
          dias_consecutivos: profiles[0].dias_consecutivos || 0
        });
      } else {
        await base44.entities.UserProfile.create({
          ...quizData,
          plano_ativo: true,
          data_inicio_plano: new Date().toISOString().split('T')[0],
          rank: 'Iniciante',
          xp_total: 0,
          metas_concluidas: 0,
          dias_consecutivos: 0
        });
      }

      // Limpar dados locais
      localStorage.removeItem('heartbalance_quiz');
      localStorage.removeItem('heartbalance_pending_purchase');

      setStatus('success');

      // Redirecionar após 2 segundos
      setTimeout(() => {
        window.location.href = createPageUrl('Dashboard');
      }, 2000);

    } catch (error) {
      console.error(error);
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center max-w-sm"
      >
        {status === 'processing' && (
          <>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
              className="w-16 h-16 border-4 border-emerald-600 border-t-transparent rounded-full mx-auto mb-6"
            />
            <h1 className="text-xl font-bold text-gray-900 mb-2">Ativando seu acesso...</h1>
            <p className="text-gray-600">Aguarde um momento</p>
          </>
        )}

        {status === 'success' && (
          <>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200 }}
              className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full mx-auto mb-6 flex items-center justify-center"
            >
              <Check className="w-10 h-10 text-white" />
            </motion.div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Parabéns! 🎉</h1>
            <p className="text-gray-600 mb-4">Seu acesso Premium foi ativado com sucesso!</p>
            <div className="flex items-center justify-center gap-2 text-emerald-600">
              <Sparkles className="w-5 h-5" />
              <span>Redirecionando para seu painel...</span>
            </div>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-20 h-20 bg-red-100 rounded-full mx-auto mb-6 flex items-center justify-center">
              <Heart className="w-10 h-10 text-red-500" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Ops! Algo deu errado</h1>
            <p className="text-gray-600 mb-4">Não foi possível ativar seu acesso. Tente novamente.</p>
            <button
              onClick={() => window.location.href = createPageUrl('Checkout')}
              className="text-emerald-600 font-medium"
            >
              Tentar novamente
            </button>
          </>
        )}
      </motion.div>
    </div>
  );
}