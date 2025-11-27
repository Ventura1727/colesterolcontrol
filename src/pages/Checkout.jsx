import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Heart, ArrowLeft, CreditCard, Lock, Check, Shield, Zap, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';

export default function Checkout() {
  const [selectedPlan, setSelectedPlan] = useState('anual');
  const [step, setStep] = useState(1); // 1 = dados pessoais, 2 = pagamento
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState({
    nome: '',
    email: '',
    senha: '',
    confirmarSenha: '',
    cartao: '',
    validade: '',
    cvv: '',
    nomeTitular: ''
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const plano = urlParams.get('plano');
    if (plano) setSelectedPlan(plano);
  }, []);

  const planos = {
    mensal: { nome: 'Mensal', preco: 'R$ 29,90', periodo: '/mês' },
    anual: { nome: 'Anual', preco: 'R$ 179,00', periodo: '/ano', economia: 'Economia de R$ 179,80' }
  };

  const validateStep1 = () => {
    const newErrors = {};
    if (!form.nome.trim()) newErrors.nome = 'Nome é obrigatório';
    if (!form.email.trim()) newErrors.email = 'Email é obrigatório';
    else if (!/\S+@\S+\.\S+/.test(form.email)) newErrors.email = 'Email inválido';
    if (!form.senha) newErrors.senha = 'Senha é obrigatória';
    else if (form.senha.length < 6) newErrors.senha = 'Mínimo 6 caracteres';
    if (form.senha !== form.confirmarSenha) newErrors.confirmarSenha = 'Senhas não conferem';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors = {};
    if (!form.cartao.trim()) newErrors.cartao = 'Número do cartão é obrigatório';
    if (!form.validade.trim()) newErrors.validade = 'Validade é obrigatória';
    if (!form.cvv.trim()) newErrors.cvv = 'CVV é obrigatório';
    if (!form.nomeTitular.trim()) newErrors.nomeTitular = 'Nome do titular é obrigatório';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleStep1 = () => {
    if (validateStep1()) {
      setStep(2);
    }
  };

  const handleFinalizarCompra = async () => {
    if (!validateStep2()) return;
    
    setIsLoading(true);
    
    try {
      // Verificar se usuário está logado, senão redirecionar para login
      const isAuth = await base44.auth.isAuthenticated();
      
      if (!isAuth) {
        // Salvar dados do quiz + info de compra para depois do login
        const quizData = localStorage.getItem('heartbalance_quiz');
        localStorage.setItem('heartbalance_pending_purchase', JSON.stringify({
          plano: selectedPlan,
          quiz: quizData ? JSON.parse(quizData) : null
        }));
        
        // Redirecionar para login
        base44.auth.redirectToLogin(createPageUrl('FinalizarCompra'));
        return;
      }

      // Usuário já está logado, finalizar compra
      await finalizarCompra();
      
    } catch (error) {
      console.error(error);
      setIsLoading(false);
    }
  };

  const finalizarCompra = async () => {
    try {
      const user = await base44.auth.me();
      const quizData = JSON.parse(localStorage.getItem('heartbalance_quiz') || '{}');
      
      // Verificar se já tem perfil
      const profiles = await base44.entities.UserProfile.filter({ created_by: user.email });
      
      if (profiles.length > 0) {
        await base44.entities.UserProfile.update(profiles[0].id, {
          ...quizData,
          plano_ativo: true,
          data_inicio_plano: new Date().toISOString().split('T')[0],
          rank: 'Iniciante',
          xp_total: 0,
          metas_concluidas: 0,
          dias_consecutivos: 0
        });
      } else {
        await base44.entities.UserProfile.create({
          ...quizData,
          plano_ativo: true,
          data_inicio_plano: new Date().toISOString().split('T')[0],
          rank: 'Iniciante',
          xp_total: 0,
          metas_concluidas: 0,
          dias_consecutivos: 0
        });
      }

      // Limpar dados locais
      localStorage.removeItem('heartbalance_quiz');
      localStorage.removeItem('heartbalance_pending_purchase');

      // Redirecionar para dashboard
      window.location.href = createPageUrl('Dashboard');
      
    } catch (error) {
      console.error(error);
      setIsLoading(false);
    }
  };

  const formatCartao = (value) => {
    const nums = value.replace(/\D/g, '');
    return nums.replace(/(\d{4})(?=\d)/g, '$1 ').slice(0, 19);
  };

  const formatValidade = (value) => {
    const nums = value.replace(/\D/g, '');
    if (nums.length >= 2) {
      return nums.slice(0, 2) + '/' + nums.slice(2, 4);
    }
    return nums;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => window.history.back()} className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Finalizar Compra</h1>
            <p className="text-sm text-gray-500">Passo {step} de 2</p>
          </div>
        </div>

        {/* Progress */}
        <div className="flex gap-2 mb-8">
          <div className={`h-1.5 flex-1 rounded-full ${step >= 1 ? 'bg-emerald-500' : 'bg-gray-200'}`} />
          <div className={`h-1.5 flex-1 rounded-full ${step >= 2 ? 'bg-emerald-500' : 'bg-gray-200'}`} />
        </div>

        {/* Resumo do Plano */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-5 mb-6 text-white"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-xl flex items-center justify-center">
              <Crown className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="text-sm text-gray-400">HeartBalance Premium</div>
              <div className="font-bold text-lg">Plano {planos[selectedPlan].nome}</div>
            </div>
          </div>
          <div className="flex items-end justify-between pt-3 border-t border-gray-700">
            <div>
              <span className="text-3xl font-bold">{planos[selectedPlan].preco}</span>
              <span className="text-gray-400">{planos[selectedPlan].periodo}</span>
            </div>
            {planos[selectedPlan].economia && (
              <span className="text-xs text-emerald-400 bg-emerald-400/20 px-2 py-1 rounded-full">
                {planos[selectedPlan].economia}
              </span>
            )}
          </div>
        </motion.div>

        {/* Step 1: Dados Pessoais */}
        {step === 1 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm"
          >
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Lock className="w-5 h-5 text-emerald-600" />
              Crie sua conta
            </h2>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Nome completo</label>
                <Input
                  placeholder="Seu nome"
                  value={form.nome}
                  onChange={(e) => setForm({...form, nome: e.target.value})}
                  className={errors.nome ? 'border-red-500' : ''}
                />
                {errors.nome && <span className="text-xs text-red-500">{errors.nome}</span>}
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">E-mail</label>
                <Input
                  type="email"
                  placeholder="seu@email.com"
                  value={form.email}
                  onChange={(e) => setForm({...form, email: e.target.value})}
                  className={errors.email ? 'border-red-500' : ''}
                />
                {errors.email && <span className="text-xs text-red-500">{errors.email}</span>}
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Senha</label>
                <Input
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={form.senha}
                  onChange={(e) => setForm({...form, senha: e.target.value})}
                  className={errors.senha ? 'border-red-500' : ''}
                />
                {errors.senha && <span className="text-xs text-red-500">{errors.senha}</span>}
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Confirmar senha</label>
                <Input
                  type="password"
                  placeholder="Digite novamente"
                  value={form.confirmarSenha}
                  onChange={(e) => setForm({...form, confirmarSenha: e.target.value})}
                  className={errors.confirmarSenha ? 'border-red-500' : ''}
                />
                {errors.confirmarSenha && <span className="text-xs text-red-500">{errors.confirmarSenha}</span>}
              </div>

              <Button
                onClick={handleStep1}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white py-6 rounded-xl mt-4"
              >
                Continuar para Pagamento
              </Button>
            </div>
          </motion.div>
        )}

        {/* Step 2: Pagamento */}
        {step === 2 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm"
          >
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-emerald-600" />
              Dados do Cartão
            </h2>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Número do cartão</label>
                <Input
                  placeholder="0000 0000 0000 0000"
                  value={form.cartao}
                  onChange={(e) => setForm({...form, cartao: formatCartao(e.target.value)})}
                  className={errors.cartao ? 'border-red-500' : ''}
                />
                {errors.cartao && <span className="text-xs text-red-500">{errors.cartao}</span>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Validade</label>
                  <Input
                    placeholder="MM/AA"
                    value={form.validade}
                    onChange={(e) => setForm({...form, validade: formatValidade(e.target.value)})}
                    className={errors.validade ? 'border-red-500' : ''}
                    maxLength={5}
                  />
                  {errors.validade && <span className="text-xs text-red-500">{errors.validade}</span>}
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">CVV</label>
                  <Input
                    placeholder="123"
                    value={form.cvv}
                    onChange={(e) => setForm({...form, cvv: e.target.value.replace(/\D/g, '').slice(0, 4)})}
                    className={errors.cvv ? 'border-red-500' : ''}
                    maxLength={4}
                  />
                  {errors.cvv && <span className="text-xs text-red-500">{errors.cvv}</span>}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Nome no cartão</label>
                <Input
                  placeholder="Como está no cartão"
                  value={form.nomeTitular}
                  onChange={(e) => setForm({...form, nomeTitular: e.target.value.toUpperCase()})}
                  className={errors.nomeTitular ? 'border-red-500' : ''}
                />
                {errors.nomeTitular && <span className="text-xs text-red-500">{errors.nomeTitular}</span>}
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 p-3 rounded-xl">
                <Shield className="w-5 h-5 text-emerald-600" />
                <span>Pagamento 100% seguro e criptografado</span>
              </div>

              <div className="flex gap-3 mt-4">
                <Button
                  onClick={() => setStep(1)}
                  variant="outline"
                  className="flex-1 py-6"
                >
                  Voltar
                </Button>
                <Button
                  onClick={handleFinalizarCompra}
                  disabled={isLoading}
                  className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white py-6 rounded-xl"
                >
                  {isLoading ? (
                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} className="w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                  ) : (
                    <>
                      Pagar {planos[selectedPlan].preco}
                      <Check className="w-5 h-5 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Garantias */}
        <div className="mt-6 flex items-center justify-center gap-4 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <Lock className="w-4 h-4" />
            <span>SSL Seguro</span>
          </div>
          <div className="flex items-center gap-1">
            <Shield className="w-4 h-4" />
            <span>Garantia 7 dias</span>
          </div>
        </div>
      </div>
    </div>
  );
}