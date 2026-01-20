// ========================================
// XP Display Component - Shows rank and progress
// ========================================

import { RANK_INFO, type UserXP } from '../../types';
import { getRankProgress, getXpToNextRank } from '../../services/xpService';
import RankIcon from './RankIcon';
import './XPDisplay.css';

interface XPDisplayProps {
    xp: UserXP;
    compact?: boolean;
}

export default function XPDisplay({ xp, compact = false }: XPDisplayProps) {
    const rankInfo = RANK_INFO[xp.rank];
    const progress = getRankProgress(xp.totalXp);
    const { nextRank, xpNeeded } = getXpToNextRank(xp.totalXp);
    const nextRankInfo = nextRank ? RANK_INFO[nextRank] : null;

    if (compact) {
        return (
            <div className="xp-display-compact">
                <RankIcon rank={xp.rank} size={14} />
                <span className="xp-total">{formatXP(xp.totalXp)}</span>
            </div>
        );
    }

    return (
        <div className="xp-display">
            {/* Rank Badge */}
            <div className="xp-rank-section">
                <div className="xp-rank-badge-large" style={{ background: `${rankInfo.color}15`, border: `1px solid ${rankInfo.color}30` }}>
                    <RankIcon rank={xp.rank} size={32} showGlow />
                </div>
                <div className="xp-rank-info">
                    <span className="rank-name" style={{ color: rankInfo.color }}>{rankInfo.name}</span>
                    <span className="xp-total-large">{formatXP(xp.totalXp)} XP</span>
                </div>
            </div>

            {/* Progress to Next Rank */}
            {nextRankInfo && (
                <div className="xp-progress-section">
                    <div className="xp-progress-bar">
                        <div
                            className="xp-progress-fill"
                            style={{
                                width: `${progress}%`,
                                background: `linear-gradient(90deg, ${rankInfo.color}, ${nextRankInfo.color})`,
                                boxShadow: `0 0 10px ${rankInfo.color}40`
                            }}
                        />
                    </div>
                    <div className="xp-progress-labels">
                        <span className="xp-current-progress">
                            <RankIcon rank={xp.rank} size={10} />
                            {progress.toFixed(0)}% to {nextRankInfo.name}
                        </span>
                        <span className="xp-needed">
                            {formatXP(xpNeeded)} XP left
                        </span>
                    </div>
                </div>
            )}

            {/* Recent XP Events */}
            {xp.xpHistory.length > 0 && (
                <div className="xp-recent-section">
                    <span className="xp-recent-title">RECENT</span>
                    <div className="xp-recent-list">
                        {xp.xpHistory.slice(-3).reverse().map((event) => (
                            <div key={event.id} className="xp-recent-item">
                                <span className="xp-event-description">{event.description}</span>
                                <span className="xp-event-amount">+{event.amount}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function formatXP(xp: number): string {
    if (xp >= 10000) return `${(xp / 1000).toFixed(1)}K`;
    if (xp >= 1000) return `${(xp / 1000).toFixed(1)}K`;
    return xp.toString();
}
