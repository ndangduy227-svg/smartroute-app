import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { FirestoreService } from '../services/FirestoreService';
import { apiFetch, setUserTrackAsiaKey } from '../utils/api';
import { ApiKeyStatus } from '../types';

interface ApiKeySettingsProps {
    isOpen: boolean;
    onClose: () => void;
    onKeyChanged?: (key: string | null) => void;
}

export const ApiKeySettings: React.FC<ApiKeySettingsProps> = ({ isOpen, onClose, onKeyChanged }) => {
    const { user } = useAuth();
    const [apiKey, setApiKey] = useState('');
    const [status, setStatus] = useState<ApiKeyStatus>('untested');
    const [showKey, setShowKey] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState('');

    // Load saved key on open
    useEffect(() => {
        if (isOpen && user) {
            FirestoreService.getApiKey(user.uid).then((data) => {
                if (data.key) {
                    setApiKey(data.key);
                    setStatus(data.status);
                } else {
                    setApiKey('');
                    setStatus('untested');
                }
            });
        }
    }, [isOpen, user]);

    const handleTestConnection = async () => {
        if (!apiKey.trim()) {
            setMessage('Vui long nhap API key truoc');
            return;
        }

        setStatus('testing');
        setMessage('');

        try {
            const res = await apiFetch('/api/vrp/test-key', {
                method: 'POST',
                body: JSON.stringify({ apiKey: apiKey.trim() })
            });
            const data = await res.json();

            if (data.valid) {
                setStatus('valid');
                setMessage('Key hop le! Ket noi thanh cong.');
            } else {
                setStatus('invalid');
                setMessage(data.error || 'Key khong hop le');
            }
        } catch (error) {
            setStatus('invalid');
            setMessage('Khong the kiem tra key. Vui long thu lai.');
        }
    };

    const handleSave = async () => {
        if (!user) return;
        setIsSaving(true);

        try {
            const trimmedKey = apiKey.trim();
            if (trimmedKey) {
                await FirestoreService.saveApiKey(user.uid, trimmedKey, status);
                setUserTrackAsiaKey(trimmedKey);
                onKeyChanged?.(trimmedKey);
                setMessage('Da luu thanh cong!');
            } else {
                // Clear key — use server default
                await FirestoreService.saveApiKey(user.uid, '', 'untested');
                setUserTrackAsiaKey(null);
                onKeyChanged?.(null);
                setStatus('untested');
                setMessage('Da xoa key. Se dung key mac dinh cua he thong.');
            }
        } catch (error) {
            setMessage('Loi khi luu. Vui long thu lai.');
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    const statusConfig = {
        untested: { color: 'bg-gray-500', text: 'Chua kiem tra', textColor: 'text-gray-400' },
        testing: { color: 'bg-yellow-500 animate-pulse', text: 'Dang kiem tra...', textColor: 'text-yellow-400' },
        valid: { color: 'bg-emerald-500', text: 'Key hop le', textColor: 'text-emerald-400' },
        invalid: { color: 'bg-red-500', text: 'Key khong hop le', textColor: 'text-red-400' },
    };

    const currentStatus = statusConfig[status];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-slate-800 border border-slate-600 rounded-xl w-full max-w-lg mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-700">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-brand-teal/20 flex items-center justify-center">
                            <svg className="w-5 h-5 text-brand-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white">TrackAsia API Key</h2>
                            <p className="text-xs text-gray-400">Cau hinh key de su dung VRP & Geocoding</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white p-2 hover:bg-slate-700 rounded-lg transition-colors">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-5">
                    {/* Status Indicator */}
                    <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${currentStatus.color}`}></span>
                        <span className={`text-sm font-medium ${currentStatus.textColor}`}>{currentStatus.text}</span>
                    </div>

                    {/* API Key Input */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">API Key</label>
                        <div className="relative">
                            <input
                                type={showKey ? 'text' : 'password'}
                                value={apiKey}
                                onChange={(e) => {
                                    setApiKey(e.target.value);
                                    if (status !== 'untested') setStatus('untested');
                                    setMessage('');
                                }}
                                placeholder="Nhap TrackAsia API Key cua ban..."
                                className="w-full px-4 py-3 pr-20 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-teal focus:border-transparent font-mono text-sm"
                            />
                            <button
                                onClick={() => setShowKey(!showKey)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-2 rounded transition-colors"
                                title={showKey ? 'An key' : 'Hien key'}
                            >
                                {showKey ? (
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                    </svg>
                                ) : (
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                )}
                            </button>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                            Lay key tai <a href="https://track-asia.com" target="_blank" rel="noopener noreferrer" className="text-brand-teal hover:underline">track-asia.com</a>.
                            De trong de dung key mac dinh cua he thong.
                        </p>
                    </div>

                    {/* Message */}
                    {message && (
                        <div className={`text-sm px-3 py-2 rounded-lg ${
                            status === 'valid' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                            status === 'invalid' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                            'bg-slate-700 text-gray-300'
                        }`}>
                            {message}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between p-6 border-t border-slate-700 gap-3">
                    <button
                        onClick={handleTestConnection}
                        disabled={!apiKey.trim() || status === 'testing'}
                        className="flex items-center gap-2 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm font-medium"
                    >
                        {status === 'testing' ? (
                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        ) : (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        )}
                        Kiem tra ket noi
                    </button>

                    <div className="flex gap-2">
                        <button
                            onClick={onClose}
                            className="px-4 py-2.5 text-gray-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors text-sm"
                        >
                            Huy
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="px-6 py-2.5 bg-brand-teal text-brand-dark font-bold rounded-lg hover:brightness-110 disabled:opacity-50 transition-all text-sm"
                        >
                            {isSaving ? 'Dang luu...' : 'Luu'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
