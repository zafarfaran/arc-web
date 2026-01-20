// ========================================
// Update Progress Modal - User-Friendly Increment Input
// ========================================

import { useState } from 'react';
import { X, Plus, Minus, TrendingUp } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import type { Goal } from '../../types';
import './UpdateProgressModal.css';

interface UpdateProgressModalProps {
    goal: Goal;
    onClose: () => void;
}

// Get appropriate quick-add values based on target size
function getQuickAddValues(target: number): number[] {
    if (target >= 1000000) return [10000, 50000, 100000, 250000, 500000];
    if (target >= 100000) return [1000, 5000, 10000, 25000, 50000];
    if (target >= 10000) return [100, 500, 1000, 2500, 5000];
    if (target >= 1000) return [10, 50, 100, 250, 500];
    if (target >= 100) return [5, 10, 25, 50, 100];
    return [1, 2, 5, 10, 25];
}

// Format large numbers with K/M suffixes
function formatQuickAdd(value: number): string {
    if (value >= 1000000) return `${value / 1000000}M`;
    if (value >= 1000) return `${value / 1000}K`;
    return value.toString();
}

export default function UpdateProgressModal({ goal, onClose }: UpdateProgressModalProps) {
    const { updateGoalProgress } = useApp();
    const [increment, setIncrement] = useState('');
    const [note, setNote] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isShaking, setIsShaking] = useState(false);

    const incrementValue = parseFloat(increment) || 0;
    const isDecreasing = goal.targetDirection === 'decrease';
    const newValue = isDecreasing
        ? goal.currentValue - incrementValue
        : goal.currentValue + incrementValue;

    const totalDelta = isDecreasing
        ? goal.startingValue - goal.targetValue
        : goal.targetValue - goal.startingValue;

    const oldCurrentDelta = isDecreasing
        ? goal.startingValue - goal.currentValue
        : goal.currentValue - goal.startingValue;

    const newCurrentDelta = isDecreasing
        ? goal.startingValue - newValue
        : newValue - goal.startingValue;

    const oldProgress = totalDelta === 0 ? 100 : Math.max(0, Math.min(100, Math.round((oldCurrentDelta / totalDelta) * 100)));
    const newProgress = totalDelta === 0 ? 100 : Math.max(0, Math.min(100, Math.round((newCurrentDelta / totalDelta) * 100)));

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const val = parseFloat(increment);
        if (isNaN(val) || val <= 0) {
            setError('Please enter a positive number.');
            setIsShaking(true);
            setTimeout(() => setIsShaking(false), 500);
            return;
        }

        updateGoalProgress(goal.id, newValue, note.trim() || undefined);
        onClose();
    };

    const quickAdd = (amount: number) => {
        const current = parseFloat(increment) || 0;
        setIncrement((current + amount).toString());
    };

    return (
        <div className="modal-overlay modal-fade-in" onClick={onClose}>
            <div className={`modal-content update-progress-modal modal-slide-up ${isShaking ? 'shake' : ''}`} onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title">UPDATE PROGRESS</h2>
                    <button className="btn btn-ghost btn-icon" onClick={onClose}>
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        {/* Current Status */}
                        <div className="current-status">
                            <span className="status-current">{goal.currentValue}</span>
                            <span className="status-divider">/</span>
                            <span className="status-target">{goal.targetValue}</span>
                            <span className="status-unit">{goal.unit}</span>
                        </div>

                        {/* Progress Bar */}
                        <div className="progress-preview">
                            <div className="progress-bar-container">
                                <div
                                    className="progress-bar-old"
                                    style={{ width: `${oldProgress}%` }}
                                />
                                <div
                                    className="progress-bar-new"
                                    style={{ width: `${newProgress}%`, background: goal.color }}
                                />
                            </div>
                            <div className="progress-labels">
                                <span>{oldProgress}%</span>
                                {incrementValue !== 0 && (
                                    <>
                                        <span className="arrow">→</span>
                                        <span className="new-percent" style={{ color: goal.color }}>{newProgress}%</span>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Increment Input */}
                        <div className={`input-group ${error ? 'has-error' : ''}`}>
                            <label className="input-label-minimal">ADD PROGRESS</label>
                            <div className="increment-input-container">
                                <button
                                    type="button"
                                    className="increment-btn"
                                    onClick={() => quickAdd(-1)}
                                >
                                    <Minus size={14} />
                                </button>
                                <div className="increment-field">
                                    <span className="increment-prefix">{goal.targetDirection === 'decrease' ? '-' : '+'}</span>
                                    <input
                                        type="number"
                                        className="increment-input"
                                        value={increment}
                                        onChange={(e) => {
                                            setIncrement(e.target.value);
                                            if (error) setError(null);
                                        }}
                                        placeholder="0"
                                        step="any"
                                        autoFocus
                                    />
                                    <span className="increment-unit">{goal.unit}</span>
                                </div>
                                <button
                                    type="button"
                                    className="increment-btn"
                                    onClick={() => quickAdd(1)}
                                >
                                    <Plus size={14} />
                                </button>
                            </div>
                            {error && <span className="error-message">{error}</span>}
                        </div>

                        {/* Quick Add Buttons - Scale based on target */}
                        <div className="quick-add-row">
                            {getQuickAddValues(goal.targetValue).map(amt => (
                                <button
                                    key={amt}
                                    type="button"
                                    className="quick-add-btn"
                                    onClick={() => quickAdd(amt)}
                                >
                                    +{formatQuickAdd(amt)}
                                </button>
                            ))}
                        </div>

                        {/* New Total Preview */}
                        {incrementValue !== 0 && (
                            <div className="new-total">
                                New total: <strong>{newValue.toFixed(1)} {goal.unit}</strong>
                            </div>
                        )}

                        {/* Note Input */}
                        <div className="input-group">
                            <label className="input-label-minimal">NOTE (OPTIONAL)</label>
                            <input
                                type="text"
                                className="input input-clean"
                                placeholder="What did you accomplish?"
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="modal-footer">
                        <button type="button" className="btn btn-ghost" onClick={onClose}>
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={incrementValue === 0}
                        >
                            <TrendingUp size={14} />
                            {goal.targetDirection === 'decrease' ? 'Subtract' : 'Add'} {Math.abs(incrementValue) || 0} {goal.unit}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
