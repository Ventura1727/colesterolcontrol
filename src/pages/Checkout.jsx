import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, CreditCard, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createPageUrl } from "@/utils";
import { supabase } from "@/lib/supabaseClient";
import AuthGate from "@/components/AuthGate";
import { useNavigate } from "react-router-dom";

const plans = {
  mensal: { id: "mensal", name: "Mensal", price: 24.9, duration: 30 },
  trimestral: { id: "trimestral", name: "Trimestral", price: 59.9, duration: 90 },
  anual: { id: "anual", name: "Anual", price: 199.9, duration: 365 },
};

export default function Checkout() {
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAuth, setShowAuth] = useState(false);

  const [personalData, setPersonalData] = useState({
    nome: "",
    email: "",
    cpf: "",
  });

  const isPersonalDataValid = useMemo(() => {
    return Boolean(personalData.nome?.trim() && personalData.email?.trim() && personalData.cpf?.trim());
  }, [personalData]);

  // 1) Carrega plano do localStorage (vem da página /Vendas)
  useEffect(() => {
    const planId = localStorage.getItem("heartbalance_selected_plan");
    if (!planId || !plans[planId]) {
      // Se não tem plano, volta para Vendas (sem reload)
      navigate(createPageUrl("Vendas"), { replace: true });
      return;
    }
    setSelectedPlan(plans[planId]);
  }, [navigate]);

  // 2) Pega usuário atual (se já estiver logado) e preenche e-mail
  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      if (data?.user) {
        setUser(data.user);
        setPersonalData((p) => ({ ...p, email: data.user.email || p.email }));
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  // 3) Detecta se é admin via profiles.role
  useEffect(() => {
    let mounted = true;

    async function loadRole() {
      try {
        const { data } = await supabase.auth.getUser();
        const u = data?.user;
        if (!u) {
          if (mounted) setIsAdmin(false);
          return;
        }

        const { data: prof, error } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", u.id)
          .single();

        if (!mounted) return;

        setIsAdmin(!error && prof?.role === "admin");
      } catch (e) {
        if (mounted) setIsAdmin(false);
      }
    }

    loadRole();
    return () => {
      mounted = false;
    };
  }, [user?.id]);

  // 4) Quando o AuthGate fizer login com sucesso, fecha e segue fluxo
  const handleAuthSuccess = async () => {
    const { data } = await supabase.auth.getUser();
    if (data?.user) {
      setUser(data.user);
      setPersonalData((p) => ({ ...p, email: data.user.email || p.email }));
    }
    setShowAuth(false);
    // continua no fluxo
    setStep(3);
  };

  const handleBack = () => {
    if (showAuth) {
      setShowAuth(false);
      return;
    }
    setStep((s) => Math.max(1, s - 1));
  };

  const handleContinue = async () => {
    if (!isPersonalDataValid) {
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

  // ✅ Admin: libera premium direto
  const grantPremiumForAdmin = () => {
    // opcional: guarda um “flag” só pra debug/demonstração
    localStorage.setItem("heartbalance_demo_premium", "1");

    // limpa dados do checkout, se quiser evitar comportamento estranho no retorno
    // (não é obrigatório)
    // localStorage.removeItem("heartbalance_purchase_data");

    navigate(createPageUrl("Premium"), { replace: true });
  };

  const handlePay = async () => {
    if (!user || !paymentMethod || !selectedPlan) return;

    // ✅ bypass admin: NÃO chama Mercado Pago
    if (isAdmin) {
      grantPremiumForAdmin();
      return;
    }

    setIsProcessing(true);

    try {
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
      alert("Erro ao iniciar pagamento");
      setIsProcessing(false);
    }
  };

  if (!selectedPlan) return null;

  // AuthGate é full-screen. Não envolver em “caixa” para não quebrar layout.
  if (showAuth) {
    return <AuthGate onSuccess={handleAuthSuccess} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 to-white p-6">
      <div className="max-w-lg mx-auto bg-white p-6 rounded-3xl shadow-xl">
        <div className="flex items-center gap-3 mb-6">
          <ArrowLeft className="cursor-pointer" onClick={handleBack} />
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

              {isAdmin && (
                <p className="text-xs text-gray-500">
                  Modo Admin: ao final, o acesso Premium será liberado sem redirecionar para pagamento.
                </p>
              )}
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
                {isAdmin
                  ? "Ativar Premium Agora"
                  : isProcessing
                  ? "Redirecionando..."
                  : "Pagar Agora"}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
