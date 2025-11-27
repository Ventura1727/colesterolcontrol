import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, Star, Zap, ChevronRight } from 'lucide-react';

const ranks = [
  { name: 'Iniciante', min: 0, max: 100, color: 'from-gray-400 to-gray-500', icon: '🌱' },
  { name: 'Bronze', min: 100, max: 300, color: 'from-amber-600 to-amber-700', icon: '🥉' },
  { name: 'Prata', min: 300, max: 600, color: 'from-gray-300 to-gray-400', icon: '🥈' },
  { name: 'Ouro', min: 600, max: 1000, color: 'from-yellow-400 to-yellow-500', icon: '🥇' },
  { name: 'Diamante', min: 1000, max: 1500, color: 'from-cyan-400 to-blue-500', icon: '💎' },
  { name: 'Mestre', min: 1500, max: 9999, color: 'from-purple-500 to-pink-500', icon: '👑' }
];

export default function RankCard({ profile, onViewProgress }) {
  const xp = profile?.xp_total || 0;
  const currentRank = ranks.find(r => xp >= r.min && xp < r.max) || ranks[0];
  const nextRank = ranks[ranks.indexOf(currentRank) + 1];
  const progress = nextRank 
    ? ((xp - currentRank.min) / (nextRank.min - currentRank.min)) * 100
    : 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-5 text-white mb-6"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${currentRank.color} flex items-center justify-center text-2xl shadow-lg`}>
            {currentRank.icon}
          </div>
          <div>
            <div className="text-sm text-gray-400">Seu Rank</div>
            <div className="font-bold text-xl">{currentRank.name}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1 text-yellow-400">
            <Zap className="w-4 h-4" />
            <span className="font-bold">{xp} XP</span>
          </div>
          <div className="text-xs text-gray-400">
            {profile?.metas_concluidas || 0} metas
          </div>
        </div>
      </div>

      {nextRank && (
        <div className="mb-4">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-400">Próximo: {nextRank.name}</span>
            <span className="text-gray-400">{nextRank.min - xp} XP restantes</span>
          </div>
          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className={`h-full bg-gradient-to-r ${nextRank.color} rounded-full`}
            />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between pt-3 border-t border-gray-700">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-orange-400">
            <Star className="w-4 h-4" fill="currentColor" />
            <span className="text-sm font-medium">{profile?.dias_consecutivos || 0} dias seguidos</span>
          </div>
        </div>
        <button 
          onClick={onViewProgress}
          className="flex items-center gap-1 text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
        >
          Ver progresso
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}