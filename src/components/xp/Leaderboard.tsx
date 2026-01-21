// ========================================
// Leaderboard Component - Minimal Design
// ========================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { type LeaderboardEntry } from '../../types';
import {
    fetchLeaderboard,
    getUserGlobalRank,
    type LeaderboardPeriod,
    type UserRankInfo
} from '../../services/xpService';
import { useApp } from '../../contexts/AppContext';
import RankIcon from './RankIcon';
import './Leaderboard.css';

const ENTRIES_PER_PAGE = 20;

const PERIOD_OPTIONS: { value: LeaderboardPeriod; label: string }[] = [
    { value: 'weekly', label: 'Week' },
    { value: 'monthly', label: 'Month' },
    { value: 'allTime', label: 'All Time' },
];

export default function Leaderboard() {
    const { state } = useApp();
    const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [period, setPeriod] = useState<LeaderboardPeriod>('allTime');
    const [hasMore, setHasMore] = useState(false);
    const [hasPrev, setHasPrev] = useState(false);
    const [userRank, setUserRank] = useState<UserRankInfo | null>(null);
    const [currentPage, setCurrentPage] = useState(1);

    // Store pagination cursors for each page
    const pageDocsRef = useRef<Map<number, any>>(new Map());

    // Load leaderboard for a specific page
    const loadPage = useCallback(async (page: number, startDoc: any = null) => {
        setIsLoading(true);
        setEntries([]);

        try {
            const result = await fetchLeaderboard(
                period,
                ENTRIES_PER_PAGE,
                startDoc
            );

            setEntries(result.entries);
            setHasMore(result.hasMore);
            setHasPrev(page > 1);

            // Store the last doc for this page (used to load next page)
            if (result.lastDoc) {
                pageDocsRef.current.set(page, result.lastDoc);
            }
        } catch (error) {
            console.error('Failed to load leaderboard:', error);
        }

        setIsLoading(false);
    }, [period]);

    // Load user's rank
    const loadUserRank = useCallback(async () => {
        if (!state.user?.id) return;

        try {
            const rank = await getUserGlobalRank(state.user.id);
            setUserRank(rank);
        } catch (error) {
            console.error('Failed to load user rank:', error);
        }
    }, [state.user?.id]);

    // Initial load and period change
    useEffect(() => {
        pageDocsRef.current.clear();
        setCurrentPage(1);
        loadPage(1, null);
        loadUserRank();
    }, [period, loadPage, loadUserRank]);

    // Handle page navigation
    const handleNextPage = () => {
        if (!hasMore) return;
        const nextPage = currentPage + 1;
        const lastDocForCurrentPage = pageDocsRef.current.get(currentPage);
        setCurrentPage(nextPage);
        loadPage(nextPage, lastDocForCurrentPage);
    };

    const handlePrevPage = () => {
        if (currentPage <= 1) return;
        const prevPage = currentPage - 1;

        if (prevPage === 1) {
            // Go back to first page
            setCurrentPage(1);
            loadPage(1, null);
        } else {
            // Use the stored doc for the page before the previous one
            const docForPrevPage = pageDocsRef.current.get(prevPage - 1);
            setCurrentPage(prevPage);
            loadPage(prevPage, docForPrevPage);
        }
    };

    // Get top 3 for podium (only on page 1)
    const topThree = currentPage === 1 ? entries.slice(0, 3) : [];
    const restOfList = currentPage === 1 ? entries.slice(3) : entries;

    // Calculate position offset based on page
    const getPositionForIndex = (index: number) => {
        if (currentPage === 1) {
            return index + 4; // Positions 4, 5, 6, ... (after podium)
        }
        // For subsequent pages: page 2 starts at position 21, page 3 at 41, etc.
        return (currentPage - 1) * ENTRIES_PER_PAGE + index + 1;
    };

    // Check if current user is in the visible list
    const userInTopThree = topThree.findIndex(e => e.userId === state.user?.id) !== -1;
    const userInList = restOfList.findIndex(e => e.userId === state.user?.id) !== -1;
    const showUserCard = userRank && !userInTopThree && !userInList;

    return (
        <div className="leaderboard">
            {/* Header */}
            <div className="leaderboard-header">
                <div className="leaderboard-brand">
                    <span className="brand-dot" />
                    <span className="brand-name">RANKINGS</span>
                </div>

                {/* Period Filter */}
                <div className="period-toggle">
                    {PERIOD_OPTIONS.map((option) => (
                        <button
                            key={option.value}
                            className={`period-btn ${period === option.value ? 'active' : ''}`}
                            onClick={() => setPeriod(option.value)}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Loading State */}
            {isLoading ? (
                <div className="leaderboard-loading">
                    <div className="loading-spinner" />
                </div>
            ) : entries.length === 0 ? (
                <div className="leaderboard-empty">
                    <span>No rankings yet</span>
                </div>
            ) : (
                <>
                    {/* Podium - Top 3 */}
                    {topThree.length >= 1 && (
                        <div className="podium">
                            {/* 2nd Place */}
                            {topThree[1] && (
                                <PodiumItem
                                    entry={topThree[1]}
                                    position={2}
                                    isCurrentUser={topThree[1].userId === state.user?.id}
                                />
                            )}

                            {/* 1st Place */}
                            {topThree[0] && (
                                <PodiumItem
                                    entry={topThree[0]}
                                    position={1}
                                    isCurrentUser={topThree[0].userId === state.user?.id}
                                />
                            )}

                            {/* 3rd Place */}
                            {topThree[2] && (
                                <PodiumItem
                                    entry={topThree[2]}
                                    position={3}
                                    isCurrentUser={topThree[2].userId === state.user?.id}
                                />
                            )}
                        </div>
                    )}

                    {/* Your Position Card (if not visible in list) */}
                    {showUserCard && (
                        <div className="your-position-card">
                            <span className="your-position-label">Your Position</span>
                            <div className="your-position-content">
                                <div className="your-position-left">
                                    <span className="your-position-rank">#{userRank.rank.toLocaleString()}</span>
                                    <div className="your-position-user">
                                        <div className="your-position-avatar">
                                            {state.user?.avatar ? (
                                                <img src={state.user.avatar} alt="" />
                                            ) : (
                                                <span>{state.user?.name?.charAt(0) || '?'}</span>
                                            )}
                                        </div>
                                        <span className="your-position-name">{state.user?.name || 'You'}</span>
                                    </div>
                                </div>
                                <div className="your-position-right">
                                    <RankIcon rank={state.user?.xp?.rank || 'novice'} size={14} />
                                    <span className="your-position-xp">{formatXP(userRank.totalXp)} XP</span>
                                    <span className="your-position-percentile">Top {Math.max(1, Math.round(100 - userRank.percentile))}%</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Rest of the List */}
                    {restOfList.length > 0 && (
                        <div className="leaderboard-list">
                            {restOfList.map((entry, index) => {
                                const position = getPositionForIndex(index);
                                const isCurrentUser = entry.userId === state.user?.id;

                                return (
                                    <div
                                        key={entry.userId}
                                        className={`leaderboard-entry ${isCurrentUser ? 'current-user' : ''}`}
                                    >
                                        <span className="entry-position">{position}</span>
                                        <div className="entry-avatar">
                                            {entry.avatar ? (
                                                <img src={entry.avatar} alt="" />
                                            ) : (
                                                <span className="avatar-initial">
                                                    {entry.displayName.charAt(0).toUpperCase()}
                                                </span>
                                            )}
                                        </div>
                                        <div className="entry-info">
                                            <span className="entry-name">
                                                {entry.displayName}
                                                {isCurrentUser && <span className="you-tag">You</span>}
                                            </span>
                                        </div>
                                        <div className="entry-stats">
                                            <RankIcon rank={entry.rank} size={14} />
                                            <span className="entry-xp">{formatXP(entry.totalXp)}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Pagination */}
                    {(hasPrev || hasMore) && (
                        <div className="leaderboard-pagination">
                            <button
                                className="pagination-btn"
                                onClick={handlePrevPage}
                                disabled={!hasPrev || isLoading}
                            >
                                <ChevronLeft size={16} />
                            </button>
                            <div className="pagination-info">
                                <span className="pagination-current">Page {currentPage}</span>
                            </div>
                            <button
                                className="pagination-btn"
                                onClick={handleNextPage}
                                disabled={!hasMore || isLoading}
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

// Minimal Podium Item
function PodiumItem({
    entry,
    position,
    isCurrentUser
}: {
    entry: LeaderboardEntry;
    position: 1 | 2 | 3;
    isCurrentUser: boolean;
}) {
    return (
        <div className={`podium-item position-${position} ${isCurrentUser ? 'current-user' : ''}`}>
            <div className="podium-rank">{position}</div>
            <div className="podium-avatar">
                {entry.avatar ? (
                    <img src={entry.avatar} alt="" />
                ) : (
                    <span>{entry.displayName.charAt(0).toUpperCase()}</span>
                )}
                {isCurrentUser && <span className="podium-you">You</span>}
            </div>
            <span className="podium-name">{entry.displayName.split(' ')[0]}</span>
            <div className="podium-stats">
                <RankIcon rank={entry.rank} size={12} />
                <span className="podium-xp">{formatXP(entry.totalXp)}</span>
            </div>
        </div>
    );
}

function formatXP(xp: number): string {
    if (xp >= 1000000) return `${(xp / 1000000).toFixed(1)}M`;
    if (xp >= 10000) return `${(xp / 1000).toFixed(0)}K`;
    if (xp >= 1000) return `${(xp / 1000).toFixed(1)}K`;
    return xp.toString();
}
