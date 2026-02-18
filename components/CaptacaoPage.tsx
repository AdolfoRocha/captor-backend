import React, { useState, useEffect } from 'react';
import {
    MapPin,
    Search,
    Trash2,
    Building2,
    Phone,
    Globe,
    Star,
    MessageSquare,
    Filter,
    Download,
    CheckCircle,
    X,
    Plus
} from 'lucide-react';
import { leadsApi, Lead } from '../services/api';
import GoogleMapsSearch from './GoogleMapsSearch';

const CaptacaoPage: React.FC = () => {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showSearch, setShowSearch] = useState(false);
    const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
    const [filter, setFilter] = useState('');

    const fetchLeads = async () => {
        setIsLoading(true);
        try {
            const data = await leadsApi.getAll();
            setLeads(data);
        } catch (error) {
            console.error('Error fetching leads:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchLeads();
    }, []);

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este lead?')) return;
        try {
            await leadsApi.delete(id);
            setLeads(leads.filter(l => l.id !== id));
        } catch (error) {
            console.error('Error deleting lead:', error);
        }
    };

    const handleClearAll = async () => {
        if (!confirm('ATENÇÃO: Isso apagará TODOS os leads capturados. Deseja continuar?')) return;
        try {
            // We need to add clear to api interface or loop delete. 
            // Asserting type safely here or adding to interface
            if ('clear' in leadsApi) {
                await (leadsApi as any).clear();
                setLeads([]);
            }
        } catch (error) {
            console.error('Error clearing leads:', error);
        }
    };

    const toggleSelect = (id: string) => {
        if (selectedLeads.includes(id)) {
            setSelectedLeads(selectedLeads.filter(l => l !== id));
        } else {
            setSelectedLeads([...selectedLeads, id]);
        }
    };

    const toggleSelectAll = () => {
        if (selectedLeads.length === leads.length) {
            setSelectedLeads([]);
        } else {
            setSelectedLeads(leads.map(l => l.id));
        }
    };

    const filteredLeads = leads.filter(lead =>
        lead.name.toLowerCase().includes(filter.toLowerCase()) ||
        lead.category?.toLowerCase().includes(filter.toLowerCase()) ||
        lead.searchLocation.toLowerCase().includes(filter.toLowerCase())
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">Captação de Leads</h1>
                    <p className="text-slate-400 mt-1">Busque empresas no Google Maps e construa sua base de leads.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleClearAll}
                        className="px-4 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg text-sm font-bold transition-all"
                    >
                        Limpar Tudo
                    </button>
                    <button
                        onClick={() => setShowSearch(!showSearch)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all ${showSearch
                                ? 'bg-slate-800 text-slate-300'
                                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20'
                            }`}
                    >
                        {showSearch ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                        {showSearch ? 'Fechar Busca' : 'Nova Busca'}
                    </button>
                </div>
            </div>

            {/* Google Maps Search Panel */}
            {showSearch && (
                <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                    <GoogleMapsSearch
                        onLeadsImported={() => {
                            fetchLeads();
                            // Optional: close search on finish?
                            // setShowSearch(false); 
                        }}
                    />
                </div>
            )}

            {/* Local Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800">
                    <div className="flex items-center gap-3 text-slate-400 mb-2">
                        <Building2 className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase">Total Capturado</span>
                    </div>
                    <div className="text-2xl font-bold text-white">{leads.length}</div>
                </div>
                <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800">
                    <div className="flex items-center gap-3 text-green-400 mb-2">
                        <MessageSquare className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase">Com WhatsApp</span>
                    </div>
                    <div className="text-2xl font-bold text-white">
                        {leads.filter(l => l.isWhatsapp).length}
                    </div>
                </div>
                <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800">
                    <div className="flex items-center gap-3 text-purple-400 mb-2">
                        <CheckCircle className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase">Importados em Missões</span>
                    </div>
                    <div className="text-2xl font-bold text-white">
                        {leads.filter(l => l.imported).length}
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4 p-4 bg-slate-900/30 border border-slate-800 rounded-xl">
                <Search className="w-4 h-4 text-slate-500" />
                <input
                    type="text"
                    placeholder="Filtrar por nome, categoria ou cidade..."
                    className="bg-transparent border-none text-sm text-slate-200 focus:ring-0 flex-1 placeholder:text-slate-600"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                />
            </div>

            {/* Leads List */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-950/50 text-xs uppercase text-slate-400 border-b border-slate-800">
                            <th className="p-4 font-bold w-10">
                                <input type="checkbox" checked={selectedLeads.length === leads.length && leads.length > 0} onChange={toggleSelectAll} className="rounded border-slate-700 bg-slate-900" />
                            </th>
                            <th className="p-4 font-bold">Empresa</th>
                            <th className="p-4 font-bold">Contato</th>
                            <th className="p-4 font-bold">Categoria/Local</th>
                            <th className="p-4 font-bold">Avaliação</th>
                            <th className="p-4 font-bold text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm divide-y divide-slate-800/50">
                        {isLoading ? (
                            <tr>
                                <td colSpan={6} className="p-8 text-center text-slate-500">
                                    Carregando leads...
                                </td>
                            </tr>
                        ) : filteredLeads.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="p-8 text-center text-slate-500">
                                    {filter ? 'Nenhum lead encontrado com este filtro.' : 'Nenhum lead capturado ainda. Use a busca acima.'}
                                </td>
                            </tr>
                        ) : (
                            filteredLeads.map(lead => (
                                <tr key={lead.id} className="group hover:bg-slate-800/30 transition-colors">
                                    <td className="p-4">
                                        <input
                                            type="checkbox"
                                            checked={selectedLeads.includes(lead.id)}
                                            onChange={() => toggleSelect(lead.id)}
                                            className="rounded border-slate-700 bg-slate-900"
                                        />
                                    </td>
                                    <td className="p-4">
                                        <div className="font-bold text-white">{lead.name}</div>
                                        {lead.website && (
                                            <a href={lead.website} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:underline flex items-center gap-1 mt-0.5">
                                                <Globe className="w-3 h-3" /> Website
                                            </a>
                                        )}
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-2 text-slate-300">
                                            <Phone className="w-3 h-3" />
                                            {lead.phone}
                                        </div>
                                        {lead.isWhatsapp && (
                                            <div className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded bg-green-500/10 text-green-400 text-[10px] font-bold">
                                                <MessageSquare className="w-3 h-3" /> WhatsApp
                                            </div>
                                        )}
                                    </td>
                                    <td className="p-4">
                                        <div className="text-slate-300">{lead.category || 'N/A'}</div>
                                        <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                                            <MapPin className="w-3 h-3" />
                                            {lead.searchLocation}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        {lead.rating ? (
                                            <div className="flex items-center gap-1 text-amber-400">
                                                <Star className="w-3 h-3 fill-current" />
                                                <span className="font-bold">{lead.rating}</span>
                                                <span className="text-xs text-slate-500">({lead.reviews})</span>
                                            </div>
                                        ) : (
                                            <span className="text-slate-600">-</span>
                                        )}
                                    </td>
                                    <td className="p-4 text-right">
                                        <button
                                            onClick={() => handleDelete(lead.id)}
                                            className="p-2 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                            title="Excluir Lead"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default CaptacaoPage;
