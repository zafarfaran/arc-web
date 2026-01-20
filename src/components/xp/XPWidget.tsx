// ========================================
// XP Widget - Floating XP/Rank Display
// ========================================

import { useState } from 'react';
import { ChevronRight, Sparkles } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { RANK_INFO } from '../../types';
import { getRankProgress, getXpToNextRank } from '../../services/xpService';
import RankIcon from './RankIcon';
import './XPWidget.css';

export default function XPWidget() {
    const { state } = useApp();
    const [isExpanded, setIsExpanded] = useState(false);

    if (!state.isAuthenticated || !state.user || !state.user.xp) {
        return null;
    }

    const { xp } = state.user;
    const rankInfo = RANK_INFO[xp.rank] || RANK_INFO.novice;
    const progress = getRankProgress(xp.totalXp);
    const { nextRank, xpNeeded } = getXpToNextRank(xp.totalXp);
    const nextRankInfo = nextRank ? RANK_INFO[nextRank] : null;

    const formatXP = (value: number): string => {
        if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
        return value.toString();
    };

    return (
        <div className={`xp-widget ${isExpanded ? 'expanded' : ''}`}>
            {/* Collapsed view - just the button */}
            <button
                className="xp-widget-toggle"
                onClick={() => setIsExpanded(!isExpanded)}
                style={{ borderColor: `${rankInfo.color}40` }}
            >
                <RankIcon rank={xp.rank} size={18} />
                <span className="xp-widget-value" style={{ color: rankInfo.color }}>
                    {formatXP(xp.totalXp)}
                </span>
                <ChevronRight
                    size={14}
                    className={`xp-widget-chevron ${isExpanded ? 'rotated' : ''}`}
                />
            </button>

            {/* Expanded panel */}
            <div className="xp-widget-panel">
                {/* Header */}
                <div className="xp-widget-header">
                    <div className="xp-widget-rank-badge" style={{ background: `${rankInfo.color}15` }}>
                        <RankIcon rank={xp.rank} size={28} showGlow />
                    </div>
                    <div className="xp-widget-rank-info">
                        <span className="xp-widget-rank-name" style={{ color: rankInfo.color }}>
                            {rankInfo.name}
                        </span>
                        <span className="xp-widget-total">
                            {formatXP(xp.totalXp)} XP
                        </span>
                    </div>
                </div>

                {/* Progress bar */}
                {nextRankInfo && (
                    <div className="xp-widget-progress">
                        <div className="xp-widget-progress-bar">
                            <div
                                className="xp-widget-progress-fill"
                                style={{
                                    width: `${progress}%`,
                                    background: `linear-gradient(90deg, ${rankInfo.color}, ${nextRankInfo.color})`
                                }}
                            />
                        </div>
                        <div className="xp-widget-progress-labels">
                            <span>{progress.toFixed(0)}%</span>
                            <span className="xp-widget-next">
                                {formatXP(xpNeeded)} to {nextRankInfo.name}
                            </span>
                        </div>
                    </div>
                )}

                {/* Recent activity */}
                {xp.xpHistory.length > 0 && (
                    <div className="xp-widget-recent">
                        <div className="xp-widget-recent-header">
                            <Sparkles size={12} />
                            <span>Recent</span>
                        </div>
                        {xp.xpHistory
                            .filter(event => event.amount > 0)
                            .slice(-3)
                            .reverse()
                            .map((event) => (
                                <div key={event.id} className="xp-widget-recent-item">
                                    <span className="xp-event-desc">{event.description}</span>
                                    <span className="xp-event-xp">+{event.amount}</span>
                                </div>
                            ))}
                    </div>
                )}
            </div>
        </div>
    );
}
