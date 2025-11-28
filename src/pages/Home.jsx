import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';

export default function Home() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkUserStatus();
  }, []);

  const checkUserStatus = async () => {
    try {
      // Verificar se está autenticado primeiro
      const isAuth = await base44.auth.isAuthenticated();
      
      if (isAuth) {
        const user = await base44.auth.me();
        const profiles = await base44.entities.UserProfile.filter({ created_by: user.email });
        
        if (profiles.length > 0 && profiles[0].plano_ativo) {
          // Usuário premium - vai para Dashboard
          window.location.href = createPageUrl('Dashboard');
          return;
        }
      }
      
      // Verificar se tem quiz salvo localmente
      const savedQuiz = localStorage.getItem('heartbalance_quiz');
      if (savedQuiz) {
        // Já fez o quiz, vai para página de vendas
        window.location.href = createPageUrl('Vendas');
      } else {
        // Novo visitante - vai para o quiz
        window.location.href = createPageUrl('Onboarding');
      }
    } catch (error) {
      // Qualquer erro, redireciona para onboarding
      window.location.href = createPageUrl('Onboarding');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center">
      <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}