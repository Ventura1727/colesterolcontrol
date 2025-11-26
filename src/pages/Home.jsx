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
      const user = await base44.auth.me();
      const profiles = await base44.entities.UserProfile.filter({ created_by: user.email });
      
      if (profiles.length > 0 && profiles[0].quiz_completo) {
        // Usuário já completou o quiz
        window.location.href = createPageUrl('Dashboard');
      } else {
        // Novo usuário ou não completou o quiz
        window.location.href = createPageUrl('Onboarding');
      }
    } catch (error) {
      // Se não estiver logado, redireciona para onboarding
      window.location.href = createPageUrl('Onboarding');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center">
      <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}