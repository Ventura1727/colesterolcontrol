import React from 'react';
import { motion } from 'framer-motion';
import { Dumbbell, Target, TrendingUp, Calendar, Zap } from 'lucide-react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function WorkoutDashboard({ activities }) {
  // Meta diária de minutos de treino
  const metaDiaria = 30; // OMS recomenda ~21 min/dia em média (150 min/semana)
  
  // Calcular dia atual
  const hoje = new Date();
  const hojeDateStr = hoje.toISOString().split('T')[0];
  
  // Filtrar treinos de hoje
  const treinosHoje = activities?.filter(a => a.data === hojeDateStr) || [];

  // Calcular minutos totais de hoje
  const minutosDiarios = treinosHoje.reduce((total, treino) => {
    // Extrair minutos da descrição se existir, senão usar 30 min padrão
    const match = treino.descricao?.match(/(\d+)\s*min/);
    const minutos = match ? parseInt(match[1]) : 30;
    return total + minutos;
  }, 0);

  const percentualMeta = Math.min((minutosDiarios / metaDiaria) * 100, 100);
  const minutosRestantes = Math.max(metaDiaria - minutosDiarios, 0);

  // Calcular histórico de 7 dias
  const hoje7dias = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const dayActivities = activities?.filter(a => a.data === dateStr) || [];
    
    const totalMinutos = dayActivities.reduce((sum, treino) => {
      const match = treino.descricao?.match(/(\d+)\s*min/);
      const minutos = match ? parseInt(match[1]) : 30;
      return sum + minutos;
    }, 0);
    
    hoje7dias.push({
      date: dateStr,
      minutos: totalMinutos,
      sessoes: dayActivities.length,
      label: format(date, 'EEE', { locale: ptBR })
    });
  }

  const maxMinutos = Math.max(...hoje7dias.map(d => d.minutos), metaDiaria);
  const infoHoje = hoje7dias.find(d => d.date === hojeDateStr);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl p-5 mb-6 border border-gray-100 shadow-sm"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Dumbbell className="w-5 h-5 text-blue-500" />
          <h3 className="font-semibold text-gray-900">Meta Diária de Treino</h3>
        </div>
        <div className="text-xs text-gray-500">
          <Calendar className="w-4 h-4 inline mr-1" />
          Hoje
        </div>
      </div>

      {/* Progresso Principal */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 mb-5">
        <div className="flex items-end justify-between mb-3">
          <div>
            <div className="text-4xl font-bold text-gray-900">{minutosDiarios}</div>
            <div className="text-sm text-gray-600">de {metaDiaria} minutos</div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-600">{minutosRestantes}</div>
            <div className="text-xs text-gray-600">faltam</div>
          </div>
        </div>

        {/* Barra de Progresso */}
        <div className="relative h-3 bg-white rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percentualMeta}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className={`h-full rounded-full ${
              percentualMeta < 50 ? 'bg-red-500' : percentualMeta < 80 ? 'bg-yellow-500' : 'bg-green-500'
            }`}
          />
        </div>

        <div className="flex items-center justify-between mt-2 text-xs">
          <span className="text-gray-600">{percentualMeta.toFixed(0)}% da meta</span>
          {percentualMeta >= 100 ? (
            <span className="text-green-600 font-medium">🎉 Meta atingida!</span>
          ) : percentualMeta >= 50 ? (
            <span className="text-yellow-600 font-medium">💪 No caminho certo</span>
          ) : (
            <span className="text-red-600 font-medium">⚡ Vamos treinar!</span>
          )}
        </div>
      </div>

      {/* Resumo de Hoje */}
      {infoHoje && infoHoje.sessoes > 0 && (
        <div className="mb-5">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Sessões Hoje</h4>
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs opacity-80 mb-1">Total hoje</div>
                <div className="text-2xl font-bold">{infoHoje.minutos} min</div>
              </div>
              <div className="text-right">
                <div className="text-xs opacity-80 mb-1">Sessões</div>
                <div className="text-2xl font-bold">{infoHoje.sessoes}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Histórico 7 Dias */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-blue-600" />
          <h4 className="text-sm font-semibold text-gray-700">Últimos 7 Dias</h4>
        </div>
        
        <div className="flex items-end justify-between gap-1 h-24">
          {hoje7dias.map((day, idx) => {
            const height = maxMinutos > 0 ? (day.minutos / maxMinutos) * 100 : 0;
            const isToday = day.date === hojeDateStr;
            return (
              <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                <div className="text-[10px] text-gray-500 font-medium">
                  {day.minutos > 0 ? `${day.minutos}m` : ''}
                </div>
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${height}%` }}
                  transition={{ duration: 0.5, delay: idx * 0.1 }}
                  className={`w-full rounded-t-lg ${
                    isToday ? 'bg-blue-500' : 'bg-gray-300'
                  }`}
                  style={{ minHeight: day.minutos > 0 ? '8px' : '2px' }}
                />
                <div className={`text-[10px] font-medium ${
                  isToday ? 'text-blue-600' : 'text-gray-500'
                }`}>
                  {day.label}
                </div>
                {day.sessoes > 0 && (
                  <div className="text-[9px] text-gray-400">
                    {day.sessoes}x
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-center gap-1 mt-3 text-xs text-gray-500">
          <Target className="w-3 h-3" />
          Meta: {metaDiaria} min/dia (OMS)
        </div>
      </div>

      {/* Dica */}
      {percentualMeta < 50 && treinosHoje.length === 0 && (
        <div className="mt-4 bg-amber-50 rounded-lg p-3 border border-amber-200">
          <p className="text-xs text-amber-800">
            💡 <strong>Dica:</strong> A OMS recomenda pelo menos 30 minutos de atividade física por dia. Que tal começar com uma caminhada leve?
          </p>
        </div>
      )}

      {percentualMeta >= 100 && (
        <div className="mt-4 bg-green-50 rounded-lg p-3 border border-green-200">
          <p className="text-xs text-green-800">
            🎉 <strong>Parabéns!</strong> Você atingiu sua meta semanal! Continue assim para manter uma saúde cardiovascular excelente.
          </p>
        </div>
      )}
    </motion.div>
  );
}