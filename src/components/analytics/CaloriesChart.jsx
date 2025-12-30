import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Flame } from 'lucide-react';

export default function CaloriesChart({ mealLogs }) {
  if (!mealLogs || mealLogs.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-6 border border-gray-100 text-center text-gray-500">
        <p>Nenhuma refeição registrada</p>
      </div>
    );
  }

  // Agrupar por dia
  const dailyCalories = mealLogs.reduce((acc, meal) => {
    const date = new Date(meal.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
    if (!acc[date]) {
      acc[date] = { date, calorias: 0, refeicoes: 0 };
    }
    acc[date].calorias += meal.calories || 0;
    acc[date].refeicoes += 1;
    return acc;
  }, {});

  const data = Object.values(dailyCalories).slice(-7);
  const avgCalories = Math.round(data.reduce((sum, d) => sum + d.calorias, 0) / data.length);

  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Calorias Diárias (últimos 7 dias)</h3>
        <div className="flex items-center gap-1 text-orange-600 font-medium text-sm">
          <Flame className="w-4 h-4" />
          Média: {avgCalories} kcal
        </div>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorCalories" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#888" />
          <YAxis tick={{ fontSize: 12 }} stroke="#888" />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'white', 
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '12px'
            }}
          />
          <Area 
            type="monotone" 
            dataKey="calorias" 
            stroke="#f97316" 
            strokeWidth={2}
            fillOpacity={1} 
            fill="url(#colorCalories)" 
            name="Calorias"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}