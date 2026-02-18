import React, { useEffect, useState } from 'react';
import { Loader2, MonitorSmartphone, Smartphone, CheckCircle, RefreshCw } from 'lucide-react';

interface AgentStatus {
    status: 'DISCONNECTED' | 'WAITING_QR' | 'CONNECTED';
    qrCode: string | null;
    lastUpdate: string;
}

export const WhatsAppConnection: React.FC = () => {
    const [status, setStatus] = useState<AgentStatus | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchStatus = async () => {
        try {
            const res = await fetch('http://localhost:3001/api/agent/status');
            const data = await res.json();
            setStatus(data);
        } catch (error) {
            console.error('Failed to fetch agent status', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStatus();
        const interval = setInterval(fetchStatus, 2000);
        return () => clearInterval(interval);
    }, []);

    if (loading && !status) return <div className="p-4"><Loader2 className="w-5 h-5 animate-spin" /></div>;

    return (
        <div className="bg-slate-900 border border-slate-700/50 rounded-xl p-4 w-full">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-green-400" />
                    WhatsApp
                </h3>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider
                    ${status?.status === 'CONNECTED' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                        status?.status === 'WAITING_QR' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
                            'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                    {status?.status?.replace('_', ' ')}
                </span>
            </div>

            {status?.status === 'WAITING_QR' && (
                <div className="flex flex-col items-center justify-center space-y-3 bg-white p-4 rounded-lg min-h-[250px]">
                    {status.qrCode ? (
                        <>
                            <img
                                src={`data:image/png;base64,${status.qrCode}`}
                                alt="WhatsApp QR Code"
                                className="w-48 h-48 object-contain transition-opacity duration-300"
                            />
                            <p className="text-xs text-slate-500 font-medium text-center">Scan with WhatsApp (Linked Devices)</p>
                        </>
                    ) : (
                        <div className="flex flex-col items-center gap-3 py-8">
                            <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
                            <p className="text-xs text-slate-500 font-medium">Loading QR Code...</p>
                        </div>
                    )}
                </div>
            )}

            {status?.status === 'CONNECTED' && (
                <div className="flex flex-col items-center justify-center py-6 text-green-400 space-y-2">
                    <CheckCircle className="w-12 h-12 opacity-80" />
                    <p className="text-sm font-medium">Agent is Online</p>
                </div>
            )}

            {status?.status === 'DISCONNECTED' && (
                <div className="flex flex-col items-center justify-center py-6 text-slate-500 space-y-2">
                    <MonitorSmartphone className="w-12 h-12 opacity-50" />
                    <p className="text-xs text-center px-4">Agent is offline. Start the python agent to connect.</p>
                </div>
            )}

            <div className="mt-4 pt-4 border-t border-slate-800 flex justify-end">
                <button onClick={() => fetchStatus()} className="p-1 hover:bg-slate-800 rounded transition-colors">
                    <RefreshCw className="w-3 h-3 text-slate-500" />
                </button>
            </div>
        </div>
    );
};
