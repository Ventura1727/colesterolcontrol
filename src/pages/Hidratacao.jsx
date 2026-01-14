import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Droplets, Calculator, Info, Heart, Zap, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createPageUrl } from '@/utils';
import HydrationDashboard from '@/components/hydration/HydrationDashboard';
import { supabase } from '@/lib/supabaseClient';

export default function Hidratacao() {
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [form, setForm] = useState({ peso: '', altura: '', basal: '' });
  const [waterNeeded, setWaterNeeded] = useState(null);
  const [waterLogs, setWaterLogs] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Usuário logado via Supabase
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        // Perfil do usuário
        const { data: profiles, error: profileError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('created_by', user.email);

        if (profileError) {
          console.error('Erro ao carregar perfil:', profileError);
        }

        if (profiles && profiles.length > 0) {
          setProfile(profiles[0]);
          if (profiles[0].peso_hidratacao) {
            setForm({
              peso: profiles[0].peso_hidratacao,
              altura: profiles[0].altura_hidratacao || '',
              basal: profiles[0].basal_hidratacao || ''
            });
            calculateWater(profiles[0].peso_hidratacao, profiles[0].basal_hidratacao);
          }
        }
      }

      // Logs de água via API
      const session = await supabase.auth.getSession();
      const token = session?.data?.session?.access_token;
      const res = await fetch('/api/water-log', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const logs = await res.json();
      setWaterLogs(logs);
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateWater = (peso, basal) => {
    if (!peso) return;
    let waterInMl = peso * 35;
    if (basal) {
      const basalNum = parseFloat(basal);
      if (basalNum > 2000) {
        waterInMl += 500;
      } else if (basalNum > 1500) {
        waterInMl += 300;
      }
    }
    const waterInLiters = (waterInMl / 1000).toFixed(1);
    setWaterNeeded(waterInLiters);
  };

  const handleCalculate = async () => {
    const peso = parseFloat(form.peso);
    const basal = form.basal ? parseFloat(form.basal) : null;
    if (!peso || peso <= 0) {
      alert('Por favor, insira um peso válido');
      return;
    }
    calculateWater(peso, basal);

    if (profile) {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          peso_hidratacao: peso,
          altura_hidratacao: form.altura ? parseFloat(form.altura) : null,
          basal_hidratacao: basal
        })
        .eq('id', profile.id);

      if (error) {
        console.error('Erro ao atualizar perfil:', error);
      }
    }
  };

  const registrarAgua = async (quantidade_ml) => {
    try {
      const session = await supabase.auth.getSession();
      const token = session?.data?.session?.access_token;
      const agora = new Date();
      const data = agora.toISOString().split('T')[0];
      const hora = agora.toTimeString().split(' ')[0];

      await fetch('/api/water-log-post', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ quantidade_ml, data, hora }),
      });

      await loadData();
    } catch (err) {
      console.error('Erro ao registrar água:', err);
      alert('Não foi possível registrar a água. Tente novamente.');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-rose-50 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
          className="w-8 h-8 border-3 border-red-600 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-rose-50">
      <div className="max-w-lg mx-auto px-4 pt-6 pb-24">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => window.location.href = createPageUrl('Dashboard')}
            className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Hidratação</h1>
            <p className="text-sm text-gray-500">Mantenha-se hidratado</p>
          </div>
        </div>

        {/* Calculadora */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-6 mb-6 border border-gray-100 shadow-sm"
        >
          <div className="flex items-center gap-2 mb-4">
            <Calculator className="w-5 h-5 text-blue-600" />
            <h2 className="font-semibold text-gray-900">Calcule Sua Meta de Água</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Peso (kg) *</label>
              <Input
                type="number"
                placeholder="Ex: 70"
                value={form.peso}
                onChange={(e) => setForm({ ...form, peso: e.target.value })}
                className="w-full"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Altura (cm)</label>
              <Input
                type="number"
                placeholder="Ex: 170"
                value={form.altura}
                onChange={(e) => setForm({ ...form, altura: e.target.value })}
                className="w-full"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Taxa Metabólica Basal (kcal/dia)</label>
              <Input
                type="number"
                placeholder="Ex: 1800"
                value={form.basal}
                onChange={(e) => setForm({ ...form, basal: e.target.value })}
                className="w-full"
              />
              <p className="text-xs text-gray-500 mt-1">Opcional: ajuda a personalizar sua meta</p>
            </div>

            <Button
              onClick={handleCalculate}
              className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white py-5 rounded-xl"
            >
              <Calculator className="w-5 h-5 mr-2" />
              Calcular Meta Diária
            </Button>
          </div>
        </motion.div>

        {/* Resultado */}
        {waterNeeded && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-6 mb-6 text-white text-center"
          >
            <Droplets className="w-12 h-12 mx-auto mb-3 opacity-90" />
            <div className="text-5xl font-bold mb-2">{waterNeeded}L</div>
            <p className="text-blue-100">Meta diária de água recomendada</p>
            <p className="text-sm text-blue-100 mt-2">
              Aproximadamente {Math.ceil(waterNeeded / 0.25)} copos de 250ml
            </p>
          </motion.div>
        )}

        {/* Dashboard de Hidratação */}
        {waterNeeded && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl p-6 mb-6 border border-gray-100 shadow-sm"
          >
            <HydrationDashboard
              waterLogs={waterLogs}
              metaDiaria={waterNeeded}
              onLogAdded={registrarAgua}
            />
          </motion.div>
        )}

        {/* Por que Hidratação é Importante */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl p-6 mb-6 border border-gray-100 shadow-sm"
        >
          <div className="flex items-center gap-2 mb-4">
            <Info className="w-5 h-5 text-red-600" />
            <h2 className="font-semibold text-gray-900">Por Que Hidratação é Crucial?</h2>
          </div>

          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                <Heart className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900 mb-1">Saúde Cardiovascular</h3>
                <p className="text-sm text-gray-600">
                  A água ajuda o sangue a circular melhor, reduzindo a carga no coração e mantendo a pressão arterial equilibrada.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                <Zap className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900 mb-1">Controle do Apetite</h3>
                <p className="text-sm text-gray-600">
                  Beber água regularmente ajuda a saciar e reduz a sensação de fome, evitando excessos alimentares.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                <Droplets className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900 mb-1">Metabolismo Ativo</h3>
                <p className="text-sm text-gray-600">
                  Estar bem hidratado melhora o metabolismo e facilita a eliminação de toxinas do organismo.
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Sinais de Desidratação */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-amber-50 rounded-2xl p-6 mb-6 border border-amber-200"
        >
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="w-5 h-5 text-amber-600" />
            <h2 className="font-semibold text-amber-900">Sinais de Desidratação</h2>
          </div>

          <ul className="space-y-2 text-sm text-amber-800">
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
              Sede excessiva e boca seca
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
              Urina escura e com odor forte
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
              Cansaço e dores de cabeça
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
              Pele seca e tontura
            </li>
          </ul>
        </motion.div>

        {/* Dicas Práticas */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm"
        >
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <h2 className="font-semibold text-gray-900">Dicas para Manter-se Hidratado</h2>
          </div>

          <div className="space-y-3 text-sm text-gray-700">
            <div className="flex gap-2">
              <span className="text-green-600 font-bold">1.</span>
              <p>Comece o dia com um copo de água em jejum</p>
            </div>
            <div className="flex gap-2">
              <span className="text-green-600 font-bold">2.</span>
              <p>Tenha sempre uma garrafa de água por perto</p>
            </div>
            <div className="flex gap-2">
              <span className="text-green-600 font-bold">3.</span>
              <p>Beba água antes, durante e depois das refeições</p>
            </div>
            <div className="flex gap-2">
              <span className="text-green-600 font-bold">4.</span>
              <p>Configure lembretes no celular a cada 2 horas</p>
            </div>
            <div className="flex gap-2">
              <span className="text-green-600 font-bold">5.</span>
              <p>Chás e água de coco também contam para hidratação</p>
            </div>
            <div className="flex gap-2">
              <span className="text-green-600 font-bold">6.</span>
              <p>Aumente a ingestão em dias quentes ou ao praticar exercícios</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
