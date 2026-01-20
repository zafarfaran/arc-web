// ========================================
// Recent Activity Component (for Reports)
// ========================================

import { useEffect, useState } from 'react';
import { Timer, Flame, Target, CheckSquare, Milestone, Gift, Clock } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { fetchXPHistory } from '../../services/xpService';
import type { XPSource, XPEvent } from '../../types';
import './RecentActivity.css';

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
    session: '#f97316',
    habit: '#22c55e',
    goal: '#06b6d4',
    todo: '#3b82f6',
    milestone: '#8b5cf6',
    daily: '#eab308',
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
    if (diffDays < 7) return `${diffDays}d ago`;
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

type DateFilter = 'all' | 'today' | 'yesterday' | 'week';

export default function RecentActivity() {
    const { state } = useApp();
    const [filter, setFilter] = useState<DateFilter>('all');
    const [activities, setActivities] = useState<XPEvent[]>([]);
    const [loading, setLoading] = useState(false);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [cursorStack, setCursorStack] = useState<any[]>([null]); // Stack of startAfter docs
    const [hasMore, setHasMore] = useState(false);
    const [isLegacyMode, setIsLegacyMode] = useState(false);

    const ITEMS_PER_PAGE = 8;

    // Get date range for filter
    const getDateRange = (filterType: DateFilter) => {
        const start = new Date();
        const end = new Date();

        if (filterType === 'today') {
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
            return { start, end };
        }
        if (filterType === 'yesterday') {
            start.setDate(start.getDate() - 1);
            start.setHours(0, 0, 0, 0);
            end.setDate(end.getDate() - 1);
            end.setHours(23, 59, 59, 999);
            return { start, end };
        }
        if (filterType === 'week') {
            start.setDate(start.getDate() - 7);
            start.setHours(0, 0, 0, 0);
            return { start, end: undefined }; // End is now
        }
        return { start: undefined, end: undefined }; // All time
    };

    // Helper to filter and paginate local data
    const getLocalData = () => {
        if (!state.user?.xp?.xpHistory) return { paginated: [], hasMore: false };

        let localData = [...state.user.xp.xpHistory]
            .filter(event => event.amount > 0 || event.source === 'session')
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        // Apply Date Filter Locally
        if (filter === 'today') {
            const now = new Date();
            localData = localData.filter(e => new Date(e.timestamp).toDateString() === now.toDateString());
        } else if (filter === 'yesterday') {
            const y = new Date();
            y.setDate(y.getDate() - 1);
            localData = localData.filter(e => new Date(e.timestamp).toDateString() === y.toDateString());
        } else if (filter === 'week') {
            const w = new Date();
            w.setDate(w.getDate() - 7);
            localData = localData.filter(e => new Date(e.timestamp) >= w);
        }

        const total = localData.length;
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        const paginated = localData.slice(startIndex, startIndex + ITEMS_PER_PAGE);

        return {
            paginated,
            hasMore: startIndex + ITEMS_PER_PAGE < total
        };
    };

    // Load activities when filter or page changes
    useEffect(() => {
        const loadActivities = async () => {
            if (!state.user?.id) return;

            setLoading(true);

            // If we've detected legacy mode (backend empty), use local data exclusively
            if (isLegacyMode) {
                const { paginated, hasMore } = getLocalData();
                setActivities(paginated);
                setHasMore(hasMore);
                setLoading(false);
                return;
            }

            const { start, end } = getDateRange(filter);
            const lastDoc = cursorStack[currentPage - 1];

            const result = await fetchXPHistory(
                state.user.id,
                ITEMS_PER_PAGE,
                lastDoc,
                start,
                end
            );

            // FALLBACK CHECK: If backend returns no data on page 1, verify if we should switch to legacy mode
            if (result.events.length === 0 && currentPage === 1 && state.user?.xp?.xpHistory?.length > 0) {
                setIsLegacyMode(true);
                const { paginated, hasMore } = getLocalData();
                setActivities(paginated);
                setHasMore(hasMore);
            } else {
                setActivities(result.events);
                setHasMore(result.events.length === ITEMS_PER_PAGE && !!result.lastVisible);

                if (result.lastVisible && currentPage === cursorStack.length) {
                    setCursorStack(prev => [...prev, result.lastVisible]);
                }
            }

            setLoading(false);
        };

        loadActivities();
    }, [filter, currentPage, state.user?.id]); // Note: cursorStack is not a dependency to avoid loops

    // Reset pagination on filter change
    useEffect(() => {
        setCurrentPage(1);
        setCursorStack([null]);
    }, [filter]);

    const handleNext = () => {
        setCurrentPage(p => p + 1);
    };

    const handlePrev = () => {
        setCurrentPage(p => Math.max(1, p - 1));
    };

    return (
        <div className="recent-activity-card">
            <div className="recent-activity-header">
                <span className="recent-activity-title">RECENT ACTIVITY</span>
                <div className="recent-activity-filters">
                    {(['today', 'yesterday', 'week', 'all'] as DateFilter[]).map((f) => (
                        <button
                            key={f}
                            className={`activity-filter-btn ${filter === f ? 'active' : ''}`}
                            onClick={() => setFilter(f)}
                        >
                            {f.charAt(0).toUpperCase() + f.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {!state.isAuthenticated ? (
                <div className="recent-activity-empty">
                    <Clock size={20} />
                    <span>Sign in to see activity</span>
                </div>
            ) : loading ? (
                <div className="recent-activity-empty">
                    <div className="loading-spinner user-loading" style={{ width: 24, height: 24 }} />
                </div>
            ) : activities.length === 0 ? (
                <div className="recent-activity-empty">
                    <Clock size={20} />
                    <span>No activity {filter !== 'all' ? `for ${filter}` : 'yet'}</span>
                </div>
            ) : (
                <>
                    <div className="recent-activity-list">
                        {activities.map((event, index) => {
                            const Icon = SOURCE_ICONS[event.source] || Timer;
                            const color = SOURCE_COLORS[event.source] || 'var(--text-muted)';

                            return (
                                <div
                                    key={event.id}
                                    className="recent-activity-item"
                                    style={{ animationDelay: `${index * 30}ms` }}
                                >
                                    <div
                                        className="recent-activity-icon"
                                        style={{ backgroundColor: `${color}15`, color }}
                                    >
                                        <Icon size={14} />
                                    </div>
                                    <div className="recent-activity-content">
                                        <span className="recent-activity-desc">{event.description}</span>
                                        <span className="recent-activity-time">{formatRelativeTime(event.timestamp)}</span>
                                    </div>
                                    {event.amount > 0 && (
                                        <div className="recent-activity-xp">
                                            +{event.amount}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    <div className="pagination-controls">
                        <button
                            className="pagination-btn"
                            disabled={currentPage === 1 || loading}
                            onClick={handlePrev}
                        >
                            Prev
                        </button>
                        <span className="pagination-info">
                            Page {currentPage}
                        </span>
                        <button
                            className="pagination-btn"
                            disabled={!hasMore || loading}
                            onClick={handleNext}
                        >
                            Next
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
