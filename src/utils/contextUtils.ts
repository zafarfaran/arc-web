// ========================================
// Context Utilities for AI Assistant
// ========================================

import type { Todo, Habit, User } from '../types';

interface AppState {
    todos: Todo[];
    habits: Habit[];
    user: User | null;
}

/**
 * Build a context summary to prepend to user messages.
 * This gives the AI awareness of the current date and basic user state.
 */
export function buildContextMessage(state: AppState): string {
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    const timeStr = now.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit'
    });

    const parts: string[] = [
        `[Context: Today is ${dateStr}, ${timeStr}]`
    ];

    // Add user name if available
    if (state.user?.name) {
        parts.push(`[User: ${state.user.name}]`);
    }

    // Quick stats (the AI can fetch details via tools)
    const activeTodos = state.todos.filter((t: Todo) => !t.completed).length;
    const todayStr = now.toISOString().split('T')[0];
    const habitsCompletedToday = state.habits.filter((h: Habit) =>
        h.completedDates.includes(todayStr) &&
        h.targetDays.includes(now.getDay())
    ).length;
    const habitsDueToday = state.habits.filter((h: Habit) =>
        h.targetDays.includes(now.getDay())
    ).length;

    parts.push(`[Quick stats: ${activeTodos} active todos, ${habitsCompletedToday}/${habitsDueToday} habits done today]`);

    return parts.join(' ');
}

/**
 * Prepend context to the first user message in a conversation.
 * Only adds context if it's not already present.
 */
export function addContextToMessages(
    messages: Array<{ role: string; content: string }>,
    state: AppState
): Array<{ role: string; content: string }> {
    if (messages.length === 0) return messages;

    // Find the first user message
    const firstUserIndex = messages.findIndex(m => m.role === 'user');
    if (firstUserIndex === -1) return messages;

    // Check if context is already added (starts with [Context:)
    if (messages[firstUserIndex].content.startsWith('[Context:')) {
        return messages;
    }

    // Clone messages and add context to first user message
    const result = [...messages];
    const contextStr = buildContextMessage(state);

    result[firstUserIndex] = {
        ...result[firstUserIndex],
        content: `${contextStr}\n\n${result[firstUserIndex].content}`
    };

    return result;
}
