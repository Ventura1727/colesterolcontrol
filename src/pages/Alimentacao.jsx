import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Salad, Lock, Check, Zap, Trophy, Clock, Flame, Star, ChevronRight, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';

const receitas = [
  {
    id: 'aveia-frutas',
    name: 'Bowl de Aveia com Frutas',
    desc: 'Café da manhã anti-colesterol',
    time: 10,
    xp: 15,
    benefit: 'Reduz LDL',
    rank_required: 'Iniciante',
    image: '🥣',
    ingredients: ['1/2 xícara de aveia', '1 banana', '1/2 xícara de morangos', 'Canela a gosto', 'Mel (opcional)'],
    steps: ['Cozinhe a aveia com água ou leite vegetal', 'Adicione as frutas cortadas', 'Polvilhe canela e mel']
  },
  {
    id: 'salada-salmao',
    name: 'Salada com Salmão Grelhado',
    desc: 'Almoço rico em Ômega-3',
    time: 25,
    xp: 25,
    benefit: 'Aumenta HDL',
    rank_required: 'Iniciante',
    image: '🥗',
    ingredients: ['150g de salmão', 'Mix de folhas verdes', 'Tomate cereja', 'Abacate', 'Azeite de oliva'],
    steps: ['Grelhe o salmão com ervas', 'Monte a salada com as folhas', 'Adicione tomate e abacate', 'Finalize com azeite']
  },
  {
    id: 'sopa-legumes',
    name: 'Sopa Detox de Legumes',
    desc: 'Jantar leve e nutritivo',
    time: 30,
    xp: 20,
    benefit: 'Desintoxica',
    rank_required: 'Bronze',
    image: '🍲',
    ingredients: ['Cenoura', 'Abobrinha', 'Brócolis', 'Gengibre', 'Cebola e alho'],
    steps: ['Refogue cebola e alho', 'Adicione os legumes e água', 'Cozinhe por 20 min', 'Bata no liquidificador']
  },
  {
    id: 'smoothie-verde',
    name: 'Smoothie Verde Energético',
    desc: 'Lanche poderoso',
    time: 5,
    xp: 15,
    benefit: 'Fibras e energia',
    rank_required: 'Bronze',
    image: '🥤',
    ingredients: ['Espinafre', 'Banana', 'Maçã verde', 'Gengibre', 'Água de coco'],
    steps: ['Bata todos os ingredientes no liquidificador', 'Sirva gelado']
  },
  {
    id: 'peixe-assado',
    name: 'Peixe Assado com Ervas',
    desc: 'Proteína saudável',
    time: 35,
    xp: 35,
    benefit: 'Ômega-3 + Proteína',
    rank_required: 'Prata',
    image: '🐟',
    ingredients: ['Filé de tilápia ou pescada', 'Limão', 'Alecrim e tomilho', 'Azeite', 'Sal marinho'],
    steps: ['Tempere o peixe com limão e ervas', 'Regue com azeite', 'Asse a 180°C por 25 min']
  },
  {
    id: 'bowl-quinoa',
    name: 'Bowl de Quinoa Mediterrâneo',
    desc: 'Superalimento completo',
    time: 25,
    xp: 40,
    benefit: 'Proteína vegetal',
    rank_required: 'Ouro',
    image: '🥙',
    ingredients: ['Quinoa', 'Grão de bico', 'Pepino', 'Tomate', 'Azeitonas', 'Queijo feta'],
    steps: ['Cozinhe a quinoa', 'Misture todos os ingredientes', 'Tempere com azeite e limão']
  },
  {
    id: 'wrap-integral',
    name: 'Wrap Integral Gourmet',
    desc: 'Refeição completa',
    time: 15,
    xp: 30,
    benefit: 'Fibras + Proteína',
    rank_required: 'Diamante',
    image: '🌯',
    ingredients: ['Wrap integral', 'Peito de frango grelhado', 'Abacate', 'Rúcula', 'Molho de iogurte'],
    steps: ['Grelhe o frango', 'Monte o wrap com todos ingredientes', 'Enrole e sirva']
  },
  {
    id: 'risoto-cogumelos',
    name: 'Risoto de Cogumelos Selvagens',
    desc: 'Receita gourmet saudável',
    time: 45,
    xp: 60,
    benefit: 'Antioxidantes',
    rank_required: 'Mestre',
    image: '🍚',
    ingredients: ['Arroz arbóreo', 'Mix de cogumelos', 'Vinho branco', 'Caldo de legumes', 'Parmesão light'],
    steps: ['Refogue os cogumelos', 'Adicione o arroz e o vinho', 'Vá adicionando caldo aos poucos', 'Finalize com parmesão']
  }
];

const rankOrder = ['Iniciante', 'Bronze', 'Prata', 'Ouro', 'Diamante', 'Mestre'];

export default function Alimentacao() {
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedReceita, setSelectedReceita] = useState(null);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const user = await base44.auth.me();
    const profiles = await base44.entities.UserProfile.filter({ created_by: user.email });
    if (profiles.length > 0) {
      setProfile(profiles[0]);
    }
    setIsLoading(false);
  };

  const isUnlocked = (receita) => {
    const userRankIndex = rankOrder.indexOf(profile?.rank || 'Iniciante');
    const requiredRankIndex = rankOrder.indexOf(receita.rank_required);
    return userRankIndex >= requiredRankIndex;
  };

  const completeReceita = async (receita) => {
    setCompleting(true);
    
    await base44.entities.ActivityLog.create({
      tipo: 'alimentacao',
      descricao: `Preparou: ${receita.name}`,
      xp_ganho: receita.xp,
      data: new Date().toISOString().split('T')[0]
    });

    const newXp = (profile.xp_total || 0) + receita.xp;
    const newMetas = (profile.metas_concluidas || 0) + 1;
    
    let newRank = profile.rank || 'Iniciante';
    if (newXp >= 1500) newRank = 'Mestre';
    else if (newXp >= 1000) newRank = 'Diamante';
    else if (newXp >= 600) newRank = 'Ouro';
    else if (newXp >= 300) newRank = 'Prata';
    else if (newXp >= 100) newRank = 'Bronze';

    await base44.entities.UserProfile.update(profile.id, {
      xp_total: newXp,
      metas_concluidas: newMetas,
      rank: newRank
    });

    setProfile({ ...profile, xp_total: newXp, metas_concluidas: newMetas, rank: newRank });
    setCompleting(false);
    setSelectedReceita(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      <div className="max-w-lg mx-auto px-4 pt-6 pb-24">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => window.location.href = createPageUrl('Dashboard')} className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Alimentação</h1>
            <p className="text-sm text-gray-500">Receitas para reduzir colesterol</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white rounded-xl p-3 border border-gray-100 text-center">
            <Zap className="w-5 h-5 text-yellow-500 mx-auto mb-1" />
            <div className="font-bold text-gray-900">{profile?.xp_total || 0}</div>
            <div className="text-xs text-gray-500">XP Total</div>
          </div>
          <div className="bg-white rounded-xl p-3 border border-gray-100 text-center">
            <Trophy className="w-5 h-5 text-amber-500 mx-auto mb-1" />
            <div className="font-bold text-gray-900">{profile?.rank || 'Iniciante'}</div>
            <div className="text-xs text-gray-500">Seu Rank</div>
          </div>
          <div className="bg-white rounded-xl p-3 border border-gray-100 text-center">
            <Salad className="w-5 h-5 text-green-500 mx-auto mb-1" />
            <div className="font-bold text-gray-900">{receitas.filter(r => isUnlocked(r)).length}</div>
            <div className="text-xs text-gray-500">Liberadas</div>
          </div>
        </div>

        {/* Lista de Receitas */}
        <h2 className="font-semibold text-gray-900 mb-4">Receitas Saudáveis</h2>
        <div className="space-y-3">
          {receitas.map((receita, idx) => {
            const unlocked = isUnlocked(receita);
            return (
              <motion.div
                key={receita.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <button
                  onClick={() => unlocked && setSelectedReceita(receita)}
                  disabled={!unlocked}
                  className={`w-full text-left bg-white rounded-2xl p-4 border transition-all ${
                    unlocked 
                      ? 'border-emerald-100 hover:border-emerald-300 hover:shadow-md cursor-pointer' 
                      : 'border-gray-200 opacity-60 cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-3xl ${unlocked ? 'bg-emerald-50' : 'bg-gray-100'}`}>
                      {unlocked ? receita.image : <Lock className="w-6 h-6 text-gray-400" />}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900">{receita.name}</div>
                      <div className="text-sm text-gray-500">{receita.desc}</div>
                      <div className="flex items-center gap-3 mt-2 text-xs">
                        <span className="flex items-center gap-1 text-gray-400">
                          <Clock className="w-3 h-3" /> {receita.time} min
                        </span>
                        <span className="flex items-center gap-1 text-yellow-500">
                          <Zap className="w-3 h-3" /> +{receita.xp} XP
                        </span>
                        <span className="flex items-center gap-1 text-red-400">
                          <Heart className="w-3 h-3" /> {receita.benefit}
                        </span>
                      </div>
                    </div>
                    {unlocked ? (
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    ) : (
                      <div className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-lg">
                        {receita.rank_required}
                      </div>
                    )}
                  </div>
                </button>
              </motion.div>
            );
          })}
        </div>

        {/* Modal de Receita */}
        <AnimatePresence>
          {selectedReceita && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 flex items-end justify-center z-50 p-4"
              onClick={() => setSelectedReceita(null)}
            >
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-t-3xl w-full max-w-lg max-h-[85vh] overflow-auto"
              >
                <div className="p-6">
                  <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-6" />
                  
                  <div className="text-center mb-6">
                    <div className="text-6xl mb-3">{selectedReceita.image}</div>
                    <h2 className="text-xl font-bold text-gray-900">{selectedReceita.name}</h2>
                    <div className="flex items-center justify-center gap-4 text-sm text-gray-500 mt-2">
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" /> {selectedReceita.time} min
                      </span>
                      <span className="flex items-center gap-1 text-yellow-500">
                        <Zap className="w-4 h-4" /> +{selectedReceita.xp} XP
                      </span>
                    </div>
                    <div className="inline-flex items-center gap-1 bg-red-50 text-red-600 px-3 py-1 rounded-full text-sm mt-2">
                      <Heart className="w-4 h-4" />
                      {selectedReceita.benefit}
                    </div>
                  </div>

                  <h3 className="font-semibold text-gray-900 mb-3">Ingredientes</h3>
                  <div className="bg-gray-50 rounded-xl p-4 mb-4">
                    <ul className="space-y-2">
                      {selectedReceita.ingredients.map((ing, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-sm text-gray-700">
                          <Check className="w-4 h-4 text-emerald-500" />
                          {ing}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <h3 className="font-semibold text-gray-900 mb-3">Modo de Preparo</h3>
                  <div className="space-y-3 mb-6">
                    {selectedReceita.steps.map((step, idx) => (
                      <div key={idx} className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                          {idx + 1}
                        </div>
                        <p className="text-sm text-gray-700">{step}</p>
                      </div>
                    ))}
                  </div>

                  <Button
                    onClick={() => completeReceita(selectedReceita)}
                    disabled={completing}
                    className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white py-6 rounded-xl text-lg font-semibold"
                  >
                    {completing ? (
                      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} className="w-6 h-6 border-2 border-white border-t-transparent rounded-full" />
                    ) : (
                      <>
                        <Check className="w-5 h-5 mr-2" />
                        Preparei esta receita (+{selectedReceita.xp} XP)
                      </>
                    )}
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}