
import React, { useEffect, useState } from 'react';
import { ExternalLink, MessageSquareText, MoreHorizontal, RefreshCw } from 'lucide-react';
import { targetsApi, Target } from '../services/api';

const statusStyles: Record<string, string> = {
  'pending': 'bg-slate-800/50 text-slate-400 border-slate-700',
  'in_progress': 'bg-purple-500/10 text-purple-400 border-purple-500/20 shadow-[0_0_10px_rgba(168,85,247,0.05)]',
  'completed': 'bg-green-500/10 text-green-500 border-green-500/20 shadow-[0_0_10px_rgba(34,197,94,0.05)]',
  'failed': 'bg-red-500/10 text-red-500 border-red-500/20'
};

const statusLabels: Record<string, string> = {
  'pending': 'Aguardando',
  'in_progress': 'Em Conversa',
  'completed': 'Finalizado',
  'failed': 'Falha'
};

const AuditTable: React.FC = () => {
  const [targets, setTargets] = useState<Target[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTargets = async () => {
    setIsLoading(true);
    try {
      const data = await targetsApi.getAll();
      setTargets(data);
    } catch (error) {
      console.error('Error fetching targets:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTargets();
    // Poll for updates every 10 seconds
    const interval = setInterval(fetchTargets, 10000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (dateString: string | null) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Agora';
    if (diffMins < 60) return `Há ${diffMins} min`;
    if (diffMins < 1440) return `Há ${Math.floor(diffMins / 60)}h`;
    return date.toLocaleDateString('pt-BR');
  };

  return (
    <div className="overflow-hidden bg-slate-900/20 border border-slate-800 rounded-2xl">
      <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
        <h2 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
          <MessageSquareText className="w-4 h-4 text-purple-400" />
          Fila de Auditoria em Tempo Real
        </h2>
        <div className="flex gap-2 items-center">
          <button
            onClick={fetchTargets}
            className="p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
            title="Atualizar"
          >
            <RefreshCw className={`w-4 h-4 text-slate-400 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700 font-mono">
            {targets.length} TARGETS
          </span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-900/40">
              <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Profissional</th>
              <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Missão</th>
              <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Status</th>
              <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Última Interação</th>
              <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {targets.length === 0 && !isLoading ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                  Nenhum alvo cadastrado ainda. Crie uma missão e adicione alvos.
                </td>
              </tr>
            ) : (
              targets.map((target) => (
                <tr key={target.id} className="hover:bg-slate-800/20 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-400 group-hover:border-purple-500/50 group-hover:text-purple-400 transition-colors">
                        {target.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-200">{target.name}</p>
                        <p className="text-[10px] text-slate-500 font-mono">{target.phone}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs text-slate-400">{target.mission?.title || '-'}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider ${statusStyles[target.auditStatus] || statusStyles.pending}`}>
                      <span className={`w-1 h-1 rounded-full mr-1.5 ${target.auditStatus === 'in_progress' ? 'bg-purple-400 animate-pulse' :
                          target.auditStatus === 'completed' ? 'bg-green-500' :
                            target.auditStatus === 'failed' ? 'bg-red-500' : 'bg-slate-400'
                        }`} />
                      {statusLabels[target.auditStatus] || target.auditStatus}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs font-medium text-slate-400">
                    {formatTime(target.lastInteraction)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-purple-600 hover:text-white text-slate-300 rounded-lg text-xs font-bold transition-all border border-slate-700/50">
                      <ExternalLink className="w-3 h-3" />
                      Ver Chat
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {targets.length > 0 && (
        <div className="px-6 py-4 bg-slate-900/40 border-t border-slate-800 flex justify-center">
          <button className="text-[10px] font-bold text-slate-500 hover:text-purple-400 uppercase tracking-widest transition-colors flex items-center gap-2">
            Carregar Mais
            <MoreHorizontal className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
};

export default AuditTable;
