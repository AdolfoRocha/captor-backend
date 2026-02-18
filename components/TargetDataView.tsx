import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { targetsApi as api, Target } from '../services/api';
import { ArrowLeft, Loader2 } from 'lucide-react';

export function TargetDataView() {
    const { id } = useParams<{ id: string }>();
    const [target, setTarget] = useState<Target | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchTarget() {
            if (!id) return;
            try {
                const data = await api.getById(id);
                setTarget(data);
            } catch (err) {
                setError('Failed to fetch target data');
                console.error(err);
            } finally {
                setLoading(false);
            }
        }

        fetchTarget();
    }, [id]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
            </div>
        );
    }

    if (error || !target) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen text-red-500">
                <p className="text-xl font-semibold">{error || 'Target not found'}</p>
                <a href="/" className="mt-4 text-purple-600 hover:underline flex items-center gap-2">
                    <ArrowLeft size={20} /> Back to Dashboard
                </a>
            </div>
        );
    }

    let parsedBio = null;
    try {
        if (target.scrapedBio) {
            parsedBio = typeof target.scrapedBio === 'string'
                ? JSON.parse(target.scrapedBio)
                : target.scrapedBio;
        }
    } catch (e) {
        parsedBio = { raw: target.scrapedBio };
    }

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-4xl mx-auto">
                <div className="mb-6 flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-gray-900">Target Data View</h1>
                    <a href="/" className="text-gray-600 hover:text-gray-900 flex items-center gap-2">
                        <ArrowLeft size={20} /> Back
                    </a>
                </div>

                <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">Basic Info</h2>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-sm text-gray-500">Name</p>
                            <p className="font-medium text-gray-900">{target.name}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Phone</p>
                            <p className="font-medium text-gray-900">{target.phone}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Status</p>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                ${target.auditStatus === 'completed' ? 'bg-green-100 text-green-800' :
                                    target.auditStatus === 'failed' ? 'bg-red-100 text-red-800' :
                                        'bg-yellow-100 text-yellow-800'}`}>
                                {target.auditStatus}
                            </span>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Last Interaction</p>
                            <p className="font-medium text-gray-900">
                                {target.lastInteraction ? new Date(target.lastInteraction).toLocaleString() : 'Never'}
                            </p>
                        </div>
                    </div>
                </div>

                {parsedBio && (
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <h2 className="text-lg font-semibold text-purple-800 mb-4 border-b pb-2">Scraped Profile Data</h2>

                        {parsedBio.profile ? (
                            <div className="space-y-6">
                                {/* Images/Screenshot link if available in JSON structure */}
                                {parsedBio.screenshot && (
                                    <div className="mb-4">
                                        <p className="text-sm text-gray-500 mb-1">Screenshot Reference</p>
                                        <code className="bg-gray-100 px-2 py-1 rounded text-sm">{parsedBio.screenshot}</code>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <h3 className="text-sm font-semibold text-gray-700 mb-2">Details</h3>
                                        <dl className="space-y-2 text-sm">
                                            {Object.entries(parsedBio.profile).map(([key, value]) => {
                                                if (typeof value === 'object' || key === 'whatsapp_raw') return null; // Skip arrays/objects here
                                                return (
                                                    <div key={key} className="flex flex-col">
                                                        <dt className="text-gray-500 capitalize">{key}</dt>
                                                        <dd className="font-medium text-gray-900">{String(value)}</dd>
                                                    </div>
                                                );
                                            })}
                                        </dl>
                                    </div>

                                    <div>
                                        {/* Handle Lists like services, payments etc */}
                                        {Object.entries(parsedBio.profile).map(([key, value]) => {
                                            if (!Array.isArray(value)) return null;
                                            return (
                                                <div key={key} className="mb-4">
                                                    <h3 className="text-sm font-semibold text-gray-700 mb-2 capitalize">{key}</h3>
                                                    <div className="flex flex-wrap gap-2">
                                                        {value.map((item: any, idx: number) => (
                                                            <span key={idx} className="bg-purple-50 text-purple-700 px-2 py-1 rounded text-xs font-medium border border-purple-100">
                                                                {String(item)}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>

                                {parsedBio.profile.descricao && (
                                    <div className="mt-4">
                                        <p className="text-sm text-gray-500 mb-1">Description</p>
                                        <p className="text-gray-700 italic border-l-4 border-purple-200 pl-4 py-1">
                                            {parsedBio.profile.descricao}
                                        </p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <pre className="bg-gray-900 text-green-400 p-4 rounded overflow-auto text-sm max-h-96">
                                {JSON.stringify(parsedBio, null, 2)}
                            </pre>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
