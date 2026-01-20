// ========================================
// Utility Helper Functions
// ========================================

/**
 * Generate a unique ID
 */
export function generateId(): string {
    return `${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Format seconds to MM:SS display
 */
export function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format seconds to human readable duration (e.g., "25 min", "1h 30m")
 */
export function formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
        return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    }
    return `${minutes} min`;
}

/**
 * Get today's date as ISO string (YYYY-MM-DD)
 */
export function getTodayISO(): string {
    return new Date().toISOString().split('T')[0];
}

/**
 * Format date to relative string (Today, Yesterday, or date)
 */
export function formatRelativeDate(date: Date): string {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const dateStr = date.toISOString().split('T')[0];
    const todayStr = today.toISOString().split('T')[0];
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    if (dateStr === todayStr) return 'Today';
    if (dateStr === yesterdayStr) return 'Yesterday';

    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
    });
}

/**
 * Clamp a number between min and max
 */
export function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
}

/**
 * Calculate percentage
 */
export function percentage(value: number, total: number): number {
    if (total === 0) return 0;
    return Math.round((value / total) * 100);
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: unknown[]) => void>(
    fn: T,
    delay: number
): (...args: Parameters<T>) => void {
    let timeoutId: ReturnType<typeof setTimeout>;
    return (...args: Parameters<T>) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn(...args), delay);
    };
}

/**
 * Local storage helpers with JSON parsing
 */
export const storage = {
    get<T>(key: string, defaultValue: T): T {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch {
            return defaultValue;
        }
    },

    set<T>(key: string, value: T): void {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (error) {
            console.error('Failed to save to localStorage:', error);
        }
    },

    remove(key: string): void {
        try {
            localStorage.removeItem(key);
        } catch (error) {
            console.error('Failed to remove from localStorage:', error);
        }
    },
};

/**
 * Priority color mapping
 */
export function getPriorityColor(priority?: 'high' | 'medium' | 'low'): string {
    switch (priority) {
        case 'high':
            return '#F87171'; // error color
        case 'medium':
            return '#FFB84D'; // warning color
        case 'low':
            return '#34D399'; // success color
        default:
            return '#64748B'; // muted color
    }
}

/**
 * Check if a date is overdue
 */
export function isOverdue(date: Date): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    return checkDate < today;
}

/**
 * Format number with K/M suffixes (e.g. 1500 -> 1.5K)
 */
export function formatCompactNumber(value: number): string {
    if (value >= 1000000) {
        return (value / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    }
    if (value >= 1000) {
        return (value / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    }
    return value.toString();
}

/**
 * Check if a date is today
 */
export function isToday(date: Date): boolean {
    const today = new Date();
    return (
        date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear()
    );
}
