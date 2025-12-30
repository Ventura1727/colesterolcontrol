import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, TrendingUp, AlertCircle, CheckCircle, Loader2, Brain } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function AIInsights({ profile, activities, colesterolRecords, mealLogs }) {
  const [insights, setInsights] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    generateInsights();
  }, [activities, colesterolRecords, mealLogs]);

  const generateInsights = async () => {
    setIsLoading(true);
    try {
      // Preparar dados para análise
      const colesterolData = colesterolRecords?.slice(0, 5).map(r => ({
        data: r.data_exame,
        ldl: r.ldl,
        hdl: r.hdl,
        total: r.total
      })) || [];

      const activityData = activities?.slice(0, 20).map(a => ({
        tipo: a.tipo,
        descricao: a.descricao,
        data: a.data,
        xp: a.xp_ganho
      })) || [];

      const mealData = mealLogs?.slice(0, 10).map(m => ({
        descricao: m.description,
        calorias: m.calories,
        saudavel: m.is_healthy,
        data: m.date
      })) || [];

      // Chamar IA para análise
      const analysis = await base44.integrations.Core.InvokeLLM({
        prompt: `Você é um especialista em saúde cardiovascular. Analise os dados históricos do usuário e forneça insights personalizados e preditivos.

Dados do perfil:
- Objetivo: ${profile?.objetivo || 'Reduzir colesterol'}
- Rank atual: ${profile?.rank || 'Iniciante'}
- XP total: ${profile?.xp_total || 0}

Histórico de Colesterol (últimos registros):
${JSON.stringify(colesterolData, null, 2)}

Atividades recentes (últimas 20):
${JSON.stringify(activityData, null, 2)}

Refeições registradas (últimas 10):
${JSON.stringify(mealData, null, 2)}

Com base nesses dados, forneça:
1. Tendências identificadas (ex: "Seu LDL tende a subir quando você...")
2. Correlações importantes (ex: "Você tem mais energia nos dias que...")
3. Previsão de impacto (ex: "Se manter a rotina atual, seu colesterol pode melhorar X% em Y meses")
4. Recomendações específicas e acionáveis

Seja específico, motivador e baseie-se nos dados reais fornecidos.`,
        response_json_schema: {
          type: "object",
          properties: {
            tendencias: { 
              type: "array", 
              items: { type: "string" }
            },
            correlacoes: { 
              type: "array", 
              items: { type: "string" }
            },
            previsoes: {
              type: "object",
              properties: {
                colesterol: { type: "string" },
                peso: { type: "string" },
                energia: { type: "string" }
              }
            },
            recomendacoes: { 
              type: "array", 
              items: { type: "string" }
            }
          },
          required: ["tendencias", "previsoes", "recomendacoes"]
        }
      });

      setInsights(analysis);
    } catch (error) {
      console.error("Erro ao gerar insights:", error);
    }
    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-100">
        <div className="flex items-center gap-3 text-purple-700">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="font-medium">IA analisando seus dados...</span>
        </div>
      </div>
    );
  }

  if (!insights) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Header */}
      <div className="flex items-center gap-2 text-purple-700">
        <Brain className="w-5 h-5" />
        <h3 className="font-semibold">Insights da IA</h3>
        <Sparkles className="w-4 h-4" />
      </div>

      {/* Tendências */}
      {insights.tendencias && insights.tendencias.length > 0 && (
        <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            <h4 className="font-medium text-blue-900">Tendências Identificadas</h4>
          </div>
          <ul className="space-y-2">
            {insights.tendencias.map((tendencia, idx) => (
              <li key={idx} className="text-sm text-blue-800 flex items-start gap-2">
                <span className="text-blue-400 mt-1">•</span>
                <span>{tendencia}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Correlações */}
      {insights.correlacoes && insights.correlacoes.length > 0 && (
        <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
            <h4 className="font-medium text-emerald-900">Correlações Importantes</h4>
          </div>
          <ul className="space-y-2">
            {insights.correlacoes.map((correlacao, idx) => (
              <li key={idx} className="text-sm text-emerald-800 flex items-start gap-2">
                <span className="text-emerald-400 mt-1">•</span>
                <span>{correlacao}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Previsões */}
      {insights.previsoes && (
        <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-purple-600" />
            <h4 className="font-medium text-purple-900">Previsões Personalizadas</h4>
          </div>
          <div className="space-y-3">
            {insights.previsoes.colesterol && (
              <div className="bg-white rounded-lg p-3">
                <div className="text-xs text-purple-600 font-medium mb-1">🩺 Colesterol</div>
                <div className="text-sm text-gray-700">{insights.previsoes.colesterol}</div>
              </div>
            )}
            {insights.previsoes.peso && (
              <div className="bg-white rounded-lg p-3">
                <div className="text-xs text-purple-600 font-medium mb-1">⚖️ Peso</div>
                <div className="text-sm text-gray-700">{insights.previsoes.peso}</div>
              </div>
            )}
            {insights.previsoes.energia && (
              <div className="bg-white rounded-lg p-3">
                <div className="text-xs text-purple-600 font-medium mb-1">⚡ Energia</div>
                <div className="text-sm text-gray-700">{insights.previsoes.energia}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recomendações */}
      {insights.recomendacoes && insights.recomendacoes.length > 0 && (
        <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-5 h-5 text-amber-600" />
            <h4 className="font-medium text-amber-900">Recomendações para Você</h4>
          </div>
          <ul className="space-y-2">
            {insights.recomendacoes.map((rec, idx) => (
              <li key={idx} className="text-sm text-amber-800 flex items-start gap-2">
                <span className="text-amber-400 mt-1">✓</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </motion.div>
  );
}