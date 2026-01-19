import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, CreditCard, Smartphone, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createPageUrl } from "@/utils";
import { supabase } from "@/lib/supabaseClient"; // <-- CORRECAO: importar supabase

// Planos disponíveis
const plans = {
  mensal: { name: "Mensal", price: 24.9, duration: 30 },
  trimestral: { name: "Trimestral", price: 59.9, duration: 90 },
  anual: { name: "Anual", price: 199.9, duration: 365 },
};

export default function Checkout() {
  const [step, setStep] = useState(1); // 1 = método, 2 = dados pessoais, 3 = pagamento
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState(null); // 'pix' ou 'card'
  const [isProcessing, setIsProcessing] = useState(false);

  const [personalData, setPersonalData] = useState({
    nome: "",
    email: "",
    cpf: "",
    telefone: "",
  });

  const [cardData, setCardData] = useState({
    numero: "",
    nome: "",
    validade: "",
    cvv: "",
  });

  // Carregar plano selecionado
  useEffect(() => {
    const planId = localStorage.getItem("heartbalance_selected_plan");
    if (!planId || !plans[planId]) {
      window.location.href = createPageUrl("Vendas");
      return;
    }
    setSelectedPlan(plans[planId]);
  }, []);

  // Validação dos dados pessoais
  const handlePersonalDataSubmit = () => {
    if (!personalData.nome || !personalData.email || !personalData.cpf) {
      alert("Por favor, preencha todos os campos obrigatórios");
      return;
    }
    setStep(3);
  };

  // Finalização da compra
  const handleFinalizePurchase = async () => {
    setIsProcessing(true);

    try {
      // 1) Checar sessão (mais robusto para fluxo de checkout)
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;

      const session = sessionData?.session;

      // 2) Se não tem sessão, redireciona para login e NÃO deixa tela branca
      if (!session?.user) {
        const returnUrl = createPageUrl("FinalizarCompra");
        window.location.href = `/login?returnUrl=${encodeURIComponent(returnUrl)}`;
        return;
      }

      const user = session.user;
      console.log("Usuário autenticado:", user);

      // Salvar dados da compra
      localStorage.setItem(
        "heartbalance_purchase_data",
        JSON.stringify({
          plan: selectedPlan,
          paymentMethod,
          personalData,
          timestamp: Date.now(),
        })
      );

      // Redirecionar para finalização
      window.location.href = createPageUrl("FinalizarCompra");
    } catch (error) {
      console.error("Erro ao processar checkout:", error);
      alert("Erro ao processar pagamento. Tente novamente.");
      setIsProcessing(false);
    }
  };

  // Formatação de cartão
  const formatCardNumber = (value) => {
    return value.replace(/\s/g, "").match(/.{1,4}/g)?.join(" ") || value;
  };

  const formatExpiry = (value) => {
    const cleaned = value.replace(/\D/g, "");
    if (cleaned.length >= 2) {
      return cleaned.slice(0, 2) + "/" + cleaned.slice(2, 4);
    }
    return cleaned;
  };

  if (!selectedPlan) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-rose-50 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-8 h-8 border-3 border-red-600 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  const currentPrice = selectedPlan.price;

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-rose-50">
      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => {
              if (step > 1) {
                setStep(step - 1);
              } else {
                window.location.href = createPageUrl("Vendas");
              }
            }}
            className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Finalizar Compra</h1>
            <p className="text-sm text-gray-500">Plano {selectedPlan.name}</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="flex gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-2 flex-1 rounded-full transition-all ${
                s <= step ? "bg-red-500" : "bg-gray-200"
              }`}
            />
          ))}
        </div>

        {/* Step 1: Escolher Método */}
        {step === 1 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            {/* PIX e Cartão */}
            {/* ... (mantenha seu conteúdo aqui) */}
          </motion.div>
        )}

        {/* Step 2: Dados Pessoais */}
        {step === 2 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            {/* Campos Nome, Email, CPF, Telefone */}
            {/* Botão Continuar */}
          </motion.div>
        )}

        {/* Step 3: Finalizar */}
        {step === 3 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
            {/* PIX ou Cartão */}
            {/* Resumo da compra */}

            {/* Botão Finalizar (exemplo) */}
            <Button
              className="w-full"
              onClick={handleFinalizePurchase}
              disabled={isProcessing || !paymentMethod}
            >
              {isProcessing ? "Processando..." : "Finalizar"}
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
