import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, BookOpen, Heart, TrendingDown, Salad, Activity, Brain, AlertCircle } from 'lucide-react';
import { createPageUrl } from '@/utils';

const articles = [
  {
    id: 1,
    title: 'Entendendo o Colesterol',
    category: 'Fundamentos',
    icon: Brain,
    color: 'from-purple-500 to-indigo-600',
    content: `O colesterol é uma substância gordurosa essencial para o funcionamento do corpo, mas precisa estar em equilíbrio.

**LDL (Colesterol Ruim)**
É chamado de "ruim" porque se acumula nas artérias, formando placas que podem obstruir o fluxo sanguíneo. Níveis ideais: abaixo de 100 mg/dL.

**HDL (Colesterol Bom)**
O "bom" colesterol ajuda a remover o LDL das artérias, levando-o de volta ao fígado. Níveis ideais: acima de 60 mg/dL.

**Triglicerídeos**
Outro tipo de gordura no sangue. Níveis elevados aumentam o risco cardiovascular. Ideais: abaixo de 150 mg/dL.

**O que causa colesterol alto?**
- Alimentação rica em gorduras saturadas e trans
- Sedentarismo
- Obesidade
- Genética
- Tabagismo

A boa notícia é que mudanças no estilo de vida podem fazer uma grande diferença!`
  },
  {
    id: 2,
    title: 'Alimentos que Combatem o Colesterol',
    category: 'Nutrição',
    icon: Salad,
    color: 'from-green-500 to-emerald-600',
    content: `Alguns alimentos são verdadeiros aliados na luta contra o colesterol alto.

**Aveia e Cereais Integrais**
As fibras solúveis da aveia reduzem a absorção de colesterol no intestino. Consuma 3g de fibra solúvel por dia (cerca de 1 xícara e meia de aveia).

**Oleaginosas (Nozes, Amêndoas, Castanhas)**
Ricas em gorduras saudáveis, reduzem LDL sem afetar o HDL. Um punhado por dia (cerca de 30g) traz benefícios.

**Peixes Gordos**
Salmão, atum, sardinha são ricos em ômega-3, que reduzem triglicerídeos e protegem o coração. Consuma 2-3 vezes por semana.

**Azeite de Oliva Extra Virgem**
Fonte de gorduras monoinsaturadas que elevam o HDL. Use 2 colheres de sopa por dia.

**Frutas Cítricas e Berries**
Ricas em antioxidantes e fibras que ajudam a reduzir o colesterol.

**Leguminosas**
Feijão, lentilha, grão-de-bico são ricos em fibras solúveis.

**Alho**
Estudos mostram que pode reduzir colesterol e pressão arterial.

**Evite:**
- Frituras e alimentos ultraprocessados
- Carnes gordas e embutidos
- Manteiga e margarina em excesso
- Açúcar refinado`
  },
  {
    id: 3,
    title: 'Exercícios para o Coração',
    category: 'Atividade Física',
    icon: Activity,
    color: 'from-red-500 to-rose-600',
    content: `A atividade física é fundamental para controlar o colesterol e melhorar a saúde cardiovascular.

**Benefícios do Exercício**
- Aumenta o HDL (colesterol bom)
- Reduz triglicerídeos
- Fortalece o coração
- Melhora circulação sanguínea
- Controla peso e pressão arterial

**Quanto Exercício é Necessário?**
Recomendação: 150 minutos de atividade moderada por semana (30 min, 5x na semana).

**Tipos de Exercícios Recomendados**

**1. Aeróbicos (Cardio)**
- Caminhada rápida
- Corrida leve
- Ciclismo
- Natação
- Dança

**2. Exercícios de Força**
- Musculação leve a moderada
- 2-3 vezes por semana
- Melhora metabolismo e composição corporal

**3. Flexibilidade**
- Yoga e alongamento
- Reduzem estresse e melhoram postura

**Dicas para Começar:**
1. Comece devagar e aumente gradualmente
2. Escolha atividades que você goste
3. Exercite-se com amigos para motivação
4. Consulte um médico antes de iniciar
5. Mantenha consistência - é melhor 20 min todo dia do que 2 horas uma vez por semana

**Atenção:** Se tiver mais de 40 anos ou fatores de risco, faça avaliação médica antes.`
  },
  {
    id: 4,
    title: 'Estresse e Saúde do Coração',
    category: 'Bem-estar',
    icon: Heart,
    color: 'from-pink-500 to-rose-600',
    content: `O estresse crônico pode impactar negativamente seus níveis de colesterol e saúde cardiovascular.

**Como o Estresse Afeta o Colesterol?**
- Aumenta cortisol, hormônio que eleva colesterol
- Leva a hábitos ruins (comer compulsivo, sedentarismo)
- Aumenta pressão arterial
- Inflama as artérias

**Sinais de Estresse Crônico**
- Cansaço constante
- Dificuldade para dormir
- Irritabilidade
- Dores de cabeça frequentes
- Problemas digestivos

**Estratégias de Gerenciamento**

**1. Técnicas de Relaxamento**
- Meditação (10-15 min por dia)
- Respiração profunda
- Yoga ou tai chi

**2. Sono de Qualidade**
- 7-9 horas por noite
- Rotina regular de sono
- Ambiente escuro e silencioso

**3. Conexões Sociais**
- Passe tempo com amigos e família
- Participe de grupos e comunidades
- Converse sobre seus sentimentos

**4. Hobbies e Lazer**
- Reserve tempo para atividades prazerosas
- Leia, ouça música, cuide de plantas
- Faça pausas durante o trabalho

**5. Limite Estimulantes**
- Reduza cafeína
- Evite álcool em excesso
- Não fume

**Quando Buscar Ajuda**
Se o estresse está afetando sua qualidade de vida, considere apoio profissional de um psicólogo ou terapeuta.`
  },
  {
    id: 5,
    title: 'Interpretando Seus Exames',
    category: 'Exames',
    icon: TrendingDown,
    color: 'from-blue-500 to-indigo-600',
    content: `Entender seus exames de sangue é fundamental para acompanhar sua saúde cardiovascular.

**Lipidograma Completo**

**Colesterol Total**
- Desejável: < 200 mg/dL
- Limítrofe: 200-239 mg/dL
- Alto: ≥ 240 mg/dL

**LDL (Colesterol Ruim)**
- Ótimo: < 100 mg/dL
- Próximo do ótimo: 100-129 mg/dL
- Limítrofe: 130-159 mg/dL
- Alto: 160-189 mg/dL
- Muito alto: ≥ 190 mg/dL

**HDL (Colesterol Bom)**
- Baixo (risco): < 40 mg/dL (homens), < 50 mg/dL (mulheres)
- Adequado: 40-59 mg/dL
- Ideal: ≥ 60 mg/dL

**Triglicerídeos**
- Normal: < 150 mg/dL
- Limítrofe: 150-199 mg/dL
- Alto: 200-499 mg/dL
- Muito alto: ≥ 500 mg/dL

**Outras Medições Importantes**

**Relação Colesterol Total/HDL**
Ideal: < 4,5 (quanto menor, melhor)

**Glicemia em Jejum**
- Normal: 70-99 mg/dL
- Pré-diabetes: 100-125 mg/dL
- Diabetes: ≥ 126 mg/dL

**Frequência de Exames**
- Adultos saudáveis: a cada 5 anos
- Com fatores de risco: anualmente
- Em tratamento: a cada 3-6 meses

**Dica:** Leve seus resultados anteriores nas consultas para o médico avaliar tendências.`
  },
  {
    id: 6,
    title: 'Mitos e Verdades sobre Colesterol',
    category: 'Esclarecimentos',
    icon: AlertCircle,
    color: 'from-amber-500 to-orange-600',
    content: `Vamos esclarecer alguns mitos comuns sobre colesterol.

**MITO: Ovos aumentam muito o colesterol**
✅ VERDADE: Estudos recentes mostram que para a maioria das pessoas, o consumo moderado de ovos (até 1 por dia) não aumenta significativamente o colesterol. A gema é rica em nutrientes importantes.

**MITO: Colesterol só afeta pessoas mais velhas**
✅ VERDADE: Colesterol alto pode afetar qualquer idade, incluindo crianças e jovens, especialmente com histórico familiar.

**MITO: Pessoas magras não têm colesterol alto**
✅ VERDADE: Peso não é o único fator. Genética, alimentação e sedentarismo também influenciam.

**MITO: Todo colesterol é ruim**
✅ VERDADE: O corpo precisa de colesterol para funções vitais. O problema é o desequilíbrio entre LDL e HDL.

**MITO: Medicamentos são a única solução**
✅ VERDADE: Mudanças no estilo de vida (dieta, exercício) são fundamentais e podem, em casos leves, controlar sem medicação.

**MITO: Não posso comer carne vermelha**
✅ VERDADE: Pode comer, mas opte por cortes magros, porções moderadas (100-150g) e preparo grelhado/assado.

**MITO: Margarina é melhor que manteiga**
✅ VERDADE: Ambas devem ser consumidas com moderação. O azeite de oliva é a melhor opção.

**MITO: Suplementos de ômega-3 substituem peixes**
✅ VERDADE: Peixes têm outros nutrientes importantes. Suplementos ajudam, mas não substituem totalmente.

**VERDADE IMPORTANTE:** O acompanhamento médico regular é essencial. Nunca faça mudanças drásticas sem orientação profissional.`
  }
];

export default function Conteudo() {
  const [selectedArticle, setSelectedArticle] = useState(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-rose-50">
      <div className="max-w-lg mx-auto px-4 pt-6 pb-24">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button 
            onClick={() => {
              if (selectedArticle) {
                setSelectedArticle(null);
              } else {
                window.location.href = createPageUrl('Dashboard');
              }
            }}
            className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {selectedArticle ? selectedArticle.title : 'Conteúdo Educativo'}
            </h1>
            <p className="text-sm text-gray-500">
              {selectedArticle ? selectedArticle.category : 'Aprenda sobre saúde cardiovascular'}
            </p>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {!selectedArticle ? (
            <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* Intro */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl p-6 mb-6 border border-gray-100 shadow-sm"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
                    <BookOpen className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-gray-900">Biblioteca de Saúde</h2>
                    <p className="text-xs text-gray-500">Conhecimento é prevenção</p>
                  </div>
                </div>
                <p className="text-sm text-gray-600">
                  Explore artigos sobre colesterol, alimentação, exercícios e bem-estar cardiovascular. 
                  Quanto mais você aprende, melhor cuida da sua saúde! ❤️
                </p>
              </motion.div>

              {/* Lista de Artigos */}
              <div className="space-y-3">
                {articles.map((article, idx) => (
                  <motion.button
                    key={article.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    onClick={() => setSelectedArticle(article)}
                    className="w-full bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-all text-left"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${article.color} flex items-center justify-center flex-shrink-0`}>
                        <article.icon className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-1">{article.title}</h3>
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                          {article.category}
                        </span>
                      </div>
                      <ArrowLeft className="w-5 h-5 text-gray-400 rotate-180" />
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="article"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              {/* Header do Artigo */}
              <div className={`bg-gradient-to-br ${selectedArticle.color} rounded-2xl p-6 mb-6 text-white`}>
                <selectedArticle.icon className="w-12 h-12 mb-3 opacity-90" />
                <h2 className="text-2xl font-bold mb-2">{selectedArticle.title}</h2>
                <span className="inline-block bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-sm">
                  {selectedArticle.category}
                </span>
              </div>

              {/* Conteúdo do Artigo */}
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <div className="prose prose-sm max-w-none">
                  {selectedArticle.content.split('\n\n').map((paragraph, idx) => {
                    // Detectar títulos (começam com **)
                    if (paragraph.startsWith('**') && paragraph.endsWith('**')) {
                      const title = paragraph.replace(/\*\*/g, '');
                      return (
                        <h3 key={idx} className="text-lg font-bold text-gray-900 mt-6 mb-3">
                          {title}
                        </h3>
                      );
                    }
                    // Detectar subtítulos
                    if (paragraph.includes('**') && paragraph.includes('\n')) {
                      const parts = paragraph.split('**');
                      return (
                        <div key={idx} className="mb-4">
                          {parts.map((part, i) => {
                            if (i % 2 === 1) {
                              return <strong key={i} className="font-semibold text-gray-900">{part}</strong>;
                            }
                            return <span key={i} className="text-gray-700">{part}</span>;
                          })}
                        </div>
                      );
                    }
                    // Detectar listas
                    if (paragraph.startsWith('- ')) {
                      const items = paragraph.split('\n');
                      return (
                        <ul key={idx} className="list-disc list-inside space-y-1 mb-4 text-gray-700">
                          {items.map((item, i) => (
                            <li key={i}>{item.replace('- ', '')}</li>
                          ))}
                        </ul>
                      );
                    }
                    // Parágrafo normal
                    return (
                      <p key={idx} className="text-gray-700 leading-relaxed mb-4">
                        {paragraph}
                      </p>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}