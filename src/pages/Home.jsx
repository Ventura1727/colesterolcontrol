import React, { useEffect, useState } from 'react';
import { createPageUrl } from '@/utils';

export default function Home() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkUserStatus();
  }, []);

  const checkUserStatus = async () => {
    try {
      // Verificar se tem quiz salvo localmente
      const savedQuiz = localStorage.getItem('heartbalance_quiz');
      if (savedQuiz) {
        // Já fez o quiz, vai para o Dashboard (modo teste)
        window.location.href = createPageUrl('Dashboard');
        return;
      }

      // Verificar se tem plano ativo salvo localmente
      const purchaseData = localStorage.getItem('heartbalance_purchase_data');
      if (purchaseData) {
        const parsed = JSON.parse(purchaseData);
        if (parsed.plan && parsed.plan.name) {
          // Usuário premium - vai para Dashboard
          window.location.href = createPageUrl('Dashboard');
          return;
        }
      }

      // Novo visitante - vai para o quiz
      window.location.href = createPageUrl('Onboarding');
    } catch (error) {
      // Qualquer erro, redireciona para onboarding
      window.location.href = createPageUrl('Onboarding');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center">
      {isLoading && (
        <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      )}
    </div>
  );
}
