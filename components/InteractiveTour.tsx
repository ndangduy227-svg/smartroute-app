import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';

export interface TourStep {
    targetId: string;
    title: string;
    content: string;
    position?: 'top' | 'bottom' | 'left' | 'right';
}

interface InteractiveTourProps {
    steps: TourStep[];
    isOpen: boolean;
    onClose: () => void;
    onComplete: () => void;
}

export const InteractiveTour: React.FC<InteractiveTourProps> = ({ steps, isOpen, onClose, onComplete }) => {
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
    const [isCalculating, setIsCalculating] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setCurrentStepIndex(0);
            updateTargetRect(0);
            // Lock body scroll
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    useEffect(() => {
        if (isOpen) {
            updateTargetRect(currentStepIndex);
        }
    }, [currentStepIndex, isOpen]);

    // Handle window resize
    useEffect(() => {
        const handleResize = () => {
            if (isOpen) updateTargetRect(currentStepIndex);
        };
        window.addEventListener('resize', handleResize);
        window.addEventListener('scroll', handleResize, true); // Capture scroll events
        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('scroll', handleResize, true);
        };
    }, [isOpen, currentStepIndex]);

    const updateTargetRect = (index: number) => {
        const step = steps[index];
        if (!step) return;

        const element = document.getElementById(step.targetId);
        if (element) {
            setIsCalculating(true);
            // Scroll element into view if needed
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });

            // Wait for scroll to finish (rough estimate)
            setTimeout(() => {
                const rect = element.getBoundingClientRect();
                setTargetRect(rect);
                setIsCalculating(false);
            }, 500);
        } else {
            console.warn(`Tour target #${step.targetId} not found`);
            // Skip if not found
            if (index < steps.length - 1) {
                setCurrentStepIndex(index + 1);
            } else {
                onComplete();
            }
        }
    };

    const handleNext = () => {
        if (currentStepIndex < steps.length - 1) {
            setCurrentStepIndex(prev => prev + 1);
        } else {
            onComplete();
        }
    };

    const handlePrev = () => {
        if (currentStepIndex > 0) {
            setCurrentStepIndex(prev => prev - 1);
        }
    };

    if (!isOpen) return null;

    const currentStep = steps[currentStepIndex];

    return createPortal(
        <div className="fixed inset-0 z-[9999] overflow-hidden">
            {/* Spotlight Overlay */}
            <div
                className="absolute inset-0 transition-all duration-500 ease-in-out"
                style={{
                    background: targetRect
                        ? `radial-gradient(circle at ${targetRect.left + targetRect.width / 2}px ${targetRect.top + targetRect.height / 2}px, transparent ${Math.max(targetRect.width, targetRect.height) / 1.5}px, rgba(0, 0, 0, 0.85) ${Math.max(targetRect.width, targetRect.height)}px)`
                        : 'rgba(0, 0, 0, 0.8)'
                }}
            ></div>

            {/* Highlight Box (Border) */}
            {targetRect && !isCalculating && (
                <div
                    className="absolute border-2 border-brand-teal rounded-lg shadow-[0_0_20px_rgba(45,225,194,0.5)] transition-all duration-500 ease-in-out pointer-events-none animate-pulse"
                    style={{
                        top: targetRect.top - 4,
                        left: targetRect.left - 4,
                        width: targetRect.width + 8,
                        height: targetRect.height + 8,
                    }}
                />
            )}

            {/* Tooltip Card */}
            {targetRect && !isCalculating && (
                <div
                    className="absolute bg-white text-slate-900 p-6 rounded-xl shadow-2xl max-w-sm w-full transition-all duration-500 ease-in-out"
                    style={{
                        top: targetRect.bottom + 20 > window.innerHeight - 200
                            ? targetRect.top - 200 // Flip to top if near bottom
                            : targetRect.bottom + 20,
                        left: Math.max(20, Math.min(window.innerWidth - 340, targetRect.left + (targetRect.width / 2) - 160))
                    }}
                >
                    {/* Arrow */}
                    <div
                        className="absolute w-4 h-4 bg-white transform rotate-45"
                        style={{
                            top: targetRect.bottom + 20 > window.innerHeight - 200 ? 'auto' : '-8px',
                            bottom: targetRect.bottom + 20 > window.innerHeight - 200 ? '-8px' : 'auto',
                            left: '50%',
                            marginLeft: '-8px'
                        }}
                    />

                    <div className="relative z-10">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                                Bước {currentStepIndex + 1}/{steps.length}
                            </span>
                            <button onClick={onClose} className="text-gray-400 hover:text-red-500">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <h3 className="text-xl font-bold text-brand-dark mb-2">{currentStep.title}</h3>
                        <p className="text-gray-600 mb-6 leading-relaxed">
                            {currentStep.content}
                        </p>

                        <div className="flex justify-between items-center">
                            <button
                                onClick={handlePrev}
                                disabled={currentStepIndex === 0}
                                className={`text-sm font-bold ${currentStepIndex === 0 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:text-brand-dark'}`}
                            >
                                Quay lại
                            </button>
                            <button
                                onClick={handleNext}
                                className="px-6 py-2 bg-brand-teal hover:bg-teal-400 text-brand-dark font-bold rounded-lg shadow-lg shadow-teal-500/30 transition-all transform hover:scale-105"
                            >
                                {currentStepIndex === steps.length - 1 ? 'Hoàn tất' : 'Tiếp theo'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>,
        document.body
    );
};
