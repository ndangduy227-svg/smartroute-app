
import React from 'react';
import { useAuth } from './AuthContext';
import { BRAND_LOGOS } from '../constants';

export const LoginView: React.FC = () => {
    const { loginWithGoogle, error } = useAuth();

    return (
        <div className="flex min-h-screen bg-slate-900 font-sans">
            {/* Left Panel - Branding & Info */}
            <div className="hidden lg:flex w-1/2 flex-col justify-center px-12 relative overflow-hidden bg-slate-800">
                {/* Abstract Background Shapes */}
                <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                    <div className="absolute top-[-20%] left-[-20%] w-[800px] h-[800px] bg-brand-purple rounded-full blur-[120px]"></div>
                    <div className="absolute bottom-[-20%] right-[-20%] w-[600px] h-[600px] bg-brand-teal rounded-full blur-[100px]"></div>
                </div>

                <div className="relative z-10 max-w-lg mx-auto">
                    <div className="mb-12 transform scale-125 origin-left text-brand-teal">
                        {BRAND_LOGOS.smartRoute_full}
                    </div>

                    <h2 className="text-4xl font-bold text-white mb-6 leading-tight">
                        Revolutionize Your Logistics <br />
                        <span className="text-brand-teal">With AI-Powered Routing.</span>
                    </h2>

                    <p className="text-gray-400 text-lg mb-8 leading-relaxed">
                        SmartRoute helps you plan, optimize, and track deliveries in seconds.
                        Experience seamless cross-platform connectivity and real-time data sync.
                    </p>

                    <div className="space-y-4">
                        <BenefitItem
                            title="AI Optimization"
                            description="Reduce travel distance by up to 30% with advanced VRP algorithms."
                        />
                        <BenefitItem
                            title="Cross-Platform"
                            description="Access your workspace from any device. Data syncs instantly."
                        />
                        <BenefitItem
                            title="Real-Time Tracking"
                            description="Monitor drivers and reconcile orders with precision."
                        />
                    </div>
                </div>
            </div>

            {/* Right Panel - Login Form */}
            <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-8 bg-slate-900 relative">
                <div className="absolute top-0 right-0 p-8 hidden lg:block">
                    {/* Optional: Help/Contact Link */}
                </div>

                {/* Mobile Logo Show */}
                <div className="lg:hidden mb-10 text-brand-teal transform scale-110">
                    {BRAND_LOGOS.smartRoute_full}
                </div>

                <div className="w-full max-w-md bg-slate-800/50 backdrop-blur-sm border border-slate-700 p-8 rounded-2xl shadow-xl">
                    <div className="text-center mb-8">
                        <h3 className="text-2xl font-bold text-white mb-2">Welcome Back!</h3>
                        <p className="text-slate-400">Please sign in to continue to your workspace.</p>
                    </div>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500 text-red-400 p-4 rounded-xl mb-6 text-sm flex items-start gap-2">
                            <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            <span>{error}</span>
                        </div>
                    )}

                    <button
                        onClick={loginWithGoogle}
                        className="w-full bg-white hover:bg-gray-50 text-slate-900 font-bold text-lg py-4 px-6 rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg flex items-center justify-center gap-3"
                    >
                        <svg className="w-6 h-6" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        Sign in with Google
                    </button>

                    <div className="mt-8 text-center">
                        <p className="text-slate-500 text-xs">
                            By signing in, you agree to our Terms of Service and Privacy Policy. <br />
                            Powered by <strong>Mind Transform</strong>.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

const BenefitItem: React.FC<{ title: string; description: string }> = ({ title, description }) => (
    <div className="flex items-start gap-4">
        <div className="mt-1 bg-brand-teal/20 p-2 rounded-lg text-brand-teal">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
        </div>
        <div>
            <h4 className="text-white font-bold text-md">{title}</h4>
            <p className="text-gray-400 text-sm">{description}</p>
        </div>
    </div>
);
