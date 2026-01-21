import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createPageUrl } from "@/utils";
import { supabase } from "@/lib/supabaseClient";
import AuthGate from "@/components/AuthGate";

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

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setUser(data.user);
        setPersonalData((p) => ({ ...p, email: data.user.email || "" }));
      }
    });
  }, []);

  useEffect(() => {
    const planId = localStorage.getItem("heartbalance_selected_plan");
    if (!planId || !plans[planId]) {
      window.location.href = createPageUrl("Vendas");
      return;
    }
    setSelectedPlan(plans[planId]);
  }, []);

  // 🔥 LOGIN É OBRIGATÓRIO ANTES DE IR PARA O STEP 3
  const handleContinuePersonalData = async () => {
    if (!personalData.nome || !personalData.email || !personalData.cpf) {
      alert("Por favor, preencha Nome, Email e CPF.");
      return;
    }

    const { data } = await supabase.auth.getUser();

    if (!data?.user) {
      setShowAuth(true);
      return;
    }

    setUser(data.user);
    setStep(3);
  };

  const handleFinalizePurchase = async () => {
    if (!selectedPlan) return;
    if (!paymentMethod) {
      alert("Selecione o método de pagamento.");
      return;
    }

    if (!user) {
      setShowAuth(true);
      return;
    }

    setIsProcessing(true);

    try {
      localStorage.setItem(
        "heartbalance_purchase_data",
        JSON.stringify({
          plan: selectedPlan,
          paymentMethod,
          personalData,
          timestamp: Date.now(),
        })
      );

      const resp = await fetch("/api/create-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: selectedPlan,
          userEmail: user.email,
          userId: user.id,
        }),
      });

      const data = await resp.json();

      if (!resp.ok || !data?.init_point) {
        throw new Error("Falha ao criar pagamento");
      }

      window.location.href = data.init_point;
    } catch (error) {
      console.error("Erro ao iniciar pagamento:", error);
      alert("Não foi possível iniciar o pagamento.");
      setIsProcessing(false);
    }
  };

  if (!selectedPlan) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} />
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

        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => {
              if (step > 1) setStep(step - 1);
              else window.location.href = createPageUrl("Vendas");
            }}
            className="w-10 h-10 bg-white border rounded-xl"
          >
            <ArrowLeft />
          </button>
          <div>
            <h1>Finalizar Compra</h1>
            <p>Plano {selectedPlan.name}</p>
          </div>
        </div>

        <div className="flex gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className={`h-2 flex-1 ${s <= step ? "bg-red-500" : "bg-gray-200"}`} />
          ))}
        </div>

        {step === 1 && (
          <>
            <Button onClick={() => { setPaymentMethod("pix"); setStep(2); }}>PIX</Button>
            <Button onClick={() => { setPaymentMethod("card"); setStep(2); }}>Cartão</Button>
          </>
        )}

        {step === 2 && (
          <>
            <Input placeholder="Nome" value={personalData.nome} onChange={e => setPersonalData({ ...personalData, nome: e.target.value })} />
            <Input placeholder="Email" value={personalData.email} onChange={e => setPersonalData({ ...personalData, email: e.target.value })} />
            <Input placeholder="CPF" value={personalData.cpf} onChange={e => setPersonalData({ ...personalData, cpf: e.target.value })} />
            <Button onClick={handleContinuePersonalData}>Continuar</Button>
          </>
        )}

        {step === 3 && (
          <Button onClick={handleFinalizePurchase} disabled={isProcessing}>
            {isProcessing ? "Redirecionando..." : "Finalizar e Pagar"}
          </Button>
        )}

      </div>
    </div>
  );
}
