import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, CreditCard, Smartphone, Lock, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createPageUrl } from '@/utils';

const plans = {
  mensal: { name: 'Mensal', price: 24.90, duration: 30 },
  trimestral: { name: 'Trimestral', price: 59.90, duration: 90 },
  anual: { name: 'Anual', price: 199.90, duration: 365 }
};

export default function Checkout() {
  const [step, setStep] = useState(1); // 1 = método, 2 = dados pessoais, 3 = pagamento
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState(null); // 'pix' ou 'card'
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [personalData, setPersonalData] = useState({
    nome: '',
    email: '',
    cpf: '',
    telefone: ''
  });

  const [cardData, setCardData] = useState({
    numero: '',
    nome: '',
    validade: '',
    cvv: ''
  });

  useEffect(() => {
    const planId = localStorage.getItem('heartbalance_selected_plan');
    if (!planId || !plans[planId]) {
      window.location.href = createPageUrl('Vendas');
      return;
    }
    setSelectedPlan(plans[planId]);
  }, []);

  const handlePersonalDataSubmit = () => {
    if (!personalData.nome || !personalData.email || !personalData.cpf) {
      alert('Por favor, preencha todos os campos obrigatórios');
      return;
    }
    setStep(3);
  };

  const handleFinalizePurchase = async () => {
    setIsProcessing(true);
    
    try {
  // Verificar se usuário está autenticado
  let user;
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    user = data.user;
    if (!user) throw new Error("Usuário não autenticado");
  } catch (e) {
    // Redirecionar para login e voltar após autenticação
    const returnUrl = createPageUrl('FinalizarCompra');
    window.location.href = `/login?returnUrl=${encodeURIComponent(returnUrl)}`;
    return;
  }

  // Se chegou aqui, temos um usuário válido
  console.log("Usuário autenticado:", user);
} catch (err) {
  console.error("Erro inesperado:", err);
}

      // Salvar dados da compra no localStorage para processar após login
      localStorage.setItem('heartbalance_purchase_data', JSON.stringify({
        plan: selectedPlan,
        paymentMethod,
        personalData,
        timestamp: Date.now()
      }));

      // Redirecionar para finalização
      window.location.href = createPageUrl('FinalizarCompra');
    } catch (error) {
      console.error('Erro ao processar pagamento:', error);
      alert('Erro ao processar pagamento. Tente novamente.');
      setIsProcessing(false);
    }
  };

  const formatCardNumber = (value) => {
    return value.replace(/\s/g, '').match(/.{1,4}/g)?.join(' ') || value;
  };

  const formatExpiry = (value) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length >= 2) {
      return cleaned.slice(0, 2) + '/' + cleaned.slice(2, 4);
    }
    return cleaned;
  };

  if (!selectedPlan) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-rose-50 flex items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} className="w-8 h-8 border-3 border-red-600 border-t-transparent rounded-full" />
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
                window.location.href = createPageUrl('Vendas');
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
                s <= step ? 'bg-red-500' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>

        {/* Step 1: Escolher Método */}
        {step === 1 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4"
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Escolha a Forma de Pagamento</h2>

            {/* PIX */}
            <button
              onClick={() => {
                setPaymentMethod('pix');
                setStep(2);
              }}
              className="w-full bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-6 text-white text-left relative overflow-hidden group hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center gap-4 mb-3">
                <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                  <Smartphone className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Pagar com PIX</h3>
                  <p className="text-sm text-green-100">Aprovação instantânea</p>
                </div>
              </div>
              <div className="text-3xl font-bold mb-2">R$ {selectedPlan.price.toFixed(2)}</div>
              <p className="text-sm text-green-100">
                ✓ Acesso imediato após pagamento
              </p>
            </button>

            {/* Cartão */}
            <button
              onClick={() => {
                setPaymentMethod('card');
                setStep(2);
              }}
              className="w-full bg-white rounded-2xl p-6 border-2 border-gray-200 text-left hover:border-red-300 transition-all"
            >
              <div className="flex items-center gap-4 mb-3">
                <div className="w-14 h-14 bg-gray-100 rounded-xl flex items-center justify-center">
                  <CreditCard className="w-7 h-7 text-gray-600" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-gray-900">Cartão de Crédito</h3>
                  <p className="text-sm text-gray-500">Todas as bandeiras</p>
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-2">
                R$ {selectedPlan.price.toFixed(2)}
              </div>
              <p className="text-sm text-gray-500">
                ✓ Parcelamento disponível • Aprovação em minutos
              </p>
            </button>
          </motion.div>
        )}

        {/* Step 2: Dados Pessoais */}
        {step === 2 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4"
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Seus Dados</h2>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Nome Completo *</label>
              <Input
                type="text"
                placeholder="João Silva"
                value={personalData.nome}
                onChange={(e) => setPersonalData({...personalData, nome: e.target.value})}
                className="w-full"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">E-mail *</label>
              <Input
                type="email"
                placeholder="seu@email.com"
                value={personalData.email}
                onChange={(e) => setPersonalData({...personalData, email: e.target.value})}
                className="w-full"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">CPF *</label>
              <Input
                type="text"
                placeholder="000.000.000-00"
                value={personalData.cpf}
                onChange={(e) => setPersonalData({...personalData, cpf: e.target.value})}
                className="w-full"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Telefone</label>
              <Input
                type="tel"
                placeholder="(11) 99999-9999"
                value={personalData.telefone}
                onChange={(e) => setPersonalData({...personalData, telefone: e.target.value})}
                className="w-full"
              />
            </div>

            <Button
              onClick={handlePersonalDataSubmit}
              className="w-full bg-red-500 hover:bg-red-600 text-white py-6 rounded-xl text-lg font-semibold"
            >
              Continuar
            </Button>
          </motion.div>
        )}

        {/* Step 3: Finalizar */}
        {step === 3 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            {paymentMethod === 'pix' ? (
              <>
                <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-6 text-white text-center">
                  <Smartphone className="w-16 h-16 mx-auto mb-3" />
                  <h2 className="text-2xl font-bold mb-2">Pagamento via PIX</h2>
                  <div className="text-4xl font-bold mb-2">R$ {selectedPlan.price.toFixed(2)}</div>
                  <p className="text-green-100 text-sm">Após clicar em "Gerar QR Code", você terá 15 minutos para pagar</p>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-3">Como funciona:</h3>
                  <div className="space-y-3 text-sm text-gray-700">
                    <div className="flex gap-3">
                      <div className="w-6 h-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-bold text-xs flex-shrink-0">1</div>
                      <p>Clique em "Gerar QR Code PIX"</p>
                    </div>
                    <div className="flex gap-3">
                      <div className="w-6 h-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-bold text-xs flex-shrink-0">2</div>
                      <p>Abra o app do seu banco e escolha "Pagar com PIX"</p>
                    </div>
                    <div className="flex gap-3">
                      <div className="w-6 h-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-bold text-xs flex-shrink-0">3</div>
                      <p>Escaneie o QR Code ou copie o código</p>
                    </div>
                    <div className="flex gap-3">
                      <div className="w-6 h-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-bold text-xs flex-shrink-0">4</div>
                      <p>Confirme o pagamento e pronto! Acesso liberado instantaneamente</p>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-lg font-semibold text-gray-900">Dados do Cartão</h2>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Número do Cartão</label>
                  <Input
                    type="text"
                    placeholder="0000 0000 0000 0000"
                    value={cardData.numero}
                    onChange={(e) => setCardData({...cardData, numero: formatCardNumber(e.target.value)})}
                    maxLength={19}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Nome no Cartão</label>
                  <Input
                    type="text"
                    placeholder="NOME COMO NO CARTÃO"
                    value={cardData.nome}
                    onChange={(e) => setCardData({...cardData, nome: e.target.value.toUpperCase()})}
                    className="w-full"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Validade</label>
                    <Input
                      type="text"
                      placeholder="MM/AA"
                      value={cardData.validade}
                      onChange={(e) => setCardData({...cardData, validade: formatExpiry(e.target.value)})}
                      maxLength={5}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">CVV</label>
                    <Input
                      type="text"
                      placeholder="123"
                      value={cardData.cvv}
                      onChange={(e) => setCardData({...cardData, cvv: e.target.value.replace(/\D/g, '')})}
                      maxLength={4}
                      className="w-full"
                    />
                  </div>
                </div>

                <div className="bg-blue-50 rounded-xl p-4 border border-blue-200 flex gap-3">
                  <Lock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-900">
                    <p className="font-medium mb-1">Seus dados estão seguros</p>
                    <p className="text-xs text-blue-700">Utilizamos criptografia de nível bancário para proteger suas informações</p>
                  </div>
                </div>
              </>
            )}

            {/* Resumo */}
            <div className="bg-gray-50 rounded-2xl p-5 border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-3">Resumo da Compra</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="text-red-600">R$ {currentPrice.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <Button
              onClick={handleFinalizePurchase}
              disabled={isProcessing}
              className="w-full bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white py-7 rounded-xl text-lg font-semibold shadow-lg"
            >
              {isProcessing ? (
                <>Processando...</>
              ) : paymentMethod === 'pix' ? (
                <>Gerar QR Code PIX</>
              ) : (
                <>Finalizar Compra - R$ {currentPrice.toFixed(2)}</>
              )}
            </Button>

            <p className="text-xs text-center text-gray-500">
              <Lock className="w-3 h-3 inline mr-1" />
              Pagamento 100% seguro e criptografado
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
