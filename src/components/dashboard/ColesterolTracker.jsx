import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Heart, TrendingDown, TrendingUp, Plus, Target, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { base44 } from '@/api/base44Client';

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

      await base44.entities.ColesterolRecord.create(payload);
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
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Heart className="w-5 h-5 text-red-500" />
          <h3 className="font-semibold text-gray-900">Acompanhamento de Colesterol</h3>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-red-500 hover:bg-red-600 text-white">
              <Plus className="w-4 h-4 mr-1" />
              Registrar
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Registrar Exame de Colesterol</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <label className="text-sm font-medium text-gray-700">LDL (Ruim)</label>
                <Input 
                  type="number" 
                  placeholder="Ex: 130" 
                  value={form.ldl}
                  onChange={(e) => setForm({...form, ldl: e.target.value})}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">HDL (Bom)</label>
                <Input 
                  type="number" 
                  placeholder="Ex: 55" 
                  value={form.hdl}
                  onChange={(e) => setForm({...form, hdl: e.target.value})}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Total</label>
                <Input 
                  type="number" 
                  placeholder="Ex: 200" 
                  value={form.total}
                  onChange={(e) => setForm({...form, total: e.target.value})}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Triglicerídeos</label>
                <Input 
                  type="number" 
                  placeholder="Ex: 150" 
                  value={form.triglicerides}
                  onChange={(e) => setForm({...form, triglicerides: e.target.value})}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Data do Exame</label>
                <Input 
                  type="date" 
                  value={form.data_exame}
                  onChange={(e) => setForm({...form, data_exame: e.target.value})}
                />
              </div>
              <Button 
                className="w-full bg-red-500 hover:bg-red-600" 
                onClick={handleSubmit}
                disabled={isLoading}
              >
                {isLoading ? 'Salvando...' : 'Salvar Registro'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {latestRecord ? (
        <>
          <div className="grid grid-cols-2 gap-3 mb-4">
            {[
              { label: 'LDL (Ruim)', value: latestRecord.ldl, prev: previousRecord?.ldl, ideal: '< 100', bad: true },
              { label: 'HDL (Bom)', value: latestRecord.hdl, prev: previousRecord?.hdl, ideal: '> 60', bad: false },
              { label: 'Total', value: latestRecord.total, prev: previousRecord?.total, ideal: '< 200', bad: true },
              { label: 'Triglicerídeos', value: latestRecord.triglicerides, prev: previousRecord?.triglicerides, ideal: '< 150', bad: true }
            ].map((item, idx) => {
              const change = getChange(item.value, item.prev);
              return (
                <div key={idx} className="bg-gray-50 rounded-xl p-3">
                  <div className="text-xs text-gray-500 mb-1">{item.label}</div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-lg text-gray-900">
                      {item.value || '--'}
                    </span>
                    {change !== null && (
                      <span className={`flex items-center text-xs font-medium ${
                        (item.bad ? change < 0 : change > 0) ? 'text-emerald-500' : 'text-red-500'
                      }`}>
                        {(item.bad ? change < 0 : change > 0) ? (
                          <TrendingDown className="w-3 h-3 mr-0.5" />
                        ) : (
                          <TrendingUp className="w-3 h-3 mr-0.5" />
                        )}
                        {Math.abs(change)}
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-gray-400">Ideal: {item.ideal}</div>
                </div>
              );
            })}
          </div>

          {meta && (
            <div className={`rounded-xl p-4 border ${urgencyColors[meta.urgency]}`}>
              <div className="flex items-center gap-2 mb-1">
                <Target className="w-4 h-4" />
                <span className="font-semibold text-sm">Sua Meta</span>
              </div>
              <p className="text-sm">{meta.desc}</p>
              <p className="text-xs mt-1 opacity-75">LDL alvo: {meta.target} mg/dL</p>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-6">
          <AlertCircle className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-500 text-sm">Nenhum exame registrado ainda</p>
          <p className="text-gray-400 text-xs">Adicione seu primeiro exame para começar o acompanhamento</p>
        </div>
      )}
    </motion.div>
  );
}