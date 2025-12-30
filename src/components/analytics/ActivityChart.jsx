import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Zap } from 'lucide-react';

export default function ActivityChart({ activities }) {
  if (!activities || activities.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-6 border border-gray-100 text-center text-gray-500">
        <p>Nenhuma atividade registrada</p>
      </div>
    );
  }

  // Agrupar por tipo
  const grouped = activities.reduce((acc, act) => {
    const tipo = act.tipo === 'exercicio' ? 'Exercícios' : 
                 act.tipo === 'alimentacao' ? 'Alimentação' : 'Outras';
    if (!acc[tipo]) acc[tipo] = 0;
    acc[tipo] += act.xp_ganho || 0;
    return acc;
  }, {});

  const data = Object.entries(grouped).map(([tipo, xp]) => ({
    tipo,
    xp
  }));

  const colors = {
    'Exercícios': '#3b82f6',
    'Alimentação': '#10b981',
    'Outras': '#8b5cf6'
  };

  const totalXP = data.reduce((sum, d) => sum + d.xp, 0);

  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">XP por Categoria</h3>
        <div className="flex items-center gap-1 text-yellow-600 font-medium text-sm">
          <Zap className="w-4 h-4" />
          {totalXP} XP total
        </div>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="tipo" tick={{ fontSize: 12 }} stroke="#888" />
          <YAxis tick={{ fontSize: 12 }} stroke="#888" />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'white', 
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '12px'
            }}
          />
          <Bar dataKey="xp" radius={[8, 8, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={colors[entry.tipo]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}