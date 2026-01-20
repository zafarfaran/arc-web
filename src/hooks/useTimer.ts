// ========================================
// useTimer Hook - Timer Logic
// ========================================

import { useState, useRef, useCallback, useEffect } from 'react';
import type { TimerMode, TimerState } from '../types';

interface UseTimerOptions {
    focusDuration: number; // minutes
    shortBreakDuration: number; // minutes
    longBreakDuration: number; // minutes
    autoStartBreaks: boolean;
    initialSessionsCompleted?: number;
    onSessionComplete?: (mode: TimerMode, duration: number) => void;
}

export function useTimer(options: UseTimerOptions) {
    const {
        focusDuration,
        shortBreakDuration,
        longBreakDuration,
        autoStartBreaks,
        initialSessionsCompleted = 0,
        onSessionComplete,
    } = options;

    const [state, setState] = useState<TimerState>(() => ({
        mode: 'focus',
        status: 'idle',
        timeRemaining: focusDuration * 60,
        totalTime: focusDuration * 60,
        sessionsCompleted: initialSessionsCompleted,
        currentGoal: undefined,
        currentTags: [],
    }));

    const intervalRef = useRef<number | null>(null);
    const sessionStartRef = useRef<number | null>(null);

    // Clear interval on unmount
    useEffect(() => {
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, []);

    // Update total time when settings change
    useEffect(() => {
        if (state.status === 'idle') {
            const newTotalTime = getDurationForMode(state.mode) * 60;
            setState((prev) => ({
                ...prev,
                timeRemaining: newTotalTime,
                totalTime: newTotalTime,
            }));
        }
    }, [focusDuration, shortBreakDuration, longBreakDuration, state.mode, state.status]);

    const getDurationForMode = useCallback(
        (mode: TimerMode): number => {
            switch (mode) {
                case 'focus':
                    return focusDuration;
                case 'shortBreak':
                    return shortBreakDuration;
                case 'longBreak':
                    return longBreakDuration;
            }
        },
        [focusDuration, shortBreakDuration, longBreakDuration]
    );

    const getNextMode = useCallback((): TimerMode => {
        if (state.mode !== 'focus') {
            return 'focus';
        }
        // After 4 focus sessions, take a long break
        const nextSessionCount = state.sessionsCompleted + 1;
        if (nextSessionCount % 4 === 0) {
            return 'longBreak';
        }
        return 'shortBreak';
    }, [state.mode, state.sessionsCompleted]);

    const tick = useCallback(() => {
        setState((prev) => {
            if (prev.timeRemaining <= 1) {
                // Timer completed
                if (intervalRef.current) {
                    clearInterval(intervalRef.current);
                    intervalRef.current = null;
                }

                const elapsedTime = prev.totalTime;
                const completedMode = prev.mode;

                // Calculate next state
                const nextMode = completedMode === 'focus'
                    ? ((prev.sessionsCompleted + 1) % 4 === 0 ? 'longBreak' : 'shortBreak')
                    : 'focus';

                const nextDuration = getDurationForMode(nextMode) * 60;
                const newSessionsCompleted = completedMode === 'focus'
                    ? prev.sessionsCompleted + 1
                    : prev.sessionsCompleted;

                // Call completion callback
                if (onSessionComplete) {
                    onSessionComplete(completedMode, elapsedTime);
                }

                // Determine if we should auto-start the next session
                // When autoStartBreaks is enabled, the entire cycle is automatic:
                // focus → break → focus → break → ... (long break every 4 sessions)
                const shouldAutoStart = autoStartBreaks;

                // For auto-started focus sessions, add session counter to goal
                let nextGoal = prev.currentGoal;
                if (nextMode === 'focus' && shouldAutoStart && prev.currentGoal) {
                    // Check if goal already has a counter (e.g., "Work (Session 2)")
                    const counterMatch = prev.currentGoal.match(/^(.+?)\s*\(Session\s*(\d+)\)$/);
                    if (counterMatch) {
                        // Increment existing counter
                        const baseName = counterMatch[1];
                        const currentCount = parseInt(counterMatch[2], 10);
                        nextGoal = `${baseName} (Session ${currentCount + 1})`;
                    } else {
                        // Add counter for the first time (this becomes session 2)
                        nextGoal = `${prev.currentGoal} (Session 2)`;
                    }
                }

                // Preserve tags for auto-started sessions, clear otherwise
                const nextTags = shouldAutoStart ? prev.currentTags : [];
                const nextGoalValue = shouldAutoStart ? nextGoal : undefined;

                return {
                    ...prev,
                    mode: nextMode,
                    status: shouldAutoStart ? 'running' : 'idle',
                    timeRemaining: nextDuration,
                    totalTime: nextDuration,
                    sessionsCompleted: newSessionsCompleted,
                    currentGoal: nextGoalValue,
                    currentTags: nextTags,
                };
            }

            return {
                ...prev,
                timeRemaining: prev.timeRemaining - 1,
            };
        });
    }, [getDurationForMode, autoStartBreaks, onSessionComplete]);

    // Auto-start interval when status is 'running' but no interval exists
    // This handles the case when tick() sets status to 'running' for auto-start
    useEffect(() => {
        if (state.status === 'running' && !intervalRef.current) {
            intervalRef.current = window.setInterval(tick, 1000);
        }
    }, [state.status, tick]);

    const start = useCallback((goal?: string, tags?: string[]) => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }

        sessionStartRef.current = Date.now();

        setState((prev) => ({
            ...prev,
            status: 'running',
            currentGoal: goal ?? prev.currentGoal,
            currentTags: tags ?? prev.currentTags,
        }));

        intervalRef.current = window.setInterval(tick, 1000);
    }, [tick]);

    const pause = useCallback(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
        setState((prev) => ({ ...prev, status: 'paused' }));
    }, []);

    const resume = useCallback(() => {
        if (intervalRef.current) return;

        intervalRef.current = window.setInterval(tick, 1000);
        setState((prev) => ({ ...prev, status: 'running' }));
    }, [tick]);

    const stop = useCallback(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }

        const duration = getDurationForMode(state.mode) * 60;

        setState((prev) => ({
            ...prev,
            status: 'idle',
            timeRemaining: duration,
            totalTime: duration,
            currentGoal: undefined,
            currentTags: [],
        }));
    }, [getDurationForMode, state.mode]);

    const skip = useCallback(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }

        const nextMode = getNextMode();
        const nextDuration = getDurationForMode(nextMode) * 60;

        setState((prev) => ({
            ...prev,
            mode: nextMode,
            status: 'idle',
            timeRemaining: nextDuration,
            totalTime: nextDuration,
            currentGoal: undefined,
            currentTags: [],
        }));
    }, [getNextMode, getDurationForMode]);

    const setMode = useCallback((mode: TimerMode) => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }

        const duration = getDurationForMode(mode) * 60;

        setState((prev) => ({
            ...prev,
            mode,
            status: 'idle',
            timeRemaining: duration,
            totalTime: duration,
            currentGoal: undefined,
            currentTags: [],
        }));
    }, [getDurationForMode]);

    const progress = state.totalTime > 0
        ? ((state.totalTime - state.timeRemaining) / state.totalTime) * 100
        : 0;

    return {
        state,
        progress,
        start,
        pause,
        resume,
        stop,
        skip,
        setMode,
    };
}
