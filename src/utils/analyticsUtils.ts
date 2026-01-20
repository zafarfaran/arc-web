import type { PomodoroSession, Todo, Tag, Habit } from '../types';

/**
 * Normalizes a date to YYYY-MM-DD string
 */
const formatDate = (date: Date): string => {
    return date.toISOString().split('T')[0];
};

/**
 * Gets the relative date (e.g. 7 days ago)
 */
const getRelativeDate = (days: number): Date => {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date;
};

// ... (keep isSameDay and getStartOfWeek as is, they are fine) ...
/**
 * Checks if two dates are same day
 */
const isSameDay = (d1: Date, d2: Date): boolean => {
    return (
        d1.getFullYear() === d2.getFullYear() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getDate() === d2.getDate()
    );
};

/**
 * Gets the start of the week (Monday)
 */
const getStartOfWeek = (date: Date): Date => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Monday start
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
};

/**
 * Aggregates all activity (sessions, todos, habits) by date
 */
export const getHeatmapData = (
    sessions: PomodoroSession[],
    todos: Todo[],
    habits: Habit[],
    days: number = 365
) => {
    const data: Record<string, number> = {};
    const startDate = getRelativeDate(days);

    // 1. Sessions
    sessions.forEach((session) => {
        if (session.status === 'completed' && session.mode === 'focus') {
            const sessionDate = new Date(session.startedAt);
            if (sessionDate >= startDate) {
                const dateKey = formatDate(sessionDate);
                data[dateKey] = (data[dateKey] || 0) + 1;
            }
        }
    });

    // 2. Completed Todos
    todos.forEach((todo) => {
        if (todo.completedAt) {
            const todoDate = new Date(todo.completedAt);
            if (todoDate >= startDate) {
                const dateKey = formatDate(todoDate);
                data[dateKey] = (data[dateKey] || 0) + 1;
            }
        }
    });

    // 3. Completed Habits
    habits.forEach((habit) => {
        habit.completedDates.forEach((dateString) => {
            const habitDate = new Date(dateString);
            if (habitDate >= startDate) {
                // Ensure format consistency
                const dateKey = dateString.split('T')[0];
                if (data[dateKey] !== undefined || habitDate >= startDate) {
                    data[dateKey] = (data[dateKey] || 0) + 1;
                }
            }
        });
    });

    return data;
};

/**
 * Aggregates focus time for the last 7 days (Monday to Sunday)
 */
export const getWeeklyFocusData = (sessions: PomodoroSession[]) => {
    const now = new Date();
    const weekStart = getStartOfWeek(now);

    const result = [];
    const daysMap = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    for (let i = 0; i < 7; i++) {
        const day = new Date(weekStart);
        day.setDate(weekStart.getDate() + i);

        const daySessions = sessions.filter(
            (s) =>
                s.status === 'completed' &&
                s.mode === 'focus' &&
                isSameDay(new Date(s.startedAt), day)
        );

        const totalMinutes = daySessions.reduce(
            (acc, s) => acc + (s.actualDuration || s.duration) / 60,
            0
        );

        result.push({
            date: daysMap[i],
            fullDate: day,
            minutes: Math.round(totalMinutes),
            isToday: isSameDay(day, now),
        });
    }

    return result;
};

/**
 * Calculates focus time distribution by tag
 */
export const getTagAnalytics = (sessions: PomodoroSession[], tags: Tag[], period: 'week' | 'month' = 'week') => {
    const now = new Date();
    let startDate: Date;

    if (period === 'week') {
        startDate = getStartOfWeek(now);
    } else {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const relevantSessions = sessions.filter(
        (s) => s.status === 'completed' && s.mode === 'focus' && new Date(s.startedAt) >= startDate
    );

    const tagData = tags.map((tag) => {
        const tagSessions = relevantSessions.filter((s) => (s.tags || []).includes(tag.id));
        const totalMinutes = tagSessions.reduce(
            (acc, s) => acc + (s.actualDuration || s.duration) / 60,
            0
        );

        return {
            id: tag.id,
            name: tag.name,
            color: tag.color,
            minutes: Math.round(totalMinutes),
            count: tagSessions.length,
        };
    });

    return tagData.filter((d) => d.minutes > 0).sort((a, b) => b.minutes - a.minutes);
};

/**
 * Calculates productivity trends (WoW)
 */
export const getProductivityTrends = (sessions: PomodoroSession[], todos: Todo[]) => {
    const now = new Date();

    // Current week
    const currWeekStart = getStartOfWeek(now);
    const currWeekSessions = sessions.filter(
        (s) => s.status === 'completed' && s.mode === 'focus' && new Date(s.startedAt) >= currWeekStart
    );
    const currWeekTodos = todos.filter(
        (t) => t.completed && t.completedAt && new Date(t.completedAt) >= currWeekStart
    );

    // Last week
    const prevWeekStart = new Date(currWeekStart);
    prevWeekStart.setDate(prevWeekStart.getDate() - 7);
    const prevWeekEnd = new Date(currWeekStart);
    prevWeekEnd.setMilliseconds(-1);

    const prevWeekSessions = sessions.filter(
        (s) =>
            s.status === 'completed' &&
            s.mode === 'focus' &&
            new Date(s.startedAt) >= prevWeekStart &&
            new Date(s.startedAt) <= prevWeekEnd
    );
    const prevWeekTodos = todos.filter(
        (t) =>
            t.completed &&
            t.completedAt &&
            new Date(t.completedAt) >= prevWeekStart &&
            new Date(t.completedAt) <= prevWeekEnd
    );

    const calculateChange = (curr: number, prev: number) => {
        if (prev === 0) return curr > 0 ? 100 : 0;
        return Math.round(((curr - prev) / prev) * 100);
    };

    const currTime = currWeekSessions.reduce((acc, s) => acc + (s.actualDuration || s.duration), 0);
    const prevTime = prevWeekSessions.reduce((acc, s) => acc + (s.actualDuration || s.duration), 0);
    const currTimeMinutes = Math.floor(currTime / 60);
    const prevTimeMinutes = Math.floor(prevTime / 60);
    const currHours = Math.floor(currTimeMinutes / 60);
    const currMins = currTimeMinutes % 60;

    return [
        {
            label: 'Sessions',
            value: currWeekSessions.length,
            change: calculateChange(currWeekSessions.length, prevWeekSessions.length),
            unit: 'sessions',
        },
        {
            label: 'Focus Time',
            value: currHours > 0 ? currHours : currMins,
            change: calculateChange(currTimeMinutes, prevTimeMinutes),
            unit: currHours > 0 ? (currMins > 0 ? `h ${currMins}m` : 'hours') : 'mins',
        },
        {
            label: 'Tasks',
            value: currWeekTodos.length,
            change: calculateChange(currWeekTodos.length, prevWeekTodos.length),
            unit: 'completed',
        },
    ];
};

/**
 * Gets historical session data for last 6 weeks
 */
export const getHistoricalTrend = (sessions: PomodoroSession[]) => {
    const result = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
        const weekStart = getStartOfWeek(now);
        weekStart.setDate(weekStart.getDate() - i * 7);

        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 7);
        weekEnd.setMilliseconds(-1);

        const count = sessions.filter(
            (s) =>
                s.status === 'completed' &&
                s.mode === 'focus' &&
                new Date(s.startedAt) >= weekStart &&
                new Date(s.startedAt) <= weekEnd
        ).length;

        let label;
        if (i === 0) label = 'Now';
        else if (i === 1) label = 'Last week';
        else label = `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

        result.push({
            label,
            value: count,
        });
    }

    return result;
};

/**
 * Aggregates focus sessions by hour of the day (0-23)
 */
export const getHourlyProductivityData = (sessions: PomodoroSession[]) => {
    const hourlyData = Array.from({ length: 24 }, (_, i) => ({
        hour: i,
        count: 0,
        label: `${i}:00`
    }));

    sessions.forEach(session => {
        if (session.status === 'completed' && session.mode === 'focus') {
            const hour = new Date(session.startedAt).getHours();
            hourlyData[hour].count += 1;
        }
    });

    return hourlyData;
};

/**
 * Aggregates focus time by Day of Week for Radar Chart
 */
export const getDayOfWeekData = (sessions: PomodoroSession[]) => {
    const dayCounts = [0, 0, 0, 0, 0, 0, 0]; // Mon, Tue, Wed, Thu, Fri, Sat, Sun

    sessions.forEach(session => {
        if (session.status === 'completed' && session.mode === 'focus') {
            const date = new Date(session.startedAt);
            // getDay(): 0 = Sun, 1 = Mon ... 6 = Sat
            // We want 0 = Mon, ... 6 = Sun
            let dayIndex = date.getDay() - 1;
            if (dayIndex === -1) dayIndex = 6; // Sunday

            dayCounts[dayIndex] += (session.actualDuration || session.duration) / 60;
        }
    });

    const subjects = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const maxVal = Math.max(...dayCounts, 1); // Avoid 0 div

    return subjects.map((subject, i) => ({
        subject,
        minutes: Math.round(dayCounts[i]),
        fullMark: maxVal // Optional for scaling
    }));
};

/**
 * Aggregates comparison data: This Week vs Last Week (Mon-Sun)
 */
export const getWeeklyComparisonData = (sessions: PomodoroSession[]) => {
    const now = new Date();
    const thisWeekStart = getStartOfWeek(now);
    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);

    // Arrays for Mon-Sun (0-6)
    const thisWeekCounts = [0, 0, 0, 0, 0, 0, 0];
    const lastWeekCounts = [0, 0, 0, 0, 0, 0, 0];

    sessions.forEach(session => {
        if (session.status === 'completed' && session.mode === 'focus') {
            const date = new Date(session.startedAt);
            const minutes = (session.actualDuration || session.duration) / 60;

            // Check range
            // This Week
            if (date >= thisWeekStart && date < new Date(thisWeekStart.getTime() + 7 * 24 * 60 * 60 * 1000)) {
                let dayIndex = date.getDay() - 1;
                if (dayIndex === -1) dayIndex = 6;
                thisWeekCounts[dayIndex] += minutes;
            }
            // Last Week
            else if (date >= lastWeekStart && date < thisWeekStart) {
                let dayIndex = date.getDay() - 1;
                if (dayIndex === -1) dayIndex = 6;
                lastWeekCounts[dayIndex] += minutes;
            }
        }
    });

    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    return days.map((day, i) => ({
        day,
        thisWeek: Math.round(thisWeekCounts[i]),
        lastWeek: Math.round(lastWeekCounts[i])
    }));
};
