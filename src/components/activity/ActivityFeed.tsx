// ========================================
// Activity Feed Component
// ========================================

import { useMemo } from 'react';
import { Timer, Flame, Target, CheckSquare, Milestone, Gift, Clock } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import type { XPEvent, XPSource } from '../../types';
import './ActivityFeed.css';

// Icon mapping for activity types
const SOURCE_ICONS: Record<XPSource, React.ElementType> = {
    session: Timer,
    habit: Flame,
    goal: Target,
    todo: CheckSquare,
    milestone: Milestone,
    daily: Gift,
};

// Color mapping for activity types
const SOURCE_COLORS: Record<XPSource, string> = {
    session: '#f97316', // Primary orange
    habit: '#22c55e',   // Green
    goal: '#06b6d4',    // Cyan
    todo: '#3b82f6',    // Blue
    milestone: '#8b5cf6', // Purple
    daily: '#eab308',   // Yellow
};

// Format relative time
function formatRelativeTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Group activities by date
function groupByDate(events: XPEvent[]): Map<string, XPEvent[]> {
    const groups = new Map<string, XPEvent[]>();
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();

    events.forEach(event => {
        const eventDate = new Date(event.timestamp).toDateString();
        let key: string;

        if (eventDate === today) {
            key = 'Today';
        } else if (eventDate === yesterday) {
            key = 'Yesterday';
        } else {
            key = new Date(event.timestamp).toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'short',
                day: 'numeric'
            });
        }

        if (!groups.has(key)) {
            groups.set(key, []);
        }
        groups.get(key)!.push(event);
    });

    return groups;
}

export default function ActivityFeed() {
    const { state } = useApp();

    const activities = useMemo(() => {
        if (!state.user?.xp?.xpHistory) return [];
        // Sort by timestamp descending and take last 50
        return [...state.user.xp.xpHistory]
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, 50);
    }, [state.user?.xp?.xpHistory]);

    const groupedActivities = useMemo(() => groupByDate(activities), [activities]);

    if (!state.isAuthenticated) {
        return (
            <div className="activity-screen">
                <div className="activity-empty">
                    <Clock size={48} />
                    <h2>Sign in to see your activity</h2>
                    <p>Your recent actions will appear here</p>
                </div>
            </div>
        );
    }

    if (activities.length === 0) {
        return (
            <div className="activity-screen">
                <div className="page-header">
                    <h1 className="page-title">
                        <span className="page-icon"><Clock size={18} /></span>
                        ACTIVITY
                    </h1>
                </div>
                <div className="activity-empty">
                    <Clock size={48} />
                    <h2>No activity yet</h2>
                    <p>Start a focus session, complete a task, or check in on a habit to see your activity here.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="activity-screen">
            <div className="page-header">
                <h1 className="page-title">
                    <span className="page-icon"><Clock size={18} /></span>
                    ACTIVITY
                </h1>
                <span className="activity-count">{activities.length} events</span>
            </div>

            <div className="activity-timeline">
                {Array.from(groupedActivities.entries()).map(([dateLabel, events]) => (
                    <div key={dateLabel} className="activity-group">
                        <div className="activity-date-header">
                            <span className="date-label">{dateLabel}</span>
                            <span className="date-count">{events.length}</span>
                        </div>
                        <div className="activity-list">
                            {events.map(event => {
                                const Icon = SOURCE_ICONS[event.source] || Clock;
                                const color = SOURCE_COLORS[event.source] || 'var(--text-muted)';

                                return (
                                    <div key={event.id} className="activity-item">
                                        <div
                                            className="activity-icon"
                                            style={{ backgroundColor: `${color}15`, color }}
                                        >
                                            <Icon size={16} />
                                        </div>
                                        <div className="activity-content">
                                            <span className="activity-description">{event.description}</span>
                                            <span className="activity-time">{formatRelativeTime(event.timestamp)}</span>
                                        </div>
                                        <div className="activity-xp" style={{ color }}>
                                            +{event.amount} XP
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
