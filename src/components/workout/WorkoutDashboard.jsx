import React from 'react';
import { motion } from 'framer-motion';
import { Dumbbell, Target, TrendingUp, Calendar, Zap } from 'lucide-react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function WorkoutDashboard({ activities }) {
  // Meta semanal de minutos de treino
  const metaSemanal = 150; // OMS recomenda 150 min/semana de atividade moderada
  
  // Calcular semana atual
  const hoje = new Date();
  const inicioSemana = startOfWeek(hoje, { weekStartsOn: 0 });
  const fimSemana = endOfWeek(hoje, { weekStartsOn: 0 });
  
  // Filtrar treinos da semana atual
  const treinosSemana = activities?.filter(a => {
    const dataAtividade = new Date(a.data);
    return dataAtividade >= inicioSemana && dataAtividade <= fimSemana;
  }) || [];

  // Calcular minutos totais da semana
  const minutosSemanais = treinosSemana.reduce((total, treino) => {
    // Extrair minutos da descrição se existir, senão usar 30 min padrão
    const match = treino.descricao?.match(/(\d+)\s*min/);
    const minutos = match ? parseInt(match[1]) : 30;
    return total + minutos;
  }, 0);

  const percentualMeta = Math.min((minutosSemanais / metaSemanal) * 100, 100);
  const minutosRestantes = Math.max(metaSemanal - minutosSemanais, 0);

  // Calcular treinos hoje
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

  const maxMinutos = Math.max(...hoje7dias.map(d => d.minutos), 40);
  const hojeDateStr = new Date().toISOString().split('T')[0];
  const treinosHoje = hoje7dias.find(d => d.date === hojeDateStr);

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
          <h3 className="font-semibold text-gray-900">Meta Semanal de Treino</h3>
        </div>
        <div className="text-xs text-gray-500">
          <Calendar className="w-4 h-4 inline mr-1" />
          Semana atual
        </div>
      </div>

      {/* Progresso Principal */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 mb-5">
        <div className="flex items-end justify-between mb-3">
          <div>
            <div className="text-4xl font-bold text-gray-900">{minutosSemanais}</div>
            <div className="text-sm text-gray-600">de {metaSemanal} minutos</div>
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

      {/* Treinos de Hoje */}
      {treinosHoje && treinosHoje.sessoes > 0 && (
        <div className="mb-5">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Treinos de Hoje</h4>
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs opacity-80 mb-1">Total hoje</div>
                <div className="text-2xl font-bold">{treinosHoje.minutos} min</div>
              </div>
              <div className="text-right">
                <div className="text-xs opacity-80 mb-1">Sessões</div>
                <div className="text-2xl font-bold">{treinosHoje.sessoes}</div>
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
          Meta: {metaSemanal} min/semana (OMS)
        </div>
      </div>

      {/* Dica */}
      {percentualMeta < 50 && treinosSemana.length < 3 && (
        <div className="mt-4 bg-amber-50 rounded-lg p-3 border border-amber-200">
          <p className="text-xs text-amber-800">
            💡 <strong>Dica:</strong> A OMS recomenda pelo menos 150 minutos de atividade física por semana. Que tal adicionar mais {Math.ceil(minutosRestantes / 30)} treinos de 30 min?
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