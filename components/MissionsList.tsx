import React, { useState, useEffect } from 'react';
import {
    Folder,
    Plus,
    ChevronRight,
    Loader2,
    Trash2,
    Users,
    Play,
    Pause
} from 'lucide-react';
import { missionsApi, Mission } from '../services/api';

interface MissionsListProps {
    onSelectMission: (id: string) => void;
}

const MissionsList: React.FC<MissionsListProps> = ({ onSelectMission }) => {
    const [missions, setMissions] = useState<Mission[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchMissions = async () => {
        try {
            const data = await missionsApi.getAll();
            setMissions(data);
        } catch (error) {
            console.error('Error fetching missions:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        // Poll for updates every 5s while list is open
        fetchMissions();
        const interval = setInterval(fetchMissions, 5000);
        return () => clearInterval(interval);
    }, []);

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (!confirm('Deletar esta missão e todos os alvos?')) return;
        try {
            await missionsApi.delete(id);
            fetchMissions();
        } catch (error) {
            console.error('Error deleting mission:', error);
        }
    };

    const handleToggleStatus = async (mission: Mission) => {
        try {
            const newStatus = mission.status === 'active' ? 'paused' : 'active';
            await missionsApi.update(mission.id, { status: newStatus });
            fetchMissions();
        } catch (error) {
            console.error('Error updating mission status:', error);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Folder className="w-5 h-5 text-purple-400" />
                    Minhas Missões
                </h2>
                <span className="text-sm text-slate-400">{missions.length} missões</span>
            </div>

            {missions.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                    <Folder className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhuma missão criada ainda.</p>
                    <p className="text-sm mt-1">Use o painel acima para criar sua primeira missão.</p>
                </div>
            ) : (
                <div className="grid gap-3">
                    {missions.map((mission) => (
                        <div
                            key={mission.id}
                            onClick={() => onSelectMission(mission.id)}
                            className={`group p-4 rounded-xl border transition-all cursor-pointer ${mission.status === 'paused'
                                ? 'bg-slate-900/10 border-slate-800 opacity-70 hover:opacity-100'
                                : 'bg-slate-900/30 border-slate-800 hover:border-purple-500/50 hover:bg-slate-800/30'
                                }`}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="text-sm font-bold text-white group-hover:text-purple-400 transition-colors truncate">
                                            {mission.title}
                                        </h3>
                                        {mission.status === 'paused' && (
                                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                                                PAUSADA
                                            </span>
                                        )}
                                        {mission.status === 'active' && (
                                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-green-500/10 text-green-500 border border-green-500/20">
                                                ATIVA
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1 truncate">
                                        {mission.promptInstruction.slice(0, 80)}...
                                    </p>
                                </div>
                                <div className="flex items-center gap-2 ml-4">
                                    <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-800 rounded-lg">
                                        <Users className="w-3 h-3 text-slate-400" />
                                        <span className="text-xs font-bold text-slate-300">{mission._count?.targets || 0}</span>
                                    </div>

                                    {/* Control Buttons */}
                                    <div className="flex items-center gap-1 bg-slate-800/50 rounded-lg p-1" onClick={e => e.stopPropagation()}>
                                        {mission.status === 'active' ? (
                                            <button
                                                onClick={() => handleToggleStatus(mission)}
                                                className="p-1.5 rounded-md text-amber-500 hover:bg-amber-500/10 transition-colors"
                                                title="Pausar Missão"
                                            >
                                                <Pause className="w-3.5 h-3.5" />
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => handleToggleStatus(mission)}
                                                className="p-1.5 rounded-md text-green-500 hover:bg-green-500/10 transition-colors"
                                                title="Iniciar/Retomar Missão"
                                            >
                                                <Play className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                        <button
                                            onClick={(e) => handleDelete(e, mission.id)}
                                            className="p-1.5 rounded-md text-slate-500 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                                            title="Excluir Missão"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>

                                    <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-purple-400 transition-colors" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default MissionsList;
