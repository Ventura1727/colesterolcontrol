import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, CreditCard, QrCode, ShieldCheck, LogOut, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createPageUrl } from "@/utils";
import { supabase } from "@/lib/supabaseClient";
import AuthGate from "@/components/AuthGate";

const PLANS = {
  mensal: { id: "mensal", name: "Mensal", price: 24.9, durationDays: 30 },
  trimestral: { id: "trimestral", name: "Trimestral", price: 59.9, durationDays: 90 },
  anual: { id: "anual", name: "Anual", price: 199.9, durationDays: 365 },
};

function goToDashboard() {
  window.location.href = createPageUrl("Dashboard");
}

function normalizeCpf(value) {
  return (value || "").replace(/\D/g, "").slice(0, 11);
}

function isValidCpfDigits(cpfDigits) {
  return typeof cpfDigits === "string" && cpfDigits.length === 11;
}

function loadSelectedPlan() {
  const raw = localStorage.getItem("heartbalance_selected_plan");
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    const planId = parsed?.id;
    if (planId && PLANS[planId]) return PLANS[planId];
  } catch {
    // ignore
  }

  if (PLANS[raw]) return PLANS[raw];
  return null;
}

async function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export default function Checkout() {
  const [step, setStep] = useState(1); // 1=método, 2=dados(+login/cadastro), 3=confirmar/pagar, 4=aguardando
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const [user, setUser] = useState(null);
  const [forceAuth, setForceAuth] = useState(false);

  const [personalData, setPersonalData] = useState({
    nome: "",
    email: "",
    cpf: "",
  });

  const [waitingMsg, setWaitingMsg] = useState("");
  const [polling, setPolling] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;

      if (data?.user) {
        setUser(data.user);
        setPersonalData((p) => ({ ...p, email: data.user.email || p.email }));
      }
    }

    bootstrap();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user || null;
      setUser(u);
      if (u?.email) setPersonalData((p) => ({ ...p, email: u.email || p.email }));
    });

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, []);

  useEffect(() => {
    const plan = loadSelectedPlan();
    if (!plan) {
      window.location.href = createPageUrl("Vendas");
      return;
    }
    setSelectedPlan(plan);
  }, []);

  const stepTitle = useMemo(() => {
    if (step === 1) return "Forma de Pagamento";
    if (step === 2) return "Dados e Acesso";
    if (step === 3) return "Confirmar e Pagar";
    return "Confirmando Pagamento";
  }, [step]);

  // Se voltar do Mercado Pago com status (back_urls), tenta confirmar premium automaticamente
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const backStatus = params.get("status"); // approved | pending | failure (depende do back_urls)
    if (backStatus) {
      setStep(4);
      if (backStatus === "approved") {
        setWaitingMsg("Pagamento aprovado! Confirmando liberação do Premium…");
      } else if (backStatus === "pending") {
        setWaitingMsg("Pagamento pendente. Assim que confirmar, liberamos automaticamente.");
      } else {
        setWaitingMsg("Pagamento não aprovado. Você pode tentar novamente.");
      }
    }
  }, []);

  const handleContinueFromStep2 = () => {
    if (!paymentMethod) {
      alert("Selecione a forma de pagamento.");
      setStep(1);
      return;
    }

    const cpfDigits = normalizeCpf(personalData.cpf);

    if (!personalData.nome || !personalData.email || !cpfDigits) {
      alert("Preencha Nome, Email e CPF.");
      return;
    }

    if (!isValidCpfDigits(cpfDigits)) {
      alert("CPF inválido. Digite os 11 números do CPF.");
      return;
    }

    if (!user) {
      alert("Faça login ou crie sua conta para continuar o pagamento.");
      return;
    }

    setPersonalData((p) => ({ ...p, cpf: cpfDigits }));
    setStep(3);
  };

  const handlePay = async () => {
    if (!user || !paymentMethod || !selectedPlan) return;

    setIsProcessing(true);

    try {
      const resp = await fetch("/api/create-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: selectedPlan, // {id,name,price,durationDays}
          userEmail: personalData.email || user.email,
          userId: user.id,
          paymentMethod,
          customer: {
            nome: personalData.nome,
            email: personalData.email,
            cpf: normalizeCpf(personalData.cpf),
          },
        }),
      });

      const data = await resp.json().catch(() => ({}));

      if (!resp.ok || !data?.init_point) {
        alert(data?.message || "Erro ao iniciar pagamento (Mercado Pago).");
        setIsProcessing(false);
        return;
      }

      // redireciona para MP
      window.location.href = data.init_point;
    } catch (e) {
      alert("Erro inesperado ao processar pagamento.");
      setIsProcessing(false);
    }
  };

  // Polling: quando estamos no step 4, checa subscriptions para liberar
  useEffect(() => {
    if (step !== 4) return;
    if (!user?.id) return;
    if (polling) return;

    let stop = false;

    async function pollPremium() {
      setPolling(true);

      // tenta por ~2 minutos (24 tentativas * 5s)
      for (let i = 0; i < 24; i++) {
        if (stop) break;

        const { data, error } = await supabase
          .from("subscriptions")
          .select("is_premium,premium_until,plan_id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (!error && data?.is_premium) {
          // premium_until pode ser null em testes, mas ideal ter
          goToDashboard();
          return;
        }

        await wait(5000);
      }

      setWaitingMsg(
        "Ainda não recebemos a confirmação final do Mercado Pago. Pode levar alguns minutos. " +
          "Você pode fechar esta tela e entrar depois — seu acesso será liberado automaticamente."
      );
      setPolling(false);
    }

    pollPremium();

    return () => {
      stop = true;
    };
  }, [step, user?.id, polling]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setForceAuth(false);
      setUser(null);
      alert("Você saiu. Agora pode testar login/esqueci senha.");
    } catch (e) {
      alert("Não foi possível sair. Tente novamente.");
    }
  };

  if (!selectedPlan) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 to-white p-6">
      <div className="max-w-lg mx-auto bg-white p-6 rounded-3xl shadow-xl">
        <div className="flex items-center gap-3 mb-6">
          <ArrowLeft
            className="cursor-pointer"
            onClick={() => {
              if (step <= 1) window.location.href = createPageUrl("Vendas");
              else setStep(step - 1);
            }}
          />
          <div className="flex-1">
            <h2 className="text-xl font-bold">Finalizar Compra</h2>
            <p className="text-sm text-gray-500">
              {selectedPlan.name} • {stepTitle}
            </p>
          </div>

          {user && (
            <button
              onClick={handleLogout}
              className="text-xs font-bold text-slate-700 hover:underline flex items-center gap-1"
              type="button"
            >
              <LogOut className="w-4 h-4" />
              Sair
            </button>
          )}
        </div>

        <div className="flex mb-6 gap-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className={`h-2 flex-1 rounded-full ${s <= Math.min(step, 3) ? "bg-red-500" : "bg-gray-200"}`} />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
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

              <p className="text-xs text-gray-500 text-center mt-4">
                Você só fará login/cadastro no próximo passo, ao preencher os dados para pagamento.
              </p>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <div className="bg-gray-50 p-4 rounded-xl">
                <p className="text-sm text-gray-700">
                  <b>Plano:</b> {selectedPlan.name} • <b>Valor:</b> R$ {selectedPlan.price.toFixed(2)} •{" "}
                  <b>Método:</b> {paymentMethod === "pix" ? "PIX" : "Cartão"}
                </p>
              </div>

              <div className="space-y-3">
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
                  placeholder="CPF (somente números)"
                  value={personalData.cpf}
                  onChange={(e) => setPersonalData({ ...personalData, cpf: normalizeCpf(e.target.value) })}
                />
              </div>

              {user && !forceAuth ? (
                <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-sm text-green-800 space-y-2">
                  <div>
                    Logado como <b>{user.email}</b>. Você já pode continuar.
                  </div>
                  <button
                    type="button"
                    onClick={() => setForceAuth(true)}
                    className="text-xs font-bold text-slate-700 hover:underline"
                  >
                    Trocar conta / Esqueci minha senha
                  </button>
                </div>
              ) : (
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <ShieldCheck className="w-5 h-5 text-green-600" />
                    <p className="font-semibold text-gray-900">Crie sua conta ou faça login</p>
                  </div>

                  <p className="text-xs text-gray-500 mb-4">
                    Precisamos do seu acesso para liberar o conteúdo Premium após a confirmação do pagamento.
                  </p>

                  <AuthGate
                    onSuccess={(u) => {
                      setUser(u);
                      setForceAuth(false);
                      if (u?.email) setPersonalData((p) => ({ ...p, email: u.email || p.email }));
                    }}
                  />
                </div>
              )}

              <Button className="w-full" onClick={handleContinueFromStep2}>
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
              <div className="bg-gray-50 p-4 rounded-xl space-y-1">
                <p><b>Plano:</b> {selectedPlan.name}</p>
                <p><b>Valor:</b> R$ {selectedPlan.price.toFixed(2)}</p>
                <p><b>Método:</b> {paymentMethod === "pix" ? "PIX" : "Cartão"}</p>
                <p><b>Email:</b> {personalData.email}</p>
              </div>

              <Button className="w-full" onClick={handlePay} disabled={isProcessing}>
                {isProcessing ? "Processando..." : "Pagar Agora"}
              </Button>

              <p className="text-xs text-gray-500 text-center">
                Ao confirmar o pagamento, o acesso Premium é liberado automaticamente.
              </p>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <div className="bg-gray-50 p-4 rounded-xl">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <p className="text-sm text-gray-700">
                    {waitingMsg || "Aguardando confirmação do pagamento…"}
                  </p>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Se você pagou via PIX, pode levar alguns instantes para confirmar.
                </p>
              </div>

              <Button className="w-full" onClick={() => (window.location.href = createPageUrl("Dashboard"))}>
                Ir para o Dashboard
              </Button>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => (window.location.href = createPageUrl("Vendas"))}
              >
                Voltar
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
