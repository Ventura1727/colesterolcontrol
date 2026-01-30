import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, CreditCard, QrCode } from "lucide-react";
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

  const handleContinue = async () => {
    if (!personalData.nome || !personalData.email || !personalData.cpf) {
      alert("Preencha todos os campos.");
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

  /**
   * ✅ MODO VENDEDOR (ADMIN):
   * - Se profiles.role === 'admin':
   *   - libera premium demo
   *   - não vai para Mercado Pago
   *   - redireciona para página premium
   */
  const handlePay = async () => {
    if (!user || !paymentMethod) return;

    setIsProcessing(true);

    try {
      // 1) Confere role do usuário
      const { data: prof, error: profErr } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      const isAdmin = !profErr && prof?.role === "admin";

      if (isAdmin) {
        // 2) Libera premium demo
        localStorage.setItem("hb_demo_premium", "1");

        // 3) Redireciona para área premium (ajuste o nome se necessário)
        window.location.href = createPageUrl("Alimentação");
        return;
      }

      // 4) Não-admin: fluxo normal Mercado Pago
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
        alert("Erro ao iniciar pagamento");
        setIsProcessing(false);
        return;
      }

      window.location.href = data.init_point;
    } catch (e) {
      alert("Erro inesperado. Tente novamente.");
      setIsProcessing(false);
    }
  };

  if (!selectedPlan) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 to-white p-6">
      {showAuth && (
        <div className="max-w-md mx-auto bg-white p-6 rounded-xl shadow mb-6">
          <AuthGate
            onSuccess={(u) => {
              setUser(u);
              setShowAuth(false);
              // opcional: já preenche email
              if (u?.email) setPersonalData((p) => ({ ...p, email: u.email }));
            }}
          />
        </div>
      )}

      <div className="max-w-lg mx-auto bg-white p-6 rounded-3xl shadow-xl">
        <div className="flex items-center gap-3 mb-6">
          <ArrowLeft
            className="cursor-pointer"
            onClick={() => setStep((s) => Math.max(1, s - 1))}
          />
          <div>
            <h2 className="text-xl font-bold">Finalizar Compra</h2>
            <p className="text-sm text-gray-500">{selectedPlan.name}</p>
          </div>
        </div>

        <div className="flex mb-6 gap-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-2 flex-1 rounded-full ${s <= step ? "bg-red-500" : "bg-gray-200"}`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
            >
              <Button className="w-full mb-3" onClick={() => { setPaymentMethod("pix"); setStep(2); }}>
                <QrCode className="mr-2" /> PIX
              </Button>
              <Button className="w-full" onClick={() => { setPaymentMethod("card"); setStep(2); }}>
                <CreditCard className="mr-2" /> Cartão
              </Button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
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

              <Button className="w-full" onClick={handleContinue} disabled={isProcessing}>
                Continuar
              </Button>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <div className="bg-gray-50 p-4 rounded-xl">
                <p><b>Plano:</b> {selectedPlan.name}</p>
                <p><b>Valor:</b> R$ {selectedPlan.price.toFixed(2)}</p>
                <p><b>Método:</b> {paymentMethod === "pix" ? "PIX" : "Cartão"}</p>
              </div>

              <Button className="w-full" onClick={handlePay} disabled={isProcessing}>
                {isProcessing ? "Processando..." : "Pagar Agora"}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
