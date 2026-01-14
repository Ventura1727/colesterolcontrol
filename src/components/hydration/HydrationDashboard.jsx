import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Droplets, Target, Plus, TrendingUp, Calendar, Check } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function HydrationDashboard({ waterLogs, metaDiaria, onLogAdded }) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [quantidade, setQuantidade] = useState('');
  const [data, setData] = useState(new Date().toISOString().split('T')[0]);
  const [isLogging, setIsLogging] = useState(false);

  // Meta diária em ml
  const metaDiariaML = metaDiaria ? parseFloat(metaDiaria) * 1000 : 2500;

  // Consumo de hoje
  const hoje = new Date().toISOString().split('T')[0];
  const consumoHoje =
    waterLogs?.filter(log => log.data === hoje).reduce((sum, log) => sum + log.quantidade_ml, 0) || 0;

  const percentualMeta = Math.min((consumoHoje / metaDiariaML) * 100, 100);
  const mlRestantes = Math.max(metaDiariaML - consumoHoje, 0);

  // Histórico de 7 dias
  const hoje7dias = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const dayLogs = waterLogs?.filter(log => log.data === dateStr) || [];
    const totalML = dayLogs.reduce((sum, log) => sum + log.quantidade_ml, 0);

    hoje7dias.push({
      date: dateStr,
      ml: totalML,
      litros: (totalML / 1000).toFixed(1),
      registros: dayLogs.length,
      label: format(date, 'EEE', { locale: ptBR })
    });
  }

  const maxML = Math.max(...hoje7dias.map(d => d.ml), metaDiariaML);
  const infoHoje = hoje7dias.find(d => d.date === hoje);

  const handleAddWater = async () => {
    if (!quantidade || !data) return;
    setIsLogging(true);
    try {
      // Centraliza a lógica no pai (Hidratacao.jsx)
      await onLogAdded(parseInt(quantidade, 10));
      setShowAddModal(false);
      setQuantidade('');
      setData(new Date().toISOString().split('T')[0]);
    } catch (error) {
      console.error('Erro ao registrar água:', error);
      alert('Erro ao registrar. Tente novamente.');
    }
    setIsLogging(false);
  };

  const quickAdd = async (ml) => {
    try {
      await onLogAdded(ml);
    } catch (error) {
      console.error('Erro ao registrar:', error);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Droplets className="w-5 h-5 text-blue-500" />
          <h3 className="font-semibold text-gray-900">Acompanhamento Diário</h3>
        </div>
        <div className="text-xs text-gray-500">
          <Calendar className="w-4 h-4 inline mr-1" />
          Hoje
        </div>
      </div>

      {/* Progresso Principal */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 mb-5"
      >
        <div className="flex items-end justify-between mb-3">
          <div>
            <div className="text-4xl font-bold text-gray-900">{(consumoHoje / 1000).toFixed(1)}L</div>
            <div className="text-sm text-gray-600">de {(metaDiariaML / 1000).toFixed(1)}L hoje</div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-600">{(mlRestantes / 1000).toFixed(1)}L</div>
            <div className="text-xs text-gray-600">faltam</div>
          </div>
        </div>

        {/* Barra de Progresso */}
        <div className="w-full bg-white rounded-full h-3 mb-2">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percentualMeta}%` }}
            transition={{ duration: 0.5 }}
            className="bg-gradient-to-r from-blue-500 to-indigo-600 h-3 rounded-full"
          />
        </div>

        <div className="flex items-center justify-center gap-1 mt-3 text-xs text-gray-500">
          <Target className="w-3 h-3" />
          {Math.round(percentualMeta)}% da meta diária
        </div>
      </motion.div>

      {/* Botões Rápidos */}
      <div className="grid grid-cols-3 gap-2 mb-5">
        <button
          onClick={() => quickAdd(250)}
          className="bg-white border border-blue-200 rounded-xl p-3 hover:bg-blue-50 transition-colors"
        >
          <Droplets className="w-5 h-5 text-blue-500 mx-auto mb-1" />
          <div className="text-xs font-medium text-gray-900">250ml</div>
          <div className="text-[10px] text-gray-500">Copo</div>
        </button>
        <button
          onClick={() => quickAdd(500)}
          className="bg-white border border-blue-200 rounded-xl p-3 hover:bg-blue-50 transition-colors"
        >
          <Droplets className="w-6 h-6 text-blue-500 mx-auto mb-1" />
          <div className="text-xs font-medium text-gray-900">500ml</div>
          <div className="text-[10px] text-gray-500">Garrafa</div>
        </button>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-xl p-3 hover:from-blue-600 hover:to-indigo-700 transition-colors"
        >
          <Plus className="w-6 h-6 mx-auto mb-1" />
          <div className="text-xs font-medium">Outro</div>
          <div className="text-[10px] opacity-80">Volume</div>
        </button>
      </div>

      {/* Resumo de Hoje */}
      {infoHoje && infoHoje.registros > 0 && (
        <div className="mb-5">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Registros Hoje</h4>
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs opacity-80 mb-1">Total hoje</div>
                <div className="text-2xl font-bold">{infoHoje.litros}L</div>
              </div>
              <div className="text-right">
                <div className="text-xs opacity-80 mb-1">Vezes</div>
                <div className="text-2xl font-bold">{infoHoje.registros}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Histórico 7 Dias */}
      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-3">Últimos 7 Dias</h4>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <div className="flex items-end justify-between gap-2 h-32">
            {hoje7dias.map((day) => {
              const altura = (day.ml / maxML) * 100;
              const isToday = day.date === hoje;
              return (
                <div key={day.date} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full flex flex-col justify-end h-full">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${altura}%` }}
                      transition={{ delay: 0.1 }}
                      className={`w-full rounded-t-lg ${
                        isToday ? 'bg-gradient-to-t from-blue-500 to-indigo-600' : 'bg-blue-200'
                      }`}
                    />
                  </div>
                  <div className="text-center">
                    <div className="text-[10px] text-gray-500 font-medium">{day.label}</div>
                    <div className="text-xs font-bold text-gray-700">{day.litros}L</div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-center gap-1 mt-4 pt-3 border-t border-gray-100 text-xs text-gray-500">
            <TrendingUp className="w-3 h-3" />
            Meta: {(metaDiariaML / 1000).toFixed(1)}L/dia
          </div>
        </div>
      </div>

      {/* Dicas e feedback */}
      {percentualMeta < 50 && consumoHoje === 0 && (
        <div className="mt-4 bg-amber-50 rounded-lg p-3 border border-amber-200">
          <p className="text-xs text-amber-800">
            💡 <strong>Dica:</strong> Comece o dia bebendo um copo de água em jejum para ativar o metabolismo!
          </p>
        </div>
      )}

      {percentualMeta >= 100 && (
        <div className="mt-4 bg-green-50 rounded-lg p-3 border border-green-200">
          <p className="text-xs text-green-800 flex items-center gap-2">
            <Check className="w-4 h-4" />
            <strong>Parabéns!</strong> Você atingiu sua meta de hidratação hoje! 🎉
          </p>
        </div>
      )}

      {/* Modal de Adicionar Água */}
      {showAddModal && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={() => !isLogging && setShowAddModal(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl w-full max-w-sm p-6"
          >
            <h3 className="text-xl font-bold text-gray-900 mb-4">Registrar Água</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Quantidade (ml)</label>
                <Input
                  type="number"
                  placeholder="Ex: 300"
                  value={quantidade}
                  onChange={(e) => setQuantidade(e.target.value)}
                  min="1"
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Data</label>
                <Input
                  type="date"
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full"
                />
              </div>

              {quantidade && (
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-700">Equivalente a:</span>
                    <span className="font-bold text-blue-600">
                      {(parseInt(quantidade, 10) / 1000).toFixed(2)}L
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                onClick={() => setShowAddModal(false)}
                variant="outline"
                className="flex-1"
                disabled={isLogging}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleAddWater}
                className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white"
                disabled={!quantidade || !data || isLogging}
              >
                {isLogging ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                    className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                  />
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-1" />
                    Registrar
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
