
import React from 'react';
import { useAuth } from './AuthContext';
import { LoginView } from './LoginView';

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-slate-100">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-teal mb-4"></div>
                <p className="text-gray-400">Loading...</p>
            </div>
        );
    }

    if (!user) {
        return <LoginView />;
    }

    return <>{children}</>;
};
