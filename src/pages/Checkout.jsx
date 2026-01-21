import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createPageUrl } from "@/utils";
import { supabase } from "@/lib/supabaseClient";
import AuthGate from "@/components/AuthGate";

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

  const [user, setUser] = useState(null);
  const [showAuth, setShowAuth] = useState(false);

  const [personalData, setPersonalData] = useState({
    nome: "",
    email: "",
    cpf: "",
    telefone: "",
  });

  // Carregar usuário autenticado
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setUser(data.user);
        setPersonalData((p) => ({ ...p, email: data.user.email || "" }));
      }
    });
  }, []);

  // Carregar plano selecionado
  useEffect(() => {
    const planId = localStorage.getItem("heartbalance_selected_plan");
    if (!planId || !plans[planId]) {
      window.location.href = createPageUrl("Vendas");
      return;
    }
    setSelectedPlan(plans[planId]);
  }, []);

  const handleContinuePersonalData = () => {
    if (!personalData.nome || !personalData.email || !personalData.cpf) {
      alert("Por favor, preencha Nome, Email e CPF.");
      return;
    }
    setStep(3);
  };

  const handleFinalizePurchase = async () => {
    if (!selectedPlan) return;
    if (!paymentMethod) {
      alert("Selecione o método de pagamento.");
      return;
    }

    // 🔥 Usuário precisa estar autenticado
    if (!user) {
      setShowAuth(true);
      return;
    }

    setIsProcessing(true);

    try {
      // Salvar dados localmente
      localStorage.setItem(
        "heartbalance_purchase_data",
        JSON.stringify({
          plan: selectedPlan,
          paymentMethod,
          personalData,
          timestamp: Date.now(),
        })
      );

      // Criar preferência no Mercado Pago
      const resp = await fetch("/api/create-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: selectedPlan,
          userEmail: user.email,
          userId: user.id, // 🔥 UID do Supabase
        }),
      });

      const data = await resp.json();

      if (!resp.ok) {
        console.error("Erro create-payment:", data);
        throw new Error(data?.error || "Falha ao criar pagamento");
      }

      if (!data?.init_point) {
        throw new Error("Mercado Pago não retornou init_point");
      }

      // Redirecionar para o checkout do Mercado Pago
      window.location.href = data.init_point;
    } catch (error) {
      console.error("Erro ao iniciar pagamento:", error);
      alert("Não foi possível iniciar o pagamento. Tente novamente.");
      setIsProcessing(false);
    }
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-rose-50">
      <div className="max-w-lg mx-auto px-4 py-6">

        {showAuth && (
          <div className="mb-6 bg-white p-4 rounded-xl border">
            <AuthGate
              onSuccess={(u) => {
                setUser(u);
                setPersonalData((p) => ({ ...p, email: u.email || "" }));
                setShowAuth(false);
              }}
            />
          </div>
        )}

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => {
              if (step > 1) setStep(step - 1);
              else window.location.href = createPageUrl("Vendas");
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

        {/* Progress */}
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

        {/* Step 1 */}
        {step === 1 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            <Button
              className="w-full"
              onClick={() => {
                setPaymentMethod("pix");
                setStep(2);
              }}
            >
              PIX
            </Button>

            <Button
              className="w-full"
              onClick={() => {
                setPaymentMethod("card");
                setStep(2);
              }}
            >
              Cartão
            </Button>
          </motion.div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-3">
            <Input
              placeholder="Nome"
              value={personalData.nome}
              onChange={(e) => setPersonalData({ ...personalData, nome: e.target.value })}
            />
            <Input
              placeholder="Email"
              value={personalData.email}
              onChange={(e) => setPersonalData({ ...personalData, email: e.target.value })}
            />
            <Input
              placeholder="CPF"
              value={personalData.cpf}
              onChange={(e) => setPersonalData({ ...personalData, cpf: e.target.value })}
            />
            <Input
              placeholder="Telefone (opcional)"
              value={personalData.telefone}
              onChange={(e) => setPersonalData({ ...personalData, telefone: e.target.value })}
            />

            <Button className="w-full" onClick={handleContinuePersonalData}>
              Continuar
            </Button>
          </motion.div>
        )}

        {/* Step 3 */}
        {step === 3 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
            <div className="bg-white rounded-2xl p-4 border border-gray-200">
              <div className="flex items-center justify-between">
                <span className="text-gray-700">Plano</span>
                <span className="font-semibold">{selectedPlan.name}</span>
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-gray-700">Valor</span>
                <span className="font-semibold">R$ {Number(selectedPlan.price).toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-gray-700">Método</span>
                <span className="font-semibold">{paymentMethod === "pix" ? "PIX" : "Cartão"}</span>
              </div>
            </div>

            <Button
              className="w-full"
              onClick={handleFinalizePurchase}
              disabled={isProcessing}
            >
              {isProcessing ? "Redirecionando..." : "Finalizar e Pagar"}
            </Button>
          </motion.div>
        )}

      </div>
    </div>
  );
}
