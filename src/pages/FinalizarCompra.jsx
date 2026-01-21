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
      // 1) Garantir sessão
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;

      let session = sessionData?.session;

      if (!session?.user) {
        const { data: anonData, error: anonError } = await supabase.auth.signInAnonymously();
        if (anonError) throw anonError;
        session = anonData?.session;
      }

      if (!session?.user) {
        throw new Error("Sessão não encontrada");
      }

      const user = session.user;
      const createdBy = user.email || user.id;

      // 2) Ler dados do localStorage
      const purchaseRaw = localStorage.getItem("heartbalance_purchase_data");
      if (!purchaseRaw) {
        setStatus("error");
        setMessage("Dados de compra não encontrados");
        return;
      }

      const purchase = JSON.parse(purchaseRaw);
      const today = new Date().toISOString().split("T")[0];

      // 3) Payload do perfil
      const profilePayload = {
        created_by: createdBy,
        plano_ativo: true,
        plano_tipo: purchase?.plan?.name ?? "Premium",
        data_inicio_plano: today,
      };

      // 4) Verificar se já existe perfil
      const { data: existing, error: selectError } = await supabase
        .from("user_profiles")
        .select("id")
        .eq("created_by", createdBy)
        .limit(1);

      if (selectError) throw selectError;

      if (existing && existing.length > 0) {
        // Atualizar
        const { error: updateError } = await supabase
          .from("user_profiles")
          .update({
            plano_ativo: profilePayload.plano_ativo,
            plano_tipo: profilePayload.plano_tipo,
            data_inicio_plano: profilePayload.data_inicio_plano,
          })
          .eq("id", existing[0].id);

        if (updateError) throw updateError;
      } else {
        // Criar
        const { error: insertError } = await supabase
          .from("user_profiles")
          .insert(profilePayload);

        if (insertError) throw insertError;
      }

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
      setMessage("Erro ao ativar plano. Tente novamente.");
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
