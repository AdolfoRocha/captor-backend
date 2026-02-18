
import React, { useState } from 'react';
import { Play, Sparkles, AlertCircle, Check, Loader2, Plus } from 'lucide-react';
import { missionsApi } from '../services/api';
import { WhatsAppConnection } from './WhatsAppConnection';

const MissionControl: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [targetLimit, setTargetLimit] = useState('50');
  const [title, setTitle] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleCreateMission = async () => {
    if (!title.trim() || !prompt.trim()) {
      alert('Preencha o título e o prompt da missão');
      return;
    }

    setIsLoading(true);
    try {
      await missionsApi.create({
        title: title.trim(),
        promptInstruction: prompt.trim(),
        targetLimit: targetLimit ? parseInt(targetLimit) : undefined,
      });
      setSuccess(true);
      setTitle('');
      setPrompt('');
      setTargetLimit('50');
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error('Error creating mission:', error);
      alert('Erro ao criar missão');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 rounded-2xl glass-panel relative overflow-hidden group">
      {/* Background glow effect */}
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-purple-600/10 blur-[80px] rounded-full group-hover:bg-purple-600/15 transition-all duration-700" />

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-green-500/10 text-green-500">
            <Sparkles className="w-5 h-5" />
          </div>
          <h2 className="text-lg font-bold text-white tracking-tight">Configuração da Missão</h2>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-slate-900/50 border border-slate-800 rounded-full">
          <div className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse shadow-[0_0_8px_rgba(168,85,247,0.8)]" />
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">IA Agent v2.4</span>
        </div>
      </div>

      <div className="space-y-6">
        {/* Title Input Field */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest px-1">
            Nome da Missão
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: Campanha de Outono - Clínicas SP"
            className="w-full bg-slate-950/50 border border-slate-800 rounded-xl py-3.5 px-4 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/50 transition-all font-medium"
          />
        </div>

        {/* Prompt Textarea */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest px-1">
            Prompt da Missão / Script de Abordagem
          </label>
          <div className="relative group/textarea">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ex: Olá! Somos a [empresa]. Temos uma proposta especial para sua clínica... O objetivo desta missão é agendar uma reunião."
              className="w-full h-40 bg-slate-950/50 border border-slate-800 rounded-xl p-4 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/50 transition-all resize-none font-medium leading-relaxed"
            />
            <div className="absolute bottom-3 right-3 flex items-center gap-1.5 px-2 py-1 bg-slate-900/80 rounded-md border border-slate-700/50">
              <div className="w-1 h-1 rounded-full bg-green-500 shadow-[0_0_4px_rgba(34,197,94,0.8)]" />
              <span className="text-xs text-slate-400 font-mono uppercase">IA Ready</span>
            </div>
          </div>
        </div>

        {/* Limit Field */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest px-1">
              Limite de Disparos
            </label>
            <input
              type="number"
              min="1"
              max="1000"
              value={targetLimit}
              onChange={(e) => setTargetLimit(e.target.value)}
              placeholder="50"
              className="w-full bg-slate-950/50 border border-slate-800 rounded-xl py-3.5 px-4 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/50 transition-all font-medium text-center"
            />
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between p-4 bg-slate-900/30 border border-slate-800 rounded-xl">
          <div className="flex items-center gap-3 text-slate-400">
            <AlertCircle className="w-5 h-5 text-purple-500" />
            <p className="text-xs leading-tight">
              A missão será criada vazia. Você poderá importar leads da Captação ou adicionar alvos manualmente na próxima tela.
            </p>
          </div>

          <button
            onClick={handleCreateMission}
            disabled={isLoading || !title.trim() || !prompt.trim()}
            className="w-full md:w-auto group relative flex items-center justify-center gap-3 px-8 py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:shadow-purple-500/30 text-white rounded-xl font-bold text-sm tracking-wide shadow-lg shadow-purple-900/20 hover:scale-[1.02] active:scale-[0.98] transition-all overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : success ? (
              <Check className="w-4 h-4" />
            ) : (
              <Plus className="w-4 h-4 fill-white" />
            )}
            {isLoading ? 'CRIANDO...' : success ? 'CRIADA!' : 'CRIAR MISSÃO'}
          </button>
        </div>
      </div>


      <div className="mt-6 border-t border-slate-800/50 pt-6">
        <WhatsAppConnection />
      </div>
    </div >
  );
};

export default MissionControl;
