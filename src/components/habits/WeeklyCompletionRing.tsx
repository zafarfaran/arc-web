// ========================================
// Weekly Completion Ring - Circular Progress
// ========================================

interface WeeklyCompletionRingProps {
    percentage: number;
    size?: number;
}

export default function WeeklyCompletionRing({ percentage, size = 56 }: WeeklyCompletionRingProps) {
    const strokeWidth = 4;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;

    return (
        <div className="weekly-completion-ring">
            <div className="ring-container" style={{ width: size, height: size }}>
                <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                    {/* Background circle */}
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        fill="none"
                        stroke="var(--surface-accent)"
                        strokeWidth={strokeWidth}
                    />
                    {/* Progress circle */}
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        fill="none"
                        stroke="var(--primary)"
                        strokeWidth={strokeWidth}
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        transform={`rotate(-90 ${size / 2} ${size / 2})`}
                        style={{ transition: 'stroke-dashoffset 0.6s ease-out' }}
                    />
                </svg>
                <span className="ring-percentage">{Math.round(percentage)}%</span>
            </div>
            <div className="ring-labels">
                <span className="ring-title">Weekly Completion</span>
                <span className="ring-subtitle">Average completion rate</span>
            </div>
        </div>
    );
}
