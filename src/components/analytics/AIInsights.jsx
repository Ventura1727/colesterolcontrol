import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, TrendingUp, AlertCircle, CheckCircle, Loader2, Brain, Activity, HeartPulse } from 'lucide-react';

export default function AIInsights({ profile, activities, colesterolRecords, mealLogs }) {
  const [insights, setInsights] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if ((colesterolRecords?.length > 0 || mealLogs?.length > 0) && !insights) {
      generateInsights();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activities, colesterolRecords, mealLogs]);

  const generateInsights = async () => {
    setIsLoading(true);
    try {
      // 1. Cálculos de Inteligência Local (Propriedade Intelectual do App)
      const peso = Number(profile?.peso || 80);
      const altura = Number(profile?.altura || 1.70);
      const imc = (peso / (altura * altura)).toFixed(1);
      
      let statusImc = "";
      if (imc < 18.5) statusImc = "Abaixo do peso";
      else if (imc < 25) statusImc = "Peso ideal";
      else if (imc < 30) statusImc = "Sobrepeso";
      else statusImc = "Obesidade";

      // 2. Preparação de Dados Clínicos
      const colesterolData = colesterolRecords?.slice(0, 5).map(r => ({
        data: r.data_exame || r.record_date,
        ldl: r.ldl,
        hdl: r.hdl,
        triglicerideos: r.triglicerideos || r.triglycerides,
        total: r.total
      })) || [];

      const mealData = mealLogs?.slice(0, 15).map(m => ({
        descricao: m.description,
        calorias: m.calories,
        saudavel: m.is_healthy,
        data: m.date
      })) || [];

      // 3. REFINAMENTO DO PROMPT (Nível HealthTech Profissional)
      const prompt = `
        Aja como um Especialista em Cardiologia e Nutrição de Precisão. Analise os dados para o app Heartbalance.
        
        PERFIL DO PACIENTE:
        - Objetivo: ${profile?.objetivo || 'Controle de Colesterol'}
        - IMC Atual: ${imc} (${statusImc})
        
        DADOS CLÍNICOS (Histórico de Exames):
        ${JSON.stringify(colesterolData, null, 2)}
        
        HÁBITOS ALIMENTARES RECENTES:
        ${JSON.stringify(mealData, null, 2)}

        SUA TAREFA:
        1. Gere um "HeartScore" de 0 a 100 baseado na proximidade das metas de LDL (<100mg/dL) e qualidade das refeições.
        2. Identifique Tendências: O LDL está subindo? As refeições não saudáveis coincidem com picos de peso?
        3. Identifique Correlações: Ex: "Seu consumo de frituras/doces reportado impactou seus triglicerídeos em X%".
        4. Previsão: Baseado no ritmo atual, em quanto tempo ele atingirá a meta de colesterol?

        RETORNE OBRIGATORIAMENTE UM JSON COM ESTA ESTRUTURA:
        {
          "score_saude": 85,
          "alerta_critico": "string ou null",
          "tendencias": ["frase 1", "frase 2"],
          "correlacoes": ["frase 1"],
          "previsoes": { "colesterol": "string", "peso": "string", "energia": "string" },
          "recomendacoes": ["item 1", "item 2"]
        }
      `;

      const response = await fetch('/api/invoke-llm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, imc, statusImc })
      });

      const { analysis } = await response.json();
      
      // Se a resposta vier como string, tenta converter para JSON
      const parsedAnalysis = typeof analysis === 'string' ? JSON.parse(analysis) : analysis;
      setInsights(parsedAnalysis);

    } catch (error) {
      console.error("Erro ao gerar insights clínicos:", error);
    }
    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-3xl p-8 border-2 border-purple-50 shadow-sm text-center">
        <Loader2 className="w-10 h-10 animate-spin text-purple-600 mx-auto mb-4" />
        <h3 className="font-bold text-gray-900">Analisando Bioindicadores</h3>
        <p className="text-sm text-gray-500 mt-1">Cruzando seus exames com sua alimentação...</p>
      </div>
    );
  }

  if (!insights) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      className="space-y-6"
    >
      {/* CARD PRINCIPAL: HEARTSCORE */}
      <div className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-[32px] p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-purple-100 text-xs font-bold uppercase tracking-widest mb-1">Status Cardiovascular</p>
              <h3 className="text-2xl font-black">HeartScore</h3>
            </div>
            <HeartPulse className="w-8 h-8 text-purple-200 opacity-50" />
          </div>
          
          <div className="mt-6 flex items-baseline gap-2">
            <span className="text-7xl font-black tracking-tighter">{insights.score_saude || '--'}</span>
            <span className="text-xl font-bold text-purple-200">/100</span>
          </div>
          
          <p className="text-sm text-purple-100 mt-4 leading-relaxed opacity-90">
            {insights.alerta_critico || "Seus dados indicam uma evolução consistente. Mantenha o foco nas gorduras boas."}
          </p>
        </div>
        {/* Decorativo ao fundo */}
        <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
      </div>

      {/* ALERTAS CRÍTICOS (Se existirem) */}
      {insights.alerta_critico && (
        <div className="bg-red-50 border-2 border-red-100 rounded-2xl p-4 flex gap-3 items-start">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-red-900">Alerta de Saúde</p>
            <p className="text-xs text-red-800 opacity-90">{insights.alerta_critico}</p>
          </div>
        </div>
      )}

      {/* GRID DE INSIGHTS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Tendências */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-blue-500" />
            <h4 className="font-bold text-gray-800 text-sm uppercase">Tendências</h4>
          </div>
          <ul className="space-y-3">
            {insights.tendencias?.map((t, i) => (
              <li key={i} className="text-sm text-gray-600 flex gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                {t}
              </li>
            ))}
          </ul>
        </div>

        {/* Correlações */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-emerald-500" />
            <h4 className="font-bold text-gray-800 text-sm uppercase">Correlações</h4>
          </div>
          <ul className="space-y-3">
            {insights.correlacoes?.map((c, i) => (
              <li key={i} className="text-sm text-gray-600 flex gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                {c}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* PREVISÕES PREDITIVAS */}
      <div className="bg-purple-50 rounded-3xl p-6 border border-purple-100">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-purple-600" />
          <h4 className="font-bold text-purple-900">Previsões de Impacto</h4>
        </div>
        <div className="grid grid-cols-1 gap-3">
          {insights.previsoes?.colesterol && (
            <div className="bg-white/60 rounded-xl p-3 flex gap-3">
              <span className="text-xl">🩺</span>
              <p className="text-sm text-purple-900 font-medium">{insights.previsoes.colesterol}</p>
            </div>
          )}
          {insights.previsoes?.peso && (
            <div className="bg-white/60 rounded-xl p-3 flex gap-3">
              <span className="text-xl">⚖️</span>
              <p className="text-sm text-purple-900 font-medium">{insights.previsoes.peso}</p>
            </div>
          )}
        </div>
      </div>

      {/* RECOMENDAÇÕES FINAIS */}
      <div className="bg-amber-50 rounded-3xl p-6 border border-amber-100">
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle className="w-5 h-5 text-amber-600" />
          <h4 className="font-bold text-amber-900 uppercase text-xs tracking-widest">Plano de Ação</h4>
        </div>
        <div className="space-y-2">
          {insights.recomendacoes?.map((r, i) => (
            <div key={i} className="bg-white rounded-xl p-3 text-sm text-amber-900 font-bold flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center text-[10px]">{i+1}</div>
              {r}
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
