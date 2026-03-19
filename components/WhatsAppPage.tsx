import React, { useState, useEffect } from 'react';
import { WhatsAppConnection } from './WhatsAppConnection';
import { API_BASE } from '../services/api';
import { ArrowLeft, Play, Square, Loader2 } from 'lucide-react';

interface WhatsAppPageProps {
    onBack: () => void;
}

const WhatsAppPage: React.FC<WhatsAppPageProps> = ({ onBack }) => {
    const [loading, setLoading] = useState(false);
    const [statusMsg, setStatusMsg] = useState<string | null>(null);
    const [agentRunning, setAgentRunning] = useState(false);

    // Poll agent status to know if it's running
    useEffect(() => {
        const check = async () => {
            try {
                const res = await fetch(`${API_BASE}/agent/status`);
                const data = await res.json();
                setAgentRunning(data.status === 'CONNECTED' || data.status === 'WAITING_QR');
            } catch {
                setAgentRunning(false);
            }
        };
        check();
        const interval = setInterval(check, 3000);
        return () => clearInterval(interval);
    }, []);

    const handleConnect = async () => {
        setLoading(true);
        setStatusMsg(null);
        try {
            const res = await fetch(`${API_BASE}/agent/start`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await res.json();
            if (!data.success) {
                setStatusMsg(data.message || 'Erro ao iniciar o agente na nuvem.');
            }
        } catch (err: any) {
            setStatusMsg(`Erro de Conexão: ${err.message || 'Servidor inacessível'}. URL Tentada: ${API_BASE}`);
        } finally {
            setLoading(false);
        }
    };

    const handleDisconnect = async () => {
        setLoading(true);
        setStatusMsg(null);
        try {
            const res = await fetch(`${API_BASE}/agent/stop`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await res.json();
            if (data.success) {
                setAgentRunning(false);
                setStatusMsg(null);
            } else {
                setStatusMsg(data.message || 'Erro ao parar o agente.');
            }
        } catch {
            setStatusMsg('Erro ao se comunicar com o servidor.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-300 bg-slate-800/80 hover:bg-slate-700 border border-slate-700/50 rounded-xl transition-all duration-200 hover:border-slate-600 group"
                    >
                        <ArrowLeft className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
                        Voltar para Dashboard
                    </button>
                    <div>
                        <h2 className="text-2xl font-bold text-white tracking-tight">Conexão WhatsApp</h2>
                        <p className="text-slate-400 text-sm mt-1">Gerencie a conexão do agente com o WhatsApp Web.</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {agentRunning && (
                        <button
                            onClick={handleDisconnect}
                            disabled={loading}
                            className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed
                                bg-gradient-to-r from-red-600 to-rose-500 hover:from-red-500 hover:to-rose-400 shadow-lg shadow-red-500/20 hover:shadow-red-500/40 hover:scale-[1.02] active:scale-[0.98]"
                        >
                            {loading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Square className="w-4 h-4" />
                            )}
                            Desconectar
                        </button>
                    )}
                    <button
                        onClick={handleConnect}
                        disabled={loading}
                        className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed
                            bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-500 hover:to-emerald-400 shadow-lg shadow-green-500/20 hover:shadow-green-500/40 hover:scale-[1.02] active:scale-[0.98]"
                    >
                        {loading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Play className="w-4 h-4" />
                        )}
                        {agentRunning ? 'Reconectar' : 'Conectar'}
                    </button>
                </div>
            </div>

            {statusMsg && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-300 flex items-center gap-2">
                    <span>⚠️</span> {statusMsg}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Connection Card */}
                <div className="p-6 bg-slate-900/50 border border-slate-800 rounded-2xl">
                    <WhatsAppConnection />
                </div>

                {/* Instructions Card */}
                <div className="p-6 bg-slate-900/50 border border-slate-800 rounded-2xl space-y-4">
                    <h3 className="text-lg font-semibold text-slate-200">Como Conectar</h3>
                    <ol className="list-decimal list-inside space-y-3 text-sm text-slate-400">
                        <li>Clique no botão <span className="text-green-400 font-semibold">"Conectar"</span> acima para iniciar.</li>
                        <li>Aguarde o status mudar para <span className="text-yellow-400 font-mono bg-yellow-400/10 px-1 rounded">WAITING_QR</span>.</li>
                        <li>Abra o WhatsApp no seu celular.</li>
                        <li>Vá em <strong>Menu</strong> (ou Configurações) &gt; <strong>Aparelhos Conectados</strong>.</li>
                        <li>Toque em <strong>Conectar um Aparelho</strong>.</li>
                        <li>Aponte a câmera para o QR Code exibido ao lado.</li>
                    </ol>
                    <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-xs text-blue-300">
                        <strong>Nota:</strong> Mantenha o terminal do agente aberto para manter a conexão ativa.
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WhatsAppPage;
