import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, TrendingUp, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createPageUrl } from "@/utils";
import { supabase } from "@/lib/supabaseClient";

export default function Progresso() {
  const [isLoading, setIsLoading] = useState(true);
  const [authUser, setAuthUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [fatalError, setFatalError] = useState("");

  const displayName = useMemo(() => {
    // ✅ NUNCA assume campos (evita ".me" quebrando)
    const fromProfile =
      profile?.nome ||
      profile?.name ||
      profile?.full_name ||
      profile?.display_name ||
      null;

    const fromAuth =
      authUser?.user_metadata?.name ||
      authUser?.user_metadata?.full_name ||
      authUser?.email ||
      null;

    return fromProfile || fromAuth || "Usuário";
  }, [profile, authUser]);

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      setFatalError("");

      try {
        // 1) sessão
        const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
        if (sessionErr) throw sessionErr;

        const session = sessionData?.session;
        const user = session?.user;

        if (!user) {
          // sem sessão → manda pro login (ou outra rota)
          window.location.href = createPageUrl("Login");
          return;
        }

        setAuthUser(user);

        // 2) profile (opcional; não pode crashar se não existir)
        const { data: p, error: pErr } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();

        if (pErr) {
          // Não é fatal; só loga
          console.warn("Progresso: erro ao carregar profile:", pErr);
        } else {
          setProfile(p || null);
        }
      } catch (e) {
        console.error("Progresso fatal:", e);
        setFatalError(e?.message || String(e));
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto p-4 md:p-6">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" onClick={() => (window.location.href = createPageUrl("Dashboard"))}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">Progresso</h1>
            <p className="text-muted-foreground">Acompanhe sua evolução</p>
          </div>
        </div>

        {isLoading && (
          <div className="text-sm text-muted-foreground">Carregando progresso...</div>
        )}

        {!isLoading && fatalError && (
          <div className="rounded-2xl border p-5 bg-red-50">
            <div className="flex items-center gap-2 text-red-700 font-semibold">
              <AlertCircle className="w-5 h-5" />
              Erro ao carregar Progresso
            </div>
            <div className="text-sm text-red-700 mt-2 break-words">{fatalError}</div>
            <div className="text-xs text-red-700 mt-2 opacity-80">
              (Isso evita página em branco. Agora dá para ajustar o ponto exato no código sem travar a UI.)
            </div>
          </div>
        )}

        {!isLoading && !fatalError && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border bg-card p-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-indigo-600" />
              <h2 className="text-lg font-semibold">Olá, {displayName}</h2>
            </div>

            <div className="text-sm text-muted-foreground">
              Página de Progresso carregou sem crash. Agora podemos plugar os gráficos/indicadores reais
              (peso, colesterol, exercícios, hidratação, etc.) com segurança.
            </div>

            <div className="mt-5 text-xs text-muted-foreground">
              Debug rápido: user id = <span className="font-mono">{authUser?.id}</span>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
