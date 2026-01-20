// ========================================
// Timer Context - Global Timer State
// ========================================

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import type { TimerState, TimerMode } from '../types';
import { useTimer as useTimerHook } from '../hooks/useTimer';
import { useApp } from './AppContext';
import { formatTime, generateId } from '../utils/helpers';

interface TimerContextType {
    timerState: TimerState;
    progress: number;
    start: (goal?: string, tags?: string[]) => void;
    pause: () => void;
    resume: () => void;
    stop: () => void;
    skip: () => void;
    setMode: (mode: TimerMode) => void;
}

const TimerContext = createContext<TimerContextType | undefined>(undefined);

const SESSION_COUNTER_KEY = 'arc_session_counter';
const SESSION_COUNTER_DATE_KEY = 'arc_session_counter_date';

export function TimerProvider({ children }: { children: React.ReactNode }) {
    const { state: appState, createSession, completeSession, cancelSession } = useApp();
    const { timerSettings } = appState;

    // Track current session ID to avoid stale closure issues
    const currentSessionIdRef = useRef<string | null>(null);

    // Load initial session count from localStorage
    const [initialCount] = useState(() => {
        const today = new Date().toDateString();
        const storedDate = localStorage.getItem(SESSION_COUNTER_DATE_KEY);
        if (storedDate === today) {
            return parseInt(localStorage.getItem(SESSION_COUNTER_KEY) || '0', 10);
        }
        return 0;
    });

    const handleSessionComplete = (mode: TimerMode, duration: number) => {
        if (mode === 'focus' && currentSessionIdRef.current) {
            completeSession(currentSessionIdRef.current, duration);
            currentSessionIdRef.current = null;
        }

        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(
                mode === 'focus' ? '🍅 Focus session complete!' : '☕ Break time over!',
                { body: mode === 'focus' ? 'Time for a break!' : 'Ready to focus?' }
            );
        }
    };

    const {
        state: timerState,
        progress,
        start,
        pause,
        resume,
        stop,
        skip,
        setMode,
    } = useTimerHook({
        ...timerSettings,
        initialSessionsCompleted: initialCount,
        onSessionComplete: handleSessionComplete,
    });

    // Update browser tab title with timer countdown
    useEffect(() => {
        const timeStr = formatTime(timerState.timeRemaining);
        const sessionCount = timerState.sessionsCompleted;

        if (timerState.status === 'running' || timerState.status === 'paused') {
            const modeEmoji = timerState.mode === 'focus' ? '🍅' : '☕';
            const pausedIndicator = timerState.status === 'paused' ? '⏸ ' : '';
            document.title = `${pausedIndicator}${timeStr} ${modeEmoji} Session ${sessionCount + 1} | Arc`;
        } else {
            // Only update title if we are not on the timer page? 
            // Actually, let's keep it consistent.
            if (sessionCount > 0) {
                document.title = `Arc • ${sessionCount} sessions today`;
            } else {
                document.title = 'Arc';
            }
        }
    }, [timerState.timeRemaining, timerState.status, timerState.mode, timerState.sessionsCompleted]);

    // Persist session counter to localStorage (resets daily)
    useEffect(() => {
        const today = new Date().toDateString();
        localStorage.setItem(SESSION_COUNTER_DATE_KEY, today);
        localStorage.setItem(SESSION_COUNTER_KEY, timerState.sessionsCompleted.toString());
    }, [timerState.sessionsCompleted]);

    const handleStart = (goal?: string, tags?: string[]) => {
        if (timerState.mode === 'focus') {
            // Generate session ID synchronously so we have it for handleStop
            const sessionId = generateId();
            currentSessionIdRef.current = sessionId;

            // Create session in background (ID is already set in ref)
            createSession(timerState.mode, timerState.totalTime, goal, tags, sessionId).catch(err => {
                console.error('Failed to create session:', err);
            });
        }
        start(goal, tags);
    };

    // Handle stop - save incomplete session with elapsed time
    const handleStop = () => {
        if (timerState.mode === 'focus' && timerState.status !== 'idle' && currentSessionIdRef.current) {
            // Calculate elapsed time (total time - remaining time)
            const elapsedTime = timerState.totalTime - timerState.timeRemaining;
            cancelSession(currentSessionIdRef.current, elapsedTime);
            currentSessionIdRef.current = null;
        }
        stop();
    };

    const handleSetMode = (mode: TimerMode) => {
        // If switching away from focus mode while active, save the session
        if (timerState.mode === 'focus' && timerState.status !== 'idle' && currentSessionIdRef.current) {
            const elapsedTime = timerState.totalTime - timerState.timeRemaining;
            cancelSession(currentSessionIdRef.current, elapsedTime);
            currentSessionIdRef.current = null;
        }
        setMode(mode);
    };

    const value: TimerContextType = {
        timerState,
        progress,
        start: handleStart,
        pause,
        resume,
        stop: handleStop,
        skip,
        setMode: handleSetMode,
    };

    return (
        <TimerContext.Provider value={value}>
            {children}
        </TimerContext.Provider>
    );
}

export function useTimerContext() {
    const context = useContext(TimerContext);
    if (context === undefined) {
        throw new Error('useTimerContext must be used within a TimerProvider');
    }
    return context;
}
