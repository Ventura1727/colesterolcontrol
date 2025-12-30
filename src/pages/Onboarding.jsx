import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, ArrowRight, Sparkles, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';

const questions = [
  {
    id: 'idade',
    question: 'Qual é a sua idade?',
    type: 'number',
    placeholder: 'Digite sua idade'
  },
  {
    id: 'alimentacao',
    question: 'Como está sua alimentação hoje?',
    type: 'choice',
    options: ['Boa', 'Média', 'Ruim']
  },
  {
    id: 'exercicios',
    question: 'Você faz exercícios regularmente?',
    type: 'choice',
    options: ['Sim', 'Não']
  },
  {
    id: 'objetivo',
    question: 'Qual seu objetivo principal?',
    type: 'choice',
    options: ['Reduzir colesterol', 'Melhorar hábitos', 'Perder peso']
  }
];

export default function Onboarding() {
  const [step, setStep] = useState(0); // 0 = welcome, 1-4 = questions
  const [answers, setAnswers] = useState({});
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleStart = () => {
    setStep(1);
  };

  const handleAnswer = async (value) => {
    const currentQuestion = questions[step - 1];
    const newAnswers = { ...answers, [currentQuestion.id]: value };
    setAnswers(newAnswers);
    setInputValue('');

    if (step < questions.length) {
      setStep(step + 1);
    } else {
      // Quiz completo - salvar localmente e redirecionar para o Dashboard
      setIsLoading(true);
      localStorage.setItem('heartbalance_quiz', JSON.stringify({
        ...newAnswers,
        quiz_completo: true
      }));
      window.location.href = createPageUrl('Dashboard');
    }
  };

  const handleNumberSubmit = () => {
    if (inputValue && parseInt(inputValue) > 0) {
      handleAnswer(parseInt(inputValue));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-rose-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center"
            >
              {/* Logo */}
              <motion.div 
                className="w-20 h-20 bg-gradient-to-br from-red-500 to-rose-600 rounded-3xl mx-auto mb-8 flex items-center justify-center shadow-lg shadow-red-200"
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ repeat: Infinity, duration: 3 }}
              >
                <Heart className="w-10 h-10 text-white" fill="white" />
              </motion.div>

              <h1 className="text-3xl font-bold text-gray-900 mb-3">
                Bem-vindo ao <span className="text-red-600">HeartBalance</span>
              </h1>
              
              <p className="text-gray-600 mb-8 leading-relaxed">
                Seu parceiro para uma vida com mais equilíbrio e saúde cardiovascular. 
                Vamos começar entendendo melhor você?
              </p>

              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 mb-8 border border-red-100">
                <div className="flex items-center gap-3 mb-4">
                  <Sparkles className="w-5 h-5 text-red-500" />
                  <span className="font-medium text-gray-800">Mini-Quiz Rápido</span>
                </div>
                <p className="text-sm text-gray-600">
                  4 perguntas simples para criar seu diagnóstico personalizado
                </p>
              </div>

              <Button
                onClick={handleStart}
                className="w-full bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white py-6 rounded-2xl text-lg font-medium shadow-lg shadow-red-200 transition-all"
              >
                Iniciar Quiz
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </motion.div>
          )}

          {step > 0 && step <= questions.length && (
            <motion.div
              key={`question-${step}`}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="bg-white rounded-3xl p-8 shadow-xl shadow-gray-100/50 border border-gray-100"
            >
              {/* Progress */}
              <div className="flex gap-2 mb-8">
                {questions.map((_, idx) => (
                  <div
                    key={idx}
                    className={`h-1.5 flex-1 rounded-full transition-all ${
                      idx < step ? 'bg-red-500' : 'bg-gray-200'
                    }`}
                  />
                ))}
              </div>

              <div className="text-sm text-red-600 font-medium mb-2">
                Pergunta {step} de {questions.length}
              </div>

              <h2 className="text-2xl font-bold text-gray-900 mb-8">
                {questions[step - 1].question}
              </h2>

              {questions[step - 1].type === 'number' ? (
                <div className="space-y-4">
                  <Input
                    type="number"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder={questions[step - 1].placeholder}
                    className="w-full py-6 text-lg rounded-xl border-gray-200 focus:border-red-500 focus:ring-red-500"
                    onKeyPress={(e) => e.key === 'Enter' && handleNumberSubmit()}
                  />
                  <Button
                    onClick={handleNumberSubmit}
                    disabled={!inputValue || parseInt(inputValue) <= 0}
                    className="w-full bg-red-500 hover:bg-red-600 text-white py-6 rounded-xl text-lg"
                  >
                    Continuar
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {questions[step - 1].options.map((option) => (
                    <button
                      key={option}
                      onClick={() => handleAnswer(option)}
                      disabled={isLoading}
                      className="w-full p-5 text-left rounded-xl border-2 border-gray-100 hover:border-red-500 hover:bg-red-50 transition-all flex items-center justify-between group"
                    >
                      <span className="text-lg text-gray-800 font-medium">{option}</span>
                      <div className="w-8 h-8 rounded-full border-2 border-gray-200 group-hover:border-red-500 group-hover:bg-red-500 flex items-center justify-center transition-all">
                        <Check className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {isLoading && (
                <div className="mt-6 text-center">
                  <div className="inline-flex items-center gap-2 text-red-600">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                      className="w-5 h-5 border-2 border-red-600 border-t-transparent rounded-full"
                    />
                    <span>Gerando seu diagnóstico...</span>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}