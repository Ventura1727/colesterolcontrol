import React from 'react';
import { motion } from 'framer-motion';
import { Flame, Target, TrendingUp, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function CaloriesDashboard({ mealLogs, basalRate }) {
  // Calcular calorias do dia
  const today = new Date().toISOString().split('T')[0];
  const todayMeals = mealLogs?.filter(m => {
    const mealDate = new Date(m.date).toISOString().split('T')[0];
    return mealDate === today;
  }) || [];

  const todayCalories = todayMeals.reduce((sum, m) => sum + (m.calories || 0), 0);
  const targetCalories = basalRate || 2000;
  const percentage = Math.min((todayCalories / targetCalories) * 100, 100);
  const remaining = Math.max(targetCalories - todayCalories, 0);

  // Últimos 7 dias
  const last7Days = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const dayMeals = mealLogs?.filter(m => {
      const mealDate = new Date(m.date).toISOString().split('T')[0];
      return mealDate === dateStr;
    }) || [];
    const dayCalories = dayMeals.reduce((sum, m) => sum + (m.calories || 0), 0);
    last7Days.push({
      date: dateStr,
      calories: dayCalories,
      label: format(date, 'EEE', { locale: ptBR })
    });
  }

  const maxCalories = Math.max(...last7Days.map(d => d.calories), targetCalories);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl p-5 mb-6 border border-gray-100 shadow-sm"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Flame className="w-5 h-5 text-orange-500" />
          <h3 className="font-semibold text-gray-900">Calorias de Hoje</h3>
        </div>
        <div className="text-xs text-gray-500">
          <Calendar className="w-4 h-4 inline mr-1" />
          {format(new Date(), 'dd/MM/yyyy')}
        </div>
      </div>

      {/* Progresso Principal */}
      <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl p-5 mb-5">
        <div className="flex items-end justify-between mb-3">
          <div>
            <div className="text-4xl font-bold text-gray-900">{todayCalories}</div>
            <div className="text-sm text-gray-600">de {targetCalories} kcal</div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-orange-600">{remaining}</div>
            <div className="text-xs text-gray-600">restantes</div>
          </div>
        </div>

        {/* Barra de Progresso */}
        <div className="relative h-3 bg-white rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className={`h-full rounded-full ${
              percentage < 70 ? 'bg-green-500' : percentage < 90 ? 'bg-yellow-500' : 'bg-red-500'
            }`}
          />
        </div>

        <div className="flex items-center justify-between mt-2 text-xs">
          <span className="text-gray-600">{percentage.toFixed(0)}% da meta</span>
          {percentage < 100 ? (
            <span className="text-green-600 font-medium">✓ Dentro da meta</span>
          ) : (
            <span className="text-amber-600 font-medium">⚠️ Meta atingida</span>
          )}
        </div>
      </div>

      {/* Últimas Refeições */}
      {todayMeals.length > 0 && (
        <div className="mb-5">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Refeições de Hoje</h4>
          <div className="space-y-2">
            {todayMeals.slice(-3).reverse().map((meal, idx) => (
              <div key={idx} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900 line-clamp-1">
                    {meal.description}
                  </div>
                  <div className="text-xs text-gray-500">
                    {format(new Date(meal.date), 'HH:mm')}
                  </div>
                </div>
                <div className="flex items-center gap-1 text-orange-600 font-semibold">
                  <Flame className="w-4 h-4" />
                  {meal.calories || 0}
                </div>
              </div>
            ))}
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
          {last7Days.map((day, idx) => {
            const height = maxCalories > 0 ? (day.calories / maxCalories) * 100 : 0;
            const isToday = day.date === today;
            return (
              <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                <div className="text-[10px] text-gray-500 font-medium">
                  {day.calories > 0 ? day.calories : ''}
                </div>
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${height}%` }}
                  transition={{ duration: 0.5, delay: idx * 0.1 }}
                  className={`w-full rounded-t-lg ${
                    isToday ? 'bg-orange-500' : 'bg-gray-300'
                  }`}
                  style={{ minHeight: day.calories > 0 ? '8px' : '2px' }}
                />
                <div className={`text-[10px] font-medium ${
                  isToday ? 'text-orange-600' : 'text-gray-500'
                }`}>
                  {day.label}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-center gap-1 mt-3 text-xs text-gray-500">
          <Target className="w-3 h-3" />
          Meta: {targetCalories} kcal/dia
        </div>
      </div>

      {/* Dica */}
      {remaining < 300 && remaining > 0 && (
        <div className="mt-4 bg-amber-50 rounded-lg p-3 border border-amber-200">
          <p className="text-xs text-amber-800">
            💡 <strong>Atenção:</strong> Você está próximo da sua meta diária. Escolha refeições leves!
          </p>
        </div>
      )}
    </motion.div>
  );
}