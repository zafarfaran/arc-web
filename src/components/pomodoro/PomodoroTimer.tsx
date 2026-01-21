// ========================================
// Pomodoro Timer Component - Minimal Style
// ========================================

import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Square, SkipForward, Target, Timer, Coffee, Sunset, Settings } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { useTimerContext } from '../../contexts/TimerContext';
import { formatTime } from '../../utils/helpers';
import type { TimerMode } from '../../types';
import SessionGoalModal from './SessionGoalModal';
import SpotifyWidget from './SpotifyWidget';
import './PomodoroTimer.css';

export default function PomodoroTimer() {
    const { state: appState, updateTimerSettings } = useApp();
    const [showGoalModal, setShowGoalModal] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const settingsRef = useRef<HTMLDivElement>(null);

    // Close settings when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
                setShowSettings(false);
            }
        };
        if (showSettings) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showSettings]);

    const handleSettingChange = (key: 'focusDuration' | 'shortBreakDuration' | 'longBreakDuration', value: string | number) => {
        const numValue = typeof value === 'string' ? parseInt(value, 10) : value;
        if (!isNaN(numValue) && numValue >= 1 && numValue <= 120) {
            updateTimerSettings({ [key]: numValue });
        }
    };

    const {
        timerState,
        start,
        pause,
        resume,
        stop,
        skip,
        setMode,
    } = useTimerContext();

    const handleStartClick = () => {
        if (timerState.mode === 'focus' && timerState.status === 'idle') {
            setShowGoalModal(true);
        } else {
            start();
        }
    };

    const handleStartSession = (goal?: string, tags?: string[]) => {
        setShowGoalModal(false);
        start(goal, tags);
    };

    const handlePauseResume = () => {
        if (timerState.status === 'running') {
            pause();
        } else {
            resume();
        }
    };

    const getModeLabel = (mode: TimerMode): string => {
        switch (mode) {
            case 'focus': return 'Focus';
            case 'shortBreak': return 'Short Break';
            case 'longBreak': return 'Long Break';
        }
    };

    const getModeIcon = (mode: TimerMode) => {
        switch (mode) {
            case 'focus': return <Timer size={18} />;
            case 'shortBreak': return <Coffee size={18} />;
            case 'longBreak': return <Sunset size={18} />;
        }
    };

    const isRunning = timerState.status === 'running';

    return (
        <div className="focus-screen">
            {/* Top bar - fades out when running */}
            <div className={`focus-header ${isRunning ? 'fade-out' : ''}`}>
                <div className="focus-brand">
                    <span className="brand-dot" />
                    <span className="brand-name">ARC</span>
                </div>
                <div className="focus-stats">
                    <span className="stats-value">
                        {appState.sessions.filter(s =>
                            s.mode === 'focus' &&
                            s.status === 'completed' &&
                            new Date(s.startedAt).toDateString() === new Date().toDateString()
                        ).length}
                    </span>
                    <span className="stats-label">sessions today</span>
                </div>
            </div>

            {/* Centered content */}
            <div className="focus-main">
                {/* Goal/status line - fades out when running */}
                <div className={`focus-status ${isRunning ? 'fade-out' : ''}`}>
                    {timerState.currentGoal ? (
                        <>
                            <Target size={14} />
                            <span>{timerState.currentGoal}</span>
                        </>
                    ) : (
                        <span>Ready to focus?</span>
                    )}
                </div>

                {/* Large time display */}
                <div className="focus-time">{formatTime(timerState.timeRemaining)}</div>

                {/* Mode label */}
                <div className="focus-mode-label" style={{ color: timerState.mode === 'focus' ? 'var(--primary)' : 'var(--accent)' }}>
                    {getModeLabel(timerState.mode).toUpperCase()}
                </div>

                {/* Controls */}
                <div className="focus-controls">
                    {timerState.status === 'idle' ? (
                        <>
                            <div className="timer-settings-wrapper" ref={settingsRef}>
                                <button
                                    className="focus-btn secondary"
                                    onClick={() => setShowSettings(!showSettings)}
                                    title="Timer Settings"
                                >
                                    <Settings size={16} />
                                </button>
                                {showSettings && (
                                    <div className="timer-settings-popup">
                                        <div className="settings-row">
                                            <label>Focus</label>
                                            <div className="settings-input-group">
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max="120"
                                                    value={appState.timerSettings.focusDuration}
                                                    onChange={(e) => handleSettingChange('focusDuration', e.target.value)}
                                                />
                                                <span className="settings-unit">min</span>
                                            </div>
                                        </div>
                                        <div className="settings-row">
                                            <label>Short Break</label>
                                            <div className="settings-input-group">
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max="120"
                                                    value={appState.timerSettings.shortBreakDuration}
                                                    onChange={(e) => handleSettingChange('shortBreakDuration', e.target.value)}
                                                />
                                                <span className="settings-unit">min</span>
                                            </div>
                                        </div>
                                        <div className="settings-row">
                                            <label>Long Break</label>
                                            <div className="settings-input-group">
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max="120"
                                                    value={appState.timerSettings.longBreakDuration}
                                                    onChange={(e) => handleSettingChange('longBreakDuration', e.target.value)}
                                                />
                                                <span className="settings-unit">min</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <button className="focus-btn primary" onClick={handleStartClick}>
                                <Play size={18} />
                                <span>Start</span>
                            </button>
                        </>
                    ) : (
                        <>
                            <button className="focus-btn secondary" onClick={stop}>
                                <Square size={16} />
                            </button>
                            <button className="focus-btn primary" onClick={handlePauseResume}>
                                {timerState.status === 'running' ? <Pause size={18} /> : <Play size={18} />}
                                <span>{timerState.status === 'running' ? 'Pause' : 'Resume'}</span>
                            </button>
                            {timerState.mode !== 'focus' && (
                                <button className="focus-btn secondary" onClick={skip}>
                                    <SkipForward size={16} />
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Bottom toolbar - fades out when running */}
            <div className={`focus-toolbar ${isRunning ? 'fade-out' : ''}`}>
                <div className="toolbar-left">
                    <div className="mode-switcher">
                        {(['focus', 'shortBreak', 'longBreak'] as TimerMode[]).map((mode) => (
                            <button
                                key={mode}
                                className={`mode-btn ${timerState.mode === mode ? 'active' : ''}`}
                                onClick={() => setMode(mode)}
                                title={getModeLabel(mode)}
                            >
                                {getModeIcon(mode)}
                            </button>
                        ))}
                    </div>
                    <SpotifyWidget />
                </div>

                <div className="toolbar-info">
                    <span className="info-item">{timerState.sessionsCompleted} today</span>
                    <span className="info-divider">·</span>
                    <span className="info-item">{4 - (timerState.sessionsCompleted % 4)} until break</span>
                </div>
            </div>

            {/* Goal Modal */}
            {showGoalModal && (
                <SessionGoalModal
                    onStart={handleStartSession}
                    onClose={() => setShowGoalModal(false)}
                />
            )}

        </div>
    );
}
