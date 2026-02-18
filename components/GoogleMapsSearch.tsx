
import React, { useState, useEffect } from 'react';
import {
    MapPin,
    Search,
    Loader2,
    X,
    Phone,
    Star,
    Building2,
    Globe2,
    CheckCircle2,
    XCircle,
    Zap
} from 'lucide-react';
import { gmapsApi, targetsApi } from '../services/api';

interface GoogleMapsSearchProps {
    missionId?: string;
    onLeadsImported?: () => void;
}

const GoogleMapsSearch: React.FC<GoogleMapsSearchProps> = ({ missionId, onLeadsImported }) => {
    const [query, setQuery] = useState('');
    const [location, setLocation] = useState('');
    const [maxResults, setMaxResults] = useState('20');
    const [isSearching, setIsSearching] = useState(false);
    const [jobId, setJobId] = useState<string | null>(null);
    const [output, setOutput] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);

    // Start Google Maps search
    const handleStartSearch = async () => {
        if (!query.trim() || !location.trim()) {
            alert('Preencha o nicho e a localização');
            return;
        }

        setIsSearching(true);
        setError(null);
        setOutput([]);

        try {
            const result = await gmapsApi.search({
                missionId,
                query: query.trim(),
                location: location.trim(),
                maxResults: parseInt(maxResults) || 20
            });

            if (result.jobId) {
                setJobId(result.jobId);
                setOutput([
                    `🗺️ Busca iniciada no Google Maps`,
                    `🔍 Nicho: ${result.query}`,
                    `📍 Local: ${result.location}`,
                    `🎯 Máximo: ${result.maxResults} resultados`,
                ]);
            } else {
                setError(result.message || 'Erro ao iniciar busca');
                setIsSearching(false);
            }
        } catch (err) {
            console.error('Error starting Google Maps search:', err);
            setError('Falha ao iniciar busca no Google Maps');
            setIsSearching(false);
        }
    };

    // Stop search
    const handleStopSearch = async () => {
        try {
            const result = await gmapsApi.stop({ missionId });
            setIsSearching(false);
            setJobId(null);
            setOutput(prev => [...prev, '⛔ ' + result.message]);
            if (onLeadsImported) onLeadsImported();
        } catch (err) {
            console.error('Error stopping search:', err);
        }
    };

    // Poll search status
    useEffect(() => {
        if (!jobId || !isSearching) return;

        const pollStatus = async () => {
            try {
                const status = await gmapsApi.getStatus(jobId);
                setOutput(status.output);

                if (status.status === 'completed') {
                    setIsSearching(false);
                    setJobId(null);
                    if (onLeadsImported) onLeadsImported();
                } else if (status.status === 'failed') {
                    setIsSearching(false);
                    setJobId(null);
                    setError(status.error || 'Busca falhou');
                }
            } catch (err) {
                console.error('Error polling search status:', err);
            }
        };

        const interval = setInterval(pollStatus, 2500);
        return () => clearInterval(interval);
    }, [jobId, isSearching]);

    return (
        <div className="p-6 rounded-2xl glass-panel relative overflow-hidden">
            {/* Background glow */}
            <div className="absolute -top-20 -left-20 w-48 h-48 bg-blue-600/10 blur-[60px] rounded-full" />

            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500">
                        <MapPin className="w-5 h-5" />
                    </div>
                    <h2 className="text-sm font-bold text-white uppercase tracking-widest">
                        Busca Google Maps
                    </h2>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 bg-slate-900/50 border border-slate-800 rounded-full">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Lead Capture</span>
                </div>
            </div>

            {/* Search Form */}
            <div className="space-y-4 mb-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Niche Input */}
                    <div className="space-y-2">
                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest px-1">
                            Nicho / Segmento
                        </label>
                        <div className="relative flex items-center group/input">
                            <div className="absolute left-4 text-slate-500 group-focus-within/input:text-blue-400 transition-colors">
                                <Building2 className="w-4 h-4" />
                            </div>
                            <input
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Ex: Academias, Pizzarias, Clínicas..."
                                disabled={isSearching}
                                className="w-full bg-slate-950/50 border border-slate-800 rounded-xl py-3 pl-11 pr-4 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all font-medium disabled:opacity-50"
                            />
                        </div>
                    </div>

                    {/* Location Input */}
                    <div className="space-y-2">
                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest px-1">
                            Localização / Cidade
                        </label>
                        <div className="relative flex items-center group/input">
                            <div className="absolute left-4 text-slate-500 group-focus-within/input:text-blue-400 transition-colors">
                                <MapPin className="w-4 h-4" />
                            </div>
                            <input
                                type="text"
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                                placeholder="Ex: São Paulo, SP | Fortaleza, Centro"
                                disabled={isSearching}
                                className="w-full bg-slate-950/50 border border-slate-800 rounded-xl py-3 pl-11 pr-4 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all font-medium disabled:opacity-50"
                            />
                        </div>
                    </div>
                </div>

                {/* Max results + Search button row */}
                <div className="flex items-end gap-4">
                    <div className="space-y-2 w-32">
                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest px-1">
                            Máx. Leads
                        </label>
                        <input
                            type="number"
                            min="5"
                            max="100"
                            value={maxResults}
                            onChange={(e) => setMaxResults(e.target.value)}
                            disabled={isSearching}
                            className="w-full bg-slate-950/50 border border-slate-800 rounded-xl py-3 px-4 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all font-medium text-center disabled:opacity-50"
                        />
                    </div>

                    <div className="flex-1 flex justify-end gap-3">
                        {isSearching ? (
                            <button
                                onClick={handleStopSearch}
                                className="flex items-center gap-2 px-5 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold text-sm transition-all"
                            >
                                <X className="w-4 h-4" />
                                Parar Busca
                            </button>
                        ) : (
                            <button
                                onClick={handleStartSearch}
                                disabled={!query.trim() || !location.trim()}
                                className="group relative flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-bold text-sm tracking-wide shadow-lg shadow-blue-900/20 hover:shadow-blue-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                            >
                                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                                <Search className="w-4 h-4" />
                                Buscar no Google Maps
                            </button>
                        )}
                    </div>
                </div>

                {/* Info text */}
                <p className="text-[10px] text-slate-500 italic px-1 flex items-center gap-1.5">
                    <Zap className="w-3 h-3" />
                    O robô irá buscar empresas no Google Maps, extrair telefones e verificar se possuem WhatsApp ativo. Somente leads com WhatsApp válido serão importados.
                </p>
            </div>

            {/* Search Output */}
            {(isSearching || output.length > 0 || error) && (
                <div className="mt-4 p-4 bg-slate-950/50 border border-slate-800 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                        {isSearching && <Loader2 className="w-4 h-4 animate-spin text-blue-400" />}
                        <span className="text-xs font-bold text-slate-400 uppercase">
                            {isSearching ? 'Buscando no Google Maps...' : error ? 'Erro na Busca' : 'Busca finalizada'}
                        </span>
                    </div>
                    <div className="font-mono text-xs text-slate-400 space-y-1 max-h-48 overflow-y-auto scrollbar-thin scrollbar-track-slate-900 scrollbar-thumb-slate-700">
                        {output.map((line, i) => (
                            <div key={i} className={`${line.includes('✅') ? 'text-green-400' : line.includes('❌') ? 'text-red-400/70' : line.includes('⚠️') ? 'text-amber-400' : line.includes('📤') ? 'text-blue-400' : ''}`}>
                                {line}
                            </div>
                        ))}
                        {error && <div className="text-red-400">{error}</div>}
                    </div>
                </div>
            )}
        </div>
    );
};

export default GoogleMapsSearch;
