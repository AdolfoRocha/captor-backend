import React, { useEffect, useRef, useState } from 'react';
import { Terminal as TerminalIcon, Minus, ChevronUp, ChevronRight, Activity } from 'lucide-react';
import { agentApi } from '../services/api';

interface LogEntry {
  id: string;
  timestamp: string;
  message: string;
  type: string;
}

const Terminal: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isMinimized, setIsMinimized] = useState(false);
  const [currentAction, setCurrentAction] = useState<string>('Iniciando...');
  const [agentStatus, setAgentStatus] = useState<string>('DISCONNECTED');
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastTimestampRef = useRef<string | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  // Fetch status and current action
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const status = await agentApi.getStatus();
        setAgentStatus(status.status);
        setCurrentAction(status.currentAction || 'Aguardando...');
      } catch (error) {
        setAgentStatus('DISCONNECTED');
        setCurrentAction('Agente desconectado');
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  // Fetch logs
  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const newLogs = await agentApi.getLogs(lastTimestampRef.current || undefined);

        if (newLogs.length > 0) {
          const formattedLogs = newLogs.map(log => ({
            id: `${log.timestamp}-${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date(log.timestamp).toLocaleTimeString('pt-BR', { hour12: false }),
            message: log.message,
            type: log.type
          }));

          setLogs(prev => [...prev, ...formattedLogs].slice(-50));
          lastTimestampRef.current = newLogs[newLogs.length - 1].timestamp;
        }
      } catch (error) {
        // Silent fail
      }
    };

    fetchLogs();
    const interval = setInterval(fetchLogs, 2000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = () => {
    switch (agentStatus) {
      case 'CONNECTED': return 'bg-green-500';
      case 'WAITING_QR': return 'bg-amber-500';
      default: return 'bg-red-500';
    }
  };

  if (isMinimized) {
    return (
      <div
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-6 right-6 bg-[#020617]/90 border border-slate-800 rounded-lg shadow-xl cursor-pointer hover:bg-slate-900 transition-all z-[100] flex items-center gap-3 px-4 py-3 group"
      >
        <div className="relative">
          <TerminalIcon className="w-4 h-4 text-green-500" />
          <span className={`absolute -top-1 -right-1 w-2 h-2 ${getStatusColor()} rounded-full animate-pulse`} />
        </div>
        <span className="text-xs font-bold text-slate-300 font-mono">CONSOLE</span>
        <ChevronUp className="w-3.5 h-3.5 text-slate-500 group-hover:text-white" />
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-80 md:w-[420px] bg-[#020617]/95 border border-slate-800 rounded-xl shadow-2xl overflow-hidden z-[100] group flex flex-col shadow-purple-900/10 backdrop-blur-md transition-all">
      {/* Header */}
      <div className="px-4 py-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between cursor-pointer" onClick={() => setIsMinimized(true)}>
        <div className="flex items-center gap-2">
          <div className="relative">
            <TerminalIcon className="w-3.5 h-3.5 text-green-500" />
            <span className={`absolute -top-0.5 -right-0.5 w-1.5 h-1.5 ${getStatusColor()} rounded-full animate-pulse`} />
          </div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Agent Console</span>
        </div>
        <div className="flex gap-2">
          <span className={`text-[9px] px-2 py-0.5 rounded font-bold ${agentStatus === 'CONNECTED' ? 'bg-green-500/20 text-green-400' :
            agentStatus === 'WAITING_QR' ? 'bg-amber-500/20 text-amber-400' :
              'bg-red-500/20 text-red-400'
            }`}>
            {agentStatus}
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); setIsMinimized(true); }}
            className="hover:bg-slate-800 p-1 rounded"
          >
            <Minus className="w-3 h-3 text-slate-400 hover:text-white" />
          </button>
        </div>
      </div>

      {/* Current Action Bar */}
      <div className="px-3 py-2 bg-slate-800/50 border-b border-slate-700/50 flex items-center gap-2">
        <Activity className="w-3 h-3 text-purple-400 animate-pulse" />
        <span className="text-[11px] text-slate-300 truncate">{currentAction}</span>
      </div>

      {/* Log area */}
      <div
        ref={scrollRef}
        className="h-52 overflow-y-auto p-3 font-mono text-[10px] leading-relaxed space-y-1.5 bg-black/40"
      >
        {logs.length === 0 && (
          <div className="text-slate-500 text-center py-8">
            <Activity className="w-6 h-6 mx-auto mb-2 animate-pulse" />
            <p>Aguardando logs do agente...</p>
          </div>
        )}
        {logs.map((log) => (
          <div key={log.id} className="flex gap-2">
            <span className="text-slate-600 shrink-0">[{log.timestamp}]</span>
            <span className={`break-words ${log.type === 'success' ? 'text-green-400' :
              log.type === 'error' ? 'text-red-400' :
                log.type === 'warning' ? 'text-amber-400' :
                  log.type === 'work' ? 'text-purple-400' :
                    'text-slate-300'
              }`}>
              {log.message}
            </span>
          </div>
        ))}
        <div className="flex items-center gap-1 text-green-500">
          <ChevronRight className="w-3 h-3" />
          <span className="w-1.5 h-3 bg-green-500/50 animate-pulse" />
        </div>
      </div>

      {/* Footer bar */}
      <div className="px-3 py-1.5 bg-slate-900/50 border-t border-slate-800 flex items-center justify-between">
        <span className="text-[9px] text-slate-500">{logs.length} logs</span>
        <span className="text-[9px] text-purple-400 font-bold uppercase">Captor Agent</span>
      </div>
    </div>
  );
};

export default Terminal;
