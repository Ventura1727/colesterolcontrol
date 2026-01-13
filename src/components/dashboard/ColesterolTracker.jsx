import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Heart, TrendingDown, TrendingUp, Plus, Target, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

export default function ColesterolTracker({ records, onRecordAdded }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState({
    ldl: '',
    hdl: '',
    total: '',
    triglicerides: '',
    data_exame: new Date().toISOString().split('T')[0]
  });

  const latestRecord = records?.[0];
  const previousRecord = records?.[1];

  const getMeta = () => {
    if (!latestRecord?.ldl) return null;
    const ldl = latestRecord.ldl;
    if (ldl > 160) return { target: ldl - 30, desc: 'Reduzir 30 pontos em 90 dias', urgency: 'high' };
    if (ldl > 130) return { target: ldl - 20, desc: 'Reduzir 20 pontos em 60 dias', urgency: 'medium' };
    if (ldl > 100) return { target: ldl - 10, desc: 'Reduzir 10 pontos em 45 dias', urgency: 'low' };
    return { target: ldl, desc: 'Manter níveis saudáveis', urgency: 'success' };
  };

  const meta = getMeta();

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const payload = {
        data_exame: form.data_exame
      };
      if (form.ldl) payload.ldl = parseFloat(form.ldl);
      if (form.hdl) payload.hdl = parseFloat(form.hdl);
      if (form.total) payload.total = parseFloat(form.total);
      if (form.triglicerides) payload.triglicerides = parseFloat(form.triglicerides);

      await fetch('/api/colesterol-record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      setIsOpen(false);
    } catch (error) {
      console.error("Erro ao salvar exame:", error);
      alert(`Erro ao salvar exame: ${error.message || JSON.stringify(error)}`);
    }
    setForm({ ldl: '', hdl: '', total: '', triglicerides: '', data_exame: new Date().toISOString().split('T')[0] });
    setIsLoading(false);
    onRecordAdded?.();
  };

  const getChange = (current, previous) => {
    if (!current || !previous) return null;
    return current - previous;
  };

  const urgencyColors = {
    high: 'text-red-500 bg-red-50 border-red-200',
    medium: 'text-amber-500 bg-amber-50 border-amber-200',
    low: 'text-emerald-500 bg-emerald-50 border-emerald-200',
    success: 'text-green-500 bg-green-50 border-green-200'
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm mb-6"
    >
      {/* ...restante do componente permanece igual... */}
    </motion.div>
  );
}
