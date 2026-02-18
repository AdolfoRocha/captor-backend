import React from 'react';
import { WhatsAppConnection } from './WhatsAppConnection';

const WhatsAppPage: React.FC = () => {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white tracking-tight">Conexão WhatsApp</h2>
                    <p className="text-slate-400 text-sm mt-1">Gerencie a conexão do agente com o WhatsApp Web.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Connection Card */}
                <div className="p-6 bg-slate-900/50 border border-slate-800 rounded-2xl">
                    <WhatsAppConnection />
                </div>

                {/* Instructions Card */}
                <div className="p-6 bg-slate-900/50 border border-slate-800 rounded-2xl space-y-4">
                    <h3 className="text-lg font-semibold text-slate-200">Como Conectar</h3>
                    <ol className="list-decimal list-inside space-y-3 text-sm text-slate-400">
                        <li>Certifique-se que o Agente Python está rodando no terminal.</li>
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
