import { Sprout, Zap, Target, Trophy, Crown, Gem, HelpCircle } from 'lucide-react';
import { RANK_INFO, type Rank } from '../../types';

interface RankIconProps {
    rank: Rank;
    size?: number;
    showGlow?: boolean;
}

export default function RankIcon({ rank, size = 16, showGlow = false }: RankIconProps) {
    const info = RANK_INFO[rank];
    if (!info) return <HelpCircle size={size} />;

    const IconComponent = getIconComponent(info.icon);

    return (
        <div
            className="rank-icon-wrapper"
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: info.color,
                filter: showGlow ? `drop-shadow(0 0 8px ${info.color}40)` : 'none'
            }}
        >
            <IconComponent size={size} strokeWidth={2.5} />
        </div>
    );
}

function getIconComponent(iconName: string) {
    switch (iconName) {
        case 'Sprout': return Sprout;
        case 'Zap': return Zap;
        case 'Target': return Target;
        case 'Trophy': return Trophy;
        case 'Crown': return Crown;
        case 'Gem': return Gem;
        default: return HelpCircle;
    }
}
