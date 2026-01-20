import { useState, useEffect, useRef } from 'react';
import { RANK_INFO, type Rank, type UserXP } from '../../types';
import RankIcon from './RankIcon';
import './XPGainAnimation.css';

interface XPGainAnimationProps {
    xp: UserXP | null;
}

export default function XPGainAnimation({ xp }: XPGainAnimationProps) {
    const [notifications, setNotifications] = useState<Array<{ id: string; type: 'xp' | 'rank'; value: number | Rank; color: string }>>([]);
    const lastXpRef = useRef<number | null>(null);
    const lastRankRef = useRef<Rank | null>(null);

    useEffect(() => {
        if (!xp) return;

        // Initialize refs on first load
        if (lastXpRef.current === null) {
            lastXpRef.current = xp.totalXp;
            lastRankRef.current = xp.rank;
            return;
        }

        const xpGain = xp.totalXp - lastXpRef.current;
        const rankChanged = xp.rank !== lastRankRef.current;

        if (xpGain > 0) {
            const rankInfo = RANK_INFO[xp.rank];
            const id = Math.random().toString(36).substr(2, 9);

            setNotifications(prev => [...prev, {
                id,
                type: 'xp',
                value: xpGain,
                color: rankInfo.color
            }]);

            setTimeout(() => {
                setNotifications(prev => prev.filter(n => n.id !== id));
            }, 2500);
        }

        if (rankChanged) {
            const rankInfo = RANK_INFO[xp.rank];
            const id = `rank-${xp.rank}-${Date.now()}`;

            setNotifications(prev => [...prev, {
                id,
                type: 'rank',
                value: xp.rank,
                color: rankInfo.color
            }]);

            setTimeout(() => {
                setNotifications(prev => prev.filter(n => n.id !== id));
            }, 4000);
        }

        lastXpRef.current = xp.totalXp;
        lastRankRef.current = xp.rank;
    }, [xp]);

    if (notifications.length === 0) return null;

    return (
        <div className="global-xp-notifications">
            {notifications.map(notif => (
                <div
                    key={notif.id}
                    className={`xp-notification ${notif.type}`}
                    style={{ '--notif-color': notif.color } as React.CSSProperties}
                >
                    {notif.type === 'rank' ? (
                        <div className="rank-up-content">
                            <div className="rank-up-label">RANK UP!</div>
                            <div className="rank-up-icon-wrapper">
                                <RankIcon rank={notif.value as Rank} size={32} showGlow />
                            </div>
                            <div className="rank-up-name">{RANK_INFO[notif.value as Rank].name}</div>
                        </div>
                    ) : (
                        <span className="xp-gain-value">+{notif.value} XP</span>
                    )}
                </div>
            ))}
        </div>
    );
}
