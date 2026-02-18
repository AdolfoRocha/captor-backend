import React, { useState, useEffect } from 'react';
import {
    Target,
    Plus,
    Trash2,
    ArrowLeft,
    Users,
    Loader2,
    CheckCircle,
    Upload,
    X,
    Search,
    Globe,
    MapPin,
    Check,
    Phone
} from 'lucide-react';
import { missionsApi, targetsApi, scraperApi, leadsApi, Mission, Target as TargetType, Lead } from '../services/api';

interface MissionPageProps {
    missionId: string;
    onBack: () => void;
}

const MissionPage: React.FC<MissionPageProps> = ({ missionId, onBack }) => {
    const [mission, setMission] = useState<Mission | null>(null);
    const [targets, setTargets] = useState<TargetType[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newTarget, setNewTarget] = useState({ name: '', phone: '', scrapedBio: '' });
    const [bulkText, setBulkText] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // Lead Import State
    const [showImportModal, setShowImportModal] = useState(false);
    const [availableLeads, setAvailableLeads] = useState<Lead[]>([]);
    const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
    const [loadingLeads, setLoadingLeads] = useState(false);
    const [importFilter, setImportFilter] = useState('');

    // Scraping state
    const [isScraping, setIsScraping] = useState(false);
    const [scraperJobId, setScraperJobId] = useState<string | null>(null);
    const [scraperOutput, setScraperOutput] = useState<string[]>([]);
    const [scraperError, setScraperError] = useState<string | null>(null);


    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [missionData, targetsData] = await Promise.all([
                missionsApi.getById(missionId),
                targetsApi.getAll({ missionId })
            ]);
            setMission(missionData);
            setTargets(targetsData);
        } catch (error) {
            console.error('Error fetching mission:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchAvailableLeads = async () => {
        setLoadingLeads(true);
        try {
            // Fetch leads that are NOT imported yet
            // const leads = await leadsApi.getAll({ notImported: true });
            // For now, let's fetch all and filter in UI or let user decide?
            // Better to show all but mark imported? 
            // The requirement is "import", usually implies "copy".
            // Let's fetch all.
            const leads = await leadsApi.getAll();
            setAvailableLeads(leads);
        } catch (error) {
            console.error('Error fetching leads:', error);
        } finally {
            setLoadingLeads(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [missionId]);

    useEffect(() => {
        if (showImportModal) {
            fetchAvailableLeads();
            setSelectedLeads([]);
        }
    }, [showImportModal]);

    const handleAddTarget = async () => {
        if (!newTarget.name || !newTarget.phone) return;

        setIsSaving(true);
        try {
            await targetsApi.create({
                name: newTarget.name,
                phone: newTarget.phone,
                scrapedBio: newTarget.scrapedBio || undefined,
                missionId
            });
            setNewTarget({ name: '', phone: '', scrapedBio: '' });
            fetchData();
        } catch (error) {
            console.error('Error adding target:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleImportLeads = async () => {
        if (selectedLeads.length === 0) return;
        setIsSaving(true);
        try {
            const result = await leadsApi.importToMission(selectedLeads, missionId);
            alert(`${result.imported} leads importados com sucesso!`);
            setShowImportModal(false);
            fetchData();
        } catch (error) {
            console.error('Error importing leads:', error);
            alert('Erro ao importar leads');
        } finally {
            setIsSaving(false);
        }
    };

    const handleBulkImport = async () => {
        if (!bulkText.trim()) return;

        // Parse format: "Nome | Telefone" per line
        const lines = bulkText.split('\n').filter(l => l.trim());
        const parsedTargets = lines.map(line => {
            const parts = line.split('|').map(p => p.trim());
            return {
                name: parts[0] || 'Sem nome',
                phone: parts[1] || ''
            };
        }).filter(t => t.phone);

        if (parsedTargets.length === 0) {
            alert('Formato inválido. Use: Nome | Telefone (um por linha)');
            return;
        }

        setIsSaving(true);
        try {
            await targetsApi.createBulk(parsedTargets, missionId);
            setBulkText('');
            fetchData();
        } catch (error) {
            console.error('Error bulk importing:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteTarget = async (id: string) => {
        if (!confirm('Deletar este alvo?')) return;
        try {
            await targetsApi.delete(id);
            fetchData();
        } catch (error) {
            console.error('Error deleting target:', error);
        }
    };

    const handleUpdateStatus = async (newStatus: string) => {
        if (!mission) return;
        try {
            // Optimistic
            setMission({ ...mission, status: newStatus });
            await missionsApi.update(mission.id, { status: newStatus });
        } catch (error) {
            console.error('Error updating status:', error);
            fetchData(); // Revert on error
        }
    };

    const handleUpdateLimit = async (newLimit: number | null) => {
        if (!mission) return;
        try {
            await missionsApi.update(mission.id, { targetLimit: newLimit });
        } catch (error) {
            console.error('Error updating limit:', error);
        }
    };

    // Start auto-scraping (Legacy/URL method)
    const handleStartScraping = async () => {
        if (!mission?.sourceUrl) {
            alert('Esta missão não tem uma URL de origem configurada.');
            return;
        }

        setIsScraping(true);
        setScraperError(null);
        setScraperOutput([]);

        try {
            const result = await scraperApi.start(missionId);

            if (result.error) {
                setScraperError(result.error);
                setIsScraping(false);
                return;
            }

            setScraperJobId(result.jobId);
            setScraperOutput([`🚀 Scraping iniciado: ${result.sourceUrl}`, `📊 Máximo de alvos: ${result.maxTargets}`]);
        } catch (error) {
            console.error('Error starting scraper:', error);
            setScraperError('Falha ao iniciar o scraping');
            setIsScraping(false);
        }
    };

    // Stop scraping
    const handleStopScraping = async () => {
        try {
            const result = await scraperApi.stop({ missionId });
            setIsScraping(false);
            setScraperJobId(null);
            setScraperOutput(prev => [...prev, '⛔ ' + result.message]);
            fetchData(); // Refresh to get any targets that were added
        } catch (error) {
            console.error('Error stopping scraper:', error);
        }
    };


    // Poll scraper status
    useEffect(() => {
        if (!scraperJobId || !isScraping) return;

        const pollStatus = async () => {
            try {
                const status = await scraperApi.getStatus(scraperJobId);
                setScraperOutput(status.output);

                if (status.status === 'completed') {
                    setIsScraping(false);
                    setScraperJobId(null);
                    fetchData(); // Refresh targets
                } else if (status.status === 'failed') {
                    setIsScraping(false);
                    setScraperJobId(null);
                    setScraperError(status.error || 'Scraping falhou');
                }
            } catch (error) {
                console.error('Error polling scraper status:', error);
            }
        };

        const interval = setInterval(pollStatus, 2000);
        return () => clearInterval(interval);
    }, [scraperJobId, isScraping]);


    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
            </div>
        );
    }

    // Filter leads for import modal
    const filteredLeads = availableLeads.filter(lead =>
        lead.name.toLowerCase().includes(importFilter.toLowerCase()) ||
        lead.category?.toLowerCase().includes(importFilter.toLowerCase()) ||
        lead.searchLocation.toLowerCase().includes(importFilter.toLowerCase())
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button
                    onClick={onBack}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5 text-slate-300" />
                </button>
                <div className="flex-1">
                    <div className="flex items-center gap-3">
                        <h1 className="text-xl font-bold text-white max-w-2xl truncate" title={mission?.title}>{mission?.title}</h1>
                        {/* Status Badge */}
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border ${mission?.status === 'active' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                            mission?.status === 'paused' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                                mission?.status === 'completed' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                    'bg-slate-800 text-slate-400 border-slate-700'
                            }`}>
                            {mission?.status === 'active' ? 'Em Execução' :
                                mission?.status === 'paused' ? 'Pausada' :
                                    mission?.status === 'completed' ? 'Concluída' : mission?.status}
                        </span>
                    </div>
                    <p className="text-sm text-slate-400 mt-1 max-w-3xl truncate">{mission?.promptInstruction}</p>
                </div>

                {/* Mission Controls */}
                <div className="flex items-center gap-3">
                    {/* Limit Input */}
                    <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5" title="Limite de Alvos">
                        <Target className="w-4 h-4 text-slate-500" />
                        <input
                            type="number"
                            placeholder="∞"
                            className="w-12 bg-transparent text-sm text-slate-200 focus:outline-none text-center"
                            value={mission?.targetLimit || ''}
                            onChange={(e) => {
                                const val = e.target.value ? parseInt(e.target.value) : null;
                                if (mission) {
                                    setMission({ ...mission, targetLimit: val });
                                    handleUpdateLimit(val);
                                }
                            }}
                        />
                        <span className="text-xs text-slate-600">max</span>
                    </div>

                    <div className="h-8 w-px bg-slate-800 mx-1" />

                    {/* Play/Pause Controls */}
                    {mission?.status === 'active' ? (
                        <button
                            onClick={() => handleUpdateStatus('paused')}
                            className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 border border-yellow-500/20 rounded-lg transition-all"
                            title="Pausar Missão"
                        >
                            <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
                            <span className="text-xs font-bold">Pausar</span>
                        </button>
                    ) : (
                        <button
                            onClick={() => handleUpdateStatus('active')}
                            className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 hover:bg-green-500/20 text-green-500 border border-green-500/20 rounded-lg transition-all"
                            title={mission?.status === 'completed' ? 'Reiniciar Missão' : 'Retomar Missão'}
                        >
                            <span className="text-xs font-bold">
                                {mission?.status === 'completed' ? 'Reiniciar' : 'Retomar'}
                            </span>
                        </button>
                    )}

                    {/* Delete Mission Button */}
                    <button
                        onClick={async () => {
                            if (confirm('Tem certeza que deseja excluir esta missão? Todos os alvos serão perdidos.')) {
                                try {
                                    await scraperApi.stop({ missionId });
                                    await missionsApi.delete(missionId);
                                    onBack();
                                } catch (error) {
                                    console.error('Error deleting mission:', error);
                                    alert('Erro ao excluir missão');
                                }
                            }
                        }}
                        className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-lg transition-all ml-2"
                        title="Excluir Missão"
                    >
                        <Trash2 className="w-4 h-4" />
                        <span className="text-xs font-bold">Excluir</span>
                    </button>

                    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg ml-2">
                        <Users className="w-4 h-4 text-purple-400" />
                        <span className="text-sm font-bold text-white">{targets.length}</span>
                        <span className="text-xs text-slate-400">alvos</span>
                    </div>
                </div>
            </div>

            {/* Actions Bar */}
            <div className="p-6 rounded-2xl glass-panel">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                        <Target className="w-4 h-4 text-green-400" />
                        Gerenciar Alvos
                    </h2>
                    <div className="flex items-center gap-2">
                        {/* Auto-scrape button (Legacy) */}
                        {mission?.sourceUrl && (
                            isScraping ? (
                                <button
                                    onClick={handleStopScraping}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold transition-colors"
                                    title="Parar scraping"
                                >
                                    <X className="w-4 h-4" />
                                    Parar Scraping
                                </button>
                            ) : (
                                <button
                                    onClick={handleStartScraping}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-colors"
                                    title={`Buscar alvos de: ${mission.sourceUrl}`}
                                >
                                    <Globe className="w-4 h-4" />
                                    Scraping URL
                                </button>
                            )
                        )}

                        {/* Import Leads Button */}
                        <button
                            onClick={() => setShowImportModal(true)}
                            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-colors shadow-lg shadow-blue-900/20"
                        >
                            <MapPin className="w-4 h-4" />
                            Importar Leads
                        </button>

                        {/* New Target Button */}
                        <button
                            onClick={() => setShowAddForm(!showAddForm)}
                            className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold transition-colors shadow-lg shadow-purple-900/20"
                        >
                            {showAddForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                            {showAddForm ? 'Fechar' : 'Novo Alvo'}
                        </button>
                    </div>
                </div>

                {/* Scraper Status (Legacy) */}
                {(isScraping || scraperOutput.length > 0 || scraperError) && (
                    <div className="mb-4 p-4 bg-slate-950/50 border border-slate-800 rounded-xl">
                        <div className="flex items-center gap-2 mb-2">
                            {isScraping && <Loader2 className="w-4 h-4 animate-spin text-blue-400" />}
                            <span className="text-xs font-bold text-slate-400 uppercase">
                                {isScraping ? 'Scraping em andamento...' : scraperError ? 'Erro no Scraping' : 'Scraping finalizado'}
                            </span>
                        </div>
                        <div className="font-mono text-xs text-slate-400 space-y-1 max-h-32 overflow-y-auto">
                            {scraperOutput.map((line, i) => (
                                <div key={i}>{line}</div>
                            ))}
                            {scraperError && <div className="text-red-400">{scraperError}</div>}
                        </div>
                    </div>
                )}


                {showAddForm && (
                    <div className="space-y-4 animate-in fade-in duration-200">
                        {/* Single Add */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <input
                                type="text"
                                placeholder="Nome do profissional"
                                value={newTarget.name}
                                onChange={(e) => setNewTarget(prev => ({ ...prev, name: e.target.value }))}
                                className="bg-slate-950/50 border border-slate-800 rounded-xl py-3 px-4 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-purple-500 transition-all"
                            />
                            <input
                                type="text"
                                placeholder="+55 11 99999-9999"
                                value={newTarget.phone}
                                onChange={(e) => setNewTarget(prev => ({ ...prev, phone: e.target.value }))}
                                className="bg-slate-950/50 border border-slate-800 rounded-xl py-3 px-4 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-purple-500 transition-all"
                            />
                            <button
                                onClick={handleAddTarget}
                                disabled={isSaving || !newTarget.name || !newTarget.phone}
                                className="flex items-center justify-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold text-sm transition-all"
                            >
                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                                Adicionar
                            </button>
                        </div>

                        {/* Divider */}
                        <div className="flex items-center gap-4">
                            <div className="flex-1 h-px bg-slate-800" />
                            <span className="text-xs text-slate-500 font-bold">OU IMPORTAR EM LOTE (TEXTO)</span>
                            <div className="flex-1 h-px bg-slate-800" />
                        </div>

                        {/* Bulk Import */}
                        <div className="space-y-3">
                            <textarea
                                placeholder="Cole aqui a lista de alvos no formato:&#10;Nome | Telefone&#10;Dr. Carlos | +55 11 98877-6655&#10;Dra. Ana | +55 21 97766-5544"
                                value={bulkText}
                                onChange={(e) => setBulkText(e.target.value)}
                                className="w-full h-32 bg-slate-950/50 border border-slate-800 rounded-xl p-4 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-purple-500 transition-all resize-none font-mono"
                            />
                            <button
                                onClick={handleBulkImport}
                                disabled={isSaving || !bulkText.trim()}
                                className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold text-sm transition-all"
                            >
                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                Importar Lista via Texto
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Targets List */}
            <div className="overflow-hidden bg-slate-900/20 border border-slate-800 rounded-2xl">
                <div className="px-6 py-4 border-b border-slate-800">
                    <h2 className="text-sm font-bold text-white uppercase tracking-widest">
                        Lista de Alvos
                    </h2>
                </div>
                <div className="divide-y divide-slate-800/50">
                    {targets.length === 0 ? (
                        <div className="px-6 py-12 text-center text-slate-500">
                            Nenhum alvo adicionado. Importe leads ou adicione manualmente.
                        </div>
                    ) : (
                        targets.map((target) => (
                            <div key={target.id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-800/20 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-400">
                                        {target.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-slate-200">{target.name}</p>
                                        <p className="text-xs text-slate-500 font-mono">{target.phone}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${target.auditStatus === 'completed' ? 'bg-green-500/10 text-green-500' :
                                        target.auditStatus === 'in_progress' ? 'bg-purple-500/10 text-purple-400' :
                                            target.auditStatus === 'failed' ? 'bg-red-500/10 text-red-500' :
                                                'bg-slate-800 text-slate-400'
                                        }`}>
                                        {target.auditStatus === 'completed' ? 'Completo' :
                                            target.auditStatus === 'in_progress' ? 'Em progresso' :
                                                target.auditStatus === 'failed' ? 'Falhou' : 'Pendente'}
                                    </span>
                                    <button
                                        onClick={() => handleDeleteTarget(target.id)}
                                        className="p-2 rounded-lg hover:bg-red-500/10 text-slate-500 hover:text-red-500 transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Import Leads Modal */}
            {showImportModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <MapPin className="w-5 h-5 text-blue-400" />
                                Importar Leads Capturados
                            </h2>
                            <button
                                onClick={() => setShowImportModal(false)}
                                className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-4 border-b border-slate-800 bg-slate-900/50">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <input
                                    type="text"
                                    placeholder="Filtrar por nome, categoria ou cidade..."
                                    value={importFilter}
                                    onChange={(e) => setImportFilter(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-blue-500 transition-all"
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4">
                            {loadingLeads ? (
                                <div className="flex justify-center py-12">
                                    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                                </div>
                            ) : filteredLeads.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                                    <MapPin className="w-12 h-12 mb-4 opacity-20" />
                                    <p>Nenhum lead encontrado.</p>
                                    <p className="text-xs mt-1">Vá em "Captação de Leads" para buscar empresas no Google Maps.</p>
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    <div className="flex items-center justify-between px-4 py-2 text-xs font-bold text-slate-400 uppercase">
                                        <span>Selecionados: {selectedLeads.length}</span>
                                        <button
                                            onClick={() => {
                                                if (selectedLeads.length === filteredLeads.length) {
                                                    setSelectedLeads([]);
                                                } else {
                                                    setSelectedLeads(filteredLeads.map(l => l.id));
                                                }
                                            }}
                                            className="text-blue-400 hover:text-blue-300 transition-colors"
                                        >
                                            {selectedLeads.length === filteredLeads.length ? 'Desmarcar Todos' : 'Marcar Todos (Visíveis)'}
                                        </button>
                                    </div>
                                    {filteredLeads.map(lead => {
                                        const isSelected = selectedLeads.includes(lead.id);
                                        const isAlreadyImported = lead.imported; // Visual cue only, backend allows re-import if needed? or logic prevents? Logic in endpoint prevents duplicates usually.

                                        return (
                                            <div
                                                key={lead.id}
                                                onClick={() => {
                                                    if (isSelected) {
                                                        setSelectedLeads(selectedLeads.filter(id => id !== lead.id));
                                                    } else {
                                                        setSelectedLeads([...selectedLeads, lead.id]);
                                                    }
                                                }}
                                                className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${isSelected
                                                    ? 'bg-blue-600/10 border-blue-500/50'
                                                    : 'bg-slate-800/20 border-slate-800 hover:bg-slate-800/50'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-blue-500 border-blue-500' : 'border-slate-600'
                                                        }`}>
                                                        {isSelected && <Check className="w-3 h-3 text-white" />}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-white text-sm">{lead.name}</div>
                                                        <div className="flex items-center gap-2 text-xs text-slate-400">
                                                            <span className="flex items-center gap-1">
                                                                <Phone className="w-3 h-3" /> {lead.phone}
                                                            </span>
                                                            <span className="text-slate-600">•</span>
                                                            <span>{lead.category || 'Empresa'}</span>
                                                            <span className="text-slate-600">•</span>
                                                            <span>{lead.searchLocation}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex flex-col items-end gap-1">
                                                    {lead.isWhatsapp && (
                                                        <span className="text-[10px] px-1.5 py-0.5 bg-green-500/10 text-green-400 rounded font-bold">WhatsApp</span>
                                                    )}
                                                    {lead.imported && (
                                                        <span className="text-[10px] text-slate-500 flex items-center gap-1">
                                                            <CheckCircle className="w-3 h-3" /> Já importado
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <div className="p-4 border-t border-slate-800 bg-slate-900/50 flex justify-end gap-3">
                            <button
                                onClick={() => setShowImportModal(false)}
                                className="px-5 py-2.5 rounded-xl font-bold text-slate-300 hover:bg-slate-800 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleImportLeads}
                                disabled={selectedLeads.length === 0 || isSaving}
                                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold shadow-lg shadow-blue-900/20 transition-all flex items-center gap-2"
                            >
                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                Importar {selectedLeads.length} Leads
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MissionPage;
