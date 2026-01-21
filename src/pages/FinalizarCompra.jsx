import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, AlertCircle, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createPageUrl } from "@/utils";
import { supabase } from "@/lib/supabaseClient";

export default function FinalizarCompra() {
  const [status, setStatus] = useState("processing"); // processing, success, error
  const [message, setMessage] = useState("Ativando seu plano premium...");

  useEffect(() => {
    activatePlan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activatePlan = async () => {
    try {
      // 1) Garantir que existe sessão (anônima ou normal)
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;

      let session = sessionData?.session;

      if (!session?.user) {
        const { data: anonData, error: anonError } = await supabase.auth.signInAnonymously();
        if (anonError) throw anonError;
        session = anonData?.session;
      }

      if (!session?.user) {
        throw new Error("Sessão não encontrada para ativar o plano.");
      }

      const user = session.user;

      // 2) Ler dados da compra e do quiz
      const purchaseDataRaw = localStorage.getItem("heartbalance_purchase_data");
      const quizDataRaw = localStorage.getItem("heartbalance_quiz");

      if (!purchaseDataRaw) {
        setStatus("error");
        setMessage("Dados de compra não encontrados");
        return;
      }

      const purchase = JSON.parse(purchaseDataRaw);
      const quiz = quizDataRaw ? JSON.parse(quizDataRaw) : {};

      // 3) Montar payload do perfil
      const today = new Date().toISOString().split("T")[0];

      const profilePayload = {
        user_id: user.id, // chave de vínculo
        plano_ativo: true,
        data_inicio_plano: today,
        // defaults (mantidos do seu código)
        rank: "Iniciante",
        xp_total: 0,
        metas_concluidas: 0,
        dias_consecutivos: 0,
        // dados do quiz (se houver)
        ...quiz,
        // dados de compra (se quiser usar depois)
        plano_nome: purchase?.plan?.name ?? null,
        plano_duracao_dias: purchase?.plan?.duration ?? null,
        plano_preco: purchase?.plan?.price ?? null,
        metodo_pagamento: purchase?.paymentMethod ?? null,
      };

      // 4) Upsert no Supabase (cria ou atualiza)
      // IMPORTANT: se sua tabela tiver outro nome, vamos ajustar no próximo passo.
      const { error: upsertError } = await supabase
        .from("user_profiles")
        .upsert(profilePayload, { onConflict: "user_id" });

      if (upsertError) throw upsertError;

      // 5) Limpar dados temporários
      localStorage.removeItem("heartbalance_purchase_data");
      localStorage.removeItem("heartbalance_quiz");
      localStorage.removeItem("heartbalance_selected_plan");

      setStatus("success");
      setMessage("Plano premium ativado com sucesso!");

      setTimeout(() => {
        window.location.href = createPageUrl("Dashboard");
      }, 2000);
    } catch (error) {
      console.error("Erro ao ativar plano:", error);
      setStatus("error");
      setMessage(
        "Erro ao ativar plano. Tente novamente."
      );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-rose-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-xl"
      >
        {status === "processing" && (
          <>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              className="w-16 h-16 border-4 border-red-500 border-t-transparent rounded-full mx-auto mb-6"
            />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Processando...</h2>
            <p className="text-gray-600">{message}</p>
          </>
        )}

        {status === "success" && (
          <>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="w-16 h-16 bg-green-100 rounded-full mx-auto mb-6 flex items-center justify-center"
            >
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </motion.div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Bem-vindo ao Premium!</h2>
            <p className="text-gray-600 mb-6">{message}</p>
            <div className="bg-red-50 rounded-xl p-4 mb-6">
              <p className="text-sm text-red-800 font-medium">
                <Zap className="w-4 h-4 inline mr-1" />
                Redirecionando para o Dashboard...
              </p>
            </div>
          </>
        )}

        {status === "error" && (
          <>
            <div className="w-16 h-16 bg-red-100 rounded-full mx-auto mb-6 flex items-center justify-center">
              <AlertCircle className="w-10 h-10 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Ops! Algo deu errado</h2>
            <p className="text-gray-600 mb-6">{message}</p>
            <Button
              onClick={() => (window.location.href = createPageUrl("Vendas"))}
              className="w-full bg-red-500 hover:bg-red-600 text-white py-5 rounded-xl"
            >
              Tentar Novamente
            </Button>
          </>
        )}
      </motion.div>
    </div>
  );
}
