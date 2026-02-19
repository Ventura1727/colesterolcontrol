import React, { useEffect, useState } from "react";
import { createPageUrl } from "@/utils";
import { supabase } from "@/lib/supabaseClient";
import { motion } from "framer-motion";
import { Heart, LogIn, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Home() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      try {
        // ✅ Se já estiver logado, manda direto pro Dashboard
        const { data } = await supabase.auth.getSession();
        const session = data?.session;

        if (session?.user) {
          window.location.href = createPageUrl("Dashboard");
          return;
        }
      } catch {
        // se der erro, só mostra os botões mesmo
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    bootstrap();
    return () => {
      mounted = false;
    };
  }, []);

  const goLogin = () => {
    // ✅ Login e depois volta pro Dashboard
    window.location.href = `/login?next=${encodeURIComponent("/dashboard")}`;
  };

  const goOnboarding = () => {
    // ✅ Novo usuário: quiz / onboarding
    window.location.href = createPageUrl("Onboarding");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-rose-50 flex items-center justify-center">
        <div className="w-8 h-8 border-[3px] border-red-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-rose-50 px-4 py-10 flex items-center justify-center">
      <div className="w-full max-w-md">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-gray-200 shadow-sm rounded-3xl p-6"
        >
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-rose-600 rounded-2xl flex items-center justify-center shadow-lg shadow-red-200 mb-4">
              <Heart className="w-8 h-8 text-white" fill="white" />
            </div>

            <h1 className="text-2xl font-bold text-gray-900">HeartBalance</h1>
            <p className="text-sm text-gray-600 mt-1">
              Controle seu colesterol com hábitos guiados e acompanhamento inteligente.
            </p>
          </div>

          <div className="mt-6 space-y-3">
            <Button
              onClick={goLogin}
              className="w-full bg-gray-900 hover:bg-gray-800 text-white py-6 rounded-2xl text-base font-semibold"
            >
              <LogIn className="w-5 h-5 mr-2" />
              Já tenho conta
            </Button>

            <Button
              onClick={goOnboarding}
              className="w-full bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white py-6 rounded-2xl text-base font-semibold"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Sou novo, quero começar
            </Button>
          </div>

          <div className="mt-4 text-center text-xs text-gray-500">
            Se você já é Premium, após login você entra direto no Dashboard.
          </div>
        </motion.div>
      </div>
    </div>
  );
}
