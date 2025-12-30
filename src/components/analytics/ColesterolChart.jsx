import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { TrendingDown, TrendingUp } from 'lucide-react';

export default function ColesterolChart({ records }) {
  if (!records || records.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-6 border border-gray-100 text-center text-gray-500">
        <p>Nenhum dado de colesterol disponível</p>
      </div>
    );
  }

  const data = [...records].reverse().map(r => ({
    data: new Date(r.data_exame).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
    LDL: r.ldl || 0,
    HDL: r.hdl || 0,
    Total: r.total || 0,
    Triglicerídeos: r.triglicerides || 0
  }));

  // Calcular tendências
  const latestLDL = records[0]?.ldl || 0;
  const previousLDL = records[1]?.ldl || 0;
  const ldlTrend = latestLDL < previousLDL;

  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Evolução do Colesterol</h3>
        <div className={`flex items-center gap-1 text-sm px-3 py-1 rounded-full ${
          ldlTrend ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
        }`}>
          {ldlTrend ? <TrendingDown className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
          LDL {ldlTrend ? 'caindo' : 'subindo'}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="data" tick={{ fontSize: 12 }} stroke="#888" />
          <YAxis tick={{ fontSize: 12 }} stroke="#888" />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'white', 
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '12px'
            }}
          />
          <Legend wrapperStyle={{ fontSize: '12px' }} />
          <Line type="monotone" dataKey="LDL" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} name="LDL (Ruim)" />
          <Line type="monotone" dataKey="HDL" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} name="HDL (Bom)" />
          <Line type="monotone" dataKey="Total" stroke="#6366f1" strokeWidth={2} dot={{ r: 4 }} name="Total" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}