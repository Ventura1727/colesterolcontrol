import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createPageUrl } from "@/utils";
import { supabase } from "@/lib/supabaseClient";

// Planos disponíveis
const plans = {
  mensal: { name: "Mensal", price: 24.9, duration: 30 },
  trimestral: { name: "Trimestral", price: 59.9, duration: 90 },
  anual: { name: "Anual", price: 199.9, duration: 365 },
};

export default function Checkout() {
  const [step, setStep] = useState(1);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState(null);
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

  // Finalizar compra (COM SESSÃO ANÔNIMA)
  const handleFinalizePurchase = async () => {
    setIsProcessing(true);

    try {
      // 1. Verificar sessão atual
      const { data: sessionData } = await supabase.auth.getSession();
      let session = sessionData?.session;

      // 2. Se não existir sessão, criar sessão anônima
      if (!session?.user) {
        const { data: anonData, error } = await supabase.auth.signInAnonymously();
        if (error) throw error;
        session = anonData.session;
      }

      if (!session?.user) {
        throw new Error("Falha ao iniciar sessão para pagamento");
      }

      // 3. Salvar dados da compra
      localStorage.setItem(
        "heartbalance_purchase_data",
        JSON.stringify({
          userId: session.user.id,
          plan: selectedPlan,
          paymentMethod,
          personalData,
          timestamp: Date.now(),
        })
      );

      // 4. Redirecionar
      window.location.href = createPageUrl("FinalizarCompra");
    } catch (error) {
      console.error("Checkout error:", error);
      alert("Erro ao iniciar pagamento. Tente novamente.");
      setIsProcessing(false);
    }
  };

  if (!selectedPlan) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-rose-50">
      <div className="max-w-lg mx-auto px-4 py-6">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => window.location.href = createPageUrl("Vendas")}
            className="w-10 h-10 rounded-xl bg-white border flex items-center justify-center"
          >
            <ArrowLeft />
          </button>
          <div>
            <h1 className="text-xl font-bold">Finalizar Compra</h1>
            <p className="text-sm text-gray-500">Plano {selectedPlan.name}</p>
          </div>
        </div>

        {/* Etapas */}
        <div className="flex gap-2 mb-8">
          {[1, 2, 3].map(s => (
            <div key={s} className={`h-2 flex-1 rounded ${s <= step ? "bg-red-500" : "bg-gray-200"}`} />
          ))}
        </div>

        {step === 1 && (
          <div>
            <Button onClick={() => { setPaymentMethod("pix"); setStep(2); }}>PIX</Button>
            <Button onClick={() => { setPaymentMethod("card"); setStep(2); }}>Cartão</Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-2">
            <Input placeholder="Nome" value={personalData.nome} onChange={e => setPersonalData({ ...personalData, nome: e.target.value })} />
            <Input placeholder="Email" value={personalData.email} onChange={e => setPersonalData({ ...personalData, email: e.target.value })} />
            <Input placeholder="CPF" value={personalData.cpf} onChange={e => setPersonalData({ ...personalData, cpf: e.target.value })} />
            <Button onClick={() => setStep(3)}>Continuar</Button>
          </div>
        )}

        {step === 3 && (
          <div>
            <Button className="w-full" onClick={handleFinalizePurchase} disabled={isProcessing}>
              {isProcessing ? "Processando..." : "Finalizar"}
            </Button>
          </div>
        )}

      </div>
    </div>
  );
}
