import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, CreditCard, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createPageUrl } from "@/utils";
import { supabase } from "@/lib/supabaseClient";
import AuthGate from "@/components/AuthGate";

const PLANS = {
  mensal: { id: "mensal", name: "Mensal", price: 24.9, duration: 30 },
  trimestral: { id: "trimestral", name: "Trimestral", price: 59.9, duration: 90 },
  anual: { id: "anual", name: "Anual", price: 199.9, duration: 365 },
};

function goToDashboard() {
  // padrão do seu app (Base44) costuma usar createPageUrl com a key do pages.config
  window.location.href = createPageUrl("Dashboard");
}

export default function Checkout() {
  const [step, setStep] = useState(1); // 1=metodo, 2=dados, 3=confirmacao/pagar
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

  // Carrega usuário logado (se tiver)
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setUser(data.user);
        setPersonalData((p) => ({ ...p, email: data.user.email || p.email }));
      }
    });
  }, []);

  // Carrega plano selecionado (obrigatório)
  useEffect(() => {
    const planId = localStorage.getItem("heartbalance_selected_plan");
    if (!planId || !PLANS[planId]) {
      // Se não escolheu plano, volta para Vendas (onde escolhe o plano)
      window.location.href = createPageUrl("Vendas");
      return;
    }
    setSelectedPlan(PLANS[planId]);
  }, []);

  const isAdminDemo = useMemo(() => {
    // “modo vendedor/admin”: se o usuário for admin (profiles.role='admin'), vamos liberar sem MP.
    // Não depende do perfil completo aqui; vamos detectar no momento do pagamento.
    return false;
  }, []);

  const handleContinue = async () => {
    if (!paymentMethod) {
      alert("Selecione a forma de pagamento.");
      return;
    }

    if (!personalData.nome || !personalData.email || !personalData.cpf) {
      alert("Preencha todos os campos.");
      return;
    }

    const { data } = await supabase.auth.getUser();

    // Se não estiver logado, abre AuthGate (login/cadastro)
    if (!data?.user) {
      setShowAuth(true);
      return;
    }

    setUser(data.user);
    setStep(3);
  };

  async function markPlanActiveForUser(userId, planId) {
    // Tenta atualizar colunas novas (plano_ativo, plano_tipo etc).
    // Se sua tabela ainda não tiver tudo, não quebra o fluxo.
    const today = new Date();
    const startDate = today.toISOString().slice(0, 10);

    // Calcula plano_fim baseado em duration (dias)
    const durationDays = selectedPlan?.duration ?? 30;
    const end = new Date(today.getTime() + durationDays * 24 * 60 * 60 * 1000);
    const endDate = end.toISOString().slice(0, 10);

    // Primeiro tenta update
    const { error: updErr } = await supabase
      .from("profiles")
      .update({
        plano_ativo: true,
        plano_tipo: planId,
        plano_inicio: startDate,
        plano_fim: endDate,
      })
      .eq("id", userId);

    if (!updErr) return;

    // Fallback: tenta pelo menos setar algo simples (se existir só role, por exemplo)
    await supabase
      .from("profiles")
      .update({
        plano_ativo: true,
      })
      .eq("id", userId);
  }

  async function isUserAdmin(userId) {
    // lê role do profiles
    const { data, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();

    if (error) return false;
    return data?.role === "admin";
  }

  const handlePay = async () => {
    if (!user || !paymentMethod || !selectedPlan) return;

    setIsProcessing(true);

    try {
      // 1) Se for admin -> modo vendedor/demo: libera premium e vai pro Dashboard (sem MP)
      const admin = await isUserAdmin(user.id);
      if (admin) {
        await markPlanActiveForUser(user.id, selectedPlan.id);
        goToDashboard();
        return;
      }

      // 2) Usuário normal -> fluxo MercadoPago
      const resp = await fetch("/api/create-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: selectedPlan,
          userEmail: user.email,
          userId: user.id,
          paymentMethod, // opcional, mas ajuda no backend
        }),
      });

      const data = await resp.json().catch(() => ({}));

      if (!resp.ok || !data?.init_point) {
        alert("Erro ao iniciar pagamento (Mercado Pago).");
        setIsProcessing(false);
        return;
      }

      // Vai para MercadoPago
      window.location.href = data.init_point;
    } catch (e) {
      alert("Erro inesperado ao processar pagamento.");
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
              // Depois do login/cadastro, volta para o fluxo (não redireciona pro quiz)
              // Mantém o usuário no Checkout para seguir
            }}
          />
        </div>
      )}

      <div className="max-w-lg mx-auto bg-white p-6 rounded-3xl shadow-xl">
        <div className="flex items-center gap-3 mb-6">
          <ArrowLeft
            className="cursor-pointer"
            onClick={() => {
              if (step <= 1) {
                // volta para Vendas (seleção de plano)
                window.location.href = createPageUrl("Vendas");
              } else {
                setStep(step - 1);
              }
            }}
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
          {/* STEP 1 - Método */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
            >
              <Button
                className="w-full mb-3"
                onClick={() => {
                  setPaymentMethod("pix");
                  setStep(2);
                }}
              >
                <QrCode className="mr-2" /> PIX
              </Button>
              <Button
                className="w-full"
                onClick={() => {
                  setPaymentMethod("card");
                  setStep(2);
                }}
              >
                <CreditCard className="mr-2" /> Cartão
              </Button>
            </motion.div>
          )}

          {/* STEP 2 - Dados */}
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

              <Button className="w-full" onClick={handleContinue}>
                Continuar
              </Button>
            </motion.div>
          )}

          {/* STEP 3 - Confirmar e pagar */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <div className="bg-gray-50 p-4 rounded-xl">
                <p>
                  <b>Plano:</b> {selectedPlan.name}
                </p>
                <p>
                  <b>Valor:</b> R$ {selectedPlan.price.toFixed(2)}
                </p>
                <p>
                  <b>Método:</b> {paymentMethod === "pix" ? "PIX" : "Cartão"}
                </p>
              </div>

              <Button className="w-full" onClick={handlePay} disabled={isProcessing}>
                {isProcessing ? "Processando..." : "Pagar Agora"}
              </Button>

              <p className="text-xs text-gray-500 text-center">
                * Se você for admin, este botão libera acesso e vai direto para o Dashboard (modo vendedor).
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
